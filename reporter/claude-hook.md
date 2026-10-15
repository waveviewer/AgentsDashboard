# Wiring the reporter into remote agents

`report.sh` posts a single progress report to the dashboard. Point it at your
dashboard URL with an API key (create one in **Dashboard → API Keys**), and call
it from wherever your automation runs.

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

All flags can be supplied as environment variables instead (`DASHBOARD_URL`,
`API_KEY`, `TASK_KEY`, `TITLE`, `STATUS`, `PROGRESS`, `SUMMARY`, `AGENT`).
`hostname` and `project_path` default to the machine hostname and `pwd`.

A task is identified by `(hostname, project_path, task_key)` — reuse the same
`task_key` across a run so updates land on the same task and build its timeline.

---

## Claude Code hooks

Claude Code can fire hooks on lifecycle events. Use them to report automatically
without touching your task logic. Add to `.claude/settings.json` in the project
the agent runs in.

### Report completion on Stop

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "DASHBOARD_URL=https://dash.example.com API_KEY=adk_xxx TASK_KEY=my-feature TITLE='My feature' STATUS=completed PROGRESS=100 SUMMARY='Session finished' AGENT=claude-code /abs/path/reporter/report.sh"
          }
        ]
      }
    ]
  }
}
```

### Heartbeat on each tool use (PostToolUse)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "DASHBOARD_URL=https://dash.example.com API_KEY=adk_xxx TASK_KEY=my-feature TITLE='My feature' STATUS=running SUMMARY='working' AGENT=claude-code /abs/path/reporter/report.sh"
          }
        ]
      }
    ]
  }
}
```

Notes:
- Use an **absolute path** to `report.sh` — hook CWD is not guaranteed.
- Store the key outside the repo (e.g. a sourced env file) rather than committing it.
- `PostToolUse` fires often; keep `SUMMARY` cheap or sample it if you only want periodic updates.

---

## CI / generic shell

Any CI step or script can report the same way:

```sh
export DASHBOARD_URL=https://dash.example.com
export API_KEY="$DASHBOARD_API_KEY"   # from CI secrets

reporter/report.sh --task-key "ci-$CI_JOB_ID" --title "Build $CI_COMMIT_SHA" \
  --status running --progress 10 --summary "installing deps"

# ... later ...
reporter/report.sh --task-key "ci-$CI_JOB_ID" --title "Build $CI_COMMIT_SHA" \
  --status completed --progress 100 --summary "deployed"
```

The script exits non-zero on transport failure or any non-2xx response, so CI
steps surface reporting errors instead of silently passing.
