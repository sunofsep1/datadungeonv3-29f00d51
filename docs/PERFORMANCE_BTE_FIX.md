# Fix "Log Today's Activity" (bte column error)

If you see: **`null value in column "bte" of relation "activities" violates not-null constraint`**, your database has a `bte` column on `public.activities` that the app does not use.

## Option 1: Apply migrations

If you use Supabase CLI and run migrations:

```bash
npx supabase db push
```

This applies [supabase/migrations/20260215000000_drop_activities_bte.sql](supabase/migrations/20260215000000_drop_activities_bte.sql), which drops the `bte` column.

## Option 2: Run SQL manually

In **Supabase Dashboard → SQL Editor**, run:

```sql
ALTER TABLE public.activities DROP COLUMN IF EXISTS bte;
```

Then try "Save Today's Activity" again on the Performance page.
