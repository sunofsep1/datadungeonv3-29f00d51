import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchContactDuplicates,
  normalizeContactEmail,
  normalizeContactPhoneKey,
  type ContactDuplicateCandidate,
} from "@/lib/contactConflictDetection";

export function useContactDuplicateHints(input: {
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  excludeId?: string | null;
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const email = normalizeContactEmail(input.email);
  const phoneKey = normalizeContactPhoneKey(input.phone ?? input.mobile);
  const enabled = (input.enabled ?? true) && !!user && (!!email || !!phoneKey);

  return useQuery({
    queryKey: ["contact_duplicates", user?.id, email, phoneKey, input.excludeId],
    enabled,
    queryFn: async (): Promise<ContactDuplicateCandidate[]> => {
      if (!user) return [];
      return fetchContactDuplicates(supabase, {
        userId: user.id,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        excludeId: input.excludeId,
      });
    },
  });
}
