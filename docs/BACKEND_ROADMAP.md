# Backend & platform roadmap (phased)

Condensed from the CRM backend upgrade recommendations. Use this as a **prioritised checklist**; each phase can span multiple migrations and releases.

## Phase 1 — Data model & hygiene

- Keep **migrations** in `supabase/migrations/` as the source of truth; apply with `npm run db:push` after `supabase link`.
- **RLS** on every user-owned table; periodic audit of policies and `auth.uid()` usage.
- **Indexes** for hot paths: contact list filters, appointment date ranges, foreign keys used in joins.

## Phase 2 — Contact lifecycle (classification + touches)

- Optional **`contact_category`** (or equivalent) aligned with your six business buckets, with clear UI mapping.
- **`last_touch_date` / `next_touch_date`** (or derive from activity) and surfacing “stale” contacts.
- Materialised or computed helpers (views / RPCs) for dashboards, not only client-side filters.

## Phase 3 — Lead scoring

- **`lead_score_rules`** + **`contact_scores`** (or JSON breakdown) if not already fully leveraged.
- Scheduled job (pg_cron or Edge Function) to **recalculate scores** and optionally sync **lead_temperature** thresholds.

## Phase 4 — Workflow engine (large)

- **`workflows`** tables: triggers, steps, branching, delays.
- **Processor**: Edge Function on cron or queue-driven worker; idempotent step execution and dead-letter handling.
- Start with **one high-value workflow** (e.g. listing listed → tasks + SMS) before generalising the UI.

## Phase 5 — Edge Functions & ops

- **Secrets**: document required keys per function (`google-calendar`, `news-proxy`, SMS, reminders, etc.); rotate on a schedule.
- **Logging**: structured JSON logs (function name, message); monitor in Supabase Logs / external sink.
- **Timeouts & retries** for third-party APIs (Google, Resend, Mobile Message).

## Phase 6 — Compliance & exports

- **PII**: explicit rules for CSV export, print, and third-party sync (e.g. DOB opt-in on print via query flag).
- **Retention** and user deletion path (cascade rules, anonymisation if required).

---

When picking up work, tie each item to a **migration file**, **Edge Function**, or **app milestone** so progress stays traceable.
