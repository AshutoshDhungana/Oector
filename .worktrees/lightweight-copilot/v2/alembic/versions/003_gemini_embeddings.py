"""Widen vector columns for Google text-embedding-004 (768 dim).

Revision ID: 003_gemini_embeddings
Revises: 002_datasources
Create Date: 2026-07-21

This is a DESTRUCTIVE migration for embedding data. Old sentence-transformers
384-dim vectors are cross-model-incompatible with Gemini 768-dim vectors —
there is no meaningful conversion. We drop and recreate the vector column
so that a subsequent `embed_pending` run repopulates from scratch.

Cluster centroids follow the same fate.

After upgrade, run:
    docker compose run --rm api celery -A app.workers.celery_app call \
        app.workers.tasks.embed.embed_pending
"""
from alembic import op

from app.config import settings


revision = "003_gemini_embeddings"
down_revision = "002_datasources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── qa_embeddings ────────────────────────────────────────────────
    # Drop dependent index first, then column, then recreate at new dim.
    op.execute("DROP INDEX IF EXISTS ix_qa_embeddings_vector_cos")
    op.execute("TRUNCATE TABLE qa_embeddings")
    op.execute("ALTER TABLE qa_embeddings DROP COLUMN vector")
    op.execute(
        f"ALTER TABLE qa_embeddings ADD COLUMN vector vector({settings.embedding_dim}) NOT NULL"
    )
    op.execute(
        "CREATE INDEX ix_qa_embeddings_vector_cos "
        "ON qa_embeddings USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # ── clusters.centroid ────────────────────────────────────────────
    # Centroids are recomputed by the clustering worker; safe to null out.
    op.execute("ALTER TABLE clusters DROP COLUMN centroid")
    op.execute(
        f"ALTER TABLE clusters ADD COLUMN centroid vector({settings.embedding_dim})"
    )
    # Clear any cluster memberships tied to now-invalid vectors so the next
    # clustering run rebuilds from clean state.
    op.execute("TRUNCATE TABLE cluster_members")
    op.execute("UPDATE clusters SET size = 0, centroid = NULL")


def downgrade() -> None:
    # Downgrade widens back to the original 384-dim MiniLM shape.
    op.execute("DROP INDEX IF EXISTS ix_qa_embeddings_vector_cos")
    op.execute("TRUNCATE TABLE qa_embeddings")
    op.execute("ALTER TABLE qa_embeddings DROP COLUMN vector")
    op.execute("ALTER TABLE qa_embeddings ADD COLUMN vector vector(384) NOT NULL")
    op.execute(
        "CREATE INDEX ix_qa_embeddings_vector_cos "
        "ON qa_embeddings USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute("ALTER TABLE clusters DROP COLUMN centroid")
    op.execute("ALTER TABLE clusters ADD COLUMN centroid vector(384)")
    op.execute("TRUNCATE TABLE cluster_members")
    op.execute("UPDATE clusters SET size = 0, centroid = NULL")
