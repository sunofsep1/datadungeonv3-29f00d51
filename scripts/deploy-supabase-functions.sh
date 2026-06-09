#!/usr/bin/env bash
# Deploy all Edge Functions except _shared (not a deployable function).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

shopt -s nullglob
for fn_dir in supabase/functions/*/; do
  name="$(basename "$fn_dir")"
  if [[ "$name" == _* ]]; then
    continue
  fi
  if [[ ! -f "${fn_dir}index.ts" ]]; then
    echo "Skipping ${name} (no index.ts)"
    continue
  fi
  echo "Deploying function: ${name}"
  npx supabase functions deploy "$name" --use-api
done

echo ""
echo "All edge functions deployed."
