"""POST /answer — LangGraph-powered questionnaire answer drafter.

Auth is skipped when settings.answer_no_auth is true (dev default).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.logging_config import get_logger
from app.schemas import AnswerRequest, AnswerResponse
from app.services.answer_graph import answer_question

router = APIRouter()
log = get_logger(__name__)


@router.post("", response_model=AnswerResponse)
def draft_answer(
    body: AnswerRequest,
    db: Session = Depends(get_db),
):
    # Auth intentionally skipped for MVP — set ANSWER_NO_AUTH=false and add a
    # Depends(get_current_user) here to gate it once ready.
    if not settings.answer_no_auth:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            "Auth-gated /answer not wired yet; set ANSWER_NO_AUTH=true for now.",
        )

    q = (body.question or "").strip()
    if not q:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "question is required")

    from app.services.llm import llm_available
    if not llm_available():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "No LLM endpoint configured — set LLM_BASE_URL in .env",
        )

    try:
        result = answer_question(
            db=db,
            question=q,
            product_slug=body.product_slug,
            k=body.k,
        )
    except Exception as e:
        log.exception("answer_graph_failed", err=str(e))
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"answer failed: {e}")

    return result
