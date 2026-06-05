# DataDungeon Settings — Upgrade Blueprint

**Research base:** HubSpot CRM, AgentBox (Reapit Sales), VaultRE (MRI Vault), ReNet  
**Codebase:** React 19 + Vite + Tailwind v4 + shadcn/ui + Supabase, single-user RLS  
**Prepared:** June 2026

---

## 1. What Competitors Do Well (and What We Can Learn)

### HubSpot
- **Left sidebar navigation** — collapsible, always visible, no hunting through a long scroll
- **Context-aware routing** — clicking Settings from inside a tool takes you to *that tool's* settings page; "Back to all settings" to return
- **Settings search** — type anything, jump directly to that setting
- **Clean section grouping**: Your Preferences / Account Setup / Users & Teams / Integrations / Data Management / Notifications / Privacy & Consent — distinct concerns, distinct pages
- **Role-gated sections** — only super admins see billing, team management, etc.

### AgentBox (Reapit Sales) — Australian RE CRM
- **Role gate is explicit** — "Master Users only" label shown before you even enter System Config
- **Functional grouping by workflow area**: Bulk Communication, System Config General, System Config Advanced, Colour Config, Listing Activity Report, Integrations (TradeMe, CoreLogic/RP Data), Watermarking, Marketing Packages
- **Tabs not accordion** — each config area opens in its own pane, not a long scroll
- **Separate office-level vs user-level settings** — My Settings vs System Config is a clear split

### VaultRE (MRI Vault) — Australian RE CRM
- **Personal settings are tabbed**: My Settings / My Password / My Signature / My Alert Subscriptions
- **Admin settings are separate**: User Management, Account Details, Super User Access, Database Config
- **Database access config** — open vs closed database — shows that even "simple" single-user CRMs grow into multi-user territory
- **Digital signature in settings** — real estate specific; agents sign documents digitally

### ReNet
- Tasks & Trails, vendor reporting, bulk SMS — all configured in dedicated sections, not buried in a general settings blob
- Touchpoints Manager puts workflow-type config (templates, sequences) in a separate area from account settings

---

## 2. DataDungeon Current State — Audit

**Location:** `src/pages/Settings.tsx` → single route at `/settings`

### What exists
| Card | Content |
|---|---|
| Profile | Email (disabled), Display Name |
| Experience | Game Mode toggle, Drako audio toggle |
| Appearance | Theme selector (50+ themes), Density, Font size |
| Business Defaults | Commission rate |
| SMS Signature | Textarea + save button |
| Integrations | Google Calendar, Email, Webhook URL, CSV Import, CRM Integrations card, Operations Edge Index, SMS, Apple Messages |
| Listing Stage Automation | `<ListingStageAutomationCard />` |
| Activity Schedule Builder | `<ActivityScheduleBuilderCard />` |
| CRM Workflows | Link to /automations |
| Notifications | Digest toggle + frequency, appointment reminders |

### Problems
1. **Single long scroll** — no navigation; finding notifications means scrolling past 9 other cards
2. **No URL-addressable sub-pages** — only `#settings-notifications` hash anchor; can't deep-link to "Appearance"
3. **Mixed concerns** — user-level preferences (theme, digest) live next to system-level config (listing stage automation, webhook URL) on the same card list
4. **Integrations card is a wall of text** — Google Calendar, Email, SMS, Apple Messages for Business, webhooks, CSV import, CRM integrations, Operations Edge all crammed into one card
5. **No save confirmation on profile** — Display Name input has no save button
6. **No 2FA, no password management** — security is absent
7. **No data export/import section** — CSV import is buried in Integrations
8. **Game Mode is mixed with experience settings** — should be its own section
9. **No agent profile** — no phone, photo, license number, agency branding fields
10. **Not extensible** — adding a new settings section means appending another card to the bottom of an already-long list

---

## 3. Blueprint: Upgraded Settings Architecture

### 3.1 Route Structure

