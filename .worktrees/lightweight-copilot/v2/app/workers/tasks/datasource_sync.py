"""datasource.sync — pull rows from any connector into qa_entries."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Iterable

import pandas as pd
from sqlalchemy import or_, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import DataSource, DataSourceFile, Job, QAEntry
from app.services.connectors import get_connector
from app.services.connectors.base import ConnectorError, ConnectorRow
from app.services.hashing import content_hash
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

BATCH = 1000


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        ts = pd.to_datetime(s, utc=True, errors="coerce")
        if pd.isna(ts):
            return None
        return ts.to_pydatetime()
    except Exception:
        return None


def _row_to_entry(r: ConnectorRow, product_id: uuid.UUID) -> dict | None:
    q, a = r.question.strip(), r.answer.strip()
    if not q or not a:
        return None
    return {
        "id": uuid.uuid4(),
        "product_id": product_id,
        "external_id": r.external_id,
        "question": q,
        "answer": a,
        "details": r.details,
        "source": r.source or "datasource",
        "status": "active",
        "content_hash": content_hash(q, a, r.details or ""),
        "original_updated_at": _parse_dt(r.updated_at),
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
            where=or_(
                QAEntry.content_hash.is_distinct_from(stmt.excluded.content_hash),
                QAEntry.source.is_distinct_from(stmt.excluded.source),
                QAEntry.original_updated_at.is_distinct_from(stmt.excluded.original_updated_at),
            ),
        )
        n += len(db.execute(stmt.returning(QAEntry.id)).scalars().all())
    if without_ext:
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


@celery_app.task(name="app.workers.tasks.datasource_sync.sync", bind=True)
def sync(self, job_id: str) -> dict:
    with session_scope() as db:
        job = db.get(Job, uuid.UUID(job_id))
        if not job:
            return {"ok": False, "reason": "job missing"}
        if job.status == "cancelled":
            return {"ok": False, "reason": "job cancelled"}
        payload = job.payload or {}
        ds_id = uuid.UUID(payload["data_source_id"])
        ds = db.get(DataSource, ds_id)
        if not ds:
            job.status = "failed"
            job.error = "data source missing"
            return {"ok": False}
        product_id = ds.product_id
        kind = ds.kind
        config = dict(ds.config or {})
        files: list[dict] = []
        if kind == "csv_bundle":
            for f in db.execute(
                select(DataSourceFile).where(DataSourceFile.data_source_id == ds_id)
            ).scalars():
                files.append({"alias": f.alias, "path": f.path, "filename": f.filename})
        job.status = "running"
        job.progress = 0.0

    inserted = 0
    err: str | None = None
    try:
        connector = get_connector(kind, config, files)
        connector.validate()
        buf: list[dict] = []
        for r in connector.iter_rows():
            e = _row_to_entry(r, product_id)
            if e:
                buf.append(e)
            if len(buf) >= BATCH:
                with session_scope() as db:
                    inserted += _flush(db, buf)
                    j = db.get(Job, uuid.UUID(job_id))
                    j.progress = min(0.99, inserted / max(inserted + BATCH, 1))
                buf.clear()
        if buf:
            with session_scope() as db:
                inserted += _flush(db, buf)
    except ConnectorError as e:
        err = f"connector error: {e}"
        log.warning("datasource_sync_config_error", ds=str(ds_id), err=str(e))
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        log.exception("datasource_sync_failed", ds=str(ds_id))

    with session_scope() as db:
        j = db.get(Job, uuid.UUID(job_id))
        d = db.get(DataSource, ds_id)
        if err:
            j.status = "failed"
            j.error = err
            j.progress = 1.0
            if d:
                d.last_error = err
        else:
            j.status = "succeeded"
            j.result = {"inserted_or_updated": inserted}
            j.progress = 1.0
            if d:
                d.last_error = None
        if d:
            d.last_synced_at = datetime.now(timezone.utc)

    if not err:
        # kick embedding for anything new
        from app.workers.tasks.embed import embed_pending
        embed_pending.delay()

    log.info("datasource_sync_done", ds=str(ds_id), inserted=inserted, err=err)
    return {"ok": not err, "inserted": inserted, "error": err}


@celery_app.task(name="app.workers.tasks.datasource_sync.poll_all")
def poll_all() -> dict:
    """Beat: enqueue sync for every enabled source whose poll_interval has elapsed."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    n = 0
    with session_scope() as db:
        rows = db.execute(
            select(DataSource).where(
                DataSource.enabled.is_(True),
                DataSource.poll_interval_minutes.is_not(None),
            )
        ).scalars().all()
        for ds in rows:
            if ds.last_synced_at is None or ds.last_synced_at + timedelta(minutes=ds.poll_interval_minutes) <= now:
                job = Job(kind="datasource.sync", status="queued", payload={"data_source_id": str(ds.id)})
                db.add(job)
                db.flush()
                sync.delay(str(job.id))
                n += 1
    log.info("datasource_poll_enqueued", n=n)
    return {"enqueued": n}
