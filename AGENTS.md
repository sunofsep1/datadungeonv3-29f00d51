# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DataDungeon is a React/TypeScript Real Estate CRM. The frontend runs via Vite dev server; the backend is a hosted Supabase project (no local backend to start).

### Key commands

See `README.md` and `package.json` scripts. Summary:

- **Dev server:** `npm run dev` — starts on `http://127.0.0.1:8080`
- **Lint:** `npm run lint` — ESLint 9 with TypeScript. The codebase has ~146 pre-existing lint errors (mostly `@typescript-eslint/no-explicit-any`); this is normal.
- **Tests:** `npx vitest run` — 12 tests across 2 files (utils + useContacts hook).
- **Build:** `npm run build` (or `npm run build:safe` if `EPERM` errors occur with the default config).
- **Health check:** `npm run health` — verifies Supabase connectivity and core tables.

### Gotchas

- The Vite dev server binds to `127.0.0.1` (not `0.0.0.0`), configured in `vite.config.cjs`.
- `.env` is already populated with the Supabase URL and anon key. Do not overwrite it unless credentials change.
- Supabase Auth requires email verification for new accounts. To test authenticated flows, you need a test account whose email has been confirmed in the Supabase project, or the user must provide test login credentials.
- The `lovable-tagger` dev dependency plugin may log warnings; these are harmless.
- Both `package-lock.json` and `bun.lockb` exist; use `npm` (matching `package-lock.json`).
