# AGENTS.md

See `CLAUDE.md` for full architecture, commands, and conventions.

## Cursor Cloud specific instructions

### Service overview

This is a **React SPA** (Vite + TypeScript) connecting to a **remote Supabase** backend. There is no local database or Docker required.

| Service | Command | URL |
|---------|---------|-----|
| Dev server | `npm run dev` | `http://127.0.0.1:8080` |

### Environment setup

- `.env` must exist with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Values are in `.env.rtf` (RTF-encoded).
- The dev server binds to `127.0.0.1:8080` (not `localhost` or `0.0.0.0`).
- Both dev and production share the **same remote Supabase project** — there is no separate dev DB.

### Quality gates

- **CI gate:** `npm run verify` (= `vite build` + `vitest run`). This is what CI runs.
- **Lint:** `npm run lint` — ESLint is intentionally excluded from CI due to legacy debt; it produces warnings but is runnable.
- **Tests:** `npx vitest run` — all tests require `TZ=UTC` (set automatically via `vitest.config.ts`).

### Authentication

The app requires Supabase Auth login. Without a valid test account, you can only verify the login/signup pages render correctly. To test authenticated CRM features, you need credentials for an account on the shared Supabase project.

### Gotchas

- Supabase signup may reject certain TLDs (`.dev`, etc.) and has rate limits on auth endpoints.
- If you get `EPERM` errors during build, use `npm run build:safe` instead of `npm run build`.
- The `node_modules/.vite/deps` cache can become stale; use `npm run dev:force` (or delete `.vite/`) if you get "Outdated Optimize Dep" errors in the browser.
