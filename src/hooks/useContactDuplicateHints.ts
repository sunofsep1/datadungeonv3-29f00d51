import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  findContactDuplicates,
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

      const scope = `user_id.eq.${user.id},owner_id.eq.${user.id}`;
      const collected = new Map<string, ContactDuplicateCandidate>();

      if (email) {
        const { data, error } = await supabase
          .from("contacts")
          .select("id, name, email, phone, mobile")
          .or(scope)
          .ilike("email", email)
          .limit(15);
        if (error) throw error;
        for (const row of data ?? []) collected.set(row.id, row as ContactDuplicateCandidate);
      }

      if (phoneKey) {
        const tail = phoneKey.slice(-8);
        const { data, error } = await supabase
          .from("contacts")
          .select("id, name, email, phone, mobile")
          .or(scope)
          .or(`phone.ilike.%${tail}%,mobile.ilike.%${tail}%`)
          .limit(15);
        if (error) throw error;
        for (const row of data ?? []) collected.set(row.id, row as ContactDuplicateCandidate);
      }

      return findContactDuplicates([...collected.values()], {
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        excludeId: input.excludeId,
      });
    },
  });
}
