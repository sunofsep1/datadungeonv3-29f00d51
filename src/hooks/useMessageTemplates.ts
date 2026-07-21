import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export type MessageTemplateInput = Omit<MessageTemplate, "id">;

const SELECT_COLS =
  "id,name,category,channel,email_eyebrow,email_heading,email_subject,email_body,sms_body,sort_order,is_active";

const KEY = ["message-templates"] as const;

// The message_templates table is added by migration; generated types may lag until
// `npm run supabase:gen-types` runs, so we use a loosely-typed client here.
const db = supabase as unknown as {
  from: (t: string) => any;
};

/** All active templates, optionally filtered to a channel ('both' matches either). */
export function useMessageTemplates(channel?: "email" | "sms", includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, channel ?? "all", includeInactive],
    queryFn: async (): Promise<MessageTemplate[]> => {
      let q = db.from("message_templates").select(SELECT_COLS);
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q.order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      let rows = (data ?? []) as MessageTemplate[];
      if (channel === "email") rows = rows.filter((r) => r.channel === "email" || r.channel === "both");
      if (channel === "sms") rows = rows.filter((r) => r.channel === "sms" || r.channel === "both");
      return rows;
    },
    staleTime: 60_000,
  });
}

export function useMessageTemplateMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: async (input: Partial<MessageTemplateInput> & { name: string }) => {
      const row = {
        user_id: user?.id,
        name: input.name,
        category: input.category ?? "general",
        channel: input.channel ?? "both",
        email_eyebrow: input.email_eyebrow ?? null,
        email_heading: input.email_heading ?? null,
        email_subject: input.email_subject ?? null,
        email_body: input.email_body ?? null,
        sms_body: input.sms_body ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      };
      const { data, error } = await db.from("message_templates").insert(row).select(SELECT_COLS).single();
      if (error) throw new Error(error.message);
      return data as MessageTemplate;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<MessageTemplateInput> & { id: string }) => {
      const { error } = await db.from("message_templates").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("message_templates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: async (t: MessageTemplate) => {
      const row = {
        user_id: user?.id,
        name: `${t.name} (copy)`,
        category: t.category,
        channel: t.channel,
        email_eyebrow: t.email_eyebrow,
        email_heading: t.email_heading,
        email_subject: t.email_subject,
        email_body: t.email_body,
        sms_body: t.sms_body,
        sort_order: (t.sort_order ?? 0) + 1,
        is_active: t.is_active,
      };
      const { error } = await db.from("message_templates").insert(row);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.from("message_templates").update({ is_active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, duplicate, toggleActive };
}
