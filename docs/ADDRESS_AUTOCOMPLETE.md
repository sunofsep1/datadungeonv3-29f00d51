## Australia address autocomplete (Properties)

The **Add New Property** dialog supports Australia-only address suggestions and auto-filling:
- street address (`address_line1`)
- suburb/city (`city`)
- state (`state`)
- postcode (`postcode`)
- country (`country`)

### Setup (Google Places)

1. Create a Google Maps API key with **Places API** enabled.
2. Add this env var to your local `.env` (do **not** commit secrets):

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
```

3. (Recommended) Restrict the key:
- **Application restriction**: HTTP referrers
- Allow: your dev + prod origins
- **API restriction**: Places API

If `VITE_GOOGLE_MAPS_API_KEY` is not set, the field falls back to a normal input.

