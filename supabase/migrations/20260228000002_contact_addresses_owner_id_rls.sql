-- contact_addresses RLS: support HubSpot schema (owner_id) as well as DataDungeon (user_id)

DROP POLICY IF EXISTS "Users can view addresses of their contacts" ON public.contact_addresses;
DROP POLICY IF EXISTS "Users can insert addresses for their contacts" ON public.contact_addresses;
DROP POLICY IF EXISTS "Users can update addresses of their contacts" ON public.contact_addresses;
DROP POLICY IF EXISTS "Users can delete addresses of their contacts" ON public.contact_addresses;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'user_id'
  ) THEN
    -- DataDungeon: contacts have both user_id and owner_id
    CREATE POLICY "Users can view addresses of their contacts" ON public.contact_addresses
      FOR SELECT USING (
        contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid() OR owner_id = auth.uid())
      );
    CREATE POLICY "Users can insert addresses for their contacts" ON public.contact_addresses
      FOR INSERT WITH CHECK (
        contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid() OR owner_id = auth.uid())
      );
    CREATE POLICY "Users can update addresses of their contacts" ON public.contact_addresses
      FOR UPDATE USING (
        contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid() OR owner_id = auth.uid())
      );
    CREATE POLICY "Users can delete addresses of their contacts" ON public.contact_addresses
      FOR DELETE USING (
        contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid() OR owner_id = auth.uid())
      );
  ELSE
    -- HubSpot: contacts have owner_id only
    CREATE POLICY "Users can view addresses of their contacts" ON public.contact_addresses
      FOR SELECT USING (
        contact_id IN (SELECT id FROM public.contacts WHERE owner_id = auth.uid())
      );
    CREATE POLICY "Users can insert addresses for their contacts" ON public.contact_addresses
      FOR INSERT WITH CHECK (
        contact_id IN (SELECT id FROM public.contacts WHERE owner_id = auth.uid())
      );
    CREATE POLICY "Users can update addresses of their contacts" ON public.contact_addresses
      FOR UPDATE USING (
        contact_id IN (SELECT id FROM public.contacts WHERE owner_id = auth.uid())
      );
    CREATE POLICY "Users can delete addresses of their contacts" ON public.contact_addresses
      FOR DELETE USING (
        contact_id IN (SELECT id FROM public.contacts WHERE owner_id = auth.uid())
      );
  END IF;
END $$;
