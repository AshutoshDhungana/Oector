"""Embedding service — local sentence-transformers (MiniLM-L6-v2, 384-dim).

Public API preserved from the Gemini version:

    embed_texts(texts, batch_size=None, task_type=...) -> List[List[float]]
    embed_query(text)                                  -> List[float]
    model_version()                                    -> str

`task_type` is accepted but ignored — sentence-transformers doesn't distinguish
query vs document (symmetric embedding), so both sides use the same model.
"""

from __future__ import annotations

import threading
from typing import List, Optional

from app.config import settings
from app.logging_config import get_logger

log = get_logger(__name__)

_model = None
_model_lock = threading.Lock()


def _get_model():
    """Lazy singleton — first call downloads the model (~90 MB for MiniLM-L6)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                log.info("loading_embedding_model", model=settings.embedding_model)
                _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed_texts(
    texts: List[str],
    batch_size: Optional[int] = None,
    *,
    task_type: Optional[str] = None,  # accepted for signature-compat with the Gemini version, ignored
) -> List[List[float]]:
    """Embed a list of texts. Returns L2-normalised vectors so cosine similarity
    reduces to a dot-product — matches what pgvector's `<=>` operator expects.
    """
    if not texts:
        return []
    model = _get_model()
    bs = batch_size or settings.embedding_batch_size
    vecs = model.encode(
        texts,
        batch_size=bs,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return vecs.tolist()


def embed_query(text: str) -> List[float]:
    """Embed a single question — same model as documents (symmetric)."""
    if not text or not text.strip():
        raise ValueError("empty query text")
    return embed_texts([text])[0]


def model_version() -> str:
    return f"{settings.embedding_model}@{settings.embedding_dim}"
