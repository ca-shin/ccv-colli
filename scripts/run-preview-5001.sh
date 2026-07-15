#!/bin/sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export PORT="${PORT:-5001}"
export EXPO_PUBLIC_DOMAIN="${EXPO_PUBLIC_DOMAIN:-localhost:5001}"
export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "Missing SUPABASE_URL in local env." >&2
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_KEY:-}" ]; then
  echo "Missing SUPABASE_SERVICE_KEY in local env." >&2
  exit 1
fi

npm run build
NODE_ENV=production node server_dist/index.js
