-- HubSpot-style: owner_id + lead_status on contacts (Option A evolution)
-- Ensures seeded contacts with owner_id are visible and supports lead_status filter.

-- 1. Add owner_id if not present (nullable; same as user_id for "my contacts")
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add lead_status if not present (HubSpot: new, contacted, qualified, nurture, unqualified, customer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'lead_status'
  ) THEN
    ALTER TABLE public.contacts
      ADD COLUMN lead_status TEXT CHECK (lead_status IN ('new', 'contacted', 'qualified', 'nurture', 'unqualified', 'customer'));
  END IF;
END $$;

-- 3. Backfill user_id from owner_id only if user_id column exists (DataDungeon schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'user_id'
  ) THEN
    UPDATE public.contacts
    SET user_id = owner_id
    WHERE owner_id IS NOT NULL AND user_id IS NULL;
  END IF;
END $$;

-- 4. RLS: allow access if user owns by owner_id (or user_id if present)
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'user_id'
  ) THEN
    -- Table has both user_id and owner_id (DataDungeon)
    CREATE POLICY "Users can view their own contacts" ON public.contacts
      FOR SELECT USING (auth.uid() = user_id OR auth.uid() = owner_id);
    CREATE POLICY "Users can update their own contacts" ON public.contacts
      FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = owner_id);
    CREATE POLICY "Users can delete their own contacts" ON public.contacts
      FOR DELETE USING (auth.uid() = user_id OR auth.uid() = owner_id);
  ELSE
    -- Table has owner_id only (HubSpot schema)
    CREATE POLICY "Users can view their own contacts" ON public.contacts
      FOR SELECT USING (auth.uid() = owner_id);
    CREATE POLICY "Users can update their own contacts" ON public.contacts
      FOR UPDATE USING (auth.uid() = owner_id);
    CREATE POLICY "Users can delete their own contacts" ON public.contacts
      FOR DELETE USING (auth.uid() = owner_id);
  END IF;
END $$;

-- INSERT stays: must set user_id (and optionally owner_id)
-- No change to "Users can create their own contacts" WITH CHECK (auth.uid() = user_id)

-- 5. Index for owner_id filter
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON public.contacts(lead_status);

COMMENT ON COLUMN public.contacts.owner_id IS 'HubSpot-style owner; RLS allows access when auth.uid() = user_id OR auth.uid() = owner_id';
COMMENT ON COLUMN public.contacts.lead_status IS 'HubSpot-style: new, contacted, qualified, nurture, unqualified, customer';
