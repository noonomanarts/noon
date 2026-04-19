#!/bin/bash
#
# Calls the Noon cron tick endpoint with the configured CRON_SECRET.
#
# Usage:
#   tick.sh tick      # minute-granular run (birthday greetings skipped)
#   tick.sh birthday  # daily run (birthdays included)
#
# The script fails soft so a transient app outage never cascades into the
# cron container entering a crash loop.

set -u

MODE="${1:-tick}"
APP_URL="${APP_URL:-http://app:3000}"
SECRET="${CRON_SECRET:-}"

if [[ -z "$SECRET" ]]; then
  echo "[cron] CRON_SECRET is not set — refusing to call tick endpoint" >&2
  exit 0
fi

case "$MODE" in
  tick)
    URL="${APP_URL%/}/api/cron/tick?birthday=false"
    ;;
  birthday)
    URL="${APP_URL%/}/api/cron/tick"
    ;;
  *)
    echo "[cron] unknown mode: $MODE" >&2
    exit 0
    ;;
esac

TS=$(date -Is)
HTTP_CODE=$(
  curl --silent --show-error --max-time 120 \
    --output /tmp/cron-tick-body \
    --write-out '%{http_code}' \
    --request POST \
    --header "x-cron-secret: ${SECRET}" \
    "$URL"
) || HTTP_CODE="000"

BODY=$(head -c 2000 /tmp/cron-tick-body 2>/dev/null || echo '')
echo "[cron] ${TS} mode=${MODE} status=${HTTP_CODE} body=${BODY}"

exit 0
