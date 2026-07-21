from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from jose import JWTError
from sqlalchemy.orm import Session

from app.auth import decode_token, get_current_user
from app.db import SessionLocal, get_db
from app.models import Job, User
from app.schemas import JobOut

router = APIRouter()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return j


def _validate_stream_token(token: str) -> None:
    """
    EventSource cannot send Authorization headers, so the client passes the JWT
    as a query param on this one endpoint. We validate it exactly like the
    normal bearer flow — same secret, same algorithm, must be an access token.
    """
    try:
        payload = decode_token(token)
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}") from e
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong token type")
    if not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


@router.get("/{job_id}/stream")
async def stream_job(
    job_id: uuid.UUID,
    token: str = Query(..., description="JWT access token (EventSource can't send Authorization headers)"),
):
    _validate_stream_token(token)

    async def gen():
        terminal = {"succeeded", "failed", "cancelled"}
        last_state = None
        while True:
            db = SessionLocal()
            try:
                j = db.get(Job, job_id)
                if not j:
                    yield f"event: error\ndata: {json.dumps({'detail': 'not found'})}\n\n"
                    return
                snap = {"status": j.status, "progress": j.progress, "error": j.error}
                if snap != last_state:
                    yield f"data: {json.dumps(snap, default=str)}\n\n"
                    last_state = snap
                if j.status in terminal:
                    return
            finally:
                db.close()
            await asyncio.sleep(1.0)

    return StreamingResponse(gen(), media_type="text/event-stream")
