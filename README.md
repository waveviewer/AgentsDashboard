# Agents Dashboard

A secure web dashboard for monitoring AI-automation progress across many
projects and servers. Distributed coding agents (on different hosts, in
different directories) report their status and progress to a central ingestion
API; the dashboard persists every report to SQLite and presents it with full
CRUD, filtering, a per-task event timeline, and near-live updates.

## Architecture

```
Remote AI task (host A, /path/to/projX)                 Operator's browser
        │  POST /api/v1/reports                                 │ (login session)
        │  Authorization: Bearer <api-key>                      │
        ▼                                                       ▼
  [Ingestion API] ──validate(Zod)──► [SQLite] ◄──CRUD──── [Dashboard UI]
   rate-limit + verify hashed key      tasks               list/filter/detail
                                       task_events          live polling
```

- **Framework:** Next.js 16 (App Router, React 19, TypeScript).
- **Database:** SQLite via Drizzle ORM + better-sqlite3 (WAL mode).
- **Dashboard auth:** Better Auth (email + password), httpOnly session cookies.
- **Ingestion auth:** API keys — only a SHA-256 hash is stored; the plaintext is
  shown once at creation. Verified in constant time.
- **A task** is identified by `(hostname, project_path, task_key)`. Each report
  upserts the task row and appends an immutable `task_events` row (its timeline).

## Prerequisites

- Node.js 20+ (tested on 24)
- pnpm (via `corepack enable`)

## Quick start (development)

```sh
pnpm install
cp .env.example .env            # then edit — set a real BETTER_AUTH_SECRET

pnpm db:generate                # generate SQL migrations from the schema (first run)
pnpm db:migrate                 # apply migrations to the SQLite file
pnpm db:seed                    # create the initial admin from SEED_ADMIN_* env vars

pnpm dev                        # http://localhost:3000
```

Sign in at `/login` with the seeded admin, create an API key under
**Dashboard → API Keys**, then send a report (see below).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | prod | Path to the SQLite file (e.g. `./data/app.db`). |
| `BETTER_AUTH_SECRET` | yes | 32+ char secret for signing sessions. `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | yes | Public URL the dashboard is served from. |
| `INGEST_MAX_BODY_BYTES` | no | Max ingestion body size (default 16384). |
| `INGEST_RATE_LIMIT` | no | Max reports per key per window (default 60). |
| `INGEST_RATE_WINDOW_MS` | no | Rate-limit window in ms (default 60000). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | seed | Initial admin (password 12+ chars). |

The app fails fast at startup in production if `DATABASE_URL` or a valid
`BETTER_AUTH_SECRET` is missing.

## Sending reports from agents

Use the bundled reporter (POSIX sh + curl, no dependencies):

```sh
reporter/report.sh \
  --url https://dash.example.com \
  --api-key "$API_KEY" \
  --task-key build-login \
  --title "Implement login flow" \
  --status running \
  --progress 60 \
  --summary "Added auth route, writing tests"
```

Or raw curl:

```sh
curl -X POST https://dash.example.com/api/v1/reports \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "hostname": "server-a",
    "project_path": "/srv/projX",
    "task_key": "build-login",
    "title": "Implement login flow",
    "status": "running",
    "progress": 60,
    "summary": "Added auth route, writing tests",
    "agent": "claude-opus-4-8"
  }'
```

`status` is one of `queued | running | paused | completed | failed`. Reuse the
same `task_key` across a run so updates land on one task and build its timeline.
See [`reporter/claude-hook.md`](reporter/claude-hook.md) for wiring it as a
Claude Code `Stop` / `PostToolUse` hook or a CI step.

## Production deployment

The app is designed to run behind a TLS-terminating reverse proxy. The app binds
localhost; only the proxy faces the internet.

```sh
pnpm install --prod=false
pnpm db:migrate
pnpm db:seed
pnpm build
BETTER_AUTH_SECRET=... DATABASE_URL=./data/app.db \
  BETTER_AUTH_URL=https://dash.example.com pnpm start -p 3000
```

Then run Caddy for automatic HTTPS — see [`Caddyfile.example`](Caddyfile.example).
Run `pnpm start` under a process manager (systemd, PM2) so it restarts on crash
and boot. Back up by copying the SQLite file (plus its `-wal`/`-shm` sidecars),
or use `sqlite3 app.db ".backup"`.

### Security notes

- Public sign-up is disabled; provision accounts via `pnpm db:seed`.
- Security headers (CSP, HSTS, X-Frame-Options, etc.) are set in `next.config.ts`.
- Ingestion is rate-limited **in-memory per API key** — fine for a single host,
  but state resets on restart and is not shared across instances. For a
  multi-instance deployment, back the limiter in `src/lib/http/rate-limit.ts`
  with Redis (the `checkRateLimit` signature is designed for that swap).

## Testing

```sh
pnpm test            # unit + integration (Vitest)
pnpm test:coverage   # with coverage thresholds (80% lines/functions)
pnpm test:e2e        # Playwright end-to-end (builds + boots the app)
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint
```

