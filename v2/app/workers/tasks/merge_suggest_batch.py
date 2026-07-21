"""Batch entrypoint for merge_suggest.

Iterates every cluster with size ≥ 2 that has no pending merge_queue row yet,
and enqueues merge_suggest.for_cluster on each. This is what the "Suggest
merges" button in the frontend calls.
"""

from __future__ import annotations

from sqlalchemy import select, text

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.merge_suggest_batch.suggest_all")
def suggest_all(limit: int = 200) -> dict:
    """Enqueue merge_suggest.for_cluster for every eligible cluster."""
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT c.id
                FROM clusters c
                LEFT JOIN merge_queue mq
                       ON mq.primary_qa_id IN (
                           SELECT qa_entry_id FROM cluster_members WHERE cluster_id = c.id
                       )
                      AND mq.status = 'pending'
                WHERE c.size >= 2
                  AND mq.id IS NULL
                LIMIT :n
                """
            ),
            {"n": limit},
        ).all()

    from app.workers.tasks.merge_suggest import for_cluster
    n = 0
    for (cid,) in rows:
        try:
            for_cluster.delay(str(cid))
            n += 1
        except Exception as e:
            log.warning("merge_suggest_enqueue_failed", cluster=str(cid), err=str(e))

    log.info("merge_suggest_batch_enqueued", n=n)
    return {"enqueued": n}
