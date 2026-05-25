# DataDungeon → Professional CRM Upgrade Brief
## Reapit Sales Deep-Dive Analysis & Implementation Plan for Cursor

**Prepared:** May 2026  
**Source research:** Reapit Sales CRM LIVE browser session (app.sales.reapit.com.au — contacts, requirements, modifications, buyer activity all directly observed), Reapit Foundations API docs, DataDungeon codebase audit  
**Agency:** Queensland Sotheby's International Realty  
**Goal:** Elevate DataDungeon from an excellent personal CRM to a professional, business-grade solution that performs on par with Reapit Sales — with a much prettier UI.

---

## 1. Executive Context

DataDungeon already has strong bones: Supabase RLS, TanStack Query, shadcn/ui, a working pipeline, offers/contracts, OFI, commission, nurture sequences, AML, and buyer requirements. The gap is not functionality breadth — it's **depth of professional mechanics** that make Reapit the industry standard. This brief documents every gap observed, prioritised by business impact.

Additionally, the user wants DataDungeon to **connect to both Reapit and AgentBox** via their APIs, enabling a two-way sync that lets DataDungeon be a beautiful UI layer on top of both systems (or operate standalone).

---

## 2. What Reapit Does Well — Deep Feature Audit

### 2.1 The Listing Card (Properties Module)

Reapit's listing card is a **tabbed detail panel** with 9 tabs and a structured left-sidebar navigation. Every tab is a discrete, focussed workflow.

#### Tab Structure (Reapit)
| Tab | Purpose | DataDungeon Status |
|-----|---------|-------------------|
| Overview | KPI summary strip, days on market, pipeline stage | ✅ Partial (header strip exists) |
| General | Listing type, authority, vendor details, negotiator | ✅ Partial (`ListingGeneralPanel`) |
| For Sale | Method (private treaty/auction/EOI), price, display price | ✅ Partial (`ListingForSalePanel`) |
| Features | Beds/baths/garage, land, building size, features | ✅ Exists (`ListingFeaturesPanel`) |
| OFI | Inspection scheduling, QR self-check-in, attendee tracking | ⚠️ Missing QR + attendee depth |
| Agents & Contacts | Negotiator, vendor link, buyer links | ✅ Partial |
| Resources | Photos, floor plans, documents, links | ✅ Exists (`ListingResourcesPanel`) |
| Offers/Contracts | Full contract lifecycle management | ⚠️ Missing 6 key mechanics |
| Commission | Agreed %, live calc, commission splits | ✅ Partial |

#### Left-Sidebar Navigation (Reapit)
Reapit shows these as collapsible sidebar sections distinct from the tab bar:
- Communications History (journal of all touchpoints for this listing)
- Listing Details (core fields)
- Prospective Buyers (count, ranked list)
- Inspections & Attendees (count, history)
- Activity Schedules (automated comms schedules)
- Property Modifications Log (full field change audit trail)
- Comparative Market Analysis (CMA tool)

**DataDungeon Gap:** The `ListingDetailSectionNav` exists but lacks the **Communications History** journal on the listing itself, the **Property Modifications Log** (field-level audit), and the **CMA module**.

---

### 2.2 Offers & Contracts — The Critical Gap

This is Reapit's most impressive mechanic. The "20 Hickory Drive, Narangba" contract (Under Contract/Conditional, $1M) demonstrates every field:

#### Reapit Contract Fields DataDungeon Is Missing

**Contract core (missing fields on `listing_offers`):**
- `expected_unconditional_date DATE` — the date by which all conditions must be cleared
- `expected_settlement_date DATE` — distinct from exchange date
- `display_price TEXT` — "Contact Agent" / actual price / price range (separate from offer price)
- `portal_status TEXT` — `available` | `under_contract` (controls portal feed status)
- `vendor_solicitor_contact_id UUID` — vendor's legal rep (DataDungeon only has buyer solicitor)
- `deposit_type TEXT` — `percentage` | `flat` (deposit can be % of price or fixed $)
- `commission_type TEXT` — `percentage` | `custom` (current schema only stores one value)
- `gross_comm_incgst NUMERIC` — computed and stored (not just calculated on the fly)
- `gross_comm_exgst NUMERIC` — stored for trust accounting
- `balance_held_trust NUMERIC` — running trust account balance
- `balance_held_ibd NUMERIC` — interest-bearing deposit balance

**IBD (Interest Bearing Deposit) Account — entirely missing:**
```sql
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS ibd_account_name TEXT;
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS ibd_account_number TEXT;
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS ibd_bsb TEXT;
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS ibd_bank TEXT;
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS ibd_branch TEXT;
```

**Contract Conditions — entirely missing as a table:**
Reapit tracks formal contract conditions as rows, each with a due date and status. This is the engine of sales progression.

