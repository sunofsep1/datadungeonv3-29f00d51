# Instant-Reply Automation Design

## Problem
- `process-workflows` runs ~5 min (via pg_cron) — too slow for first contact
- Inbound leads should get SMS+email acknowledgement within seconds
- Current speed-to-lead automation (sellerLeadAutomation) is Meta-specific

## Solution: Database Webhook → Edge Function

### Option A (Recommended): Supabase Database Webhooks
1. Enable DB webhooks on the `contacts` table
2. On INSERT → POST to edge function `send-instant-reply`
3. Function checks source and decides what to send (SMS/email/both)
4. Function rate-limits by contact to avoid dupes

### Option B: pg_net + Database Function
Create a trigger that calls `http.post()` via `pg_net` extension on contact insert.
- Pros: Runs inside the database, no external trigger config
- Cons: Requires pg_net extension (check if enabled)

### Option C: Scheduled Realtime Trigger (Future)
Use Supabase Functions + Realtime to subscribe to contact inserts and trigger sends.
- Pros: Flexible
- Cons: More latency (still polling)

---

## Recommended Implementation (Option A)

### 1. Create `send-instant-reply` edge function
```
supabase/functions/send-instant-reply/index.ts
```
Receives contact data from webhook, routes based on source:
- `source = 'facebook-valuation'` → SMS + email (prospect) + SMS to Greg
- `source = 'website-valuation'` → SMS + email (prospect) + SMS to Greg
- `source = 'inbound_webhook'` → email only (opt-in to SMS must be explicit)

Messages:
- **Prospect SMS:** "Hi [first_name], thanks for your enquiry — Greg will be in touch shortly. Reply STOP to opt out."
- **Prospect Email:** templated welcome with expectations
- **Greg SMS (alert):** existing alert logic (already implemented)

### 2. Set up DB webhook in Supabase Dashboard
1. Go to Webhooks (under Database → Webhooks)
2. Create new webhook on `public.contacts` table
3. Events: INSERT
4. HTTP Request:
   - URL: `https://YOUR_PROJECT.functions.supabase.co/send-instant-reply`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_WEBHOOK_SECRET`
   - Payload: Full contact row

### 3. Rate-limit to prevent duplicates
Track webhook calls in an `instant_reply_log` table or cache.
- Key: `contact_id`
- TTL: 60 seconds
- Action: Skip if already sent in last 60 seconds

### 4. Add consent + unsubscribe
- Populate `contacts.communication_preferences` or new column `sms_consent` from form input
- Honor opt-out flag in send logic
- Log all attempts in `sms_outbound` and `email_outbound` for compliance

---

## Testing Plan
1. Create test contact via `inbound-lead` webhook → should get instant SMS+email
2. Create test contact via Pricefinder landing page → should get instant SMS+email
3. Verify logs in `sms_outbound` + `email_outbound`
4. Check rate-limiting works (insert same contact twice → second should skip)

---

## Files to Create
- `supabase/functions/send-instant-reply/index.ts` — main handler
- Optional: `supabase/functions/_shared/instantReplyMessages.ts` — message templates
- Optional: Migration for `instant_reply_log` table or `sms_consent` column

## Environment Variables
- `WEBHOOK_SECRET` (for auth on the webhook call)
- Existing: `AGENT_ALERT_MOBILE`, `MOBILE_MESSAGE_*`, email provider creds

## Deployment
```bash
npm run supabase:deploy:send-instant-reply
```

Then enable the webhook in the Dashboard (or automate via `supabase migrations` + Pulumi/Terraform).
