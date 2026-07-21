"""Compute embeddings for entries lacking a current vector.

The task is deliberately single-flight: imports, datasource syncs, Beat, and the
admin endpoint can all request embedding without duplicating model inference.
When a full batch is found, it immediately schedules the next batch so a large
backlog drains continuously instead of waiting for the next Beat interval.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

from redis import Redis
from redis.exceptions import LockError
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import QAEmbedding
from app.services.embedding import embed_texts, model_version
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

EMBED_LOCK_KEY = "kle:locks:embed_pending"


def _acquire_lock():
    client = Redis.from_url(settings.redis_url)
    lock = client.lock(
        EMBED_LOCK_KEY,
        timeout=settings.embedding_task_lock_seconds,
        blocking=False,
    )
    if not lock.acquire(blocking=False):
        return None
    return lock


def _release_lock(lock) -> None:
    try:
        lock.release()
    except LockError:
        # The TTL may have expired after a long-running batch. A future task
        # can safely continue because writes are idempotent upserts.
        log.warning("embed_lock_expired_before_release")
    except Exception as exc:
        log.warning("embed_lock_release_failed", err=str(exc))


@celery_app.task(name="app.workers.tasks.embed.embed_pending")
def embed_pending(limit: int | None = None) -> dict:
    """Embed one bounded batch and immediately continue while work remains."""
    batch_limit = max(1, int(limit or settings.embedding_pending_limit))
    lock = _acquire_lock()
    if lock is None:
        log.info("embed_batch_skipped", reason="already_running")
        return {"processed": 0, "skipped": "already_running"}

    result: dict = {"processed": 0}
    enqueue_next = False
    try:
        total_started = time.perf_counter()
        mv = model_version()

        with session_scope() as db:
            rows = db.execute(
                text(
                    """
                    SELECT q.id, q.question, q.answer, q.content_hash
                    FROM qa_entries q
                    LEFT JOIN qa_embeddings e ON e.qa_entry_id = q.id
                    WHERE q.deleted_at IS NULL
                      AND (
                            e.qa_entry_id IS NULL
                         OR e.model_version <> :mv
                         OR e.content_hash <> q.content_hash
                      )
                    ORDER BY q.created_at ASC, q.id ASC
                    LIMIT :n
                    """
                ),
                {"mv": mv, "n": batch_limit},
            ).all()

        if not rows:
            return result

        ids = [row[0] for row in rows]
        texts_to_embed = [f"{row[1]}\n\n{row[2]}" for row in rows]

        encode_started = time.perf_counter()
        vectors = embed_texts(texts_to_embed, batch_size=settings.embedding_batch_size)
        encode_seconds = round(time.perf_counter() - encode_started, 3)

        now = datetime.now(timezone.utc)
        records = [
            {
                "qa_entry_id": entry_id,
                "model_version": mv,
                "vector": vector,
                "content_hash": content_hash,
                "computed_at": now,
            }
            for entry_id, content_hash, vector in zip(
                ids,
                (row[3] for row in rows),
                vectors,
            )
        ]

        write_started = time.perf_counter()
        with session_scope() as db:
            insert_stmt = pg_insert(QAEmbedding).values(records)
            upsert_stmt = insert_stmt.on_conflict_do_update(
                index_elements=[QAEmbedding.qa_entry_id],
                set_={
                    "vector": insert_stmt.excluded.vector,
                    "model_version": insert_stmt.excluded.model_version,
                    "content_hash": insert_stmt.excluded.content_hash,
                    "computed_at": insert_stmt.excluded.computed_at,
                },
            )
            db.execute(upsert_stmt)
        write_seconds = round(time.perf_counter() - write_started, 3)

        # One batched task replaces one Celery message per embedded entry.
        from app.workers.tasks.cluster import online_assign_batch

        cluster_task_id = None
        try:
            cluster_task_id = online_assign_batch.delay([str(entry_id) for entry_id in ids]).id
        except Exception as exc:
            log.exception("cluster_batch_enqueue_failed", err=str(exc))

        enqueue_next = len(rows) == batch_limit
        result = {
            "processed": len(ids),
            "model_version": mv,
            "cluster_task_id": cluster_task_id,
            "encode_seconds": encode_seconds,
            "write_seconds": write_seconds,
            "total_seconds": round(time.perf_counter() - total_started, 3),
        }
        log.info("embed_batch_done", **result)
    finally:
        _release_lock(lock)

    # Release the single-flight lock before queuing the continuation. The next
    # task can acquire it immediately and drains the remaining backlog.
    if enqueue_next:
        try:
            result["next_task_id"] = embed_pending.delay(batch_limit).id
        except Exception as exc:
            log.exception("embed_continuation_enqueue_failed", err=str(exc))

    return result
