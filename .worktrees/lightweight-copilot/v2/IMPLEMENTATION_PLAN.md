# Knowledge Library Enhancer — v2 Implementation Plan

> Historical implementation plan. It records the original migration phases and
> therefore contains older references to Next.js, Gemini, and Anthropic. For
> the active runtime configuration, use README.md, .env.example, and
> app/config.py in this directory.

Concrete, week-by-week execution. Everything lives under `v2/` until cutover. Legacy code in the repo root is untouched until Phase 6.

## Phase 0 — Freeze & scaffold  (day 1)

- [x] Create `v2/` layout.
- [x] `docker-compose.yml` for `postgres` (pgvector), `redis`, `api`, `worker`, `beat`.
- [x] `requirements.txt` (pinned).
- [x] `.env.example`.
- [x] `README.md` with bootstrap steps.
- Deliverable: `docker compose up` starts the whole stack, hitting `/healthz` returns `200`.

## Phase 1 — Data layer  (days 2–4)

- SQLAlchemy models in `app/models.py`:
  `products, qa_entries, qa_entry_history, qa_embeddings, clusters, cluster_members,
   outdated_flags, freshness_signals, merge_queue, compliance_sources, compliance_changes,
   users, api_keys, jobs`.
- pgvector column type + HNSW index on `qa_embeddings.vector`.
- Alembic init + first revision.
- Legacy migrator `app/migration/from_legacy.py`:
  reads existing `cleaned_dataset/*.csv`, `processed_clusters/*.json`,
  `data/merge_history.json` → bulk-COPY into Postgres, computes `content_hash`.
- Deliverable: `python -m app.migration.from_legacy` loads real data; `SELECT count(*)` matches CSVs.

## Phase 2 — API gateway  (days 5–7)

- `app/main.py` FastAPI, versioned under `/api/v1`.
- `app/config.py` Pydantic Settings.
- `app/auth.py` JWT (HS256), `POST /auth/login`, `/auth/refresh`.
- CORS allow-list from env (no more `*`).
- Cursor-pagination helper (`(created_at, id)` key).
- Read endpoints: `/products`, `/entries`, `/entries/{id}`, `/clusters`, `/clusters/{id}`,
  `/health/summary`.
- Structured JSON logging, request-id middleware.
- Deliverable: `curl` roundtrip works; Streamlit `app.py` can be pointed at new API for reads.

## Phase 3 — Workers + embeddings + search  (days 8–12)

- Celery app at `app/workers/celery_app.py`, Redis broker.
- Tasks:
  `ingest.parse_csv`, `embed.batch`, `cluster.online_assign`, `cluster.nightly_rebuild`.
- Idempotency: skip work when `qa_entries.content_hash` unchanged and
  `qa_embeddings.model_version` matches.
- Batching: 256-item windows, streamed from Postgres cursor (server-side).
- Online search: `POST /search/similar` uses pgvector `<->` operator with HNSW index.
- Job tracking: `jobs` table + `GET /jobs/{id}` + `GET /jobs/{id}/stream` (SSE).
- Deliverable: upload CSV of 100k rows, embeddings computed in batches without OOM,
  similarity search returns top-k in <100 ms.

## Phase 4 — LLM outdated + merge  (days 13–17)

- `app/services/llm.py` Anthropic client, Redis-cached by prompt hash.
- Task `outdated_check.verify(entry_id)`:
  1. age-prior filter (skip if <90 days old and no signals),
  2. Claude Haiku classification with QA + top-3 compliance excerpts,
  3. write `outdated_flags` row.
- Task `merge_suggest.for_cluster(cluster_id)`:
  Claude Sonnet merges ≥2 similar entries → `merge_queue` row with
  `llm_rationale` and canonical draft.
- Endpoints:
  `POST /merge/queue/{id}/approve` (transactional: write canonical, soft-delete originals,
  append history), `POST /merge/queue/{id}/reject`,
  `POST /health/recheck/{entry_id}`.
- Remove random-date fallback. Missing dates = `null`; UI shows "unknown".
- Deliverable: run outdated check on 1k entries; approve a merge from Next.js UI end-to-end.

## Phase 5 — Compliance watcher  (days 18–21)

- `compliance_sources` table populated with SOC 2 / ISO 27001 / GDPR RSS/URLs.
- Celery-beat schedule: poll each source per its `poll_interval`.
- On change: LLM summarises diff, k-NN against `qa_embeddings` finds impacted entries,
  writes `compliance_changes.affected_qa_ids[]`, bumps their `outdated_flags`.
- Endpoint `GET /compliance/changes`; UI page shows changes + linked entries.
- Deliverable: seed 3 sources, trigger a poll, see a synthetic change link to real QA entries.

## Phase 6 — Frontend consolidation + hardening  (days 22–28)

- Generate typed client from OpenAPI (`openapi-typescript-codegen`).
- Point all `NEXT_PUBLIC_API_URL` calls at `/api/v1`.
- Port merge-review + outdated-fix flows out of Streamlit into Next.js pages.
- SSE hook for job status.
- Load test: 100k entries, 10 concurrent users; p95 < 300 ms for reads,
  merge approval < 1 s.
- Delete `app.py`, `api/main.py`, duplicated `run_*.py`, redundant caches.

---

## What lives where

```
v2/
  docker-compose.yml
  requirements.txt
  .env.example
  alembic.ini
  alembic/
  app/
    main.py            FastAPI entry
    config.py          Settings
    db.py              engine + session
    models.py          SQLAlchemy models
    schemas.py         Pydantic
    auth.py            JWT
    deps.py            request-scoped deps
    logging.py         structured log config
    api/v1/
      router.py
      entries.py
      search.py
      clusters.py
      health.py
      merge.py
      compliance.py
      jobs.py
      uploads.py
      auth.py
    services/
      embedding.py     sentence-transformers wrapper
      clustering.py    HDBSCAN + online assign
      llm.py           Anthropic client + cache
      outdated.py      scoring logic
      merge.py         canonical-draft logic
      compliance.py    diff + linking
      pagination.py    cursor helper
    workers/
      celery_app.py
      beat_schedule.py
      tasks/
        ingest.py
        embed.py
        cluster.py
        outdated_check.py
        merge_suggest.py
        compliance_poll.py
    migration/
      from_legacy.py   one-shot CSV/JSON → Postgres
  tests/
  scripts/
    seed.py            demo tenant + a few QA pairs
```

## Success criteria for MVP

1. 500k QA pairs loaded without OOM.
2. Embedding a new upload of 10k rows finishes in <5 min.
3. Similarity search p95 latency <100 ms.
4. Outdated-check task processes 1k entries/hour under a fixed Anthropic budget.
5. Compliance watcher polls ≥3 sources and links changes to entries.
6. Zero endpoints without auth.
7. No monolithic file rewrites in the hot path.
