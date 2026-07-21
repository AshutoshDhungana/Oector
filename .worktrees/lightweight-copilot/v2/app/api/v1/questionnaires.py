"""Questionnaire ingest, review, and export endpoints."""

from __future__ import annotations

import os
import shutil
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.logging_config import get_logger
from app.models import Job, Product, QAEntry, Questionnaire, QuestionnaireItem
from app.schemas import (
    QuestionnaireDetail,
    QuestionnaireBulkApproveRequest,
    QuestionnaireItemAction,
    QuestionnaireItemOut,
    QuestionnaireItemUpdate,
    QuestionnaireOut,
)
from app.services.hashing import content_hash
from app.services.questionnaire_export import export_questionnaire
from app.services.questionnaire_parser import parse_questionnaire

router = APIRouter()
log = get_logger(__name__)

UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", "/tmp/trustcopilot_uploads"))
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
EXPORT_ROOT = Path(os.getenv("EXPORT_ROOT", "/tmp/trustcopilot_exports"))
EXPORT_ROOT.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {"xlsx", "xlsm", "docx", "pdf"}


# ── list / detail ─────────────────────────────────────────────────────


@router.get("", response_model=list[QuestionnaireOut])
def list_questionnaires(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Questionnaire).order_by(Questionnaire.created_at.desc()).limit(limit)
    ).scalars().all()
    return rows


@router.get("/{qid}/progress")
def questionnaire_progress(qid: uuid.UUID, db: Session = Depends(get_db)):
    """Small drafting snapshot for polling without transferring every answer."""
    q = db.get(Questionnaire, qid)
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "questionnaire not found")

    counts = db.execute(
        select(
            func.count(QuestionnaireItem.id).label("total"),
            func.count(QuestionnaireItem.id)
            .filter(QuestionnaireItem.drafted_answer.isnot(None))
            .label("drafted"),
            func.count(QuestionnaireItem.id)
            .filter(QuestionnaireItem.verdict == "gap")
            .label("gaps"),
        ).where(QuestionnaireItem.questionnaire_id == qid)
    ).one()

    return {
        "id": str(q.id),
        "status": q.status,
        "total_items": int(counts.total or 0),
        "drafted_items": int(counts.drafted or 0),
        "gap_items": int(counts.gaps or 0),
        "updated_at": q.updated_at,
    }


@router.get("/{qid}", response_model=QuestionnaireDetail)
def get_questionnaire(qid: uuid.UUID, db: Session = Depends(get_db)):
    q = db.get(Questionnaire, qid)
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "questionnaire not found")

    items = db.execute(
        select(QuestionnaireItem)
        .where(QuestionnaireItem.questionnaire_id == qid)
        .order_by(QuestionnaireItem.row_index)
    ).scalars().all()

    approved = sum(1 for i in items if i.review_status == "approved")
    edited = sum(1 for i in items if i.review_status == "edited")
    rejected = sum(1 for i in items if i.review_status == "rejected")
    pending = len(items) - approved - edited - rejected
    high_conf = sum(1 for i in items if i.confidence >= 0.75)
    gaps = sum(1 for i in items if i.verdict == "gap")
    avg_conf = sum(i.confidence for i in items) / max(len(items), 1)

    return {
        "questionnaire": q,
        "items": items,
        "stats": {
            "total": len(items),
            "approved": approved,
            "edited": edited,
            "rejected": rejected,
            "pending": pending,
            "high_confidence": high_conf,
            "gaps": gaps,
            "avg_confidence": round(avg_conf, 3),
        },
    }


# ── upload → parse → kick off draft job ───────────────────────────────


