# DataDungeon — Real Estate CRM

Real estate CRM with **Dashboard**, **Contacts**, **Listings & Deals**, **Pipeline**, **Calendar**, **Marketing**, **Performance**, and **Settings**.

- **Live app**: [https://datadungeonv3.lovable.app](https://datadungeonv3.lovable.app)
- **Stack**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS, **Supabase** (Postgres + Auth)

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
| `npm run health` | Check Supabase connection & contact count |
| `npm run export:contacts` | Export contacts to CSV (requires service-role key) |
| `npm run db:push` | Apply migrations (Supabase CLI) |
| `npm run db:migrate` | Run `supabase migration up` |
| `npm run build:safe` | Build using `vite.config.cjs` (use if TS config hits EPERM) |

If `npm run build` fails with `EPERM` writing config cache, use `npm run build:safe`. Dev already uses `vite.config.cjs`.

---

## 2. Environment variables

Local and **production** (Lovable) use the **same Supabase project** so they share the same database and data.

### Setup

1. Copy the example file:
   ```sh
   cp .env.example .env
   ```
2. Get values from **Supabase Dashboard** → your project → **Settings** → **API**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project ref** (optional) → `VITE_SUPABASE_PROJECT_ID`
3. Use the **same** URL and anon key as in your Lovable project settings so local and live use the same DB.

### Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | No | Project reference |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service-role key (export script only; **never** commit) |

Never commit `.env` or `.env.local`. They are gitignored.

### Google Calendar (Edge Function)

The app calls the **google-calendar** Edge Function using `VITE_SUPABASE_URL`, so it uses the same project as your `.env`. If you deploy the Edge Function to Supabase:

1. In **Supabase Dashboard** → **Edge Functions** → **google-calendar** → **Secrets**, set **`REDIRECT_BASE_URL`** to your app URL (e.g. `http://localhost:8080` for local, or your Lovable/production URL). This is where users are sent after connecting Google Calendar.
2. In **Google Cloud Console** (OAuth client), add the callback URL: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/google-calendar?action=callback`.

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

1. **Same DB**: Use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` as in Lovable.
2. **Same user**: Log in with the **same** email/password locally and at [datadungeonv3.lovable.app](https://datadungeonv3.lovable.app).
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

### Lovable (current)

1. Open the [Lovable project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID).
2. **Share** → **Publish**.
3. Set **env vars** in Lovable (same `VITE_SUPABASE_*` as local).
4. Lovable builds and deploys the frontend; the app uses the same Supabase project as local.

### Manual deploy (Vercel / Netlify / etc.)

1. Connect the repo to your provider.
2. **Build command**: `npm run build`
3. **Output**: `dist`
4. **Env**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (same as production Supabase project).

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
  pages/           Contacts, ContactDetail, Dashboard, …
  components/      contacts/CSVImportDialog, layout, ui, …
supabase/
  migrations/      versioned SQL migrations
scripts/
  health.ts        Supabase connectivity check
  export-contacts  Backup contacts to CSV (service-role)
```

---

## 10. Lovable workflow

- **Edit in Lovable**: [Lovable project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) → changes sync to the repo.
- **Edit locally**: Push to the connected repo → Lovable stays in sync.
- **Custom domain**: Lovable → Project → Settings → Domains. [Docs](https://docs.lovable.dev/features/custom-domain#custom-domain).

---

## 11. Pushing to the repo

To push `main` to the `sunofsep1/datadungeonv3-29f00d51` repo (remote name: `latest`):

```sh
git push latest main
```

You need write access: use credentials for the account that owns the repo (e.g. SSH key or Personal Access Token for **sunofsep1**), or have **gregleigh** added as a collaborator. If you get "Permission denied", see the plan in `.cursor/plans/` for options.
