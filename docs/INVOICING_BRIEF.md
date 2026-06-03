# Build Brief: Invoicing Tab (Cursor)

> Hand this whole file to Cursor. It is written against the DataDungeon codebase
> conventions in `CLAUDE.md`. Follow the existing patterns referenced below
> rather than inventing new ones.

## 1. Goal (plain English)

Greg pays marketing suppliers (photographers, videographers, Meta/Instagram ad
spend) **out of his own pocket on behalf of his vendors**, then invoices his
agency — **Queensland Sotheby's International Realty** — to be reimbursed.
Sotheby's takes ~30 days to pay. Right now there's no single place to see what
has been billed, what's still owed, and what's overdue.

**Key framing — everything is money owed back to Greg.** Greg is personally
responsible for paying his trades, so a supplier bill (e.g. Paynter & Williams)
is NOT a "supplier I owe" in the usual accounts-payable sense — it's a
**reimbursable cost**: once Greg pays it, that money is owed back to him. The
page must therefore center on his **recoverable / out-of-pocket position**, not
on amounts payable. Both an uninvoiced paid supplier bill AND a sent
reimbursement invoice represent money "owed to me".

Build a **dedicated Invoicing page** (`/invoices`) that lets Greg:

1. **Track every invoice** — both the bills suppliers send *him* (reimbursable
   costs) and the invoices *he* sends Sotheby's — with status.
2. **Upload the original PDF** of any invoice and keep it attached.
3. **Generate his own invoices in-app** (like his current Word template) and
   export a clean branded PDF — including **one-click "raise a reimbursement
   invoice" from one or more paid supplier bills**.
4. **Link each invoice to a listing and a vendor contact** so it rolls up onto
   the listing detail page.
5. See his **recoverable position at a glance**: how much is owed back to him
   (invoiced + unbilled paid costs), what's **overdue past 30 days**, and how
   much he's currently **out of pocket**.

## 2. The two real-world examples (use as fixtures / test data)

These two files describe the **same property** (`20 Hickory Drive, Narangba`)
and are the two directions the data model must handle. **Both are ultimately
money owed back to Greg.**

### A. Incoming bill — supplier → Greg (`direction = 'incoming'`, reimbursable)
Greg is responsible for paying this; once paid it's owed back to him.
- **From:** Paynter & Williams Pty Ltd · ABN 95 664 041 241 · Phone 1300 175 593
- **To:** Greg Leigh
- **Invoice no:** INV-1187
- **Issue date:** 5 May 2026 · **Due:** 4 Jun 2026 (their terms: 7 days)
- **Line:** "20 Hickory Drive, Narangba — Sotheby's QLD: Imagery, Floor Plan &
  Property Video + 6 x Virtual Staging" · qty 1 · $1,280.00
- **GST:** 10% **inclusive**, GST component $116.36 · **Total $1,280.00 AUD**
- Their bank (to pay them): CBA · BSB 064138 · Acc 1074 6176

### B. Outgoing invoice — Greg → Sotheby's (`direction = 'outgoing'`, receivable)
- **From:** Greg Leigh, Real Estate Sales Executive, Queensland Sotheby's
  International Realty · Thornlands, QLD · sunofsep@gmail.com
- **To:** Accounts Department, Queensland Sotheby's International Realty
- **Invoice no:** INV-006
- **Issue date:** 1 May 2026
- **Property:** 20 Hickory Drive, Narangba
- **Line:** "Social Media — Marketing Spend / Instagram / Meta advertising
  campaigns for property listing" · qty 1 · $500.00
- **GST:** N/A (reimbursement, not a supply) · **Total Due $500.00**
- Greg's bank (to be paid): Westpac — Choice Basic · BSB 734-059 · Acc 837828 ·
  Ref INV-006
- **Notes (must be reproducible on generated invoices):** "Reimbursement of
  Social Media (Meta/Instagram) advertising expenses paid from personal funds…
  No ABN quoted: this reimbursement is not a supply of goods or services. It is
  an internal expense reimbursement between an employee/contractor and their
  principal agency. No ABN withholding is required."

> The amounts don't match 1:1 — one property generates several supplier bills,
> and one reimbursement invoice may bundle several of them. Model the link as
> **many incoming bills → one outgoing reimbursement invoice** (see §5).

