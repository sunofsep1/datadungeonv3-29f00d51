# Upgrade status (living snapshot)

Short answer to **“where are we vs the upgrade plan?”** Update this file when major slices ship.

**In-repo references**

- [frontend-upgrade.md](./frontend-upgrade.md) — IA, routes, Phase 1 MVP checklist.
- [frontend-upgrade-recommendations.md](./frontend-upgrade-recommendations.md) — full frontend vision, IA, design system, backend mapping, phased rollout, MVP, success criteria (v1.1 brief).
- [crm-deploy-verify-checklist.md](./crm-deploy-verify-checklist.md) — post-deploy smoke tests (migrations, Edge, cron, Scripts, workflows), not roadmap completion.

**Source specs (local only)**

- `~/Downloads/datadungeon-backend-upgrade-recommendations.md` — backend modules 1–10, priority table (copy into `docs/` when you want it version-controlled).
- `~/Downloads/datadungeon-frontend-upgrade-recommendations.md` — frontend IA, phases, MVP (v1.1 brief).

---

## Unified RAG matrix (backend ↔ frontend)

Single at-a-glance view: each row ties a **backend briefing module** to the **frontend phase / surface** that should expose it. **RAG** is product readiness, not deploy smoke tests (use [crm-deploy-verify-checklist.md](./crm-deploy-verify-checklist.md) after schema/Edge changes).

| RAG | Meaning |
|-----|---------|
| 🟢 | **Green** — shipped end-to-end for daily use; only polish / edge cases remain. |
| 🟡 | **Amber** — core path works; gaps vs the PDF briefs (depth, configurability, or UX). |
| 🔴 | **Red** — not started or blocked; depends on other rows. |

| # | Vertical | Backend (brief §) | Frontend (phase / route) | RAG | One-line gap vs brief |
|---|----------|-------------------|---------------------------|-----|------------------------|
| — | **App shell & IA** | — | Ph 1 — `MainLayout`, sidebar, `/dashboard`, search | 🟢 | IA differs slightly from PDF labels (e.g. `/work`, `/attention-hub`). |
| 1 | **Classification & hygiene** | §1 Contact classification | Ph 1–2 — smart lists, `Contacts`, `DataHealth` | 🟢 | Category default on every create + backfill; stale via smart list + `stale_contacts` view. |
| 2 | **Lead scoring** | §2 Lead scoring | Ph 2 — `HotLeads`, score on contact | 🟡 | Rules editor / nightly job tuning vs PDF optional. |
| 3 | **Workflow automation** | §3 Workflows | Ph 4 — `/automations`, `process-workflows` | 🟡 | Trigger catalog + directory/inspector operator polish shipped; visual canvas still optional. |
| 4 | **Touch tracking** | §4 Touches | Ph 1–2 — log touch, timelines | 🟢 | Scorecard on **Home + Daily Hub**; targets from RPCs. |
| 5 | **Notifications** | §5 Notifications | Ph 1 — bell, realtime, digests | 🟢 | Every alert with one-tap action; dedupe tuning. |
| 6 | **Annual reviews & events** | §6 Annual review engine | Ph 5 — `/annual-reviews` | 🟡 | **January board** shipped; deeper RSVP / event UX optional. |
| 7 | **Pricing intelligence** | §7 Pricing module | Ph 3 — `/pricing` + listing detail panel | 🟡 | Hub + detail + triage controls shipped; deeper competitor matrix/reporting optional. |
| 8 | **Scripts library** | §8 Scripts | Ph 2 + `/scripts` | 🟢 | FTS; inline script in every context the PDF lists. |
| 9 | **Data integrity** | §9 Data integrity | Ph 5 — `/data-health` | 🟢 | Duplicates, listings hygiene, automation reachability + smart list. |
| 10 | **API & integrations** | §10 Integrations | Settings, Edge (`inbound-lead`, …) | 🟡 | Webhooks + CSV + **Edge index**; full “import center” UI optional. |

### Owner sign-off checklist

