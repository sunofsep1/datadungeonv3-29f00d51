-- Marketing Funds + Campaign Expenses per listing (Reapit P2 #15)

CREATE TABLE IF NOT EXISTS public.listing_marketing_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comments TEXT,
  approved_amount NUMERIC NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
  received_amount NUMERIC NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_marketing_funds_listing
  ON public.listing_marketing_funds(listing_id, fund_date DESC);

CREATE TABLE IF NOT EXISTS public.listing_campaign_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'other',
  supplier TEXT,
  invoice_no TEXT,
  item_comment TEXT,
  supplier_status TEXT NOT NULL DEFAULT 'pending' CHECK (supplier_status IN ('paid', 'pending')),
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  office_paid NUMERIC NOT NULL DEFAULT 0 CHECK (office_paid >= 0),
  agent_paid NUMERIC NOT NULL DEFAULT 0 CHECK (agent_paid >= 0),
  vendor_paid NUMERIC NOT NULL DEFAULT 0 CHECK (vendor_paid >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_campaign_expenses_listing
  ON public.listing_campaign_expenses(listing_id, expense_date DESC);

ALTER TABLE public.listing_marketing_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_campaign_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_marketing_funds_select" ON public.listing_marketing_funds;
CREATE POLICY "listing_marketing_funds_select" ON public.listing_marketing_funds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_marketing_funds_insert" ON public.listing_marketing_funds;
CREATE POLICY "listing_marketing_funds_insert" ON public.listing_marketing_funds
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_marketing_funds_update" ON public.listing_marketing_funds;
CREATE POLICY "listing_marketing_funds_update" ON public.listing_marketing_funds
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_marketing_funds_delete" ON public.listing_marketing_funds;
CREATE POLICY "listing_marketing_funds_delete" ON public.listing_marketing_funds
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_campaign_expenses_select" ON public.listing_campaign_expenses;
CREATE POLICY "listing_campaign_expenses_select" ON public.listing_campaign_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_campaign_expenses_insert" ON public.listing_campaign_expenses;
CREATE POLICY "listing_campaign_expenses_insert" ON public.listing_campaign_expenses
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_campaign_expenses_update" ON public.listing_campaign_expenses;
CREATE POLICY "listing_campaign_expenses_update" ON public.listing_campaign_expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_campaign_expenses_delete" ON public.listing_campaign_expenses;
CREATE POLICY "listing_campaign_expenses_delete" ON public.listing_campaign_expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_marketing_funds_updated_at ON public.listing_marketing_funds;
CREATE TRIGGER tr_listing_marketing_funds_updated_at
  BEFORE UPDATE ON public.listing_marketing_funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_listing_campaign_expenses_updated_at ON public.listing_campaign_expenses;
CREATE TRIGGER tr_listing_campaign_expenses_updated_at
  BEFORE UPDATE ON public.listing_campaign_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
