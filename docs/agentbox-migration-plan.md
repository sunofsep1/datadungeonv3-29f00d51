# DataDungeon → Agentbox Migration Plan

**Date:** 2026-06-01  
**Source:** DataDungeon (Supabase project `sujyalrzbubvhpkntwja`)  
**Target:** Agentbox CRM (Reapit Sales)

---

## Data Inventory

Current DataDungeon data to migrate:

| Entity | Records | Agentbox Equivalent |
|---|---|---|
| contacts | 364 | Contacts |
| contact_addresses | 779 | Contact address fields |
| contact_tags | 209 (30 tags) | Contact classes / custom classes |
| contact_property_links | 448 | Property owner/interest links |
| contact_tasks | 143 | Contact tasks |
| contact_relations | 1 | Contact relationships |
| interactions | 1,102 | Contact notes |
| touches | 874 | Contact notes / activity log |
| properties | 339 | Prospect properties |
| listings | 16 | Listings (current & past) |
| listing_contact_links | 33 | Vendor / buyer links on listings |
| listing_offers | 1 | Offer records |
| listing_marketing_funds | 1 | Marketing funds |
| pricing_analyses | 2 | Appraisals |
| price_brackets | 22 | Appraisal detail |
| competitor_listings | 6 | Appraisal competitor data |
| nurture_sequence_enrollments | 77 | (no direct equivalent — export as notes) |
| invoices | 4 | (no direct equivalent — export as CSV) |
| appointments | 6 | Calendar / tasks |
| todos | 12 | Tasks |

---

## Migration Approach

Agentbox supports three import pathways:

1. **Self-service CSV** — Contacts only, up to 1,000 rows per batch. We can do this immediately ourselves.
2. **Agentbox Internal Data Team** (paid) — Contacts + Properties + Appraisals + Listings (from REA XML feed).
3. **Third-party specialist — CQ Corporation (Chris Quinn)** + $800+GST Agentbox import fee — Full migration including linking vendors/buyers/purchasers to listings. Recommended for complex or unsupported sources.

Because DataDungeon is **not** a recognised source system (REX, Zenu, LockedOn, etc.), the safest path is the **CQ Corporation route** for a complete migration, with us self-serving the contacts CSV in parallel to get up and running immediately.

---

## Phase 1 — Contacts CSV (self-service, do this first)

**Scope:** 364 contacts — well under the 1,000-row limit.  
**Method:** Upload CSV directly in Agentbox → Contacts → Import CSV.  
**Field mapping:**

| DataDungeon field | Agentbox field |
|---|---|
| first_name | First Name |
| last_name | Last Name |
| email (primary) | Email |
| phone / mobile | Mobile / Phone |
| contact_addresses (primary) | Address fields |
| date_of_birth | Date of Birth |
| notes / bio | Notes |
| contact_tags | Contact Class / Custom Class |
| lead_status / category | Source / Lead Category |
| assigned_agent | Assigned Staff |

**Notes strategy:** Concatenate the most recent ~10 interactions and touches per contact into a single "Notes" column in the CSV. Agentbox will import these as a note against the contact, individually date-stamped.

**Steps:**
1. Run export SQL (see below) → save as `contacts_export.csv`
2. Split into batches of 1,000 if needed (not needed here — 364 records)
3. In Agentbox: Contacts → Import CSV → Upload → Map fields → Assign staff → Confirm
4. Review import report; download error log

**Export query to run against Supabase:**

```sql
SELECT
  c.first_name,
  c.last_name,
  c.email,
  c.mobile,
  c.phone,
  c.date_of_birth,
  c.gender,
  c.occupation,
  c.notes,
  -- Primary address
  ca.street_address,
  ca.suburb,
  ca.state,
  ca.postcode,
  ca.country,
  -- Tags as comma-separated string
  STRING_AGG(DISTINCT t.name, ', ') AS contact_tags,
  -- Recent interactions as a note block
  (
    SELECT STRING_AGG(
      '[' || TO_CHAR(i.created_at, 'DD Mon YYYY') || '] ' || COALESCE(i.type, '') || ': ' || COALESCE(i.notes, ''),
      E'\n' ORDER BY i.created_at DESC
    )
    FROM interactions i
    WHERE i.contact_id = c.id
    LIMIT 10
  ) AS interaction_history
FROM contacts c
LEFT JOIN contact_addresses ca ON ca.contact_id = c.id AND ca.is_primary = true
LEFT JOIN contact_tags ctg ON ctg.contact_id = c.id
LEFT JOIN tags t ON t.id = ctg.tag_id
GROUP BY c.id, ca.street_address, ca.suburb, ca.state, ca.postcode, ca.country
ORDER BY c.last_name, c.first_name;
```

---

## Phase 2 — Properties (Agentbox Data Team or CQ Corp)

**Scope:** 339 properties + 448 contact-property links.  
**Method:** Provide a formatted spreadsheet to Agentbox Data Team or CQ Corp.  
**Agentbox terminology:** "Prospect Properties"

**Data to export:**
- properties table → property address, type, bed/bath/car, land size, last sold price/date
- contact_property_links → role (owner / past owner / interested buyer) + linked contact

