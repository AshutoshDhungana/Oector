"""Batch conflict scan across the library."""

from __future__ import annotations

import uuid

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.services.conflict_scan import scan_library
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.conflict_scan.run")
def run_scan(product_id: str | None = None, max_pairs: int = 200) -> dict:
    pid = uuid.UUID(product_id) if product_id else None
    with session_scope() as db:
        return scan_library(db, product_id=pid, max_pairs=max_pairs)
