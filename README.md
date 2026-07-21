# Oector

Oector is an AI-assisted trust-operations workspace. It helps security teams create evidence-grounded questionnaire drafts, maintain a living security-answer library, review conflicts and merges, track freshness, map controls to frameworks, and publish approved answers to a Trust Center.

# GPT-5.6 and Codex's Help in this project:

## Repository layout

| Path                | Purpose                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `frontend/`         | React, TypeScript, Vite, and Tailwind Oector application.                      |
| `v2/`               | FastAPI API, PostgreSQL/pgvector, Redis, Celery, embeddings, and LLM workflow. |
| `figma_design_src/` | Source design components used directly by the landing and auth screens.        |
| `v2/pitch-data/`    | Attribution and reproducibility notes for the pitch tenant.                    |
| `PITCH_RUNBOOK.md`  | Suggested investor walkthrough.                                                |

## Run Oector anywhere

### Prerequisites

- Docker Desktop (or Docker Engine) with Docker Compose v2. Allocate at least 6 GB RAM to Docker.
- Node.js 20 LTS+ and npm 10+.
- [Ollama](https://ollama.com/) for the full local Copilot/drafting workflow.

```powershell
docker --version
docker compose version
node --version
npm --version
ollama pull qwen2.5:3b-instruct
```

### Start the backend

Windows PowerShell:

```powershell
cd v2
Copy-Item .env.example .env
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up -d --build api worker beat
docker compose ps
curl.exe http://localhost:8001/healthz
```

macOS/Linux:

```bash
cd v2
cp .env.example .env
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up -d --build api worker beat
docker compose ps
curl http://localhost:8001/healthz
```

On Docker Desktop for Windows and macOS, the supplied `LLM_BASE_URL` reaches host-side Ollama through `host.docker.internal`. On Linux, update `v2/.env` with an OpenAI-compatible URL reachable from containers (often `http://172.17.0.1:11434/v1`), then restart `api` and `worker`.

### Load data

Use the small offline seed:

```powershell
cd v2
docker compose exec api python -m scripts.seed
```

For the recommended pitch walkthrough, use the reproducible `pitch-atlas` tenant:

```powershell
cd v2
docker compose exec api python -m scripts.seed_pitch_demo
```

The pitch seed downloads selected public NIST, OWASP, and CISA sources, so it needs outbound internet access. See [v2/pitch-data/README.md](v2/pitch-data/README.md) for the dataset details and attribution.

### Start the frontend

Open a second terminal.

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

On macOS/Linux, use `cp .env.example .env.local` instead. Open http://localhost:3000, then choose **Sign in** or **Get started**. In the default pitch setup, this creates a browser-only local demo session; no credentials are sent to the backend.

## Local services

| Service            | Address                                 |
| ------------------ | --------------------------------------- |
| Oector frontend    | http://localhost:3000                   |
| API                | http://localhost:8001/api/v1            |
| API docs           | http://localhost:8001/docs              |
| Health check       | http://localhost:8001/healthz           |
| PostgreSQL         | `localhost:5433`                        |
| Redis              | `localhost:6379`                        |
| Pitch Trust Center | http://localhost:3000/trust/pitch-atlas |

## Common commands

```powershell
# Follow backend work
cd v2
docker compose logs -f api worker beat

# Stop services, preserving local data
docker compose down

# Rebuild backend containers
docker compose up -d --build

# Verify a production frontend bundle
cd ..\frontend
npm run build
```

To completely reset local backend data, including the database, uploads, and model cache:

```powershell
cd v2
docker compose down -v
```

Then rerun the backend and seed steps.

## Security note

The supplied configuration is intentionally demo-oriented: `ANSWER_NO_AUTH=true` bypasses backend authentication, the frontend sign-in is local only, and `.env.example` includes a placeholder JWT secret. Before a shared or public deployment, implement real identity/role authorization, remove the bypass, rotate secrets, use TLS, restrict CORS and network access, and configure backups/observability.

## Troubleshooting

| Symptom                 | Resolution                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| API is unavailable      | Run `docker compose logs api` in `v2/`; make sure migrations completed and Postgres is healthy.  |
| Copilot/drafts fail     | Confirm Ollama is running, the model is pulled, and `LLM_BASE_URL` is reachable from containers. |
| Empty/unindexed library | Keep the worker running and use **Prepare index** from `/dashboard`.                             |
| Browser CORS error      | Confirm `VITE_API_URL=http://localhost:8001` and add the browser origin to `CORS_ALLOW_ORIGINS`. |
| A port is occupied      | Stop the conflicting process or change the Compose/Vite port mapping.                            |

See [frontend/README.md](frontend/README.md) for UI-specific details and [v2/README.md](v2/README.md) for backend configuration.

Some months ago I stumbled upon this field of Cybersecurity and Compliance and I got to know the Hectic and rigorous process that the Security Analyst had to go, and when I asked them is there was any tool that did it easily, They said no. Thats when this started.

From the Initial idea, I was using GPT-5.6 to firstly understand this doamin properly and what solution existed and what didnt and after that I planned the actual Infrastructure and well tried it myself for the first time.
I got i
