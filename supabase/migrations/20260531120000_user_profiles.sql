-- Agent profile fields for Settings → My Account (single-user RLS).
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  agency_name TEXT NOT NULL DEFAULT '',
  license_number TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  default_calendar_view TEXT NOT NULL DEFAULT 'week'
    CHECK (default_calendar_view IN ('day', 'week', 'month')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_own" ON public.user_profiles;
CREATE POLICY "user_profiles_own" ON public.user_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER tr_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
