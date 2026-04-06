# DataDungeon CRM — Frontend Upgrade Recommendations

**Prepared for:** Greg Leigh — Sotheby's International Realty  
**Date:** 4 April 2026  
**Purpose:** Create a frontend upgrade that matches the backend architecture already being implemented in DataDungeon, so the product feels like one coordinated system rather than a new backend underneath an old UI.

---

## Executive Direction

The frontend should not be treated as a visual refresh only. Your backend plan introduces structured categories, lead scoring, workflow automation, touch tracking, notifications, annual review planning, pricing intelligence, scripts, data integrity, and integrations. The frontend therefore needs to become a workflow-first operating system for your day-to-day real estate work.

The right direction is a **premium, operational CRM interface** built around five core questions:

1. Who needs attention right now?
2. What changed since I last logged in?
3. What action should I take next?
4. Which relationships are slipping?
5. Which listings and opportunities need movement?

Instead of a generic dashboard with scattered sections, the upgraded frontend should feel like a **Daily Command Center** for a high-performing solo agent.

---

## Product Philosophy

The upgraded frontend should follow these principles:

- **Action-first, not admin-first** — every major screen should drive a next step.
- **Pipeline-aware** — contacts, listings, workflows, and reviews should all have visible state.
- **Dense but calm** — information-rich, but still premium and easy to scan.
- **Designed for daily use** — fast logging, fast navigation, saved views, keyboard-friendly workflows.
- **Real-estate-specific** — not a generic SaaS CRM clone.
- **System-aligned** — every backend module should have a matching frontend surface.

---

## Frontend Vision

I recommend that DataDungeon evolve into a frontend with the feel of an internal operating system rather than a traditional CRM menu.

### The frontend should become:
- A **Daily Hub** for immediate priorities
- A **Contact Workspace** for relationship management
- A **Pipeline Workspace** for listings and deals
- An **Automation Console** for workflow visibility
- A **Planning Layer** for annual reviews, events, and touch cadence
- A **Data Quality Layer** that keeps the database clean without extra admin effort

This structure matches the backend direction and gives every new database capability a practical user-facing home.

---

## Recommended Information Architecture

### Primary navigation

1. **Home**
2. **Contacts**
3. **Listings**
4. **Tasks**
5. **Automations**
6. **Reviews & Events**
7. **Scripts**
8. **Data Health**
9. **Settings**

### Utility navigation

- Global search
- Quick add
- Notifications
- Theme toggle
- Profile / preferences

### Why this structure works

This structure maps directly to the backend implementation roadmap:

- Contacts supports classification, scoring, touch tracking, scripts, and notifications.
- Listings supports pricing intelligence and stage-based workflow triggers.
- Automations supports the workflow engine.
- Reviews & Events supports annual reviews and community events.
- Data Health supports validation, completion, and hygiene monitoring.
- Settings supports integrations, imports, and messaging infrastructure.

---

## Core Screens to Build

## 1. Home — Daily Hub

This should become the most important page in the entire app.

### Purpose
Provide an immediate operating view of the day so you can decide what to do in under 30 seconds.

### Main sections
- **Priority strip**
  - New hot leads
  - Overdue tasks
  - Stale Top 100 contacts
  - Listings needing action
- **Today queue**
  - Calls to make
  - SMS to send
  - Touches due
  - Follow-up tasks due today
- **Touch scorecard**
  - Handwritten cards today
  - Break-bread touches this week
  - Weekly email completed?
  - Birthday recognitions due
- **Smart lists snapshot**
  - Hot Leads
  - Past Clients overdue for touch
  - Referral Partners to contact
  - Seller Nurture this week
- **Notification rail**
  - Urgent
  - Action Required
  - Informational
- **Performance pulse**
  - Contacts touched in last 7 days
  - Active listings by stage
  - Data health score
  - Workflows currently enrolled

### UX notes
- This screen must be highly scannable.
- Use compact cards and real actions, not just metrics.
- Every tile should open the exact filtered list behind it.
- The default state should answer: **what should I do first?**

---

## 2. Contacts — Smart Lists + Contact Workspace

This should become the relationship engine of the app.

### Contacts list view

The list view should not just be “all contacts.” It should default to useful saved operational views.

### Default smart lists
- Top 100
- Past Clients
- Referral Partners
- Hot Leads
- Warm Leads
- Seller Nurture
- Stale Contacts
- No Next Touch Date
- Birthdays Upcoming
- Annual Review Candidates

