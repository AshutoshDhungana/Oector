"""Pydantic request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ─────────── products / entries ───────────


class ProductOut(ORMModel):
    id: uuid.UUID
    slug: str
    name: str


class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None


class QAEntryOut(ORMModel):
    id: uuid.UUID
    product_id: uuid.UUID
    external_id: Optional[str]
    question: str
    answer: str
    details: Optional[str]
    source: Optional[str]
    status: str
    version: int
    original_updated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class QAEntryUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    details: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None


class Page(BaseModel):
    items: list
    next_cursor: Optional[str] = None
    has_more: bool = False


# ─────────── auth ───────────


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ─────────── answer (LangGraph flow) ───────────


class AnswerRequest(BaseModel):
    question: str
    product_slug: Optional[str] = None
    k: Optional[int] = Field(default=None, ge=1, le=25)


class AnswerHit(BaseModel):
    entry_id: str
    question: str
    answer: str
    score: float


class AnswerResponse(BaseModel):
    question: str
    verdict: str                    # "drafted" | "gap"
    answer: Optional[str]
    citations: List[str]            # entry_ids in the order cited
    confidence: float
    needs_review: bool
    reason: str
    hits: List[AnswerHit]


# ─────────── search ───────────


class SimilaritySearchRequest(BaseModel):
    text: str
    product_slug: Optional[str] = None
    k: int = Field(default=10, ge=1, le=100)


class SimilarityHit(BaseModel):
    entry: QAEntryOut
    score: float  # cosine similarity 0..1


class SimilaritySearchResponse(BaseModel):
    query: str
    hits: List[SimilarityHit]


# ─────────── health / outdated ───────────


class OutdatedFlagOut(ORMModel):
    qa_entry_id: uuid.UUID
    status: str
    score: float
    reason: Optional[str]
    updated_at: datetime
    # Enriched with the QA entry so the UI can render the actual question/answer.
    # Nullable in case the entry was hard-deleted between the flag and the read.
    entry: Optional["OutdatedFlagEntry"] = None


class OutdatedFlagEntry(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    external_id: Optional[str]
    question: str
    answer: str
    source: Optional[str]
    original_updated_at: Optional[datetime]
    updated_at: datetime
    status: str


class HealthSummary(BaseModel):
    product_slug: Optional[str]
    total: int
    active: int
    archived: int
    by_status: dict
    average_score: float


# ─────────── merge ───────────


class MergeSourceEntryOut(ORMModel):
    """The exact library entry reviewed as part of a merge candidate."""
    id: uuid.UUID
    external_id: Optional[str]
    question: str
    answer: str
    details: Optional[str]
    source: Optional[str]
    status: str
    updated_at: datetime


class MergeQueueOut(ORMModel):
    id: uuid.UUID
    product_id: uuid.UUID
    primary_qa_id: uuid.UUID
    secondary_qa_ids: List[uuid.UUID]
    canonical_draft: Optional[dict]
    llm_rationale: Optional[str]
    suggested_by: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    primary_entry: Optional[MergeSourceEntryOut] = None
    secondary_entries: List[MergeSourceEntryOut] = []


class MergeApproveRequest(BaseModel):
    canonical_override: Optional[dict] = None  # {question, answer, details}


# ─────────── jobs ───────────


class JobOut(ORMModel):
    id: uuid.UUID
    kind: str
    status: str
    progress: float
    result: Optional[dict]
    error: Optional[str]
    created_at: datetime
    updated_at: datetime


# ─────────── compliance ───────────


class ComplianceSourceIn(BaseModel):
    name: str
    url: str
    kind: str = "rss"
    poll_interval_minutes: int = 60


class ComplianceSourceOut(ORMModel):
    id: uuid.UUID
    name: str
    url: str
    kind: str
    poll_interval_minutes: int
    last_polled_at: Optional[datetime]
    enabled: bool


class ComplianceChangeOut(ORMModel):
    id: uuid.UUID
    source_id: uuid.UUID
    detected_at: datetime
    summary: str
    impact_score: float
    affected_qa_ids: List[uuid.UUID]


# ─────────── questionnaires ───────────


class QuestionnaireOut(ORMModel):
    id: uuid.UUID
    product_id: Optional[uuid.UUID]
    name: str
    customer: Optional[str]
    framework_hint: Optional[str]
    original_filename: str
    file_kind: str
    status: str
    total_items: int
    job_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


class QuestionnaireItemOut(ORMModel):
    id: uuid.UUID
    questionnaire_id: uuid.UUID
    row_index: int
    section: Optional[str]
    framework_ref: Optional[str]
    question: str
    drafted_answer: Optional[str]
    final_answer: Optional[str]
    citation_entry_ids: List[uuid.UUID]
    confidence: float
    verdict: str
    review_status: str
    reviewed_at: Optional[datetime]
    reviewer_notes: Optional[str]


class QuestionnaireDetail(BaseModel):
    questionnaire: QuestionnaireOut
    items: List[QuestionnaireItemOut]
    stats: dict


class QuestionnaireItemUpdate(BaseModel):
    final_answer: Optional[str] = None
    reviewer_notes: Optional[str] = None


class QuestionnaireItemAction(BaseModel):
    final_answer: Optional[str] = None
    reviewer_notes: Optional[str] = None
    push_to_library: bool = True   # on approve, upsert (question, final_answer) as QAEntry


class QuestionnaireBulkApproveRequest(BaseModel):
    """Accept all pending drafted answers at or above one confidence threshold."""
    min_confidence: float = Field(default=0.75, ge=0.0, le=1.0)
    push_to_library: bool = True


# ─────────── framework mappings ───────────


class MappingOut(BaseModel):
    framework: str
    control_ref: str
    domain: Optional[str]
    score: float
    rationale: Optional[str]


class FrameworkControlOut(ORMModel):
    id: uuid.UUID
    framework: str
    control_id: str
    domain: Optional[str]
    question: str
    description: Optional[str]


# ─────────── conflicts ───────────


class ConflictOut(ORMModel):
    id: uuid.UUID
    entry_a_id: uuid.UUID
    entry_b_id: uuid.UUID
    severity: str
    explanation: str
    status: str
    detected_at: datetime


class ConflictDetail(BaseModel):
    conflict: ConflictOut
    entry_a: QAEntryOut
    entry_b: QAEntryOut


# ─────────── analytics ───────────


class AnalyticsOverview(BaseModel):
    library_total: int
    library_active: int
    library_public: int
    questionnaires_total: int
    questionnaires_completed: int
    items_total: int
    items_approved: int
    auto_answer_rate: float          # approved / total across all questionnaires
    avg_confidence: float
    hours_saved: float               # heuristic
    conflicts_open: int
    frameworks_mapped: int
    by_framework: dict               # {framework: count of mapped entries}
    by_status: dict                  # {fresh/aging/... : count}
    top_products: List[dict]


# ─────────── trust center (public) ───────────


class TrustEntry(BaseModel):
    id: uuid.UUID
    question: str
    answer: str
    category: Optional[str] = None
    frameworks: List[str] = Field(default_factory=list)
    updated_at: datetime


class TrustProfile(BaseModel):
    slug: str
    product_name: str
    tagline: str
    frameworks: List[str]
    total_answers: int
    categories: List[str]
    entries: List[TrustEntry]


# ─────────── data sources ───────────


class DataSourceCreate(BaseModel):
    product_slug: str
    name: str
    kind: str  # csv_bundle | sql_query
    config: dict = Field(default_factory=dict)
    enabled: bool = True
    poll_interval_minutes: Optional[int] = None


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    enabled: Optional[bool] = None
    poll_interval_minutes: Optional[int] = None


class DataSourceFileOut(ORMModel):
    id: uuid.UUID
    alias: str
    filename: str
    size_bytes: int
    created_at: datetime


class DataSourceOut(ORMModel):
    id: uuid.UUID
    product_id: uuid.UUID
    name: str
    kind: str
    config: dict
    enabled: bool
    poll_interval_minutes: Optional[int]
    last_synced_at: Optional[datetime]
    last_error: Optional[str]
    created_at: datetime
    updated_at: datetime
    files: List[DataSourceFileOut] = Field(default_factory=list)
