-- posts.listing_id had a bare FK (NO ACTION), which blocked deleting any listing
-- that ever had a post — the "can't delete appraisals properly" bug.
ALTER TABLE public.posts DROP CONSTRAINT posts_listing_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_listing_id_fkey
  FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';