Tick when you are happy this vertical is **good enough for production use** (not necessarily 100% of the PDF). Revisit after major releases.

- [ ] App shell & IA
- [ ] Classification & hygiene (§1)
- [ ] Lead scoring (§2)
- [ ] Workflow automation (§3)
- [ ] Touch tracking (§4)
- [ ] Notifications (§5)
- [ ] Annual reviews & events (§6)
- [ ] Pricing intelligence (§7)
- [ ] Scripts library (§8)
- [ ] Data integrity (§9)
- [ ] API & integrations (§10)

---

## Backend recommendations vs current stack

| # | Module | Status | Notes |
|---|--------|--------|--------|
| 1 | Contact classification + touch dates | Strong | Default `contact_category` on create + post-insert backfill; smart lists + data health aligned. |
| 2 | Lead scoring | Partial | Scoring + hot threshold + notifications exist; configurable rules / nightly job may not match the briefing 1:1. |
| 3 | Workflow automation | Advanced MVP | Listing/deal triggers, `if_branch`, cron processor, optional SMS/email — core gap closed. Full trigger catalog from the briefing not yet. |
| 4 | Touch tracking | Shipped | Touches table + **scorecard on Home and Daily Hub** + global log touch. |
| 5 | Notifications | Largely done | Table, priorities, realtime, multiple triggers, digest patterns. |
| 6 | Annual review & events | Partial → stronger | `/annual-reviews` + prep checklists + invites; **planner snapshot** (status counts) + **next 30 days** list shipped. |
| 7 | Pricing intelligence | Strong+ | Listing detail panel + `/pricing` hub with KPI strip, triage filters, and needs-attention backlog cues. |
| 8 | Scripts library | Shipped (this wave) | Templates + seed RPC + `/scripts` + workflow usage path. |
| 9 | Data integrity | Strong | `get_data_health` + hygiene cards + duplicates + automation reachability smart list. |
| 10 | API & integrations | Partial → stronger | Inbound webhook help, CSV import, **Edge function index** in Settings; broader “ops hub” optional. |

**Concentration:** workflows (directory + inspector + trigger docs), notifications, scripts, data health, **pricing hub**, review planner + January board, touch scorecard on Home + Daily Hub. **Optional polish vs PDF:** canvas workflow builder, lead-score rules UI, deeper competitor matrix / RSVP analytics.

**Regression check:** from repo root run **`npm run verify`** (build + Vitest). Use **`npm run verify:lint`** when working toward full ESLint cleanliness.

---

## Frontend recommendations vs current UI

Phases from the frontend briefing, roughly scored.

| Phase | Intent | ~Complete | Notes |
|-------|--------|-----------|--------|
| 1 | Shell, nav, Daily Hub, notifications, smart lists | ~96% | Command center; **Daily Hub touch scorecard**; bell + Home recent alerts. |
| 2 | Contact workspace, touch log, scripts, score | ~89% | Timeline-first detail + list/toolbar/filter polish; lead-score rules UI optional. |
| 3 | Listings as pipeline OS, pricing, stage UX | ~84% | Board + detail pricing + `/pricing` triage workspace + pipeline next card. |
| 4 | Automations console | ~88% | Directory/inspector persistence + search/status filters + step quick actions; canvas optional. |
| 5 | Planning + health | ~78% | Planner snapshot + **January board** + 30-day list; data health queues. |

**MVP briefing list** (shell, Daily Hub, smart lists, notifications, data health): **spine largely in place**. **Global log touch** is in; **recent polish:** contacts toolbar/filter/table ergonomics, automations operator flow (search, persistence, quick actions), and pricing triage controls with needs-attention backlog.

---

## One-liner

The **v1.1-style roadmap is effectively complete** for daily CRM use: IA, Daily Hub + touch scorecard, contacts/listings/pricing hub, automations (with trigger docs), data health queues, reviews (January board + 30-day), notifications, scripts, and integrations documentation in Settings. Remaining items are **optional depth** (visual workflow canvas, lead-score rule builder, richer pricing comps, advanced RSVP reporting).
