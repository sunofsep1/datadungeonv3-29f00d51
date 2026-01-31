# Zoho-Inspired UI / UX Improvements
**Design & Implementation Document**

## Purpose
Improve layout, navigation structure, and overall UX feel of the app by adopting proven Zoho CRM patterns — **without changing brand colours** or introducing an editable dashboard.

This document is intended to:
- Guide incremental UI improvements
- Keep UX decisions consistent across modules
- Act as a reference for Cursor-assisted implementation

---

## Design Principles

- **Structure over decoration**  
  Focus on layout, hierarchy, spacing, and consistency — not visual flair.
- **Predictable navigation**  
  Users should always know *where they are* and *how to get back*.
- **Reusable patterns**  
  Build once, reuse everywhere (lists, filters, toolbars, cards).
- **No layout shift**  
  UI should feel stable while data loads.
- **Desktop-first, mobile-safe**  
  Desktop patterns first; mobile via sheets/drawers, not separate logic.

---

## Non-Goals

- ❌ No colour palette changes
- ❌ No drag-and-drop or editable dashboards
- ❌ No major data model refactors
- ❌ No redesign of business logic

---

## Navigation & Site Structure

### Sidebar Grouping
- **Home**: Dashboard  
- **Client Management**: Contacts, Properties, Appointments  
- **Business**: Marketing, Performance  
- **Tools**: Scripts, Settings  

Use collapsible sidebar sections to keep navigation compact and scalable.

---

## Breadcrumbs & Page Context

Use breadcrumbs on all detail and nested pages so users always understand context.

**Examples**
- Dashboard / Contacts / John Smith  
- Dashboard / Properties / 12 Smith Street  
- Dashboard / Listings / Bay View Townhome  

---

## List Pages (Contacts, Listings, Appointments)

### Layout
Sidebar | Filter Panel | Content Area (Toolbar, Table, Pagination)

### Filter Panel
- Collapsible on desktop
- Drawer on mobile
- Group filters into:
  - Quick Filters
  - Filter by Fields

### List Toolbar
- View name + total records
- Primary Create button
- Actions dropdown (Export, Import)
- Records-per-page selector (25 / 50)

---

## Dashboard

- Fixed grid (no drag-and-drop)
- Consistent card component
- Skeleton loaders per widget
- Clear empty states with icon + one line of copy

---

## Global Search (⌘K)

Expand global search to include:
- Contacts
- Properties
- Listings
- Optional: Activities

Show result type badge and subtitle (email, address, etc.).

---

## Detail Pages

Structure:
1. Breadcrumbs
2. Title row (name + status)
3. Tabs (Overview, Activity, Related)

Use the same Card component inside all tabs.

---

## Performance & UX Polish

- Skeletons for all async content
- Fixed header/sidebar heights
- Pagination defaults to 25 records
- Avoid layout shift during load

---

## Implementation Order

1. Breadcrumbs + shared UI components
2. List filter panel + toolbar (Contacts first)
3. Dashboard skeletons & empty states
4. Sidebar grouping & global search expansion

---

## Success Criteria

- Clear navigation context everywhere
- Structured, scalable list views
- Stable, professional dashboard feel
- UX improvements without visual rebrand
