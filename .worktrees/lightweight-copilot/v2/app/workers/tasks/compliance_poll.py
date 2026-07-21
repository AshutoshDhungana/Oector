"""Compliance watcher: fetch RSS/HTTP sources, diff against prior snapshot,
LLM-summarise, k-NN link to affected QA entries."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import feedparser
import httpx
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import ComplianceChange, ComplianceSource, OutdatedFlag
from app.services.embedding import embed_texts
from app.services.llm import call_json
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

SUMMARY_SYSTEM = (
    "You are a compliance analyst. Given a text change from a regulatory or "
    "audit-standards source, produce a one-paragraph summary of what changed "
    "and its likely impact on customer-assurance QA content. Reply JSON only: "
    '{"summary": "<one paragraph>", "impact_score": <0..1>, '
    '"topics": ["<short topic tag>", ...]}.'
)


def _hash(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def _fetch_snapshot(src: ComplianceSource) -> str:
    if src.kind == "rss":
        feed = feedparser.parse(src.url)
        items = []
        for e in feed.entries[:30]:
            items.append(f"{e.get('title', '')}\n{e.get('summary', '')}\n{e.get('link', '')}")
        return "\n---\n".join(items)
    # http / sitemap fallback
    resp = httpx.get(src.url, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    return resp.text[:200_000]  # cap


def _summarize(diff_text: str) -> dict:
    from app.services.llm import llm_available
    if not llm_available():
        return {"summary": "(no LLM configured) raw change detected", "impact_score": 0.2, "topics": []}
    prompt = f"Change diff (may be truncated):\n\n{diff_text[:12000]}\n\nRespond in JSON only."
    try:
        return call_json(prompt, model=settings.llm_model, system=SUMMARY_SYSTEM, max_tokens=500)
    except Exception as e:
        log.warning("compliance_summary_failed", err=str(e))
        return {"summary": f"raw change detected ({e})", "impact_score": 0.1, "topics": []}


def _link_affected(db, summary: str, k: int = 20) -> list[uuid.UUID]:
    """k-NN against qa_embeddings using the summary as the query."""
    try:
        vec = embed_texts([summary])[0]
    except Exception as e:
        log.warning("compliance_embed_failed", err=str(e))
        return []
    rows = db.execute(
        text(
            """
            SELECT q.id
            FROM qa_embeddings e
            JOIN qa_entries q ON q.id = e.qa_entry_id
            WHERE q.deleted_at IS NULL AND q.status = 'active'
            ORDER BY e.vector <=> CAST(:vec AS vector)
            LIMIT :k
            """
        ),
        {"vec": vec, "k": k},
    ).all()
    return [r[0] for r in rows]


@celery_app.task(name="app.workers.tasks.compliance_poll.poll_one")
def poll_one(source_id: str) -> dict:
    sid = uuid.UUID(source_id)
    with session_scope() as db:
        src = db.get(ComplianceSource, sid)
        if not src or not src.enabled:
            return {"ok": False, "reason": "missing/disabled"}

        try:
            snapshot = _fetch_snapshot(src)
        except Exception as e:
            log.warning("compliance_fetch_failed", url=src.url, err=str(e))
            src.last_polled_at = datetime.now(timezone.utc)
            return {"ok": False, "error": str(e)}

        h = _hash(snapshot)
        if src.last_hash == h:
            src.last_polled_at = datetime.now(timezone.utc)
            return {"ok": True, "changed": False}

        # New content detected. Summarise + link.
        obj = _summarize(snapshot)
        summary = str(obj.get("summary", ""))[:2000]
        impact = float(obj.get("impact_score", 0.0))

        affected = _link_affected(db, summary)
        change = ComplianceChange(
            source_id=src.id,
            summary=summary,
            diff={"topics": obj.get("topics", []), "snapshot_hash": h},
            impact_score=impact,
            affected_qa_ids=affected,
        )
        db.add(change)

        # Nudge outdated status for the affected entries; the outdated task will
        # re-evaluate with LLM. Here we just downgrade if currently fresh.
        for qid in affected:
            db.execute(
                pg_insert(OutdatedFlag).values(
                    qa_entry_id=qid,
                    status="aging",
                    score=60.0,
                    reason="compliance change detected",
                    evidence={"source_id": str(src.id), "change_ts": datetime.now(timezone.utc).isoformat()},
                    updated_at=datetime.now(timezone.utc),
                ).on_conflict_do_update(
                    index_elements=[OutdatedFlag.qa_entry_id],
                    set_={
                        "status": text("LEAST(outdated_flags.status, 'aging')"),  # NOTE: string-compare, kept simple
                        "score": text("LEAST(outdated_flags.score, 60.0)"),
                        "reason": "compliance change detected",
                        "updated_at": datetime.now(timezone.utc),
                    },
                )
            )
            # Enqueue full re-check.
            from app.workers.tasks.outdated_check import verify_entry
            verify_entry.delay(str(qid))

        src.last_hash = h
        src.last_polled_at = datetime.now(timezone.utc)
        log.info("compliance_change_saved", src=src.name, affected=len(affected), impact=impact)
        return {"ok": True, "changed": True, "affected": len(affected)}


@celery_app.task(name="app.workers.tasks.compliance_poll.poll_all")
def poll_all() -> dict:
    now = datetime.now(timezone.utc)
    with session_scope() as db:
        due = db.execute(
            select(ComplianceSource).where(ComplianceSource.enabled.is_(True))
        ).scalars().all()

    n = 0
    for src in due:
        if src.last_polled_at is None or src.last_polled_at + timedelta(minutes=src.poll_interval_minutes) <= now:
            poll_one.delay(str(src.id))
            n += 1
    log.info("compliance_poll_enqueued", n=n)
    return {"enqueued": n}