@router.post("", response_model=QuestionnaireOut)
def upload_questionnaire(
    file: UploadFile = File(...),
    product_slug: Optional[str] = Form(None),
    customer: Optional[str] = Form(None),
    framework_hint: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no filename")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"unsupported extension .{ext}. Allowed: {sorted(ALLOWED_EXT)}",
        )

    product = None
    if product_slug:
        product = db.execute(select(Product).where(Product.slug == product_slug)).scalar_one_or_none()
        if not product:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown product '{product_slug}'")

    # Persist upload to disk.
    qid = uuid.uuid4()
    dest = UPLOAD_ROOT / f"{qid}_{file.filename}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Parse synchronously — questionnaires are small and this gives us total_items
    # immediately so the review page can render skeleton rows.
    try:
        parsed = parse_questionnaire(dest)
    except Exception as e:
        log.exception("parse_failed", err=str(e))
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"parse failed: {e}")

    q = Questionnaire(
        id=qid,
        product_id=product.id if product else None,
        name=file.filename,
        customer=customer,
        framework_hint=framework_hint,
        original_filename=file.filename,
        original_path=str(dest),
        file_kind=parsed.file_kind,
        status="drafting",
        total_items=len(parsed.items),
        parse_meta=parsed.meta,
    )
    db.add(q)
    db.flush()

    for p in parsed.items:
        db.add(QuestionnaireItem(
            questionnaire_id=q.id,
            row_index=p.row_index,
            section=p.section,
            framework_ref=p.framework_ref,
            question=p.question,
        ))

    # Create a Job row + enqueue the drafting task.
    job = Job(kind="draft_questionnaire", status="queued", progress=0.0,
              payload={"questionnaire_id": str(q.id)})
    db.add(job)
    db.flush()
    q.job_id = job.id
    db.commit()

    # Kick off the celery task (best-effort — API stays usable if broker's down).
    try:
        from app.workers.tasks.draft_questionnaire import draft_questionnaire as task
        task.delay(str(q.id), str(job.id))
    except Exception as e:
        log.warning("task_enqueue_failed", err=str(e))

    return q


# ── item review actions ───────────────────────────────────────────────


@router.patch("/{qid}/items/{item_id}", response_model=QuestionnaireItemOut)
def update_item(
    qid: uuid.UUID,
    item_id: uuid.UUID,
    body: QuestionnaireItemUpdate,
    db: Session = Depends(get_db),
):
    it = _get_item(db, qid, item_id)
    if body.final_answer is not None:
        it.final_answer = body.final_answer
        it.review_status = "edited"
    if body.reviewer_notes is not None:
        it.reviewer_notes = body.reviewer_notes
    it.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(it)
    return it


@router.post("/{qid}/items/bulk-approve")
def bulk_approve_high_confidence(
    qid: uuid.UUID,
    body: QuestionnaireBulkApproveRequest,
    db: Session = Depends(get_db),
):
    """Approve high-confidence drafts in one transaction and one HTTP call."""
    q = db.get(Questionnaire, qid)
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "questionnaire not found")

    items = db.execute(
        select(QuestionnaireItem)
        .where(
            QuestionnaireItem.questionnaire_id == qid,
            QuestionnaireItem.review_status == "pending",
            QuestionnaireItem.drafted_answer.isnot(None),
            QuestionnaireItem.confidence >= body.min_confidence,
        )
        .order_by(QuestionnaireItem.row_index)
    ).scalars().all()

    now = datetime.now(timezone.utc)
    for it in items:
        it.final_answer = it.final_answer or it.drafted_answer
        it.review_status = "approved" if it.final_answer == it.drafted_answer else "edited"
        it.reviewed_at = now

    pushed = 0
    if body.push_to_library and q.product_id and items:
        # Deduplicate target library rows with one lookup instead of an
        # N+1 existence check for a large bulk approval.
        candidates: dict[str, tuple[str, str, int]] = {}
        for it in items:
            final_answer = (it.final_answer or "").strip()
            question = (it.question or "").strip()
            if not question or not final_answer:
                continue
            digest = content_hash(question, final_answer)
            if digest in candidates:
                old_question, old_answer, count = candidates[digest]
                candidates[digest] = (old_question, old_answer, count + 1)
            else:
                candidates[digest] = (question, final_answer, 1)

        existing_by_hash = {
            entry.content_hash: entry
            for entry in db.execute(
                select(QAEntry).where(
                    QAEntry.product_id == q.product_id,
                    QAEntry.content_hash.in_(candidates),
                )
            ).scalars().all()
        }
        for digest, (question, answer, uses) in candidates.items():
            existing = existing_by_hash.get(digest)
            if existing:
                existing.usage_count = (existing.usage_count or 0) + uses
            else:
                db.add(
                    QAEntry(
                        product_id=q.product_id,
                        question=question,
                        answer=answer,
                        content_hash=digest,
                        source="approved-via-questionnaire",
                        status="active",
                        is_public=False,
                        usage_count=uses,
                    )
                )
            pushed += 1

        citation_counts = Counter(
            citation_id
            for item in items
            for citation_id in (item.citation_entry_ids or [])
        )
        if citation_counts:
            cited_rows = db.execute(
                select(QAEntry).where(QAEntry.id.in_(citation_counts))
            ).scalars().all()
            for cited in cited_rows:
                cited.usage_count = (cited.usage_count or 0) + citation_counts[cited.id]

    db.commit()

    if pushed:
        try:
            from app.workers.tasks.embed import embed_pending
            embed_pending.delay()
        except Exception as exc:
            log.warning("bulk_approve_embed_enqueue_failed", err=str(exc))

    return {"approved": len(items), "pushed_to_library": pushed}


