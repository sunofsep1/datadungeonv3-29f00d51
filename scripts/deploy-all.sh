#!/usr/bin/env bash
# Deploy database migrations + all Edge Functions to the linked Supabase project.
# Requires: `npx supabase login`, linked project (`npm run supabase:link` or supabase link).
# Frontend (Vite) deploys via Netlify on push to main — not in this script.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run verify
npx supabase db push --linked --yes
npx supabase functions deploy --use-api

echo ""
echo "Supabase deploy finished (migrations + functions)."
echo "Frontend: push main → Netlify auto-builds (https://tiny-brioche-b979f7.netlify.app). Manual: netlify deploy --prod"
