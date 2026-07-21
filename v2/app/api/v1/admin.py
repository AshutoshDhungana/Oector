"""Admin / demo-prep endpoints.

The one-click "get the demo ready" pipeline lives here. This is the endpoint the
UI's `Prepare index` buttons call after a fresh seed / import.
"""

from __future__ import annotations

import json
import time

import redis as redis_lib
from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.logging_config import get_logger


# ── Prep progress state (Redis-backed, so it survives across processes and requests) ──
PREP_KEY = "trustcopilot:prep:state"
PREP_TTL_SECONDS = 30 * 60  # 30-min ceiling; the UI trusts the counters for exit condition


def _redis() -> redis_lib.Redis:
    return redis_lib.from_url(settings.redis_url)


def _read_prep() -> dict | None:
    try:
        raw = _redis().get(PREP_KEY)
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def _write_prep(state: dict) -> None:
    try:
        _redis().setex(PREP_KEY, PREP_TTL_SECONDS, json.dumps(state))
    except Exception:
        pass


def _clear_prep() -> None:
    try:
        _redis().delete(PREP_KEY)
    except Exception:
        pass
from app.models import LibraryConflict, MergeQueue, Questionnaire

router = APIRouter()
log = get_logger(__name__)


# ── Index prep ────────────────────────────────────────────────────────


@router.get("/index-status")
def index_status(db: Session = Depends(get_db)):
    """Snapshot of what's ready and what's not — used to guide the UI."""
    # This endpoint is polled by the UI. Keep independent aggregates in one
    # database round trip instead of opening nine sequential count queries.
    counts = db.execute(
        text(
            """
            SELECT
                (SELECT COUNT(*) FROM qa_entries
                 WHERE deleted_at IS NULL AND status = 'active') AS entries_active,
                (SELECT COUNT(*) FROM qa_embeddings) AS embeddings_count,
                (SELECT COUNT(*) FROM framework_controls) AS controls_total,
                (SELECT COUNT(*) FROM framework_controls WHERE vector IS NOT NULL)
                    AS controls_embedded,
                (SELECT COUNT(*) FROM clusters WHERE size >= 2) AS clusters_with_members,
                (SELECT COUNT(DISTINCT qa_entry_id) FROM entry_mappings) AS mappings_count,
                (SELECT COUNT(*) FROM merge_queue WHERE status = 'pending') AS merge_pending,
                (SELECT COUNT(*) FROM library_conflicts WHERE status = 'open') AS conflicts_open,
                (SELECT COUNT(*) FROM compliance_sources) AS compliance_sources
            """
        )
    ).mappings().one()
    entries_active = int(counts["entries_active"] or 0)
    embeddings_count = int(counts["embeddings_count"] or 0)
    controls_total = int(counts["controls_total"] or 0)
    controls_embedded = int(counts["controls_embedded"] or 0)
    clusters_with_members = int(counts["clusters_with_members"] or 0)
    mappings_count = int(counts["mappings_count"] or 0)
    merge_pending = int(counts["merge_pending"] or 0)
    conflicts_open = int(counts["conflicts_open"] or 0)
    compliance_sources = int(counts["compliance_sources"] or 0)

    from app.services.llm import llm_available
    llm_ok = llm_available()

    coverage_pct = (embeddings_count / entries_active * 100) if entries_active else 0.0
    is_ready = (
        embeddings_count > 0
        and controls_embedded == controls_total
        and llm_ok
    )

    # ── Prep-in-progress state ─────────────────────────────────────
    # Considered "in progress" iff either a prep state key is live in Redis
    # OR the counters clearly show work still to do after a recent prep.
    prep = _read_prep()
    prep_in_progress = False
    prep_started_at: float | None = None
    prep_elapsed_s: float | None = None
    prep_progress_pct = 0.0
    prep_steps: list[dict] = []

    if prep:
        prep_started_at = float(prep.get("started_at") or 0)
        prep_elapsed_s = max(0.0, time.time() - prep_started_at)
        expected = _expected_steps(prep, entries_active, controls_total)
        # Compute what's done vs total from counters. We check the counters *live*
        # so progress reflects actual work, not just wall-clock.
        done = 0
        total = 0
        for step in expected:
            step["done_now"] = _step_done(step, {
                "embeddings_count": embeddings_count,
                "controls_embedded": controls_embedded,
                "controls_total": controls_total,
                "entries_active": entries_active,
                "mappings_count": mappings_count,
                "merge_pending": merge_pending,
                "conflicts_open": conflicts_open,
            })
            done += min(step["done_now"], step["target"])
            total += step["target"]
            prep_steps.append(step)
        if total > 0:
            prep_progress_pct = round(100.0 * done / total, 1)

        # Auto-clear when everything is done.
        all_done = all(s["done_now"] >= s["target"] for s in prep_steps)
        if all_done:
            _clear_prep()
        else:
            prep_in_progress = True

    return {
        "ready_for_demo": is_ready,
        "llm_provider": settings.llm_provider,
        "llm_base_url": settings.llm_base_url,
        "llm_model": settings.llm_model,
        "llm_configured": llm_ok,
        # Kept for backwards compatibility with the earlier frontend hook.
        "google_api_key_set": llm_ok,
        # Prep progress
        "prep_in_progress": prep_in_progress,
        "prep_started_at": prep_started_at,
        "prep_elapsed_seconds": prep_elapsed_s,
        "prep_progress_pct": prep_progress_pct,
        "prep_steps": prep_steps,
        "entries_active": int(entries_active),
        "embeddings_count": int(embeddings_count),
        "embeddings_coverage_pct": round(coverage_pct, 1),
        "framework_controls_total": int(controls_total),
        "framework_controls_embedded": int(controls_embedded),
        "clusters_ready_for_merge": int(clusters_with_members),
        "entries_with_mappings": int(mappings_count),
        "merge_queue_pending": int(merge_pending),
        "conflicts_open": int(conflicts_open),
        "compliance_sources": int(compliance_sources),
    }


