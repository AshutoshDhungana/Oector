from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import bindparam, select, text
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Product, QAEntry, User
from app.schemas import (
    QAEntryOut,
    SimilarityHit,
    SimilaritySearchRequest,
    SimilaritySearchResponse,
)
from app.services.embedding import embed_query

router = APIRouter()


@router.post("/similar", response_model=SimilaritySearchResponse)
def similar(
    body: SimilaritySearchRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query_vec = embed_query(body.text)

    where_product = ""
    params = {"vec": query_vec, "k": body.k}
    if body.product_slug:
        p = db.execute(select(Product).where(Product.slug == body.product_slug)).scalar_one_or_none()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product")
        where_product = "AND q.product_id = :product_id"
        params["product_id"] = p.id

    sql = text(
        f"""
        SELECT q.id,
               1 - (e.vector <=> CAST(:vec AS vector)) AS score
        FROM qa_embeddings e
        JOIN qa_entries q ON q.id = e.qa_entry_id
        WHERE q.deleted_at IS NULL AND q.status = 'active' {where_product}
        ORDER BY e.vector <=> CAST(:vec AS vector)
        LIMIT :k
        """
    )
    rows = db.execute(sql, params).all()

    entries = {}
    if rows:
        ids = [r[0] for r in rows]
        for e in db.execute(select(QAEntry).where(QAEntry.id.in_(ids))).scalars().all():
            entries[e.id] = e

    hits = []
    for entry_id, score in rows:
        e = entries.get(entry_id)
        if e:
            hits.append(SimilarityHit(entry=QAEntryOut.model_validate(e), score=float(score)))
    return SimilaritySearchResponse(query=body.text, hits=hits)
