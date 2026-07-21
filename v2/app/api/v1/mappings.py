"""Cross-framework mapping endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import EntryMapping, FrameworkControl, QAEntry
from app.schemas import FrameworkControlOut, MappingOut
from app.services.framework_mapping import map_entry

router = APIRouter()


@router.get("/entry/{entry_id}", response_model=list[MappingOut])
def get_mappings(entry_id: uuid.UUID, db: Session = Depends(get_db)):
    """Return existing mappings for a QA entry."""
    rows = db.execute(
        select(EntryMapping, FrameworkControl)
        .join(FrameworkControl, EntryMapping.framework_control_id == FrameworkControl.id)
        .where(EntryMapping.qa_entry_id == entry_id)
        .order_by(EntryMapping.score.desc())
    ).all()
    return [
        MappingOut(
            framework=fc.framework,
            control_ref=fc.control_id,
            domain=fc.domain,
            score=em.score,
            rationale=em.rationale,
        )
        for em, fc in rows
    ]


@router.post("/entry/{entry_id}/compute", response_model=list[MappingOut])
def compute_mappings(
    entry_id: uuid.UUID,
    per_framework: int = Query(2, ge=1, le=5),
    verify_with_llm: bool = Query(True),
    db: Session = Depends(get_db),
):
    """(Re)compute mappings for a QA entry across all frameworks."""
    if not db.get(QAEntry, entry_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "entry not found")
    results = map_entry(db, entry_id, per_framework=per_framework, verify_with_llm=verify_with_llm)
    return [MappingOut(**r) for r in results]


@router.get("/frameworks", response_model=list[FrameworkControlOut])
def list_framework_controls(
    framework: str | None = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
):
    stmt = select(FrameworkControl)
    if framework:
        stmt = stmt.where(FrameworkControl.framework == framework)
    stmt = stmt.order_by(FrameworkControl.framework, FrameworkControl.control_id).limit(limit)
    return db.execute(stmt).scalars().all()