def _expected_steps(prep: dict, entries_active: int, controls_total: int) -> list[dict]:
    """Build the step list off the counters snapshot taken at prepare-time."""
    baseline = prep.get("baseline") or {}
    return [
        {
            "id": "embed",
            "label": "Embedding library entries",
            "target": entries_active,
            "baseline": int(baseline.get("embeddings_count") or 0),
        },
        {
            "id": "framework_embed",
            "label": "Embedding framework controls",
            "target": controls_total,
            "baseline": int(baseline.get("controls_embedded") or 0),
        },
        {
            "id": "mapping",
            "label": "Cross-framework mapping",
            "target": max(1, entries_active),
            "baseline": int(baseline.get("mappings_count") or 0),
        },
        {
            "id": "merge",
            "label": "Merge suggestions",
            "target": 1,  # target is "at least one", proxy for "did anything happen"
            "baseline": int(baseline.get("merge_pending") or 0),
        },
        {
            "id": "conflict",
            "label": "Conflict scan",
            "target": 1,
            "baseline": int(baseline.get("conflicts_open") or 0),
        },
    ]


def _step_done(step: dict, counters: dict) -> int:
    """Return the current 'done' count for a step, relative to baseline at prep-start."""
    now_map = {
        "embed": counters["embeddings_count"],
        "framework_embed": counters["controls_embedded"],
        "mapping": counters["mappings_count"],
        "merge": counters["merge_pending"],
        "conflict": counters["conflicts_open"],
    }
    now = int(now_map.get(step["id"]) or 0)
    return max(0, now - step["baseline"])


