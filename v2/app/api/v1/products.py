from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import DataSource, DataSourceFile, Job, Product, User
from app.schemas import ProductCreate, ProductOut
from app.services.slugify import slugify

router = APIRouter()
UPLOAD_ROOT = Path("/tmp/kle_uploads").resolve()


@router.get("", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.execute(select(Product).order_by(Product.name)).scalars().all()


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Name is required")
    slug = (body.slug or slugify(name)).strip().lower()
    existing = db.execute(select(Product).where(Product.slug == slug)).scalar_one_or_none()
    if existing:
        return existing
    p = Product(slug=slug, name=name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{slug}")
def delete_product(
    slug: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Permanently remove one loaded product and its product-owned data.

    Database-level foreign keys remove its Q&A entries, embeddings, clusters,
    mappings, merge items, data sources, and data-source file records. Existing
    questionnaires deliberately remain, but their optional product scope is
    set to NULL by the schema.
    """
    product = db.execute(select(Product).where(Product.slug == slug)).scalar_one_or_none()
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "product not found")
    product_out = {"id": str(product.id), "slug": product.slug, "name": product.name}

    source_ids = db.execute(
        select(DataSource.id).where(DataSource.product_id == product.id)
    ).scalars().all()
    source_file_paths = db.execute(
        select(DataSourceFile.path)
        .join(DataSource, DataSource.id == DataSourceFile.data_source_id)
        .where(DataSource.product_id == product.id)
    ).scalars().all()

    # Jobs are not foreign-keyed to products because their payload is JSON. Mark
    # related queued/running work cancelled before removing the product so a
    # delayed import or datasource sync cannot continue using stale IDs.
    cancelled_jobs = 0
    import_paths: list[str] = []
    source_id_strings = {str(source_id) for source_id in source_ids}
    for job in db.execute(
        select(Job).where(Job.kind.in_(["ingest.parse_csv", "datasource.sync"]))
    ).scalars().all():
        payload = job.payload or {}
        matches_product = str(payload.get("product_id")) == str(product.id)
        matches_source = str(payload.get("data_source_id")) in source_id_strings
        if not matches_product and not matches_source:
            continue
        if job.status in {"queued", "running"}:
            job.status = "cancelled"
            job.error = "cancelled because its product was deleted"
            cancelled_jobs += 1
        if matches_product and isinstance(payload.get("path"), str):
            import_paths.append(payload["path"])

    db.execute(delete(Product).where(Product.id == product.id))
    db.commit()

    removed_files = sum(
        _unlink_uploaded_file(path) for path in [*source_file_paths, *import_paths]
    )
    return {
        "deleted_product": product_out,
        "removed_data_sources": len(source_ids),
        "removed_files": removed_files,
        "cancelled_jobs": cancelled_jobs,
        "questionnaires_unlinked": True,
    }


def _unlink_uploaded_file(raw_path: str) -> bool:
    """Best-effort cleanup limited to the application's upload directory."""
    try:
        candidate = Path(raw_path).resolve()
        if not candidate.is_relative_to(UPLOAD_ROOT) or not candidate.is_file():
            return False
        candidate.unlink()
        return True
    except (OSError, ValueError):
        return False
