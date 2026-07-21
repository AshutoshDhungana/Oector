from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Cluster, ClusterMember, Product, QAEntry, User
from app.schemas import Page, QAEntryOut
from app.services.pagination import decode_cursor, encode_cursor

router = APIRouter()


@router.get("")
def list_clusters(
    product: Optional[str] = Query(None),
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Cluster).order_by(Cluster.created_at.desc(), Cluster.id.desc())
    if product:
        p = db.execute(select(Product).where(Product.slug == product)).scalar_one_or_none()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product")
        stmt = stmt.where(Cluster.product_id == p.id)

    cur = decode_cursor(cursor)
    if cur:
        c_ts, c_id = cur
        stmt = stmt.where(
            or_(
                Cluster.created_at < c_ts,
                and_(Cluster.created_at == c_ts, Cluster.id < c_id),
            )
        )
    rows = db.execute(stmt.limit(limit + 1)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = encode_cursor(rows[-1].created_at, rows[-1].id) if has_more and rows else None

    return {
        "items": [
            {
                "id": str(c.id),
                "product_id": str(c.product_id),
                "size": c.size,
                "label": c.label,
                "algo_version": c.algo_version,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            }
            for c in rows
        ],
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


@router.get("/{cluster_id}")
def get_cluster(cluster_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.get(Cluster, cluster_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return c


@router.get("/{cluster_id}/members", response_model=Page)
def cluster_members(
    cluster_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = (
        select(QAEntry, ClusterMember.is_canonical, ClusterMember.distance_to_centroid)
        .join(ClusterMember, ClusterMember.qa_entry_id == QAEntry.id)
        .where(ClusterMember.cluster_id == cluster_id)
        .order_by(ClusterMember.distance_to_centroid.asc().nullslast(), QAEntry.id.desc())
    )
    rows = db.execute(stmt.limit(limit + 1)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    items = []
    for entry, is_canonical, dist in rows:
        items.append({
            **QAEntryOut.model_validate(entry).model_dump(),
            "is_canonical": is_canonical,
            "distance_to_centroid": dist,
        })
    return Page(items=items, next_cursor=None, has_more=has_more)
