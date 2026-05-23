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
        for (const row of data ?? []) {
          collected.set(row.id, { ...(row as ContactDuplicateCandidate), matchReasons: [] });
        }

        const { data: channels, error: chErr } = await supabase
          .from("contact_channels")
          .select("contact_id, value, channel_type")
          .in("channel_type", ["phone", "mobile"])
          .ilike("value", `%${tail}%`)
          .limit(30);
        if (chErr && chErr.code !== "42P01") throw chErr;

        const channelContactIds = [...new Set((channels ?? []).map((c) => c.contact_id))];
        if (channelContactIds.length) {
          const { data: channelContacts, error: ccErr } = await supabase
            .from("contacts")
            .select("id, name, email, phone, mobile")
            .or(scope)
            .in("id", channelContactIds)
            .limit(15);
          if (ccErr) throw ccErr;

          const channelsByContact = new Map<string, string[]>();
          for (const ch of channels ?? []) {
            const list = channelsByContact.get(ch.contact_id) ?? [];
            list.push(ch.value);
            channelsByContact.set(ch.contact_id, list);
          }

          for (const row of channelContacts ?? []) {
            const prev = collected.get(row.id);
            const extraPhones = channelsByContact.get(row.id) ?? [];
            collected.set(row.id, {
              ...(prev ?? (row as ContactDuplicateCandidate)),
              ...row,
              extraPhones: [
                ...new Set([...(prev as { extraPhones?: string[] } | undefined)?.extraPhones ?? [], ...extraPhones]),
              ],
            } as ContactDuplicateCandidate & { extraPhones?: string[] });
          }
        }
      }

      const rows = [...collected.values()].map((r) => {
        const { matchReasons: _m, ...rest } = r as ContactDuplicateCandidate & { extraPhones?: string[] };
        return rest;
      });
      return findContactDuplicates(rows, {
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        excludeId: input.excludeId,
      });
    },
  });
}
