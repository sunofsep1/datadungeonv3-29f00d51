# DataDungeon → AgentBox (Reapit Sales) — Migration Runbook

**Prepared for:** Greg (Sotheby's International Realty contractor)
**Source:** DataDungeon CRM — Supabase project `sujyalrzbubvhpkntwja`
**Target:** AgentBox / Reapit Sales (your Sotheby's account)
**Date:** 3 June 2026

---

## 0. Read this first — what can and can't be self-imported

AgentBox and "Reapit Sales" are the **same product** (Reapit rebranded AgentBox). That resolves the two names you mentioned — you only have one destination.

| Data | How it goes into AgentBox |
|---|---|
| **Contacts** (+ their notes, tags, consent) | **Self-serve CSV import** you can do yourself. Max **1,000 rows per file**, permission-based, with a column-mapping wizard and duplicate handling. |
| **Properties, Listings, Appraisals, Sales/Offers** | **Not** a self-serve CSV. Loaded by **AgentBox Support (paid data migration)** or pushed via the **AgentBox API**. Your CSVs become the source feed for whichever you choose. |

Because the destination is **Sotheby's shared brokerage system, not your own**, confirm two things with your principal/admin before importing: (1) you have the "Import Contacts" permission, and (2) the office is OK with you adding ~360 contacts and their notes. Contact notes visibility is controlled by a Master User setting (*My Office → Edit Details → System Config → Publish Note*).

---

## 1. Export your data (you do this — ~10 minutes)

Use **`01_SQL_EXPORT_PACK.sql`**. In Supabase Studio → SQL Editor, run each block and click **Download CSV**:

| Block | File | Rows (approx.) |
|---|---|---|
| 1 | `agentbox_contacts.csv` | 363 |
| 2 | `properties.csv` | 339 |
| 3 | `listings_appraisals_sales.csv` | 16 |
| 4 | `listing_contacts.csv` | 32 |
| 5 | `offers_sales.csv` | 1+ |
| 6 | `contact_property_links.csv` | 447 |
| 7 | `tasks_appointments.csv` | ~150 |
| 8 | `invoices.csv` | 4 |
| 9 | `buyer_requirements.csv` | 1+ |
| 10 | (reconciliation counts) | — |

The queries are read-only; they change nothing in DataDungeon. Notes are already cleaned (real calls/emails/SMS/meetings + your written notes; internal automation churn removed).

---

## 2. Clean the contacts file before importing (~20 minutes)

Open `agentbox_contacts.csv` in Excel/Sheets and:

1. **Delete test rows** — sort by `suspected_test_record` = TRUE and remove them (the `@example.com` seeds: Sarah Mitchell, David Chen, Emma Thompson, Jo Blogs, etc.).
2. **Fix couples / dual names** — rows like "Michael & Rhonda Watts" or "Russell Southall; Melanie Southall" landed in one card. AgentBox stores one person per contact. Either split into two contacts or set the primary person as First/Last and keep the partner in Notes. Your call per row.
3. **Check `Last Name`** — AgentBox requires it. Single-word names (e.g. "OTM Letter" style sources) may need a manual surname or move to Company.
4. **Map `Suggested Contact Class`** — I derived Vendor/Buyer/Landlord/Tenant/Prospect from your tags. Skim and correct outliers; you'll confirm the class in the import wizard.
5. Delete the helper columns you don't want imported (`DataDungeon ID`, `suspected_test_record`, the `(raw)` columns) — or just leave them unmapped in the wizard.

---

## 3. Field mapping — `agentbox_contacts.csv` → AgentBox

The CSV headers are already named to match AgentBox so the wizard auto-maps most. Reference:

| CSV column | AgentBox field | Notes |
|---|---|---|
| First Name | First Name | |
| Last Name | Last Name / Surname | **Required** |
| Title / Salutation | Title / Salutation | |
| Company | Company | |
| Job Title | Position | |
| Email | Email (primary) | |
| Email 2 | Email (secondary) | extra addresses found in channels |
| Mobile | Mobile | |
| Phone / Home Phone / Work Phone | Phone numbers | map to AgentBox's phone slots |
| Other Phones | (Notes or extra phone) | extra numbers from channels |
| Street Address / Suburb / State / Postcode / Country | Address block | |
| Date of Birth | Date of Birth | |
| Suggested Contact Class | **Contact Class** | set in wizard step "contact classes" |
| Source | Contact Source | |
| Do Not Email / Do Not SMS / Do Not Call | Subscription / DNC flags | derived from your opt-out + DNC fields |
| Notes | Notes / Comments | profile + cleaned activity history |
| Source Tags (raw), Lead Status (raw), etc. | — | reference only; map to custom classes or ignore |
| Existing AgentBox ID | (match key) | populated only where a prior sync existed |

---

## 4. Import contacts into AgentBox (~15 minutes)

1. **Contacts** menu → **Import CSV** → **Upload** → select `agentbox_contacts.csv`.
2. Accept the import terms → **Next**.
3. "First row contains headings" → **Yes**.
4. Duplicate handling — choose **Append Missing Information** (safest on a shared office DB; won't overwrite existing office contacts). Use *Skip* if you only want brand-new ones.
5. Map fields (mostly pre-matched by the header names above).
6. Set **Contact Class**, assigned staff (you), and subscription options → **Next**.
7. Review → **Confirm**. Download the import report and keep it.

If you ever exceed 1,000 rows, split the file; you won't need to here.

---

## 5. Properties, listings, appraisals & sales

These can't be self-imported. Two options:

- **A — AgentBox Support migration (recommended, low effort):** Send `properties.csv`, `listings_appraisals_sales.csv`, `listing_contacts.csv`, `offers_sales.csv`, `contact_property_links.csv` to AgentBox Support and request a quote to load them. They'll match listings to the contacts you imported in step 4.
- **B — AgentBox API (if you/your admin want to automate):** Use the included script **`04_agentbox_api_push.py`** to create Contacts, Properties and Listings from the same CSVs. Best if this becomes a recurring sync. Note your DataDungeon `contacts` and `listings` tables already carry `agentbox_id`/`reapit_id` columns — the script writes the new AgentBox IDs to a log so you can populate those and keep both systems linked.

  **Running the script (you do this, with your own API key):**
  ```bash
  pip install requests
  export AGENTBOX_CLIENT_ID="..."        # admin-issued, from AgentBox
  export AGENTBOX_API_KEY="..."
  python 04_agentbox_api_push.py --probe                     # 1) confirm live field names
  python 04_agentbox_api_push.py --resource contacts         # 2) DRY RUN (prints, sends nothing)
  python 04_agentbox_api_push.py --resource contacts --live --limit 5   # 3) test 5 real records
  python 04_agentbox_api_push.py --resource contacts --live  # 4) full run
  # then properties, then listings
  ```
  It is **dry-run by default**, skips test rows and records that already have an AgentBox ID, dedupes contacts by email, throttles requests, and logs every result to `api_push_results.csv`. **Always run `--probe` first** — AgentBox field names vary by account/version, and the `*_MAP` dicts at the top of the script are where you align them. The auth headers (`X-Client-ID` / `X-API-Key`) follow AgentBox's documented scheme; if your office uses query-string auth instead, the script shows where to switch. Since this writes to the shared Sotheby's account, get sign-off and start with `--limit`.

Either way, do contacts first (step 4) so properties/listings link to real contact records.

---

## 6. Verify (don't skip)

- Compare AgentBox's import report count to your CSV row count (minus test rows you deleted).
- Spot-check 5–10 contacts in AgentBox: name, mobile, email, class, and that Notes carried across.
- Re-run **Block 10** counts and tick each entity off as loaded.
- Confirm notes visibility matches your intent (Publish Note setting).

---

## 7. Order of operations (summary)

```
Export CSVs (Studio)  →  Clean contacts file  →  Import contacts (self-serve)
        →  Send property/listing/sales CSVs to AgentBox Support or push via API
        →  Verify counts & spot-check  →  Keep import reports
```

---

### Files in this pack
- `01_SQL_EXPORT_PACK.sql` — run-and-download queries (one per CSV)
- `02_MIGRATION_GUIDE.md` — this runbook
- `03_FIELD_MAPPING.csv` — the contact field map as a spreadsheet (same as §3)
- `04_agentbox_api_push.py` — optional API loader for contacts/properties/listings (dry-run by default)
