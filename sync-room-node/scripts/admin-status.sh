#!/usr/bin/env bash
# Quick status check against the admin API — room counts, playback, storage.
#
# Reads ADMIN_PASSKEY from .env at run time; it is never written into this
# file, so the script is safe to keep in the repo (still gitignored via
# .env itself, but this file has nothing secret in it either way).
#
# Usage:
#   ./scripts/admin-status.sh                # stats only
#   ./scripts/admin-status.sh rooms          # + full room list
#   ./scripts/admin-status.sh rooms expired  # + rooms filtered by status
#   BASE_URL=https://your-host ./scripts/admin-status.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found in $(pwd) — nothing to read the passkey from." >&2
  exit 1
fi

ADMIN_PASSKEY="$(grep -m1 '^ADMIN_PASSKEY=' .env | cut -d= -f2- | tr -d '\r\n')"

if [ -z "$ADMIN_PASSKEY" ]; then
  echo "ADMIN_PASSKEY is not set in .env — admin API is disabled (fails closed)." >&2
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:8000}"
PRETTY=$(command -v jq >/dev/null 2>&1 && echo "jq ." || echo "cat")

echo "── Stats ──"
curl -sS -H "x-admin-key: $ADMIN_PASSKEY" "$BASE_URL/api/admin/stats" | eval "$PRETTY"

if [ "${1:-}" = "rooms" ]; then
  echo
  echo "── Rooms${2:+ (status=$2)} ──"
  STATUS_PARAM="${2:+?status=$2}"
  curl -sS -H "x-admin-key: $ADMIN_PASSKEY" "$BASE_URL/api/admin/rooms$STATUS_PARAM" | eval "$PRETTY"
fi
