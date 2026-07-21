"""CSV-bundle connector.

Config shape:

    {
      "main_alias": "answers",
      "mapping": {
        "question":    "answers.question_text",
        "answer":      "answers.answer_text",
        "details":     "answers.notes",             # optional
        "external_id": "answers.id",                # optional; else content_hash dedups
        "updated_at":  "answers.updated_at",        # optional
        "source":      "'legacy import'"            # optional; literal if quoted with single quotes
      },
      "joins": [
        {
          "left_alias":  "answers",
          "left_key":    "product_id",
          "right_alias": "products",
          "right_key":   "id"
        },
        {
          "left_alias":  "answers",
          "left_key":    "id",
          "right_alias": "junction",
          "right_key":   "question_id"
        }
      ]
    }

`files` is a list of dicts: {alias, path, filename}.

For each row in the main file, joined files' matching rows are looked up by key
(first match wins — collapsing a many-to-one into a flat view). Then the mapping
is applied: values like "products.name" fetch a column; values wrapped in single
quotes are literal.
"""

from __future__ import annotations

from typing import Iterator

import pandas as pd

from .base import Connector, ConnectorError, ConnectorRow


class CsvBundleConnector(Connector):
    def __init__(self, config: dict, files: list[dict]):
        self.config = config or {}
        self.files = {f["alias"]: f for f in (files or [])}
        # loaded lazily by iter_rows

    def validate(self) -> None:
        main_alias = self.config.get("main_alias")
        if not main_alias:
            raise ConnectorError("config.main_alias is required")
        if main_alias not in self.files:
            raise ConnectorError(f"main_alias '{main_alias}' has no uploaded file")
        mapping = self.config.get("mapping") or {}
        if "question" not in mapping or "answer" not in mapping:
            raise ConnectorError("mapping.question and mapping.answer are required")
        for j in self.config.get("joins") or []:
            for k in ("left_alias", "left_key", "right_alias", "right_key"):
                if k not in j:
                    raise ConnectorError(f"join is missing '{k}'")
            if j["right_alias"] not in self.files:
                raise ConnectorError(f"join references missing file alias '{j['right_alias']}'")

    def _load_lookup(self, alias: str, key: str) -> dict:
        f = self.files[alias]
        df = pd.read_csv(f["path"])
        if key not in df.columns:
            raise ConnectorError(f"lookup '{alias}' has no column '{key}'")
        idx: dict = {}
        for row in df.to_dict(orient="records"):
            k = row.get(key)
            if k is None or pd.isna(k):
                continue
            idx.setdefault(str(k), row)
        return idx

    def _resolve(self, expr: str, main_row: dict, joined: dict[str, dict]) -> str | None:
        if expr is None:
            return None
        if isinstance(expr, str) and expr.startswith("'") and expr.endswith("'"):
            return expr[1:-1]
        if "." not in expr:
            v = main_row.get(expr)
            return None if v is None or (isinstance(v, float) and pd.isna(v)) else str(v)
        alias, col = expr.split(".", 1)
        row = main_row if alias == self.config["main_alias"] else joined.get(alias)
        if not row:
            return None
        v = row.get(col)
        return None if v is None or (isinstance(v, float) and pd.isna(v)) else str(v)

    def iter_rows(self) -> Iterator[ConnectorRow]:
        self.validate()
        main_alias = self.config["main_alias"]
        main_path = self.files[main_alias]["path"]
        mapping = self.config["mapping"]
        joins = self.config.get("joins") or []

        # Preload every non-main file into a dict keyed by right_key for O(1) lookup.
        # First join wins for chained joins (junction → dimension chains not supported in v1).
        lookups: dict[str, dict] = {}
        for j in joins:
            key = f"{j['right_alias']}::{j['right_key']}"
            if key not in lookups:
                lookups[key] = self._load_lookup(j["right_alias"], j["right_key"])

        for chunk in pd.read_csv(main_path, chunksize=1000):
            chunk = chunk.where(pd.notna(chunk), None)
            for main_row in chunk.to_dict(orient="records"):
                joined: dict[str, dict] = {}
                for j in joins:
                    left_val = main_row.get(j["left_key"])
                    if left_val is None:
                        continue
                    key = f"{j['right_alias']}::{j['right_key']}"
                    hit = lookups.get(key, {}).get(str(left_val))
                    if hit is not None:
                        joined[j["right_alias"]] = hit

                q = self._resolve(mapping["question"], main_row, joined)
                a = self._resolve(mapping["answer"], main_row, joined)
                if not q or not a:
                    continue

                yield ConnectorRow(
                    external_id=self._resolve(mapping.get("external_id"), main_row, joined),
                    question=q,
                    answer=a,
                    details=self._resolve(mapping.get("details"), main_row, joined),
                    source=self._resolve(mapping.get("source"), main_row, joined) or "csv_bundle",
                    updated_at=self._resolve(mapping.get("updated_at"), main_row, joined),
                )
