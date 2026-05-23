# DataDungeon — Real Estate CRM

Real estate CRM with **Dashboard**, **Contacts**, **Listings & Deals**, **Pipeline**, **Calendar**, **Marketing**, **Performance**, and **Settings**.

- **Live app**: [https://tiny-brioche-b979f7.netlify.app](https://tiny-brioche-b979f7.netlify.app) (Netlify, auto-deploys from `main`)
- **Stack**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS, **Supabase** (Postgres + Auth)

### CRM documentation

- **Mid-stage report** (product surface, list-vs-detail audit, assessment): [docs/CRM_MIDSTAGE_REPORT.md](docs/CRM_MIDSTAGE_REPORT.md)
- **Operator quick reference**: [docs/CRM_QUICKSTART.md](docs/CRM_QUICKSTART.md)
- **Supabase migrations workflow**: [docs/SUPABASE_WORKFLOW.md](docs/SUPABASE_WORKFLOW.md)
- **Next-stage backlog tickets**: [docs/CRM_NEXT_TICKETS.md](docs/CRM_NEXT_TICKETS.md)

---

## 1. Local setup and running

### Requirements

- **Node.js** 18+ (recommend [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- **npm** (or pnpm / yarn)
- **Supabase CLI** (optional, for migrations): [Install](https://supabase.com/docs/guides/cli)

### Quick start

```sh
git clone <YOUR_GIT_URL>
cd datadungeon
cp .env.example .env
# Edit .env with your Supabase credentials (see below)
npm install
npm run dev
```

Open **http://localhost:8080**. Log in (or sign up) to use the app.

### Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run verify` | Production build + Vitest (default merge / deploy gate) |
| `npm run verify:lint` | ESLint only (use when tightening lint policy or clearing debt incrementally) |
| `npm run health` | Check Supabase connection, contact count, and schema (contacts, tags, contact_tags, contact_channels, properties, contact_property_links). Confirms DB connectivity and core tables. |
| `npm run export:contacts` | Export contacts to CSV (requires service-role key) |
| `npm run supabase:sync` | Sync project ref from `supabase/project-ref` to config and package.json |
| `npm run db:push` | Apply migrations (Supabase CLI) |
| `npm run db:migrate` | Run `supabase migration up` |
| `npm run build:safe` | Build using `vite.config.cjs` (use if TS config hits EPERM) |
| `npm run verify` | Production build + Vitest (`vitest run`) — same checks as GitHub Actions CI |

If `npm run build` fails with `EPERM` writing config cache, use `npm run build:safe`. Dev already uses `vite.config.cjs`.

**Quality gates:** `npm run deploy:all` runs **`verify`** (production build + Vitest), not ESLint. GitHub Actions workflow **CI** (`.github/workflows/ci.yml`) runs the same **`npm run verify`** on pushes and PRs to `main`. Keep team expectations aligned with that unless you add `verify:lint` after clearing legacy ESLint debt. See [docs/crm-deploy-verify-checklist.md](docs/crm-deploy-verify-checklist.md).

---

## 2. Environment variables

Local and **production** (Netlify) use the **same Supabase project** so they share the same database and data.

### Setup

1. Copy the example file:
   ```sh
   cp .env.example .env
   ```
2. Get values from **Supabase Dashboard** → your project → **Settings** → **API**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project ref** (optional) → `VITE_SUPABASE_PROJECT_ID`
3. Use the **same** URL and anon key as in **Netlify → Site configuration → Environment variables** so local and live use the same DB.

### Supabase project ref (single source of truth)

The project ref is defined in **`supabase/project-ref`**. To change it:

1. Edit `supabase/project-ref` (one line: your project ref, e.g. `sujyalrzbubvhpkntwja`)
2. Run `npm run supabase:sync` to update `config.toml` and `package.json`
3. Update `.env` so `VITE_SUPABASE_URL` matches (e.g. `https://sujyalrzbubvhpkntwja.supabase.co`)

This keeps CLI, config, and app in sync so Edge Functions and migrations target the same project.

### Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | No | Project reference |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service-role key (export script only; **never** commit) |

Never commit `.env` or `.env.local`. They are gitignored.

### Google Calendar (Edge Function)

### Edge Functions (deploy and configure)

**Google Calendar**

1. Deploy: `npx supabase functions deploy google-calendar` (or use Supabase Dashboard → Edge Functions).
2. In **Supabase Dashboard** → **Edge Functions** → **google-calendar** → **Secrets**, set **`REDIRECT_BASE_URL`** to your app URL (e.g. `http://localhost:8080` for local, or your production URL). This is where users are sent after connecting Google Calendar.
3. In **Google Cloud Console** (OAuth client), add the callback URL: `https://<PROJECT_REF>.supabase.co/functions/v1/google-calendar?action=callback` (use the ref from `supabase/project-ref`).
4. **Test:** Open the Calendar page or Dashboard calendar widget; use “Connect Google Calendar” and confirm redirect and event load.

**News proxy (Dashboard Top Stories & Property News)**

1. Deploy: `npm run supabase:deploy:news` or `npx supabase functions deploy news-proxy`.
2. Get a free API key at [newsapi.org](https://newsapi.org) (developer plan).
3. In **Supabase Dashboard** → **Edge Functions** → **news-proxy** → **Secrets**, add **`NEWS_API_KEY`** with your key.
4. **Test:** Open the Dashboard; the news widgets should show property/real estate headlines. Without the key, they show a placeholder and the app works normally.

---

## 3. Database, migrations, and schema

- **Provider**: Supabase (Postgres).
- **Migrations**: Stored in `supabase/migrations/`. Apply with Supabase CLI.

### Run migrations

```sh
# 1. Log in (once)
npx supabase login

# 2. Link to your remote project (once; project ref in supabase/config.toml)
npm run supabase:link
# When prompted, enter the database password from Supabase Dashboard → Project Settings → Database.

# 3. Apply migrations
npm run db:push
```

Other Supabase scripts: `npm run supabase:gen-types` regenerates TypeScript types from the linked project.

**First-time setup (Performance & Marketing):** The **Performance** page (activity tracking, goals, calls) and **Marketing** page (posts) require the `activities`, `kpi_goals`, `calls`, and `posts` tables. Run `npm run db:push` before using these features. If you see errors like "Activities table is not set up" or "Posts table is not set up", run migrations: `npm run supabase:link` (once) then `npm run db:push`. See [Run migrations](#run-migrations) above.

**Schema verification:** Run `npm run health` to confirm the six core tables exist and are queryable: `contacts`, `tags`, `contact_tags`, `contact_channels`, `properties`, `contact_property_links`. If any table is missing, run `db:push` to apply migrations.

### Saved views, date of birth, and related jobs

Apply these **before** using the matching UI features in production:

| Feature | Migration(s) | Notes |
|--------|----------------|-------|
| **Date of birth** on contacts + birthday reminder plumbing | `20260404000001_backend_automation_birthday_reminders.sql` | Adds `date_of_birth` (DATE) and reminder-friendly structures where defined in that file. |
| **Saved views** (Contacts / Tasks filters + RLS) | `20260411180000_saved_views_rls.sql` | Table `saved_views`, policies for `owner_id`. |

**Staging / production:** link the Supabase project (`npm run supabase:link`), then `npm run db:push`. If the remote already has objects from manual SQL, use `npm run supabase:repair` for the migration version Supabase reports, then push again (see [Troubleshooting](#troubleshooting)).

**Privacy:** contact **CSV export** does not include date of birth. **Print** hides DOB unless the print URL includes **`?dob=1`** (e.g. `/contacts/:id/print?dob=1`).

Longer phased backend work (classification, scoring, workflows): [docs/BACKEND_ROADMAP.md](docs/BACKEND_ROADMAP.md).

### Contacts & Properties upgrade (new migrations)

Two **additive, non-destructive** migrations extend the data model:

1. **`20260127120000_contacts_properties_upgrade.sql`**
   - Adds `first_name`, `last_name` to `contacts`.
   - Creates `tags`, `contact_tags`, `contact_channels`, `properties`, `contact_property_links`.
   - RLS, triggers, and realtime enabled for new tables.
   - No drops or data removal.

2. **`20260127120001_contacts_properties_backfill.sql`**
   - Backfills `first_name` / `last_name` from `name` (split on first space).
   - Inserts `contact_channels` rows from legacy `contacts.email` and `contacts.phone`.
   - Does **not** drop or null out `email` / `phone` on `contacts`.

**Run order:** `db:push` applies both in sequence. Back up data first (e.g. `npm run export:contacts` with service-role key) if you want a safety snapshot.

### Troubleshooting

If **Contacts** or **Properties** stay empty or show an error (“Couldn’t load contacts” / “Couldn’t load properties”):

1. Run migrations: `npm run supabase:link` then `npm run db:push`. See [Contacts & Properties upgrade](#contacts--properties-upgrade-new-migrations) above.
2. Use **Retry** on the error screen, then check the browser **Network** tab for failed Supabase requests and the **Console** for errors.

If **db:push** fails with "relation X already exists" (e.g. the remote DB already has the schema from an earlier run or Dashboard SQL), mark the failing migration as applied and push again:

```sh
# Mark the failing migration (use the timestamp from the error, e.g. 20260114004913)
npm run supabase:repair -- 20260114004913 --status applied --linked
npm run db:push
```

If another migration fails with "already exists", repeat: run `supabase:repair` for that migration's timestamp, then `db:push` again.

### Contacts schema (current)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users`, RLS |
| `name` | TEXT | NOT NULL |
| `first_name` | TEXT | Derived from `name` (backfill) |
| `last_name` | TEXT | Derived from `name` (backfill) |
| `email` | TEXT | Legacy; prefer `contact_channels` |
| `phone` | TEXT | Legacy; prefer `contact_channels` |
| `status` | TEXT | Default `'lead'`; UI: hot / warm / cold / lead |
| `source` | TEXT | |
| `notes` | TEXT | |
| `story` | TEXT | |
| `pipeline_stage` | TEXT | |
| `selling_intentions` | TEXT | |
| `current_situation_notes` | TEXT | |
| `pain_points` | TEXT | |
| `pleasure_points` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**New tables:** `tags` (user-scoped), `contact_tags` (contact–tag many-to-many), `contact_channels` (email/phone/mobile etc. per contact), `properties` (address, type, beds/baths/price), `contact_property_links` (contact–property with role e.g. owner). RLS and realtime are enabled for all.

RLS ensures users only see and modify their own data. Contact access goes through `src/hooks/useContacts.ts`, `useContact.ts`; properties through `useProperties.ts`, `useContactPropertyLinks.ts`.

---

## 4. Verify local vs production (same data)

1. **Same DB**: Use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` as on Netlify.
2. **Same user**: Log in with the **same** email/password locally and on the [live app](https://tiny-brioche-b979f7.netlify.app).
3. **Contact count**: Open **/contacts** in both environments. The counts and list should match.
4. **Health script**: Run `npm run health` to check Supabase connectivity. The script reports contact count for **anon, no auth** (0); your real count is visible in the app when logged in.

---

## 5. Persistence and data access

- **Contacts** CRUD: `useContacts` (list), `useContact` (detail), `useCreateContact`, `useUpdateContact`, `useDeleteContact` in `src/hooks/useContacts.ts` and `useContact.ts`.
- All writes go to Supabase. React Query invalidates `["contacts"]` and `["contact", id]` after create/update/delete so the UI stays in sync.
- **CSV import**: `CSVImportDialog` uses `useCreateContact`; each row is persisted. Export uses the “Export” button on the Contacts page.

---

## 6. Backup (export contacts)

- **In-app**: Contacts → **Export** → downloads a CSV of your contacts.
- **CLI**: `npm run export:contacts` writes `contacts-backup-YYYY-MM-DD.csv` in the project root. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env` (full DB access; use only locally, never commit).

---

## 7. Deployment (production)

### Frontend — Netlify (current)

Production builds from **`main`** on `sunofsep1/datadungeonv3-29f00d51` (see `netlify.toml`).

1. Push to GitHub: `git push latest main` (use SSH; see §11).
2. Netlify auto-builds (`npm run build` → `dist`). Dashboard: [Netlify project](https://app.netlify.com/projects/tiny-brioche-b979f7).
3. **Env vars** in Netlify (same as local `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and any other `VITE_*` keys you use locally.

Manual Netlify deploy (only if needed): `netlify deploy --prod` from the repo root.

### Backend — Supabase

- **Schema:** `npm run db:push`
- **Edge functions:** `npm run deploy:supabase` (or `npm run deploy:all` for verify + db + functions)

---

## 8. Test plan (manual)

Use these to confirm persistence and UI updates:

1. **Create**: Add a contact → reload → contact still there. Check on live app (same user) → appears there too.
2. **Edit**: Change a contact → reload → changes persist. Edit on detail page → list and detail both update.
3. **Delete**: Delete a contact → list updates; reload → still gone. Same on live app.
4. **CSV import**: Import a CSV → contact count increases → reload → imported contacts persist.

---

## 9. Project structure (relevant parts)

```
src/
  hooks/           useContacts, useContact, useRealtimeSubscription, …
  integrations/    supabase client & types
  pages/           Contacts, ContactDetail, Dashboard, Performance, …
  components/      contacts/CSVImportDialog, layout, ui, agent-ops/, performance/, …
supabase/
  migrations/      versioned SQL migrations
scripts/
  health.ts        Supabase connectivity check
  export-contacts  Backup contacts to CSV (service-role)
```

**Agent ops:** Daily numbers, goals, and campaign features live under **Performance** (`/performance`) and **Marketing** (`/marketing`). The route `/agent-ops/*` redirects to `/performance`. Reusable building blocks are in `src/components/agent-ops/` (e.g. NumbersKPIGrid, LogActivityForm, GoalsSection, CampaignManager).

---

## 10. Production workflow

- **Edit locally** in Cursor / VS Code → commit → push `main` → Netlify deploys automatically.
- **Custom domain**: Netlify → Site configuration → Domain management.

---

## 11. Pushing to the repo

Remote `latest` → `sunofsep1/datadungeonv3-29f00d51` (SSH recommended):

```sh
GIT_SSH_COMMAND="ssh -i ~/.ssh/github_sunofsep1 -o IdentitiesOnly=yes" git push latest main
```

Or set `latest` to `git@github.com:sunofsep1/datadungeonv3-29f00d51.git` and push normally.

You need write access: use credentials for the account that owns the repo (e.g. SSH key or Personal Access Token for **sunofsep1**), or have **gregleigh** added as a collaborator. If you get "Permission denied", see the plan in `.cursor/plans/` for options.
