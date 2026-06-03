# Pricefinder integration

[Pricefinder](https://www.pricefinder.com.au/) provides Australian property data including sale history, lot details, and property attributes (bedrooms, bathrooms, lot size, etc.).

## Two different credential types (important)

| Credential | Where you get it | Works with this CRM? |
|------------|------------------|----------------------|
| **Widget / portal API key** | Pricefinder portal (short key for embedded widgets) | **Usually no** for REST enrich — calls return HTTP 401 |
| **API Integration (OAuth)** | Pricefinder portal → **Developer Resources** → **API Integration** | **Yes** — `client_id` + `client_secret` → Bearer token |

The CRM calls the **Pricefinder REST API v1** (`suggest/properties`, `properties/{id}`) via the server-side `pricefinder-proxy` edge function. That API expects **OAuth client credentials**, not a widget key used as a Bearer token.

If enrich shows **HTTP 401**, you almost certainly have a widget key in `PRICEFINDER_API_KEY`. Ask Domain/Pricefinder (Mathew Heath) for an **API Integration** pair instead.

## API authentication

Pricefinder uses **OAuth 2.0 client credentials**:

1. `POST https://api.pricefinder.com.au/v1/oauth/token` with `client_id` + `client_secret`
2. Response includes `tokenKey` — use as `Authorization: Bearer {tokenKey}` on API calls

## Setup

### 1. Set secrets in Supabase (project `sujyalrzbubvhpkntwja`)

**Recommended — OAuth pair:**

```bash
npx supabase secrets set PRICEFINDER_CLIENT_ID=your_client_id
npx supabase secrets set PRICEFINDER_CLIENT_SECRET=your_client_secret
```

Or in **Supabase Dashboard → Edge Functions → Secrets**.

**Not recommended alone:** `PRICEFINDER_API_KEY` (widget key). The proxy will try OAuth and `?apiKey=` fallback, but widget keys typically cannot access the REST API.

### 2. Deploy the Edge Function

```bash
npm run supabase:deploy:pricefinder
```

### 3. Smoke test

1. Open any property with a full address (e.g. Redland Bay)
2. Click **Enrich from Pricefinder API**
3. Expect bedrooms, last sale, land area — not HTTP 401

## Widget-key workflow (no OAuth — default today)

If you only have a **portal/widget API key**, use the **research + import** path:

1. **Property detail** or **My Markets** → **Open in Pricefinder** (address copied to clipboard)
2. Log in to Pricefinder, run a property report, download **PDF**
3. **Upload Property Report** → review → **Apply to property**
4. Data is stored in `properties.property_report` and shown on My Markets pins, contact linked properties, and long-hold farming badges

Live **Enrich from API** and suburb stats appear only when `PRICEFINDER_CLIENT_ID` + `PRICEFINDER_CLIENT_SECRET` are set (CRM mode flips from `pdf` to `api` automatically).

### Optional widget embed (future)

When Domain provides an official embed script URL:

```env
VITE_PRICEFINDER_WIDGET_KEY=your-widget-key
VITE_PRICEFINDER_WIDGET_SCRIPT=https://…/widget.js
```

The CRM loads it in `PricefinderWidgetSlot` on the property research panel. Restrict the key to your CRM origins in the Pricefinder portal.

## How the app uses it

- **Property detail** — research panel: upload PDF, open portal, optional API enrich
- **My Markets** — **Import report** on map pins; cached last-sale from uploaded reports
- **Contact detail** — property intelligence strip on linked properties (last sale, long-hold flag)

## Edge Function: `pricefinder-proxy`

- **Path:** `supabase/functions/pricefinder-proxy/index.ts`
- Authenticates with Pricefinder via OAuth (`/oauth/token`) or `?apiKey=` fallback
- Accepts authenticated `POST` with Supabase session JWT
- Body examples:
  - `{ "action": "health" }` — returns `{ mode: "pdf" | "api" }` for UI
  - `{ "full_address": "12 Wilson Esplanade, Main Beach, QLD 4217" }`
  - `{ "action": "suburb_stats", "suburb": "Redland Bay", "state": "QLD" }`

## Pricefinder API endpoints (v1)

- `POST /oauth/token` – Get access token (client_credentials)
- `GET /suggest/properties?q={address}` – Search for properties
- `GET /properties/{id}` – Get detailed property info
