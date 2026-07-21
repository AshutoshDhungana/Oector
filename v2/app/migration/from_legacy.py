"""One-shot migrator: legacy CSV/JSON tree → Postgres.

Usage:
    python -m app.migration.from_legacy --root /legacy

Legacy layout expected (from the pre-v2 repo):
    <root>/data/Product.csv                                 : product catalog
    <root>/cleaned_dataset/<Product>_complete_dataset.csv   : QA entries
    <root>/data/merge_history.json                          : historical merges

Strategy:
- Streaming CSV read (chunked); never loads a whole file into memory.
- COPY-friendly bulk inserts via `Session.execute(insert(...), rows)` batches of 1000.
- Idempotent: content_hash + external_id upsert; re-running is safe.
- No embeddings computed here; that's Phase 3's worker job. The `embed.batch` task
  will pick up newly-inserted rows because they lack a qa_embeddings row.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Product, QAEntry
from app.services.hashing import content_hash

log = get_logger(__name__)

BATCH = 1000


def slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.strip().lower())
    return s.strip("-") or "unknown"


def load_products(root: Path) -> dict[str, uuid.UUID]:
    """Ensure a row in `products` for every product mentioned in the legacy tree."""
    product_names: set[str] = set()

    catalog = root / "data" / "Product.csv"
    if catalog.exists():
        for chunk in pd.read_csv(catalog, chunksize=BATCH):
            for name in chunk.get("name", chunk.get("product_name", pd.Series())).dropna().tolist():
                product_names.add(str(name))

    for p in (root / "cleaned_dataset").glob("*_complete_dataset.csv"):
        stem = p.stem.replace("_complete_dataset", "")
        product_names.add(stem.replace("_", " "))

    if not product_names:
        product_names.add("Default Product")

    ids: dict[str, uuid.UUID] = {}
    with session_scope() as db:
        for name in sorted(product_names):
            slug = slugify(name)
            existing = db.execute(select(Product).where(Product.slug == slug)).scalar_one_or_none()
            if existing:
                ids[slug] = existing.id
                continue
            p = Product(slug=slug, name=name)
            db.add(p)
            db.flush()
            ids[slug] = p.id
            log.info("product_created", slug=slug, name=name)
    return ids


def _parse_dt(v) -> datetime | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        ts = pd.to_datetime(v, utc=True, errors="coerce")
        if pd.isna(ts):
            return None
        return ts.to_pydatetime()
    except Exception:
        return None


def _row_to_entry(row: dict, product_id: uuid.UUID) -> dict | None:
    q = str(row.get("question") or "").strip()
    a = str(row.get("answer") or "").strip()
    if not q or not a:
        return None
    details = row.get("details") or row.get("additional_details")
    ext_id = row.get("id") or row.get("external_id") or row.get("question_id")
    updated = row.get("updated_at") or row.get("last_updated") or row.get("modified_at")

    return {
        "id": uuid.uuid4(),
        "product_id": product_id,
        "external_id": str(ext_id) if ext_id is not None and not pd.isna(ext_id) else None,
        "question": q,
        "answer": a,
        "details": str(details) if details and not pd.isna(details) else None,
        "source": str(row.get("source") or "legacy"),
        "status": "active",
        "content_hash": content_hash(q, a, str(details or "")),
        "original_updated_at": _parse_dt(updated),
    }


def iter_csv_rows(path: Path) -> Iterator[dict]:
    for chunk in pd.read_csv(path, chunksize=BATCH):
        chunk = chunk.where(pd.notna(chunk), None)
        for r in chunk.to_dict(orient="records"):
            yield r


def upsert_entries(rows: Iterable[dict]) -> int:
    """Idempotent upsert on (product_id, external_id). Falls back to content_hash if no ext id."""
    buf: list[dict] = []
    count = 0
    with session_scope() as db:
        for r in rows:
            buf.append(r)
            if len(buf) >= BATCH:
                count += _flush(db, buf)
                buf.clear()
        if buf:
            count += _flush(db, buf)
    return count


def _flush(db, rows: list[dict]) -> int:
    # Split rows: those with external_id can use the unique constraint;
    # those without are inserted unconditionally (dedup happens at content_hash lookup).
    with_ext = [r for r in rows if r["external_id"]]
    without_ext = [r for r in rows if not r["external_id"]]

    n = 0
    if with_ext:
        stmt = pg_insert(QAEntry).values(with_ext)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_qa_product_external",
            set_={
                "question": stmt.excluded.question,
                "answer": stmt.excluded.answer,
                "details": stmt.excluded.details,
                "content_hash": stmt.excluded.content_hash,
                "original_updated_at": stmt.excluded.original_updated_at,
                "updated_at": datetime.utcnow(),
                "version": QAEntry.version + 1,
            },
        )
        db.execute(stmt)
        n += len(with_ext)

    if without_ext:
        # Best-effort dedup by content_hash within the same product.
        for r in without_ext:
            exists = db.execute(
                select(QAEntry.id).where(
                    QAEntry.product_id == r["product_id"], QAEntry.content_hash == r["content_hash"]
                )
            ).first()
            if exists:
                continue
            db.execute(pg_insert(QAEntry).values(**r))
            n += 1

    return n


def run(root: Path) -> None:
    log.info("migration_start", root=str(root))
    slugs = load_products(root)

    ds_dir = root / "cleaned_dataset"
    if not ds_dir.exists():
        log.warning("no_cleaned_dataset_dir", path=str(ds_dir))
        return

    total = 0
    for csv in sorted(ds_dir.glob("*_complete_dataset.csv")):
        stem = csv.stem.replace("_complete_dataset", "")
        slug = slugify(stem.replace("_", " "))
        product_id = slugs.get(slug)
        if product_id is None:
            log.warning("no_product_for_csv", csv=csv.name, slug=slug)
            continue
        log.info("ingest_csv_start", csv=csv.name, product=slug)
        rows = (
            entry
            for r in iter_csv_rows(csv)
            for entry in [_row_to_entry(r, product_id)]
            if entry is not None
        )
        n = upsert_entries(rows)
        total += n
        log.info("ingest_csv_done", csv=csv.name, inserted_or_updated=n)

    log.info("migration_done", total=total)


def main() -> int:
    configure_logging()
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, required=True, help="Legacy repo root (e.g. /legacy)")
    args = ap.parse_args()
    if not args.root.exists():
        log.error("root_missing", root=str(args.root))
        return 1
    run(args.root)
    return 0


if __name__ == "__main__":
    sys.exit(main())
