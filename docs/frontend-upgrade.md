# Frontend upgrade (IA & daily hub)

Living notes for the navigation and “daily work” emphasis. Update as phases land.

**Deploy / backend smoke tests:** [crm-deploy-verify-checklist.md](./crm-deploy-verify-checklist.md). **Local regression gate:** `npm run verify` (build + Vitest).

**Roadmap vs shipped:** [upgrade-status.md](./upgrade-status.md). **Full product brief:** [frontend-upgrade-recommendations.md](./frontend-upgrade-recommendations.md).

## Route map (current)

| Path | Purpose |
|------|---------|
| `/dashboard` | Home — **Command center** strip (priority tiles, smart list chips, pulse) + draggable widgets |
| `/attention-hub` | Daily Hub |
| `/contacts` | Contacts; `?smart=` presets (see `src/lib/contactSmartLists.ts`) |
| `/listings` | Listings sales board (`/listings-sales` redirects here) |
| `/pricing` | **Pricing intelligence** hub — active listings → open detail pricing panel (TAM, brackets) |
| `/tasks` | Tasks |
| `/automations` | CRM workflows hub (`CrmWorkflowEngineCard` + links to Settings / Tasks) |
| `/data-health` | Data health score and deep links |
| `/annual-reviews` | Reviews & events |
| `/scripts` | Scripts library |
| `/work` | Focus session from Attention Hub (task / todo / appointment / contact reminder); completes with same rules as hub |
| `/settings` | Settings; listing-stage automation; link out to Automations for workflows |
| `/settings#settings-notifications` | Scrolls to Notifications card (in-app rules + digest email) |

**Shell:** `MainLayout` uses `SidebarNavigation` (not `AppSidebar`) for the primary nav. Header titles: `HeaderBar` `MODULE_TITLES` / `getModuleTitle`.

## Phase checklist

- [x] Phase 1 + MVP slice: new routes (`/automations`, `/data-health`), listings at `/listings`, smart list query on contacts, sidebar IA, prefetch entries, notifications as right sheet in header.
- [x] Home **Command center** (`DashboardCommandCenter`): priority tiles (hot leads, overdue tasks, stale, no next touch, listings, data health), smart list chips, **touch scorecard** (`TouchScorecard`: today + week cells vs targets from `get_daily_touch_summary` / `get_weekly_touch_summary`, log-touch CTA, breakdown + unread). Uses `contactLastTouch` for stale counts aligned with `last_touch_date`.
- [x] **Log touch** (global): header handshake icon → `LogTouchDialog` (`useLogTouch` → `touches` table); `openLogTouch()` / `openLogTouch({ contactId })` from contact detail. Contact header **Scripts** → `/scripts`.
- [x] **Contact workspace rail** (`ContactWorkspaceRail`): playbook badges, **lead score** (`contact_scores` total + hot/warm/cold band + collapsible breakdown), last/next touch + days since, quick actions (log touch, **Scripts** sheet `ContactScriptQuickSheet` with playbook-ranked picks + filter + copy, tasks w/ open count). **Home** command center **Recent alerts** list (latest 6, tap → mark read + `action_url`).
- [x] **Contact detail timeline-first**: main column order is overview → **activity timeline** → **ContactSuiteCard** (correspondence / files) → nurture, address, properties, story, etc.; right column is **sticky** workspace rail + lead classification only.
- [x] **Scripts from lists**: Contacts table/grid row actions include **Scripts** (opens `ContactScriptQuickSheet` without leaving the list). **Tasks** → contact tasks rows include a **Scripts** icon for that contact.
- [x] **Automations**: `WorkflowDirectoryCard` on `/automations` — table of all `crm_workflows` (trigger, object, active, enrollment count, last run); **click row** to focus. **`WorkflowInspectorCard`** — tabs for **Steps** (read-only summary + **per-step delay** edits + **form Add step** for wait/notify/task/noop), **Enrollments**, and **Step log** (`crm_workflow_step_runs` / `process-workflows`). **Shared workflow focus** with directory, inspector dropdown, and `CrmWorkflowEngineCard` enroll (first active workflow auto-selected when list loads).
- [x] **Work session** (`/work`): from Focus Box **Work now**, timeline **Work**, and appointment **Prep now**; `useContactScore` + Supabase `contact_scores` typings.
- [x] Daily Hub: `PageHeader`, intro copy, `DailyHubQuickLinks` grid (`src/components/dashboard/DailyHubQuickLinks.tsx`) above `AttentionHubWidget`.
- [x] Notifications: `src/lib/notificationRules.ts` documents in-app sources; Settings card `#settings-notifications` lists them and explains digest vs bell; header sheet (grouped **Today / Yesterday / Earlier**, kind icons, relative time) + empty state + footer link to settings hash.
- [x] Data health: gap breakdown bars (`pctComplete` per check) + smart-list deep links (Top 100, hot/warm, past client, no next touch, stale).
- [x] Global search: **Quick navigation** grid (Daily Hub, Home, Tasks, Contacts, Listings, Hot leads, Automations, Data health, Scripts, Settings); same block when search has no record matches.
- [x] **Listings + pricing (Phase 3 slice):** listing detail places **Pricing intelligence** next to **`ListingPipelineNextCard`** — current stage, copy on `listing_stage_change` / `process-workflows`, links to Automations and Settings.
- [x] **Annual reviews depth (Phase 5 slice):** `/annual-reviews` **Planner snapshot** (counts per status) + **January board** (chips by scheduled date for the selected year) + **Scheduled in the next 30 days** (contact links + dates) above the review list.
- [x] **Daily Hub touch scorecard:** `/attention-hub` embeds the same **Touch scorecard** as Home (today / week targets, log touch, unread link).
- [x] **Pricing workspace (Phase 3):** `/pricing` lists active listings with links into listing detail pricing; sidebar **Pricing** + global search + Daily Hub quick link.
- [x] **Contacts workspace polish (Phase 2):** top-bar-first layout with no persistent desktop filter rail; quick **Refine** row (source/property/last touched), right-side Filters sheet for deep fields, stronger full-width list table surface, and mobile two-row controls with horizontal-scroll fade hints.
- [x] **Automations operator polish (Phase 4):** workflow directory search + status chips, sticky table headers, persisted selected workflow + inspector tab, richer inspector meta badges, and step quick actions (branch target jumps + duplicate with confirmation).
- [x] **Pricing triage polish (Phase 3):** `/pricing` adds KPI strip, search/filter/sort controls, model-ready/recommended cues, **Needs attention** quick toggle, and clickable backlog badge in list header.
- [x] **Classification on create:** `useCreateContact` always sends `contact_category` (default `warm_lead`); `applyClassificationDefaultsForNewContact` backfills empty category after insert.
- [x] **Automations trigger catalog:** `/automations` documents `crm_workflows.trigger_type` values (manual, listing stage, score, etc.).
- [x] **Integrations index:** Settings → Integrations includes **Edge functions index** (deploy list + checklist pointer).
- [x] **Notifications polish (Phase 1 slice):** header bell loads more items, **Today / Yesterday / Earlier** groups, **kind icons**, body + relative time; Home **Recent alerts** matches icon + timestamp treatment (`src/lib/notificationPresentation.ts`).
