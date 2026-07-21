"""Unit tests that don't need a running DB."""

from datetime import datetime, timedelta, timezone

from app.services import outdated as scoring
from app.services.hashing import content_hash


def test_content_hash_stable():
    a = content_hash("Q", "A", "")
    b = content_hash("Q", "A", "")
    assert a == b
    assert a != content_hash("Q", "A", "x")


def test_age_prior_buckets():
    now = datetime.now(timezone.utc)
    assert scoring.age_prior(now)[0] == "fresh"
    assert scoring.age_prior(now - timedelta(days=200))[0] == "aging"
    assert scoring.age_prior(now - timedelta(days=400))[0] == "outdated"
    assert scoring.age_prior(now - timedelta(days=800))[0] == "stale"
    assert scoring.age_prior(None)[0] == "unknown"


def test_combine_llm_overrides_age():
    v = scoring.combine("fresh", 95.0, "needs-update", False)
    assert v.status in ("outdated", "stale")
    v = scoring.combine("stale", 25.0, "still-correct", False)
    assert v.score >= 80


def test_combine_compliance_downgrades():
    v = scoring.combine("fresh", 95.0, "still-correct", True)
    assert v.score <= 45
    assert "compliance" in v.reason
