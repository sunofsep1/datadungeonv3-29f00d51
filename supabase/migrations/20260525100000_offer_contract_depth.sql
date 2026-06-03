-- Reapit upgrade brief §2.2 — contract depth (conditions, IBD, portal status)

ALTER TABLE public.listing_offers
  ADD COLUMN IF NOT EXISTS expected_unconditional_date DATE,
  ADD COLUMN IF NOT EXISTS expected_settlement_date DATE,
  ADD COLUMN IF NOT EXISTS display_price TEXT,
  ADD COLUMN IF NOT EXISTS portal_status TEXT NOT NULL DEFAULT 'available'
    CHECK (portal_status IN ('available', 'under_contract', 'sold')),
  ADD COLUMN IF NOT EXISTS vendor_solicitor_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'flat'
    CHECK (deposit_type IN ('percentage', 'flat')),
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (commission_type IN ('percentage', 'custom')),
  ADD COLUMN IF NOT EXISTS gross_comm_incgst NUMERIC,
  ADD COLUMN IF NOT EXISTS gross_comm_exgst NUMERIC,
  ADD COLUMN IF NOT EXISTS balance_held_trust NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_held_ibd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ibd_account_name TEXT,
  ADD COLUMN IF NOT EXISTS ibd_account_number TEXT,
  ADD COLUMN IF NOT EXISTS ibd_bsb TEXT,
  ADD COLUMN IF NOT EXISTS ibd_bank TEXT,
  ADD COLUMN IF NOT EXISTS ibd_branch TEXT;

CREATE TABLE IF NOT EXISTS public.offer_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.listing_offers(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'initial_deposit', 'finance', 'building_pest', 'balance_of_deposit',
    'title_search', 'strata_report', 'other'
  )),
  label TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'overdue', 'waived')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_conditions_offer ON public.offer_conditions(offer_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_offer_conditions_due ON public.offer_conditions(user_id, due_date, status);

ALTER TABLE public.offer_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offer_conditions_select" ON public.offer_conditions;
CREATE POLICY "offer_conditions_select" ON public.offer_conditions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "offer_conditions_insert" ON public.offer_conditions;
CREATE POLICY "offer_conditions_insert" ON public.offer_conditions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "offer_conditions_update" ON public.offer_conditions;
CREATE POLICY "offer_conditions_update" ON public.offer_conditions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "offer_conditions_delete" ON public.offer_conditions;
CREATE POLICY "offer_conditions_delete" ON public.offer_conditions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_offer_conditions_updated_at ON public.offer_conditions;
CREATE TRIGGER tr_offer_conditions_updated_at
  BEFORE UPDATE ON public.offer_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
