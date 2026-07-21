# Trust Copilot frontend

React, TypeScript, and Vite frontend for the Knowledge Library Enhancer v2 API.

## Setup

~~~powershell
Copy-Item .env.example .env.local
npm install
npm run dev
~~~

Vite runs on http://localhost:3000 and uses that port strictly. The default
backend Compose configuration publishes the API on http://localhost:8001.

## Environment variables

~~~env
# API origin only: the client appends /api/v1.
VITE_API_URL=http://localhost:8001

# Default demo behavior. Set false to use the login screen.
VITE_SKIP_AUTH=true
~~~

There is no Vite development proxy. If you run the frontend on another origin,
also update the backend's **CORS_ALLOW_ORIGINS** value. Do not append /api/v1
or a trailing slash to **VITE_API_URL**.

With **VITE_SKIP_AUTH=true**, the frontend provides a demo token automatically.
Set it to false to use the login page; after seeding, the demo credentials are
**admin@example.com** / **admin**. The backend's default **ANSWER_NO_AUTH=true**
is also demo-only and bypasses API authentication. See ../v2/README.md for the
current backend authentication limitation.

## Routes

Protected application routes:

- / - dashboard
- /questionnaires and /questionnaires/:id/review - upload, draft, review,
  approve, and export customer questionnaires
- /library-health - library readiness and health
- /analytics - library and questionnaire metrics
- /entries, /search, /outdated, /merge - library management, similarity search,
  freshness, and merge review
- /import, /upload, /datasources - bulk and connected data ingestion
- /compliance, /integrations - compliance monitoring and integrations

Public routes:

- /trust/:slug - product Trust Center

/login is available when demo mode is disabled.

## Build

~~~powershell
npm run build      # type-check and bundle to dist/
npm run preview    # serve the production bundle locally
~~~

