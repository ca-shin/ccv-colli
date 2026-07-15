#!/bin/sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "Missing SUPABASE_URL." >&2
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_KEY:-}" ]; then
  echo "Missing SUPABASE_SERVICE_KEY." >&2
  exit 1
fi

table="${SUPABASE_KEEPALIVE_TABLE:-sections}"

case "$table" in
  *[!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_]*|"")
    echo "Invalid SUPABASE_KEEPALIVE_TABLE." >&2
    exit 1
    ;;
esac

timeout_seconds="${SUPABASE_KEEPALIVE_TIMEOUT_SECONDS:-12}"
response_file="${TMPDIR:-/tmp}/supabase-keepalive-response.$$"
url="${SUPABASE_URL%/}/rest/v1/${table}?select=id&limit=1"

cleanup() {
  rm -f "$response_file"
}

trap cleanup EXIT INT TERM

status="$(
  curl \
    --silent \
    --show-error \
    --location \
    --connect-timeout 5 \
    --max-time "$timeout_seconds" \
    --retry 2 \
    --retry-delay 3 \
    --retry-all-errors \
    --output "$response_file" \
    --write-out "%{http_code}" \
    --header "apikey: ${SUPABASE_SERVICE_KEY}" \
    --header "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    --header "Accept: application/json" \
    "$url"
)"

case "$status" in
  2*)
    echo "Supabase keepalive OK: minimal ${table} read returned HTTP ${status}."
    ;;
  *)
    echo "Supabase keepalive failed: HTTP ${status}." >&2
    exit 1
    ;;
esac
