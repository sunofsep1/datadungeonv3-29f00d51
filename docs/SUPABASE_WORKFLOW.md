# Supabase migrations — team workflow

Use this as the **single happy path** when local and remote migration history disagree.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in: `supabase login`
- Project linked: `npm run supabase:link` or `supabase link` with your project ref (see `supabase/project-ref`)

## Day-to-day

1. **Pull remote truth** when teammates applied migrations or you switched machines:
   ```bash
   supabase db pull
   ```
   Review generated migration files; commit if they represent intentional schema capture.

2. **Apply local migrations to linked remote** (when you own the next migration):
   ```bash
   npm run db:push
   ```
   Or: `npx supabase db push --linked`

3. **Local only** (optional):
   ```bash
   npm run db:migrate
   ```

## When `db push` says history mismatch

- Read the CLI message — it often suggests `supabase migration repair` with specific version numbers.
- **Do not** blindly repair: align with whoever owns production schema, then either:
  - Repair versions to match reality, or
  - Pull missing migrations from remote / main branch.

## Types after schema change

```bash
npm run supabase:gen-types
```

Regenerates `src/integrations/supabase/types.ts` (requires network access to project).

## Deploy

- `npm run deploy:supabase` — push migrations + deploy functions (see package.json).
- `deploy:all` runs full `verify` first; fix build/tests before deploying.

## Git

- Ignore ephemeral Supabase branch metadata if your team uses branching; keep `supabase/migrations/` as the source of truth for versioned SQL.