## 3. Relationship to existing tables (read before coding)

The repo **already** has marketing-cost modelling on listings — do not
duplicate it, complement it:

- `listing_campaign_expenses` (see `src/hooks/useListingMarketingFunds.ts`):
  `supplier`, `invoice_no`, `category`, `cost`, `office_paid`, `agent_paid`,
  `vendor_paid`, `supplier_status`. This is the per-listing cost ledger.
- `listing_marketing_funds`: `approved_amount`, `received_amount`.

The new `invoices` feature is a **standalone, document-centric tracker** (real
invoice records + PDFs + status lifecycle + reimbursement linking), not a
per-line cost ledger. Keep them separate. In Phase 3 we optionally cross-link an
invoice to a `listing_campaign_expenses` row, but that is not required for
Phase 1.

## 4. Conventions to follow (from CLAUDE.md + existing code)

- **Data layer:** TanStack Query hooks in `src/hooks/`, calling the typed client
  `src/integrations/supabase/client.ts`. Cache keys like `["invoices"]`,
  `["invoice", id]`, `["listing_invoices", listingId]`. Mutations call
  `queryClient.invalidateQueries`.
- **Errors:** wrap with `supabaseErrorMessage` (`src/lib/supabaseErrorMessage.ts`)
  and tolerate `error.code === "42P01"` (table missing) by returning `[]`, exactly
  like `useListingMarketingFunds.ts`.
- **Auth/ownership:** every insert sets `user_id` from
  `supabase.auth.getUser()`. All tables RLS-scoped to `auth.uid()`.
- **Migrations:** timestamp-named file in `supabase/migrations/`, RLS enabled,
  `update_updated_at_column()` trigger for `updated_at`, end with
  `NOTIFY pgrst, 'reload schema';`. Then `npm run db:push` and
  `npm run supabase:gen-types` (NEVER hand-edit `types.ts`).
- **Storage:** mirror `contact-documents`
  (`supabase/migrations/20260222000000_contact_documents.sql` +
  `src/hooks/useContactDocuments.ts`): private bucket, path
  `${user.id}/${invoiceId}/${uuid}_${safeName}`, signed URLs (1h), 4 storage
  RLS policies keyed on `(storage.foldername(name))[1] = auth.uid()::text`.
- **Routing:** lazy-load + `<ProtectedRoute><MainLayout><ErrorBoundary>…` in
  `src/App.tsx`. Print route gets NO MainLayout (copy the `/contacts/:id/print`
  pattern → `ContactPrintPage`).
- **Nav:** add to `businessItems` in
  `src/components/layout/SidebarNavigation.tsx`, add an `isNavActive` clause, and
  add the item to the mobile "More" dropdown.
- **UI:** shadcn/ui + Tailwind, Zoho dark theme, primary teal `#00BCD4`. Reuse
  existing `Card`, `Table`, `Badge`, `Dialog`/`Sheet`, `Tabs`, `Select`,
  `Button`, `Input`. Tokens in `src/lib/designTokens.ts`.
- **Tests:** pure logic gets a `*.test.ts` (vitest, runs under `TZ=UTC`). CI gate
  is `npm run verify` (build + vitest).

## 5. Data model (Phase 1 migration)

New migration `supabase/migrations/<timestamp>_invoices.sql`.