@router.post("/prepare-index")
def prepare_index(db: Session = Depends(get_db)):
    """One-click pipeline that gets the library ready for the whole demo.

    Kicks off (as celery tasks):
      1. embed_pending  — QA entries → 768-dim vectors + cluster auto-assign
      2. embed_pending_controls — framework controls (inline, small)
      3. mapping_batch — cross-framework mappings
      4. suggest_merges — populate the merge queue from clusters
      5. conflict_scan — find contradictions
      6. compliance_poll — crawl seeded sources
    """
    from app.services.llm import llm_available
    if not llm_available():
        return {
            "ok": False,
            "reason": "No LLM endpoint configured — set LLM_BASE_URL in .env before preparing the index.",
        }

    from app.workers.tasks.compliance_poll import poll_all
    from app.workers.tasks.conflict_scan import run_scan
    from app.workers.tasks.embed import embed_pending
    from app.workers.tasks.mapping_batch import run_mapping_batch

    # Snapshot counters BEFORE queuing — used to compute delta-progress in index-status.
    baseline_embeddings = db.scalar(text("SELECT COUNT(*) FROM qa_embeddings")) or 0
    baseline_controls = db.scalar(
        text("SELECT COUNT(*) FROM framework_controls WHERE vector IS NOT NULL")
    ) or 0
    baseline_mappings = db.scalar(
        text("SELECT COUNT(DISTINCT qa_entry_id) FROM entry_mappings")
    ) or 0
    baseline_merge = db.scalar(
        text("SELECT COUNT(*) FROM merge_queue WHERE status = 'pending'")
    ) or 0
    baseline_conflicts = db.scalar(
        text("SELECT COUNT(*) FROM library_conflicts WHERE status = 'open'")
    ) or 0

    _write_prep({
        "started_at": time.time(),
        "baseline": {
            "embeddings_count": int(baseline_embeddings),
            "controls_embedded": int(baseline_controls),
            "mappings_count": int(baseline_mappings),
            "merge_pending": int(baseline_merge),
            "conflicts_open": int(baseline_conflicts),
        },
    })

    jobs: dict = {}

    try:
        jobs["embed"] = embed_pending.delay().id
    except Exception as e:
        jobs["embed_error"] = str(e)

    # Framework controls are small (~50) — do inline so mapping can use them right away.
    try:
        from app.services.framework_mapping import embed_pending_controls
        n = embed_pending_controls(db)
        jobs["framework_controls_embedded_inline"] = n
    except Exception as e:
        jobs["framework_controls_error"] = str(e)

    try:
        jobs["mapping"] = run_mapping_batch.delay(500, True).id
    except Exception as e:
        jobs["mapping_error"] = str(e)

    try:
        from app.workers.tasks.merge_suggest_batch import suggest_all
        jobs["merge_suggest"] = suggest_all.delay(200).id
    except Exception as e:
        jobs["merge_suggest_error"] = str(e)

    try:
        jobs["conflict_scan"] = run_scan.delay(None, 200).id
    except Exception as e:
        jobs["conflict_scan_error"] = str(e)

    try:
        jobs["compliance_poll"] = poll_all.delay().id
    except Exception as e:
        jobs["compliance_poll_error"] = str(e)

    log.info("prepare_index_enqueued", jobs=jobs)
    return {"ok": True, "jobs": jobs}


@router.post("/prep-clear")
def prep_clear():
    """Manually clear the prep-in-progress banner (jobs keep running on the worker)."""
    _clear_prep()
    return {"cleared": True}


# ── Activity feed for the Dashboard ───────────────────────────────────


@router.get("/recent-activity")
def recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    """Timeline of recent events across the platform — powers the dashboard."""
    events: list[dict] = []

    for q in db.execute(
        select(Questionnaire).order_by(Questionnaire.created_at.desc()).limit(limit)
    ).scalars().all():
        events.append({
            "kind": "questionnaire_uploaded",
            "ts": q.created_at.isoformat(),
            "title": f"Questionnaire uploaded: {q.name}",
            "subtitle": (q.customer or "no customer") + f" · {q.total_items} questions · {q.status}",
            "href": f"/questionnaires/{q.id}/review",
        })

    for c in db.execute(
        select(LibraryConflict)
        .where(LibraryConflict.status == "open")
        .order_by(LibraryConflict.detected_at.desc())
        .limit(limit)
    ).scalars().all():
        events.append({
            "kind": "conflict_detected",
            "ts": c.detected_at.isoformat(),
            "title": f"Contradiction detected ({c.severity})",
            "subtitle": c.explanation[:140],
            "href": "/library-health",
        })

    for m in db.execute(
        select(MergeQueue)
        .where(MergeQueue.status == "pending")
        .order_by(MergeQueue.created_at.desc())
        .limit(limit)
    ).scalars().all():
        events.append({
            "kind": "merge_suggested",
            "ts": m.created_at.isoformat(),
            "title": "Merge suggestion",
            "subtitle": (m.llm_rationale or "").split("\n")[0][:140] or "See merge queue",
            "href": "/merge",
        })

    events.sort(key=lambda e: e["ts"], reverse=True)
    return events[:limit]