```
/settings                          → redirect to /settings/account
/settings/account                  → My Account (profile, password, 2FA, agent details)
/settings/appearance               → Appearance (theme, density, font size)
/settings/experience               → Experience (game mode, Drako, future options)
/settings/business                 → Business Defaults (commission rate, defaults)
/settings/notifications            → Notifications (digest, reminders, in-app)
/settings/communications           → Communications (SMS signature, email, templates)
/settings/integrations             → Integrations (Google Calendar, webhooks, Pricefinder)
/settings/automations              → Automations (listing stages, activity schedule, workflows)
/settings/data                     → Data Management (import, export, data health)
/settings/security                 → Security (password, 2FA) — optional, or part of account
```

### 3.2 Shell Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                    [search settings...] │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  My Account      │  ← active section content renders here      │
│  Appearance      │                                              │
│  Experience      │  Each section is its own React component,    │
│  Business        │  lazy-loaded, with its own save logic.       │
│  Notifications   │                                              │
│  Communications  │                                              │
│  Integrations    │                                              │
│  Automations     │                                              │
│  Data            │                                              │
│  Security        │                                              │
│                  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

The left nav mirrors the pattern in HubSpot and VaultRE. On mobile it collapses to a top tab strip.

### 3.3 Section Definitions

---

#### My Account
*Equivalent to VaultRE "My Settings" / HubSpot "Your Preferences"*

| Field | Type | Note |
|---|---|---|
| Email | Text (read-only) | From Supabase auth |
| Display Name | Text + Save | Currently unsaved |
| Phone | Text + Save | New — needed for RE agent ID |
| Agency / Office | Text + Save | New — used in SMS signature, reports |
| License Number | Text + Save | New — Queensland real estate agent ID |
| Profile Photo | Image upload | New — used in email/SMS templates |
| Default Calendar View | Select (Day / Week / Month) | New |

---

#### Appearance
*Currently in Settings.tsx, extract to own route*

| Field | Type | Note |
|---|---|---|
| Theme | Select (grouped: Light / Midday / Dark / Retro) | Move retro themes to their own group |
| Density | Select (Comfortable / Compact) | Existing |
| Font Size | Select (Standard / Large) | Existing |
| Sidebar | Select (Auto-collapse / Pinned) | New |

**Retro theme group** — add Win98, Mac Classic, Winamp as a "Retro" group in the theme dropdown, sitting above Light Themes. These are the fun ones; give them a special label.

---

#### Experience
*Extract from Settings.tsx*

| Field | Type | Note |
|---|---|---|
| Game Mode | Toggle | Existing |
| Drako Voice | Toggle | Existing, disabled when Game Mode off |
| (Future) Keyboard shortcuts | Toggle | Placeholder |
| (Future) Experimental features | Toggle list | Feature flags |

---

#### Business Defaults
*Expand the current "Business defaults" card*

| Field | Type | Note |
|---|---|---|
| Default Commission Rate (%) | Number input | Existing |
| Default Contact Follow-up Days | Number input | New — days before contact goes stale |
| Default Appointment Duration | Select (30 / 45 / 60 / 90 min) | New |
| Currency | Select (AUD, NZD) | New — for future multi-currency |
| Date Format | Select (DD/MM/YYYY, MM/DD/YYYY) | New |
| Default Pipeline Stage | Select | New |

---

#### Notifications
*Extract to own route, currently `#settings-notifications` hash*

Sub-tabs: **In-App** | **Email** | **SMS** | **Mobile**

| Setting | Type | Note |
|---|---|---|
| Daily digest email | Toggle + Frequency select | Existing |
| Appointment reminders | Toggle | Existing |
| Contact follow-up due alerts | Toggle | New — when contact hits urgency threshold |
| Hot lead alerts | Toggle | New |
| Listing stage change alerts | Toggle | New |
| Workflow completion alerts | Toggle | New |
| In-app bell categories | Per-source toggles | Existing via `IN_APP_NOTIFICATION_SOURCES` |

---

#### Communications
*Split out of the massive Integrations card*

| Section | Content |
|---|---|
| SMS Signature | Existing textarea + save |
| Email Signature | New — HTML-capable signature for email sends |
| SMS Templates | Link to /communications/sms (existing) |
| Email "From" name | New — display name shown in outbound emails |
| Communication preferences | Opt-out handling notes |

