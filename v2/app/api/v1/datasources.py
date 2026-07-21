from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import DataSource, DataSourceFile, Job, Product, User
from app.schemas import (
    DataSourceCreate,
    DataSourceOut,
    DataSourceUpdate,
)
from app.services.connectors import get_connector
from app.services.connectors.base import ConnectorError

router = APIRouter()

FILES_ROOT = Path("/tmp/kle_uploads/datasources")
FILES_ROOT.mkdir(parents=True, exist_ok=True)


def _resolve_product(db: Session, slug: str) -> Product:
    p = db.execute(select(Product).where(Product.slug == slug)).scalar_one_or_none()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown product")
    return p


def _to_out(db: Session, ds: DataSource, files: list[DataSourceFile] | None = None) -> dict:
    if files is None:
        files = db.execute(
            select(DataSourceFile)
            .where(DataSourceFile.data_source_id == ds.id)
            .order_by(DataSourceFile.alias)
        ).scalars().all()
    d = DataSourceOut.model_validate(ds).model_dump()
    d["files"] = [
        {
            "id": str(f.id),
            "alias": f.alias,
            "filename": f.filename,
            "size_bytes": f.size_bytes,
            "created_at": f.created_at,
        }
        for f in files
    ]
    return d


@router.get("")
def list_sources(
    product: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(DataSource).order_by(DataSource.created_at.desc())
    if product:
        p = _resolve_product(db, product)
        stmt = stmt.where(DataSource.product_id == p.id)
    sources = db.execute(stmt).scalars().all()
    files_by_source: dict[uuid.UUID, list[DataSourceFile]] = {
        source.id: [] for source in sources
    }
    if files_by_source:
        file_rows = db.execute(
            select(DataSourceFile)
            .where(DataSourceFile.data_source_id.in_(files_by_source))
            .order_by(DataSourceFile.alias)
        ).scalars().all()
        for file_row in file_rows:
            files_by_source[file_row.data_source_id].append(file_row)
    return [_to_out(db, ds, files_by_source[ds.id]) for ds in sources]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_source(
    body: DataSourceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.kind not in {"csv_bundle", "sql_query"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "kind must be csv_bundle or sql_query")
    p = _resolve_product(db, body.product_slug)
    ds = DataSource(
        product_id=p.id,
        name=body.name.strip(),
        kind=body.kind,
        config=body.config or {},
        enabled=body.enabled,
        poll_interval_minutes=body.poll_interval_minutes,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return _to_out(db, ds)


@router.get("/{ds_id}")
def get_source(ds_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return _to_out(db, ds)


@router.patch("/{ds_id}")
def update_source(
    ds_id: uuid.UUID,
    body: DataSourceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(ds, k, v)
    db.commit()
    db.refresh(ds)
    return _to_out(db, ds)


@router.delete("/{ds_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(ds_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    # remove files on disk (best-effort)
    for f in db.execute(select(DataSourceFile).where(DataSourceFile.data_source_id == ds_id)).scalars():
        try:
            Path(f.path).unlink(missing_ok=True)
        except Exception:
            pass
    db.execute(delete(DataSource).where(DataSource.id == ds_id))
    db.commit()
    return None


@router.post("/{ds_id}/files", status_code=status.HTTP_201_CREATED)
async def upload_file(
    ds_id: uuid.UUID,
    alias: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    if ds.kind != "csv_bundle":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only csv_bundle sources accept files")
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only .csv accepted")
    alias = alias.strip()
    if not alias:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "alias is required")

    ds_dir = FILES_ROOT / str(ds_id)
    ds_dir.mkdir(parents=True, exist_ok=True)
    dest = ds_dir / f"{alias}.csv"

    size = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
            size += len(chunk)

    existing = db.execute(
        select(DataSourceFile).where(
            DataSourceFile.data_source_id == ds_id, DataSourceFile.alias == alias
        )
    ).scalar_one_or_none()
    if existing:
        try:
            Path(existing.path).unlink(missing_ok=True)
        except Exception:
            pass
        existing.filename = file.filename
        existing.path = str(dest)
        existing.size_bytes = size
    else:
        db.add(
            DataSourceFile(
                data_source_id=ds_id,
                alias=alias,
                filename=file.filename,
                path=str(dest),
                size_bytes=size,
            )
        )
    db.commit()
    db.refresh(ds)
    return _to_out(db, ds)


@router.delete("/{ds_id}/files/{alias}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(ds_id: uuid.UUID, alias: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    f = db.execute(
        select(DataSourceFile).where(
            DataSourceFile.data_source_id == ds_id, DataSourceFile.alias == alias
        )
    ).scalar_one_or_none()
    if not f:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    try:
        Path(f.path).unlink(missing_ok=True)
    except Exception:
        pass
    db.execute(delete(DataSourceFile).where(DataSourceFile.id == f.id))
    db.commit()
    return None


@router.post("/test-sql")
def test_sql_connection(
    body: dict,
    _: User = Depends(get_current_user),
):
    """Test a SQL DSN + query WITHOUT persisting a data source.

    Body:
        {"dsn": "...", "query": "SELECT ...", "sample": 3}

    Returns:
        {ok, dialect, row_count_estimate, sample_rows}
    """
    dsn = (body.get("dsn") or "").strip()
    query = (body.get("query") or "").strip()
    sample_n = int(body.get("sample") or 3)

    if not dsn:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "dsn is required")

    # Basic allow-list of dialects to avoid the field being a shell for arbitrary drivers.
    if not any(dsn.startswith(p) for p in ("postgresql", "postgres", "mysql", "mssql", "sqlite")):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "dsn dialect must be postgresql, postgres, mysql, mssql, or sqlite",
        )

    from sqlalchemy import create_engine, text
    try:
        engine = create_engine(dsn, pool_pre_ping=True, connect_args={"connect_timeout": 5} if "postgresql" in dsn else {})
        with engine.connect() as conn:
            # Show what dialect the driver reports.
            dialect = engine.dialect.name
            if query:
                # LIMIT the sample to avoid sucking down a huge table.
                sample = conn.execute(text(query).execution_options(stream_results=True)).fetchmany(sample_n)
                col_names = list(sample[0]._mapping.keys()) if sample else []
                sample_rows = [
                    {k: (str(v) if v is not None else None) for k, v in dict(row._mapping).items()}
                    for row in sample
                ]
                # Best-effort row count — some queries won't wrap in a subquery cleanly, so degrade gracefully.
                row_count: int | None = None
                try:
                    count_sql = f"SELECT COUNT(*) FROM ({query}) _sub"
                    row_count = int(conn.execute(text(count_sql)).scalar() or 0)
                except Exception:
                    row_count = None
                return {
                    "ok": True,
                    "dialect": dialect,
                    "columns": col_names,
                    "row_count_estimate": row_count,
                    "sample_rows": sample_rows,
                }
            else:
                # No query — just prove connectivity.
                conn.execute(text("SELECT 1"))
                return {"ok": True, "dialect": dialect, "sample_rows": []}
    except Exception as e:
        return {"ok": False, "error": str(e)[:800]}


@router.post("/{ds_id}/validate")
def validate_source(ds_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Dry-run: instantiate the connector and call validate(). Doesn't touch DB."""
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    files = [
        {"alias": f.alias, "path": f.path, "filename": f.filename}
        for f in db.execute(
            select(DataSourceFile).where(DataSourceFile.data_source_id == ds_id)
        ).scalars().all()
    ]
    try:
        conn = get_connector(ds.kind, dict(ds.config or {}), files)
        conn.validate()
        return {"ok": True}
    except ConnectorError as e:
        return {"ok": False, "error": str(e)}


@router.post("/{ds_id}/sync", status_code=status.HTTP_202_ACCEPTED)
def trigger_sync(ds_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    job = Job(kind="datasource.sync", status="queued", payload={"data_source_id": str(ds_id)})
    db.add(job)
    db.commit()
    db.refresh(job)
    from app.workers.tasks.datasource_sync import sync
    sync.delay(str(job.id))
    return {"job_id": str(job.id)}
