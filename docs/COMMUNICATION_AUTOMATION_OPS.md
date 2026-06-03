# Communication automation — deployment checklist

Use this with [MOBILE_MESSAGE_SETUP.md](./MOBILE_MESSAGE_SETUP.md) and your Resend dashboard.

## Edge Functions to deploy

From the repo root:

```bash
npx supabase functions deploy send-sms
npx supabase functions deploy send-sms-broadcast
npx supabase functions deploy send-email
npx supabase functions deploy send-broadcast
npx supabase functions deploy sequence-runner
npx supabase functions deploy followup-digest
npx supabase functions deploy appointment-reminders
npx supabase functions deploy listing-stage-automation
npx supabase functions deploy sms-webhook
```

## Secrets (Supabase Dashboard → Edge Functions → each function)

| Function | Secrets |
|----------|---------|
| **send-sms** | `MOBILE_MESSAGE_API_USER`, `MOBILE_MESSAGE_API_PASSWORD`, `MOBILE_MESSAGE_SENDER` (or Twilio trio), **`SUPABASE_SERVICE_ROLE_KEY`** (required for `sms_opt_out` checks and `sms_outbound` logging), `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **send-sms-broadcast** | Same Mobile Message trio, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **sequence-runner** | `RESEND_API_KEY`, `EMAIL_FROM`, **`MOBILE_MESSAGE_*`** (for automated **SMS** nurture steps), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **send-email** / **send-broadcast** | `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **followup-digest** | `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, optional `APP_URL` |
| **appointment-reminders** | `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`; optional **`APPOINTMENT_REMINDER_SMS=true`** plus Mobile Message trio for SMS reminders |
| **listing-stage-automation** | `RESEND_API_KEY`, `EMAIL_FROM`, Mobile Message trio (for SMS arm), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

> `SUPABASE_URL` and keys are often injected automatically by Supabase hosting; confirm under **Project Settings → Edge Functions** if sends fail with “not configured”.

## Database

Apply migrations (includes `sms_outbound`, `listing_stage_automations`, nurture `sms` step type):

```bash
npx supabase db push
```

## Cron

Migrations under `supabase/migrations` schedule `sequence-runner` (hourly) and `followup-digest` (daily) when `pg_cron` + vault secrets `project_url` and `service_role_key` are set (see `20260323000001_cron_nurture_digest_sequence.sql`). Configure **appointment-reminders** similarly if you use it.

## Smoke tests

1. **1:1 SMS**: Contact detail → Send SMS (with `contact_id` passed from the app).
2. **Bulk SMS**: Contacts → select multiple → **Bulk SMS** (requires `send-sms-broadcast` deployed + MM secrets).
3. **Nurture email**: Sequence with an **email** step; wait for runner or invoke `sequence-runner` manually.
4. **Nurture SMS**: Sequence with **SMS (auto)** step; ensure `MOBILE_MESSAGE_*` on **sequence-runner**.
5. **Listing stage**: Settings → **Listing stage automations** → save SMS/email for a stage → drag a listing into that column on **Listings & Sales**.
6. **Webhook stub**: `GET /functions/v1/sms-webhook` should return JSON (provider callbacks can be wired later).

## Provider references

- [Mobile Message](https://mobilemessage.com.au/) — bulk SMS, API, Australian delivery.
