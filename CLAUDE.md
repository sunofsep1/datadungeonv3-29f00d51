# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

DataDungeon is a single-agent real estate CRM for the Australian market (Queensland-focused). It is not multi-tenant SaaS — all data is user-scoped via Supabase RLS (`user_id = auth.uid()`). The live app is at `https://datadungeonv3.lovable.app`, Supabase project ref `sujyalrzbubvhpkntwja`.

## Commands

```sh
# Development
npm run dev              # Vite dev server → http://127.0.0.1:8080
npm run build            # Production build → dist/
npm run build:safe       # Fallback build using vite.config.cjs (use if EPERM errors)
npm run preview          # Serve dist/ locally

# Quality gates
npm run verify           # vite build + vitest run — THE CI GATE (GitHub Actions runs this)
npm run lint             # ESLint only (NOT part of CI; legacy lint debt exists in some pages)
npm run test             # Vitest watch mode
npm run test:coverage    # Vitest with coverage

# Run a single test file
npx vitest run src/lib/contactUrgency.test.ts

# Database
npm run supabase:link         # Link CLI to project sujyalrzbubvhpkntwja
npm run db:push               # Apply migrations to remote
npm run supabase:gen-types    # Regenerate src/integrations/supabase/types.ts after schema changes
npm run supabase:repair       # Fix migration history mismatches (see docs/SUPABASE_WORKFLOW.md)
npm run health                # Check Supabase connectivity
```

**CI:** `.github/workflows/ci.yml` runs `npm ci` + `npm run verify` on push/PR to `main`. ESLint is intentionally excluded from CI due to legacy debt — do not add `verify:lint` to CI without a cleanup pass first.

**EPERM build errors:** Use `npm run build:safe` (switches to `vite.config.cjs`).

## Architecture

### App Shell & Routing

`App.tsx` wraps everything in `QueryClientProvider → ThemeProvider → TooltipProvider → BrowserRouter → AuthProvider`. All ~35 routes are **lazy-loaded** via `React.lazy` + `Suspense`. The root `/` redirects to `/attention-hub`. Auth-required routes use `ProtectedRoute → MainLayout → ErrorBoundary`.

`MainLayout` renders a collapsible sidebar (`SidebarNavigation`, 248px/80px), fixed header (`HeaderBar`), global search (`GlobalSearch`), and a global log-touch dialog (`LogTouchDialog`).

### Data Layer

All data goes through **TanStack Query** hooks in `src/hooks/`. Every hook calls Supabase directly via the typed client at `src/integrations/supabase/client.ts`. Cache keys follow `["contacts"]`, `["contact", id]` patterns; mutations call `queryClient.invalidateQueries`.

Hooks use a **"full embed with fallback"** pattern: try a rich join query first; on Supabase error codes `PGRST204` or `42703` (missing column), retry with a minimal column list. This tolerates migration drift between local and production.

### Business Logic (`src/lib/`)

~60 pure/utility modules. Key ones:
- `contactSmartLists.ts` — smart list membership classification
- `contactUrgency.ts` — urgency scoring for contact ranking
- `contactDuplicateClusters.ts` — duplicate detection and merge logic
- `leadCategoryService.ts` — lead category derivation
- `nurtureAutoEnroll.ts` — automated nurture sequence enrollment
- `listingKanban.ts`, `listingStageAutomation.ts` — listing pipeline logic
- `notificationRules.ts` — notification generation rules
- `featureFlags.ts` — localStorage-backed feature flags (toggle via `setFeatureFlag()`)
- `designTokens.ts` — Zoho-inspired color palette and layout dimensions (imported by `tailwind.config.ts`)

### Authentication

`AuthContext` uses `supabase.auth.onAuthStateChange` + `getSession()`, session persisted in `localStorage`. `ProtectedRoute` redirects unauthenticated users to `/login`.

### Design System

Zoho-inspired dark theme with primary `#00BCD4` cyan/teal. Design tokens live in `src/lib/designTokens.ts`. Supports dark/light via `ThemeContext` + `next-themes`. shadcn/ui components use Radix UI primitives with CSS variable theming.

### Edge Functions (`supabase/functions/`)

~20 Deno Edge Functions deployed to Supabase. Key ones:
- `process-workflows` — CRM workflow engine, runs via pg_cron every ~5 min
- `google-calendar` — OAuth + event sync
- `inbound-lead` — Public webhook (no JWT verify)
- `pricefinder-proxy` — Pricefinder integration (no JWT verify)
- `nightly-lead-score-recompute`, `sequence-runner`, `listing-stage-automation` — background automation

Deploy individual functions with `npm run supabase:deploy:<name>`.

## Key Files & Conventions

- **Never edit `src/integrations/supabase/types.ts` manually** — regenerate with `npm run supabase:gen-types`
- `supabase/project-ref` is the single source of truth for the project ref; run `npm run supabase:sync` if it changes
- TypeScript is `strict: false`, `noImplicitAny: false` — don't assume full type safety
- Both local and production environments hit the **same Supabase project** (no separate dev DB)
- Path alias: `@/` maps to `./src/`
- Tests use `TZ=UTC` — date-based urgency tests depend on this

## Database

~50+ tables with RLS on all user-owned tables. Core domains: contacts, properties, listings, tasks/calendar, nurture sequences, CRM workflows, performance/activities, marketing, SMS, pricing analyses, pipeline/deals, saved views, vision board.

Migration workflow: add a file to `supabase/migrations/` (timestamp-named), run `npm run db:push`. If history diverges, use `npm run supabase:repair`. See `docs/SUPABASE_WORKFLOW.md` for details.

## Environment Variables

Copy `.env.example` to `.env`. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Optional: `VITE_GOOGLE_MAPS_API_KEY` (address autocomplete). Edge Function secrets (`NEWS_API_KEY`, `REDIRECT_BASE_URL`) are set in the Supabase Dashboard, not in `.env`.

## Feature Flags

Runtime-toggleable via `setFeatureFlag('flagName', true)` from `src/lib/featureFlags.ts` (backed by `localStorage`). Current flags: `compactNurtureV2`, `compactTimelineV1`, `fastImportV1`.

## Contact DOB on Print

Date of birth is hidden by default on the print view (privacy). The print preview dialog in `ContactDetail.tsx` has an "Include date of birth" checkbox that appends `?dob=1` to the iframe URL when checked. The standalone print route at `/contacts/:id/print?dob=1` also accepts the parameter directly.
