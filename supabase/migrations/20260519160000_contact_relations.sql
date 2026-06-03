-- Related contacts (household, partner, solicitor, etc.) per Reapit brief §4.1

CREATE TABLE IF NOT EXISTS public.contact_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  related_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  relation_label text NOT NULL DEFAULT 'related',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_relations_no_self CHECK (contact_id <> related_contact_id),
  CONSTRAINT contact_relations_unique_pair UNIQUE (contact_id, related_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_relations_contact ON public.contact_relations(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_relations_related ON public.contact_relations(related_contact_id);

ALTER TABLE public.contact_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own contact_relations" ON public.contact_relations;
CREATE POLICY "Users manage own contact_relations"
  ON public.contact_relations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_contact_relations_updated_at ON public.contact_relations;
CREATE TRIGGER update_contact_relations_updated_at
  BEFORE UPDATE ON public.contact_relations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
