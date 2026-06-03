# CRM quick reference (operators)

Short guide for day-to-day use. For setup and dev, see the main [README.md](../README.md).

## Contacts

- **Smart list chips** (Top 100, Past, Partners, Hot, Warm, Seller): these mostly filter by **Contact category** (`contact_category` on the person). They are not separate “tags” you add arbitrarily.
- **Stale / No next touch / Auto block**: these are **saved views** (filters on recency, next touch, or reachability). You do not set “Stale” as a category on the contact.
- **Contact category** (edit contact): Top 100, Past Client, Referral Partner, Hot Lead, Warm Lead, Seller Nurture — one primary classification per contact.
- **Urgency category** (edit contact): Immediate, Priority, Planned, Backlog — different from contact category; drives urgency-style display.
- **Emails and phones**: Multiple values can live in **Phones & emails** (channels) plus the main row fields. After a **merge**, extra addresses/numbers are kept on the card (including channel rows where applicable).
- **Merge contacts**: Pick the **primary** card; others are removed after tasks, properties, and history move to the primary. A **System** timeline note records the merge.

## Contacts list

- **Refine** row: source, property link, last touched — without opening Filters.
- **Filters** (sheet): classification, tags, and more.
- **Merge**: select two or more rows, then Merge.

## Logging activity

- Use **Log touch** from the header or contact workspace where available.

## Nurture, SMS, Automations

- Separate areas; ensure environment keys and Supabase tables exist before expecting live sends (see README env table).

## Sanity check (developers / power users)

```bash
npm run health
```

Confirms Supabase connectivity and core tables.
