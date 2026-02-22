-- Add marketing and listing-related categories to contact_documents
-- Categories: correspondence, report, certificate, marketing, listing_photos, listing_presentation, signage, appraisal, contract, disclosure, other

ALTER TABLE public.contact_documents DROP CONSTRAINT IF EXISTS contact_documents_category_check;

ALTER TABLE public.contact_documents
  ADD CONSTRAINT contact_documents_category_check CHECK (
    category IN (
      'correspondence',
      'report',
      'certificate',
      'marketing',
      'listing_photos',
      'listing_presentation',
      'signage',
      'appraisal',
      'contract',
      'disclosure',
      'other'
    )
  );
