"""FastAPI entrypoint."""

from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import router as v1_router
from app.config import settings
from app.db import engine
from app.logging_config import configure_logging, get_logger

configure_logging()
log = get_logger(__name__)

app = FastAPI(
    title="Knowledge Library Enhancer",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = time.perf_counter()
    log.info("request_start", rid=rid, method=request.method, path=request.url.path)
    try:
        response = await call_next(request)
    except Exception as e:
        log.exception("request_failed", rid=rid, error=str(e))
        return JSONResponse({"detail": "internal error", "request_id": rid}, status_code=500)
    took_ms = int((time.perf_counter() - start) * 1000)
    log.info("request_end", rid=rid, status=response.status_code, took_ms=took_ms)
    response.headers["x-request-id"] = rid
    return response


@app.get("/healthz")
def healthz() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}


app.include_router(v1_router, prefix="/api/v1")
