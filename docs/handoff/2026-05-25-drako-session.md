# Handoff — 25 May 2026 (Drako + deploy)

Pick up here tomorrow. Everything below was verified end of session.

---

## Current state (all up to date)

| Area | Status |
|------|--------|
| **Git** | `main` = `origin/main`, clean tree. Latest commits: `aad3cf0` (ESLint fix), `e129785` (Drako integration) |
| **CI** | `npm run verify` passes (build + 188 tests) |
| **Supabase DB** | Migrations in sync — `npx supabase db push --linked --dry-run` → *Remote database is up to date* |
| **Supabase health** | `npm run health` — connected, 339 contacts |
| **Netlify live** | https://tiny-brioche-b979f7.netlify.app (200 OK, deploys from `main`) |
| **ESLint** | 0 errors in Drako; ~240 legacy warnings repo-wide (not in CI) |

**Do not run** `npm run supabase:repair` unless `db push` fails and prints exact version + `--status` flags.

---

## What we shipped today

### Drako companion
- Live-action MP4 loops with **canvas chroma key** (off-white matte + green for coffee clip only)
- **Stage anchor** — centre of main content, slightly right (~56% x, ~16% y below header)
- Sidebar-width aware positioning (`--dd-sidebar-width` from `MainLayout`)
- No flashcard flicker (removed walk-frame video swapping + mood crossfade spam)
- CRM hooks: Tasks, ListingDetail, ContactDetail, Contacts, AttentionHub, HotLeads, ListingsSalesBoard
- Route home via `DrakoBoot` + `drakoRouteHome.ts`

### Dashboard
- Brisbane hero clock + discreet Melbourne / Amsterdam mini clocks (`DashboardWelcomeHeader.tsx`)

### Branding (sidebar)
- Pixel wordmark restored: **Drako —** / **DataDungeon** / **CRM Mascot** (Press Start 2P, no sprite graphic)
- Hero art at `public/brand/drako-datadungeon-hero.png`

### Key paths
```
src/components/drako/          — Drako system
src/components/brand/DataDungeonBrand.tsx
src/lib/drakoVideoKey.ts       — chroma key logic
public/drako/videos/           — MP4 loops
scripts/process-drako-videos.sh
docs/handoff/                  — this file
```

---

## Deploy one-liners (copy/paste)

### Local
```sh
npm run dev
npm run verify          # CI gate — build + tests
npm run health          # Supabase connectivity
npm run lint            # warnings OK; 0 errors expected in Drako
```

### Git → frontend (Netlify auto-deploys `main`)
```sh
git status
git add -A
git commit -m "feat: …"
git push origin main
```

### Supabase
```sh
npm run supabase:link                    # one-time / re-link
npm run db:push                          # apply migrations
npm run supabase:gen-types               # after schema change
npm run deploy:supabase                  # db push + all edge functions
npm run deploy:all                       # verify + deploy:supabase
```

### Single edge functions
```sh
npm run supabase:deploy:process-workflows
npm run supabase:deploy:inbound-lead
npm run supabase:deploy:pricefinder
npm run supabase:deploy:news
npm run supabase:deploy:perplexity
npx supabase functions deploy <name>
npx supabase functions deploy <name> --no-verify-jwt
```

### Full ship (typical)
```sh
npm run verify && git add -A && git commit -m "feat: …" && git push origin main && npm run deploy:supabase
```

### Migration repair (only when `db push` tells you to)
```sh
npx supabase migration repair --linked --status applied <VERSION>
npx supabase migration list --linked
```

---

## Drako roadmap — good next steps

| Item | Notes |
|------|--------|
| Walk sprites | Add `drako-walk-1/2.webp`; update `WALK_FRAMES` in `types.ts` |
| More video clips | 4 MP4s cover 14 moods via reuse in `drakoVideos.ts` |
| `DrakoMessage` component | Speech bubble + `pickDrakoLine()` dialogue bank |
| Overdue / loading hooks | Tasks overdue, page loading states |
| Nurture + Pipeline hooks | Brief items not wired yet |
| Re-export videos | OpenArt with transparent/off-white matte reduces green flicker on coffee clip |

### Drako position tuning
Edit `getAnchorPosition()` → `case "stage"` in `src/components/drako/DrakoContext.tsx`:
- `contentW * 0.56` — horizontal (right of centre)
- `contentH * 0.16` — vertical (below header)

---

## Live URLs

- **App:** https://tiny-brioche-b979f7.netlify.app
- **Supabase project:** `sujyalrzbubvhpkntwja`
- **Local dev:** http://127.0.0.1:8080 (`npm run dev`)

---

## Quick “am I up to date?” check

```sh
git fetch origin && git status
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npm run verify
npm run health
```

All green → nothing to deploy unless you changed edge functions (`npm run deploy:supabase`).
