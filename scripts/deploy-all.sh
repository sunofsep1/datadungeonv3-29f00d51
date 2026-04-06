#!/usr/bin/env bash
# Deploy database migrations + all Edge Functions to the linked Supabase project.
# Requires: `npx supabase login`, linked project (`npm run supabase:link` or supabase link).
# Frontend (Vite) is not deployed here — use Lovable Publish, Vercel, Netlify, etc.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run verify
npx supabase db push --linked --yes
npx supabase functions deploy --use-api

echo ""
echo "Supabase deploy finished (migrations + functions)."
echo "Frontend: publish via your host (e.g. Lovable → Share → Publish, or CI to Vercel/Netlify with npm run build → dist)."
