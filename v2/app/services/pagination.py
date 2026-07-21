"""Cursor pagination on (created_at, id)."""

from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime
from typing import Optional, Tuple


def encode_cursor(created_at: datetime, id_: uuid.UUID) -> str:
    payload = {"c": created_at.isoformat(), "i": str(id_)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def decode_cursor(cursor: Optional[str]) -> Optional[Tuple[datetime, uuid.UUID]]:
    if not cursor:
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return datetime.fromisoformat(payload["c"]), uuid.UUID(payload["i"])
    except Exception:
        return None