```sql
CREATE TABLE public.offer_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.listing_offers(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'initial_deposit', 'finance', 'building_pest', 'balance_of_deposit',
    'title_search', 'strata_report', 'other'
  )),
  label TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'overdue', 'waived')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**UI Actions Missing from `ListingOffersPanel`:**
- `Fallen Over` button — one-click status to `fallen_through` with confirmation dialog
- `Unconditional` button — one-click promotion with date stamp + condition clearing
- `Letters` button — trigger document generation (offer letter, contract summary, settlement notice)
- `Edit Status Under Contract` dialog — the Reapit popup that shows Contract Date, Expected Unconditional, Expected Settlement, Contract Price, Deposit (% or $), Commission %, Display Price, Portals Status toggle

**Portal Status Toggle:** When a listing goes under contract, there should be a radio button `Available | Under Contract` that pushes to portal exports.

---

### 2.3 OFI (Open For Inspection) — Missing Depth

DataDungeon has basic OFI scheduling. Reapit has:

#### Missing from `ListingOpenInspectionsPanel`:

**1. Open Type selector:**
- "As Advertised" (scheduled OFI, published to portals)
- "By Appointment" (private inspection, not published)

**2. Self Check-In QR Code System** (high-value feature):
- Generate a unique QR code per listing
- Attendees scan on arrival and fill a form (name, phone, email, buying/renting intent)
- Auto-creates or matches contact record in CRM
- Print QR code as a brochure (A4 PDF)
- Download QR code image for digital use

**3. Attendee tracking per session:**
- Each OFI session has a list of attendees (not just a count)
- "Add Attendee" button on each past inspection row
- Attendee data: name, phone, email, interest level (hot/warm/cold)
- Auto-links attendees as prospective buyers on the listing

**Implementation notes:**
- QR code generation: `qrcode` npm package, store as base64 in `listing_ofi_qr_codes` table
- Self-check-in page: `/ofi-checkin/:listingId` (public, no auth) — already partially exists as `OfiCheckInPage.tsx`
- Attendee table: `listing_ofi_attendees` (link to `listing_open_inspections.id`)

```sql
CREATE TABLE public.listing_ofi_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.listing_open_inspections(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  interest_level TEXT DEFAULT 'warm' CHECK (interest_level IN ('hot', 'warm', 'cold', 'not_interested')),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 2.4 Contact Card — Full Live Audit (Directly Observed in Reapit)

Reapit's contact card is built around the concept that a contact can be multiple things simultaneously: a vendor, a buyer, a solicitor, a previous client. The live session confirmed every field and section.

#### Contact Card Structure — 6 Tabs + 4 Sidebar Sections

**Tabs:** Overview | Contact Card | Requirements (n) | Related Contacts (n) | Related Properties (n) | Social

**Left sidebar sections (collapsible):**
1. **History** — filterable journal of all touchpoints (calls, emails, notes, with type + who created)
2. **Activity Schedules** — communication templates applied to this contact
3. **Prospective Buyer/Tenant Activity (n)** — every property this buyer has enquired on, with enquiry + note counts per property. Buttons: [Activity / Follow Up] [All Inspections]
4. **Contact Modifications** — full field-level audit trail (filterable), showing every change: field name, old→new value, timestamp, who made it

#### Contact Overview Tab — What's Displayed
- Name (large) + LinkedIn icon + secondary social icon
- Status badge: **Active ●** (green)
- Company name
- Contact Class tags as clickable links (e.g. "Prospective Buyer", "Tyson's Acreage Buyers")
- Contact channels row: **E** (email) · **M** (mobile) · **A** (address) · **H** (home phone) · **P** (postal) · **W** (work) · fax icon · **F** (facsimile)
- Subscription badges: "Newsletters, Property Updates" (what they've opted into)
- "Info: social accounts" link
- **Additional Contact Details** expandable section (for extra emails/phones)
- **Related Contacts** section (partner, household members, solicitor etc.)
- **Requirements** section — all buyer briefs listed inline with suburb + price range
- **Related Properties** section (properties they own or have interest in)
- **Metadata footer:** Primary Agent | Source | Full Access (all staff who can see/edit) | First Created | Created By | Last Modified | Last Contact | **Anniversary Date**

#### Contact Card Tab — Every Field (Directly Observed)

```
Status*: [Active ▾]              Type: [Person ▾]
Do Not Contact Via: □Phone □SMS □Email □Mail

─── Contact ───────────────────────────────────────────────
Title: [dropdown]                Home Phone: [          ]
Salutation: [        ]           Work Phone: [          ]
First Name*: [       ]           Mobile:     [0470299355]
Last Name*:  [       ]           Facsimile:  [          ]
Email:       [       ]           Website:    [          ]
Company:     [       ]           Job Title:  [          ]
Legal Name:  [       ]
Address To:  [       ]  □ Custom Letter Head

─── Address ────────────────────────────────────────────────
Address:  [Street No., Street Name          ]
Suburb:   [        ]   State: [▾]
Postcode: [        ]   Country: [▾]
Postal Address: □ + Check if postal address is different to above
                                    [+ Add as Property] ← converts to property record!

Contact Method: [Email ▾]        Anniv Date: DD MM YYYY
[Add Other Date]  [Financial Information]  ← permission-gated financial data

Contact Class*: [Prospective Buyer ✕] [Tyson's Acreage Buyers ✕] [▾]

Contact Source: [Email Enquiry ▾]   Client Ref: [          ]

─── Assigned Staff* ────────────────────────────────────────
Primary Owner:  [Enter Staff Name ▾]
Full Access:    [Molly Bellemore ✕] [Alana Boulton ✕] [Greg Leigh ✕] ...
View Only:      [Enter Staff Name ▾]
Contact Comments: [                              ]
[Save]
```

#### Fields DataDungeon Contacts Table Is Missing:

```sql
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS title TEXT,          -- Mr/Mrs/Ms/Dr/Prof
  ADD COLUMN IF NOT EXISTS salutation TEXT,     -- "Dear John" override
  ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'person'
    CHECK (contact_type IN ('person', 'company')),
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,     -- for trust/company legal correspondence
  ADD COLUMN IF NOT EXISTS address_to TEXT,     -- correspondence name override
  ADD COLUMN IF NOT EXISTS custom_letterhead BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS home_phone TEXT,
  ADD COLUMN IF NOT EXISTS work_phone TEXT,
  ADD COLUMN IF NOT EXISTS facsimile TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email'
    CHECK (preferred_contact_method IN ('phone', 'email', 'sms', 'mail', 'any')),
  ADD COLUMN IF NOT EXISTS postal_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS postal_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS postal_city TEXT,
  ADD COLUMN IF NOT EXISTS postal_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_postcode TEXT,
  ADD COLUMN IF NOT EXISTS postal_country TEXT,
  ADD COLUMN IF NOT EXISTS client_ref TEXT,     -- external reference number
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS subscription_newsletters BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_property_updates BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_matching_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_portal TEXT,
  ADD COLUMN IF NOT EXISTS source_campaign TEXT,
  ADD COLUMN IF NOT EXISTS anniversary_date DATE,
  ADD COLUMN IF NOT EXISTS negotiator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- Note: contact_roles should be TEXT[] (multi-select classes like Reapit's Contact Class)
-- Note: full_access_staff and view_only_staff need a junction table (contact_staff_access)
```

#### New Junction Table: Contact Staff Access

Reapit's 3-tier staff access model (Primary Owner / Full Access / View Only) requires a proper junction table:

```sql
CREATE TABLE public.contact_staff_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('primary_owner', 'full_access', 'view_only')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, user_id)
);
```

#### Key UX Features to Build

**"+ Add as Property" button** on contact address:
One-click conversion of the contact's home address into a property record in the system, pre-linked to this contact as owner. This is a powerful prospecting tool — when you get a vendor's address, you instantly create the property without re-typing.

**"Add Other Date" button:**
Allows storing custom dates beyond just Anniversary (e.g. "Settlement date", "Birthday", "Moving date"). DataDungeon should implement this as a `contact_custom_dates` table.

**"Financial Information" (permission-gated section):**
Reapit stores: income, pre-approval amount, pre-approval lender, pre-approval expiry, financial advisor details. This is essential for qualifying buyers. DataDungeon should implement with row-level permission check (only users with `financial_info_access` role can see it).

```sql
CREATE TABLE public.contact_financial_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL UNIQUE REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  annual_income NUMERIC,
  pre_approval_amount NUMERIC,
  pre_approval_lender TEXT,
  pre_approval_expiry DATE,
  financial_advisor_name TEXT,
  financial_advisor_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Contact Modifications Audit Log (directly observed)

Reapit logs every single contact field change as a separate row:
- "Contact Requirement: Added Search Requirement #89254"
- "Assigned Staff: Added Greg Leigh"
- "Staff Level: Greg Leigh (Full Access)"
- "Contact Requirement: Added Residential | Buy (Buyer Enquiry #1P5459)"
- "Contact Name: Mohammed Shakir Ali => Mohammed Ali"
- "Staff Added via Enquiry: Nicholas Miranda; Sandy Davies (#1P5459)"

**DataDungeon equivalent:** The `contact_field_audit` table should mirror this pattern, capturing: field_name, old_value, new_value, changed_by, changed_at, context (e.g. "via enquiry #1P5459").

#### Requirements Tab — Full Field List (directly observed)

```
Edit Requirement
─────────────────────────────────────────
Sale/Rental*: [For Sale ▾]     Type*: [Residential ▾]
Category*: □Acreage □Apartment □Block Of Units ✓House □Land
           □Semi/Duplex □Studio □Terrace □Townhouse □Unit □Villa

Price From: [14400000] To [21600000]
Bedrooms From: [  ] To [  ]
Bathrooms From: [  ] To [  ]
Parking From:   [  ] To [  ]
Land Size From: [  ] To [  ] [sqm ▾]
Building Size From: [  ] To [  ] (sqm)

Completion by: [n/a ▾] [    ] YYYY (for new developments only)
Investment Criteria: [▾]

State: [QLD ▾]
Select Suburb(s): [Chandler ✕][             ]
✓ Include surrounding suburbs?
OR
Select Region(s): [Type or click here ▾]

Select Feature(s): [Type or click here ▾]
□ Match all features?
[Save]
```

**DataDungeon Gap on buyer_requirements table:** Missing `completion_by_month`, `completion_by_year`, `investment_criteria`, `include_surrounding_suburbs` (boolean), `region` (alternative to suburb), `match_all_features` (boolean). The `sale_or_rental` field also needs to support 'rent' not just 'buy'.

#### Contact Class — Multi-Select Tag System

Reapit's "Contact Class" is a multi-select tag system, not a single category. Contacts can hold multiple classes simultaneously:
- Prospective Buyer
- Prospective Vendor  
- Past Client
- [Agency-defined custom classes like "Tyson's Acreage Buyers"]

DataDungeon currently has `role_category` (single text) and `contact_category` (single text). These should be replaced with a proper `contact_classes` junction table or `TEXT[]` array to support multi-class tagging exactly as Reapit does.

#### Prospective Buyer/Tenant Activity Sidebar

This is one of the most powerful features — on a contact's record, a sidebar panel shows **every property they've ever enquired on**, with counts of:
- Enquiries (portal or manual)
- Notes added
- Inspections attended

Each property is a clickable link. Buttons: [Activity / Follow Up] [All Inspections]

**DataDungeon Gap:** This requires a cross-reference view joining `listing_contact_links`, `listing_offers`, `listing_ofi_attendees`, and the activity timeline. Currently DataDungeon shows matching listings but not the contact's full enquiry history across all properties.

#### Multiple Phone Numbers (normalised)
Currently `contacts.phone` is a single text field. Reapit surfaces 6 distinct contact channels on every card:
- **E** = Email (primary)
- **M** = Mobile
- **H** = Home Phone  
- **W** = Work Phone
- **F** = Facsimile
- **A** = Address (for mail)

The UI should display all populated channels in a row, each tappable with the correct protocol (tel:, mailto:).

#### Contact Card Header Strip — Target Design

```tsx
<div className="flex items-start gap-4 p-4 border-b">
  <AvatarCircle size="lg" initials={getInitials(contact)} />
  <div className="flex-1 min-w-0">
    {/* Name row */}
    <div className="flex items-center gap-2 flex-wrap">
      {contact.title && <Badge variant="outline" className="text-xs">{contact.title}</Badge>}
      <h1 className="text-xl font-semibold">{getContactDisplayName(contact)}</h1>
      <StatusDot active={contact.status === 'active'} />
      {contact.linkedin_url && <LinkedInIcon href={contact.linkedin_url} />}
    </div>
    {/* Company row */}
    {contact.company_name && (
      <p className="text-sm text-muted-foreground">{contact.company_name}
        {contact.job_title && ` · ${contact.job_title}`}
      </p>
    )}
    {/* Contact class tags */}
    <div className="flex gap-1 mt-1 flex-wrap">
      {contact.contact_classes?.map(cls => (
        <Badge key={cls} variant="secondary" className="text-xs">{cls}</Badge>
      ))}
    </div>
    {/* Channel row */}
    <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
      {contact.phone && <ChannelChip type="M" value={contact.phone} />}
      {contact.home_phone && <ChannelChip type="H" value={contact.home_phone} />}
      {contact.work_phone && <ChannelChip type="W" value={contact.work_phone} />}
      {getPrimaryEmail(contact) && <ChannelChip type="E" value={getPrimaryEmail(contact)} />}
    </div>
    {/* Subscription badges */}
    <div className="flex gap-2 mt-1">
      {contact.subscription_newsletters && <Badge className="text-xs bg-blue-600/20 text-blue-400">Newsletters</Badge>}
      {contact.subscription_property_updates && <Badge className="text-xs bg-blue-600/20 text-blue-400">Property Updates</Badge>}
    </div>
    {/* DNC + AML flags */}
    <div className="flex gap-1 mt-1">
      {contact.dnc_phone && <Badge variant="destructive" className="text-xs">DNC Phone</Badge>}
      {contact.dnc_email && <Badge variant="destructive" className="text-xs">DNC Email</Badge>}
      {contact.dnc_sms && <Badge variant="destructive" className="text-xs">DNC SMS</Badge>}
      {contact.aml_id_verified && <Badge className="text-xs bg-emerald-600/20 text-emerald-400">AML ✓</Badge>}
    </div>
  </div>
  <div className="text-right text-sm text-muted-foreground space-y-1">
    <PreferredMethodBadge method={contact.preferred_contact_method} />
    {contact.source && <SourceBadge source={contact.source} />}
  </div>
</div>
```

#### Prospective Buyers Panel on Listing
Reapit's sidebar shows a ranked list of prospective buyers for each listing. DataDungeon has `MatchBuyersSheet` but it should be surfaced as a persistent sidebar panel showing:
- Buyer name + contact details
- Match score (how well their requirements match this listing)
- Last inspection attended
- Offer status (if any)
- Interest temperature
- Quick-action: Log call, Add to OFI, Create Offer

---

### 2.5 Commission Panel — Missing Splits

DataDungeon has `ListingCommissionPanel` and the `listing_commission_splits` table. What's missing:

**From Reapit's commission tab:**
- Commission splits are only editable **after status changes to Exchanged/Under Contract** — enforce this UI gate
- Split types: Referral, Co-Agent, Franchise, Marketing levy
- Each split line: contact/company name, percentage or flat $, notes
- Live calculator: shows "If list price = $X, comm = $Y incGST, $Z exGST"
- The Reapit display: `List Price: $1,850,000.00 = $46,250.00 Gross Comm (IncGST) = $42,045.45 Gross Comm (ExGST)`

**Add to `ListingCommissionPanel`:**
```tsx
// Commission calculator strip (always visible)
<div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
  <div>
    <Label>List Price</Label>
    <p className="font-mono text-lg">{formatCurrency(listing.price)}</p>
  </div>
  <div>
    <Label>Gross Comm (incGST)</Label>
    <p className="font-mono text-lg text-primary">{formatCurrency(commIncGst)}</p>
  </div>
  <div>
    <Label>Gross Comm (exGST)</Label>
    <p className="font-mono text-lg">{formatCurrency(commExGst)}</p>
  </div>
</div>
```

---

### 2.6 Dashboard Pipeline — Reapit's Stage Model

Reapit's pipeline stages (visible on dashboard):
1. Open Appraisals
2. Presentations  
3. Listed (For Sale / Under Offer)
4. Exchanged / Conditional
5. Unconditional
6. Settled

Each stage shows: Count | Total Value | OCI (On Commission Income = expected GCI)

**DataDungeon has:** A kanban-style pipeline with configurable stages. What needs to be added:
- **OCI column** alongside value on each pipeline card/stage
- OCI = `commission_rate * price` for each listing in that stage
- Running total OCI across pipeline (what's the agency's expected income this month?)
- Stage-level colour coding matching the severity/urgency (green → yellow → orange → red)

---

### 2.7 The Property Modifications Log

Reapit maintains a **field-level change history** for every listing. Every time a field changes (price, status, description, features), it logs: who changed it, what it was before, what it became, and when.

DataDungeon has `EntityModificationsPanel` — this needs to be backed by a proper audit trigger on the listings table:

```sql
CREATE TABLE public.listing_field_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger on listings table to capture changes
CREATE OR REPLACE FUNCTION public.tr_listing_audit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['price','status','address','bedrooms','bathrooms','land_size','pipeline_stage']
  LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col, col) 
      USING OLD, NEW INTO old_val, new_val;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.listing_field_audit(listing_id, user_id, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), col, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
```

---

### 2.8 Activity Schedules on Listings

Reapit allows you to apply a communication schedule to a listing (e.g., "Weekly vendor report on Fridays"). DataDungeon has `EntityActivitySchedulesPanel` — this needs a **listing-specific schedule template** system:

Pre-defined templates:
- Weekly Vendor Report (every Friday)
- Fortnightly market update
- Post-OFI follow-up (1 day after each inspection)
- Under Contract milestone sequence (finance due, B&P due, settlement approaching)

---

### 2.9 The Prospector Module

Reapit has a dedicated **"Prospector"** section in the top navigation — a market intelligence layer for identifying and acting on prospecting opportunities within a defined geographic area.

#### Live Observation — Reapit Prospector

**Entry flow:** User selects a "Core Area" from a dropdown (pre-configured geographic zones, likely suburb groups). Once selected, all 8 smart lists activate with live counts.

**Two tabs:**
- **Properties** — prospecting across ownership/sales data
- **On The Market** — live listing activity

**8 Smart Lists (Properties tab):**

| Smart List | Definition | Prospecting Purpose |
|------------|-----------|-------------------|
| New Listings | First listed for sale within the last 7 days | Capture fresh vendors before competitors |
| Recent Sales | All properties sold within the last 30 days | Congratulations call + future appraisal pipeline |
| Ageing Listings | First listed for sale more than 30 days ago | Disenchanted vendor outreach — switch agency |
| All Listings | All sale listings on the market | Full area market snapshot |
| Our Listings | All listings with our agency | Internal portfolio view |
| Other Agents Listings (All) | All listings on market excluding ours | Competitive landscape |
| Other Agents Listings (Appraised) | Open appraisals listed with another agency | Highest-value prospect — they know their price, want a switch |
| Last Sold 5+ Years Ago | All properties sold more than 5 years ago | Long-hold owners — prime appraisal candidates |

**Key design principle:** Each smart list shows a count badge when a Core Area is selected. Clicking into a list shows a property grid with address, owner/contact linkage, last sold date/price, estimated value, and a "Log Touch" action. Properties already in the contact database surface the linked contact name.

**DataDungeon gap:** No Prospector module at all. This is a Phase 3 item.

**Implementation path for DataDungeon:**
- **Core Area** = saved suburb groups (new `prospect_areas` table with a `suburbs TEXT[]` column)
- **Data source:** `pricefinder-proxy` edge function already exists — PriceFinder API can power "Recent Sales", "Ageing Listings", "Last Sold 5+ Years Ago"
- **Our Listings / Other Agent Listings** — pull from `listings` table where `user_id = auth.uid()` vs external listings
- **New Listings** — PriceFinder or Reapit API feed for listings < 7 days old
- **Contact linkage** — match `prospect_area_properties.address` against `contacts` address fields → surface linked contact card inline
- **Navigation slot:** Add `Prospector` to `SidebarNavigation` between Reports and Settings (Phase 3)

---

## 3. Database Migrations Required

### Priority 1 — Contract Depth (do first)
```sql
-- 1. Contract conditions table
-- (full SQL in §2.2 above)

-- 2. IBD fields on listing_offers
ALTER TABLE public.listing_offers
  ADD COLUMN IF NOT EXISTS expected_unconditional_date DATE,
  ADD COLUMN IF NOT EXISTS expected_settlement_date DATE,
  ADD COLUMN IF NOT EXISTS display_price TEXT,
  ADD COLUMN IF NOT EXISTS portal_status TEXT NOT NULL DEFAULT 'available'
    CHECK (portal_status IN ('available', 'under_contract', 'sold')),
  ADD COLUMN IF NOT EXISTS vendor_solicitor_contact_id UUID REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'flat'
    CHECK (deposit_type IN ('percentage', 'flat')),
  ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (commission_type IN ('percentage', 'custom')),
  ADD COLUMN IF NOT EXISTS gross_comm_incgst NUMERIC,
  ADD COLUMN IF NOT EXISTS gross_comm_exgst NUMERIC,
  ADD COLUMN IF NOT EXISTS balance_held_trust NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_held_ibd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ibd_account_name TEXT,
  ADD COLUMN IF NOT EXISTS ibd_account_number TEXT,
  ADD COLUMN IF NOT EXISTS ibd_bsb TEXT,
  ADD COLUMN IF NOT EXISTS ibd_bank TEXT,
  ADD COLUMN IF NOT EXISTS ibd_branch TEXT;
```

### Priority 2 — OFI Attendees
```sql
-- (full SQL in §2.3 above)
-- Also add: open_type to listing_open_inspections
ALTER TABLE public.listing_open_inspections
  ADD COLUMN IF NOT EXISTS open_type TEXT NOT NULL DEFAULT 'advertised'
    CHECK (open_type IN ('advertised', 'by_appointment', 'private'));
```

### Priority 3 — Contact Professional Fields
```sql
-- (full SQL in §2.4 above)
-- Also: convert role_category to TEXT[]
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contact_roles TEXT[] NOT NULL DEFAULT '{}';
-- Migrate existing role_category values into the array
UPDATE public.contacts SET contact_roles = ARRAY[role_category] WHERE role_category IS NOT NULL;
```

### Priority 4 — Listing Audit Trail
```sql
-- (full SQL in §2.7 above)
```

---

## 4. UI/UX Implementation Tasks

### 4.1 Listing Offers Panel — Add Contract Management Depth

**File:** `src/components/listings/ListingOffersPanel.tsx`

Add to the "contract" tab view:
1. **Contract header** — show Ref#, buyer→vendor name line, status badge
2. **Contract financial summary** block:
   - Contract Date | Exp. Unconditional | Exp. Settlement
   - Contract Price | Deposit (type + amount)
   - Gross Comm incGST | Gross Comm exGST
   - Balance Held in Trust | Balance Held in IBD
3. **Edit Status dialog** (mirror Reapit's "Warning!" popup):
   - Contract Date*, Exp. Unconditional*, Exp. Settlement*
   - Contract Price, Deposit (% or flat $), Commission % (custom option)
   - Display Price field, Portals Status radio (Available / Under Contract)
4. **Conditions section** — table of conditions with due dates, status pills (Overdue/Pending/Complete), gear icon to mark complete
5. **IBD Account section** — collapsible, shows 5 fields
6. **Inclusions & Special Conditions** — two text areas
7. **Action button row**: `[Unconditional]` `[Fallen Over]` `[Letters ▾]` `[Save]`
   - Unconditional: one-click with date picker confirmation, auto-clears all pending conditions
   - Fallen Over: confirmation dialog, sets `fallen_through`, logs activity
   - Letters: dropdown menu → Offer Acknowledgement, Contract Summary, Settlement Notice, Vendor Report

### 4.2 OFI Panel — QR Self-Check-In

**File:** `src/components/listings/ListingOpenInspectionsPanel.tsx`

Add:
1. **Open Type selector** — "As Advertised or by Appointment" dropdown
2. **Self Check-In QR Code section** with:
   - Generate/display QR linking to `/ofi-checkin/:listingId?session=:inspectionId`
   - "Print Self Check-In Brochure" → generates PDF (use `pdf` skill)
   - "Download QR Code Image" → downloads PNG
3. **Attendee list per session** — expandable row for each past inspection:
   - Shows attendee count as a chip
   - Expand to see name, phone, email, interest level
   - "Add Attendee" button → modal to manually add or auto-match existing contact

**npm package:** `qrcode` (already common in React projects)
```tsx
import QRCode from 'qrcode';
const qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 300 });
```

**OFI Check-In page enhancement** (`src/pages/OfiCheckInPage.tsx`):
- Already exists — enhance to auto-populate `listing_ofi_attendees` on form submit
- Add interest level field (hot/warm/cold)
- Add "Are you working with an agent?" flag
- Show confirmation screen with listing address and agent contact

### 4.3 Contact Card — Professional Header

**File:** `src/pages/ContactDetail.tsx`

The contact card header should be redesigned to match Reapit's depth:

```tsx
// Contact header strip (replace current)
<div className="flex items-start gap-4 p-4 border-b">
  <AvatarCircle size="lg" initials={getInitials(contact)} />
  <div className="flex-1 min-w-0">
    {/* Name row */}
    <div className="flex items-center gap-2">
      {contact.title && <Badge variant="outline" className="text-xs">{contact.title}</Badge>}
      <h1 className="text-xl font-semibold">{getContactDisplayName(contact)}</h1>
      {/* Role badges */}
      {contact.contact_roles?.map(role => (
        <Badge key={role} variant="secondary" className="text-xs capitalize">{role}</Badge>
      ))}
    </div>
    {/* Company row */}
    {contact.company_name && (
      <p className="text-sm text-muted-foreground">{contact.company_name} · {contact.occupation}</p>
    )}
    {/* Contact channels row */}
    <div className="flex items-center gap-3 mt-1 flex-wrap">
      <ContactChannelPill type="mobile" value={contact.phone} />
      <ContactChannelPill type="home" value={contact.home_phone} />
      <ContactChannelPill type="work" value={contact.work_phone} />
      <ContactChannelPill type="email" value={getPrimaryEmail(contact)} />
    </div>
    {/* DNC + AML flags */}
    <div className="flex gap-2 mt-1">
      {contact.dnc_phone && <Badge variant="destructive" className="text-xs">DNC Phone</Badge>}
      {contact.dnc_email && <Badge variant="destructive" className="text-xs">DNC Email</Badge>}
      {contact.dnc_sms && <Badge variant="destructive" className="text-xs">DNC SMS</Badge>}
      {contact.aml_id_verified && <Badge className="text-xs bg-emerald-600">AML ✓</Badge>}
    </div>
  </div>
  {/* Preferred contact method + negotiator */}
  <div className="text-right text-sm text-muted-foreground">
    <PreferredMethodBadge method={contact.preferred_contact_method} />
    {contact.negotiator && <NegotiatorChip user={contact.negotiator} />}
  </div>