@router.post("/{qid}/items/{item_id}/approve", response_model=QuestionnaireItemOut)
def approve_item(
    qid: uuid.UUID,
    item_id: uuid.UUID,
    body: QuestionnaireItemAction,
    db: Session = Depends(get_db),
):
    it = _get_item(db, qid, item_id)
    q = db.get(Questionnaire, qid)

    # Pin the final answer.
    if body.final_answer is not None:
        it.final_answer = body.final_answer
        it.review_status = "edited"
    elif it.drafted_answer:
        it.final_answer = it.final_answer or it.drafted_answer
        it.review_status = "approved" if not it.final_answer or it.final_answer == it.drafted_answer else "edited"
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no draft to approve — provide final_answer")
    if body.reviewer_notes is not None:
        it.reviewer_notes = body.reviewer_notes
    it.reviewed_at = datetime.now(timezone.utc)

    # Feedback loop: push approved answer back into the library. This is the
    # bit that lets tomorrow's questionnaire answer better than today's.
    if body.push_to_library and q and q.product_id and it.final_answer:
        pushed = _upsert_to_library(db, q.product_id, it.question, it.final_answer)
        if pushed is not None:
            # Bump usage_count on the cited entries — informs analytics.
            for cid in it.citation_entry_ids or []:
                cited = db.get(QAEntry, cid)
                if cited:
                    cited.usage_count = (cited.usage_count or 0) + 1

    db.commit()
    db.refresh(it)
    return it


@router.post("/{qid}/items/{item_id}/reject", response_model=QuestionnaireItemOut)
def reject_item(
    qid: uuid.UUID,
    item_id: uuid.UUID,
    body: QuestionnaireItemAction,
    db: Session = Depends(get_db),
):
    it = _get_item(db, qid, item_id)
    it.review_status = "rejected"
    it.reviewer_notes = body.reviewer_notes or it.reviewer_notes
    it.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(it)
    return it


# ── complete + export ────────────────────────────────────────────────


@router.post("/{qid}/complete", response_model=QuestionnaireOut)
def mark_complete(qid: uuid.UUID, db: Session = Depends(get_db)):
    q = db.get(Questionnaire, qid)
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "questionnaire not found")
    q.status = "completed"
    q.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(q)
    return q


@router.get("/{qid}/export")
def export(qid: uuid.UUID, db: Session = Depends(get_db)):
    q = db.get(Questionnaire, qid)
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "questionnaire not found")

    items = db.execute(
        select(QuestionnaireItem)
        .where(QuestionnaireItem.questionnaire_id == qid)
        .order_by(QuestionnaireItem.row_index)
    ).scalars().all()

    try:
        out_path = export_questionnaire(q, items, EXPORT_ROOT)
    except Exception as e:
        log.exception("export_failed", err=str(e))
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"export failed: {e}")

    return FileResponse(
        path=str(out_path),
        filename=out_path.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ── helpers ───────────────────────────────────────────────────────────


def _get_item(db: Session, qid: uuid.UUID, item_id: uuid.UUID) -> QuestionnaireItem:
    it = db.get(QuestionnaireItem, item_id)
    if not it or it.questionnaire_id != qid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    return it


def _upsert_to_library(
    db: Session,
    product_id: uuid.UUID,
    question: str,
    answer: str,
) -> Optional[uuid.UUID]:
    """Feedback loop — turn a reviewed answer into a first-class library entry."""
    q = (question or "").strip()
    a = (answer or "").strip()
    if not q or not a:
        return None

    h = content_hash(q, a)
    # Look for an existing entry with the same content_hash to avoid duplicates.
    existing = db.execute(
        select(QAEntry).where(
            QAEntry.product_id == product_id,
            QAEntry.content_hash == h,
        )
    ).scalar_one_or_none()
    if existing:
        existing.usage_count = (existing.usage_count or 0) + 1
        return existing.id

    row = QAEntry(
        product_id=product_id,
        question=q,
        answer=a,
        content_hash=h,
        source="approved-via-questionnaire",
        status="active",
        is_public=False,
        usage_count=1,
    )
    db.add(row)
    db.flush()
    return row.id
