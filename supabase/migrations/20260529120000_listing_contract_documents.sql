-- Contract documents linked to listing offers (signed contracts, solicitor letters, etc.)

CREATE TABLE IF NOT EXISTS public.listing_contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.listing_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('signed_contract', 'solicitor_letter', 'condition_evidence', 'other')),
  title TEXT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'solicitor', 'parsed_import')),
  parsed_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_contract_documents_offer
  ON public.listing_contract_documents(offer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_contract_documents_listing
  ON public.listing_contract_documents(listing_id, created_at DESC);

ALTER TABLE public.listing_contract_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_contract_documents_select" ON public.listing_contract_documents;
CREATE POLICY "listing_contract_documents_select" ON public.listing_contract_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_contract_documents_insert" ON public.listing_contract_documents;
CREATE POLICY "listing_contract_documents_insert" ON public.listing_contract_documents
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_contract_documents_update" ON public.listing_contract_documents;
CREATE POLICY "listing_contract_documents_update" ON public.listing_contract_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_contract_documents_delete" ON public.listing_contract_documents;
CREATE POLICY "listing_contract_documents_delete" ON public.listing_contract_documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_contract_documents_updated_at ON public.listing_contract_documents;
CREATE TRIGGER tr_listing_contract_documents_updated_at
  BEFORE UPDATE ON public.listing_contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