</div>
```

### 4.4 Prospective Buyers Sidebar Panel on Listings

**New file:** `src/components/listings/ProspectiveBuyersPanel.tsx`

Display a ranked list of buyer contacts matched to this listing:
- Pull from `buyer_requirements` joined with `listing_contact_links` where role = `interested` or `key_buyer`
- Sort by: offer status first, then interest level, then match score
- Each row: Avatar | Name | Match score chip | Last OFI date | Quick actions

**Quick actions per buyer:**
- 📞 Log call
- 📅 Book private inspection  
- 📝 Create offer

### 4.5 Dashboard Pipeline — Add OCI Column

**File:** `src/pages/Dashboard.tsx` + pipeline stage components

Each pipeline stage card should show:
```
┌─────────────────────────┐
│ Open Appraisals         │
│ 3 listings              │
│ Value: $4.2M   ──────── │
│ OCI:   $105K   ──────── │
└─────────────────────────┘
```

OCI calculation: `SUM(price * commission_rate / 100) WHERE stage = X`

---

## 5. Reapit Foundations API Integration

### Overview
Reapit's public API (`platform.reapit.cloud`) allows reading/writing contacts, properties, offers, enquiries, and more. This enables DataDungeon to sync with agency-wide Reapit data.

**Base URL:** `https://platform.reapit.cloud`  
**Auth:** OAuth 2.0 (Authorization Code for user context, Client Credentials for machine-to-machine)  
**Version header:** `api-version: 2020-01-31`  
**Rate limits:** 20 req/sec, 250,000 req/day

