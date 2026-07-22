import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CommChannel = "email" | "sms";

export interface CommHistoryItem {
  id: string;
  channel: CommChannel;
  when: string;
  toLabel: string;
  subject: string | null;
  preview: string;
  status: string | null;
  contactId: string | null;
}

/** Unified outbound history: emails (interactions) + SMS (sms_outbound), newest first. */
export function useCommunicationsHistory(limit = 200) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["communications-history", user?.id, limit],
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: async (): Promise<CommHistoryItem[]> => {
      if (!user) return [];

      const [emailsRes, smsRes] = await Promise.all([
        supabase
          .from("interactions")
          .select("id, contact_id, subject, body, timestamp, created_at")
          .eq("user_id", user.id)
          .eq("type", "email")
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("sms_outbound")
          .select("id, contact_id, to_phone, body_preview, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const emails = (emailsRes.data ?? []) as Array<{
        id: string;
        contact_id: string | null;
        subject: string | null;
        body: string | null;
        timestamp: string | null;
        created_at: string;
      }>;
      const sms = (smsRes.data ?? []) as Array<{
        id: string;
        contact_id: string | null;
        to_phone: string | null;
        body_preview: string | null;
        status: string | null;
        created_at: string;
      }>;

      // Resolve contact names in one lookup.
      const ids = [
        ...new Set([...emails, ...sms].map((r) => r.contact_id).filter(Boolean) as string[]),
      ];
      const nameById = new Map<string, string>();
      if (ids.length > 0) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, name, first_name, last_name")
          .in("id", ids);
        for (const c of (contacts ?? []) as Array<{
          id: string;
          name: string | null;
          first_name: string | null;
          last_name: string | null;
        }>) {
          const nm =
            (c.name ?? "").trim() ||
            [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
            "";
          if (nm) nameById.set(c.id, nm);
        }
      }

      const items: CommHistoryItem[] = [
        ...emails.map((e) => ({
          id: `e_${e.id}`,
          channel: "email" as const,
          when: e.timestamp ?? e.created_at,
          toLabel: (e.contact_id && nameById.get(e.contact_id)) || "Contact",
          subject: e.subject,
          preview: (e.body ?? "").slice(0, 140),
          status: "sent",
          contactId: e.contact_id,
        })),
        ...sms.map((s) => ({
          id: `s_${s.id}`,
          channel: "sms" as const,
          when: s.created_at,
          toLabel: (s.contact_id && nameById.get(s.contact_id)) || s.to_phone || "—",
          subject: null,
          preview: s.body_preview ?? "",
          status: s.status,
          contactId: s.contact_id,
        })),
      ];

      items.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0));
      return items;
    },
  });
}
