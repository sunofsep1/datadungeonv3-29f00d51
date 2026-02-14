# Perplexity integration

[Perplexity](https://docs.perplexity.ai/) provides AI-powered search and answers (Sonar API) with web-grounded responses.

## API access

- **Documentation:** [docs.perplexity.ai](https://docs.perplexity.ai/)
- Integration requires an **API key**. Create one in the [Perplexity API Portal](https://www.perplexity.ai/settings/api) (API Keys tab).

## Storing the API key

Do **not** hardcode the key in the app. Use one of:

1. **Supabase Edge Function secrets** (recommended)  
   In **Supabase Dashboard → Edge Functions → perplexity-proxy → Secrets**, add:
   - `PERPLEXITY_API_KEY` – your Perplexity API key

2. **Environment variables**  
   For local or self-hosted runs, set `PERPLEXITY_API_KEY` in your environment.

## How the app uses it

- The app has a **Research** / **Ask** entry point (e.g. in the sidebar or on the Dashboard).
- If Perplexity is enabled (API key set in the `perplexity-proxy` function secrets), you can enter a query and get an AI answer with optional citations.
- If no key is configured, the UI shows a short message and a link to this doc.

## Edge Function: `perplexity-proxy`

- **Path:** `supabase/functions/perplexity-proxy/index.ts`
- Accepts authenticated `POST` requests with a JSON body, e.g. `{ "query": "Your question", "context": "Optional context (e.g. contact name or suburb)" }`.
- Reads `PERPLEXITY_API_KEY` from secrets, calls the Perplexity Sonar/Search API, and returns the answer (and optionally citations).

See [Perplexity API docs](https://docs.perplexity.ai/docs/sonar/quickstart) for current request/response format.
