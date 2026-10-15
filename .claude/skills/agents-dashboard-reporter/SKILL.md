---
name: agents-dashboard-reporter
description: Report AI coding task progress and status to a central Agents Dashboard. Use whenever working on a long-running or multi-step task that should be visible on the monitoring dashboard — on start, at milestones, and on completion/failure. Posts via a zero-dependency shell script (curl) to the dashboard ingestion API.
---

# Agents Dashboard Reporter

Report your task progress to a central Agents Dashboard so a human operator can
monitor AI-automation work across many servers and projects in one place.

## When to use this skill

Use it to send a status update whenever you are doing substantive, trackable work:

- **On start** — report `status: running`, `progress: 0` with a short title.
- **At milestones** — bump `progress` and update `summary` as you advance.
- **On completion** — report `status: completed`, `progress: 100`.
- **On failure/abort** — report `status: failed` (or `paused`) with the reason in `summary`.

Do not report trivial one-off actions. Report work that a human would want to watch.

## Prerequisites (one-time, provided by the operator)

Two values must be available as environment variables (ask the operator if unset):

- `DASHBOARD_URL` — base URL of the dashboard, e.g. `https://dash.example.com`
- `API_KEY` — an ingestion key (format `adk_...`) created in **Dashboard → API Keys**

`curl` must be installed (it almost always is). No other dependency is needed.

## How to report

The bundled `report.sh` (same directory as this file) does the work. Make it
executable once (`chmod +x report.sh`), then call it.

Required: `--task-key`, `--title`, `--status`. Reuse the **same `--task-key`**
for every update of one logical task so they land on the same task and build its
timeline. `hostname` and `project_path` are auto-detected (machine hostname + `pwd`).

```sh
# Start
./report.sh --task-key "$TASK_KEY" --title "Refactor auth module" \
  --status running --progress 0 --summary "starting" --agent claude-opus-4-8

# Milestone
./report.sh --task-key "$TASK_KEY" --title "Refactor auth module" \
  --status running --progress 50 --summary "extracted session helpers"

# Done
./report.sh --task-key "$TASK_KEY" --title "Refactor auth module" \
  --status completed --progress 100 --summary "all tests green"
```

`--url` and `--api-key` default to `$DASHBOARD_URL` / `$API_KEY` env vars, so you
can omit them once those are exported. `status` is one of
`queued | running | paused | completed | failed`. `--summary` and `--agent` are
optional and, when omitted, do NOT overwrite previously-reported values.

## Choosing a task_key

Pick a stable, descriptive slug for the whole task and keep it constant across
updates, e.g. `refactor-auth-2026-10`, `ci-build-${BUILD_ID}`, `migrate-db-v3`.
Changing it mid-task creates a second task on the dashboard.

## Installing on a new machine

Copy this skill directory to `~/.claude/skills/agents-dashboard-reporter/` on the
target machine, or fetch just the script from the dashboard:

```sh
curl -fsSL "$DASHBOARD_URL/report.sh" -o report.sh && chmod +x report.sh
```

## Verifying

A successful call prints `report.sh: ok (202) task=... status=... progress=...%`
and exits 0. On auth failure it prints the server status (401) and exits non-zero;
on an invalid payload, 422. Surface these errors rather than ignoring them.