### Table `public.invoices`
| column | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| user_id | uuid not null | → `auth.users(id)` on delete cascade |
| direction | text not null | CHECK in (`'outgoing'`,`'incoming'`). outgoing = Greg→agency (reimbursement he raises); incoming = supplier→Greg (a cost he pays and recovers) |
| invoice_number | text not null | Greg's own sequence for outgoing (INV-006…); supplier's number for incoming (INV-1187) |
| status | text not null default `'draft'` | CHECK in (`'draft'`,`'sent'`,`'paid'`,`'overdue'`,`'void'`,`'unpaid'`). **Semantics differ by direction** — outgoing: draft→sent→paid (paid = agency paid me); incoming: unpaid→paid (paid = I've paid the trade). `overdue` derived in UI for outgoing |
| source | text not null default `'uploaded'` | CHECK in (`'uploaded'`,`'generated'`) |
| reimbursable | boolean not null default true | incoming only — is this cost claimable back from the agency? |
| reimbursement_invoice_id | uuid | incoming only → `public.invoices(id)` on delete set null. The outgoing invoice that claims this bill. NULL + paid + reimbursable ⇒ "unbilled cost" |
| counterparty_name | text not null | "Queensland Sotheby's International Realty" or "Paynter & Williams Pty Ltd" |
| counterparty_abn | text | nullable |
| listing_id | uuid | → `public.listings(id)` on delete set null |
| contact_id | uuid | vendor → `public.contacts(id)` on delete set null |
| property_address | text | denormalised free text ("20 Hickory Drive, Narangba") |
| issue_date | date not null | |
| terms_days | int not null default 30 | outgoing default 30; incoming uses supplier's terms |
| due_date | date not null | default = issue_date + terms_days (compute in app) |
| currency | text not null default `'AUD'` | |
| gst_mode | text not null default `'none'` | CHECK in (`'none'`,`'inclusive'`,`'exclusive'`). outgoing reimbursements = `none` |
| subtotal | numeric(12,2) not null default 0 | |
| gst_amount | numeric(12,2) | nullable |
| total | numeric(12,2) not null default 0 | |
| notes | text | the reimbursement/no-ABN block for generated invoices |
| file_path | text | uploaded original in storage bucket |
| file_name | text | |
| file_size | integer | |
| mime_type | text | |
| paid_date | date | incoming: date I paid the trade. outgoing: date agency paid me |
| paid_amount | numeric(12,2) | |
| created_at | timestamptz not null default now() | |
| updated_at | timestamptz not null default now() | `update_updated_at_column()` trigger |

Indexes: `(user_id, direction, status)`, `(listing_id)`, `(contact_id)`,
`(due_date)`, `(reimbursement_invoice_id)`.

### Table `public.invoice_line_items`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| invoice_id | uuid not null | → `public.invoices(id)` on delete cascade |
| user_id | uuid not null | → `auth.users(id)` on delete cascade |
| description | text not null | |
| quantity | numeric not null default 1 | |
| unit_price | numeric(12,2) not null default 0 | |
| gst_rate | numeric not null default 0 | 0 or 10 |
| amount | numeric(12,2) not null default 0 | = quantity × unit_price |
| position | int not null default 0 | ordering |
| created_at | timestamptz not null default now() | |

Index: `(invoice_id, position)`.

### RLS — use the **direct `user_id = auth.uid()`** form
(like `contact_documents`, the simplest correct pattern here) for BOTH tables:
`SELECT/INSERT/UPDATE/DELETE` policies all gated on `user_id = auth.uid()`
(insert/update use `WITH CHECK (user_id = auth.uid())`).

### Storage bucket `invoices`
Copy the four `storage.objects` policies from the contact-documents migration,
substituting bucket id `'invoices'`. Private bucket. Path layout:
`${user.id}/${invoiceId}/${uuid}_${safeName}`.

End the migration with `NOTIFY pgrst, 'reload schema';`.

## 6. Business logic (`src/lib/`) — pure + tested

- `invoiceTotals.ts` — `computeTotals(lineItems, gstMode)` → `{ subtotal,
  gstAmount, total }`. `none` → gstAmount null, total = subtotal. `inclusive` →
  gstAmount = total × 1/11. `exclusive` → gstAmount = subtotal × rate, total =
  subtotal + gst. **+ `invoiceTotals.test.ts`** covering all three modes and the
  two fixtures ($1,280 inclusive → GST 116.36; $500 none → GST null).
- `invoiceStatus.ts` — `deriveStatus(invoice, today)` returning effective status
  (outgoing `sent` + `due_date < today` + unpaid → `overdue`); `isOverdue`,
  `daysUntilDue`, `statusBadgeVariant`. **+ `invoiceStatus.test.ts`** (relies on
  `TZ=UTC`).
- `invoiceNumber.ts` — `nextInvoiceNumber(existingNumbers, prefix='INV-')` →
  next zero-padded number for **outgoing** invoices only. **+ test.**
- `recoverablePosition.ts` — given all invoices, compute the KPI numbers in §8
  (owed-to-me, overdue, unbilled paid costs, out-of-pocket) with **no double
  counting** (a bill linked to an outgoing invoice is counted on the outgoing
  side only). **+ `recoverablePosition.test.ts`** using the two fixtures.
- `invoiceIssuer.ts` — Greg's default issuer block (name, title, agency,
  suburb, email, Westpac bank details) for generated invoices. Single source of
  truth; later movable to Settings.

