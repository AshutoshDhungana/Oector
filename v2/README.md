# Oector backend

This directory contains the Oector API and its local runtime: FastAPI, PostgreSQL with pgvector, Redis, Celery worker/Beat services, sentence-transformer embeddings, and an OpenAI-compatible LLM workflow. Docker Compose is the supported way to run the full backend.

## Prerequisites

- Docker Engine/Desktop with Docker Compose v2
- At least 6 GB of memory available to Docker
- Ollama, or another OpenAI-compatible LLM endpoint reachable from Docker

For the default model:

```powershell
ollama pull qwen2.5:3b-instruct
```

## Start the backend

Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up -d --build api worker beat
docker compose ps
curl.exe http://localhost:8001/healthz
```

macOS/Linux:

```bash
cp .env.example .env
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up -d --build api worker beat
docker compose ps
curl http://localhost:8001/healthz
```

Use http://localhost:8001/docs for Swagger UI. The frontend in `../frontend` should use `VITE_API_URL=http://localhost:8001`.

## Seed a demo

```powershell
# Small offline starter library
docker compose exec api python -m scripts.seed

# Recommended pitch tenant; downloads public source material
docker compose exec api python -m scripts.seed_pitch_demo
```

The pitch seed creates the `pitch-atlas` tenant, framework mappings, a vendor questionnaire, freshness signals, a merge queue, and public Trust Center answers. It needs outbound internet access to download selected public NIST, OWASP, and CISA sources. See [pitch-data/README.md](pitch-data/README.md) and [pitch-data/ATTRIBUTION.md](pitch-data/ATTRIBUTION.md).

## Services

| Service | Host address | Container address |
| --- | --- | --- |
| API | http://localhost:8001 | http://api:8000 |
| API docs | http://localhost:8001/docs | — |
| Health check | http://localhost:8001/healthz | — |
| PostgreSQL | `localhost:5433` | `postgres:5432` |
| Redis | `localhost:6379` | `redis:6379` |

## Environment configuration

Copy `.env.example` to `.env`; API, worker, and Beat all load it.

| Setting | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Docker Postgres URL | SQLAlchemy connection. Use `localhost:5433` only from host tools. |
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker, task state, and locks. |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000` | Comma-separated permitted browser origins. |
| `LLM_BASE_URL` | `http://host.docker.internal:11434/v1` | OpenAI-compatible endpoint for drafting and review tasks. |
| `LLM_MODEL` | `qwen2.5:3b-instruct` | Default local language model. |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Local 384-dimension retrieval model. |
| `CELERY_WORKER_CONCURRENCY` | `2` | Worker processes; tune only after measuring resource usage. |
| `ANSWER_TOP_K` | `6` | Maximum evidence candidates per answer. |
| `ANSWER_NO_AUTH` | `true` | Demo-only API-authentication bypass. |

`host.docker.internal` normally works on Docker Desktop for Windows/macOS. On Linux, set `LLM_BASE_URL` to a host or LAN endpoint reachable from containers (often `http://172.17.0.1:11434/v1`), then recreate the AI services:

```powershell
docker compose up -d --force-recreate api worker
```

## Answer workflow

`POST /api/v1/answer` runs a bounded evidence workflow:

```text
retrieve → judge → draft → END
                  └→ gap → END
```

The service embeds the question, retrieves the best pgvector matches, calculates confidence, and either creates a grounded answer with citations or returns an evidence gap for review.

## Operations

```powershell
# Follow live logs
docker compose logs -f api worker beat

# Stop services without deleting data
docker compose down

# Rebuild images
docker compose up -d --build

# Backend tests
docker compose exec -T -e PYTHONPATH=/code api pytest tests -q

# Destructive: delete local database, uploads, and model cache
docker compose down -v
```

New/imported entries are embedded by the worker. Use **Prepare index** in the Oector dashboard after a seed or substantial import to queue the full preparation flow.

## Demo security boundary

This backend is locked for the pitch and is not production hardened. `ANSWER_NO_AUTH=true`, the placeholder JWT secret, development CORS, and local HTTP ports are intentional demo defaults. Before public deployment, add complete authentication/authorization, disable the bypass, rotate secrets, enforce TLS, restrict networking, and configure backups and monitoring.
