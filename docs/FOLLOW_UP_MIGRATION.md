# Follow-up / Coming to market – add missing column

If you see: **"Could not find the 'coming_to_market' column of 'contacts' in the schema cache"** when saving a contact, the follow-up migration hasn’t been applied yet.

**Option A – Supabase Dashboard**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Run this SQL (same as `supabase/migrations/20260318000000_contacts_coming_to_market_followup.sql`):

```sql
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS coming_to_market TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_coming_to_market_check'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_coming_to_market_check
      CHECK (coming_to_market IS NULL OR coming_to_market IN ('otm', '4_weeks', '3_months', '6_plus'));
  END IF;
END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up_at ON public.contacts(next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;
```

4. Click **Run**. After that, contact saves will include “Coming to market” and the error will stop.

**Option B – Supabase CLI**

If you use the Supabase CLI and are logged in:

```bash
npx supabase db push
```

---

**In the meantime:** The app will still save contact updates (including lead status) by retrying without `coming_to_market` when that column is missing. Only “Coming to market” won’t be stored until the migration is applied.
