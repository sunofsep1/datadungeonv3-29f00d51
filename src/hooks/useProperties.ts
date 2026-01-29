import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export type Property = Tables<"properties">;
export type PropertyInsert = TablesInsert<"properties">;
export type PropertyUpdate = TablesUpdate<"properties">;

export type PropertyWithLinks = Property & {
  contact_property_links?: Array<{
    id: string;
    contact_id: string;
    property_id: string;
    role: string;
    notes: string | null;
    contacts: { id: string; name: string; first_name: string | null; last_name: string | null } | null;
  }>;
};

const PROPERTIES_SELECT =
  "*, contact_property_links(id, contact_id, property_id, role, notes, contacts(id, name, first_name, last_name))";

const PROPERTIES_QUERY_KEYS = [["properties"]] as const;

function isPropertiesTableOrRelationError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    (m.includes("relation") && m.includes("does not exist")) ||
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    (m.includes("could not find") && m.includes("properties")) ||
    m.includes("contact_property_links") ||
    m.includes("contacts")
  );
}

const PROPERTIES_MISSING_MESSAGE =
  "Properties table not set up. Run migrations (npm run db:push) or run the migration SQL in Supabase Dashboard → SQL Editor.";

export function useProperties() {
  useRealtimeSubscription("properties", PROPERTIES_QUERY_KEYS);
  useRealtimeSubscription("contact_property_links", PROPERTIES_QUERY_KEYS);

  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select(PROPERTIES_SELECT)
          .order("created_at", { ascending: false });
        if (!error) return (data ?? []) as PropertyWithLinks[];
        const msg = (error?.message ?? "").toLowerCase();
        if (!isPropertiesTableOrRelationError(msg)) throw error;
        const { data: simple, error: simpleError } = await supabase
          .from("properties")
          .select("*")
          .order("created_at", { ascending: false });
        if (!simpleError) {
          return ((simple ?? []) as Property[]).map((p) => ({
            ...p,
            contact_property_links: [],
          })) as PropertyWithLinks[];
        }
        if (isPropertiesTableOrRelationError((simpleError?.message ?? "").toLowerCase())) {
          throw new Error(PROPERTIES_MISSING_MESSAGE);
        }
        throw simpleError;
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
        if (
          msg.includes("properties") &&
          (msg.includes("schema cache") ||
            msg.includes("does not exist") ||
            msg.includes("could not find") ||
            msg.includes("relation"))
        ) {
          throw new Error(PROPERTIES_MISSING_MESSAGE);
        }
        throw e;
      }
    },
  });
}

export function useProperty(id: string | undefined) {
  useRealtimeSubscription("properties", PROPERTIES_QUERY_KEYS);
  useRealtimeSubscription("contact_property_links", PROPERTIES_QUERY_KEYS);

  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      if (!id) throw new Error("No property ID");
      const { data, error } = await supabase
        .from("properties")
        .select(PROPERTIES_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (!error) {
        if (!data) throw new Error("Property not found");
        return data as PropertyWithLinks;
      }
      if (!isPropertiesTableOrRelationError(error?.message ?? "")) throw error;
      const { data: simple, error: simpleError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (simpleError) {
        if (isPropertiesTableOrRelationError(simpleError?.message ?? "")) {
          throw new Error(PROPERTIES_MISSING_MESSAGE);
        }
        throw simpleError;
      }
      if (!simple) throw new Error("Property not found");
      return {
        ...(simple as Property),
        contact_property_links: [],
      } as PropertyWithLinks;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<PropertyInsert, "user_id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...p, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", d.id] });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

/** Format property address for display */
export function formatPropertyAddress(p: Property): string {
  const parts = [
    p.address_line1,
    p.address_line2,
    [p.city, p.state].filter(Boolean).join(" "),
    p.postcode,
    p.country,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}