---

#### Integrations
*Currently a wall of text — split into clean cards per integration*

**Each integration gets its own card with: logo, status badge (Connected / Not connected), description, and action button.**

| Integration | Status display | Action |
|---|---|---|
| Google Calendar | Connected / Not connected | Connect / Disconnect |
| Pricefinder / RP Data | API key status | Configure |
| Inbound Lead Webhook | URL display + copy button | Regenerate |
| Resend (Email) | API key status | Configure |
| Mobile Message (SMS) | Key status | Configure |
| Apple Messages for Business | Step-by-step guide | Expand |

Remove the wall of instructional text — move it to a collapsible "How to set up" accordion within each integration card, and link to the relevant docs file.

---

#### Automations
*Currently: ListingStageAutomationCard + ActivityScheduleBuilderCard + CRM Workflows link — all in main Settings*

Keep these as sub-cards within the Automations settings section. Add:

| Section | Content |
|---|---|
| Listing Stage Automation | Existing `<ListingStageAutomationCard />` |
| Activity Schedule Builder | Existing `<ActivityScheduleBuilderCard />` |
| CRM Workflows | Link button to /automations |
| Sequence Runner | Status / last run time |
| Nightly Lead Score Recompute | Status / last run time |

---

#### Data Management
*Mostly missing — pull CSV import out of Integrations, add export*

| Section | Content |
|---|---|
| Import Contacts (CSV) | Existing `<LeadCsvImportBlock />` — move here |
| Export Contacts | New — download CSV of all contacts |
| Export Properties | New |
| Export Listings | New |
| Data Health | Link button to /data-health (existing page) |
| Feature Flags | Developer toggle — show current flag states |

---

#### Security
*Currently absent*

| Field | Type | Note |
|---|---|---|
| Change Password | Form | Supabase `updateUser` |
| Two-Factor Authentication | Enable/disable | Supabase TOTP |
| Active Sessions | List | New — show logged-in devices |
| Sign out all other sessions | Button | New |

---

## 4. Implementation Plan (Phased)

### Phase 1 — Structure (no new features, just reorganisation)

**Effort: 1–2 days**

1. Create `src/components/settings/SettingsLayout.tsx` — the shell with left sidebar nav + `<Outlet />`
2. Add sub-routes to `App.tsx` under `/settings/*`
3. Extract existing cards into their own components:
   - `AccountSettings.tsx` (profile card)
   - `AppearanceSettings.tsx` (theme/density/font)
   - `ExperienceSettings.tsx` (game mode)
   - `BusinessSettings.tsx` (commission rate)
   - `NotificationsSettings.tsx` (digest + reminders)
   - `CommunicationsSettings.tsx` (SMS signature)
   - `IntegrationsSettings.tsx` (all integration cards)
   - `AutomationsSettings.tsx` (stage automation + activity schedule)
   - `DataSettings.tsx` (CSV import moved here)
4. Redirect `/settings` → `/settings/account`
5. Add `<NavLink>` active state styling to the left nav items

**Files to create:**
```
src/components/settings/SettingsLayout.tsx
src/components/settings/AccountSettings.tsx
src/components/settings/AppearanceSettings.tsx
src/components/settings/ExperienceSettings.tsx
src/components/settings/BusinessSettings.tsx
src/components/settings/NotificationsSettings.tsx
src/components/settings/CommunicationsSettings.tsx
src/components/settings/IntegrationsSettings.tsx
src/components/settings/AutomationsSettings.tsx
src/components/settings/DataSettings.tsx
```

**Files to modify:**
```
src/App.tsx            — add nested routes under /settings
src/pages/Settings.tsx — replace with redirect or remove
```

---

### Phase 2 — New fields (agent profile, better integrations UX)

**Effort: 2–3 days**

1. Add profile fields (phone, agency, license number) — new columns in Supabase `user_settings` or `profiles` table
2. Add profile photo upload — Supabase Storage bucket
3. Refactor IntegrationsSettings — per-integration cards with status badges
4. Add password change form (Supabase `supabase.auth.updateUser`)
5. Fix Display Name save button (currently no save handler)
6. Add export buttons for contacts/listings (CSV download from edge function)

