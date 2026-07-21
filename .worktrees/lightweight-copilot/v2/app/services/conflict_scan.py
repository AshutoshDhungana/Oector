"""Library conflict detection.

For each near-duplicate pair (or small cluster) of QA entries in the same
product, ask the configured LLM whether their answers contradict. Store findings in
library_conflicts.

Strategy — cheap first pass:
  1. For each active entry, find its top-3 nearest neighbors by cosine
     distance in the same product (using existing HNSW index).
  2. Only keep pairs with similarity >= sim_threshold (default 0.7) — these
     are the ones whose questions overlap enough to be considered "the same
     question, answered twice."
  3. Send each pair to the configured LLM as a JSON classification task.
  4. Upsert results (dedupe by ordered pair).

Called periodically (celery beat) or on-demand.
"""

from __future__ import annotations

import uuid
from typing import List, Tuple

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.logging_config import get_logger
from app.models import LibraryConflict, QAEntry
from app.services.llm import call_json

log = get_logger(__name__)


CONFLICT_SYSTEM = """You are a knowledge-base auditor. You will be given two
past Q&A pairs from a vendor's customer-assurance library that appear to answer
the same underlying question.

Decide whether the two answers CONTRADICT each other (e.g. one says "yes" and
the other says "no", one says "AES-256" and the other says "AES-128", one says
"we do X" and the other says "we do not do X").

If they merely differ in wording but agree in substance, that is NOT a conflict.

Reply with ONLY a JSON object:

{
  "conflict": true | false,
  "severity": "low" | "medium" | "high",
  "explanation": "<one clear sentence describing the contradiction; empty if none>"
}"""


def scan_pair(db: Session, entry_a: QAEntry, entry_b: QAEntry) -> bool:
    """LLM check one pair. Returns True if a conflict was recorded."""
    prompt = (
        f"Pair A:\nQ: {entry_a.question}\nA: {entry_a.answer}\n\n"
        f"Pair B:\nQ: {entry_b.question}\nA: {entry_b.answer}\n\n"
        "Respond in JSON only."
    )
    try:
        obj = call_json(prompt, model=settings.llm_model, system=CONFLICT_SYSTEM, max_tokens=200)
    except Exception as e:
        log.warning("conflict_llm_failed", err=str(e))
        return False

    if not obj.get("conflict"):
        return False

    a_id, b_id = _sorted_pair(entry_a.id, entry_b.id)
    stmt = pg_insert(LibraryConflict).values(
        entry_a_id=a_id,
        entry_b_id=b_id,
        severity=obj.get("severity", "medium"),
        explanation=obj.get("explanation", "")[:2000] or "contradiction detected",
    ).on_conflict_do_update(
        index_elements=["entry_a_id", "entry_b_id"],
        set_={
            "severity": obj.get("severity", "medium"),
            "explanation": obj.get("explanation", "")[:2000] or "contradiction detected",
            "status": "open",
        },
    )
    db.execute(stmt)
    return True


def scan_library(
    db: Session,
    product_id: uuid.UUID | None = None,
    sim_threshold: float = 0.70,
    per_entry_k: int = 3,
    max_pairs: int = 500,
) -> dict:
    """Scan the library for potential contradictions.

    Returns {pairs_checked, conflicts_found}.
    """
    from app.services.llm import llm_available
    if not llm_available():
        return {
            "pairs_checked": 0, "conflicts_found": 0,
            "reason": "No LLM endpoint configured — set LLM_BASE_URL in .env.",
        }

    # Sanity check: no embeddings means no candidate pairs.
    n_embeddings = db.execute(text("SELECT COUNT(*) FROM qa_embeddings")).scalar() or 0
    if n_embeddings == 0:
        return {
            "pairs_checked": 0, "conflicts_found": 0,
            "reason": "No embeddings yet — click Prepare index in the sidebar to embed the library first.",
        }

    where_prod = ""
    params: dict = {"threshold": sim_threshold, "k": per_entry_k}
    if product_id is not None:
        where_prod = "AND q1.product_id = :product_id AND q2.product_id = :product_id"
        params["product_id"] = product_id

    # Self-join to find near-duplicate pairs. Distinct on id-order so we only
    # process each unordered pair once.
    sql = text(
        f"""
        SELECT * FROM (
            SELECT DISTINCT ON (LEAST(q1.id::text, q2.id::text), GREATEST(q1.id::text, q2.id::text))
                   q1.id AS id_a, q2.id AS id_b,
                   1 - (e1.vector <=> e2.vector) AS sim
            FROM qa_entries q1
            JOIN qa_embeddings e1 ON e1.qa_entry_id = q1.id
            JOIN qa_entries q2 ON q2.product_id = q1.product_id AND q2.id <> q1.id
            JOIN qa_embeddings e2 ON e2.qa_entry_id = q2.id
            WHERE q1.deleted_at IS NULL AND q1.status = 'active'
              AND q2.deleted_at IS NULL AND q2.status = 'active'
              AND 1 - (e1.vector <=> e2.vector) >= :threshold
              {where_prod}
        ) p
        ORDER BY p.sim DESC
        LIMIT :max_pairs
        """
    )
    params["max_pairs"] = max_pairs
    rows = db.execute(sql, params).all()

    entry_ids = list({r[0] for r in rows} | {r[1] for r in rows})
    entries = {e.id: e for e in db.query(QAEntry).filter(QAEntry.id.in_(entry_ids)).all()}

    checked = 0
    found = 0
    for r in rows:
        a = entries.get(r[0])
        b = entries.get(r[1])
        if not a or not b:
            continue
        if scan_pair(db, a, b):
            found += 1
        checked += 1

    db.commit()
    log.info("conflict_scan_done", checked=checked, found=found)
    return {"pairs_checked": checked, "conflicts_found": found}


def _sorted_pair(a: uuid.UUID, b: uuid.UUID) -> Tuple[uuid.UUID, uuid.UUID]:
    return (a, b) if str(a) < str(b) else (b, a)
