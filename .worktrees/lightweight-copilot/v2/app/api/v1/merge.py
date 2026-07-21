from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import MergeQueue, Product, QAEntry, QAEntryHistory, User
from app.schemas import MergeApproveRequest, MergeQueueOut, MergeSourceEntryOut, Page
from app.services.hashing import content_hash
from app.services.pagination import decode_cursor, encode_cursor

router = APIRouter()


def _queue_out(db: Session, mq: MergeQueue) -> MergeQueueOut:
    """Attach the precise primary/secondary entries, preserving queue order."""
    entry_ids = [mq.primary_qa_id, *mq.secondary_qa_ids]
    rows = db.execute(select(QAEntry).where(QAEntry.id.in_(entry_ids))).scalars().all()
    by_id = {entry.id: entry for entry in rows}

    primary = by_id.get(mq.primary_qa_id)
    secondaries = [by_id[entry_id] for entry_id in mq.secondary_qa_ids if entry_id in by_id]
    result = MergeQueueOut.model_validate(mq)
    return result.model_copy(
        update={
            "primary_entry": MergeSourceEntryOut.model_validate(primary) if primary else None,
            "secondary_entries": [MergeSourceEntryOut.model_validate(entry) for entry in secondaries],
        }
    )


@router.get("/queue", response_model=Page)
def list_queue(
    product: Optional[str] = Query(None),
    status_: Optional[str] = Query("pending", alias="status"),
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(MergeQueue).order_by(MergeQueue.created_at.desc(), MergeQueue.id.desc())
    if product:
        p = db.execute(select(Product).where(Product.slug == product)).scalar_one_or_none()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product")
        stmt = stmt.where(MergeQueue.product_id == p.id)
    if status_:
        stmt = stmt.where(MergeQueue.status == status_)
    cur = decode_cursor(cursor)
    if cur:
        c_ts, c_id = cur
        stmt = stmt.where(
            or_(
                MergeQueue.created_at < c_ts,
                and_(MergeQueue.created_at == c_ts, MergeQueue.id < c_id),
            )
        )
    rows = db.execute(stmt.limit(limit + 1)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = encode_cursor(rows[-1].created_at, rows[-1].id) if has_more and rows else None
    return Page(
        items=[_queue_out(db, r) for r in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.post("/queue/{mq_id}/approve", response_model=MergeQueueOut)
def approve(
    mq_id: uuid.UUID,
    body: MergeApproveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mq = db.get(MergeQueue, mq_id)
    if not mq:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Merge candidate not found")
    if mq.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Already {mq.status}")

    primary = db.get(QAEntry, mq.primary_qa_id)
    if primary is None:
        raise HTTPException(status.HTTP_410_GONE, "Primary entry gone")

    draft = (body.canonical_override or mq.canonical_draft or {})
    before = {
        "question": primary.question,
        "answer": primary.answer,
        "details": primary.details,
    }
    primary.question = draft.get("question", primary.question)
    primary.answer = draft.get("answer", primary.answer)
    primary.details = draft.get("details", primary.details)
    primary.content_hash = content_hash(primary.question, primary.answer, primary.details or "")
    primary.version += 1
    primary.updated_at = datetime.now(timezone.utc)

    db.add(QAEntryHistory(
        qa_entry_id=primary.id,
        changed_by=user.id,
        change_type="merge",
        before=before,
        after={
            "question": primary.question,
            "answer": primary.answer,
            "details": primary.details,
            "merged_from": [str(x) for x in mq.secondary_qa_ids],
        },
    ))

    now = datetime.now(timezone.utc)
    for sid in mq.secondary_qa_ids:
        s = db.get(QAEntry, sid)
        if s and s.deleted_at is None:
            s.status = "merged"
            s.deleted_at = now
            db.add(QAEntryHistory(
                qa_entry_id=s.id,
                changed_by=user.id,
                change_type="merge",
                before={"status": "active"},
                after={"status": "merged", "canonical": str(primary.id)},
            ))

    mq.status = "approved"
    mq.resolved_at = now
    mq.resolved_by = user.id
    db.commit()
    db.refresh(mq)
    return _queue_out(db, mq)


@router.post("/suggest", response_model=dict)
def suggest_batch(limit: int = 200):
    """Trigger the batch merge-suggest worker for all eligible clusters."""
    try:
        from app.workers.tasks.merge_suggest_batch import suggest_all
        task = suggest_all.delay(limit)
        return {"queued": True, "task_id": task.id}
    except Exception as e:
        return {"queued": False, "error": str(e)}


@router.post("/queue/{mq_id}/reject", response_model=MergeQueueOut)
def reject(mq_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mq = db.get(MergeQueue, mq_id)
    if not mq:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Merge candidate not found")
    if mq.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Already {mq.status}")
    mq.status = "rejected"
    mq.resolved_at = datetime.now(timezone.utc)
    mq.resolved_by = user.id
    db.commit()
    db.refresh(mq)
    return _queue_out(db, mq)
