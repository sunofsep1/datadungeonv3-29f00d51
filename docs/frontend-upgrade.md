# Frontend upgrade (IA & daily hub)

Living notes for the navigation and “daily work” emphasis. Update as phases land.

## Route map (current)

| Path | Purpose |
|------|---------|
| `/dashboard` | Home / overview |
| `/attention-hub` | Daily Hub |
| `/contacts` | Contacts; `?smart=` presets (see `src/lib/contactSmartLists.ts`) |
| `/listings` | Listings sales board (`/listings-sales` redirects here) |
| `/tasks` | Tasks |
| `/automations` | CRM workflows hub (`CrmWorkflowEngineCard` + links to Settings / Tasks) |
| `/data-health` | Data health score and deep links |
| `/annual-reviews` | Reviews & events |
| `/scripts` | Scripts library |
| `/settings` | Settings; listing-stage automation; link out to Automations for workflows |
| `/settings#settings-notifications` | Scrolls to Notifications card (in-app rules + digest email) |

**Shell:** `MainLayout` uses `SidebarNavigation` (not `AppSidebar`) for the primary nav. Header titles: `HeaderBar` `MODULE_TITLES` / `getModuleTitle`.

## Phase checklist

- [x] Phase 1 + MVP slice: new routes (`/automations`, `/data-health`), listings at `/listings`, smart list query on contacts, sidebar IA, prefetch entries, notifications as right sheet in header.
- [x] Daily Hub: `PageHeader`, intro copy, `DailyHubQuickLinks` grid (`src/components/dashboard/DailyHubQuickLinks.tsx`) above `AttentionHubWidget`.
- [x] Notifications: `src/lib/notificationRules.ts` documents in-app sources; Settings card `#settings-notifications` lists them and explains digest vs bell; header sheet empty state + footer link to settings hash.
- [x] Data health: gap breakdown bars (`pctComplete` per check) + smart-list deep links (Top 100, hot/warm, past client, no next touch, stale).
- [x] Global search: **Quick navigation** grid (Daily Hub, Home, Tasks, Contacts, Listings, Hot leads, Automations, Data health, Scripts, Settings); same block when search has no record matches.
