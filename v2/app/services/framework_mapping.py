"""Cross-framework mapping for a QA entry.

Given a QA entry, find the equivalent controls across SIG / CAIQ / ISO 27001 /
SOC 2 / NIST CSF. Two-stage:

  1. Vector search - top-K nearest framework_controls per framework using the
     entry's question+answer embedding.
  2. LLM verify - the configured LLM reviews each candidate, keeps the ones that
     truly cover the same control, and returns a one-line rationale.

Results are upserted into `entry_mappings`.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.logging_config import get_logger
from app.models import EntryMapping, FrameworkControl, QAEntry
from app.services.embedding import embed_query, embed_texts
from app.services.llm import call_json

log = get_logger(__name__)

# Keep the original prototype frameworks and the openly reusable pitch sources.
# Adding a framework here makes it eligible for the per-framework semantic
# retrieval performed by `map_entry`.
FRAMEWORKS = [
    "SIG", "CAIQ", "ISO27001", "SOC2", "NIST-CSF",
    "NIST-800-53", "OWASP-ASVS",
]


@dataclass
class MappingCandidate:
    control_id: str          # UUID of framework_controls row
    framework: str
    ref: str                 # human control id ("AIS-01")
    domain: Optional[str]
    question: str
    score: float             # cosine sim


MAP_SYSTEM = """You are a compliance mapping expert. You will be given a
vendor's internal Q&A pair and one candidate compliance-framework control.

Decide if the vendor Q&A directly answers or covers this control. Reply with
ONLY a JSON object:

{
  "match": true | false,
  "confidence": <0..1>,
  "rationale": "<one short sentence>"
}

Be strict: only match when the vendor Q&A clearly addresses the specific
requirement of the control."""


def map_entry(
    db: Session,
    entry_id: uuid.UUID,
    *,
    per_framework: int = 2,
    verify_with_llm: bool = True,
) -> List[dict]:
    """Compute and persist mappings for one entry across all frameworks.

    Returns a JSON-safe list of {framework, control_ref, domain, score, rationale}.
    """
    entry = db.get(QAEntry, entry_id)
    if not entry:
        return []

    query_text = f"{entry.question}\n\n{entry.answer}"
    q_vec = embed_query(query_text)

    results: List[dict] = []
    for fw in FRAMEWORKS:
        candidates = _topk_for_framework(db, q_vec, fw, k=per_framework)
        for cand in candidates:
            match = True
            confidence = cand.score
            rationale = ""
            from app.services.llm import llm_available
            llm_ok = llm_available()
            if verify_with_llm and cand.score < 0.85 and llm_ok:
                verdict = _llm_verify(entry, cand)
                match = verdict.get("match", False)
                confidence = float(verdict.get("confidence", cand.score))
                rationale = verdict.get("rationale", "")
            elif not verify_with_llm or not llm_ok:
                rationale = f"vector-only (score={cand.score:.3f})"

            if not match:
                continue

            stmt = pg_insert(EntryMapping).values(
                qa_entry_id=entry_id,
                framework_control_id=uuid.UUID(cand.control_id),
                score=confidence,
                rationale=rationale,
                verified=verify_with_llm,
            ).on_conflict_do_update(
                index_elements=["qa_entry_id", "framework_control_id"],
                set_={"score": confidence, "rationale": rationale, "verified": verify_with_llm},
            )
            db.execute(stmt)

            results.append({
                "framework": cand.framework,
                "control_ref": cand.ref,
                "domain": cand.domain,
                "score": round(confidence, 3),
                "rationale": rationale,
            })
    db.commit()
    log.info("entry_mapping_done", entry_id=str(entry_id), n=len(results))
    return results


def _topk_for_framework(db: Session, q_vec: list, framework: str, k: int) -> List[MappingCandidate]:
    sql = text(
        """
        SELECT id, framework, control_id, domain, question,
               1 - (vector <=> CAST(:vec AS vector)) AS score
        FROM framework_controls
        WHERE framework = :fw AND vector IS NOT NULL
        ORDER BY vector <=> CAST(:vec AS vector)
        LIMIT :k
        """
    )
    rows = db.execute(sql, {"vec": q_vec, "fw": framework, "k": k}).all()
    return [
        MappingCandidate(
            control_id=str(r[0]),
            framework=r[1],
            ref=r[2],
            domain=r[3],
            question=r[4],
            score=float(r[5]),
        )
        for r in rows
    ]


def _llm_verify(entry: QAEntry, cand: MappingCandidate) -> dict:
    prompt = (
        f"Vendor Q&A:\nQ: {entry.question}\nA: {entry.answer}\n\n"
        f"Candidate control ({cand.framework} {cand.ref}"
        f"{' / ' + cand.domain if cand.domain else ''}):\n{cand.question}\n\n"
        "Respond in JSON only."
    )
    try:
        obj = call_json(prompt, model=settings.llm_model, system=MAP_SYSTEM, max_tokens=200)
        return obj
    except Exception as e:
        log.warning("map_llm_verify_failed", err=str(e))
        return {"match": False, "confidence": 0.0, "rationale": f"llm error: {e}"}


#  Framework controls: seed + embed 


def upsert_controls(db: Session, controls: List[dict]) -> int:
    """Bulk upsert framework controls without embeddings. Call embed_controls next.

    `controls`: list of {framework, control_id, domain?, question, description?}.
    """
    n = 0
    for c in controls:
        stmt = pg_insert(FrameworkControl).values(
            framework=c["framework"],
            control_id=c["control_id"],
            domain=c.get("domain"),
            question=c["question"],
            description=c.get("description"),
        ).on_conflict_do_update(
            index_elements=["framework", "control_id"],
            set_={
                "domain": c.get("domain"),
                "question": c["question"],
                "description": c.get("description"),
            },
        )
        db.execute(stmt)
        n += 1
    db.commit()
    return n


def embed_pending_controls(db: Session, batch_size: int = 100) -> int:
    """Embed any framework_controls rows whose vector is NULL."""
    rows = db.execute(
        text("SELECT id, question, description FROM framework_controls WHERE vector IS NULL")
    ).all()
    if not rows:
        return 0

    texts = [
        (r[1] + ("\n\n" + r[2] if r[2] else "")) for r in rows
    ]
    ids = [r[0] for r in rows]

    total = 0
    for i in range(0, len(rows), batch_size):
        chunk_ids = ids[i : i + batch_size]
        chunk_texts = texts[i : i + batch_size]
        vecs = embed_texts(chunk_texts, task_type="RETRIEVAL_DOCUMENT")
        for row_id, vec in zip(chunk_ids, vecs):
            db.execute(
                text("UPDATE framework_controls SET vector = CAST(:v AS vector) WHERE id = :id"),
                {"v": vec, "id": row_id},
            )
        total += len(chunk_ids)
    db.commit()
    log.info("framework_controls_embedded", n=total)
    return total
