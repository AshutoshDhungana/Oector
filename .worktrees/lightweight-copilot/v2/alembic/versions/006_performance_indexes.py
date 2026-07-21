"""Add indexes for high-frequency browse, freshness, and deduplication queries.

Revision ID: 006_performance_indexes
Revises: 005_local_embeddings
Create Date: 2026-07-21
"""

from alembic import op
import sqlalchemy as sa


revision = "006_performance_indexes"
down_revision = "005_local_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Avoid a per-row existence scan for CSV and datasource rows with no
    # external ID, and support feedback-loop de-duplication.
    op.create_index(
        "ix_qa_entries_product_content_hash",
        "qa_entries",
        ["product_id", "content_hash"],
    )

    # Cursor pagination of active library entries is one of the most frequent
    # interactive reads.
    op.create_index(
        "ix_qa_entries_active_browse",
        "qa_entries",
        ["product_id", "status", "created_at", "id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # Public Trust Center reads rank active entries by usage and recency.
    op.create_index(
        "ix_qa_entries_public_trust",
        "qa_entries",
        ["product_id", "usage_count", "updated_at"],
        postgresql_where=sa.text(
            "is_public IS TRUE AND deleted_at IS NULL AND status = 'active'"
        ),
    )

    # Health/freshness pages order by these fields on every request.
    op.create_index(
        "ix_outdated_flags_updated_cursor",
        "outdated_flags",
        ["updated_at", "qa_entry_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_outdated_flags_updated_cursor", table_name="outdated_flags")
    op.drop_index("ix_qa_entries_public_trust", table_name="qa_entries")
    op.drop_index("ix_qa_entries_active_browse", table_name="qa_entries")
    op.drop_index("ix_qa_entries_product_content_hash", table_name="qa_entries")
