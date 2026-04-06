# Upgrade status (living snapshot)

Short answer to **“where are we vs the upgrade plan?”** Update this file when major slices ship.

**In-repo references**

- [frontend-upgrade.md](./frontend-upgrade.md) — IA, routes, Phase 1 MVP checklist.
- [frontend-upgrade-recommendations.md](./frontend-upgrade-recommendations.md) — full frontend vision, IA, design system, backend mapping, phased rollout, MVP, success criteria (v1.1 brief).
- [crm-deploy-verify-checklist.md](./crm-deploy-verify-checklist.md) — post-deploy smoke tests (migrations, Edge, cron, Scripts, workflows), not roadmap completion.

**Source specs (local only)**

- `~/Downloads/datadungeon-backend-upgrade-recommendations.md` — backend modules 1–10, priority table (copy into `docs/` when you want it version-controlled).

---

## Backend recommendations vs current stack

| # | Module | Status | Notes |
|---|--------|--------|--------|
| 1 | Contact classification + touch dates | Partial → strong | Six categories + `last_touch` / hygiene align with smart lists & data health; exact “mandatory + computed view” may differ from the briefing SQL. |
| 2 | Lead scoring | Partial | Scoring + hot threshold + notifications exist; configurable rules / nightly job may not match the briefing 1:1. |
| 3 | Workflow automation | Advanced MVP | Listing/deal triggers, `if_branch`, cron processor, optional SMS/email — core gap closed. Full trigger catalog from the briefing not yet. |
| 4 | Touch tracking | Foundation | DB direction; daily touch **scorecard** in UI still mostly future. |
| 5 | Notifications | Largely done | Table, priorities, realtime, multiple triggers, digest patterns. |
| 6 | Annual review & events | Partial → stronger | `/annual-reviews` + prep checklists + invites; **planner snapshot** (status counts) + **next 30 days** list shipped. |
| 7 | Pricing intelligence | Partial (UI) | Listing detail **Pricing intelligence** panel + TAM/brackets; not full standalone module from briefing. |
| 8 | Scripts library | Shipped (this wave) | Templates + seed RPC + `/scripts` + workflow usage path. |
| 9 | Data integrity | Partial | `get_data_health` + `/data-health` + smart links; duplicates / automation-blocked queues light or absent. |
| 10 | API & integrations | Partial | Edge runtime, webhooks/imports directionally; not full “operations hub” from briefing. |

**Concentration:** workflows, notifications, scripts, data health entry points, listing pricing + pipeline UX, review planner. **Gaps vs briefing:** standalone pricing module, full touch rules UI, canvas workflow builder, deeper community RSVP.

**Regression check:** from repo root run **`npm run verify`** (build + Vitest). Use **`npm run verify:lint`** when working toward full ESLint cleanliness.

---

## Frontend recommendations vs current UI

Phases from the frontend briefing, roughly scored.

| Phase | Intent | ~Complete | Notes |
|-------|--------|-----------|--------|
| 1 | Shell, nav, Daily Hub, notifications, smart lists | ~92% | Command center + touch scorecard + **recent alerts** (icons, relative time); **header bell** grouped Today/Yesterday/Earlier, kind icons, richer rows. |
| 2 | Contact workspace, touch log, scripts, score | ~78% | **Timeline-first contact detail**; script sheet from **Contacts** row actions + **Tasks**; rail unchanged. Deeper score editing / rules UI still future. |
| 3 | Listings as pipeline OS, pricing, stage UX | ~58% | Board + detail; **pricing panel elevated** beside **pipeline / what runs next** card (stage + listing trigger copy + Automations links). |
| 4 | Automations console | ~72% | Directory + inspector + step log; **form step builder** (append wait/notify/task/noop, edit delay per step) — not a canvas, but editable chain from UI. |
| 5 | Planning + health | ~62% | `/annual-reviews` **planner snapshot** + **30-day schedule**; `/data-health` MVP unchanged. |

**MVP briefing list** (shell, Daily Hub, smart lists, notifications, data health): **spine largely in place**. **Global log touch** is in; **recent polish:** timeline-first contact page, scripts from contacts/tasks rows, workflow directory on Automations.

---

## One-liner

The product is **past “new backend, old UI”** on workflows, notifications, scripts, data health entry points, and IA; **mid-flight** on the full frontend vision — **Home** command center, **listing pricing + pipeline OS hints**, **annual review planner strip**, **form workflow steps**, and **polished bell + rail** are in; deeper canvas builder, full pricing module, and richer events/RSVP remain.