### Contact list columns
- Name
- Category
- Lead temperature
- Score
- Last touch
- Next touch
- Owner
- Tags
- Last activity
- Active workflows

### Contact list actions
- Log touch
- Create task
- Send SMS
- Add to workflow
- Change category
- Open script

### Contact workspace layout

#### Left column
- Contact identity card
- Category chip
- Lead temperature badge
- Score badge
- Last touch / next touch
- Communication preferences
- Key property ownership indicators

#### Main column
- Unified timeline
  - Calls
  - SMS
  - Emails
  - Notes
  - Workflow events
  - Tasks completed
  - Stage changes
- Tasks panel
- Touch history
- Notes composer
- Enrolled workflows

#### Right rail
- Recommended next action
- Relevant scripts
- Upcoming reminders
- Similar contacts / related people
- Annual review status

### UX notes
- Opening a contact should feel like opening a live workbench, not a static profile.
- Logging touches must be available everywhere in one click.
- Notes, tasks, and communication history should live in one narrative timeline.

---

## 3. Listings — Pipeline Workspace

Listings should become stage-driven operational records rather than static entries.

### Main views
- Board view by stage
- Table view
- Calendar view for upcoming milestones
- Pricing analysis tab
- Vendor communication tab

### Suggested pipeline stages
- Prospecting
- Appraisal booked
- Listing prep
- Listed
- Under offer
- Under contract
- Settled
- Lost / expired

### Listing card content
- Address
- Stage
- Vendor name
- Target price
- Recommended price
- Days on market
- Next milestone
- Assigned tasks
- Workflow status

### Listing detail workspace
- Overview
- Activity timeline
- Tasks
- Vendor communication log
- Pricing intelligence panel
- Competitor analysis
- Documents / campaign notes

### UX notes
- Stage changes should trigger confirmation patterns and show what automation will happen next.
- Pricing should be a first-class feature, not hidden as notes.
- Listing pages should drive campaigns, communication, and task execution.

---

## 4. Tasks — Execution Layer

Tasks should become a central execution surface instead of a secondary utility.

### Required views
- Today
- Overdue
- This week
- By contact
- By listing
- By workflow
- By touch type

### Task row structure
- Task title
- Linked contact or listing
- Due date
- Priority
- Source
  - Manual
  - Workflow-generated
  - Reminder-generated
- Suggested script
- Quick complete button

### UX notes
- Task completion should be extremely fast.
- The user should always know whether a task came from a workflow, a manual action, or a system reminder.
- Tasks should support inline completion, snooze, reassign, and convert to touch.

---

## 5. Automations — Workflow Console

This screen should expose the power of the new backend automation engine in a way that is understandable and safe to use.

### Main sections
- Workflow list
- Builder canvas
- Trigger configuration
- Action chain editor
- Enrollment inspector
- Run history / debug log

### Workflow list columns
- Name
- Trigger type
- Status
- Enrolled records
- Last run
- Next scheduled run
- Success / failure state

### Workflow builder blocks
- Trigger
- Delay
- If / else branch
- Send SMS
- Send email
- Create task
- Update contact
- Notify user
- Add to sequence
- Exit workflow

### UX notes
- Start with a structured form-based builder before attempting a fully visual no-code canvas.
- The UI should clearly show branch logic and delay timing.
- Each workflow should have a test mode and record preview.
- Enrollments should be inspectable from both the workflow and the contact page.

---

## 6. Reviews & Events — Planning Layer

This screen should support long-cycle relationship planning.

### Annual Review section
- January planner board
- Upcoming review schedule
- Review prep checklist
- Meeting status pipeline
- Partner coordination details

### Community Events section
- Event list
- Quarterly planning board
- Invite list by category
- RSVP dashboard
- Attendance history

### UX notes
- This should feel like a relationship strategy layer, not a generic calendar.
- Annual review preparation should be structured and checklist-driven.
- Invite targeting should be driven by contact categories and touch history.

---

## 7. Scripts — Playbook Library

This should become an operational assistant during live calls and follow-up.

### Main features
- Search by keyword
- Search by situation
- Filter by category
- Pin favourites
- Recently used scripts
- Copy to clipboard
- Insert into SMS / note / call task

### Script categories
- Listing presentation
- Objection handling
- Follow-up
- Cold call
- Price reduction
- Commission defence
- Appraisal booking
- Annual review
- Text template

