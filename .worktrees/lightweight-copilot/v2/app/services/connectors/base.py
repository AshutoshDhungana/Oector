"""Connector base.

Every connector streams `ConnectorRow` records. The upstream sync worker turns
each row into a `qa_entries` upsert (with content-hash dedup). Connectors never
touch the DB directly — they just produce dicts.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Iterator, Optional


class ConnectorError(Exception):
    pass


@dataclass
class ConnectorRow:
    external_id: Optional[str]
    question: str
    answer: str
    details: Optional[str] = None
    source: Optional[str] = None
    updated_at: Optional[str] = None  # ISO-8601 string; parsed downstream
    extra: dict[str, Any] | None = None


class Connector(ABC):
    """A connector reads from somewhere external and yields ConnectorRow objects."""

    @abstractmethod
    def iter_rows(self) -> Iterator[ConnectorRow]:
        raise NotImplementedError

    def validate(self) -> None:
        """Raise ConnectorError if config is malformed. Default no-op."""
        return None
