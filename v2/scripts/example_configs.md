# DataSource — example configs

Two connector kinds are supported today: `csv_bundle` and `sql_query`.
Each source is scoped to one product; every sync upserts through the same
`qa_entries` path (content-hash dedup, incremental embedding).

## csv_bundle — the legacy dataset shipped in `/data/*.csv`

Their real data is fragmented: `AnswerLibraryEntry.csv` (main), plus
`CanonicalQuestionProducts.csv` and `Product.csv` as lookups. Config for
denormalising it back into single QA rows:

```json
{
  "main_alias": "answers",
  "mapping": {
    "external_id": "answers.id",
    "question":    "answers.question",
    "answer":      "answers.answer",
    "updated_at":  "answers.updated_at",
    "details":     "answers.additional_details",
    "source":      "'legacy import'"
  },
  "joins": [
    { "left_alias": "answers", "left_key": "id",
      "right_alias": "junction", "right_key": "question_id" },
    { "left_alias": "junction", "left_key": "product_id",
      "right_alias": "products", "right_key": "id" }
  ]
}
```

Upload the three files with aliases `answers`, `junction`, `products`.

Rules:
- Column refs are `alias.column`. `main.foo` and `answers.foo` are equivalent
  when the main alias is `answers`.
- Literal values are single-quoted: `"'legacy import'"`.
- First-match-wins for joins; chained joins are supported (this config chains
  `answers → junction → products`).

## sql_query — pull directly from an existing warehouse

```json
{
  "dsn": "postgresql+psycopg://reader:pass@db.internal:5432/kb",
  "query": "SELECT id, question_text, answer_text, updated_at FROM kb WHERE deleted_at IS NULL",
  "mapping": {
    "external_id": "id",
    "question":    "question_text",
    "answer":      "answer_text",
    "updated_at":  "updated_at"
  },
  "chunk_size": 1000
}
```

Set `poll_interval_minutes` to have Celery-beat sync the source on a schedule.
Leave it null for manual-only via the "Sync now" button.