### 5.1 Setup — Supabase Edge Function

Create `supabase/functions/reapit-sync/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const REAPIT_TOKEN_URL = "https://connect.reapit.cloud/token"
const REAPIT_API_URL = "https://platform.reapit.cloud"
const CLIENT_ID = Deno.env.get("REAPIT_CLIENT_ID")!
const CLIENT_SECRET = Deno.env.get("REAPIT_CLIENT_SECRET")!
const CUSTOMER_ID = Deno.env.get("REAPIT_CUSTOMER_ID")! // e.g. "qldsir"

async function getReapitToken(): Promise<string> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
  const response = await fetch(REAPIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
  const data = await response.json()
  return data.access_token
}

async function fetchReapitResource(token: string, endpoint: string) {
  return fetch(`${REAPIT_API_URL}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "api-version": "2020-01-31",
      "reapit-customer": CUSTOMER_ID,
    },
  }).then(r => r.json())
}

serve(async (req) => {
  const { action } = await req.json()
  const token = await getReapitToken()
  
  switch (action) {
    case "sync_contacts":
      return syncContacts(token)
    case "sync_properties":
      return syncProperties(token)
    case "sync_offers":
      return syncOffers(token)
  }
})
```

### 5.2 Key Reapit API Endpoints to Use

| Endpoint | Use in DataDungeon |
|----------|-------------------|
| `GET /contacts` | Import/sync all contacts |
| `GET /contacts/{id}` | Fetch single contact with full profile |
| `PATCH /contacts/{id}` | Push contact updates back to Reapit |
| `GET /properties` | Import all listings/properties |
| `GET /properties/{id}` | Full property detail |
| `GET /propertyImages/{propertyId}` | Fetch listing photos |
| `GET /offers` | Sync offer/contract data |
| `POST /offers` | Create offer from DataDungeon |
| `GET /enquiries` | Import portal enquiries as contacts |
| `GET /negotiators` | Get agent list for assignment |
| `GET /appointments` | Sync inspections/OFI |
| `POST /appointments` | Create OFI from DataDungeon |

### 5.3 Webhook Events to Subscribe To

Register webhooks at `https://marketplace.reapit.cloud/developer/apps`:
- `contacts.created` / `contacts.modified` → update DataDungeon contact
- `properties.created` / `properties.modified` → update listing
- `offers.accepted` / `offers.rejected` / `offers.withdrawn` → update offer status
- `appointments.confirmed` / `appointments.cancelled` → update OFI
- `enquiries.accepted` → auto-create contact from portal enquiry