**DB migration needed:** `user_profiles` table with: `phone`, `agency_name`, `license_number`, `avatar_url`, `default_calendar_view`, `default_appointment_duration`

---

### Phase 3 — Polish (search, role gating, mobile)

**Effort: 2–3 days**

1. Settings search — filter nav items + highlight matching fields
2. Mobile: collapse left nav to a top tab strip or hamburger
3. 2FA (Supabase TOTP) — nice-to-have for security
4. "Retro" theme group in the theme selector (Win98, Mac Classic, Winamp)
5. Contextual settings links — e.g. clicking "Notification settings" from the header bell goes to `/settings/notifications` directly

---

## 5. Settings Left Nav — Component Spec

```tsx
// src/components/settings/SettingsLayout.tsx

const SETTINGS_NAV = [
  {
    group: "Personal",
    items: [
      { label: "My Account",      icon: User,         path: "/settings/account" },
      { label: "Appearance",      icon: Palette,      path: "/settings/appearance" },
      { label: "Experience",      icon: Gamepad2,     path: "/settings/experience" },
      { label: "Security",        icon: ShieldCheck,  path: "/settings/security" },
    ],
  },
  {
    group: "Business",
    items: [
      { label: "Business Defaults", icon: Building2,   path: "/settings/business" },
      { label: "Communications",    icon: MessageSquare, path: "/settings/communications" },
      { label: "Notifications",     icon: Bell,         path: "/settings/notifications" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Integrations",   icon: Plug,        path: "/settings/integrations" },
      { label: "Automations",    icon: Workflow,     path: "/settings/automations" },
      { label: "Data",           icon: Database,     path: "/settings/data" },
    ],
  },
];
```

---

## 6. What NOT to Replicate from Competitors

| Competitor pattern | Why we skip it |
|---|---|
| AgentBox dropdown config selector | Dropdown menus for settings are terrible UX — left nav is much clearer |
| VaultRE 4-tab personal settings | Tabs work for 4 items but don't scale — left nav scales to 20+ |
| HubSpot Settings search (Phase 1) | Overkill for our current scale, but worth adding in Phase 3 |
| HubSpot multi-account team settings | DataDungeon is single-user by design (RLS = `user_id = auth.uid()`) — skip |

---

## 7. Key Takeaways from Competitor Research

1. **Every mature CRM uses a left sidebar nav for settings** — not a single scroll page. HubSpot, VaultRE, AgentBox all do this. DataDungeon is the outlier.

2. **Personal vs System is a hard split** — My Account / My Appearance (personal) vs Integrations / Automations (system-level). Mixing them creates confusion about who should change what.

3. **Australian RE CRMs go deep on agent identity** — AgentBox and VaultRE both track license number, photo, digital signature, agency branding. DataDungeon's profile section currently only stores email.

4. **Integration cards need status** — users can't tell if Google Calendar is connected or not without clicking through. Every competitor shows a "Connected ✓" or "Not connected" status badge on the integration.

5. **Settings should be linkable** — HubSpot's context-aware settings routing (click Settings from Notifications → lands on notification settings) is a big UX win. We can get 80% of the way there just by giving each section its own URL.

---

## Sources
- [HubSpot Navigation Guide](https://knowledge.hubspot.com/help-and-resources/a-guide-to-hubspots-navigation)
- [AgentBox System Configuration Overview](https://help.agentboxcrm.com.au/system-configuration-overview)
- [VaultRE My Settings Overview](https://support.vaultre.com.au/hc/en-au/articles/360004309195-My-settings-overview)
- [VaultRE User Management Settings](https://support.vaultre.com.au/hc/en-au/articles/360004309075-Manage-the-user-management-settings)
- [MRI Vault Features](https://www.mrisoftware.com/au/products/vault/features/)
- [ReNet CRM Software](https://www.renet.com.au/renet-software)
- DataDungeon `src/pages/Settings.tsx` (live codebase)
