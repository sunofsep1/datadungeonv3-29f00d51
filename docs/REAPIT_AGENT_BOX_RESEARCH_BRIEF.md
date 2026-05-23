# Reapit Agent Box — Research Brief for DataDungeon v3

**Repo:** github.com/sunofsep1/datadungeonv3-29f00d51  
**Source studied:** app.sales.reapit.com.au (Queensland Sotheby's International Realty tenant)  
**Date:** 18 May 2026  
**Purpose:** Capture how a mature real-estate CRM (Reapit Sales / formerly Agent Box) is architected so Cursor can incrementally bring the best of those patterns into DataDungeon — while keeping DataDungeon's modern, AI-first UX.

---

## 1\. Executive summary

Reapit is a 20+ year old real-estate CRM built around three core entities — **Properties (Listings)**, **Contacts**, and **Agents/Staff** — and a workflow layer that ties them together through **Requirements**, **Inspections (OFIs)**, **Offers/Contracts**, **Marketing Funds**, **Portal Exports**, and **Activity Schedules**.

It is data-rich but UI-dated (iframe-based, lots of modals). DataDungeon already has a more modern shell (smart lists, command center, Claude integration, vision board, daily hub). The opportunity is to import Reapit's **data model \+ workflow primitives** without importing its UX baggage.

---

## 2\. Reapit's top-level structure

Global nav: **Properties · Contacts · Reports · Prospector** plus quick icons for **Search · Quick-add (+) · Tasks · My Office · Settings · Profile**.

Per-tenant header (e.g. "Queensland Sotheby's International Realty") supports multi-office.

Dashboard widgets:

- **Current Pipeline** funnel: Open Appraisals → Presentations → Listed (Pending) → Available → Conditional → Unconditional, with Count, Value, GCI per stage.  
- **Targets** (Day / Week / Month / FY / CY).  
- **Reminders** (week strip).  
- **Notifications** (Overdue / Today / Upcoming).  
- **Announcements** (product news feed).

DataDungeon mapping: your existing Command Center \+ Smart Lists \+ Daily Hub already cover most of this; the **Pipeline funnel with $ Value \+ GCI per stage** is the one missing widget that real-estate agents will look for.

---

## 3\. The Property / Listing entity

### 3.1 Listing record shape

A listing has a unique ID (e.g. `1P5675`) and the following tabbed sections:

**Overview tab**

- Hero image, address, status badge (colour-coded: Available green, Conditional orange, Unconditional red, etc.).  
- Property type / category (Residential | House).  
- Bedrooms / bathrooms / car icons with counts.  
- Land size, Office.  
- Headline \+ truncated description with "more".  
- Upcoming inspections summary.  
- Map (Mapbox/OpenStreetMap).  
- Agents block.  
- Contacts block (linked vendors/buyers).  
- First Created / Last Modified timestamps.

**General tab**

- Status (Available / Conditional / Unconditional / Off Market / Hidden / etc.).  
- For Sale/Lease.  
- Office (multi-office tenants).  
- Type (Residential / Commercial / etc.) and Category (House / Apartment / Acreage / Block of Units / Land / etc.).  
- Flags: New Property/Development · Off Market Listing · Hidden Listing.  
- Sale Method (Private Treaty / Auction / Tender / EOI).  
- Listed as Auction toggle.  
- Authority (Exclusive / Open / Conjunctional / Sole / Multi).  
- Full address (Level No, Unit No, Street No, Street Name, Street Type, Suburb (with postcode), State).  
- Address Display mode (Full / Street Only / Suburb Only) \+ Hide Address in Portal Exports.  
- Editable display format string.  
- Google Map: Re-Position Marker, Hide Street View, Hide "What's Around".  
- Key to Property toggle.  
- Access Details / Internal Info (private).  
- **Export to Portals** multi-select (see §3.7).  
- Action buttons: Clone This Listing, Vendor Preview Link, Forms Live, Auto Responder, plus social share (Twitter/X, Facebook, LinkedIn, QR code).

**For Sale tab**

- Status, Listing Date, Agency Expiry, Expected On Market.  
- Search Price (internal, e.g. $1,850,000) vs Display Price (public, e.g. "Offers Above $2m") — **critical distinction**.  
- Quote Price, Search Range (price-range filter for portals).  
- GST status.  
- Outgoings: Water Rates, Council Rates, Other Outgoings, Total Outgoings, Land Tax, Strata Admin Fund, Strata Sinking Fund (each with per-quarter / per-year selector).  
- Investment Details: Investment flag, Lease Potential ($/pw), Return %, Tenanted flag.

**Features tab**

- "Select Copy" preset switcher (Website & Enews vs other channels).  
- Main Headline (≤150 chars).  
- Property Description (≤6000 chars).  
- Counts: Bedrooms, Lounge Rooms, Studies, Garages, Car Spaces, Bathrooms, Toilets, Pools, Carports, Total Parking (auto-calculated).  
- Sizes: Land Size, External Area Size, Home Size, Frontage (all with unit selector).  
- Property attributes: Construction, Aspect, EER, Property Built (year), Property Condition, Last Renovated.  
- Legal: Legal Description, Lot, Volume, Block, Deposited Plan (DP), Folio, Section, Zoning.  
- **Features checklist** — \~80 standard tags (3 Phase Power, Air Conditioning, Alarm System, Area Views, Balcony, Beach Front, Broadband Internet, Built-In Wardrobes, Bush Retreat, Car Parking \- Basement/Surface, Carpeted, City Views, Close to Schools/Shops/Transport, Lift Installed, Loading Dock, Ocean Views, Open Fire Place, Openable Windows, … etc.). Stored as boolean flags keyed by ID.

**OFI tab (Open For Inspection)**

- Open Type (As Advertised / By Appointment).  
- Open Date \+ From time \+ duration (minutes).  
- Add Open Time button.  
- Upcoming Inspection Times list.  
- **Self Check-In QR Code** — Print brochure \+ Download QR image.  
- **Past Inspections** table: Day, Date, Month, Year, Start, Finish, Attendees count, "Add Attendee" action.

**Agents & Contacts tab**

- Assign Agents with Role (Appraisal Agent / Listing Agent / Conjunctional Agent / etc.), Selected Agents list, "Appear on Site" subset.  
- Assign Contacts with Role (Vendor / Solicitor / Tenant / Property Manager / Body Corp / etc.).

**Resources tab** (sub-tabs: Property Photos | Floorplans | Documents | Links | Appraisal Info)

- Drag-to-reorder image gallery with Main Photo slot.  
- Photo upload: 8MB max, min 1920×1280.  
- Floorplans, Documents (PDF/contracts), external Links, Appraisal Info notes.

**Offers/Contracts tab** (sub-tabs: Offers | Contracts | All)

- Ref \# (becomes trust-account ledger ref).  
- Offer Date, Offer Price.  
- Buyer (link to Contact), Buyer Solicitor.  
- Investor flag, Inclusions, Special Conditions.  
- "Letters" mail-merge button.

**Commission tab**

- Agreed Gross Commission %, shown as IncGST and ExGST dollar values from List Price.  
- Commission splits unlocked when status moves to Exchanged/Under Contract.

### 3.2 Listing sidebar panels (left rail)

| Panel | What it does |
| :---- | :---- |
| **Communications History** | Notes/SMS/Email log for this listing, public vs private notes. |
| **Listing Details** | At-a-glance: Appraisal Date, Appraisal Price, Listing Date, Agency Expiry, On Market Date, **Days On Market**, Commission %. |
| **Prospective Buyers (N)** | All contacts who have engaged (Inspection / Enquiry) with count. Filter dropdown. "Contacts/Follow Up" \+ "Activity Report" buttons. |
| **Inspections (N) & Attendees (N)** | Each OFI as a row with date/time/attendee count. "Add By Appointment", "All Viewers", "Activity Report". |
| **Activity Schedules** | Applied automation templates (drip sequences of tasks). |
| **Property Modifications Log** | Full audit trail: "OFI Added 16-May 10:00", "Export to Portals Added X", "Listing Search Price 1900000 ⇒ 1850000", "Reorder Listing Photo", with timestamp \+ user. |
| **Comparative Market Analysis** | One-click links to similar listings \+ recent sales on Realestate.com.au, Domain.com.au, RPData. |

### 3.3 Listing toolbar (the small icons that punch above their weight)

1. Preview Listing — public preview.  
2. Send an Email — mail-merge composer with listing context.  
3. Send an SMS.  
4. Print Summary — print-friendly card.  
5. Send an E-Newsletter — bulk to buyer pool.  
6. Print Letter Mail Merge — Word merge.  
7. Log an Enquiry — creates contact \+ enquiry against listing.  
8. **Match Buyers to this Property** — Contacts whose Requirements match. Each row: Email / SMS / Call / Edit \+ Do-Not-Contact flag.  
9. Add Feedback by Appointment — post-inspection feedback.  
10. Add a Note.  
11. Add a Meeting — calendar entry.  
12. Tasks — task list for listing.  
13. Create a Letter — from template.  
14. Create Media — signboard / brochure workflow.  
15. **Listing Hits** — chart of Monthly Property Hits (portal traffic).  
16. **Portal Feed Logs** — per-portal log with Export Date, Processed Date, Portal Property ID, Portal Message (e.g. "update display price within 10% of search price").  
17. **Marketing Funds** — sub-tabs Marketing Funds | Campaign/Expenses. Vendor-paid marketing budget ledger with line items, supplier, four-way payment split (Office/Agent/Vendor), running balance.  
18. Slide in Full View Panel.

### 3.4 Listing list view

- Sidebar filters: Available / Inspections / Off Market; Address; For (Sale/Lease); Type; Features icons; Price From-To; Order by; Saved Search.  
- Quick links: All My Properties → (Listings / Prospect Properties / Appraisal Properties), Add a Listing, Add a Project/Development, Add an Appraisal/Prospect Property.  
- Result rows: photo, address, status pill, bed/bath/car, land size, display price, expiry, ID, agents, primary contact.

### 3.5 Pipeline / lifecycle states

Sale pipeline: **Open Appraisals → Presentations → Listed (Pending) → Available → Conditional → Unconditional**. Each stage tracks Count, Value, GCI.

Property buckets: Appraisal Property · Prospect Property · Listing · Off Market / Hidden.

### 3.6 Audit trail

Every change logged with what / when / by whom. Shown inline on the listing.

### 3.7 Portal exports (syndication)

\~25 portals: Realestate.com.au, Homely, RateMyAgent, Homepass, Queenslandsothebysrealty.com, Horseproperty, OnTheHouse, Domain.com.au, Gavl, WilliamsMedia, AdBuild, Farmproperty, ActivePipe, Domain Commercial, Homesales, RealEstate Kokomo, Farmbuy/GoRegional, Realty.com.au, View.com.au, Inspect Real Estate, Listingloop, Developmentready, The Community Leader.

---

## 4\. The Contact entity

### 4.1 Contact record shape (5 tabs)

**Overview** — Name, Salutation, Active status; **Contact Classes** multi-select tags (freeform — Owner Occupier, Prospective Buyer, Vendor, Database, Current Buyers, Online Enquiries (Buyers), agent-named segments like "Jan \- Raby Bay", "Malcolm's Acreage Buyers", "Tyson Clarke"); contact methods (Email, Mobile, Home, Work, Web, Fax); Subscriptions (Newsletters, Property Updates, Auction Reminders, Christmas Cards, OFI Times); Additional Contact Details (extra emails/phones); Related Contacts (household); Requirements preview.

**Contact Card** — Status (Active/Archived/Do Not Contact/Unsubscribed); Type (Person/Company); **Do Not Contact Via** granular per-channel flags (Phone / SMS / Email / Mail); Title, Salutation, First, Last, Email, Company, Job Title, Legal Name, Address To with Custom Letter Head; Phones; Australian address \+ Postal Address override; Add as Property button; Contact Method preference; Anniv Date; Add Other Date; Financial Information; Contact Class multi-select.

**Requirements (N)** — N saved buyer briefs. Each: created/modified, Type, Action (Buy/Rent), Category, Suburb, Price range, Bed+/Bath+ minimums.

**Related Contacts (N)** — partner / family / agent / solicitor / accountant.

**Related Properties (N)** — split into Available Properties and Prospect Properties, each with Role context (Vendor / Owner Occupier / Prospective Buyer / Tenant / Solicitor).

### 4.2 Contact sidebar panels

History (filterable; includes auto-detected "Conflicting contact details detected" dedup events and "Market Report Generated" campaign events) · Activity Schedules · Prospective Buyer/Tenant Activity (N) · Contact Modifications.

### 4.3 Advanced Contact Search

- Contact Search: name, phones, email, company, address, suburb, custom filters, client ref, Subscriptions (include/exclude).  
- Group Search: Type, Status multi.  
- Contact Classes: Include / Exclude with "match ALL vs ANY".  
- Requirements Search: Sale/Rental, Type, Category, State, Region(s), Suburb(s), Price range, Bedrooms/Bathrooms/Parking ranges, Land Size range, Building Size range, Features multi-select, **Limit Search: exclude contacts missing criteria searched**.  
- Assigned Staff by Office/Team/Member, Access Level.  
- Property Related flag.  
- Contact Source (Auto Email, Doorknocking, Email Enquiry, Import, …).  
- Date filters: Created From/To, Modified From/To, Last Contact From/To, Other Date Type \+ From/To.  
- Save Search.

---

## 5\. The Requirements / Matching engine

- Requirement \= saved buyer brief on a Contact (many per contact).  
- Shape: Sale or Rental · Type · Category · State · Region(s) · Suburb(s) · Price range · Bedrooms+ · Bathrooms+ · Parking+ · Land size range · Building size range · Features multi-select.  
- Two-way:  
  - From a Listing → "Match Buyers to this Property" returns Contacts whose Requirements satisfy the listing.  
  - From a Contact → matching listings appear in Requirements tab and Related Properties.  
- Drives: targeted Email/SMS blasts; new-listing e-newsletter alerts; door-knock targeting; "we have a buyer for your home" letters.

---

## 6\. Marketing Funds module

- **Marketing Funds**: Date, Comments, Funds Approved, Funds Received, Add Payment.  
- **Campaign / Expenses**: Date, Category (Digital Media, Signage, Printing, Office Essentials, …), Supplier \+ invoice no., Item / Comment, Supplier Status (Paid/Pending), Cost, Office Paid, Agent Paid, Vendor Paid (four-way split).  
- Running totals \+ Balance of Funds Received (red overspend indicator).  
- Buttons: Add New Expense, Add Package, Print, Generate Invoice, Print Marketing Plan.

---

## 7\. Inspections (OFI) workflow

- Schedule per listing (type, date, time, duration).  
- QR code self-check-in (print brochure \+ download image).  
- Attendees recorded per OFI; auto-become Prospective Buyers on the listing.  
- Attendee count rolls up to listing dashboard.  
- Past inspections table.  
- "Add Feedback by Appointment" for post-inspection capture.

---

## 8\. Offers / Contracts workflow

- Ref \# generated (trust-account ledger ref).  
- Offer Date, Offer Price, Buyer link, Buyer Solicitor, Investor flag, Inclusions, Special Conditions.  
- Sub-tabs Offers | Contracts | All for progression.  
- Letters mail-merge for accept/reject/counter.  
- Status transitions unlock Commission splits.

---

## 9\. Reports module

**Agent Reports:** Agent Net Commission, Appraisal Accuracy, Appraisal, Appraisal (For Lease), Auction Clearance, Database Usage, Gross Commission Leaderboard, Licence Expiry, List to Sell Clearance, Pipeline Monitor, Staff Members, Target Report.

**Contact Reports:** Appraisal / Listing Contacts, Bulk Actions, Contact Anniversary, Contact Class Statistics, Contact Created, Contact Source, Contact Suburb Breakdown, Contact Unsubscribed, CSV Downloaded, Prospect Property Contacts.

**For Sale Reports:** Agency Expiry, All Current Listings, Auction Status, Auctions Booked, Contract Conditions Due, Days On Market, Detailed Listings, Detailed Sales Analysis, Gross/Net Commission, No. of Listings, No. of Sales, Offers and Contracts, Sales By Region, Sales Summary, Staged Commissions Payments, Upcoming Settlements, Upcoming Unconditional Sales.

(For Lease, General, Performance, Stocklist categories also exist.)

---

## 10\. Activity Schedules / Automations

- Reusable templated sequences of follow-up tasks (e.g. New Vendor Onboarding: Day 1 welcome call → Day 3 photoshoot → Day 7 OFI set → Day 14 vendor report).  
- Applied to a Listing or Contact and instantiated as concrete dated tasks/notes/emails.  
- Status visible on the entity's sidebar.

---

## 11\. Compliance & data integrity patterns

- **Conflicting contact details detected** — dedup fingerprint engine creates a History entry when contacts overlap on phone/email/address.  
- **Property Modifications Log** — immutable audit per entity.  
- **Do Not Contact Via** granular per-channel flags rather than a single DNC.  
- **Hide Address in Portal Exports** \+ Address Display modes for silent sale.  
- AML/CTF readiness signals KYC is becoming first-class.

---

## 12\. Where DataDungeon already wins

- Modern dark UI vs Reapit iframe chrome.  
- Smart Lists / Command Center (Hot leads, Overdue, Stale, No next touch, Birthdays, Review pool, Data health) — Reapit has no equivalent dashboard-level smart-list grid.  
- Vision Board.  
- Claude Command Center with strict confirm mode — AI-first action layer.  
- Affirmations.  
- Daily Hub concept.  
- Top-bar pinned working sets (Nurture / Recent / Tasks).  
- Automations / Scripts / AI Ops as first-class nav items.

Keep this character. Don't import Reapit's modal-heavy UX; import its data model and verbs.

---

## 13\. Gap analysis — priority order

### P0 — Foundational data model

1. **Property/Listing** entity with the §3.1 tab structure, flattened to a single scrollable detail page with anchor tabs.  
2. **Contact** entity with §4.1's 5 tabs and §4.2's sidebar panels.  
3. **Requirement** entity (child of Contact) per §5. Unlocks two-way matching.  
4. **Listing ↔ Contact link table** with Role enum (Vendor, Buyer Solicitor, Prospective Buyer, Tenant, Body Corp, …).  
5. **Audit log table** — one row per mutation per entity, surfaced as Modifications panel.  
6. **Pipeline stages** enum on Listing with $ Value \+ GCI rollups.

### P1 — Killer features

7. **Buyer Matching engine** — given a Listing return Contacts whose Requirements satisfy it (and reverse). SQL view or function.  
8. **OFI module** — schedule, QR self-check-in, attendee log, attendee → Prospective Buyer auto-link.  
9. **Display Price vs Search Price \+ Search Range** distinction.  
10. **Property Modifications Log** UI.  
11. **Communications History** unified timeline (Email/SMS/Note/Mail Merge/Inspection/Enquiry) per Contact and per Listing.  
12. **Activity Schedule templates** — define sequence of dated tasks, apply to entity.

### P2 — Workflow depth

13. Offers / Contracts sub-module with status progression unlocking Commission splits.  
14. Commission calc IncGST / ExGST \+ split table.  
15. Marketing Funds \+ Campaign Expenses ledger per Listing.  
16. Portal Exports — model the table even before syndicating (portal\_id, listing\_id, status, last\_pushed\_at, error\_message).  
17. Listing Hits log \+ chart.  
18. Match-buyers letter / email / SMS mail-merge from a Listing's contact pool.

### P3 — Reporting

19. Reports list in §9 \= saved SQL queries against the model. UI after P0/P1.  
20. Highest agent-value first: Pipeline Monitor, Days On Market, Agency Expiry, Upcoming Settlements.

### P4 — Compliance & polish

21. Do Not Contact Via per-channel flags.  
22. Conflict detection on contact create/edit.  
23. Hide Address in Portal Exports \+ Address Display modes.  
24. AML/KYC fields on Vendor/Buyer roles.

---

## 14\. Schema sketch (Postgres flavour)

\-- core

properties (

  id, ref\_code, status, type, category,

  address\_full, address\_display\_mode, hide\_address\_portal,

  sale\_method, authority,

  listing\_date, agency\_expiry, on\_market\_date,

  search\_price, display\_price, quote\_price, gst\_status,

  water\_rates, council\_rates, land\_tax, strata\_admin, strata\_sinking,

  investment\_flag, lease\_potential, return\_pct, tenanted,

  bedrooms, bathrooms, lounge\_rooms, studies, garages, carports, car\_spaces,

  pools, toilets, total\_parking,

  land\_size\_sqm, home\_size\_sqm, frontage\_m,

  construction, aspect, eer, property\_built, property\_condition, last\_renovated,

  legal\_description, lot, dp, volume, folio, block, section, zoning,

  headline, description, main\_photo\_id,

  office\_id, created\_at, updated\_at

)

property\_features (property\_id, feature\_id)   \-- many-to-many with \~80 std features

property\_photos   (id, property\_id, url, sort\_order, kind /\* photo|floorplan|doc \*/)

property\_portals  (property\_id, portal\_id, enabled, last\_pushed\_at, last\_status, last\_message)

property\_hits     (property\_id, source, occurred\_at)

contacts (

  id, type /\* person|company \*/, status,

  first\_name, last\_name, salutation, title, legal\_name, address\_to, custom\_letter\_head,

  company, job\_title,

  email, mobile, home\_phone, work\_phone, fax, website,

  address, suburb, postcode, state, country,

  postal\_address\_override,

  contact\_method, anniv\_date,

  dnc\_phone, dnc\_sms, dnc\_email, dnc\_mail,

  created\_at, updated\_at

)

contact\_extra\_methods (id, contact\_id, kind /\* email|phone \*/, value, label)

contact\_classes       (id, name)

contact\_class\_links   (contact\_id, class\_id)

contact\_subscriptions (contact\_id, sub\_kind /\* newsletters|property\_updates|auctions|christmas|ofi\_times \*/)

contact\_relations     (contact\_id, related\_id, relation\_label)

requirements (

  id, contact\_id, sale\_rental, type, category,

  state, suburbs jsonb, regions jsonb,

  price\_min, price\_max,

  beds\_min, baths\_min, parking\_min,

  land\_min\_sqm, land\_max\_sqm, building\_min\_sqm, building\_max\_sqm,

  features\_required jsonb,

  created\_at, updated\_at

)

property\_contact\_links (property\_id, contact\_id, role /\* vendor|prospective\_buyer|tenant|solicitor|body\_corp|owner\_occupier|... \*/)

\-- workflow

inspections        (id, property\_id, kind /\* advertised|by\_appointment \*/, starts\_at, ends\_at)

inspection\_attendees (inspection\_id, contact\_id, checked\_in\_at)

offers             (id, property\_id, ref\_code, offer\_date, offer\_price, buyer\_contact\_id, buyer\_solicitor\_id, investor, inclusions, special\_conditions, status)

contracts          (id, offer\_id, exchange\_date, settlement\_date, status)

commissions        (id, property\_id, gross\_pct, gross\_incgst, gross\_exgst)

commission\_splits  (commission\_id, agent\_id, pct, amount)

marketing\_funds    (id, property\_id, date, comments, approved\_amount, received\_amount)

campaign\_expenses  (id, property\_id, date, category, supplier, item\_comment, supplier\_status, cost, office\_paid, agent\_paid, vendor\_paid)

\-- automation & audit

activity\_schedules        (id, name, applies\_to /\* listing|contact \*/)

activity\_schedule\_steps   (schedule\_id, offset\_days, task\_type, template\_body)

activity\_schedule\_instances (id, schedule\_id, entity\_type, entity\_id, applied\_at)

communications     (id, entity\_type, entity\_id, kind /\* note|email|sms|letter|enquiry \*/, body, sender\_id, occurred\_at, public)

audit\_log          (id, entity\_type, entity\_id, field, old\_value, new\_value, changed\_by, changed\_at)

---

## 15\. Suggested first three Cursor work-orders

**WO-1: Listings detail page**  
Build a Listing detail view at `/listings/[id]` using the §3.1 tab layout but as a single scroll with sticky anchor nav. Pull fields from the schema in §14. Add an Audit panel and Communications panel on the right rail. Use existing DataDungeon design tokens.

**WO-2: Requirements \+ Match Buyers**  
Add Requirements as a child of Contact. Build the match function: given a listing, return contacts whose at-least-one Requirement satisfies (suburb in list, price range overlap, bed/bath/parking min met, required features all present). Surface as "Match Buyers" button on the listing page that opens a slide-over with Email / SMS / Call quick actions per row.

**WO-3: OFI module**  
Schedule inspections per listing, generate a QR check-in URL, attendees join the listing's Prospective Buyer pool automatically, attendee count surfaces on the listing card and on the dashboard pipeline.

After these three, evaluate whether to push into Marketing Funds, Portal Exports modelling, or Offers/Contracts next.

---

## Implementation log (DataDungeon)

| Date | Item | Status |
|------|------|--------|
| 2026-05-23 | Brief saved to `docs/REAPIT_AGENT_BOX_RESEARCH_BRIEF.md` | Done |
| 2026-05-23 | WO-1–3 core (listing detail, match buyers, OFI) | In repo (prior) |
| 2026-05-23 | **Activity Schedules** (P1) — templates, apply to listing/contact, sidebar panel | `20260523160000_activity_schedules.sql` — run `npm run db:push` |
| 2026-05-23 | **Reports pack** (P3) — `/reports` with Pipeline (count/value/GCI), DOM, Agency expiry, Settlements + KPI strip | Done |
| 2026-05-23 | **P1/P4 polish** — unified comms rail, log enquiry, contact duplicate hints, ~80 feature checklist | Done |
| 2026-05-23 | **Activity schedule builder** — Settings create/edit/duplicate templates and steps | `ActivityScheduleBuilderCard` |
| 2026-05-23 | **Match buyers letters** — bulk print mail-merge from Match buyers sheet | `/listings/match-buyers/letters/print` |
| 2026-05-23 | **Reports** — Current listings + Offers & contracts tabs | `/reports?tab=current` · `?tab=offers` |
| 2026-05-23 | **Listing General panel** — authority, outgoings, investment, legal, access | `20260523180000_listing_general_panel.sql` — run `npm run db:push` |  