### 5.4 Reapit Sync Settings UI

**New file:** `src/pages/settings/ReapitSyncSettings.tsx`

```
┌─────────────────────────────────────────┐
│ Reapit Integration                      │
│ ─────────────────────────────────────── │
│ Status: ● Connected (qldsir)            │
│ Last sync: 2 minutes ago               │
│                                         │
│ [Sync Contacts Now] [Sync Listings Now] │
│                                         │
│ Auto-sync: ● On   Interval: 15 min     │
│                                         │
│ Sync Direction:                         │
│ ◉ Read-only (Reapit → DataDungeon)     │
│ ○ Two-way sync                          │
│                                         │
│ Conflict resolution: Reapit wins ▾     │
└─────────────────────────────────────────┘
```

---

## 6. AgentBox API Integration

### Overview
AgentBox (agentbox.com.au) is Australia's leading real estate CRM (separate from Reapit UK). Some agencies use AgentBox instead of Reapit. The integration requires:
- API Key + Client ID (obtained from AgentBox → Settings → Integrations)
- All integration applications require AgentBox approval

**Authentication:** API Key in request headers  
**Base URL:** `https://api.agentbox.com.au/v2` (typical structure)  
**Contact:** integrations@agentbox.com.au to get API access

### 6.1 AgentBox Key Endpoints
- `GET /contacts` — list all contacts
- `GET /listings` — list all property listings  
- `GET /staff` — get agent/staff list
- `GET /enquiries` — get portal enquiries
- `POST /contacts` — create contact
- `PUT /contacts/{id}` — update contact

### 6.2 AgentBox Edge Function

Create `supabase/functions/agentbox-sync/index.ts`:

```typescript
const AGENTBOX_API_URL = "https://api.agentbox.com.au/v2"
const AGENTBOX_API_KEY = Deno.env.get("AGENTBOX_API_KEY")!
const AGENTBOX_CLIENT_ID = Deno.env.get("AGENTBOX_CLIENT_ID")!

async function fetchAgentbox(endpoint: string) {
  return fetch(`${AGENTBOX_API_URL}${endpoint}`, {
    headers: {
      "X-Api-Key": AGENTBOX_API_KEY,
      "X-Client-Id": AGENTBOX_CLIENT_ID,
      "Accept": "application/json",
    },
  }).then(r => r.json())
}
```

### 6.3 MCP Server for Reapit & AgentBox

Build MCP servers so DataDungeon (and Claude/Cursor) can query both CRMs via natural language or tooling.

**Project:** `mcp-reapit-server/` and `mcp-agentbox-server/`

Each MCP server exposes tools like:
```typescript
// Reapit MCP tools
{
  name: "search_reapit_contacts",
  description: "Search Reapit contacts by name, email, or phone",
  inputSchema: { query: string, limit: number }
}
{
  name: "get_reapit_listing",
  description: "Get full listing details from Reapit by property ID",
  inputSchema: { propertyId: string }
}
{
  name: "sync_reapit_to_datadungeon",
  description: "Sync a Reapit contact/listing into DataDungeon",
  inputSchema: { entityType: 'contact' | 'listing', reapitId: string }
}

// AgentBox MCP tools
{
  name: "search_agentbox_contacts",
  description: "Search AgentBox contacts",
  inputSchema: { query: string }
}
{
  name: "get_agentbox_listing",
  description: "Get listing from AgentBox",
  inputSchema: { listingId: string }
}
```

**Stack:** Node.js + `@anthropic-ai/claude-agent-sdk` or FastMCP (Python)  
**Register in:** Claude desktop config or Cowork plugin system  
**Docs:** See `mcp-builder` skill for scaffold

---

## 6b. RiTA by Cotality — Live Deep Dive (Prospecting Engine)

**App:** `https://app.ritabyaire.com` | Already connected to Queensland Sotheby's via AgentBox  
**Research date:** May 2026 — live session as Greg Leigh (greg.leigh@qldsir.com)

RiTA is an AI prospecting assistant that pulls contacts and activities from AgentBox, enriches them with CoreLogic/Cotality property ownership data and live listing feeds, then builds intelligent call lists with "Topics to Talk About" for each contact. This is exactly the prospecting intelligence engine DataDungeon needs to build.

---

### 6b.1 The AgentBox ID System — CRITICAL FINDING

**AgentBox uses integer IDs.** Observed live on Neville Green's contact card:

```
Agentbox ID: 189747
```

**RiTA's internal ID** for the same contact is a MongoDB ObjectID:
```
690c10b4e1f3a743babbc53c  (appears in URL: /lists/do/{listId}/contact-{ritaId})
```

**Implication for DataDungeon:** The `agentbox_id` integer is the canonical cross-system reference. Every contact synced from AgentBox must store this ID. It must be indexed and unique.

```sql
-- REQUIRED: Add to contacts table immediately
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS agentbox_id INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS agentbox_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rita_contact_id TEXT; -- MongoDB ObjectID from RiTA

CREATE INDEX IF NOT EXISTS idx_contacts_agentbox_id ON public.contacts(agentbox_id);
```

**ID linking flow:**
```
AgentBox contact.id (integer) ←→ DataDungeon contacts.agentbox_id (integer)
AgentBox contact.id (integer) ←→ RiTA ritaContactId (MongoDB ObjectID, internal only)
```

When syncing, always use `agentbox_id` as the upsert key — never rely on name matching.

---

### 6b.2 RiTA Navigation Structure

| Section | Purpose |
|---------|---------|
| Inbox | Inbound enquiries / new leads to action |
| Scheduled | Upcoming SMS/email sends |
| **Call Lists** | Core prospecting workspace — daily call lists by topic |
| Timeline | Seller Timeline — kanban board by estimated sale month |
| Analytics | Campaign performance metrics |
| Group Sessions | Multi-agent prospecting sessions |
| Action Templates | SMS/email message templates with merge fields |
| Automations | Automated conversation sequences |
| Search | Contact search by name, address, email, phone |
| Integrations | Portal lead capture (Domain, REA) — AgentBox is office-level |

---

### 6b.3 The Call List Mechanics (Live Observation)

RiTA auto-generates call lists based on market events. The list observed:

**"Just Listed - Competitor: 12 Cassie Court, VICTORIA POINT"**
- 20 contacts per list (configurable)
- Assigned to: Greg Leigh
- Created: 22 May 2026, 09:55am
- Expires: 22 May 2026, 11:59pm (same day — forces daily prospecting discipline)
- 0/20 Completed (0%)
- Day schedule: M T W T F (not weekends)

**Each contact row in the list shows:**
- Name + avatar
- Last Engaged: X days/months ago
- Property address (the owned property, not the listing)
- Skip / Call buttons

**The contact detail panel (right side) shows:**
- Name, Agentbox ID (top right corner)
- Star rating (1-5, half stars — Neville Green: 4.5★)
- Contact Access: agent avatar(s) with access
- Salutation (first name)
- Owns: [property address] (hyperlinked)
- Categories: Owner / Buyer / Investor / Tenant
- Related contacts
- Past Notes and Engagement count (hyperlinked)
- Action bar: **Call, SMS, Email, Appointment, Follow Up, Note, Archive, Edit**
- Active Skips (+ Add Skip)
- Notes history (dated, with source attribution)
- **Topics to Talk About** (paginated carousel — the key prospecting intelligence)
- Follow Ups (0, + ADD)
- Property (CoreLogic verified ownership data)
- Buyer Requirements (0, + ADD)

---

### 6b.4 Topics to Talk About — The Core Engine

Each contact has N topics, paginated (1/3, 2/3, etc.). Topics are auto-generated by RiTA based on market events near the contact's owned property. Each topic has a **Seen** (blue badge) or **New** (green badge) status and a **Not Relevant** dismissal button.

**Neville Green's 3 Topics (live observation):**

**Topic 1 — Just Listed - Competitor (SEEN):**
- 12 Cassie Court, VICTORIA POINT — listed For Sale
- Listed by Kathy Tsai, Kathy Tsai Property · Eview Group, 5 days ago (20 May 2026)
- Shows: listing photo (Ray White signboard visible), price: FOR SALE, 4 bed / 2 bath / 2 garage / House

**Topic 2 — Just Listed - Competitor (NEW):**
- 3 Macadamia Street, VICTORIA POINT — listed For Sale
- Listed by Dave Tidbold, Tidbold Real Estate · VICTORIA POINT, 4 weeks ago (30 April 2026)
- Price: $1,250,000 | 4 bed / 2 bath / 5 garage / House
- Listing photo shown

