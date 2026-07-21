# Knowledge Library Enhancer v2

## Current stack

The current development stack is FastAPI, Postgres with pgvector, Redis,
Celery, LangGraph, an OpenAI-compatible LLM endpoint, and local
sentence-transformer embeddings. The checked-in defaults are:

- **LLM:** Ollama on the host via host.docker.internal, using
  qwen2.5:3b-instruct.
- **Embeddings:** sentence-transformers/all-MiniLM-L6-v2, 384 dimensions.
- **Runtime:** Docker Compose starts Postgres, Redis, the API, a Celery worker,
  and Celery Beat.

Google/Gemini and Anthropic environment variables remain in the settings model
only for compatibility with older configuration files. They are not used by
the default Ollama path.

## Prerequisites

- Docker Desktop (or a compatible Docker engine)
- Ollama running on the host, with the default model available:

  ~~~powershell
  ollama pull qwen2.5:3b-instruct
  ~~~

On Docker Desktop, the default **LLM_BASE_URL** reaches the host through
host.docker.internal. When using another Docker setup, point that variable at
an OpenAI-compatible endpoint reachable from the API and worker containers.

## Quickstart

~~~powershell
Copy-Item .env.example .env
docker compose build
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose run --rm api python -m scripts.seed
docker compose up -d api worker beat
~~~

The worker embeds newly seeded or imported entries automatically. To queue an
embedding pass immediately after the worker is running:

~~~powershell
docker compose exec worker celery -A app.workers.celery_app call app.workers.tasks.embed.embed_pending
~~~

| Service | Host address | Container address |
| --- | --- | --- |
| API | http://localhost:8001 | http://api:8000 |
| API docs | http://localhost:8001/docs | - |
| Health check | http://localhost:8001/healthz | - |
| Postgres | localhost:5433 | postgres:5432 |
| Redis | localhost:6379 | redis:6379 |

The frontend belongs in ../frontend/. Set its **VITE_API_URL** to
http://localhost:8001 (without /api/v1).

## Configuration reference

Copy .env.example to .env before starting Compose. The API, worker, and Beat
services all load that file.

| Setting | Default | Purpose |
| --- | --- | --- |
| APP_ENV, LOG_LEVEL | dev, INFO | Application environment and logging level. |
| DATABASE_URL | postgresql+psycopg://kle:kle@postgres:5432/kle | Database URL used inside Docker. Use localhost:5433 only for host-side database tools. |
| REDIS_URL | redis://redis:6379/0 | Celery broker, result backend, and LLM cache. |
| DB_POOL_SIZE, DB_MAX_OVERFLOW | 5, 5 | Per-process SQLAlchemy connection limits. Keep their sum below PostgreSQL's connection budget across the API and Celery children. |
| CORS_ALLOW_ORIGINS | http://localhost:3000 | Comma-separated browser origins allowed to call the API. |
| JWT_SECRET, JWT_ALG, JWT_EXPIRE_MINUTES | development defaults | Token settings. Replace the secret before any non-local use. |
| LLM_PROVIDER | ollama | A non-empty provider label; the client communicates with an OpenAI-compatible endpoint. |
| LLM_BASE_URL | http://host.docker.internal:11434/v1 | Endpoint used by the API and workers for LLM requests. |
| LLM_MODEL, LLM_PRO_MODEL | qwen2.5:3b-instruct | Regular and heavier LLM task models. |
| LLM_API_KEY | empty | API key for endpoints that require one; Ollama accepts the empty default. |
| EMBEDDING_MODEL, EMBEDDING_DIM, EMBEDDING_BATCH_SIZE | MiniLM, 384, 256 | Local embedding model and batching configuration. |
| EMBEDDING_PENDING_LIMIT | 2000 | Entries embedded per worker task. A full batch queues its continuation immediately, so this is a memory/time bound rather than a scheduler delay. |
| EMBEDDING_TASK_LOCK_SECONDS, CLUSTER_TASK_LOCK_SECONDS | 3600, 3600 | Redis single-flight leases that prevent duplicate backlog and cluster passes. |
| CELERY_WORKER_CONCURRENCY, EMBEDDING_CPU_THREADS | 2, 2 | CPU-oriented Compose defaults. Benchmark before raising them; each Celery child loads its own embedding model. |
| ANSWER_TOP_K, ANSWER_CONFIDENCE_THRESHOLD | 6, 0.55 | Retrieval fanout and minimum confidence required to draft an answer. |
| ANSWER_NO_AUTH | true | Enables demo-mode authentication bypass; see the security note below. |
| OUTDATED_AGE_DAYS, COMPLIANCE_POLL_MINUTES | 90, 60 | Retained settings fields; current worker scoring and Beat schedules do not read them. The compliance poll is currently scheduled in code every 15 minutes. |
| PUBLIC_APP_URL | http://localhost:3000 | Optional base URL used in review-notification links. |
| SLACK_WEBHOOK_URL | empty | Optional incoming webhook for review and conflict notifications. |

