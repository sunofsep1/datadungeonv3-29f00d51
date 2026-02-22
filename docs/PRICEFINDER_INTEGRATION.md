# Pricefinder integration

[Pricefinder](https://www.pricefinder.com.au/) provides Australian property data including sale history, lot details, and property attributes (bedrooms, bathrooms, lot size, etc.).

## API authentication

Pricefinder uses **OAuth 2.0 client credentials**. You need both a **client ID** and **client secret** from your Pricefinder account.

1. Log into [Pricefinder](https://app.pricefinder.com.au/) or the [Pricefinder Portal](https://www.pricefinder.com.au/portal/).
2. Go to **Developer Resources** → **API Credentials** (or similar).
3. Create or view an **API Integration** to get:
   - **Client ID** (or API Key)
   - **Client Secret**

Some plans may support a direct API key. If you have only one key, try setting it as both `PRICEFINDER_CLIENT_ID` and `PRICEFINDER_CLIENT_SECRET`, or as `PRICEFINDER_API_KEY`.

## Setup

### 1. Set secrets in Supabase

**Option A: Supabase Dashboard**

1. Open **Supabase Dashboard** → your project → **Edge Functions** → **Secrets**
2. Add:
   - `PRICEFINDER_CLIENT_ID` = your client ID
   - `PRICEFINDER_CLIENT_SECRET` = your client secret

**Option B: CLI**

```bash
npx supabase secrets set PRICEFINDER_CLIENT_ID=your_client_id
npx supabase secrets set PRICEFINDER_CLIENT_SECRET=your_client_secret
```

**Fallback (single API key):**  
If your plan supports a direct key, set `PRICEFINDER_API_KEY` only.

### 2. Deploy the Edge Function

```bash
npm run supabase:deploy:pricefinder
```

## How the app uses it

- The **Property detail** page has a **Property data from Pricefinder** section.
- Click **Enrich from Pricefinder** to fetch live property data for the address.
- The function returns: bedrooms, bathrooms, property type, lot size (m²), last sale price/date, car spaces, lot/plan.
- Use **Apply to property** to save the enriched data into your property record.

## Edge Function: `pricefinder-proxy`

- **Path:** `supabase/functions/pricefinder-proxy/index.ts`
- Authenticates with Pricefinder via OAuth (`/oauth/token`) or direct API key.
- Accepts authenticated `POST` requests with a JSON body:
  - `{ "full_address": "12 Wilson Esplanade, Main Beach, QLD 4217" }`
  - `{ "address": "..." }` (alias)
- Uses Pricefinder v1 API: `suggest/properties` for search, then `properties/{id}` for details.
- Returns: `address`, `bedrooms`, `bathrooms`, `property_type`, `land_area_sqm`, `last_sale_price`, `last_sale_date`, `carspaces`, `lot_plan`.

## Pricefinder API endpoints (v1)

- `POST /oauth/token` – Get access token (client_credentials)
- `GET /suggest/properties?q={address}` – Search for properties
- `GET /properties/{id}` – Get detailed property info
