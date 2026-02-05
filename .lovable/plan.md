
# DataDungeon CRM - Next Phase Development Plan

## Executive Summary

This plan outlines the next development phase for DataDungeon, focusing on completing the Zoho-inspired UI/UX improvements, fixing database schema gaps, and adding high-value features to create a more polished, professional real estate CRM.

---

## Current State Analysis

### What's Working Well
- Core CRUD for Contacts, Properties, Listings, Appointments
- Authentication with 12-character password requirement
- Global search (Cmd+K) across Contacts, Properties, Listings
- Calendar with Google Calendar integration
- Dashboard with KPI widgets, Vision Board, Affirmations
- Breadcrumbs implemented on Contact and Property detail pages
- Skeleton loaders on Dashboard and list pages
- Contact-Property linking system

### Identified Gaps

| Area | Issue |
|------|-------|
| Database | Missing address columns on `contacts` table (`address_line1`, `city`, `state`, `postcode`, etc.) - causing runtime errors |
| Navigation | Properties page not in sidebar; sidebar grouping per Zoho doc not implemented |
| UI Consistency | Filter panel only on Contacts page; other list pages lack it |
| Pipeline | Route redirects to Dashboard instead of Kanban view |
| Security | Two warnings: Function search_path mutable, Leaked password protection disabled |

---

## Phase 1: Critical Fixes (Week 1)

### 1.1 Database Schema Completion
Add missing address columns to the `contacts` table to fix runtime errors when editing contact addresses.

```text
Columns to add:
- first_name (TEXT)
- last_name (TEXT)
- address_line1 (TEXT)
- address_line2 (TEXT)
- city (TEXT)
- state (TEXT)
- postcode (TEXT)
- country (TEXT, default 'Australia')
```

### 1.2 Security Hardening
- Set `search_path` on `update_updated_at_column()` function
- Document steps for enabling "Leaked password protection" in backend settings

---

## Phase 2: Navigation & Structure (Week 2)

### 2.1 Sidebar Restructure
Implement collapsible grouping per the Zoho-inspired design doc:

```text
HOME
  - Dashboard

CLIENT MANAGEMENT
  - Contacts
  - Properties (NEW - add to nav)
  - Appointments

BUSINESS
  - Marketing
  - Performance

TOOLS (Settings dropdown)
  - Scripts
  - Settings
```

### 2.2 Pipeline Restoration
Restore the Pipeline page with Kanban board functionality instead of redirecting to Dashboard. The existing `listings` table and drag-and-drop logic can power this.

---

## Phase 3: UI Consistency & Polish (Week 3)

### 3.1 Unified Filter Panel Component
Create a reusable `FilterPanel` component and apply it to:
- Properties page (filter by type, price range, bedrooms)
- Appointments page (filter by date range, type)
- Listings page (filter by status/stage)

### 3.2 List Page Toolbar Standardisation
Add consistent toolbar to all list pages with:
- Record count display
- Primary "Add" button
- Actions dropdown (Export, Import where applicable)
- Items-per-page selector (25/50)

### 3.3 Empty States
Design consistent empty state pattern with:
- Relevant icon
- Single line description
- Primary action button

Apply to: Properties, Appointments, Pipeline, Hot Leads, Tasks

---

## Phase 4: Feature Enhancements (Week 4)

### 4.1 Activity Log Improvements
The `activity_log` table exists but isn't fully surfaced. Add:
- Activity timeline on Contact detail (already partially there)
- Global "Recent Activity" feed enhancement
- Activity types for status changes, property links, emails sent

### 4.2 Bulk Actions
Add bulk operations on Contacts page:
- Bulk delete
- Bulk status change
- Bulk tag assignment

### 4.3 Tasks Module
The Tasks page exists but may need:
- Link tasks to contacts
- Due date filtering
- Overdue task notifications on Dashboard

---

## Phase 5: Mobile & Performance (Week 5)

### 5.1 Mobile Bottom Nav Enhancement
Add Properties to the "More" menu in mobile bottom navigation.

### 5.2 Pagination & Performance
- Ensure all list pages have pagination (some already do)
- Add loading skeletons where missing
- Implement virtual scrolling for very long lists (future consideration)

---

## Technical Details

### Database Migration (Phase 1)

```sql
-- Add address columns to contacts table
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- Backfill first_name/last_name from name
UPDATE public.contacts
SET
  first_name = COALESCE(first_name, split_part(name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(trim(substring(name from position(' ' in name) + 1)), ''))
WHERE first_name IS NULL OR last_name IS NULL;
```

### Security Fix (Phase 1)

```sql
-- Set search_path on function to prevent security issues
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;
```

### New Files (Phase 2-3)
- `src/components/common/FilterPanel.tsx` - Reusable filter panel
- `src/components/common/ListToolbar.tsx` - Standardised list toolbar
- `src/components/common/EmptyState.tsx` - Consistent empty state component

### Modified Files
- `src/components/layout/AppSidebar.tsx` - Add grouping and Properties nav item
- `src/pages/Pipeline.tsx` - Restore Kanban functionality
- `src/pages/Properties.tsx` - Add FilterPanel
- `src/pages/Appointments.tsx` - Add FilterPanel

---

## Success Criteria

1. No runtime errors when creating/editing contact addresses
2. Properties accessible from sidebar navigation
3. All list pages have consistent filter + toolbar patterns
4. Pipeline shows Kanban board with drag-and-drop
5. Security scan shows no new warnings
6. Mobile navigation includes all primary modules

---

## Recommended Implementation Order

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Database migration for contact address columns | Small |
| 2 | Security function fix | Small |
| 3 | Add Properties to sidebar | Small |
| 4 | Restore Pipeline/Kanban page | Medium |
| 5 | Create reusable FilterPanel component | Medium |
| 6 | Apply FilterPanel to Properties, Appointments | Medium |
| 7 | Standardise list toolbars | Medium |
| 8 | Add empty states across app | Small |
| 9 | Bulk actions on Contacts | Medium |
| 10 | Tasks module enhancements | Medium |

---

## Next Steps

### ✅ Completed
- [x] Phase 1.1: Created `activity_log` table, added `google_event_id` to appointments
- [x] Phase 1.2: Fixed security - set `search_path` on `update_updated_at_column()` function  
- [x] Phase 2.1: Added Properties to sidebar with collapsible nav groups (Home, Client Management, Business)
- [x] Added Properties to mobile "More" menu

### 🔄 In Progress
- Phase 2.2: Restore Pipeline/Kanban page

### ⏳ Remaining
- Phase 3: UI Consistency (FilterPanel, ListToolbar, EmptyState components)
- Phase 4: Feature Enhancements (Activity Log improvements, Bulk Actions, Tasks)
- Phase 5: Mobile & Performance
