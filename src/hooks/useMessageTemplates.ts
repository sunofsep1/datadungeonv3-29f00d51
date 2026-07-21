import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MessageTemplateChannel = "email" | "sms" | "both";

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  channel: MessageTemplateChannel;
  email_eyebrow: string | null;
  email_heading: string | null;
  email_subject: string | null;
  email_body: string | null;
  sms_body: string | null;
  sort_order: number;
  is_active: boolean;
}

const SELECT_COLS =
  "id,name,category,channel,email_eyebrow,email_heading,email_subject,email_body,sms_body,sort_order,is_active";

/**
 * User's branded message templates (RLS-scoped). Pass a channel to filter to
 * templates usable for that channel ('both' matches either).
 */
export function useMessageTemplates(channel?: "email" | "sms") {
  return useQuery({
    queryKey: ["message-templates", channel ?? "all"],
    queryFn: async (): Promise<MessageTemplate[]> => {
      // Cast: message_templates is added by migration; generated types may lag until
      // `npm run supabase:gen-types` is run.
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              k: string,
              v: boolean,
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => Promise<{ data: MessageTemplate[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data, error } = await client
        .from("message_templates")
        .select(SELECT_COLS)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      let rows = data ?? [];
      if (channel === "email") rows = rows.filter((r) => r.channel === "email" || r.channel === "both");
      if (channel === "sms") rows = rows.filter((r) => r.channel === "sms" || r.channel === "both");
      return rows;
    },
    staleTime: 60_000,
  });
}
