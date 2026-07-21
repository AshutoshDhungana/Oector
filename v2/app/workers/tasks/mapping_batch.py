"""Precompute framework mappings for all entries lacking them."""

from __future__ import annotations

import uuid

from sqlalchemy import text

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.services.framework_mapping import map_entry
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.mapping_batch.run")
def run_mapping_batch(limit: int = 200, verify_with_llm: bool = True) -> dict:
    """Run map_entry for entries with no mappings yet."""
    with session_scope() as db:
        rows = db.execute(
            text(
                """
                SELECT q.id FROM qa_entries q
                LEFT JOIN entry_mappings em ON em.qa_entry_id = q.id
                WHERE q.deleted_at IS NULL AND q.status = 'active'
                  AND em.id IS NULL
                LIMIT :n
                """
            ),
            {"n": limit},
        ).all()

    processed = 0
    for (entry_id,) in rows:
        with session_scope() as db:
            try:
                map_entry(db, entry_id, verify_with_llm=verify_with_llm)
                processed += 1
            except Exception as e:
                log.warning("mapping_entry_failed", id=str(entry_id), err=str(e))

    log.info("mapping_batch_done", processed=processed)
    return {"processed": processed}
