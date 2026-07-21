"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-07-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from app.config import settings

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_admin", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(128), nullable=False, unique=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "qa_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_id", sa.String(128), nullable=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("original_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("product_id", "external_id", name="uq_qa_product_external"),
    )
    op.create_index("ix_qa_entries_product_id", "qa_entries", ["product_id"])
    op.create_index("ix_qa_entries_status", "qa_entries", ["status"])
    op.create_index("ix_qa_entries_content_hash", "qa_entries", ["content_hash"])
    op.create_index("ix_qa_entries_external_id", "qa_entries", ["external_id"])
    op.create_index("ix_qa_entries_created_at", "qa_entries", ["created_at"])
    op.create_index("ix_qa_status_updated", "qa_entries", ["status", "updated_at"])

    op.create_table(
        "qa_entry_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("qa_entry_id", UUID(as_uuid=True), sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("changed_by", UUID(as_uuid=True), nullable=True),
        sa.Column("change_type", sa.String(64), nullable=False),
        sa.Column("before", JSONB, nullable=True),
        sa.Column("after", JSONB, nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_qa_entry_history_qa_entry_id", "qa_entry_history", ["qa_entry_id"])
    op.create_index("ix_qa_entry_history_ts", "qa_entry_history", ["ts"])

    op.execute(
        f"""
        CREATE TABLE qa_embeddings (
            qa_entry_id UUID PRIMARY KEY REFERENCES qa_entries(id) ON DELETE CASCADE,
            model_version VARCHAR(128) NOT NULL,
            vector vector({settings.embedding_dim}) NOT NULL,
            content_hash VARCHAR(64) NOT NULL,
            computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    # HNSW index for cosine distance search
    op.execute(
        "CREATE INDEX ix_qa_embeddings_vector_cos "
        "ON qa_embeddings USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    op.create_table(
        "clusters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("algo_version", sa.String(64), nullable=False),
        sa.Column("size", sa.Integer, nullable=False, server_default="0"),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_clusters_product_id", "clusters", ["product_id"])
    op.execute(f"ALTER TABLE clusters ADD COLUMN centroid vector({settings.embedding_dim})")

    op.create_table(
        "cluster_members",
        sa.Column("cluster_id", UUID(as_uuid=True), sa.ForeignKey("clusters.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("qa_entry_id", UUID(as_uuid=True), sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("is_canonical", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("distance_to_centroid", sa.Float, nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_cluster_members_entry", "cluster_members", ["qa_entry_id"])

    op.create_table(
        "freshness_signals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("qa_entry_id", UUID(as_uuid=True), sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signal_type", sa.String(64), nullable=False),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("source_url", sa.String(1024), nullable=True),
        sa.Column("evidence", JSONB, nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_freshness_signals_qa_entry_id", "freshness_signals", ["qa_entry_id"])

    op.create_table(
        "outdated_flags",
        sa.Column("qa_entry_id", UUID(as_uuid=True), sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("score", sa.Float, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("evidence", JSONB, nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_outdated_flags_status", "outdated_flags", ["status"])

    op.create_table(
        "merge_queue",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("primary_qa_id", UUID(as_uuid=True), sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("secondary_qa_ids", ARRAY(UUID(as_uuid=True)), nullable=False),
        sa.Column("canonical_draft", JSONB, nullable=True),
        sa.Column("llm_rationale", sa.Text, nullable=True),
        sa.Column("suggested_by", sa.String(64), nullable=False, server_default="llm"),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_merge_queue_product_id", "merge_queue", ["product_id"])
    op.create_index("ix_merge_queue_status", "merge_queue", ["status"])

    op.create_table(
        "compliance_sources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("poll_interval_minutes", sa.Integer, nullable=False, server_default="60"),
        sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_hash", sa.String(64), nullable=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "compliance_changes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("compliance_sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("diff", JSONB, nullable=True),
        sa.Column("impact_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("affected_qa_ids", ARRAY(UUID(as_uuid=True)), nullable=False, server_default="{}"),
    )
    op.create_index("ix_compliance_changes_source_id", "compliance_changes", ["source_id"])
    op.create_index("ix_compliance_changes_detected_at", "compliance_changes", ["detected_at"])

    op.create_table(
        "jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Float, nullable=False, server_default="0"),
        sa.Column("payload", JSONB, nullable=True),
        sa.Column("result", JSONB, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_jobs_kind", "jobs", ["kind"])
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_created_at", "jobs", ["created_at"])


def downgrade() -> None:
    for t in [
        "jobs",
        "compliance_changes",
        "compliance_sources",
        "merge_queue",
        "outdated_flags",
        "freshness_signals",
        "cluster_members",
        "clusters",
        "qa_embeddings",
        "qa_entry_history",
        "qa_entries",
        "products",
        "users",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
