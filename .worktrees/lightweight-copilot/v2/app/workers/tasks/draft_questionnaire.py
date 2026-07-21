"""Batch-draft answers for every item in a questionnaire.

Called after upload finishes parsing. Iterates items in row order, runs the
LangGraph answer flow, writes drafted_answer + confidence + citations back
to the row. Updates the questionnaire.status as it progresses.

Also emits a Slack notification once complete (if SLACK_WEBHOOK_URL is set).
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Job, Questionnaire, QuestionnaireItem
from app.services.answer_graph import answer_question
from app.services.slack import notify_review_needed
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.draft_questionnaire.run")
def draft_questionnaire(questionnaire_id: str, job_id: str | None = None) -> dict:
    qid = uuid.UUID(questionnaire_id)
    jid = uuid.UUID(job_id) if job_id else None

    # Keep DB transactions short: LLM calls can take seconds or minutes, and a
    # single transaction for an entire questionnaire prevented progress from
    # being visible and held a pooled connection for the whole job.
    with session_scope() as db:
        q = db.get(Questionnaire, qid)
        if not q:
            return {"ok": False, "reason": "questionnaire not found"}
        q.status = "drafting"
        q.updated_at = datetime.now(timezone.utc)

        items = list(
            db.execute(
                select(
                    QuestionnaireItem.id,
                    QuestionnaireItem.question,
                    QuestionnaireItem.verdict,
                )
                .where(QuestionnaireItem.questionnaire_id == qid)
                .order_by(QuestionnaireItem.row_index)
            ).all()
        )
        total = len(items)

        # Product slug for tenant scoping (if the questionnaire is bound to a product).
        product_slug = None
        if q.product_id:
            from app.models import Product
            p = db.get(Product, q.product_id)
            if p:
                product_slug = p.slug

        if jid:
            job = db.get(Job, jid)
            if job:
                job.status = "running"
                job.progress = 0.0

    def checkpoint(progress: float) -> None:
        """Persist progress independently of any individual answer result."""
        with session_scope() as db:
            q = db.get(Questionnaire, qid)
            if q:
                q.updated_at = datetime.now(timezone.utc)
            if jid:
                job = db.get(Job, jid)
                if job:
                    job.status = "running"
                    job.progress = progress

    for idx, (item_id, question, verdict) in enumerate(items):
        progress = (idx + 1) / max(total, 1)
        # A late-acked Celery retry resumes from the durable per-item result
        # rather than re-running an already drafted or gap-classified item.
        if verdict != "pending":
            checkpoint(progress)
            continue

        try:
            # This session is limited to one answer. It is returned to the
            # pool before the result update and never spans the full job.
            with session_scope() as db:
                result = answer_question(
                    db=db,
                    question=question,
                    product_slug=product_slug,
                )
        except Exception as e:
            log.warning("draft_item_failed", item_id=str(item_id), err=str(e))
            checkpoint(progress)
            continue

        with session_scope() as db:
            it = db.get(QuestionnaireItem, item_id)
            # A duplicate/retried task may have completed the item while this
            # task was drafting it. Preserve the first durable result.
            if not it or it.verdict != "pending":
                continue

            it.drafted_answer = result.get("answer")
            it.confidence = float(result.get("confidence") or 0.0)
            it.verdict = result.get("verdict") or "gap"
            it.citation_entry_ids = [
                uuid.UUID(x) for x in (result.get("citations") or [])
            ]

            q = db.get(Questionnaire, qid)
            if q:
                q.updated_at = datetime.now(timezone.utc)
            if jid:
                job = db.get(Job, jid)
                if job:
                    job.progress = progress
                    job.status = "running"

    with session_scope() as db:
        q = db.get(Questionnaire, qid)
        if not q:
            return {"ok": False, "reason": "questionnaire not found"}

        verdicts = db.execute(
            select(QuestionnaireItem.verdict).where(QuestionnaireItem.questionnaire_id == qid)
        ).scalars().all()
        drafted = sum(verdict == "drafted" for verdict in verdicts)
        gaps = sum(verdict == "gap" for verdict in verdicts)

        q.total_items = total
        q.status = "ready_for_review"
        q.updated_at = datetime.now(timezone.utc)

        if jid:
            job = db.get(Job, jid)
            if job:
                job.progress = 1.0
                job.status = "success"
                job.result = {"drafted": drafted, "gaps": gaps, "total": total}

    # Slack fire-and-forget (outside the DB session)
    ui_base = os.getenv("PUBLIC_APP_URL", "http://localhost:3000")
    url = f"{ui_base}/questionnaires/{questionnaire_id}/review"
    with session_scope() as db:
        q = db.get(Questionnaire, qid)
        notify_review_needed(
            questionnaire_name=q.name if q else "questionnaire",
            customer=q.customer if q else None,
            total_items=total,
            gap_items=gaps,
            url=url,
        )

    log.info("draft_questionnaire_done", qid=questionnaire_id, drafted=drafted, gaps=gaps, total=total)
    return {"drafted": drafted, "gaps": gaps, "total": total}