## 7. Hooks (`src/hooks/useInvoices.ts`)

Model on `useListingMarketingFunds.ts` + `useContactDocuments.ts`:

- `useInvoices(filters?)` → list (`["invoices", filters]`), `42P01` → `[]`.
- `useInvoice(id)` → header + line items + signed URL for `file_path` + (for
  outgoing) the incoming bills it reimburses; (for incoming) its reimbursement
  invoice.
- `useListingInvoices(listingId)` → `["listing_invoices", listingId]` for the
  listing roll-up panel.
- `useCreateInvoice()` / `useUpdateInvoice()` / `useDeleteInvoice()` — header +
  line items in the same mutation; recompute totals via `invoiceTotals`.
- `useUploadInvoiceFile()` — upload to `invoices` bucket, set
  `file_path/name/size/mime_type` (copy upload logic from
  `useContactDocuments.ts`).
- `useMarkInvoicePaid()` — sets `status='paid'`, `paid_date`, `paid_amount`.
  Works both ways (incoming = I paid the trade; outgoing = agency paid me).
- `useRaiseReimbursementInvoice()` — **the headline workflow**: takes one or more
  incoming bill ids, creates an outgoing invoice pre-filled from them (line items
  derived from the bills, property/listing/vendor copied, `gst_mode='none'`,
  next outgoing number, notes prefilled with the reimbursement block), and sets
  `reimbursement_invoice_id` on each source bill to the new invoice.
- `useInvoiceSummary()` — returns the §8 KPIs via `recoverablePosition.ts`.

## 8. Page UI — `src/pages/Invoices.tsx` (route `/invoices`)

Layout top→bottom:

1. **Header row** — title "Invoicing" + buttons: **"New invoice"** (generate),
   **"Log a bill"** (record/upload a supplier bill), **"Upload PDF"**.
2. **Summary cards** (`InvoiceSummaryCards.tsx`), teal accents — all about what's
   owed to Greg:
   - **Owed to me** — Σ outgoing unpaid (sent + overdue) **+** Σ reimbursable
     incoming bills not yet linked to an outgoing invoice. The total he should
     get back. (Compute via `recoverablePosition` to avoid double counting.)
   - **Overdue** — Σ outgoing past due_date & unpaid (red).
   - **Unbilled costs** — Σ reimbursable bills he's **paid** but not yet raised a
     reimbursement invoice for → action: "raise invoice". (This is the leak to
     prevent.)
   - **Out of pocket** — Σ supplier bills paid − Σ reimbursements received =
     current cash exposure.
3. **Tabs / filters** — **All** · **Owed to me (sent)** · **To invoice**
   (paid-but-unbilled bills) · **Bills** · **Paid/closed**. Plus status `Select`,
   text search (number/counterparty/address), optional listing filter.
4. **Table** (`InvoiceList.tsx`) columns: Status badge · Number · Direction ·
   Counterparty · Property/listing (link) · Issue date · Due date ("X days
   overdue" in red) · Total · Reimbursement state (for bills: Unbilled /
   Invoiced #/ Reimbursed) · actions (View, Mark paid, Raise reimbursement,
   Download PDF, Edit, Delete). Row click → detail.
5. **Detail** — right-hand `Sheet` (`InvoiceDetailSheet.tsx`): full fields, line
   items, linked listing/vendor, attached PDF, status actions, the linked
   bills/invoice on the other side, and "Open print view" → `/invoices/:id/print`.

### Components (`src/components/invoices/`)
- `InvoiceFormDialog.tsx` — create/edit. Fields: direction, number (auto-suggest
  next for outgoing via `invoiceNumber`), counterparty (+ABN), `reimbursable`
  toggle (incoming), listing picker (auto-fills property_address + vendor),
  issue date, terms_days (default 30 → auto due_date), gst_mode, editable line
  items with live totals, notes (prefilled reimbursement block for outgoing),
  optional file upload.
