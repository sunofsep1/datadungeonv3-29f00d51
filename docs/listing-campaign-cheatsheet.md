# Listing detail (campaign view) — quick guide

Open any listing from **Listings** (`/listings-sales`): click a card to open **`/listings/:id`**. This page is the **campaign-style listing detail** (not the compact Kanban card alone).

---

## Sticky header (stays visible while you scroll)

| Area | What it does |
|------|----------------|
| **Back** | Returns to the listings board. |
| **Title + suburb** | Address and optional suburb chip. |
| **Primary stage badge** | One main stage (e.g. Active, Under offer, Pre-market) from **status**, **pipeline stage**, and **journey** hints. |
| **Small tags** | Extra context (e.g. temperature / journey-style tags). |
| **“Xd in …”** | Days in the current primary stage. |
| **Health pill** | **Hover** for the full explanation. Uses lead temperature and campaign signals (enquiries, inspections, time on market). “Overdue tasks” will plug in when tasks are wired. |
| **Share** | Native share if the browser supports it; otherwise **copies the page URL**. |
| **Edit** | Opens the full edit dialog (see below). |
| **Viewing** | Goes to **Calendar** for appointment workflow. |
| **Mark sold / Off-market** | Shown for **active** or **pending** listings; updates **status** immediately. |

---

## Quick actions row (under the header)

These open **placeholder dialogs** today: they describe what will connect next (phone, notes, calendar, comms, stage checklist). Use **linked contact** + **activity timeline** for real work until each action is wired.

| Button | Intent (today) |
|--------|----------------|
| **Call vendor** | Will tie to click-to-call + call logging; use contact phone from the card below for now. |
| **Log feedback** | Future form for buyer/vendor feedback after inspections. |
| **Add note** | Will sync to activity; use **Activity timeline → Add note** for now. |
| **Book inspection** | Will hook into appointments/calendar. |
| **Send vendor update** | Future email/SMS templates; use **Contact** comms until then. |
| **Change stage** | Future checklist + optional vendor notify; **pipeline moves on the board** still apply today. |

---

## Hero + specs

- **Photos**: Hero uses listing hero URL plus linked **property** gallery when present. **Multiple images** → side arrows and dots to change photo.
- **No photo**: Empty state explains adding via **Edit** or the property record.
- **Spec tiles**: Beds, baths, parking, land — values prefer the **listing**, then fall back to the **linked property**.

---

## Campaign momentum (KPI row)

Tiles summarise **campaign\_*** fields on the listing (DOM colouring, enquiries, inspections, offers, buyer matches, campaign start, etc.).

**If numbers stay at zero or “—”:** run DB migrations so these columns exist and are populated by your workflows (e.g. `supabase db push` for project migrations). Logging enquiries/inspections in-app over time fills the row.

---

## Lower sections

| Section | Use |
|---------|-----|
| **Agent** | Who’s logged in + link to **Settings** (profile). |
| **Recent activity** | Last few **activity log** rows for this listing. |
| **Details** | Price, type, status, notes, link to **property** if linked. |
| **Linked contact** | Jump to **Contact** for email/phone and comms. |
| **Activity timeline** | Full history + **Add note** for this listing. |

---

## Edit listing dialog

- **Hero photo**: **Upload** (JPEG/PNG/WebP/GIF) to storage — sets listing hero and, when possible, **appends** to the linked property gallery. You can also **paste an image URL**.
- **Address** (required), **price**, **status**, **beds/baths**, **notes**.
- **Classification & journey** (collapsible): **Lead classification** for this listing / linked contact (temperature, journey stage, etc.).

**Pipeline column** (Kanban) is still managed from the **listings board** drag-and-drop unless you add a dedicated control later.

---

## One-line checklist for operators

1. Keep **pipeline** and **status** accurate on the board and via **Edit** / quick status buttons.  
2. **Link a property** for richer specs and photo gallery.  
3. **Link a contact** for vendor comms and classification.  
4. Use **Activity timeline** for a durable audit trail.  
5. Watch **Campaign momentum** once migrations and logging are in place.

---

## Deploy note (Netlify)

After you merge, Netlify builds with `npm run build` and publishes `dist`. Ensure **environment variables** (especially `VITE_*`) match production Supabase and any third-party keys.
