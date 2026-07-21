from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Product, QAEntry, QAEntryHistory, User
from app.schemas import Page, QAEntryOut, QAEntryUpdate
from app.services.hashing import content_hash
from app.services.pagination import decode_cursor, encode_cursor

router = APIRouter()

PAGE_MAX = 100


@router.get("", response_model=Page)
def list_entries(
    product: Optional[str] = Query(None, description="Product slug"),
    status_: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = Query(None, description="Substring search on question"),
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=PAGE_MAX),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(QAEntry).order_by(QAEntry.created_at.desc(), QAEntry.id.desc())

    if product:
        p = db.execute(select(Product).where(Product.slug == product)).scalar_one_or_none()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product")
        stmt = stmt.where(QAEntry.product_id == p.id)

    if status_:
        stmt = stmt.where(QAEntry.status == status_)

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(QAEntry.question.ilike(pattern), QAEntry.answer.ilike(pattern)))

    cur = decode_cursor(cursor)
    if cur:
        c_ts, c_id = cur
        stmt = stmt.where(
            or_(
                QAEntry.created_at < c_ts,
                and_(QAEntry.created_at == c_ts, QAEntry.id < c_id),
            )
        )

    rows = db.execute(stmt.limit(limit + 1)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        next_cursor = encode_cursor(last.created_at, last.id)

    return Page(
        items=[QAEntryOut.model_validate(r) for r in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.get("/{entry_id}", response_model=QAEntryOut)
def get_entry(entry_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = db.get(QAEntry, entry_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return row


@router.patch("/{entry_id}", response_model=QAEntryOut)
def update_entry(
    entry_id: uuid.UUID,
    body: QAEntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.get(QAEntry, entry_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    before = {
        "question": row.question,
        "answer": row.answer,
        "details": row.details,
        "source": row.source,
        "status": row.status,
    }
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(row, k, v)
    row.content_hash = content_hash(row.question, row.answer, row.details or "")
    row.version += 1
    row.updated_at = datetime.now(timezone.utc)

    db.add(QAEntryHistory(
        qa_entry_id=row.id,
        changed_by=user.id,
        change_type="update",
        before=before,
        after={**before, **changes},
    ))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.get(QAEntry, entry_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    row.deleted_at = datetime.now(timezone.utc)
    row.status = "archived"
    db.add(QAEntryHistory(
        qa_entry_id=row.id,
        changed_by=user.id,
        change_type="archive",
        before={"status": "active"},
        after={"status": "archived"},
    ))
    db.commit()
    return None
