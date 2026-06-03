# Apple Messages for Business setup

Apple **Messages for Business** (formerly Apple Business Chat) lets customers message your business in the **Messages** app on iPhone, iPad, Mac, and Apple Watch. Conversations are asynchronous, can include Apple Pay and rich content, and can be automated or handed to live agents.

You **cannot** integrate directly with Apple. You must work with an **Apple-approved Messaging Service Provider (MSP)**. The MSP provides the messaging platform, connects to Apple’s channel, and can integrate with your CRM (e.g. Data Dungeon).

---

## 1. Register with Apple

1. Go to **Apple Business Register**: [https://register.apple.com/messages](https://register.apple.com/messages)
2. Click **Get Started**.
3. Sign in with a **business Apple Account** (corporate email) or **Managed Apple Account**.
4. Accept the **Apple Messages for Business** terms.
5. Confirm your organisation details and account type.
6. Choose an **approved Messaging Service Provider (MSP)** from the list Apple shows. The MSP will host your conversations and may offer CRM integration.
7. Add **tester Apple Accounts** so you can test message delivery.
8. Submit for **Apple review**. Approval is required before you can go live.

**Support:** For registration or technical issues, contact [business-register@apple.com](mailto:business-register@apple.com).

---

## 2. Work with your MSP

- Your MSP provides the software agents use to manage customer chats (and often bots/automation).
- They will guide you through connecting to Apple Messages for Business and setting up entry points (e.g. website, app, Maps, phone number).
- Ask your MSP explicitly about **CRM integration**: many support APIs or webhooks so that conversations (or summaries) can be synced into Data Dungeon (e.g. as activities or a dedicated messaging view). If they support it, they’ll describe the integration options (API, webhooks, or a pre-built connector).

---

## 3. CRM integration (Data Dungeon)

- Data Dungeon does **not** talk to Apple directly. Any Messages for Business integration will go through your MSP.
- Once your MSP offers an API or webhook:
  - You can add a Supabase Edge Function (or backend job) that receives events from the MSP and writes to your `activities` or a dedicated table.
  - Optionally, add a “Messages for Business” section in **Settings → Integrations** that shows status or config (e.g. “Connected via [MSP name]”) and links to MSP docs.

---

## 4. Requirements and notes (from Apple)

- You must be able to resolve general customer queries over this channel (similar to phone support).
- You must support both **automation** (e.g. bots for fast replies and triage) and **live human agents** for escalations.
- Apple is **not** onboarding new MSPs at this time; you must choose from the **existing approved MSPs** listed during registration.
- Entry points can include your website, app, email, QR codes, Apple Maps, and tapping your business phone number.

---

## 5. Quick links

| Resource | URL |
|----------|-----|
| Apple Business Register (Messages) | [register.apple.com/messages](https://register.apple.com/messages) |
| Messages for Business documentation | [register.apple.com/resources/messages/messaging-documentation/](https://register.apple.com/resources/messages/messaging-documentation/) |
| FAQ | [register.apple.com/resources/messages/messaging-documentation/faq](https://register.apple.com/resources/messages/messaging-documentation/faq) |

In the app, **Settings → Integrations** includes a short summary and a link to Apple Business Register.
