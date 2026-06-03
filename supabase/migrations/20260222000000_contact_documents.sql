-- Contact documents: correspondence, reports, certificates per contact (optional property link)
CREATE TABLE IF NOT EXISTS public.contact_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('correspondence', 'report', 'certificate', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_documents_contact_id ON public.contact_documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_documents_property_id ON public.contact_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_contact_documents_user_id ON public.contact_documents(user_id);

ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact_documents"
  ON public.contact_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contact_documents"
  ON public.contact_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact_documents"
  ON public.contact_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact_documents"
  ON public.contact_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for contact documents (private, path: user_id/contact_id/filename)
INSERT INTO storage.buckets (id, name, public) VALUES ('contact-documents', 'contact-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view own contact-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own contact-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contact-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own contact-documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contact-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own contact-documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contact-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
