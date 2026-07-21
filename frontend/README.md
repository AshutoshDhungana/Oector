# Oector frontend

The Oector web app is built with React 18, TypeScript, Vite, and Tailwind. It talks to the FastAPI service in `../v2` and uses the supplied Figma landing and authentication components directly from `../figma_design_src` during the build.

## Prerequisites

- Node.js 20 LTS or newer
- npm 10 or newer
- A running Oector API, normally at `http://localhost:8001`

## Run locally

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

macOS/Linux:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Vite runs at http://localhost:3000 and intentionally fails if that port is occupied. Start the backend first using [../README.md](../README.md).

## Environment

```env
# API origin only. The client appends /api/v1.
VITE_API_URL=http://localhost:8001

# Enables Oector's browser-only investor-demo session.
VITE_SKIP_AUTH=true
```

Do not append `/api/v1` or a trailing slash to `VITE_API_URL`. If the app is served from another browser origin, add that origin to the backend `CORS_ALLOW_ORIGINS` setting.

`VITE_SKIP_AUTH=true` is for the pitch build only: sign-in/sign-up create a local browser session and do not send a password to the backend. It is not a production authentication implementation.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public Oector landing page. |
| `/login`, `/signup` | Figma-authored demo access screens. |
| `/dashboard` | Workspace overview and index readiness. |
| `/questionnaires` | Questionnaire upload, drafting, review, approval, and export. |
| `/library-health`, `/analytics` | Knowledge quality and performance metrics. |
| `/entries`, `/search`, `/outdated`, `/merge` | Entry management, similarity search, freshness, and canonical merge review. |
| `/import`, `/upload`, `/datasources` | Bulk and connected data ingestion. |
| `/compliance`, `/integrations` | Compliance monitoring and integrations. |
| `/trust/:slug` | Public Trust Center; use `/trust/pitch-atlas` after pitch seeding. |

All workspace pages use the Oector navigation shell. Landing, auth, and Trust Center pages include a public navigation bar.

## Build and preview

```powershell
npm run build
npm run preview
```

The build type-checks the app and produces `dist/`. It also verifies that the Figma aliases and hero asset resolve, so run it before deploying.

## Troubleshooting

- **Requests fail or data is missing:** verify that `v2` is running and `VITE_API_URL` is correct.
- **CORS error:** add the frontend origin to `CORS_ALLOW_ORIGINS` in `v2/.env`, then restart the API.
- **Figma component/asset error:** preserve the repository layout—`frontend/` and `figma_design_src/` are intentionally linked by the Vite configuration.