**Topic 3 — Market Report (Suburb Market Report) — MAY MARKET REPORT:**
- "Houses in Victoria Point, QLD 4165"
- Recent Sales: **309** (↑ 2.2%)
- Median Sale: **$1.05M** (↑ 0.2%)
- Median Rent: **$750** (↔ 0%)
- Source: **Cotality** (formerly CoreLogic) — ⚠️ DataDungeon uses **PriceFinder** for this data
- "The April market report for Victoria Point is available for this owner for the 3 months ending April from Cotality"
- Buttons: Not Relevant | View Full Report
- **DataDungeon equivalent:** Call `pricefinder-proxy` edge function with suburb → render inline suburb stats card (recent sales count, median price, median rent)

**All 27 Topic Types (from custom list builder filter):**

| Topic Type | Trigger |
|-----------|---------|
| Aged Listing - Competitor | Competitor listing > 30 days on market near contact's property |
| Aged Listing - My Agency | Our listing > 30 days on market |
| Buyer Researching the Market | Contact viewed properties online |
| Competitor Rental 3 Month Check In | Competitor rental property 3 months in |
| Cotality Property Anniversary | Property purchase anniversary (Cotality/RP Data) — **use PriceFinder equivalent** |
| Domain Lead Miner | Lead captured via Domain |
| Follow Up | Manual follow-up scheduled |
| **Just Listed - Competitor** | Competitor listed property in BDA |
| **Just Listed - My Agency** | Agency listed property in BDA |
| **Just Sold - Competitor** | Competitor sold property in BDA |
| **Just Sold - My Agency** | Agency sold property in BDA |
| Listing Recommendation | AI recommends contacting re: a listing |
| Lost Listing | Listing lost to competitor |
| New Rental Enquiry | New rental enquiry received |
| New Sales Enquiry | New sales enquiry received |
| Open Home Attendee | Contact attended an OFI |
| Owner Researching the Market | Contact researching property values |
| Price Change | Listing price changed |
| Price Reduction | Listing price reduced |
| **Pricefinder Property Anniversary** | Property purchase anniversary (PriceFinder data) |
| Sold by Competitor | Competitor sold a property near contact |
| **Suburb Market Report** | Monthly suburb stats from Cotality |
| Vacant Rental | Rental property becoming vacant |
| Withdrawn Listing - Competitor | Competitor listing withdrawn |
| Withdrawn Listing - My Agency | Our listing withdrawn |
| Won Listing | New listing won |
| None | Manual / unclassified |

---

### 6b.5 Property Ownership Model (CoreLogic Integration)

> ⚠️ **DataDungeon note:** RiTA uses **Cotality/CoreLogic (RP Data)** for property ownership verification and market data. DataDungeon has **PriceFinder from Domain** — a different product with overlapping but not identical coverage. The `pricefinder-proxy` edge function already exists and is the correct data source to use everywhere you see "CoreLogic" in RiTA. Do NOT attempt to integrate RP Data/Cotality — use PriceFinder for: ownership lookup, purchase history, suburb market reports, and property anniversaries.

Observed on Neville Green's property card (CoreLogic-powered in RiTA; PriceFinder equivalent in DataDungeon):

```
27 Illidge Road, VICTORIA POINT
✅ Verified Owner  🏠 House
🔑 Ownership Verified via CoreLogic  [Mark as Past Owner]   ← PriceFinder equivalent
📅 No Estimated Sale Date  [Add Sale Date]
📋 Purchased: 13 July 2020 · 640k · Settlement: Aug 2020   ← PriceFinder can supply this
🔗 View in CoreLogic                                        ← Replace with PriceFinder link
```

**Data fields per owned property:**
- `address` TEXT
- `property_type` TEXT (House / Unit / Townhouse / etc.)
- `ownership_verified` BOOLEAN
- `ownership_source` TEXT (`corelogic` | `agentbox` | `manual`)
- `is_past_owner` BOOLEAN
- `estimated_sale_date` DATE (manually added by agent)
- `purchase_date` DATE
- `purchase_price` NUMERIC
- `settlement_date` DATE
- `corelogic_link` TEXT

---

### 6b.6 Activity / Notes Timeline (Source Attribution)

RiTA shows all activity in a single chronological feed with source attribution:

| Source label | Meaning |
|-------------|---------|
| `RiTA` | Automated SMS/email sent by RiTA |
| `Jan Goetze · Agentbox` | Phone call/note logged in AgentBox by Jan |
| `Greg Leigh · RiTA` | Manual note logged via RiTA |

**Observed activity types:**
- Automated Conversation (RiTA SMS thread — full two-way conversation visible)
- Phone Call, Connection Made (Category: Phone Call - Outbound, Subcategory: Connected)
- Opt-out handling: contact replied "Stop" → RiTA auto-replied "Ok. We will opt you out of any future SMS conversations."

**For DataDungeon:** The `activities` table needs a `source` field:
```sql
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'agentbox', 'rita', 'reapit')),
  ADD COLUMN IF NOT EXISTS external_id TEXT, -- AgentBox activity ID
  ADD COLUMN IF NOT EXISTS sms_opted_out BOOLEAN DEFAULT false;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS sms_opted_out BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;
```

---

### 6b.7 Custom List Builder — Full Filter Taxonomy

RiTA's call list builder supports these filter categories. This directly maps to what DataDungeon's prospecting module needs:

**GENERAL filters:**
- Last buyer requirement update, Communication consent, Contact category, Contact followup types, Contact is in another list, Exclusive recommended agent, Has buyer requirements, Has estimated selling date, Last activity of type, Last engaged by, Last engagement date is, Last RiTA activity by, Recommended Agent, Time since contact created in source

**DATA QUALITY filters:**
- Contact has possible duplicates, Data improvement, Data quality score contributors, Data quality score is, Mobile region, Qualification State

**ESTIMATED SELLING DATE filters:**
- Estimated selling date last qualified by, Estimated selling date qualified by, Estimated selling date range, Estimated selling date starts in month, Estimated selling range

**ASSIGNMENT & ACCESSIBILITY filters:**
- Accessible by, Contact followup assignee, Office Membership, Overdue followup assignee, Owned by

**TOPICS filters:**
- Contact topics, Investment enquiry, Topic property types, Types of topics (all 27 topic types above)

**PROPERTY OWNERSHIP filters:**
- Ownership validation, Owns property (in BDA), Owns property (Radius of Address), Owns property (Radius of Suburb), Owns property (Street), Owns property (Suburb), Property owner

---

### 6b.8 Template Engine — Full Detail (Live Observed)

Every template in RiTA has **9 action type tabs**, each independently enabled/disabled with a checkbox:

| Tab | What it does |
|-----|-------------|
| **Phone** | Call Outcome (Connected / No Answer / Voicemail) + pre-filled Call Notes |
| **SMS** | Single outbound SMS, character counter (X/1152), credit counter |
| **SMS Conversation** | Two-way AI conversation: High Confidence Mode toggle, Send Message on Unsubscribe toggle, First Message body |
| **Email (Plain)** | Subject line + plain text body, email signature auto-appended on send |
| **Email (HTML)** | HTML editor version of email |
| **Follow Up** | Type selector + N days + Assignee + Note |
| **Appointment** | Appointment scheduling |
| **Note** | Freeform note attached to contact |
| **Archive** | Archive action |

**Follow Up types** (observed from template editor):
- General | Data Updates | Appraisal Lead | Buyer Lead | Finance Lead | Investor Lead | Call Back | Market Report

**SMS Conversation settings:**
- **High Confidence Mode** — AI only sends if it is confident in the response (On/Off)
- **Send Message on Unsubscribe** — sends confirmation SMS when contact replies STOP (Yes/No)

---

#### 6b.8a Handlebars Template Syntax (Mustache-style)

