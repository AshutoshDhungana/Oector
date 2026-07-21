"""Outdated-content scoring.

Signals combined:
- age_prior:      based on original_updated_at (weak; skipped if missing).
- llm_verdict:    the configured LLM classifies "still-correct | needs-update | unknown"
                  given the QA and (optionally) recent compliance excerpts.
- compliance_hit: 1 if any recent compliance_changes.affected_qa_ids contain this entry.

Final:
  score  ∈ [0, 100]  higher = healthier
  status ∈ {fresh, aging, outdated, stale, unknown}
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.config import settings


@dataclass
class Verdict:
    status: str
    score: float
    reason: str
    evidence: dict


def age_prior(original_updated_at: Optional[datetime]) -> tuple[str, float]:
    if original_updated_at is None:
        return "unknown", 60.0
    now = datetime.now(timezone.utc)
    days = (now - original_updated_at).days
    if days <= 90:
        return "fresh", 95.0
    if days <= 180:
        return "fresh", 85.0
    if days <= 365:
        return "aging", 70.0
    if days <= 730:
        return "outdated", 45.0
    return "stale", 25.0


def combine(
    age_status: str,
    age_score: float,
    llm_verdict: str,
    compliance_hit: bool,
) -> Verdict:
    """Combine signals into a final score.

    LLM verdicts override age heavily; compliance-hit forces at least "outdated".
    """
    score = age_score
    status = age_status
    reason_parts = [f"age={age_status}({age_score:.0f})"]

    if llm_verdict == "needs-update":
        score = min(score, 40.0)
        status = "outdated" if score >= 30 else "stale"
        reason_parts.append("llm=needs-update")
    elif llm_verdict == "still-correct":
        score = max(score, 80.0)
        status = "fresh" if score >= 80 else status
        reason_parts.append("llm=still-correct")
    elif llm_verdict == "unknown":
        reason_parts.append("llm=unknown")

    if compliance_hit:
        score = min(score, 45.0)
        if status in ("fresh", "aging"):
            status = "outdated"
        reason_parts.append("compliance-change-linked")

    return Verdict(
        status=status,
        score=round(score, 2),
        reason=", ".join(reason_parts),
        evidence={"age_status": age_status, "llm_verdict": llm_verdict, "compliance_hit": compliance_hit},
    )