The Compose file sets **UPLOAD_ROOT** and **EXPORT_ROOT** for API/worker
containers and persists them in its named uploads volume. It also shares a
named **model_cache** volume between the API and worker, so MiniLM is downloaded
once and survives container recreation. These normally do not need to be added
to .env.

### Performance defaults

The ingestion path is designed to drain a large backlog continuously: a worker
embeds a bounded batch, performs one bulk embedding upsert, queues one batched
cluster-assignment task, then queues the next embedding batch if work remains.
Redis locks make overlapping import, sync, API, and Beat triggers no-ops while
the current pass owns the work.

After pulling this version, apply migration 006 before importing data:

~~~powershell
docker compose run --rm api alembic upgrade head
~~~

It adds indexes for active library paging, import de-duplication, Trust Center
ranking, and freshness pagination. See [PERFORMANCE.md](PERFORMANCE.md) for
measurement commands, tuning guidance, and the criteria for adopting optional
open-source accelerators.

### Authentication and demo mode

**ANSWER_NO_AUTH=true** is the default for the demo. It bypasses
get_current_user across protected API endpoints, and lets /api/v1/answer run
without a token. Do not use it for an exposed deployment.

Setting **ANSWER_NO_AUTH=false** enables JWT checks on the protected endpoints,
but authenticated answer drafting has not been wired yet: /api/v1/answer
returns 501 in that mode. This project therefore still needs auth hardening
before production use.

### Changing embeddings

The embedding model and dimension must match the pgvector column definitions.
Do not change **EMBEDDING_DIM** independently on an existing database. The
current Alembic head includes migration 005_local_embeddings, which resets
legacy 768-dimension vectors to the current 384-dimension MiniLM format. A
future model or dimension switch needs a migration followed by re-embedding
and reclustering.

## LangGraph answer flow

POST /api/v1/answer runs this workflow:

~~~text
retrieve -> judge -> draft -> END
                 -> gap   -> END
~~~

- **retrieve** embeds the question with the configured local
  sentence-transformer and finds the top pgvector cosine-similarity hits,
  optionally scoped to a product.
- **judge** derives confidence from the strongest hit, score margin, and count
  of strong hits.
- **draft** asks the configured OpenAI-compatible LLM for a concise answer
  grounded only in retrieved entries, with inline [n] citations.
- **gap** returns the evidence hits for analyst review when retrieval confidence
  is too low.

After seeding and embedding, try it with:

~~~powershell
curl.exe -s http://localhost:8001/api/v1/answer -H "Content-Type: application/json" -d "{\"question\":\"Do you encrypt data at rest?\"}"
~~~

## Legacy data migration

app.migration.from_legacy can import legacy CSV/JSON artifacts when they are
made available inside the API container. The checked-in Compose configuration
does not mount a /legacy directory, so add an explicit temporary bind mount for
the source location before running the migration command. See
app/migration/from_legacy.py for accepted inputs and options.

## Running workers

~~~powershell
docker compose up -d worker beat
docker compose logs -f worker beat
~~~

## Investor-pitch seed

After the database is migrated and the worker is running, load the separate,
clearly labelled `pitch-atlas` simulated tenant with:

~~~powershell
docker compose exec api python -m scripts.seed_pitch_demo
~~~

This downloads selected NIST OSCAL and OWASP ASVS controls plus a small CISA
KEV snapshot, then creates a reviewable questionnaire and a configured CSV
source. It does not use the prototype's fictional vendor claims. See
[`pitch-data/README.md`](pitch-data/README.md) and its attribution ledger.
