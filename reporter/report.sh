#!/usr/bin/env sh
# ---------------------------------------------------------------------------
# Agents Dashboard — reporter client
#
# Posts a task progress report to the dashboard ingestion endpoint. Portable
# POSIX sh + curl so it runs on any server/agent with no extra dependencies.
#
# Required (flag or env):
#   --url        | DASHBOARD_URL   Base dashboard URL, e.g. https://dash.example.com
#   --api-key    | API_KEY         Ingestion API key (adk_...)
#   --task-key   | TASK_KEY        Stable id for this task (e.g. build-login)
#   --title      | TITLE           Human-readable task title
#   --status     | STATUS          queued|running|paused|completed|failed
#
# Optional (flag or env):
#   --progress   | PROGRESS        Integer 0-100 (default 0)
#   --summary    | SUMMARY         Short status summary
#   --agent      | AGENT           Agent/model name (e.g. claude-opus-4-8)
#   --hostname   | HOSTNAME_OVERRIDE   Defaults to `hostname`
#   --project    | PROJECT_PATH    Defaults to current working directory
#
# Example:
#   ./report.sh --url https://dash.example.com --api-key "$API_KEY" \
#     --task-key build-login --title "Implement login" \
#     --status running --progress 60 --summary "writing tests"
# ---------------------------------------------------------------------------
set -eu

PROGRESS="${PROGRESS:-0}"
SUMMARY="${SUMMARY:-}"
AGENT="${AGENT:-}"
STATUS="${STATUS:-}"
TASK_KEY="${TASK_KEY:-}"
TITLE="${TITLE:-}"
HOSTNAME_OVERRIDE="${HOSTNAME_OVERRIDE:-}"
PROJECT_PATH="${PROJECT_PATH:-}"

# ---- parse flags (override env) -------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --url) DASHBOARD_URL="$2"; shift 2 ;;
    --api-key) API_KEY="$2"; shift 2 ;;
    --task-key) TASK_KEY="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --status) STATUS="$2"; shift 2 ;;
    --progress) PROGRESS="$2"; shift 2 ;;
    --summary) SUMMARY="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    --hostname) HOSTNAME_OVERRIDE="$2"; shift 2 ;;
    --project) PROJECT_PATH="$2"; shift 2 ;;
    -h|--help) grep '^#' "$0" | cut -c3-; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# ---- validate required ----------------------------------------------------
: "${DASHBOARD_URL:?set --url or DASHBOARD_URL}"
: "${API_KEY:?set --api-key or API_KEY}"
: "${TASK_KEY:?set --task-key or TASK_KEY}"
: "${TITLE:?set --title or TITLE}"
: "${STATUS:?set --status or STATUS}"

# ---- defaults -------------------------------------------------------------
[ -z "$HOSTNAME_OVERRIDE" ] && HOSTNAME_OVERRIDE="$(hostname)"
[ -z "$PROJECT_PATH" ] && PROJECT_PATH="$(pwd)"

# ---- JSON-escape helper (quotes, backslashes, control chars) --------------
json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
    | awk 'BEGIN{ORS=""} {gsub(/\t/,"\\t"); print} END{print ""}' \
    | tr -d '\n'
}

# Build payload. Optional fields (summary, agent) are omitted when empty so a
# heartbeat report never overwrites previously-stored values with blanks — the
# server preserves the prior value when a field is absent.
PAYLOAD="{"
PAYLOAD="${PAYLOAD}\"hostname\":\"$(json_escape "$HOSTNAME_OVERRIDE")\","
PAYLOAD="${PAYLOAD}\"project_path\":\"$(json_escape "$PROJECT_PATH")\","
PAYLOAD="${PAYLOAD}\"task_key\":\"$(json_escape "$TASK_KEY")\","
PAYLOAD="${PAYLOAD}\"title\":\"$(json_escape "$TITLE")\","
PAYLOAD="${PAYLOAD}\"status\":\"$(json_escape "$STATUS")\","
PAYLOAD="${PAYLOAD}\"progress\":${PROGRESS}"
[ -n "$SUMMARY" ] && PAYLOAD="${PAYLOAD},\"summary\":\"$(json_escape "$SUMMARY")\""
[ -n "$AGENT" ] && PAYLOAD="${PAYLOAD},\"agent\":\"$(json_escape "$AGENT")\""
PAYLOAD="${PAYLOAD}}"

# ---- send -----------------------------------------------------------------
HTTP_CODE=$(curl -sS -o /tmp/adk_report_resp.$$ -w '%{http_code}' \
  -X POST "${DASHBOARD_URL%/}/api/v1/reports" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data "$PAYLOAD") || {
    echo "report.sh: request failed" >&2
    rm -f /tmp/adk_report_resp.$$
    exit 1
  }

BODY=$(cat /tmp/adk_report_resp.$$ 2>/dev/null || true)
rm -f /tmp/adk_report_resp.$$

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "report.sh: ok ($HTTP_CODE) task=$TASK_KEY status=$STATUS progress=$PROGRESS%"
  exit 0
fi

echo "report.sh: server returned $HTTP_CODE: $BODY" >&2
exit 1
