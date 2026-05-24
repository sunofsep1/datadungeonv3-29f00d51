-- Run once in Supabase Dashboard → SQL Editor if `npm run db:push` cannot reach api.supabase.com.
-- Same as migration 20260524100000_contact_classes_subscriptions.sql
-- After success, mark migration applied (when CLI works again):
--   npx supabase migration repair --status applied 20260524100000

-- Reapit brief §4: contact classes (segments) and marketing subscriptions.

CREATE TABLE IF NOT EXISTS public.contact_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_classes_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contact_classes_user ON public.contact_classes(user_id);

CREATE TABLE IF NOT EXISTS public.contact_class_assignments (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.contact_classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_class_assignments_class ON public.contact_class_assignments(class_id);

CREATE TABLE IF NOT EXISTS public.contact_subscriptions (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  subscription_kind text NOT NULL,
  subscribed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, subscription_kind),
  CONSTRAINT contact_subscriptions_kind_check CHECK (
    subscription_kind IN (
      'newsletters',
      'property_updates',
      'auction_reminders',
      'christmas_cards',
      'ofi_times'
    )
  )
);

ALTER TABLE public.contact_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own contact_classes" ON public.contact_classes;
CREATE POLICY "Users manage own contact_classes" ON public.contact_classes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage contact_class_assignments" ON public.contact_class_assignments;
CREATE POLICY "Users manage contact_class_assignments" ON public.contact_class_assignments
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
      SELECT 1 FROM public.contact_classes cc
      WHERE cc.id = class_id AND cc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users manage contact_subscriptions" ON public.contact_subscriptions;
CREATE POLICY "Users manage contact_subscriptions" ON public.contact_subscriptions
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

NOTIFY pgrst, 'reload schema';
