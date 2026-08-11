# Agent Brief: DataDungeon Direct Database Access

**For:** Claude agent "Charlie"  
**App:** DataDungeon — real estate CRM (Queensland, Australia)  
**Live app:** https://tiny-brioche-b979f7.netlify.app  

---

## How to Connect

Use the **Supabase MCP `execute_sql` tool** with:

```
project_id: sujyalrzbubvhpkntwja
```

This runs as the Postgres service role, bypassing RLS entirely — no auth token needed.

The user's fixed `user_id` (always required in every insert):

```
e1bd63ad-b120-4a5a-91c0-c3189bc8938c
```

---

## 1. Adding an Invoice

### Required fields

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | Always `e1bd63ad-b120-4a5a-91c0-c3189bc8938c` |
| `direction` | text | `'incoming'` (bill received) or `'outgoing'` (bill sent by Greg) |
| `invoice_number` | text | e.g. `'INV-1279'` |
| `counterparty_name` | text | The other party's name |
| `issue_date` | date | `'YYYY-MM-DD'` |
| `due_date` | date | `'YYYY-MM-DD'` |
| `subtotal` | numeric | Before GST |
| `total` | numeric | Grand total (inc. GST if applicable) |

### Optional but common

| Field | Type | Notes |
|---|---|---|
| `status` | text | `'draft'` `'unpaid'` `'paid'` `'overdue'` `'void'` `'sent'` — default `'draft'` |
| `source` | text | `'uploaded'` or `'generated'` — default `'uploaded'` |
| `reimbursable` | boolean | `true` if it's a cost Greg will claim back — default `true` |
| `counterparty_abn` | text | ABN of the other party |
| `gst_mode` | text | `'none'` `'inclusive'` `'exclusive'` — default `'none'` |
| `gst_amount` | numeric | GST component |
| `terms_days` | integer | Payment terms in days — default `30` |
| `notes` | text | Free text — good place to store payment/bank details |
| `property_address` | text | Street address if invoice relates to a property |
| `listing_id` | uuid | FK to `listings.id` if relevant |
| `contact_id` | uuid | FK to `contacts.id` if relevant |
| `paid_date` | date | When paid |
| `paid_amount` | numeric | Amount paid |
| `file_path` | text | Storage path if a PDF is attached |

### Line items (separate table)

After inserting the invoice, insert line items into `invoice_line_items`:

| Field | Type | Notes |
|---|---|---|
| `invoice_id` | uuid | FK to the invoice just created |
| `user_id` | uuid | Same user_id as above |
| `description` | text | Line description |
| `quantity` | numeric | Default `1` |
| `unit_price` | numeric | Per unit ex-GST |
| `gst_rate` | numeric | `0.10` for 10% GST, `0` for none |
| `amount` | numeric | `quantity × unit_price` |
| `position` | integer | Sort order, start at `0` |

### Example — inserting an incoming invoice

```sql
WITH ins AS (
  INSERT INTO public.invoices (
    user_id, direction, invoice_number, status, source, reimbursable,
    counterparty_name, counterparty_abn,
    issue_date, terms_days, due_date,
    currency, gst_mode, subtotal, gst_amount, total, notes
  ) VALUES (
    'e1bd63ad-b120-4a5a-91c0-c3189bc8938c',
    'incoming',
    'INV-1279',
    'unpaid',
    'uploaded',
    true,
    'Australian Asia Pacific Property Pty Ltd atf AAPP Sales Trust',
    '40 868 376 197',
    '2026-06-16',
    7,
    '2026-06-23',
    'AUD',
    'exclusive',
    227.27, 22.73, 250.00,
    'Reference: Managed Office Costs. EFT: BSB 034-070, Acct 578591'
  )
  RETURNING id
)
INSERT INTO public.invoice_line_items (
  invoice_id, user_id, description, quantity, unit_price, gst_rate, amount, position
)
SELECT id, 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c',
  'Managed Office Costs - May 26', 1, 227.27, 0.10, 227.27, 0
FROM ins;
```

---

## 2. Creating a Contact

### Key fields

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | Always `e1bd63ad-b120-4a5a-91c0-c3189bc8938c` |
| `first_name` | text | nullable |
| `last_name` | text | nullable |
| `email` | text | nullable |
| `phone` | text | nullable |
| `mobile` | text | nullable |

