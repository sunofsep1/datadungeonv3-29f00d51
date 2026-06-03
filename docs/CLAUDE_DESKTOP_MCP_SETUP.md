# Claude Desktop + DataDungeon MCP Setup

This provides a starter local MCP server for DataDungeon at:

- `mcp/datadungeon-mcp`

## What it supports (starter tools)

- `search_contacts`
- `get_contact`
- `update_contact` (safe fields only)
- `create_task`
- `log_touch`
- `enroll_workflow`

## 1) Install and run locally

From repo root:

```bash
cd mcp/datadungeon-mcp
npm install
npm run build
```

For local development:

```bash
npm run dev
```

## 2) Required environment variables

Use a secure environment source (never commit secrets):

- `DATADUNGEON_SUPABASE_URL`
- `DATADUNGEON_SUPABASE_SERVICE_ROLE_KEY`
- `DATADUNGEON_ALLOWED_USER_IDS` (optional CSV allowlist for user UUIDs)

Example:

```bash
export DATADUNGEON_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export DATADUNGEON_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export DATADUNGEON_ALLOWED_USER_IDS="uuid-1,uuid-2"
```

## 3) Claude Desktop config (stdio MCP)

Add a server entry in your Claude Desktop MCP configuration pointing to:

- command: `node`
- args: `["/absolute/path/to/datadungeon-1/mcp/datadungeon-mcp/dist/index.js"]`
- env: include the variables above

If you prefer dev mode, point to `tsx` + `src/index.ts`.

## 4) Security notes

- This starter uses the Supabase service-role key, so treat runtime host as privileged.
- Keep `DATADUNGEON_ALLOWED_USER_IDS` set in production-like use.
- Keep destructive operations out of this first version (no delete tools included).
- Add audit logging before broader rollout.

## 5) Recommended next additions

- Add `list_due_tasks` and `get_contact_timeline` read tools.
- Add explicit confirmation wrappers for high-impact writes.
- Add a dedicated `tool_audit_logs` table and write one log row per tool call.
- Move to OAuth/JWT-backed per-user auth when exposing beyond local stdio.

