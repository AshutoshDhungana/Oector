"""outdated_check tasks."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import ComplianceChange, OutdatedFlag, QAEntry
from app.services import outdated as scoring
from app.services.llm import call_json
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are a knowledge-base auditor. You will be given a QA pair from a "
    "customer-assurance knowledge library. Decide whether the answer is still "
    "correct today, taking into account general knowledge of common compliance "
    "changes (SOC 2, ISO 27001, GDPR, HIPAA, PCI-DSS) up to your training cutoff. "
    "Reply with ONLY a JSON object: "
    '{"verdict": "still-correct" | "needs-update" | "unknown", '
    '"confidence": <0..1>, "reason": "<1-2 sentences>"}.'
)


def _llm_verdict(question: str, answer: str) -> tuple[str, str]:
    prompt = f"Question:\n{question}\n\nAnswer:\n{answer}\n\nRespond in JSON only."
    from app.services.llm import llm_available
    if not llm_available():
        return "unknown", "no LLM endpoint configured"
    try:
        obj = call_json(prompt, model=settings.llm_model, system=SYSTEM_PROMPT, max_tokens=300)
        v = str(obj.get("verdict", "unknown")).lower()
        if v not in {"still-correct", "needs-update", "unknown"}:
            v = "unknown"
        return v, str(obj.get("reason", ""))
    except Exception as e:
        log.warning("llm_verdict_failed", err=str(e))
        return "unknown", f"llm error: {e}"


def _compliance_hit(db, entry_id: uuid.UUID) -> bool:
    since = datetime.now(timezone.utc) - timedelta(days=30)
    row = db.execute(
        select(func.count(ComplianceChange.id))
        .where(
            and_(
                ComplianceChange.detected_at >= since,
                ComplianceChange.affected_qa_ids.any(entry_id),
            )
        )
    ).scalar_one()
    return row > 0


@celery_app.task(name="app.workers.tasks.outdated_check.verify_entry")
def verify_entry(entry_id: str) -> dict:
    eid = uuid.UUID(entry_id)
    with session_scope() as db:
        entry = db.get(QAEntry, eid)
        if not entry or entry.deleted_at is not None:
            return {"ok": False, "reason": "missing/deleted"}

        age_status, age_score = scoring.age_prior(entry.original_updated_at)
        # Skip LLM if very fresh AND no compliance hit — save cost.
        hit = _compliance_hit(db, eid)
        if age_status == "fresh" and age_score >= 90 and not hit:
            v = scoring.combine(age_status, age_score, "unknown", hit)
            _upsert_flag(db, eid, v)
            return {"status": v.status, "score": v.score, "llm_skipped": True}

        verdict, reason = _llm_verdict(entry.question, entry.answer)
        v = scoring.combine(age_status, age_score, verdict, hit)
        v.evidence["llm_reason"] = reason
        _upsert_flag(db, eid, v)
        return {"status": v.status, "score": v.score, "llm_verdict": verdict}


def _upsert_flag(db, eid: uuid.UUID, v) -> None:
    stmt = pg_insert(OutdatedFlag).values(
        qa_entry_id=eid,
        status=v.status,
        score=v.score,
        reason=v.reason,
        evidence=v.evidence,
        updated_at=datetime.now(timezone.utc),
    ).on_conflict_do_update(
        index_elements=[OutdatedFlag.qa_entry_id],
        set_={
            "status": v.status,
            "score": v.score,
            "reason": v.reason,
            "evidence": v.evidence,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    db.execute(stmt)


@celery_app.task(name="app.workers.tasks.outdated_check.scan_batch")
def scan_batch(limit: int = 200) -> dict:
    """Enqueue verify_entry for entries never checked, or checked >7 days ago."""
    from sqlalchemy import text

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT q.id
                FROM qa_entries q
                LEFT JOIN outdated_flags f ON f.qa_entry_id = q.id
                WHERE q.deleted_at IS NULL AND q.status = 'active'
                  AND (f.qa_entry_id IS NULL OR f.updated_at < :cutoff)
                ORDER BY f.updated_at NULLS FIRST
                LIMIT :n
                """
            ),
            {"cutoff": week_ago, "n": limit},
        ).all()

    for (eid,) in rows:
        verify_entry.delay(str(eid))
    log.info("outdated_scan_enqueued", n=len(rows))
    return {"queued": len(rows)}