### Status / classification fields (all have defaults)

| Field | Default | Valid values (check constraint — exact match required) |
|---|---|---|
| `lead_status` | `'new'` | `'new'` `'contacted'` `'qualified'` `'nurture'` `'unqualified'` `'customer'` |
| `lifecycle_stage` | `'lead'` | `'subscriber'` `'lead'` `'marketing_qualified'` `'sales_qualified'` `'opportunity'` `'customer'` `'past_customer'` |
| `contact_type` | — | `'buyer'` `'seller'` `'landlord'` `'tenant'` `'investor'` `'both'` |
| `contact_category` | `'warm_lead'` | `'top_100'` `'past_client'` `'referral_partner'` `'hot_lead'` `'warm_lead'` `'seller_nurture'` `'active_buyer'` `'seller_lead'` `'prospect'` |
| `timeframe_category` | `'TIMEFRAME_UNKNOWN'` | leave as default unless known |
| `lead_temperature` | `'LEAD_COLD'` | `'LEAD_HOT'` `'LEAD_WARM'` `'LEAD_COLD'` |
| `country` | `'Australia'` | |

### Address fields

Use `address_line1`, `address_line2`, `suburb`, `city`, `state`, `postcode`, `country`.  
(`address` is a legacy single-line fallback — prefer the split columns.)

### Other useful fields

`company_name`, `job_title`, `title`, `salutation`, `date_of_birth` (date), `notes`, `tags` (text[]), `source`, `contact_type`, `buying_budget_min`, `buying_budget_max`, `preferred_suburbs` (text[]).

### Example

```sql
INSERT INTO public.contacts (
  user_id, first_name, last_name, email, mobile,
  address_line1, suburb, state, postcode,
  contact_type, lead_status, lifecycle_stage, contact_category, notes
) VALUES (
  'e1bd63ad-b120-4a5a-91c0-c3189bc8938c',
  'Jane', 'Smith', 'jane@example.com', '0412 000 111',
  '42 Example St', 'Cleveland', 'QLD', '4163',
  'buyer', 'new', 'lead', 'warm_lead',
  'Met at open home on 15 Jun 2026'
);
```

---

## 3. Creating a Property

### Key fields

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | Always `e1bd63ad-b120-4a5a-91c0-c3189bc8938c` |
| `street_address` | text | nullable |
| `suburb` | text | nullable |
| `state` | text | nullable |
| `postcode` | text | nullable |
| `country` | text | default `'Australia'` |

### Property detail fields

| Field | Type | Notes |
|---|---|---|
| `property_type` | text | e.g. `'house'` `'unit'` `'land'` `'townhouse'` |
| `bedrooms` | integer | |
| `bathrooms` | integer | |
| `car_spaces` | integer | |
| `land_area_sqm` | numeric | |
| `floor_area_sqm` | numeric | |
| `year_built` | integer | |
| `listing_status` | text | default `'prospect'` — `'prospect'` `'active'` `'sold'` `'withdrawn'` |
| `list_price` | numeric | |
| `sale_price` | numeric | |
| `estimated_value` | numeric | |
| `property_description` | text | |
| `features` | text[] | e.g. `ARRAY['pool','air_conditioning']` |
| `notes` | text | |
| `appraisal_date` | date | |
| `contract_date` | date | |
| `settlement_date` | date | |
| `owner_contact_id` | uuid | FK to `contacts.id` — the property owner |
| `latitude` | float | |
| `longitude` | float | |

### Example

```sql
INSERT INTO public.properties (
  user_id, street_address, suburb, state, postcode,
  property_type, bedrooms, bathrooms, car_spaces,
  land_area_sqm, listing_status, estimated_value, notes
) VALUES (
  'e1bd63ad-b120-4a5a-91c0-c3189bc8938c',
  '12 Harbour View Cres', 'Raby Bay', 'QLD', '4163',
  'house', 4, 2, 2,
  650, 'prospect', 1250000,
  'Waterfront block, owner considering selling mid-2026'
);
```

---

## Looking Up Existing Records

### Find a contact by name

```sql
SELECT id, first_name, last_name, email, mobile
FROM public.contacts
WHERE user_id = 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c'
  AND (first_name ILIKE '%Jane%' OR last_name ILIKE '%Smith%')
LIMIT 10;
```

