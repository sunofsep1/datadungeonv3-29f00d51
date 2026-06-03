# DataDungeon CRM — mid-stage report

**Artifact decision:** This file is the canonical mid-stage report. Supporting docs: [CRM_QUICKSTART.md](./CRM_QUICKSTART.md), [SUPABASE_WORKFLOW.md](./SUPABASE_WORKFLOW.md), [CRM_NEXT_TICKETS.md](./CRM_NEXT_TICKETS.md). A short pointer list was added to the repo [README.md](../README.md).

**Date / scope:** Codebase scan focused on [`src/App.tsx`](../src/App.tsx), [`src/components/layout/SidebarNavigation.tsx`](../src/components/layout/SidebarNavigation.tsx), [`src/pages/`](../src/pages/), hooks under [`src/hooks/`](../src/hooks/), and [`README.md`](../README.md).

---

## 1. Product surface (what exists today)

### Auth and shell

- Auth: login, signup, protected routes, `AuthContext`.
- Layout: sidebar, header, global search, global log-touch dialog.

### Navigation groups (sidebar)

| Group | Destinations |
|-------|----------------|
| Home | Daily Hub, Dashboard |
| Daily work | Contacts, Listings, Pricing, Tasks |
| Relationships | Nurture, To-Do lists, Properties, Calendar |
| Automation | Automations, Scripts |
| Planning | Reviews & events |
| Business | Marketing, Performance |
| Insights | Data health, Research, Hot leads, Recent |
| Communications | SMS suite |
| Settings | Settings |

### Routed areas

Lazy-loaded routes cover dashboard, attention hub, work workspace, hot leads, recent, tasks, todos, contacts (detail + print), nurture, appointments, calendar, listings (+ detail), pricing, properties (+ detail), vision cards, marketing, performance (with sub-tabs), scripts, automations, data health, research, annual reviews, SMS suite, settings. Legacy paths redirect (`/`, `/listings-sales`, `/pipeline`, `/campaigns`, `/agent-ops/*`).

**Error boundaries** wrap a subset of heavy pages (not universal).

### Data layer

Supabase + TanStack Query. Several hooks use a **“simple select first, then embed or follow-up queries”** pattern for schema / PostgREST tolerance.

---

## 2. List vs detail audit (Stage A)

| Area | List hook | Detail hook | Consistency notes |
|------|-----------|-------------|-------------------|
| **Contacts** | `useContacts` — embed or fallback | `useContact` — simple `*` then loads `contact_channels`, addresses; or full embed | **Previously risky:** simple path omitted channels; follow-up fetch added for `contact_channels`. Re-test after schema changes. |
| **Listings** | `useListings` — simple `*` or `*, contacts(...)` | `useListing` — `*` then **`*, contacts(id, name)`** or fallback `contacts` row by `contact_id` | **Aligned** with list/detail parity when `contact_id` is set (embed or manual join). |
| **Properties** | `useProperties` — simple `*` + manual link join, or embed | `useProperty` — simple `*` then **follow-up** `contact_property_links` + contacts | **Aligned** with contacts pattern; detail hydrates links after simple row. |

---

## 3. Mid-stage assessment

### Strengths

- Broad vertical slice: contacts, listings, properties, nurture, SMS, calendar/tasks, marketing/performance in one shell.
- Flexible contact model: legacy columns + `contact_channels`, tags, links, merge path.
- README documents dev setup, env, `health`, db scripts.

### Risks

- **Drift** between list and detail selects per entity when schemas evolve.
- **Lint vs CI:** `npm run verify` = build + tests; `verify:lint` = ESLint only — legacy lint debt can block if CI requires lint without a phased cleanup.
- **Supabase:** migration history mismatch between remote and local is an operational risk (see [SUPABASE_WORKFLOW.md](./SUPABASE_WORKFLOW.md)).
- **Operator knowledge:** smart lists vs `contact_category` vs urgency is easy to confuse without short copy (addressed in-app + quickstart).

### What “mid-stage” means here

Past MVP wiring; focus is **hardening, consistency, and operator clarity** — prioritize phases over big-bang refactors.

---

## 4. Engineering scripts (quality gate)

| Script | Role |
|--------|------|
| `npm run verify` | `build` + `vitest run` — default “green” bar for merges |
| `npm run verify:lint` | ESLint only — use when tightening lint policy or fixing debt incrementally |
| `npm run deploy:all` | Runs `verify` then Supabase deploy — fails if build/tests fail |

---

## 5. References

- Operator cheat sheet: [CRM_QUICKSTART.md](./CRM_QUICKSTART.md)
- DB workflow: [SUPABASE_WORKFLOW.md](./SUPABASE_WORKFLOW.md)
- Backlog: [CRM_NEXT_TICKETS.md](./CRM_NEXT_TICKETS.md)