RiTA uses [Handlebars.js](https://handlebarsjs.com/) (triple-brace = unescaped HTML):

**Contact namespace:**
- `{{{contact.firstName}}}` — contact's first name

**User namespace:**
- `{{user.firstName}}`, `{{user.lastName}}`, `{{user.mobile}}` — agent details

**Agency namespace:**
- `{{agency.name}}` — office full name (e.g., "Queensland Sothebys International - Jan Goetze")
- `{{agency.phoneNumber}}` — office phone
- `{{agency.ritaName}}` — AI persona name (e.g., "Michelle", "Sheridan")

**Topic/Property namespace** (topic data injected from market event):
- `{{{topics.0.related.0.ref.displayAddress}}}` — full display address of event property
- `{{{topics.0.related.0.ref.property.streetFull}}}` — street address only
- `{{{topics.0.related.0.ref.property.localityName}}}` — suburb name
- `{{{topics.0.related.0.ref.price.value}}}` — sale price (conditional)

**Conditional blocks:**
```handlebars
{{#topics.0.related.0.ref.price.value}}
  for {{{topics.0.related.0.ref.price.value}}}
{{/topics.0.related.0.ref.price.value}}
{{^topics.0.related.0.ref.price.value}}
  No sale price advertised yet
{{/topics.0.related.0.ref.price.value}}
```

**Sign-off field:**
- `{{{signOff}}}` — renders the agent's custom SMS sign-off from My Details settings

---

#### 6b.8b Live Template Examples

**Just Listed — SMS:**
```
Hi {{{contact.firstName}}}, you may have seen {{{topics.0.related.0.ref.property.streetFull}}} has just
gone on the market in your neighbourhood. Activity like this brings interest and buyers to the area
that would give you a great opportunity for selling. Would you be interested in an appraisal of your
home? {{{signOff}}}. To stop receiving messages from us, reply "STOP"
```

**Owner Nurturing - Just Sold — SMS:**
```
Hi {{{contact.firstName}}}, {{{topics.0.related.0.ref.displayAddress}}} was recently
sold{{#topics.0.related.0.ref.price.value}} for {{{topics.0.related.0.ref.price.value}}}
{{/topics.0.related.0.ref.price.value}} and I thought you might be interested.
{{^topics.0.related.0.ref.price.value}} No sale price advertised yet, but I can let you know
once we have it if you're interested.{{/topics.0.related.0.ref.price.value}} Let me know if you'd
like me to arrange an updated sale estimate based on recent market activity. {{{signOff}}}
To stop receiving messages from us, reply "STOP"
```

**Owner Nurturing - Just Sold — SMS Conversation (First Message):**
```
Hi {{{contact.firstName}}}, {{{topics.0.related.0.ref.property.streetFull}}},
{{{topics.0.related.0.ref.property.localityName}}} near you recently
sold{{#topics.0.related.0.ref.price.value}} for {{{topics.0.related.0.ref.price.value}}}
{{/topics.0.related.0.ref.price.value}}. Let me know if you would like me to arrange an updated
sale estimate based on the most recent market activity. To stop receiving messages from us,
reply "STOP" {{{signOff}}}
```

**Phone — Call Notes pre-fill:**
```
Called {{{contact.firstName}}}.
Discussed sale of {{{topics.0.related.0.ref.displayAddress}}}.
Outcome of call: 
```

**Topic Restriction field** on each template — limits which of the 27 topic types will surface this template as a suggestion (e.g., "Just Listed - Competitor, Just Listed - My Agency").

**"Do not repeat in automations" toggle** — prevents automation from re-sending this template to a contact who has already received it.

---

### 6b.9 Analytics Module — Full Structure (Live Observed)

RiTA Analytics has **6 sub-sections:**

#### Activities
Per-agent metrics with period-over-period comparison (current vs previous 30-day period). Filter by agent or "All Agents".

Metrics tracked:
- Calls Made / Calls Connected
- SMS Sent / Emails Sent / Notes / Archived
- Follow Up Created / Completed / Expired
- **Appointments by type:** Appraisal | Buyer | Finance | Listing | BDM
- Buyer Requirement Updates

#### Automations
Per-automation performance dashboard. Filter by automation name + timezone + time period.
Sub-tabs: **Overview | Follow Ups | Send History**

Metrics: SMS Conversations count, Emails Sent count, Follow Ups count. "VIEW CONTACTS" drill-down links.

#### SMS Budget
Credit usage tracking:
- **Bundle:** 6,500 credits/month
- **Observed state:** 5,829 used / 671 remaining (90%), reset 30 May (monthly billing cycle)
- **Usage breakdown by type:** Lead Automation | List Automation | Manual Send
- **Projection tab:** forecasts whether bundle will be exceeded before reset, shows additional cost for overages
- **History tab:** historical credit usage over time

#### Contacts
Health analytics with filterable segments. Sub-tabs: **Quality | Engagement | Geography | Categories | Agent Distribution**

Default filters applied:
- Last engagement date > 7 days
- Not in another list
- Data quality score ≥ 1 Star

Features:
- **LOAD SEGMENT** / **SAVE FILTERS AS SEGMENT** / **CREATE LIST** — turn any filtered view into a prospecting list
- **Charts:** Qualification States, Qualification Breakdown (why dirty/dormant), Score Distribution (star ratings), Score Breakdown (what fields are missing), Engagement frequency
- **Qualification states:** Clean / Dirty / Dormant — contact health classification

#### Lists
Call list completion analytics. Filter by agent or all agents.
Per-list shows: List name, Created datetime, Completed datetime, X/20 contacts worked, % completion, Assigned agent.

**Observed real data:** 12 lists completed, all at 0% (contacts not called — lists expire at 11:59pm daily regardless of progress).

#### Follow Ups
Follow-up performance tracking. Filters: Type, Time Period, Assignee.

Charts: Follow Up Outcomes | First Activity Taken | Time to Action (from Time Due) | Time to Action (after First Seen)

Table per agent: Scheduled | Actioned | Overdue | Total | Avg time from Time Due | Avg time from First Seen

---

### 6b.10 Agent Settings — BDA & Default Filters (Live Observed)

#### My Details
Fields: First Name, Last Name, Mobile, Email

**SMS Sign Off** — custom text that resolves as `{{{signOff}}}` in all templates.

**Email Signature** — built with merge fields, e.g.:
```
Kind Regards, {{user.firstName}} {{user.lastName}}
{{agency.name}}
Contact {{user.firstName}} {{user.lastName}} on {{user.mobile}}
Contact {{agency.name}} on {{agency.phoneNumber}}
```

Privacy Laws compliance checkbox required before saving (Australian/NZ spam law confirmation).

#### Default Filters
Pre-fills applied automatically whenever a new list is created. Greg's defaults (observed live):
- Last engagement date > 7 days (Mandatory — locked, cannot be removed per list)
- Contact is in another list = No
- Data quality score ≥ 1 Star

"ADD A FILTER" allows adding more defaults. Saved per-user.

#### My BDA (Business Development Area)
**Definition:** The agent's geographic territory — the streets/suburbs they farm.

Configuration (admin-only to set):
- **Owns property (Street)** — one or more specific streets
- **Owns property (Suburb)** — one or more suburbs
- Filter logic: **any** of the above (OR, not AND)

**Apply to Owner Searches as:**
- **Mandatory Filter** — BDA filter locked on, user cannot remove it from list searches
- **Default Filter** — BDA filter pre-applied but user can remove it

**Usage:** The `Owns Property (in BDA)` filter in list builder and contact analytics applies the BDA automatically. An agent set to "Mandatory" will only ever see contacts who own property in their streets/suburbs — they cannot accidentally prospect outside their territory.

**DataDungeon equivalent needed:**
```sql
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS owned_property_suburb TEXT,
  ADD COLUMN IF NOT EXISTS owned_property_street TEXT;

CREATE TABLE IF NOT EXISTS public.user_bda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  suburbs TEXT[],          -- array of suburb names
  streets TEXT[],          -- array of street names
  filter_mode TEXT DEFAULT 'default' CHECK (filter_mode IN ('mandatory', 'default')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 6b.11 What DataDungeon Needs to Build (RiTA-Equivalent)

**Phase 1 — ID Foundation:**
- Add `agentbox_id INTEGER UNIQUE` to `contacts` table (see SQL above)
- All AgentBox sync operations use this as upsert key

**Phase 2 — Topics Engine:**
- New `contact_topics` table linking contacts to market events
- `topic_type` enum matching all 27 RiTA topic types
- `topic_source_id` TEXT (the listing ID, sale ID, or market report ID)
- `topic_status` TEXT (`new` | `seen` | `dismissed`)
- `topic_data` JSONB (listing photo, price, beds/baths, agent name, agency)
- Feed powered by **PriceFinder** via `pricefinder-proxy` edge function (already exists) — this is DataDungeon's equivalent of Cotality/CoreLogic. Use it for: ownership lookup, purchase history, suburb market reports, property anniversaries, recent sales data. Do NOT use RP Data or Cotality APIs.

**Phase 3 — Property Ownership:**
- New `contact_properties` table (contact → owned property with CoreLogic data fields)
- `ownership_verified`, `purchase_date`, `purchase_price`, `settlement_date`, `estimated_sale_date`

**Phase 4 — Call List Builder:**
- UI for creating prospecting call lists with filters
- Daily list with Skip / Call / Note workflow
- "Topics to Talk About" carousel per contact in list session

**Phase 5 — SMS Opt-Out Tracking:**
- `contacts.sms_opted_out BOOLEAN`
- Inbound SMS "STOP" → flag contact, auto-reply confirmation

**Phase 6 — Template Engine (Handlebars):**
- `prospect_templates` table: `name`, `topic_restriction TEXT[]`, `no_repeat BOOLEAN`, `available_to TEXT`, `editable_by TEXT`
- `prospect_template_actions` table: `template_id`, `action_type` (phone/sms/sms_conversation/email_plain/email_html/followup/appointment/note/archive), `enabled BOOLEAN`, `content TEXT` (Handlebars body)
- Render engine: use [Handlebars.js](https://handlebarsjs.com/) (npm: `handlebars`) with context object: `{ contact, user, agency, topics, signOff }`
- `topic_restriction` filters which templates surface for a given topic type
- Default templates seeded from the 57 RiTA templates (Just Listed, Just Sold, Owner Nurturing, etc.)

**Phase 7 — Analytics Dashboard:**
- Activities tab: per-agent metrics (calls made/connected, SMS sent, emails sent, notes, archiveds, follow-ups created/completed/expired, appointments by type) — query from `activities` table grouped by date range, compared to previous period
- Lists tab: completion tracking per prospecting list (X/20 worked, % complete, created/expired timestamps)
- SMS Budget tab: credit usage tracking — requires `sms_credits` table (debit on send, monthly reset, bundle total configurable)
- Contact Health tab: Qualification States (clean/dirty/dormant) + Score Distribution (star ratings based on data completeness) + Engagement frequency charts
- Follow Ups tab: Scheduled/Actioned/Overdue per assignee, avg time-to-action metrics

**Phase 8 — BDA & Default Filters:**
- `user_bda` table (see §6b.10 SQL above)
- Default filters stored as JSONB in `user_settings` table, applied as pre-filled state when opening list builder
- BDA "Mandatory" mode: filter locked into all owner list queries server-side (RLS or edge function)
- BDA "Default" mode: filter pre-applied in UI but user can clear it

---

## 7. The Vendor Reporting Engine

One of Reapit's key differentiators is its **Vendor Report** — a structured weekly/fortnightly update sent to the vendor showing:
- Days on market
- Portal views (realestate.com.au, domain.com.au)
- OFI attendee count and names (or anonymised)
- Offers received (count and price range)
- Market feedback
- Agent recommendations

DataDungeon should implement this as a **printed/PDF report** generated from live data:

**New file:** `src/pages/ListingVendorReportPage.tsx` (route: `/listings/:id/vendor-report`)

Sections:
1. Property hero image + address
2. Campaign KPI summary (days on market, OFI count, enquiries)
3. Weekly OFI attendance chart
4. Offer history (redacted buyer names)
5. Agent commentary (text field)
6. Market comparison (nearby sold properties from PriceFinder)
7. Agent branding footer

Generate as PDF via the `pdf` skill.

---

## 8. Priority Implementation Order

### Phase 1 — Contract Management Depth (1–2 weeks)
1. `offer_conditions` table + migration
2. IBD fields on `listing_offers`
3. `portal_status` field on offers
4. Rewrite `ListingOffersPanel` contracts tab with full Reapit-style layout
5. `Fallen Over` + `Unconditional` action buttons
6. Letters dropdown (generate from existing `OfferLetterDialog`)

### Phase 2 — OFI Self Check-In (1 week)
1. `listing_ofi_attendees` table
2. `open_type` field on `listing_open_inspections`
3. QR code generation in `ListingOpenInspectionsPanel`
4. Enhance `OfiCheckInPage.tsx` to write attendees
5. Print QR brochure PDF

### Phase 3 — Contact Card Depth (1 week)
1. Contact schema migrations (title, company, home_phone, work_phone, postal_address, negotiator_id)
2. Redesign contact header strip
3. Multiple phone number display with type badges
4. `contact_roles` array (replace `role_category`)
5. Preferred contact method UI

### Phase 4 — Dashboard & Pipeline (3–5 days)
1. OCI calculation on pipeline stages
2. Stage value + OCI display on each kanban column
3. Listings filter: my listings / all office listings
4. Pipeline by negotiator view

### Phase 5 — Reapit API Sync (2 weeks)
1. `reapit-sync` edge function
2. OAuth flow setup (register app at marketplace.reapit.cloud)
3. Contact sync (import → DataDungeon)
4. Listing sync
5. Webhook receiver endpoint
6. Settings UI page

### Phase 6 — AgentBox API Sync (1 week)
1. Apply for AgentBox API access
2. `agentbox-sync` edge function
3. Contact + listing sync
4. MCP server scaffold (optional: use `mcp-builder` skill)

### Phase 7 — Vendor Reports & Prospector (2 weeks)
1. Vendor report page + PDF generation
2. PriceFinder integration (edge function already exists)
3. Prospector page scaffold (suburb search → property owners)
4. CMA (Comparative Market Analysis) module

---

## 9. Design Principles to Maintain

DataDungeon's strength is its **visual superiority over Reapit**. Do not sacrifice this:

- **Dark-first design** — Reapit is essentially a grey data table. DataDungeon's cyan/teal design system must be maintained
- **Card-based depth** — Reapit uses flat form panels. DataDungeon should use beautiful elevated cards with subtle shadows
- **Contextual smart lists** — Reapit's contact lists are dumb filters. DataDungeon's urgency scoring and smart lists are a genuine advantage — keep and extend them
- **Mobile-responsive** — Reapit's web app is not mobile-friendly. DataDungeon should be
- **Speed** — TanStack Query caching + Supabase is faster than Reapit's rendering. Don't slow it down with unnecessary fetches

---

## 10. Key Files Reference for Cursor

| Feature Area | File(s) to Modify |
|-------------|------------------|
| Contract depth | `src/components/listings/ListingOffersPanel.tsx` |
| Contract schema | `supabase/migrations/YYYYMMDD_offer_depth.sql` |
| OFI / attendees | `src/components/listings/ListingOpenInspectionsPanel.tsx`, `src/pages/OfiCheckInPage.tsx` |
| Contact header | `src/pages/ContactDetail.tsx` (header section ~line 300–400) |
| Contact schema | `supabase/migrations/YYYYMMDD_contact_professional_fields.sql` |
| Dashboard pipeline | `src/pages/Dashboard.tsx` |
| Commission panel | `src/components/listings/ListingCommissionPanel.tsx` |
| Listing audit | New migration + `src/components/shared/EntityModificationsPanel.tsx` |
| Reapit API sync | `supabase/functions/reapit-sync/index.ts` (new) |
| AgentBox API sync | `supabase/functions/agentbox-sync/index.ts` (new) |
| Settings | `src/pages/Settings.tsx` + new `ReapitSyncSettings` component |
| MCP servers | New top-level `mcp-reapit/` and `mcp-agentbox/` directories |

---

## 11. Reapit Developer Registration Steps

To get Reapit API access for the `qldsir` (Queensland Sotheby's) customer:

1. Register at **https://marketplace.reapit.cloud/developer** (free)
2. Create an app → get `client_id` and `secret`
3. Request `qldsir` customer to install your app via the AppMarket
4. Set required scopes: `contacts.read`, `contacts.write`, `properties.read`, `properties.write`, `offers.read`, `offers.write`, `appointments.read`, `appointments.write`, `enquiries.read`
5. Add secrets to Supabase Dashboard: `REAPIT_CLIENT_ID`, `REAPIT_CLIENT_SECRET`, `REAPIT_CUSTOMER_ID=qldsir`
6. Use sandbox (`SBOX` customer ID) for development/testing

**Interactive API Explorer:** https://developers.reapit.cloud/swagger

---

## 12. AgentBox Integration Steps

1. Email `integrations@agentbox.com.au` — describe DataDungeon and the integration intent
2. Complete the Integrator Application at **https://www.agentbox.com.au/integrator-application**
3. Once approved, retrieve API Key and Client ID from AgentBox settings
4. Add to Supabase: `AGENTBOX_API_KEY`, `AGENTBOX_CLIENT_ID`
5. Test against AgentBox sandbox (if available) or staging instance

**Note:** AgentBox is now part of the Reapit group (Reapit acquired AgentBox). The long-term direction may be consolidation onto the Reapit Foundations platform. Build the AgentBox sync as a separate, optional module so it can be deprecated gracefully if needed.

---

*This brief was generated from: live Reapit Sales CRM session at app.sales.reapit.com.au, Reapit Foundations API documentation at foundations-documentation.reapit.cloud, and full DataDungeon codebase audit (src/, supabase/migrations/). All file references are relative to the DataDungeon repository root.*

---

## Implementation log

| Date | Item | Status |
|------|------|--------|
| 2026-05-25 | **Phase 1** — `offer_conditions`, IBD/trust/portal columns, `ContractEditDialog`, Unconditional/Fallen over | Migration `20260525100000_offer_contract_depth.sql` |
| 2026-05-25 | **Phase 2–3** — OFI interest level + working-with-agent on check-in; `ProspectiveBuyersPanel` with match scores; `ContactBuyerActivityPanel`; contact professional fields + AgentBox ID; contract conditions report from `offer_conditions` | Migration `20260525120000_reapit_upgrade_phase2_3.sql` |
| 2026-05-25 | **Phase 2 + 4 + 6 scaffold** — OFI A4 brochure print; pipeline OCI on kanban columns + Mine/All filter; contact professional field edits; `agentbox-sync` edge function + Settings UI | `OfiBrochurePrintPage`, `agentbox-sync` |
| 2026-05-25 | **Phase 5 scaffold** — `reapit-sync` edge function + `reapit_id`/`negotiator_id` migration; Reapit row in Settings; OFI attendee interest badges | Migration `20260525140000`, `reapit-sync` |
| 2026-05-25 | **Phase 4–5 + 7 lite** — negotiator assign on listing; Reapit property sync; vendor preview campaign KPIs; pipeline funnel OCI labelling | `sync_properties`, `listingVendorReport` |
| 2026-05-25 | **Phase 6** — AgentBox listing sync + `listings.agentbox_id`; CRM sync cache invalidation; listing sidebar external IDs | Migration `20260525150000`, `sync_listings` |
| | Phase 5 OAuth/webhooks, full CMA module | Pending — see §8 priority order |
