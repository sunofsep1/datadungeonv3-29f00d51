# iD4me "Research Room" — Implementation Plan

**Goal:** A dedicated section in DataDungeon where you pick (or search for) a contact, look up / verify their contact details via iD4me, and write the confirmed details straight back onto the contact record. A research room for contacts.

**Status:** Fallback shipped at `/contact-research` (new-tab iD4me + contact copy hints). Native API + write-back still pending (Section 3A).

**Out of scope:** This feature does **not** depend on AI Ops or Perplexity Research. Those routes are removed from the sidebar and redirect to Home; iD4me gets its own dedicated page when built.

---

## 1. Key context (grounded in your codebase)

- **You own the app.** DataDungeon is your React + Vite + Supabase codebase — no iframe-only limitation. A native section is fully on the table.
- **You already have the exact proxy pattern needed.** `supabase/functions/pricefinder-proxy` shows the template: an edge function that holds the third-party key as a Supabase secret, verifies the user's JWT, calls the external API, returns JSON. iD4me would be `id4me-proxy`.
- **Your `contacts` table is rich enough for clean write-back.** Relevant columns already exist: `email`, `mobile`, `phone`, `home_phone`, `address_line1`, `address_line2`, `city`, `postcode`, `country`. No schema change needed just to save results onto a contact.
- **Bonus AML tie-in.** `contacts` has `aml_id_verified`, `aml_verified_at`, `aml_notes`, `aml_pep_clear`. iD4me is an identity/contact-verification tool, so a successful lookup can also stamp the AML verification fields — turning the Research Room into part of your compliance workflow, not just a lookup gadget.

---

## 2. The one real dependency: does iD4me have an API?

This is the fork in the road. Everything else is standard DataDungeon work.

- **iD4me API exists (preferred).** Their FAQ hints at bulk-data / API access via an account manager — not self-serve. If you get an API key, we build the full native version (Section 3A). **Action: email the account manager to confirm API access, auth method, rate limits, and pricing.**
- **No API available.** We ship the iframe fallback (Section 3B) — useful immediately, but no auto-fill or write-back.

I'd recommend building so the no-API version ships first regardless, then swapping in the API when/if you get the key. The UI is the same; only the data source changes.

---

## 3A. Native version (requires iD4me API)

### Architecture

```
Research Room UI  →  id4me-proxy (edge fn, holds API key, JWT-verified)  →  iD4me API
        │
        └─ "Save to contact" → useContacts update mutation → contacts table
        └─ every lookup logged → contact_research_lookups table (RLS)
```

### Pieces

**1. Edge function `supabase/functions/id4me-proxy/index.ts`**

- Clone the shape of `pricefinder-proxy`: CORS headers, read `ID4ME_API_KEY` (+ any client id/secret) from `Deno.env`, verify the caller's Supabase session, return `503` with a friendly message if the key isn't configured.
- Accepts a search payload: `{ name?, address?, phone?, email?, postcode? }`.
- Calls iD4me's search endpoint, normalises the response to a stable shape, returns it.
- Deploy via the existing `npm run supabase:deploy:<name>` convention. Set `ID4ME_API_KEY` as a Supabase secret (Dashboard), **not** in `.env` — same as `NEWS_API_KEY`.
- Keep JWT verification ON (this is private data — unlike `inbound-lead`/`pricefinder-proxy` which are public webhooks).

**2. Data hook `src/hooks/useId4meLookup.ts`**

- TanStack Query (`useMutation`) wrapping a `fetch` to `${VITE_SUPABASE_URL}/functions/v1/id4me-proxy` with the bearer token — same pattern as other authenticated edge-function calls in the app.
- Returns normalised results + loading/error states.

**3. (Optional) Table `contact_research_lookups`** — migration in `supabase/migrations/`

