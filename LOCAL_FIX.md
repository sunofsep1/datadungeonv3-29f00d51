# Fix local app to match live (data + calendar)

Your `.env` already has the correct Supabase credentials. Follow these steps to get local matching the live app.

---

## 1. Restart dev server

After any `.env` change, restart:

```bash
# Stop current dev server (Ctrl+C), then:
npm run dev
```

---

## 2. Log in as the same user

- Use the **same email and password** as on https://tiny-brioche-b979f7.netlify.app
- Data is tied to your user; a different account will see different data

---

## 3. Deploy the Google Calendar function (fixes "Failed to fetch")

The live app uses a Supabase Edge Function for Google Calendar. It must be deployed to your project.

```bash
# One-time: log in to Supabase (opens browser)
npx supabase login

# Deploy the function
npm run deploy:gcal
```

Then set the function’s secrets in **Supabase Dashboard** → **Edge Functions** → **google-calendar** → **Secrets**:

| Secret | Value |
|--------|-------|
| `REDIRECT_BASE_URL` | `http://localhost:8080` for local, or `https://tiny-brioche-b979f7.netlify.app` for production |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (OAuth client) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

If you only need local to match live and the live app already works, the function may already be deployed. In that case, the redirect is likely set for production; local can still fetch events if you’re logged in as the same user.

---

## Quick checklist

- [ ] `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (matches live)
- [ ] Restarted dev server after env changes
- [ ] Logged in with same user as live app
- [ ] Deployed Edge Function: `npm run deploy:gcal` (after `supabase login`)
