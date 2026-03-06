# Mobile Message (Australia) – SMS integration with Data Dungeon

Use [Mobile Message](https://app.mobilemessage.com.au/) to send SMS from Data Dungeon (single contact and, later, mass/broadcast). Their API supports Australian numbers and bulk sends (up to 100 per request).

## 1. Get your credentials from Mobile Message

1. **Log in** at [https://app.mobilemessage.com.au/](https://app.mobilemessage.com.au/).
2. **Sign up** if needed – new accounts get 50 free SMS credits ([pricing](https://mobilemessage.com.au/api)).
### API authentication (login credentials)

Mobile Message does **not** show separate “API credentials” in the dashboard. The API uses your **login credentials** ([API docs](https://mobilemessage.com.au/api-documentation)):

- **API username** = the **email** you use to log in (e.g. `you@company.com`).
- **API password** = the **password** you use to log in.

If you’re unsure, confirm with Mobile Message support ([help.mobilemessage.com.au](https://help.mobilemessage.com.au/)) that your login email and password are used for API Basic Auth.

### Sender ID

You must use a **Sender ID** registered in your account. View and manage them here: [app.mobilemessage.com.au/senderid](https://app.mobilemessage.com.au/senderid).

- **Shared number** (default) – e.g. `61485900177` – ready to use as sender.
- **Your mobile number** – e.g. `61466805992` – if registered as a sender.
- **Alphanumeric sender** – a business name (e.g. `DataDungeon`) if you have one registered.

Use the numeric or name value exactly as shown in your Sender ID list (e.g. `61485900177` or `61466805992`).

## 2. Supabase Edge Function secrets

In **Supabase Dashboard** → **Edge Functions** → **send-sms** → **Secrets**, add:

| Secret | Description | Example |
|--------|-------------|--------|
| `MOBILE_MESSAGE_API_USER` | Your **login email** (API username) | `you@company.com` |
| `MOBILE_MESSAGE_API_PASSWORD` | Your **login password** (API password) | (your Mobile Message password) |
| `MOBILE_MESSAGE_SENDER` | A registered Sender ID from [Sender ID page](https://app.mobilemessage.com.au/senderid) | `61485900177` (shared) or `61466805992` (your number) |

If these three are set, Data Dungeon will use **Mobile Message** for “Send SMS”. If they are not set, the app falls back to **Twilio** (if `TWILIO_*` secrets are set).

**Example (using shared number):**
- `MOBILE_MESSAGE_SENDER`: `61485900177`

## 3. Deploy the Edge Function

From the project root:

```bash
npx supabase functions deploy send-sms
```

## 4. Phone number format

- **Local Australian:** `0412345678`
- **International (recommended for API):** `+61412345678` or `61412345678`
- The Mobile Message API accepts both formats.

## 5. Mass / bulk SMS later

The Mobile Message API allows **up to 100 messages per request** ([API docs](https://mobilemessage.com.au/api-documentation)). A future Data Dungeon feature (e.g. “Mass SMS” or “Broadcast”) can call the same API with multiple `to`/`message` entries. The same credentials and Sender ID above will work for that.

## 6. Compliance and opt-out

- Respect opt-out: use the `sms_opt_out` (or similar) flag on contacts if you have it, and do not send to opted-out numbers.
- Mobile Message supports unsubscribe lists and optional `ignore_unsubscribes`; use with care to avoid spam complaints.
- Follow Australian spam and privacy laws (e.g. Spam Act, Privacy Act).

## 7. Checklist before going live

1. Confirm with Mobile Message support that login email + password are used for API auth (if unsure).
2. Add the three secrets to the `send-sms` Edge Function in Supabase.
3. Deploy: `npx supabase functions deploy send-sms`.
4. Test with a **single** SMS to your own number before any mass send.

## Quick reference

| Item | Where |
|------|--------|
| Login / sign up | [app.mobilemessage.com.au](https://app.mobilemessage.com.au/) |
| Sender IDs | [app.mobilemessage.com.au/senderid](https://app.mobilemessage.com.au/senderid) |
| API docs | [mobilemessage.com.au/api-documentation](https://mobilemessage.com.au/api-documentation) |
| Help / support | [help.mobilemessage.com.au](https://help.mobilemessage.com.au/) |
| API base URL | `https://api.mobilemessage.com.au/` |
| Auth | Basic Auth: `Base64(login_email:login_password)` in `Authorization` header |
| Send endpoint | `POST /v1/messages` with body `{ "messages": [{ "to", "message", "sender" }] }` |
