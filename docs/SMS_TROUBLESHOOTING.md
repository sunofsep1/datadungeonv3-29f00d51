# SMS troubleshooting

If "Send SMS" fails with **Invalid JWT**, **Unauthorized**, or a generic error, work through these steps.

---

## 1. Confirm the function is reachable

From the project root:

```bash
npx tsx scripts/sms-diagnostic.ts
```

This script will:

- **GET** the function URL (no auth). You should see `200` and `{"ok":true}`. If not, the function may not be deployed or `VITE_SUPABASE_URL` in `.env` may be wrong.
- **POST** with a dummy token and body. The response tells you whether the request reaches the function and what it returns (e.g. "SMS service not configured", or 401 if the gateway is still verifying JWT).
- Optionally **POST** with your real session if `.env` has `VITE_SUPABASE_PUBLISHABLE_KEY` and you’re signed in.

Use the script output to see the **exact** status and body the function returns.

---

## 2. Turn off JWT verification for send-sms (Dashboard)

The Edge Function expects **Verify JWT** to be **off** so that your function code (not the gateway) handles the Bearer token.

1. Open **Supabase Dashboard** → **Edge Functions** → **send-sms**.
2. Open the function **settings** (or the function’s configuration).
3. Set **Verify JWT** to **OFF** (or **false**).

If this is left **on**, the gateway validates the JWT before your function runs. When that validation fails, you get **401 Invalid JWT** and your function never runs. The project’s `config.toml` sets `verify_jwt = false` for `send-sms`; deploying with the CLI should apply that, but the Dashboard can override it. After any redeploy, confirm Verify JWT is still OFF for `send-sms`.

---

## 3. Check function logs

After clicking "Send SMS" in the app:

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-sms** → **Logs**.
2. Look for lines starting with `[send-sms]`. They show how far the request got:
   - `Auth: Bearer token present` → auth step passed.
   - `Provider: Mobile Message` or `Provider: Twilio` → config check passed.
   - `Request: to=... body length=...` → body parsed.
   - `Calling Mobile Message API` / `Calling Twilio API` → provider was called.
   - Any `[send-sms] ... error` → failure at that step.

If there are **no** `[send-sms]` log lines when you try Send SMS, the request is not reaching your function (wrong URL, CORS, or gateway rejecting first).

---

## 4. Environment and deployment

- **.env**  
  - `VITE_SUPABASE_URL` must be your project URL (e.g. `https://YOUR_PROJECT_REF.supabase.co`).  
  - The app uses this to build the function URL. If it’s wrong, requests go to the wrong project or fail.

- **Redeploy after code or config changes**  
  ```bash
  npx supabase functions deploy send-sms
  ```  
  Then confirm again in the Dashboard that **Verify JWT** is OFF for `send-sms`.

---

## 5. Provider secrets

Once the request reaches the function and passes auth, you’ll see either success or a clear error from the function (e.g. "SMS service not configured" or a provider error).

- **Mobile Message (Australia)**  
  Dashboard → send-sms → **Secrets**: `MOBILE_MESSAGE_API_USER`, `MOBILE_MESSAGE_API_PASSWORD`, `MOBILE_MESSAGE_SENDER`.  
  See [docs/MOBILE_MESSAGE_SETUP.md](MOBILE_MESSAGE_SETUP.md).

- **Twilio**  
  Dashboard → send-sms → **Secrets**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.  
  See [docs/SMS_SETUP.md](SMS_SETUP.md).

The function uses Mobile Message if all three Mobile Message secrets are set; otherwise it uses Twilio if those three are set.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Run `npx tsx scripts/sms-diagnostic.ts` and note the GET/POST status and body. |
| 2 | In Dashboard → Edge Functions → send-sms, set **Verify JWT** to **OFF**. |
| 3 | Redeploy: `npx supabase functions deploy send-sms`. |
| 4 | In the app: sign out, sign back in, then try Send SMS again. |
| 5 | Check Dashboard → send-sms → **Logs** for `[send-sms]` lines to see where it failed. |
| 6 | Set either Mobile Message or Twilio secrets so the function can send SMS. |