### UX notes
- Scripts must be accessible from inside contacts, tasks, and listings.
- Search should prioritize situations over titles.
- The interface should support “open while on a call” behaviour with minimal clicks.

---

## 8. Data Health — Integrity Center

This is one of the most important supporting screens because the backend upgrade will be wasted if data stays incomplete.

### Main sections
- Overall health score
- Contacts missing category
- Contacts missing next touch date
- Contacts with no recent touch
- Properties missing required details
- Duplicate detection candidates
- Validation errors by module

### Recommended widgets
- Health score card
- Missing fields queue
- Recent cleanup wins
- Records blocked from automation
- Records at risk of poor follow-up

### UX notes
- Turn data quality into action lists, not just reporting.
- Every warning should link directly to a fix flow.
- Use progress indicators to make cleanup feel rewarding.

---

## 9. Settings — Admin & Integrations

This should support the infrastructure layer without making it feel too technical.

### Main sections
- Profile and preferences
- Team and permissions
- Messaging setup
- Email integration
- Calendar integration
- Webhook / form intake settings
- Import / export center
- Automation defaults
- Notification preferences

### UX notes
- Group settings by business function rather than technical source.
- Hide complexity by default, but provide a developer mode section for advanced integrations.

---

## Design System Recommendation

The frontend should visually match your brand position: premium, deliberate, high-trust, high-performance.

### Recommended visual direction
- **Tone:** premium internal tool, not flashy SaaS
- **Density:** medium-dense, optimized for daily operational use
- **Palette:** warm neutrals with one restrained accent color
- **Accent behaviour:** reserved for actions, active states, and priority signals
- **Typography:** modern sans-serif with strong legibility at smaller sizes
- **Dark mode:** included from the start

### Visual principles
- Use whitespace to organize, not decorate.
- Avoid startup-style glowing gradients and template dashboards.
- Prefer compact cards, strong hierarchy, and crisp borders.
- Make the app feel calm even when the data is busy.

### Component language
- Status badges
- Priority banners
- Inline actions
- Slide-over panels
- Smart filters
- Saved views
- Timeline cards
- Sticky detail rails
- Keyboard-friendly command patterns

---

## Recommended Component System

### Foundation components
- App shell
- Sidebar nav
- Top command bar
- Search command palette
- Notification drawer
- Filter bar
- Saved view tabs

### Data display
- CRM table
- Kanban board
- Timeline
- KPI card
- Activity feed
- Health score card
- Checklist panel
- Comparison matrix

### Record actions
- Quick add modal
- Log touch modal
- Task composer
- Script drawer
- Change stage modal
- Change category modal
- Workflow enrollment modal

### Feedback states
- Empty states
- Success states
- Inline validation
- Overdue warnings
- Blocked automation warnings
- Real-time update indicators

---

## Frontend-to-Backend Mapping

| Backend module | Frontend surface |
|---|---|
| Contact Classification Engine | Category badges, smart list presets, required create/edit forms |
| Lead Scoring | Score badge, score breakdown drawer, score movement alerts |
| Workflow Automation Engine | Workflow console, enrollment inspector, action previews |
| Touch Tracking System | Quick log modal, daily scorecard, contact touch timeline |
| Notification System | Notification center, urgent action rail, quick action buttons |
| Annual Review Engine | January planner, checklist workspace, meeting status board |
| Pricing Intelligence Module | Pricing tab, bracket table, competitor matrix, recommendation panel |
| Scripts Library | Playbook library, context drawer, workflow-linked script surfaces |
| Data Integrity Layer | Data Health page, missing field queue, validation warnings |
| API & Integration Layer | Import center, integration cards, sync logs, notification settings |

---

## Recommended Frontend Stack

This upgrade should be built with maintainability and speed in mind.

### Suggested stack
- **React + TypeScript**
- **Next.js** or **Vite + React** depending on current setup
- **TanStack Query** for server state
- **Zustand** for lightweight UI state
- **React Hook Form + Zod** for form handling and validation
- **shadcn/ui + Radix primitives** for accessible components
- **TanStack Table or AG Grid** for data-heavy list views
- **Supabase client** for realtime and auth-aware queries

### Why this stack fits
- Supports fast internal iteration
- Handles dense app state cleanly
- Works well with Supabase
- Makes complex record and workflow UI easier to scale

---

