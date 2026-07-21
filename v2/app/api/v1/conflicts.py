"""Library conflict detection endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import LibraryConflict, QAEntry
from app.schemas import ConflictDetail, ConflictOut, QAEntryOut

router = APIRouter()


@router.get("", response_model=list[ConflictOut])
def list_conflicts(
    status_: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    stmt = select(LibraryConflict).order_by(LibraryConflict.detected_at.desc()).limit(limit)
    if status_:
        stmt = select(LibraryConflict).where(LibraryConflict.status == status_).order_by(
            LibraryConflict.detected_at.desc()
        ).limit(limit)
    return db.execute(stmt).scalars().all()


@router.get("/{conflict_id}", response_model=ConflictDetail)
def get_conflict(conflict_id: uuid.UUID, db: Session = Depends(get_db)):
    c = db.get(LibraryConflict, conflict_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "conflict not found")
    a = db.get(QAEntry, c.entry_a_id)
    b = db.get(QAEntry, c.entry_b_id)
    if not a or not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "conflict entries missing")
    return {"conflict": c, "entry_a": a, "entry_b": b}


@router.post("/{conflict_id}/dismiss", response_model=ConflictOut)
def dismiss(conflict_id: uuid.UUID, db: Session = Depends(get_db)):
    c = db.get(LibraryConflict, conflict_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "conflict not found")
    c.status = "dismissed"
    c.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)
    return c


@router.post("/{conflict_id}/resolve", response_model=ConflictOut)
def resolve(conflict_id: uuid.UUID, db: Session = Depends(get_db)):
    """Mark as resolved (used after operator merges/edits the conflicting entries)."""
    c = db.get(LibraryConflict, conflict_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "conflict not found")
    c.status = "resolved"
    c.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)
    return c


@router.post("/scan", response_model=dict)
def trigger_scan(
    product_slug: str | None = Query(None),
    max_pairs: int = Query(200, le=1000),
    db: Session = Depends(get_db),
):
    """Kick off a conflict scan job. Returns a task ack."""
    product_id = None
    if product_slug:
        from app.models import Product
        p = db.execute(select(Product).where(Product.slug == product_slug)).scalar_one_or_none()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "product not found")
        product_id = str(p.id)

    # Quick pre-flight check so the UI can surface actionable reasons.
    from sqlalchemy import text
    n_emb = db.execute(text("SELECT COUNT(*) FROM qa_embeddings")).scalar() or 0
    if n_emb == 0:
        return {
            "queued": False,
            "pairs_checked": 0,
            "conflicts_found": 0,
            "reason": "No embeddings yet — run Prepare index first.",
        }

    try:
        from app.workers.tasks.conflict_scan import run_scan
        task = run_scan.delay(product_id, max_pairs)
        return {"queued": True, "task_id": task.id, "reason": "Scan enqueued — results will appear as they land."}
    except Exception:
        # Fall back to inline for demo scenarios without a celery worker.
        from app.services.conflict_scan import scan_library
        result = scan_library(
            db,
            product_id=uuid.UUID(product_id) if product_id else None,
            max_pairs=max_pairs,
        )
        return {"queued": False, **result}