- Columns: `id`, `user_id` (default `auth.uid()`), `contact_id` (nullable — lookups can be for a not-yet-saved person), `query` (jsonb), `results` (jsonb), `source` (`'id4me'`), `created_at`.
- RLS: `user_id = auth.uid()` for all ops — matches every other user-owned table.
- Purpose: history ("you researched this person last week"), audit trail for AML, and avoids re-querying (cost control).
- Regenerate types after: `npm run supabase:gen-types`.

**4. UI — the Research Room itself**

**Dedicated route** (recommended): `/contact-research` or `/research/contacts`, with its own sidebar item under the **Contacts** group (e.g. "Contact research" or "Find contact"). Lazy import in `App.tsx`, `NavItem` in `SidebarNavigation.tsx`.

Do **not** combine this with `/research` (Perplexity) or `/ai-ops` — separate page, separate purpose.

The panel contains:

- Search form (name / address / phone / email / postcode).
- Optional "prefill from contact" — when launched from a contact, auto-populate the search from `first_name`/`last_name`/`address`. (Mirrors how `LogTouchDialog` is wired globally.)
- Results list. Each result → **"Save to contact"** button that runs the `useContacts` update mutation against `email` / `mobile` / `phone` / `home_phone` / `address_line1` / `city` / `postcode`, and optionally sets `aml_id_verified = true`, `aml_verified_at = now()`, `aml_notes`.
- A "copy to clipboard" affordance for fields you don't want to overwrite.

**5. Entry points (the "research room" feel)**

- Sidebar item under Contacts.
- A "Research this contact" button on `ContactDetail.tsx` that deep-links into the room pre-filled.

### Effort estimate (native)
- Edge function + secret + deploy: ~½ day (you have the template).
- Hook + UI panel: ~1 day.
- Write-back + AML stamping: ~½ day.
- Lookup-history table + RLS + types: ~½ day.
- **Total ≈ 2.5 days**, assuming the iD4me API is straightforward. Add buffer for their auth quirks (Pricefinder's OAuth dance is a cautionary tale — see the comments in `pricefinder-proxy`).

---

## 3B. Fallback version (no iD4me API)

- Dedicated page at `/contact-research` with copy-paste hints from the selected contact.
- **iD4me cannot be iframe-embedded** — Auth0 login sets `frame-ancestors 'none'`, so the app opens `https://id4me.me/search` in a **new tab** instead.
- Ships quickly. Gives you the research-room *location* in the CRM and a clear copy → search → update workflow.
- **Limits:** no auto-fill or write-back — you copy/paste between iD4me and the contact record.
- Worth shipping even if you expect to get the API later: same sidebar entry; native API upgrades the panel internals.

---

## 4. Compliance / privacy notes

- iD4me data is personal information — keep the proxy **JWT-verified** so only signed-in users hit it.
- Log lookups (`contact_research_lookups`) for an audit trail, especially if you stamp AML fields off the back of a result.
- Respect existing contact suppression flags (`do_not_contact`, `dnc_phone`, etc.) — surface a warning in the UI if researching a DNC contact.
- Australian Privacy Act: only research contacts you have a legitimate business reason to. Worth a one-line internal note on acceptable use.

---

## 5. Recommended sequencing

1. **Email iD4me** to confirm API availability, auth, limits, pricing. (Gates 3A vs 3B.)
2. ~~**Ship 3B (iframe)** on a dedicated `/contact-research` route~~ — **done**
3. **If API confirmed:** build `id4me-proxy` + `useId4meLookup` + native panel, then add write-back and the lookup-history table.
4. **Wire entry points:** sidebar under Contacts + "Research this contact" button on `ContactDetail`.
5. **Verify:** `npm run verify` (build + vitest) before merging to `main`.

---

## Open questions for you

- Do you already have an iD4me account that might include API access, or do we need to ask?
- Route name preference: `/contact-research` vs `/research/contacts`?
- Do you want lookups to auto-stamp the AML verification fields, or keep research and AML separate?
