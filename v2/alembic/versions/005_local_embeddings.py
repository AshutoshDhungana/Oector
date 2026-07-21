"""Shrink vector columns to 384 for local MiniLM-L6-v2 embeddings.

Revision ID: 005_local_embeddings
Revises: 004_prototype_pipeline
Create Date: 2026-07-21

Destructive: 768-dim Gemini vectors are cross-model-incompatible with 384-dim
MiniLM vectors. We drop and recreate the vector columns so a subsequent
`embed_pending` run repopulates from scratch. Cluster centroids follow.

After upgrade, run:
    docker compose run --rm api celery -A app.workers.celery_app call \
        app.workers.tasks.embed.embed_pending
"""
from alembic import op

from app.config import settings


revision = "005_local_embeddings"
down_revision = "004_prototype_pipeline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── qa_embeddings ────────────────────────────────────────────────
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

    # ── framework_controls (added in migration 004, needs same shrink) ──
    op.execute("DROP INDEX IF EXISTS ix_framework_controls_vector_cos")
    op.execute("ALTER TABLE framework_controls DROP COLUMN vector")
    op.execute(
        f"ALTER TABLE framework_controls ADD COLUMN vector vector({settings.embedding_dim})"
    )
    op.execute(
        "CREATE INDEX ix_framework_controls_vector_cos "
        "ON framework_controls USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # ── clusters.centroid ────────────────────────────────────────────
    op.execute("ALTER TABLE clusters DROP COLUMN centroid")
    op.execute(
        f"ALTER TABLE clusters ADD COLUMN centroid vector({settings.embedding_dim})"
    )
    op.execute("TRUNCATE TABLE cluster_members")
    op.execute("UPDATE clusters SET size = 0, centroid = NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_qa_embeddings_vector_cos")
    op.execute("TRUNCATE TABLE qa_embeddings")
    op.execute("ALTER TABLE qa_embeddings DROP COLUMN vector")
    op.execute("ALTER TABLE qa_embeddings ADD COLUMN vector vector(768) NOT NULL")
    op.execute(
        "CREATE INDEX ix_qa_embeddings_vector_cos "
        "ON qa_embeddings USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    op.execute("DROP INDEX IF EXISTS ix_framework_controls_vector_cos")
    op.execute("ALTER TABLE framework_controls DROP COLUMN vector")
    op.execute("ALTER TABLE framework_controls ADD COLUMN vector vector(768)")
    op.execute(
        "CREATE INDEX ix_framework_controls_vector_cos "
        "ON framework_controls USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    op.execute("ALTER TABLE clusters DROP COLUMN centroid")
    op.execute("ALTER TABLE clusters ADD COLUMN centroid vector(768)")
    op.execute("TRUNCATE TABLE cluster_members")
    op.execute("UPDATE clusters SET size = 0, centroid = NULL")
