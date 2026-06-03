import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONTACT_SUBSCRIPTION_KINDS,
  type ContactSubscriptionKind,
} from "@/lib/contactSubscriptions";

export type ContactClass = {
  id: string;
  name: string;
  created_at: string;
};

const CLASSES_KEY = ["contact_classes"] as const;

export function useContactClasses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...CLASSES_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_classes")
        .select("id, name, created_at")
        .order("name");
      if (error) {
        if (error.code === "42P01" || error.message?.includes("contact_classes")) {
          return [] as ContactClass[];
        }
        throw error;
      }
      return (data ?? []) as ContactClass[];
    },
  });
}

export function useContactClassAssignments(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact_class_assignments", contactId],
    enabled: Boolean(contactId),
    queryFn: async () => {
      if (!contactId) return [] as { class_id: string; contact_classes: ContactClass }[];
      const { data, error } = await supabase
        .from("contact_class_assignments")
        .select("class_id, contact_classes(id, name, created_at)")
        .eq("contact_id", contactId);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data ?? []) as { class_id: string; contact_classes: ContactClass }[];
    },
  });
}

export function useCreateContactClass() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name required");
      const { data, error } = await supabase
        .from("contact_classes")
        .insert({ user_id: user.id, name: trimmed })
        .select("id, name, created_at")
        .single();
      if (error) throw error;
      return data as ContactClass;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLASSES_KEY }),
  });
}

export function useSetContactClassAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, classIds }: { contactId: string; classIds: string[] }) => {
      const { error: delErr } = await supabase
        .from("contact_class_assignments")
        .delete()
        .eq("contact_id", contactId);
      if (delErr && delErr.code !== "42P01") throw delErr;
      if (!classIds.length) return;
      const rows = classIds.map((class_id) => ({ contact_id: contactId, class_id }));
      const { error } = await supabase.from("contact_class_assignments").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["contact_class_assignments", vars.contactId] });
    },
  });
}

export type ContactSubscriptionRow = {
  subscription_kind: ContactSubscriptionKind;
  subscribed: boolean;
};

export function useContactSubscriptions(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact_subscriptions", contactId],
    enabled: Boolean(contactId),
    queryFn: async () => {
      if (!contactId) return [] as ContactSubscriptionRow[];
      const { data, error } = await supabase
        .from("contact_subscriptions")
        .select("subscription_kind, subscribed")
        .eq("contact_id", contactId);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data ?? []) as ContactSubscriptionRow[];
    },
  });
}

export function useUpsertContactSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contactId,
      kind,
      subscribed,
    }: {
      contactId: string;
      kind: ContactSubscriptionKind;
      subscribed: boolean;
    }) => {
      const { error } = await supabase.from("contact_subscriptions").upsert(
        {
          contact_id: contactId,
          subscription_kind: kind,
          subscribed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contact_id,subscription_kind" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["contact_subscriptions", vars.contactId] });
    },
  });
}

export function subscriptionIsActive(
  rows: ContactSubscriptionRow[],
  kind: ContactSubscriptionKind,
): boolean {
  const row = rows.find((r) => r.subscription_kind === kind);
  return row?.subscribed ?? false;
}

export function allSubscriptionKinds(): ContactSubscriptionKind[] {
  return [...CONTACT_SUBSCRIPTION_KINDS];
}

export type ContactClassAssignmentIndex = Map<string, Set<string>>;
export type ContactSubscriptionIndex = Map<string, Map<ContactSubscriptionKind, boolean>>;

export function useContactClassAssignmentIndex() {
  return useQuery({
    queryKey: ["contact_class_assignment_index"],
    queryFn: async (): Promise<ContactClassAssignmentIndex> => {
      const { data, error } = await supabase
        .from("contact_class_assignments")
        .select("contact_id, class_id");
      if (error) {
        if (error.code === "42P01" || error.message?.includes("contact_class_assignments")) {
          return new Map();
        }
        throw error;
      }
      const map: ContactClassAssignmentIndex = new Map();
      for (const row of data ?? []) {
        const set = map.get(row.contact_id) ?? new Set<string>();
        set.add(row.class_id);
        map.set(row.contact_id, set);
      }
      return map;
    },
  });
}

export function useContactSubscriptionIndex() {
  return useQuery({
    queryKey: ["contact_subscription_index"],
    queryFn: async (): Promise<ContactSubscriptionIndex> => {
      const { data, error } = await supabase
        .from("contact_subscriptions")
        .select("contact_id, subscription_kind, subscribed");
      if (error) {
        if (error.code === "42P01" || error.message?.includes("contact_subscriptions")) {
          return new Map();
        }
        throw error;
      }
      const map: ContactSubscriptionIndex = new Map();
      for (const row of data ?? []) {
        const kind = row.subscription_kind as ContactSubscriptionKind;
        const byKind = map.get(row.contact_id) ?? new Map<ContactSubscriptionKind, boolean>();
        byKind.set(kind, row.subscribed);
        map.set(row.contact_id, byKind);
      }
      return map;
    },
  });
}
