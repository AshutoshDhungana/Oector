"""SQLAlchemy models. Source of truth for the schema."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.db import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────── tenancy / auth ──


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


# ─────────────────────────────────────────────────────── domain core ─────


class Product(Base):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    entries: Mapped[list["QAEntry"]] = relationship(back_populates="product")


class QAEntry(Base):
    __tablename__ = "qa_entries"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)

    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # 'active' | 'archived' | 'merged'
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False, index=True)

    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    original_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped[Product] = relationship(back_populates="entries")

    # Trust Center flag — expose approved answer publicly.
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    # Approval / usage telemetry — feeds analytics.
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("product_id", "external_id", name="uq_qa_product_external"),
        Index("ix_qa_status_updated", "status", "updated_at"),
        Index("ix_qa_entries_product_content_hash", "product_id", "content_hash"),
        Index(
            "ix_qa_entries_active_browse",
            "product_id",
            "status",
            "created_at",
            "id",
            postgresql_where=deleted_at.is_(None),
        ),
        Index(
            "ix_qa_entries_public_trust",
            "product_id",
            usage_count.desc(),
            updated_at.desc(),
            postgresql_where=(
                is_public.is_(True)
                & deleted_at.is_(None)
                & (status == "active")
            ),
        ),
    )


class QAEntryHistory(Base):
    __tablename__ = "qa_entry_history"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    qa_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    change_type: Mapped[str] = mapped_column(String(64), nullable=False)  # create|update|merge|archive|restore
    before: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    after: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)


# ─────────────────────────────────────────────────────── ML artifacts ────


class QAEmbedding(Base):
    __tablename__ = "qa_embeddings"
    qa_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), primary_key=True
    )
    model_version: Mapped[str] = mapped_column(String(128), nullable=False)
    vector: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


# HNSW index for cosine distance. Created in the alembic migration explicitly
# because it needs `ivfflat`/`hnsw` DDL that autogenerate does not emit.


class Cluster(Base):
    __tablename__ = "clusters"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    algo_version: Mapped[str] = mapped_column(String(64), nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    centroid: Mapped[Optional[list[float]]] = mapped_column(Vector(settings.embedding_dim), nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


class ClusterMember(Base):
    __tablename__ = "cluster_members"
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), primary_key=True
    )
    qa_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), primary_key=True
    )
    is_canonical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    distance_to_centroid: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        Index("ix_cluster_members_entry", "qa_entry_id"),
    )


# ─────────────────────────────────────────────────────── freshness ───────


class FreshnessSignal(Base):
    __tablename__ = "freshness_signals"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    qa_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    signal_type: Mapped[str] = mapped_column(String(64), nullable=False)  # age|llm_check|compliance_change|feedback
    value: Mapped[float] = mapped_column(Float, nullable=False)  # normalized 0..1 confidence
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    evidence: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class OutdatedFlag(Base):
    __tablename__ = "outdated_flags"
    qa_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # fresh|aging|outdated|stale|unknown
    score: Mapped[float] = mapped_column(Float, nullable=False)  # 0..100 health score
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_outdated_flags_updated_cursor", "updated_at", "qa_entry_id"),
    )


# ─────────────────────────────────────────────────────── human workflow ──


class MergeQueue(Base):
    __tablename__ = "merge_queue"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    primary_qa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False
    )
    secondary_qa_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False)
    canonical_draft: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    llm_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_by: Mapped[str] = mapped_column(String(64), default="llm", nullable=False)  # llm|user|rule
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


# ─────────────────────────────────────────────────────── compliance ──────


class ComplianceSource(Base):
    __tablename__ = "compliance_sources"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # rss|http|sitemap
    poll_interval_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    last_polled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class ComplianceChange(Base):
    __tablename__ = "compliance_changes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("compliance_sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    diff: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    impact_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    affected_qa_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), default=list, nullable=False
    )


# ─────────────────────────────────────────────────────── jobs ────────────


class DataSource(Base):
    """A configured external pipeline that produces QA entries on sync."""
    __tablename__ = "data_sources"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # csv_bundle | sql_query
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    poll_interval_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # null = manual only
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


class DataSourceFile(Base):
    """Uploaded file belonging to a csv_bundle DataSource."""
    __tablename__ = "data_source_files"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    data_source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alias: Mapped[str] = mapped_column(String(64), nullable=False)  # user-picked handle used in mapping/joins
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("data_source_id", "alias", name="uq_dsf_source_alias"),
    )


# ─────────────────────────────────────────────────────── questionnaires ──


class Questionnaire(Base):
    """An inbound customer questionnaire uploaded by an analyst."""
    __tablename__ = "questionnaires"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    framework_hint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SIG|CAIQ|ISO|SOC2|...
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_kind: Mapped[str] = mapped_column(String(16), nullable=False)  # xlsx|docx|pdf
    # 'parsing' | 'drafting' | 'ready_for_review' | 'in_review' | 'completed'
    status: Mapped[str] = mapped_column(String(32), default="parsing", nullable=False, index=True)
    total_items: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parse_meta: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # header row, column map, sheet name, etc.
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class QuestionnaireItem(Base):
    """A single question row within a questionnaire, with its drafted answer."""
    __tablename__ = "questionnaire_items"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    questionnaire_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questionnaires.id", ondelete="CASCADE"), nullable=False, index=True
    )
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)  # position in source file
    section: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    framework_ref: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # e.g. "CAIQ AIS-01"
    question: Mapped[str] = mapped_column(Text, nullable=False)

    drafted_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # after edit / approve
    citation_entry_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), default=list, nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    verdict: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)  # drafted|gap|pending
    # 'pending' | 'approved' | 'edited' | 'rejected'
    review_status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False, index=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_qi_questionnaire_row", "questionnaire_id", "row_index"),
    )


# ─────────────────────────────────────────────────────── frameworks / mapping ──


class FrameworkControl(Base):
    """A single control from a compliance framework (SIG, CAIQ, ISO, SOC2, NIST)."""
    __tablename__ = "framework_controls"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    framework: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # SIG|CAIQ|ISO27001|SOC2|NIST-CSF
    control_id: Mapped[str] = mapped_column(String(64), nullable=False)             # e.g. "AIS-01", "A.14.1.2"
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)       # e.g. "Application & Interface Security"
    question: Mapped[str] = mapped_column(Text, nullable=False)                     # canonical question form
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vector: Mapped[Optional[list[float]]] = mapped_column(Vector(settings.embedding_dim), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("framework", "control_id", name="uq_framework_control"),
    )


class EntryMapping(Base):
    """A cross-framework mapping from one QA entry to a framework control."""
    __tablename__ = "entry_mappings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    qa_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    framework_control_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("framework_controls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)  # cosine sim 0..1
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # LLM one-liner
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("qa_entry_id", "framework_control_id", name="uq_entry_mapping"),
    )


# ─────────────────────────────────────────────────────── library conflicts ──


class LibraryConflict(Base):
    """A potential contradiction between two library entries, detected by LLM scan."""
    __tablename__ = "library_conflicts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    entry_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("qa_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    severity: Mapped[str] = mapped_column(String(16), default="medium", nullable=False)  # low|medium|high
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    # 'open' | 'dismissed' | 'resolved'
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False, index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("entry_a_id", "entry_b_id", name="uq_conflict_pair"),
    )


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    kind: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False, index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
