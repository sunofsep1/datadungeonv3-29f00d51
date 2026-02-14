# Pricefinder integration

[Pricefinder](https://www.pricefinder.com.au/) provides Australian property data and valuation capabilities, including AVM (Automated Valuation Model) estimates, sale history, and unimproved land valuations.

## API access

- **API overview:** [pricefinder.com.au/api/](https://www.pricefinder.com.au/api/)
- Integration requires an **API key and subscription**. Contact Pricefinder for plans and access.

## Storing the API key

Do **not** hardcode the key in the app. Use one of:

1. **Supabase Edge Function secrets** (recommended)  
   In **Supabase Dashboard → Edge Functions → pricefinder-proxy → Secrets**, add:
   - `PRICEFINDER_API_KEY` – your Pricefinder API key  
   Optionally add `PRICEFINDER_API_URL` if the base URL differs from the default.

2. **Environment variables**  
   For local or self-hosted runs, set `PRICEFINDER_API_KEY` (and `PRICEFINDER_API_URL` if needed) in your environment.

## How the app uses it

- The **Property detail** page has a **Valuation / Market data** section.
- If Pricefinder is enabled (API key set in the `pricefinder-proxy` function secrets), a **Load estimate** button calls the Edge Function with the property address (or ID). The function calls the Pricefinder API and returns a simplified response (e.g. estimate range, last sale).
- If no key is configured, the section shows a short message and a link to this doc.

## Edge Function: `pricefinder-proxy`

- **Path:** `supabase/functions/pricefinder-proxy/index.ts`
- Accepts authenticated `POST` requests with a JSON body, e.g. `{ "address": "123 Main St, Suburb STATE 2000" }` or `{ "propertyId": "..." }`.
- Reads `PRICEFINDER_API_KEY` (and optionally `PRICEFINDER_API_URL`) from secrets, calls the Pricefinder API according to their current docs, and returns a simplified JSON response for the frontend.

Update the function’s request URL and response mapping to match Pricefinder’s current API documentation.
