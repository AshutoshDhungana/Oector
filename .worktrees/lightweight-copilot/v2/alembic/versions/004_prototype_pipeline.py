"""Questionnaires, frameworks, mappings, conflicts + qa_entries flags.

Revision ID: 004_prototype_pipeline
Revises: 003_gemini_embeddings
Create Date: 2026-07-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

from app.config import settings

revision = "004_prototype_pipeline"
down_revision = "003_gemini_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── qa_entries: expose flags used by Trust Center + analytics ──
    op.add_column(
        "qa_entries",
        sa.Column("is_public", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "qa_entries",
        sa.Column("usage_count", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index("ix_qa_entries_is_public", "qa_entries", ["is_public"])

    # ── questionnaires ──
    op.create_table(
        "questionnaires",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True),
                  sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("customer", sa.String(255), nullable=True),
        sa.Column("framework_hint", sa.String(64), nullable=True),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("original_path", sa.String(1024), nullable=False),
        sa.Column("file_kind", sa.String(16), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="parsing"),
        sa.Column("total_items", sa.Integer, nullable=False, server_default="0"),
        sa.Column("parse_meta", JSONB, nullable=True),
        sa.Column("job_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_questionnaires_product_id", "questionnaires", ["product_id"])
    op.create_index("ix_questionnaires_status", "questionnaires", ["status"])
    op.create_index("ix_questionnaires_created_at", "questionnaires", ["created_at"])

    # ── questionnaire_items ──
    op.create_table(
        "questionnaire_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("questionnaire_id", UUID(as_uuid=True),
                  sa.ForeignKey("questionnaires.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_index", sa.Integer, nullable=False),
        sa.Column("section", sa.String(255), nullable=True),
        sa.Column("framework_ref", sa.String(64), nullable=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("drafted_answer", sa.Text, nullable=True),
        sa.Column("final_answer", sa.Text, nullable=True),
        sa.Column("citation_entry_ids", ARRAY(UUID(as_uuid=True)), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.Float, nullable=False, server_default="0"),
        sa.Column("verdict", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("review_status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewer_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_qi_questionnaire_row", "questionnaire_items", ["questionnaire_id", "row_index"])
    op.create_index("ix_qi_review_status", "questionnaire_items", ["review_status"])

    # ── framework_controls ──
    op.execute(
        f"""
        CREATE TABLE framework_controls (
            id UUID PRIMARY KEY,
            framework VARCHAR(32) NOT NULL,
            control_id VARCHAR(64) NOT NULL,
            domain VARCHAR(255),
            question TEXT NOT NULL,
            description TEXT,
            vector vector({settings.embedding_dim}),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_framework_control UNIQUE (framework, control_id)
        )
        """
    )
    op.create_index("ix_framework_controls_framework", "framework_controls", ["framework"])
    op.execute(
        "CREATE INDEX ix_framework_controls_vector_cos "
        "ON framework_controls USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # ── entry_mappings ──
    op.create_table(
        "entry_mappings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("qa_entry_id", UUID(as_uuid=True),
                  sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("framework_control_id", UUID(as_uuid=True),
                  sa.ForeignKey("framework_controls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Float, nullable=False),
        sa.Column("rationale", sa.Text, nullable=True),
        sa.Column("verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("qa_entry_id", "framework_control_id", name="uq_entry_mapping"),
    )
    op.create_index("ix_em_qa_entry", "entry_mappings", ["qa_entry_id"])
    op.create_index("ix_em_control", "entry_mappings", ["framework_control_id"])

    # ── library_conflicts ──
    op.create_table(
        "library_conflicts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("entry_a_id", UUID(as_uuid=True),
                  sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entry_b_id", UUID(as_uuid=True),
                  sa.ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("explanation", sa.Text, nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("entry_a_id", "entry_b_id", name="uq_conflict_pair"),
    )
    op.create_index("ix_lc_entry_a", "library_conflicts", ["entry_a_id"])
    op.create_index("ix_lc_entry_b", "library_conflicts", ["entry_b_id"])
    op.create_index("ix_lc_status", "library_conflicts", ["status"])


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS library_conflicts CASCADE")
    op.execute("DROP TABLE IF EXISTS entry_mappings CASCADE")
    op.execute("DROP TABLE IF EXISTS framework_controls CASCADE")
    op.execute("DROP TABLE IF EXISTS questionnaire_items CASCADE")
    op.execute("DROP TABLE IF EXISTS questionnaires CASCADE")
    op.drop_index("ix_qa_entries_is_public", table_name="qa_entries")
    op.drop_column("qa_entries", "usage_count")
    op.drop_column("qa_entries", "is_public")
