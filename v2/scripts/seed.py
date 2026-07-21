"""Seed a demo tenant + admin user + a handful of QA pairs."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.auth import hash_password
from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Product, QAEntry, User
from app.services.hashing import content_hash

log = get_logger(__name__)

DEMO_QAS = [
    (
        "Does the product encrypt data at rest?",
        "Yes. All customer data is encrypted at rest using AES-256 with per-tenant keys managed in AWS KMS.",
    ),
    (
        "How do you rotate encryption keys?",
        "Keys are rotated automatically every 90 days by AWS KMS. Manual rotation is supported via the admin API.",
    ),
    (
        "Are you SOC 2 Type II compliant?",
        "Yes, we hold a current SOC 2 Type II report. It is available under NDA via the trust portal.",
    ),
    (
        "How is customer data isolated between tenants?",
        "Data isolation is enforced at the application layer via row-level tenant IDs and at the database layer via separate schemas per plan tier.",
    ),
    (
        "What is your GDPR data-deletion SLA?",
        "Deletion requests are processed within 30 days as required by GDPR Article 17.",
    ),
]


def seed() -> None:
    configure_logging()
    with session_scope() as db:
        admin = db.execute(select(User).where(User.email == "admin@example.com")).scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=hash_password("admin"),
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            log.info("admin_created", email="admin@example.com", password="admin")

        product = db.execute(select(Product).where(Product.slug == "demo-product")).scalar_one_or_none()
        if not product:
            product = Product(slug="demo-product", name="Demo Product")
            db.add(product)
            db.flush()
            log.info("product_created", slug="demo-product")

        existing = db.execute(select(QAEntry.id).where(QAEntry.product_id == product.id)).first()
        if existing:
            log.info("seed_skipped_existing_entries")
            return

        for q, a in DEMO_QAS:
            db.add(
                QAEntry(
                    product_id=product.id,
                    external_id=None,
                    question=q,
                    answer=a,
                    source="seed",
                    status="active",
                    content_hash=content_hash(q, a, ""),
                    original_updated_at=datetime.now(timezone.utc),
                )
            )
        log.info("seed_qa_inserted", count=len(DEMO_QAS))


if __name__ == "__main__":
    seed()
