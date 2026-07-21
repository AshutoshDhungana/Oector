"""ingest.parse_csv: stream a CSV upload into qa_entries."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

import pandas as pd
from sqlalchemy import or_, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Job, QAEntry
from app.services.hashing import content_hash
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

BATCH = 1000


def _iter(path: Path) -> Iterator[dict]:
    for chunk in pd.read_csv(path, chunksize=BATCH):
        chunk = chunk.where(pd.notna(chunk), None)
        for r in chunk.to_dict(orient="records"):
            yield r


def _row_to_entry(row: dict, product_id: uuid.UUID) -> dict | None:
    q = str(row.get("question") or "").strip()
    a = str(row.get("answer") or "").strip()
    if not q or not a:
        return None
    details = row.get("details") or row.get("additional_details")
    ext = row.get("id") or row.get("external_id") or row.get("question_id")
    updated = row.get("updated_at") or row.get("last_updated")
    original_updated_at = None
    if updated is not None:
        try:
            ts = pd.to_datetime(updated, utc=True, errors="coerce")
            if not pd.isna(ts):
                original_updated_at = ts.to_pydatetime()
        except Exception:
            pass
    return {
        "id": uuid.uuid4(),
        "product_id": product_id,
        "external_id": str(ext) if ext is not None else None,
        "question": q,
        "answer": a,
        "details": str(details) if details else None,
        "source": str(row.get("source") or "upload"),
        "status": "active",
        "content_hash": content_hash(q, a, str(details or "")),
        "original_updated_at": original_updated_at,
    }


def _flush(db, rows: list[dict]) -> int:
    if not rows:
        return 0
    with_ext = [r for r in rows if r["external_id"]]
    without_ext = [r for r in rows if not r["external_id"]]

    n = 0
    if with_ext:
        stmt = pg_insert(QAEntry).values(with_ext)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_qa_product_external",
            set_={
                "question": stmt.excluded.question,
                "answer": stmt.excluded.answer,
                "details": stmt.excluded.details,
                "source": stmt.excluded.source,
                "content_hash": stmt.excluded.content_hash,
                "original_updated_at": stmt.excluded.original_updated_at,
                "updated_at": datetime.now(timezone.utc),
                "version": QAEntry.version + 1,
            },
            # Repeated imports used to rewrite every external-ID row, even
            # when its content and source metadata were unchanged.
            where=or_(
                QAEntry.content_hash.is_distinct_from(stmt.excluded.content_hash),
                QAEntry.source.is_distinct_from(stmt.excluded.source),
                QAEntry.original_updated_at.is_distinct_from(stmt.excluded.original_updated_at),
            ),
        )
        n += len(db.execute(stmt.returning(QAEntry.id)).scalars().all())
    if without_ext:
        # Deduplicate the incoming batch, then check existing hashes in one
        # query rather than issuing a SELECT for every input row.
        candidates = {
            (row["product_id"], row["content_hash"]): row
            for row in without_ext
        }
        keys = list(candidates)
        existing = set(
            db.execute(
                select(QAEntry.product_id, QAEntry.content_hash).where(
                    tuple_(QAEntry.product_id, QAEntry.content_hash).in_(keys)
                )
            ).all()
        )
        to_insert = [row for key, row in candidates.items() if key not in existing]
        if to_insert:
            n += len(
                db.execute(
                    pg_insert(QAEntry).values(to_insert).returning(QAEntry.id)
                ).scalars().all()
            )
    return n


@celery_app.task(name="app.workers.tasks.ingest.parse_csv", bind=True)
def parse_csv(self, job_id: str) -> dict:
    with session_scope() as db:
        job = db.get(Job, uuid.UUID(job_id))
        if not job:
            return {"ok": False, "reason": "job missing"}
        if job.status == "cancelled":
            return {"ok": False, "reason": "job cancelled"}
        payload = job.payload or {}
        path = Path(payload["path"])
        product_id = uuid.UUID(payload["product_id"])
        job.status = "running"
        job.progress = 0.0

    inserted = 0
    buf: list[dict] = []
    try:
        for i, r in enumerate(_iter(path)):
            e = _row_to_entry(r, product_id)
            if e:
                buf.append(e)
            if len(buf) >= BATCH:
                with session_scope() as db:
                    inserted += _flush(db, buf)
                    j = db.get(Job, uuid.UUID(job_id))
                    j.progress = min(0.99, (inserted / max(inserted + 1, 1)))
                buf.clear()
        if buf:
            with session_scope() as db:
                inserted += _flush(db, buf)
    except Exception as e:
        log.exception("ingest_failed", job=job_id, err=str(e))
        with session_scope() as db:
            j = db.get(Job, uuid.UUID(job_id))
            j.status = "failed"
            j.error = str(e)
            j.progress = 1.0
        raise

    with session_scope() as db:
        j = db.get(Job, uuid.UUID(job_id))
        j.status = "succeeded"
        j.progress = 1.0
        j.result = {"inserted_or_updated": inserted}

    # Kick embedding for anything that lacks a vector.
    from app.workers.tasks.embed import embed_pending
    embed_pending.delay()

    log.info("ingest_done", job=job_id, n=inserted)
    return {"ok": True, "n": inserted}