### Find a property by address

```sql
SELECT id, street_address, suburb, property_type, listing_status
FROM public.properties
WHERE user_id = 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c'
  AND street_address ILIKE '%Harbour%'
LIMIT 10;
```

### Find invoices

```sql
SELECT id, invoice_number, direction, status, counterparty_name, total, due_date
FROM public.invoices
WHERE user_id = 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c'
ORDER BY issue_date DESC
LIMIT 20;
```

---

## Rules / Gotchas

- **Always include `user_id`** in every INSERT — RLS is bypassed by the MCP service role, but the app filters everything by `user_id`, so missing it means the record never appears in the UI.
- **`classification_meta`** on contacts defaults to `'{}'::jsonb` — you don't need to set it.
- Contacts have both `address` (legacy single text) and `address_line1`/`suburb` etc. (preferred). Use the split columns.
- Properties have both `address` and `street_address` — use `street_address`.
- Invoice `status` must be one of: `'draft'` `'sent'` `'paid'` `'overdue'` `'void'` `'unpaid'`.
- Invoice `direction` must be `'incoming'` or `'outgoing'`.
- Invoice `gst_mode` must be `'none'` `'inclusive'` or `'exclusive'`.
- After inserting anything, the app picks it up automatically on next page load — no cache flush needed.

---

## Telegram → CRM Command Vocabulary

Greg will send commands via Telegram. Parse and execute them using the SQL patterns above.

### Commands

**`/crm contact [First Last] - [phone] - [notes]`**
Upsert a contact. Dedup: check `phone` first, then `first_name + last_name`. If exists, append notes. If new, insert with `lead_status: 'new'`, `contact_category: 'warm_lead'`.

**`/crm task [contact name] | [task title] | [due date]`**
Find contact by name (use ILIKE), insert into `contact_tasks` with `user_id`, `contact_id`, `title`, `due_at`.

**`/crm note [contact name] | [note text]`**
Find contact by name. Insert into `activity_log` (`activity_type: 'note'`, `title` = first 100 chars of note, `description` = full note, `contact_id`). Then insert into `touches` (`touch_type: 'other'`, `logged_by: OWNER_USER_ID`).

**`/crm meeting [freeform description of meeting]`**
Parse the description with Claude to extract contacts, properties, tasks, and a summary. Then:
1. Upsert contacts (dedup by phone → name)
2. Insert `activity_log` row (`activity_type: 'meeting'`)
3. Insert `touches` per contact (`touch_type: 'call'` or `'other'`)
4. Insert `contact_tasks` for any action items mentioned

**`/crm property [address] | [details]`**
Insert into `properties`. Parse beds/baths/type from details. Link `owner_contact_id` if a contact name is mentioned and found.

**`[photo of business card or document]`**
Use Claude Vision to extract: first_name, last_name, phone, email, company, job_title. Upsert as contact (dedup by phone → name). Confirm back what was extracted before inserting.

**`[voice note with no prefix]`**
Transcribe. Ask: "Add to CRM as meeting note?" If yes, treat as `/crm meeting`.

### Dedup SQL (use before every contact insert)

```sql
-- Check by phone
SELECT id FROM public.contacts
WHERE user_id = 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c'
  AND (phone = '[phone]' OR mobile = '[phone]')
LIMIT 1;

-- If not found, check by name
SELECT id FROM public.contacts
WHERE user_id = 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c'
  AND first_name ILIKE '[first]' AND last_name ILIKE '[last]'
LIMIT 1;
```

### Insert touch after every contact interaction

```sql
INSERT INTO public.touches (contact_id, touch_type, notes, logged_by, touch_date)
VALUES ('[contact_id]', 'other', '[brief note]', 'e1bd63ad-b120-4a5a-91c0-c3189bc8938c', now());
```

Valid `touch_type` values: `'call'` `'email'` `'sms'` `'handwritten_card'` `'break_bread'` `'pop_by'` `'housing_update_video'` `'weekly_email'` `'monthly_mailer'` `'birthday_card'` `'annual_review'` `'community_event'` `'social_media'` `'other'`

### activity_log valid types

`'note'` `'call'` `'email'` `'inspection'` `'status_change'` `'system'` `'open_house'` `'settlement'` `'meeting'` `'voice_recording'`
