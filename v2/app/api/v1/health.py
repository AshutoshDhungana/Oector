from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import OutdatedFlag, Product, QAEntry, User
from app.schemas import HealthSummary, OutdatedFlagEntry, OutdatedFlagOut, Page
from app.services.pagination import decode_cursor, encode_cursor

router = APIRouter()


def _resolve_product(db: Session, slug: str) -> Product:
    p = db.execute(select(Product).where(Product.slug == slug)).scalar_one_or_none()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product")
    return p


@router.get("/summary", response_model=HealthSummary)
def summary(
    product: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    entry_q = select(func.count(QAEntry.id)).where(QAEntry.deleted_at.is_(None))
    active_q = entry_q.where(QAEntry.status == "active")
    archived_q = entry_q.where(QAEntry.status == "archived")

    product_id: Optional[uuid.UUID] = None
    if product:
        product_id = _resolve_product(db, product).id
        entry_q = entry_q.where(QAEntry.product_id == product_id)
        active_q = active_q.where(QAEntry.product_id == product_id)
        archived_q = archived_q.where(QAEntry.product_id == product_id)

    total = db.execute(entry_q).scalar_one()
    active = db.execute(active_q).scalar_one()
    archived = db.execute(archived_q).scalar_one()

    by_status_q = select(OutdatedFlag.status, func.count(OutdatedFlag.qa_entry_id))
    avg_q = select(func.coalesce(func.avg(OutdatedFlag.score), 0.0))
    if product_id is not None:
        by_status_q = by_status_q.join(QAEntry, QAEntry.id == OutdatedFlag.qa_entry_id).where(
            QAEntry.product_id == product_id
        )
        avg_q = avg_q.join(QAEntry, QAEntry.id == OutdatedFlag.qa_entry_id).where(
            QAEntry.product_id == product_id
        )
    by_status_rows = db.execute(by_status_q.group_by(OutdatedFlag.status)).all()
    by_status = {s: n for s, n in by_status_rows}
    avg_score = db.execute(avg_q).scalar_one()

    return HealthSummary(
        product_slug=product,
        total=total,
        active=active,
        archived=archived,
        by_status=by_status,
        average_score=float(avg_score),
    )


@router.get("/outdated", response_model=Page)
def outdated(
    product: Optional[str] = Query(None),
    status_: Optional[str] = Query(None, alias="status"),
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(OutdatedFlag).order_by(
        OutdatedFlag.updated_at.desc(), OutdatedFlag.qa_entry_id.desc()
    )
    if product:
        p = _resolve_product(db, product)
        stmt = stmt.join(QAEntry, QAEntry.id == OutdatedFlag.qa_entry_id).where(
            QAEntry.product_id == p.id
        )
    if status_:
        stmt = stmt.where(OutdatedFlag.status == status_)
    cur = decode_cursor(cursor)
    if cur:
        c_ts, c_id = cur
        stmt = stmt.where(
            or_(
                OutdatedFlag.updated_at < c_ts,
                and_(OutdatedFlag.updated_at == c_ts, OutdatedFlag.qa_entry_id < c_id),
            )
        )
    rows = db.execute(stmt.limit(limit + 1)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = (
        encode_cursor(rows[-1].updated_at, rows[-1].qa_entry_id) if has_more and rows else None
    )

    # Batch-load the QA entries for these flags so the UI can render question/answer.
    entry_ids = [r.qa_entry_id for r in rows]
    entries_by_id: dict = {}
    if entry_ids:
        for e in db.execute(select(QAEntry).where(QAEntry.id.in_(entry_ids))).scalars().all():
            entries_by_id[e.id] = e

    items = []
    for r in rows:
        e = entries_by_id.get(r.qa_entry_id)
        payload = OutdatedFlagOut(
            qa_entry_id=r.qa_entry_id,
            status=r.status,
            score=r.score,
            reason=r.reason,
            updated_at=r.updated_at,
            entry=(
                OutdatedFlagEntry(
                    id=e.id,
                    product_id=e.product_id,
                    external_id=e.external_id,
                    question=e.question,
                    answer=e.answer,
                    source=e.source,
                    original_updated_at=e.original_updated_at,
                    updated_at=e.updated_at,
                    status=e.status,
                )
                if e is not None
                else None
            ),
        )
        items.append(payload)

    return Page(items=items, next_cursor=next_cursor, has_more=has_more)


@router.post("/recheck/{entry_id}")
def recheck(entry_id: uuid.UUID, _: User = Depends(get_current_user)):
    from app.workers.tasks.outdated_check import verify_entry
    verify_entry.delay(str(entry_id))
    return {"queued": True, "entry_id": str(entry_id)}
