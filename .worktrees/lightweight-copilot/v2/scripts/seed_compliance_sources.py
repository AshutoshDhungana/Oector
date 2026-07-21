"""Seed public compliance feeds so the auto-crawler has real sources to poll.

Sources chosen because they publish frequently and touch topics that a
customer-assurance library actually cares about (SOC 2 changes, ISO revisions,
GDPR guidance, NIST advisories, cloud-provider security bulletins).
"""

from __future__ import annotations

from sqlalchemy import select

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import ComplianceSource

SOURCES = [
    # ── National / regulatory ─────────────────────────────────────────
    ("NIST cybersecurity news", "https://www.nist.gov/news-events/cybersecurity/rss.xml", "rss", 60),
    ("NIST NVD — recent CVEs", "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml", "rss", 60),
    ("CISA advisories", "https://www.cisa.gov/cybersecurity-advisories/all.xml", "rss", 60),
    ("US-CERT alerts", "https://www.cisa.gov/uscert/ncas/alerts.xml", "rss", 60),

    # ── EU / GDPR ─────────────────────────────────────────────────────
    ("ENISA news", "https://www.enisa.europa.eu/news/rss.xml", "rss", 120),
    ("EDPB news", "https://edpb.europa.eu/news/news_en/rss.xml", "rss", 120),
    ("European Commission — Data Protection", "https://commission.europa.eu/news_en.rss", "rss", 240),

    # ── Cloud & framework bulletins ──────────────────────────────────
    ("AWS Security Bulletins", "https://aws.amazon.com/security/security-bulletins/rss/feed/", "rss", 60),
    ("Google Cloud security bulletins", "https://cloud.google.com/feeds/gcp-security-bulletins.xml", "rss", 60),
    ("Azure updates — Security", "https://azurecomcdn.azureedge.net/en-us/updates/feed/?category=security", "rss", 120),

    # ── Standards bodies / audit ────────────────────────────────────
    ("Cloud Security Alliance blog", "https://cloudsecurityalliance.org/blog/rss.xml", "rss", 240),
    ("ISO news (privacy & security)", "https://www.iso.org/news.xml", "rss", 240),

    # ── Threat / vendor intel that touches assurance ────────────────
    ("Krebs on Security", "https://krebsonsecurity.com/feed/", "rss", 240),
    ("HIPAA Journal", "https://www.hipaajournal.com/feed/", "rss", 240),
]


def main():
    configure_logging()
    log = get_logger(__name__)
    with session_scope() as db:
        added = 0
        for name, url, kind, poll_min in SOURCES:
            exists = db.execute(select(ComplianceSource.id).where(ComplianceSource.url == url)).first()
            if exists:
                continue
            db.add(ComplianceSource(
                name=name, url=url, kind=kind,
                poll_interval_minutes=poll_min, enabled=True,
            ))
            added += 1
            log.info("compliance_source_added", name=name)
        log.info("compliance_seed_done", added=added, total=len(SOURCES))


if __name__ == "__main__":
    main()
