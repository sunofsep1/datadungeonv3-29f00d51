-- Offers / Contracts module (Reapit P2 #13)

CREATE TABLE IF NOT EXISTS public.listing_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL,
  offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  offer_price NUMERIC NOT NULL CHECK (offer_price > 0),
  buyer_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  buyer_solicitor_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  investor BOOLEAN NOT NULL DEFAULT false,
  inclusions TEXT,
  special_conditions TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'countered',
    'accepted',
    'rejected',
    'withdrawn',
    'conditional',
    'unconditional',
    'settled',
    'fallen_through'
  )),
  exchange_date DATE,
  settlement_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_offers_listing_id ON public.listing_offers(listing_id, offer_date DESC);
CREATE INDEX IF NOT EXISTS idx_listing_offers_buyer ON public.listing_offers(buyer_contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_offers_ref_code ON public.listing_offers(listing_id, ref_code);

ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_offers_select" ON public.listing_offers;
CREATE POLICY "listing_offers_select" ON public.listing_offers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_offers_insert" ON public.listing_offers;
CREATE POLICY "listing_offers_insert" ON public.listing_offers
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_offers_update" ON public.listing_offers;
CREATE POLICY "listing_offers_update" ON public.listing_offers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_offers_delete" ON public.listing_offers;
CREATE POLICY "listing_offers_delete" ON public.listing_offers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_offers_updated_at ON public.listing_offers;
CREATE TRIGGER tr_listing_offers_updated_at
  BEFORE UPDATE ON public.listing_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tr_listing_offers_ref_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_n integer;
BEGIN
  IF NEW.ref_code IS NULL OR trim(NEW.ref_code) = '' THEN
    SELECT COUNT(*) + 1 INTO v_n FROM public.listing_offers WHERE listing_id = NEW.listing_id;
    NEW.ref_code := 'OF-' || lpad(v_n::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_listing_offers_ref_code ON public.listing_offers;
CREATE TRIGGER tr_listing_offers_ref_code
  BEFORE INSERT ON public.listing_offers
  FOR EACH ROW EXECUTE FUNCTION public.tr_listing_offers_ref_code();

CREATE OR REPLACE FUNCTION public.tr_listing_offer_buyer_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.buyer_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('accepted', 'conditional', 'unconditional', 'settled') THEN
    INSERT INTO public.listing_contact_links (listing_id, contact_id, role, user_id, offer_status)
    VALUES (NEW.listing_id, NEW.buyer_contact_id, 'key_buyer', NEW.user_id, NEW.status)
    ON CONFLICT (listing_id, contact_id, role)
    DO UPDATE SET offer_status = EXCLUDED.offer_status, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_listing_offer_buyer_link ON public.listing_offers;
CREATE TRIGGER tr_listing_offer_buyer_link
  AFTER INSERT OR UPDATE OF status, buyer_contact_id ON public.listing_offers
  FOR EACH ROW EXECUTE FUNCTION public.tr_listing_offer_buyer_link();

CREATE OR REPLACE FUNCTION public.sync_listing_offers_kpis(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = p_listing_id AND l.user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Listing not found';
    END IF;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public.listing_offers
  WHERE listing_id = p_listing_id
    AND status NOT IN ('withdrawn', 'rejected');

  UPDATE public.listings
  SET campaign_offers_count = COALESCE(v_count, 0)
  WHERE id = p_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_listing_offers_sync_kpis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_listing_offers_kpis(COALESCE(NEW.listing_id, OLD.listing_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_listing_offers_sync_kpis ON public.listing_offers;
CREATE TRIGGER tr_listing_offers_sync_kpis
  AFTER INSERT OR UPDATE OR DELETE ON public.listing_offers
  FOR EACH ROW EXECUTE FUNCTION public.tr_listing_offers_sync_kpis();

GRANT EXECUTE ON FUNCTION public.sync_listing_offers_kpis(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