## Suggested Rollout Plan

### Phase 1 — Foundation
Build the new app shell and operating surfaces first.

**Deliver:**
- Design system
- Navigation overhaul
- Daily Hub
- New notifications drawer
- Smart list framework
- Shared table and badge components

### Phase 2 — Contact system
Upgrade the most used workflow next.

**Deliver:**
- New contacts list
- Contact workspace
- Touch logging
- Task creation
- Script drawer
- Score badge and next-action panel

### Phase 3 — Listings and pipeline
Bring listing work into the new operational model.

**Deliver:**
- Listings table
- Pipeline board
- Listing detail workspace
- Pricing intelligence surfaces
- Vendor communication flow

### Phase 4 — Automations
Expose the backend power safely.

**Deliver:**
- Workflow console
- Enrollment inspection
- Trigger setup UI
- Run history and debug views

### Phase 5 — Planning and health
Complete the strategic layer.

**Deliver:**
- Annual Review Hub
- Event planning views
- Data Health center
- Integration and import admin pages

---

## Recommended MVP Frontend Upgrade

If you want the highest ROI first, the MVP frontend upgrade should include:

1. New app shell
2. Daily Hub
3. Smart lists
4. Contact workspace
5. Quick touch logging
6. Notifications center
7. Data health warnings

This subset gives the backend changes visible value immediately.

---

## UX Patterns to Prioritize

### 1. One-click work
Every core action should be reachable in one or two clicks.

### 2. Persistent context
Use drawers and panels so you can work without losing list context.

### 3. Operational defaults
Default to the most useful views, not blank states.

### 4. Saved intelligence
Save filters, smart lists, and frequent actions.

### 5. Timeline-first records
Make the timeline the center of the record page.

### 6. Actionable notifications
Every alert should offer a next step, not just information.

### 7. Data quality enforcement
Surface missing required data before it causes follow-up failure.

---

## Suggested File / Page Structure

```text
/app
  /home
  /contacts
  /contacts/[id]
  /listings
  /listings/[id]
  /tasks
  /automations
  /automations/[id]
  /reviews
  /events
  /scripts
  /data-health
  /settings
/components
  /layout
  /tables
  /badges
  /timeline
  /filters
  /drawers
  /forms
  /notifications
  /workflows
/lib
  /supabase
  /queries
  /formatters
  /constants
```

---

## Final Recommendation

The frontend upgrade should be treated as a **product redesign around your operating system**, not a cosmetic UI pass.

The most important idea is simple: every backend upgrade you are implementing should become visible as a daily-use frontend capability. If the backend creates scores, categories, triggers, workflows, touches, review schedules, and pricing logic, the frontend must expose those as fast, useful, action-oriented surfaces.

### Next deliverable (pick one to start)

1. **Screen-by-screen wireframe spec** — locks IA, empty/loaded states, and acceptance criteria before build.
2. **Clickable HTML prototype** — validates flow and density with stakeholders on real copy and sample data.

Recommendation: do **(1)** for Home + Contacts + Tasks first (highest daily use), then prototype those three routes only.

---

## Success criteria

The upgrade is “done enough” when:

- **Daily Hub** answers “what first?” in under 30 seconds with real links into filtered lists and records.
- **Every major backend capability** named in the mapping table has a visible, actionable UI path (even if v1 is minimal).
- **Touch logging and tasks** are one or two clicks from list and record views.
- **Notifications** are digestible, deduplicated, and each item has a clear next action.
- **Data Health** turns gaps into a queue with fix flows, not static percentages alone.

---

## Risks and dependencies

- **Scope creep:** the IA is broad; MVP (shell + Daily Hub + smart lists + contact workspace + touch log + notifications + Data Health) should ship before pipeline board and full automation builder canvas.
- **Backend parity:** frontend phases should track deployed migrations and RPCs so features don’t ship “UI-only.”
- **Density vs. speed:** operational density must not regress perceived performance; heavy tables need virtualization and sane default page sizes.

---

## Document control

| Field | Value |
|--------|--------|
| Version | 1.1 |
| Status | Recommendations complete — ready for wireframe or scoped prototype |
| Owner | Product / Greg Leigh |
| Stack note | Current DataDungeon path aligns with **Vite + React + TypeScript + TanStack Query + shadcn/ui + Supabase**; no mandatory Next.js migration unless SSR or marketing needs require it. |

---

*End of brief.*

