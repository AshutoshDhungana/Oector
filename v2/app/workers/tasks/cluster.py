"""Online cluster assignment for newly embedded entries.

Embedding and retrieval do not depend on clusters, so assignment is batched to
keep the critical ingestion path small. The batch task replaces thousands of
tiny Celery messages and commits its work once per batch.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from redis import Redis
from redis.exceptions import LockError
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Cluster, ClusterMember, QAEmbedding, QAEntry
from app.workers.celery_app import celery_app

configure_logging()
log = get_logger(__name__)

JOIN_THRESHOLD = 0.35
ALGO_VERSION = "online-v1"
CLUSTER_LOCK_KEY = "kle:locks:cluster_assign"


def _acquire_lock():
    client = Redis.from_url(settings.redis_url)
    lock = client.lock(
        CLUSTER_LOCK_KEY,
        timeout=settings.cluster_task_lock_seconds,
        blocking=False,
    )
    if not lock.acquire(blocking=False):
        return None
    return lock


def _release_lock(lock) -> None:
    try:
        lock.release()
    except LockError:
        log.warning("cluster_lock_expired_before_release")
    except Exception as exc:
        log.warning("cluster_lock_release_failed", err=str(exc))


def _recompute_cluster(db: Session, cluster_id: uuid.UUID) -> None:
    row = db.execute(
        text(
            """
            SELECT COUNT(*) AS n, AVG(e.vector) AS avg_vec
            FROM cluster_members m
            JOIN qa_embeddings e ON e.qa_entry_id = m.qa_entry_id
            WHERE m.cluster_id = :cid
            """
        ),
        {"cid": cluster_id},
    ).one()

    if int(row.n) == 0:
        db.execute(text("DELETE FROM clusters WHERE id = :cid"), {"cid": cluster_id})
        return

    db.execute(
        text(
            """
            UPDATE clusters
            SET size = :n,
                centroid = CAST(:centroid AS vector),
                updated_at = NOW()
            WHERE id = :cid
            """
        ),
        {"cid": cluster_id, "n": int(row.n), "centroid": list(row.avg_vec)},
    )


def _append_to_cluster(db: Session, cluster_id: uuid.UUID, size: int, centroid, vector) -> None:
    old_size = max(0, int(size or 0))
    old_centroid = list(centroid) if centroid is not None else list(vector)
    new_size = old_size + 1
    new_centroid = [
        ((float(old) * old_size) + float(value)) / new_size
        for old, value in zip(old_centroid, vector)
    ]
    db.execute(
        text(
            """
            UPDATE clusters
            SET size = :size,
                centroid = CAST(:centroid AS vector),
                updated_at = NOW()
            WHERE id = :cid
            """
        ),
        {"cid": cluster_id, "size": new_size, "centroid": new_centroid},
    )


def _assign(db: Session, entry_id: uuid.UUID) -> dict:
    entry = db.get(QAEntry, entry_id)
    embedding = db.get(QAEmbedding, entry_id)
    if not entry or not embedding:
        return {"ok": False, "reason": "missing entry/embedding"}

    vector = list(embedding.vector)
    old_cluster_ids = list(
        db.execute(
            select(ClusterMember.cluster_id).where(ClusterMember.qa_entry_id == entry_id)
        ).scalars()
    )

    candidate = db.execute(
        text(
            """
            SELECT id, size, centroid, centroid <=> CAST(:vec AS vector) AS dist
            FROM clusters
            WHERE product_id = :pid AND centroid IS NOT NULL AND size > 0
            ORDER BY centroid <=> CAST(:vec AS vector)
            LIMIT 1
            """
        ),
        {"vec": vector, "pid": entry.product_id},
    ).first()

    created = candidate is None or candidate.dist is None or float(candidate.dist) >= JOIN_THRESHOLD
    if created:
        cluster = Cluster(
            product_id=entry.product_id,
            algo_version=ALGO_VERSION,
            size=1,
            centroid=vector,
        )
        db.add(cluster)
        db.flush()
        cluster_id = cluster.id
        distance = 0.0
    else:
        cluster_id = candidate.id
        distance = float(candidate.dist)

    if old_cluster_ids:
        db.execute(
            text("DELETE FROM cluster_members WHERE qa_entry_id = :qid"),
            {"qid": entry_id},
        )

    db.execute(
        pg_insert(ClusterMember).values(
            cluster_id=cluster_id,
            qa_entry_id=entry_id,
            is_canonical=False,
            distance_to_centroid=distance,
            added_at=datetime.now(timezone.utc),
        )
    )

    # New entries use an O(dimensions) centroid update. Re-embedded entries
    # retain the exact aggregate path, and any old cluster is repaired once.
    if not created:
        if cluster_id in old_cluster_ids:
            _recompute_cluster(db, cluster_id)
        else:
            _append_to_cluster(db, cluster_id, candidate.size, candidate.centroid, vector)

    for old_cluster_id in set(old_cluster_ids):
        if old_cluster_id != cluster_id:
            _recompute_cluster(db, old_cluster_id)

    return {
        "ok": True,
        "cluster_id": str(cluster_id),
        "distance": distance,
        "created_cluster": created,
    }


@celery_app.task(name="app.workers.tasks.cluster.online_assign")
def online_assign(entry_id: str) -> dict:
    """Compatibility task for older callers, using the batched lock path."""
    return online_assign_batch([entry_id])


@celery_app.task(name="app.workers.tasks.cluster.online_assign_batch")
def online_assign_batch(entry_ids: list[str]) -> dict:
    """Assign a bounded embedding batch in one transaction and one queue task."""
    if not entry_ids:
        return {"processed": 0, "skipped": 0}

    lock = _acquire_lock()
    if lock is None:
        # Preserve correctness without flooding Redis: one deferred batch waits
        # for the current cluster assignment to finish.
        online_assign_batch.apply_async(args=[entry_ids], countdown=5)
        return {"processed": 0, "deferred": len(entry_ids)}

    processed = 0
    skipped = 0
    created = 0
    try:
        with session_scope() as db:
            for raw_id in entry_ids:
                try:
                    result = _assign(db, uuid.UUID(raw_id))
                except ValueError:
                    skipped += 1
                    continue
                if result.get("ok"):
                    processed += 1
                    created += int(bool(result.get("created_cluster")))
                else:
                    skipped += 1
    finally:
        _release_lock(lock)

    log.info(
        "online_assign_batch_done",
        processed=processed,
        skipped=skipped,
        created_clusters=created,
    )
    return {
        "processed": processed,
        "skipped": skipped,
        "created_clusters": created,
    }


@celery_app.task(name="app.workers.tasks.cluster.nightly_rebuild")
def nightly_rebuild() -> dict:
    """Repair cluster centroids in set-based SQL without reclustering the library.

    Online assignment already places new vectors in a cluster. This maintenance
    pass removes memberships whose embeddings no longer exist, recomputes every
    remaining centroid in one aggregate query, and prunes empty clusters. That
    keeps the scheduled task bounded and avoids a costly full-library HDBSCAN
    pass competing with interactive work.
    """
    lock = _acquire_lock()
    if lock is None:
        return {"updated": 0, "skipped": "assignment_in_progress"}

    try:
        with session_scope() as db:
            removed_members = db.execute(
                text(
                    """
                    DELETE FROM cluster_members m
                    WHERE NOT EXISTS (
                        SELECT 1 FROM qa_embeddings e
                        WHERE e.qa_entry_id = m.qa_entry_id
                    )
                    """
                )
            ).rowcount or 0
            updated = db.execute(
                text(
                    """
                    UPDATE clusters c
                    SET size = aggregates.size,
                        centroid = aggregates.centroid,
                        updated_at = NOW()
                    FROM (
                        SELECT m.cluster_id,
                               COUNT(*)::integer AS size,
                               AVG(e.vector) AS centroid
                        FROM cluster_members m
                        JOIN qa_embeddings e ON e.qa_entry_id = m.qa_entry_id
                        GROUP BY m.cluster_id
                    ) AS aggregates
                    WHERE c.id = aggregates.cluster_id
                    """
                )
            ).rowcount or 0
            deleted = db.execute(
                text(
                    """
                    DELETE FROM clusters c
                    WHERE NOT EXISTS (
                        SELECT 1 FROM cluster_members m
                        WHERE m.cluster_id = c.id
                    )
                    """
                )
            ).rowcount or 0
    finally:
        _release_lock(lock)

    result = {
        "updated": updated,
        "removed_members": removed_members,
        "removed_clusters": deleted,
    }
    log.info("cluster_centroids_rebuilt", **result)
    return result