- `RaiseReimbursementDialog.tsx` — pick paid unbilled bills → preview the
  generated outgoing invoice → confirm (calls `useRaiseReimbursementInvoice`).
- `InvoiceStatusBadge.tsx`, `InvoiceSummaryCards.tsx`, `InvoiceList.tsx`,
  `InvoiceDetailSheet.tsx`, `InvoiceUploadDialog.tsx`.

## 9. In-app PDF generation — `src/pages/InvoicePrintPage.tsx`

Route `/invoices/:id/print` (NO MainLayout — copy `ContactPrintPage` wiring in
`App.tsx`). Render a clean A4 invoice styled to match Greg's INV-006 (issuer
block from `invoiceIssuer.ts`, To/agency block, property reference, line-item
table, subtotal/GST/total, Greg's Westpac payment details, notes). Use the
existing print-to-PDF approach (browser print) — **do not add a heavy PDF
dependency**. "Download PDF" / "Open print view" navigate here and trigger
`window.print()`.

## 10. Listing roll-up (Phase 3)

`src/components/listings/ListingInvoicesPanel.tsx` using
`useListingInvoices(listingId)`, mounted on `src/pages/ListingDetail.tsx`
alongside the existing marketing/expenses panels: table of invoices for that
listing + a **"Reimbursable position"** mini-summary (Σ bills paid vs Σ
invoiced vs Σ received → net still owed to Greg on this listing).

## 11. Wiring checklist
- [ ] `src/App.tsx`: lazy `Invoices`, `InvoicePrintPage`; add `/invoices`
      (Protected+MainLayout+ErrorBoundary) and `/invoices/:id/print`
      (Protected only).
- [ ] `src/components/layout/SidebarNavigation.tsx`: import `Receipt` from
      lucide; add `{ title: "Invoices", url: "/invoices", icon: Receipt }` to
      `businessItems`; add `isNavActive` clause for `/invoices`; add to mobile
      "More" dropdown.
- [ ] Run `npm run db:push` then `npm run supabase:gen-types`.
- [ ] `npm run verify` is green.

## 12. Acceptance criteria
1. `/invoices` shows the recoverable-position summary cards + filterable table;
   empty state when none.
2. Can **upload** a PDF and log details for both fixtures; correct
   direction/status/total; PDF re-downloadable via signed URL.
3. A reimbursable supplier bill marked **paid** but with no reimbursement invoice
   appears under **Unbilled costs** and the "To invoice" tab.
4. **"Raise reimbursement invoice"** from that paid bill creates a linked
   outgoing invoice (next INV- number, gst_mode none, reimbursement note), and
   the bill flips to "Invoiced". No double counting in the cards.
5. Marking the outgoing invoice paid moves it out of "Owed to me", reduces
   "Out of pocket", and flips the linked bill(s) to "Reimbursed".
6. An outgoing invoice past `due_date` and unpaid shows **Overdue** (red) and
   counts in the Overdue card.
7. Generated invoice prints cleanly at `/invoices/:id/print`, matching INV-006's
   structure incl. the no-ABN reimbursement note.
8. All data is `user_id`-scoped via RLS; `npm run verify` passes; new pure-logic
   modules have tests.

## 13. Phasing
- **Phase 1 (core + reimbursement model):** migration + storage bucket,
  `useInvoices`, totals/status/number/recoverable libs + tests, `/invoices` page
  (cards, tabs, table, create/edit, log bill, upload, mark-paid, raise
  reimbursement), nav + routing.
- **Phase 2 (generate):** `InvoicePrintPage` + issuer config + the generate +
  raise-reimbursement flows producing a printable PDF.
- **Phase 3 (integrate):** `ListingInvoicesPanel` roll-up; optional cross-link
  to `listing_campaign_expenses`; optional overdue reminder (reuse the existing
  notification/cron patterns).

## 14. Out of scope (for now)
Multi-tenant/teams; emailing invoices to Sotheby's from the app; payment
gateway/Stripe; recurring invoices; multi-currency beyond AUD; OCR auto-extract
from uploaded PDFs (could be a later enhancement).