**Export format:** Excel spreadsheet with two tabs — Properties and Property-Contact Links.

---

## Phase 3 — Listings (REA XML + Data Team)

**Scope:** 16 listings.

**Option A (preferred if listings are on REA):** Contact Agentbox and ask them to pull your current and past listings via the REA XML feed. They can link these to your property records after Phase 2 is complete. This is standard practice and included in Agentbox's mid-level migration.

**Option B (if not on REA):** Export listings table to a formatted spreadsheet and provide to the data team alongside Phase 2.

**Data to export from listings table:**
- Property address, listing type (sale/lease), status (current/sold/withdrawn)
- List price, sold price, sold date
- Agent/staff name
- listing_contact_links → vendor and buyer contact references
- listing_offers, listing_marketing_funds, listing_commission_splits

---

## Phase 4 — Appraisals (Data Team)

**Scope:** 2 pricing_analyses + 22 price_brackets + 6 competitor_listings.

These map to Agentbox's Appraisal records. Provide as a formatted spreadsheet with:
- Property address
- Appraisal date
- Estimated price range (from price_brackets)
- Appraising agent
- Competitor listings used in the analysis (from competitor_listings)
- Link to prospective vendor contact (from contact_property_links)

---

## Phase 5 — Notes, Tasks & History (Data Team / appended to CSV)

**Scope:** 1,102 interactions + 874 touches + 143 contact_tasks + 12 todos + 6 appointments.

For the **contact CSV** (Phase 1): Include a summary note block (last 10 interactions) per contact.

For the **full history**: Provide to CQ Corp as a formatted spreadsheet with columns: Contact Name, Date, Type, Note Text, Agent. They will import these as individually date-stamped notes against each contact.

**Tasks** (contact_tasks + todos): Export as a separate CSV and manually recreate in Agentbox, or ask data team to include. Volume is low (155 total).

---

## Phase 6 — Sequences / Nurture (manual setup)

**Scope:** 23 nurture sequences, 77 enrollments, 224 steps.

Agentbox has its own Nurture/Campaign system. These don't import directly — you'll need to:
1. Export the sequence definitions (nurture_sequences + nurture_sequence_steps) as a reference
2. Recreate the sequence templates in Agentbox's campaign builder
3. Re-enroll contacts after migration

---

## Phase 7 — Invoices (standalone export)

**Scope:** 4 invoices.

Export invoices + invoice_line_items to CSV for your own records. Agentbox doesn't have a native invoice import; these should be kept as a PDF/CSV archive.

---

## Recommended Sequence & Timeline

| Week | Action |
|---|---|
| Week 1 | Run contacts export SQL → upload CSV to Agentbox (Phase 1). Immediately operational. |
| Week 1 | Contact CQ Corp (Chris Quinn) for a consultation. Email Agentbox at sales@agentbox.com.au to flag you're a new customer needing third-party migration. |
| Week 2 | Prepare properties + contact-property links spreadsheet (Phase 2 export) |
| Week 2 | Prepare listings spreadsheet; confirm if listings are on REA for XML pull (Phase 3) |
| Week 2 | Prepare appraisals spreadsheet (Phase 4) |
| Week 2 | Prepare full notes/touches history spreadsheet (Phase 5) |
| Week 3 | Deliver all spreadsheets to CQ Corp for data formatting |
| Week 4–5 | CQ Corp formats data; Agentbox imports ($800+GST fee) |
| Week 5 | Recreate nurture sequences in Agentbox (Phase 6) |
| Week 5 | Re-enroll contacts into sequences; verify data integrity |

---

## Key Contacts

- **Agentbox Data Team / Sales:** sales@agentbox.com.au | 1300 131 311
- **CQ Corporation (Chris Quinn):** Third-party data specialist recommended by Agentbox for complex/unsupported migrations. Request contact via Agentbox onboarding.
- **Self-service import guide:** https://help.agentboxcrm.com.au/import-contacts
- **Migration options overview:** https://www.agentbox.com.au/onboarding/third-party-migration

---

## What We Can Build Now

The following export scripts can be run directly against Supabase to produce ready-to-use files:

1. `contacts_export.csv` — Phase 1 contacts CSV (immediately usable)
2. `properties_export.xlsx` — Phase 2 properties + owner links spreadsheet
3. `listings_export.xlsx` — Phase 3 listings with vendor/buyer links
4. `appraisals_export.xlsx` — Phase 4 appraisals
5. `notes_history_export.xlsx` — Phase 5 full interaction/touch history
6. `sequences_reference.xlsx` — Phase 6 nurture sequence reference

Just say the word and I'll build whichever exports you want to start with.

---

## Security Note (unrelated to migration)

While pulling the table list, Supabase flagged that 9 tables have **Row Level Security disabled**: `pipelines`, `pipeline_stages`, `workflows`, `sequences`, `sequence_enrollments`, `lists`, `list_memberships`, `deal_contacts`, `contact_companies`. These are exposed to any authenticated user. Worth fixing before you wind down DataDungeon — let me know and I can write the RLS policies.
