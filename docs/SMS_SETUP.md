# SMS (Twilio) setup

To use "Send SMS" from Contact detail, deploy the `send-sms` Edge Function and set Twilio secrets.

## 1. Twilio

1. Sign up at [twilio.com](https://www.twilio.com) and get:
   - **Account SID**
   - **Auth Token**
   - A **Twilio phone number** (used as the "From" number for outbound SMS)

2. Ensure the number is SMS-capable and that your Twilio account is in good standing.

## 2. Supabase Edge Function secrets

In **Supabase Dashboard** → **Edge Functions** → **send-sms** → **Secrets**, add:

| Secret | Description |
|--------|-------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio number in E.164 (e.g. `+61412345678`) |

## 3. Deploy the function

```bash
npx supabase functions deploy send-sms
```

## 4. Contact phone numbers

The app sends to the contact’s primary phone. For best delivery:

- Store numbers in **E.164** (e.g. `+61` for Australia, then number with no leading zero).
- The "Send SMS" dialog shows the number as stored; you can document E.164 in your contact import or settings.

## Compliance

- Respect opt-in/opt-out if required in your region (e.g. TCPA, GDPR). Consider storing a consent or opt-out flag per contact and checking it before sending.
- Twilio’s terms and acceptable use policy apply.
