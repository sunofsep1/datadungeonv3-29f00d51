-- contact_tags / contact_channels: align with contacts RLS (COALESCE(user_id, owner_id)).
-- HubSpot-style inserts set owner_id only; previous policies required contacts.user_id = auth.uid(),
-- so linking tags failed with "new row violates row-level security policy for table contact_tags".

DROP POLICY IF EXISTS "Users can manage contact_tags" ON public.contact_tags;
DROP POLICY IF EXISTS "Users can manage contact_tags via contact" ON public.contact_tags;

CREATE POLICY "Users can manage contact_tags" ON public.contact_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
    AND EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = tag_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage contact_channels" ON public.contact_channels;
DROP POLICY IF EXISTS "Users can manage contact_channels via contact" ON public.contact_channels;

CREATE POLICY "Users can manage contact_channels" ON public.contact_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  );
