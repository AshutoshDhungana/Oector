from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Job, Product, User
from app.services.slugify import slugify

router = APIRouter()

UPLOAD_DIR = Path("/tmp/kle_uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/csv", status_code=status.HTTP_202_ACCEPTED)
async def upload_csv(
    file: UploadFile = File(...),
    product_slug: Optional[str] = Form(None),
    product_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Accepts either:
    - product_slug: reference an existing product, OR
    - product_name: create a new product on the fly (slug is auto-generated),
                    idempotent if a product with the same slug already exists.
    Exactly one of the two must be provided.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only .csv accepted")

    if not product_slug and not product_name:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Provide product_slug or product_name"
        )

    if product_slug:
        p = db.execute(select(Product).where(Product.slug == product_slug)).scalar_one_or_none()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product_slug")
    else:
        slug = slugify(product_name or "")
        p = db.execute(select(Product).where(Product.slug == slug)).scalar_one_or_none()
        if not p:
            p = Product(slug=slug, name=(product_name or "").strip() or slug)
            db.add(p)
            db.commit()
            db.refresh(p)

    upload_id = uuid.uuid4()
    dest = UPLOAD_DIR / f"{upload_id}.csv"
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    job = Job(
        kind="ingest.parse_csv",
        status="queued",
        payload={"upload_id": str(upload_id), "product_id": str(p.id), "path": str(dest)},
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    from app.workers.tasks.ingest import parse_csv
    parse_csv.delay(str(job.id))
    return {
        "job_id": str(job.id),
        "upload_id": str(upload_id),
        "product": {"id": str(p.id), "slug": p.slug, "name": p.name},
    }
