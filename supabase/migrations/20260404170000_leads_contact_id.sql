-- Link captured leads to CRM contacts (webhook + CSV import + future UI)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON public.leads(contact_id) WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN public.leads.contact_id IS 'When set, the CRM contact created or matched for this lead.';

-- Require contact_id to reference a contact owned by the same user (cannot point at someone else''s contact)
DROP POLICY IF EXISTS "Users can create their own leads" ON public.leads;
CREATE POLICY "Users can create their own leads" ON public.leads
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      contact_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = contact_id AND c.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      contact_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = contact_id AND c.user_id = auth.uid()
      )
    )
  );
