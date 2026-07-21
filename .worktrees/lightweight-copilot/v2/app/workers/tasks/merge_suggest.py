"""merge_suggest tasks — produce merge_queue rows with LLM-drafted canonical answers."""

from __future__ import annotations

import uuid
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Cluster, ClusterMember, MergeQueue, QAEntry
from app.services.llm import call_json
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

SYSTEM = (
    "You are a technical writer merging near-duplicate QA pairs from a knowledge "
    "library. Produce ONE canonical answer that preserves every distinct fact "
    "from all inputs. Reply ONLY with JSON: "
    '{"question": "<canonical question>", "answer": "<canonical answer>", '
    '"details": "<optional additional detail or empty string>", '
    '"rationale": "<why this is the merged canonical>", '
    '"notes": ["<preserved nuance 1>", "..."]}.'
)


def _prompt(entries: Iterable[QAEntry]) -> str:
    parts = ["Merge the following QA pairs:\n"]
    for i, e in enumerate(entries, 1):
        parts.append(f"---\n[{i}] Q: {e.question}\nA: {e.answer}\n")
        if e.details:
            parts.append(f"Details: {e.details}\n")
    parts.append("\nReply as JSON only.")
    return "\n".join(parts)


@celery_app.task(name="app.workers.tasks.merge_suggest.for_cluster")
def for_cluster(cluster_id: str) -> dict:
    cid = uuid.UUID(cluster_id)
    with session_scope() as db:
        cluster = db.get(Cluster, cid)
        if not cluster or cluster.size < 2:
            return {"ok": False, "reason": "cluster too small"}

        member_rows = db.execute(
            select(QAEntry)
            .join(ClusterMember, ClusterMember.qa_entry_id == QAEntry.id)
            .where(ClusterMember.cluster_id == cid, QAEntry.deleted_at.is_(None))
        ).scalars().all()

        if len(member_rows) < 2:
            return {"ok": False, "reason": "not enough live members"}

        primary = member_rows[0]
        secondaries = member_rows[1:]

        draft = None
        rationale = None
        from app.services.llm import llm_available
        if llm_available():
            try:
                obj = call_json(
                    _prompt(member_rows),
                    model=settings.llm_pro_model,
                    system=SYSTEM,
                    max_tokens=1200,
                )
                draft = {
                    "question": obj.get("question", primary.question),
                    "answer": obj.get("answer", primary.answer),
                    "details": obj.get("details", primary.details or ""),
                    "notes": obj.get("notes", []),
                }
                rationale = obj.get("rationale", "")
            except Exception as e:
                log.warning("llm_merge_failed", cluster=cluster_id, err=str(e))

        # De-dupe: skip creating a new queue row if a pending one already exists for the same primary.
        existing = db.execute(
            select(MergeQueue.id).where(
                MergeQueue.primary_qa_id == primary.id,
                MergeQueue.status == "pending",
            )
        ).first()
        if existing:
            return {"ok": True, "queue_id": str(existing[0]), "note": "existing pending"}

        mq = MergeQueue(
            product_id=primary.product_id,
            primary_qa_id=primary.id,
            secondary_qa_ids=[s.id for s in secondaries],
            canonical_draft=draft,
            llm_rationale=rationale,
            suggested_by="llm" if draft else "rule",
            status="pending",
        )
        db.add(mq)
        db.flush()
        log.info("merge_suggest_created", queue=str(mq.id), cluster=str(cid), n=len(member_rows))
        return {"ok": True, "queue_id": str(mq.id)}
