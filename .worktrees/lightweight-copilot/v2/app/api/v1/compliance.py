from __future__ import annotations

import uuid
from typing import Optional

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import ComplianceChange, ComplianceSource, User
from app.schemas import (
    ComplianceChangeOut,
    ComplianceSourceIn,
    ComplianceSourceOut,
    Page,
)
from app.services.pagination import decode_cursor, encode_cursor

router = APIRouter()


@router.get("/sources", response_model=list[ComplianceSourceOut])
def list_sources(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.execute(select(ComplianceSource).order_by(ComplianceSource.name)).scalars().all()
    return rows


@router.post("/sources", response_model=ComplianceSourceOut, status_code=status.HTTP_201_CREATED)
def add_source(
    body: ComplianceSourceIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.kind not in {"rss", "http", "sitemap"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "kind must be rss|http|sitemap")
    src = ComplianceSource(**body.model_dump())
    db.add(src)
    db.commit()
    db.refresh(src)
    return src


@router.patch("/sources/{sid}", response_model=ComplianceSourceOut)
def patch_source(
    sid: uuid.UUID,
    enabled: Optional[bool] = None,
    poll_interval_minutes: Optional[int] = None,
    db: Session = Depends(get_db),
):
    src = db.get(ComplianceSource, sid)
    if not src:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "source not found")
    if enabled is not None:
        src.enabled = enabled
    if poll_interval_minutes is not None:
        src.poll_interval_minutes = poll_interval_minutes
    db.commit()
    db.refresh(src)
    return src


@router.delete("/sources/{sid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(sid: uuid.UUID, db: Session = Depends(get_db)):
    src = db.get(ComplianceSource, sid)
    if not src:
        return
    db.delete(src)
    db.commit()


@router.post("/sources/{sid}/crawl", response_model=dict)
def crawl_now(sid: uuid.UUID, db: Session = Depends(get_db)):
    """Force an immediate crawl for one source (bypasses poll_interval)."""
    src = db.get(ComplianceSource, sid)
    if not src:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "source not found")
    try:
        from app.workers.tasks.compliance_poll import poll_one
        task = poll_one.delay(str(sid))
        return {"queued": True, "task_id": task.id}
    except Exception as e:
        return {"queued": False, "error": str(e)}


@router.post("/crawl-all", response_model=dict)
def crawl_all_now():
    """Force an immediate crawl of every enabled source."""
    try:
        from app.workers.tasks.compliance_poll import poll_all
        task = poll_all.delay()
        return {"queued": True, "task_id": task.id}
    except Exception as e:
        return {"queued": False, "error": str(e)}


@router.get("/status", response_model=dict)
def status_view(db: Session = Depends(get_db)):
    """Live overview — powers the crawler status header in the UI."""
    total = db.scalar(select(func.count(ComplianceSource.id))) or 0
    enabled = db.scalar(
        select(func.count(ComplianceSource.id)).where(ComplianceSource.enabled.is_(True))
    ) or 0
    last_poll = db.scalar(select(func.max(ComplianceSource.last_polled_at)))
    changes_24h = db.scalar(
        select(func.count(ComplianceChange.id)).where(
            ComplianceChange.detected_at > datetime.now(timezone.utc) - timedelta(hours=24)
        )
    ) or 0
    total_changes = db.scalar(select(func.count(ComplianceChange.id))) or 0

    # Recently crawled sources
    recent_rows = db.execute(
        select(ComplianceSource)
        .where(ComplianceSource.last_polled_at.isnot(None))
        .order_by(ComplianceSource.last_polled_at.desc())
        .limit(10)
    ).scalars().all()
    recent = [
        {
            "id": str(s.id), "name": s.name, "url": s.url, "kind": s.kind,
            "last_polled_at": s.last_polled_at.isoformat() if s.last_polled_at else None,
            "enabled": s.enabled,
        }
        for s in recent_rows
    ]

    return {
        "total_sources": int(total),
        "enabled_sources": int(enabled),
        "last_poll_at": last_poll.isoformat() if last_poll else None,
        "changes_24h": int(changes_24h),
        "total_changes": int(total_changes),
        "recent_crawls": recent,
    }


@router.get("/changes", response_model=Page)
def list_changes(
    source_id: Optional[uuid.UUID] = None,
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(ComplianceChange).order_by(
        ComplianceChange.detected_at.desc(), ComplianceChange.id.desc()
    )
    if source_id:
        stmt = stmt.where(ComplianceChange.source_id == source_id)
    cur = decode_cursor(cursor)
    if cur:
        c_ts, c_id = cur
        stmt = stmt.where(
            or_(
                ComplianceChange.detected_at < c_ts,
                and_(ComplianceChange.detected_at == c_ts, ComplianceChange.id < c_id),
            )
        )
    rows = db.execute(stmt.limit(limit + 1)).scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = encode_cursor(rows[-1].detected_at, rows[-1].id) if has_more and rows else None
    return Page(
        items=[ComplianceChangeOut.model_validate(r) for r in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )
