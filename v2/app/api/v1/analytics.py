"""Analytics dashboard endpoints — everything is a live query."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import (
    EntryMapping,
    LibraryConflict,
    OutdatedFlag,
    Product,
    QAEntry,
    Questionnaire,
    QuestionnaireItem,
)
from app.schemas import AnalyticsOverview

router = APIRouter()

# Rough time-per-question analyst baseline used in hours-saved heuristic:
# 6 minutes/question × auto-answered questions.
MINUTES_PER_MANUAL = 6.0


@router.get("/overview", response_model=AnalyticsOverview)
def overview(db: Session = Depends(get_db)):
    library_total = db.scalar(select(func.count(QAEntry.id))) or 0
    library_active = db.scalar(
        select(func.count(QAEntry.id)).where(QAEntry.deleted_at.is_(None), QAEntry.status == "active")
    ) or 0
    library_public = db.scalar(
        select(func.count(QAEntry.id)).where(QAEntry.is_public.is_(True))
    ) or 0

    questionnaires_total = db.scalar(select(func.count(Questionnaire.id))) or 0
    questionnaires_completed = db.scalar(
        select(func.count(Questionnaire.id)).where(Questionnaire.status == "completed")
    ) or 0

    items_total = db.scalar(select(func.count(QuestionnaireItem.id))) or 0
    items_approved = db.scalar(
        select(func.count(QuestionnaireItem.id)).where(
            QuestionnaireItem.review_status.in_(["approved", "edited"])
        )
    ) or 0
    auto_answer_rate = (items_approved / items_total) if items_total else 0.0

    avg_confidence = db.scalar(
        select(func.avg(QuestionnaireItem.confidence)).where(
            QuestionnaireItem.confidence > 0
        )
    ) or 0.0

    conflicts_open = db.scalar(
        select(func.count(LibraryConflict.id)).where(LibraryConflict.status == "open")
    ) or 0

    frameworks_mapped = db.scalar(
        select(func.count(func.distinct(EntryMapping.qa_entry_id)))
    ) or 0

    by_framework_rows = db.execute(
        text(
            """
            SELECT fc.framework, COUNT(DISTINCT em.qa_entry_id) AS n
            FROM entry_mappings em
            JOIN framework_controls fc ON fc.id = em.framework_control_id
            GROUP BY fc.framework
            ORDER BY n DESC
            """
        )
    ).all()
    by_framework = {r[0]: int(r[1]) for r in by_framework_rows}

    by_status_rows = db.execute(
        text(
            """
            SELECT status, COUNT(*) FROM outdated_flags GROUP BY status
            """
        )
    ).all()
    by_status = {r[0]: int(r[1]) for r in by_status_rows}

    top_products_rows = db.execute(
        text(
            """
            SELECT p.slug, p.name,
                   COUNT(q.id) FILTER (WHERE q.deleted_at IS NULL AND q.status = 'active') AS active_entries,
                   COALESCE(SUM(q.usage_count), 0) AS total_usage
            FROM products p
            LEFT JOIN qa_entries q ON q.product_id = p.id
            GROUP BY p.id, p.slug, p.name
            ORDER BY active_entries DESC
            LIMIT 5
            """
        )
    ).all()
    top_products = [
        {"slug": r[0], "name": r[1], "active_entries": int(r[2]), "usage": int(r[3])}
        for r in top_products_rows
    ]

    hours_saved = round((items_approved * MINUTES_PER_MANUAL) / 60.0, 1)

    return AnalyticsOverview(
        library_total=int(library_total),
        library_active=int(library_active),
        library_public=int(library_public),
        questionnaires_total=int(questionnaires_total),
        questionnaires_completed=int(questionnaires_completed),
        items_total=int(items_total),
        items_approved=int(items_approved),
        auto_answer_rate=round(auto_answer_rate, 3),
        avg_confidence=round(float(avg_confidence), 3),
        hours_saved=hours_saved,
        conflicts_open=int(conflicts_open),
        frameworks_mapped=int(frameworks_mapped),
        by_framework=by_framework,
        by_status=by_status,
        top_products=top_products,
    )


@router.get("/top-questions")
def top_questions(limit: int = 25, db: Session = Depends(get_db)):
    """Most-asked questions (approx: incoming questionnaire items grouped by fuzzy hash)."""
    rows = db.execute(
        text(
            """
            SELECT question, COUNT(*) AS n
            FROM questionnaire_items
            GROUP BY question
            ORDER BY n DESC
            LIMIT :n
            """
        ),
        {"n": limit},
    ).all()
    return [{"question": r[0], "count": int(r[1])} for r in rows]
