# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Agents Dashboard — a secure, internet-exposed web app for monitoring AI-automation
progress across many servers/projects. Remote coding agents POST status/progress
reports to a central ingestion API; the dashboard persists them to SQLite and
presents full CRUD with a per-task event timeline and live-polling UI.

## Commands

```sh
pnpm dev                  # dev server (http://localhost:3000)
pnpm build                # production build (Turbopack)
pnpm start -p 3000        # run the production build

pnpm test                 # Vitest unit + integration (node env)
pnpm test -- tests/unit/repositories/task.test.ts   # run a single test file
pnpm test:coverage        # coverage with thresholds (80% lines/functions)
pnpm test:e2e             # Playwright (builds + boots app on :3100, seeds e2e.db)
pnpm run typecheck        # tsc --noEmit  (use `run` — see pnpm note below)
pnpm lint                 # eslint

pnpm db:generate          # regenerate SQL migrations after editing schema.ts/auth-schema.ts
pnpm db:migrate           # apply migrations to DATABASE_URL
pnpm db:seed              # provision initial admin from SEED_ADMIN_* env
```

Note: a `pnpm-workspace.yaml` is present, so plain `pnpm typecheck` can trip
`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` intermittently — prefer `pnpm run typecheck`
or `./node_modules/.bin/tsc --noEmit`.

Required env for build/start/e2e: `BETTER_AUTH_SECRET` (32+ chars),
`BETTER_AUTH_URL`, and `DATABASE_URL` (prod). See `.env.example`.

## Architecture (the parts that span files)

**Two independent auth planes — do not conflate them:**
- *Machine ingestion* (`POST /api/v1/reports`): Bearer API keys. Only the SHA-256
  hash is stored (`api_keys.key_hash`); plaintext is shown once at creation.
  Verified in constant time. See `src/lib/crypto/api-key.ts` + `ApiKeyRepository`.
- *Human dashboard* (`/dashboard/*`, `/api/tasks/*`, `/api/api-keys/*`): Better Auth
  email+password session cookies. Public sign-up is **disabled** on the app auth
  instance; accounts are provisioned via `pnpm db:seed`.

**Auth is a factory.** `createAuth(db, { allowSignUp })` in `src/lib/auth/auth.ts`
builds a Better Auth instance. The exported `auth` singleton disables sign-up;
the seed script (`src/lib/db/seed.ts`) builds a separate sign-up-enabled instance
over the same DB to create the first admin via the documented `signUpEmail` API.
Tests use `createAuth` against an in-memory DB to avoid the app singleton.

**Task identity + the upsert/event invariant.** A task is keyed by
`(hostname, project_path, task_key)`. `TaskRepository.upsertFromReport` runs in a
single transaction: it upserts the canonical `tasks` row AND appends an immutable
`task_events` row. The task row holds latest state; `task_events` is the append-only
timeline. When adding report fields, preserve the "absent field = keep prior value"
behavior (a heartbeat report omitting `summary`/`agent` must not blank them) — the
reporter script relies on this.

**Request flow is layered for testability.** Route handlers
(`src/app/api/**/route.ts`) are thin HTTP adapters. The ingestion pipeline lives in
`src/lib/services/ingest.ts` as `processReport(deps, token, body)` returning a
discriminated union (`ok | unauthorized | rate_limited | invalid`) with no HTTP
knowledge — the route maps that union to status codes. Replicate this split when
adding endpoints so logic is unit-testable without booting Next.

**DB access is lazy.** `src/lib/db/index.ts` exports `db` as a Proxy over a
lazily-opened better-sqlite3 singleton, so importing the module has no side effects
(critical: tests open isolated `:memory:` DBs via `createDatabase` + `createTestDb`).
Never eagerly open the DB at module load. WAL + foreign_keys pragmas are applied on
every connection.

**Repository pattern + immutability.** All data access goes through classes in
`src/lib/repositories/` that take a `db` in the constructor and return new objects
(never mutate). Business logic/routes depend on these, not Drizzle directly.

**Validation + envelope.** Zod schemas validate every boundary
(`src/lib/validation/`). All API responses use the `{ success, data, error, meta? }`
envelope via `ok()` / `fail()` in `src/lib/http/envelope.ts`.

**Rate limiting is in-memory per API key** (`src/lib/http/rate-limit.ts`) — resets
on restart, not shared across instances. The `checkRateLimit` signature is shaped
for a Redis swap if multi-instance is ever needed.

## Conventions specific to this repo

- Styling: Tailwind v4 via the **PostCSS plugin** (`postcss.config.mjs`), not the
  turbopack loader. Theme tokens are CSS variables in `src/app/globals.css`
  (`@theme inline`), dark mode via a `.dark` class (next-themes).
- UI primitives are local shadcn-style components in `src/components/ui/` — no
  component library dependency. Use the `cn()` helper (`src/lib/utils/cn.ts`).
- No `next/font/google` — the build has no network access for fonts; a system font
  stack is used. Don't reintroduce network-fetched fonts.
- `src/proxy.ts` is the request gate (Next 16's renamed `middleware`). It does an
  *optimistic* cookie check only; real session validation is in the dashboard
  layout / route guards (`requireSession`). Don't rely on the proxy for authz.
- Client data fetching uses TanStack Query with `refetchInterval` polling (no
  WebSocket/SSE) via the typed client in `src/lib/api/client.ts`.

## Reporter client

`reporter/report.sh` (POSIX sh + curl) is what remote agents run to report in.
`reporter/claude-hook.md` documents wiring it as a Claude Code `Stop`/`PostToolUse`
hook. The ingestion contract it targets is `POST /api/v1/reports`.

**`report.sh` has three copies that must stay byte-identical** —
`reporter/report.sh` is canonical; `public/report.sh` is served for download
(`$DASHBOARD_URL/report.sh`); `.claude/skills/agents-dashboard-reporter/report.sh`
is bundled with the skill. If you edit the script, copy it to the other two and
confirm with `md5sum`.

## Reporter skill for other agents

`.claude/skills/agents-dashboard-reporter/` is a self-contained Claude Code skill
(SKILL.md + bundled report.sh) other agents install under `~/.claude/skills/` to
auto-report progress. It needs `DASHBOARD_URL` + `API_KEY` env vars.
