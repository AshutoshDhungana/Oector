"""Public Trust Center — no auth.

Serves a curated, is_public=True subset of a product's library so prospects
can self-serve most common questions.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import EntryMapping, FrameworkControl, Product, QAEntry
from app.schemas import TrustEntry, TrustProfile

router = APIRouter()


@router.get("/{product_slug}", response_model=TrustProfile)
def trust_profile(
    product_slug: str,
    q: str | None = Query(None, description="optional keyword filter"),
    category: str | None = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    prod = db.execute(select(Product).where(Product.slug == product_slug)).scalar_one_or_none()
    if not prod:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "product not found")

    stmt = select(QAEntry).where(
        QAEntry.product_id == prod.id,
        QAEntry.is_public.is_(True),
        QAEntry.deleted_at.is_(None),
        QAEntry.status == "active",
    )
    if q:
        needle = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(QAEntry.question).like(needle))
    stmt = stmt.order_by(QAEntry.usage_count.desc(), QAEntry.updated_at.desc()).limit(limit)
    entries = list(db.execute(stmt).scalars().all())

    # Fetch mappings for the returned entries, group by entry.
    entry_ids = [e.id for e in entries]
    fw_by_entry: dict = {}
    if entry_ids:
        rows = db.execute(
            select(EntryMapping.qa_entry_id, FrameworkControl.framework)
            .join(FrameworkControl, FrameworkControl.id == EntryMapping.framework_control_id)
            .where(EntryMapping.qa_entry_id.in_(entry_ids))
        ).all()
        for eid, fw in rows:
            fw_by_entry.setdefault(str(eid), set()).add(fw)

    def _category_of(entry: QAEntry) -> str:
        # Poor-man's category — look at the source or first mapping domain.
        return entry.source or "General"

    all_categories = sorted({_category_of(e) for e in entries})
    if category:
        entries = [e for e in entries if _category_of(e) == category]

    return TrustProfile(
        slug=prod.slug,
        product_name=prod.name,
        tagline=f"Security & compliance answers for {prod.name}",
        frameworks=sorted({fw for fws in fw_by_entry.values() for fw in fws}),
        total_answers=len(entries),
        categories=all_categories,
        entries=[
            TrustEntry(
                id=e.id,
                question=e.question,
                answer=e.answer,
                category=_category_of(e),
                frameworks=sorted(fw_by_entry.get(str(e.id), [])),
                updated_at=e.updated_at,
            )
            for e in entries
        ],
    )
