"""LangGraph answer-drafting workflow.

Flow:

    retrieve  ─▶  judge  ─┬─▶  draft   ─▶  END
                          └─▶  gap     ─▶  END

- retrieve: k-NN lookup against qa_embeddings, scoped to a product if given.
- judge:    pick a confidence score from the retrieval quality signal.
- draft:    the configured LLM drafts a customer-facing answer citing [1..n] the hits.
- gap:      no confident draft — return the top hits verbatim + reason,
            surfacing this question as work for a security analyst.

The graph is stateless per-invocation. It is safe to run many in parallel
(each `.invoke()` call gets its own state dict).
"""

from __future__ import annotations

import uuid
from typing import List, Optional, TypedDict

from sqlalchemy import select, text
from sqlalchemy.orm import Session

try:  # LangGraph is optional at import time so unit tests without it still load.
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover
    StateGraph = None
    END = "__end__"

from app.config import settings
from app.logging_config import get_logger
from app.models import Product, QAEntry
from app.services.embedding import embed_query
from app.services.llm import call_text

log = get_logger(__name__)


# ── Types ─────────────────────────────────────────────────────────────


class RetrievedHit(TypedDict):
    entry_id: str
    question: str
    answer: str
    details: Optional[str]
    source: Optional[str]
    score: float


class AnswerState(TypedDict, total=False):
    # Inputs
    question: str
    product_slug: Optional[str]
    k: int

    # Runtime carry
    db: Session               # injected before .invoke, not persisted
    query_vec: List[float]
    hits: List[RetrievedHit]
    confidence: float
    reason: str

    # Outputs
    answer: Optional[str]
    citations: List[str]      # entry_ids in the order cited
    needs_review: bool
    verdict: str              # "drafted" | "gap"


# ── Nodes ─────────────────────────────────────────────────────────────


def _retrieve_node(state: AnswerState) -> AnswerState:
    q = state["question"]
    k = state.get("k") or settings.answer_top_k
    db: Session = state["db"]

    query_vec = embed_query(q)

    where_product = ""
    params: dict = {"vec": query_vec, "k": k}
    if state.get("product_slug"):
        p = db.execute(
            select(Product).where(Product.slug == state["product_slug"])
        ).scalar_one_or_none()
        if not p:
            state["hits"] = []
            state["reason"] = f"unknown product '{state['product_slug']}'"
            state["query_vec"] = query_vec
            return state
        where_product = "AND q.product_id = :product_id"
        params["product_id"] = p.id

    sql = text(
        f"""
        SELECT q.id, q.question, q.answer, q.details, q.source,
               1 - (e.vector <=> CAST(:vec AS vector)) AS score
        FROM qa_embeddings e
        JOIN qa_entries q ON q.id = e.qa_entry_id
        WHERE q.deleted_at IS NULL AND q.status = 'active' {where_product}
        ORDER BY e.vector <=> CAST(:vec AS vector)
        LIMIT :k
        """
    )
    rows = db.execute(sql, params).all()

    hits: List[RetrievedHit] = [
        RetrievedHit(
            entry_id=str(r[0]),
            question=r[1],
            answer=r[2],
            details=r[3],
            source=r[4],
            score=float(r[5]),
        )
        for r in rows
    ]
    state["hits"] = hits
    state["query_vec"] = query_vec
    log.info("answer_retrieve", q_prefix=q[:80], k=k, n_hits=len(hits),
             top_score=hits[0]["score"] if hits else None)
    return state


def _judge_node(state: AnswerState) -> AnswerState:
    """Cheap heuristic confidence — good enough for v1.

    Signal blend:
      - top hit cosine similarity (dominant)
      - margin between top and 2nd hit (helps when many mediocre matches)
      - number of hits above a soft floor
    """
    hits = state.get("hits") or []
    if not hits:
        state["confidence"] = 0.0
        state["reason"] = state.get("reason") or "no hits from knowledge library"
        return state

    top = hits[0]["score"]
    second = hits[1]["score"] if len(hits) > 1 else 0.0
    margin = max(0.0, top - second)
    strong_hits = sum(1 for h in hits if h["score"] >= 0.60)

    # Weighted blend, bounded to [0, 1].
    confidence = min(1.0, 0.75 * top + 0.15 * margin + 0.02 * strong_hits)
    state["confidence"] = round(confidence, 3)
    state["reason"] = (
        f"top={top:.3f}, margin={margin:.3f}, strong_hits={strong_hits}"
    )
    log.info("answer_judge", confidence=state["confidence"], reason=state["reason"])
    return state


