"""SQL-query connector for Postgres / MySQL.

Config:

    {
      "dsn": "postgresql+psycopg://user:pass@host:5432/db",   # or mysql+pymysql://...
      "query": "SELECT id, question_text, answer_text, updated_at FROM kb WHERE deleted_at IS NULL",
      "mapping": {
        "external_id": "id",
        "question":    "question_text",
        "answer":      "answer_text",
        "updated_at":  "updated_at",
        "details":     "notes",
        "source":      "'crm import'"
      },
      "chunk_size": 1000
    }

Security caveat: the DSN is stored in config JSON. For an MVP we accept that
(admin-only endpoint). Encrypt-at-rest with an envelope key is the next step.
"""

from __future__ import annotations

from typing import Iterator

from sqlalchemy import create_engine, text

from .base import Connector, ConnectorError, ConnectorRow


ALLOWED_PREFIXES = ("postgresql", "postgres", "mysql")


class SqlQueryConnector(Connector):
    def __init__(self, config: dict):
        self.config = config or {}

    def validate(self) -> None:
        dsn = self.config.get("dsn", "")
        if not any(dsn.startswith(p) for p in ALLOWED_PREFIXES):
            raise ConnectorError(f"dsn must start with one of {ALLOWED_PREFIXES}")
        if not self.config.get("query"):
            raise ConnectorError("config.query is required")
        mapping = self.config.get("mapping") or {}
        if "question" not in mapping or "answer" not in mapping:
            raise ConnectorError("mapping.question and mapping.answer are required")

    @staticmethod
    def _resolve(expr: str | None, row: dict) -> str | None:
        if not expr:
            return None
        if expr.startswith("'") and expr.endswith("'"):
            return expr[1:-1]
        v = row.get(expr)
        return None if v is None else str(v)

    def iter_rows(self) -> Iterator[ConnectorRow]:
        self.validate()
        engine = create_engine(self.config["dsn"], pool_pre_ping=True, future=True)
        chunk_size = int(self.config.get("chunk_size", 1000))
        mapping = self.config["mapping"]

        with engine.connect().execution_options(stream_results=True, yield_per=chunk_size) as conn:
            result = conn.execute(text(self.config["query"]))
            for row in result.mappings():
                r = dict(row)
                q = self._resolve(mapping["question"], r)
                a = self._resolve(mapping["answer"], r)
                if not q or not a:
                    continue
                yield ConnectorRow(
                    external_id=self._resolve(mapping.get("external_id"), r),
                    question=q,
                    answer=a,
                    details=self._resolve(mapping.get("details"), r),
                    source=self._resolve(mapping.get("source"), r) or "sql_query",
                    updated_at=self._resolve(mapping.get("updated_at"), r),
                )
        engine.dispose()