DRAFT_SYSTEM = """You are a Security Assurance analyst answering an inbound customer
questionnaire on behalf of the vendor. You are given the customer's question and
several past Q&A pairs from the vendor's approved knowledge library ranked by
relevance.

Rules:
1. Compose ONE concise answer (2-6 sentences) tailored to the incoming question.
2. Use ONLY facts supported by the retrieved library entries. Do NOT invent
   claims about certifications, controls, or capabilities.
3. Cite the entries you relied on inline as [1], [2] etc., matching the numbered
   list you were given. Do not cite entries you did not use.
4. If the retrieved entries conflict, prefer the higher-ranked one and flag the
   conflict in a final line beginning with "Note:".
5. If the retrieved entries do not sufficiently cover the question, reply with
   the single token INSUFFICIENT and nothing else.
"""


def _draft_node(state: AnswerState) -> AnswerState:
    hits = state["hits"]
    q = state["question"]

    # Build the numbered evidence block, [1..n], truncating each hit to keep
    # the prompt lean.
    lines = []
    for i, h in enumerate(hits, start=1):
        ans = (h["answer"] or "").strip().replace("\n", " ")
        if len(ans) > 500:
            ans = ans[:500].rsplit(" ", 1)[0] + "…"
        det = (h["details"] or "").strip().replace("\n", " ")
        if det and len(det) > 300:
            det = det[:300].rsplit(" ", 1)[0] + "…"
        block = f"[{i}] (score={h['score']:.3f}) Q: {h['question']}\n    A: {ans}"
        if det:
            block += f"\n    Details: {det}"
        lines.append(block)
    evidence = "\n\n".join(lines)

    prompt = (
        f"Customer question:\n{q}\n\n"
        f"Retrieved library entries:\n{evidence}\n\n"
        "Write the answer now. Use inline [n] citations."
    )

    text_out = call_text(
        prompt,
        model=settings.llm_model,
        system=DRAFT_SYSTEM,
        max_tokens=600,
    )

    if not text_out or text_out.strip().upper().startswith("INSUFFICIENT"):
        state["answer"] = None
        state["needs_review"] = True
        state["verdict"] = "gap"
        state["citations"] = []
        state["reason"] = (state.get("reason") or "") + " | llm=insufficient"
        return state

    # Extract citation numbers actually referenced [1], [2], ...
    import re
    cited_nums = sorted({int(m) for m in re.findall(r"\[(\d+)\]", text_out)})
    citations = [
        hits[n - 1]["entry_id"]
        for n in cited_nums
        if 1 <= n <= len(hits)
    ]

    state["answer"] = text_out.strip()
    state["citations"] = citations
    state["needs_review"] = state["confidence"] < 0.75  # med-conf still gets reviewed
    state["verdict"] = "drafted"
    return state


def _gap_node(state: AnswerState) -> AnswerState:
    state["answer"] = None
    state["needs_review"] = True
    state["verdict"] = "gap"
    state["citations"] = []
    if not state.get("reason"):
        state["reason"] = "confidence below threshold"
    return state


def _route_after_judge(state: AnswerState) -> str:
    return "draft" if state.get("confidence", 0.0) >= settings.answer_confidence_threshold else "gap"


# ── Graph compilation (singleton) ─────────────────────────────────────

_compiled = None


def _build_graph():
    if StateGraph is None:
        raise RuntimeError("langgraph is not installed — pip install langgraph")

    g = StateGraph(AnswerState)
    g.add_node("retrieve", _retrieve_node)
    g.add_node("judge", _judge_node)
    g.add_node("draft", _draft_node)
    g.add_node("gap", _gap_node)

    g.set_entry_point("retrieve")
    g.add_edge("retrieve", "judge")
    g.add_conditional_edges("judge", _route_after_judge, {"draft": "draft", "gap": "gap"})
    g.add_edge("draft", END)
    g.add_edge("gap", END)
    return g.compile()


def get_graph():
    global _compiled
    if _compiled is None:
        _compiled = _build_graph()
    return _compiled


# ── Convenience wrapper for the API endpoint ──────────────────────────


def answer_question(
    db: Session,
    question: str,
    product_slug: Optional[str] = None,
    k: Optional[int] = None,
) -> dict:
    """Run the graph end-to-end and return a plain dict result."""
    graph = get_graph()
    initial: AnswerState = {
        "question": question,
        "product_slug": product_slug,
        "k": k or settings.answer_top_k,
        "db": db,
    }
    final = graph.invoke(initial)

    # Attach a lightweight, JSON-safe view of the hits used.
    hits_out = [
        {
            "entry_id": h["entry_id"],
            "question": h["question"],
            "answer": h["answer"],
            "score": h["score"],
        }
        for h in (final.get("hits") or [])
    ]
    return {
        "question": question,
        "verdict": final.get("verdict", "gap"),
        "answer": final.get("answer"),
        "citations": final.get("citations", []),
        "confidence": final.get("confidence", 0.0),
        "needs_review": final.get("needs_review", True),
        "reason": final.get("reason", ""),
        "hits": hits_out,
    }
