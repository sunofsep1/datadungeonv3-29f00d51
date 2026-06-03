import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tryGeocodePropertyAfterSave } from "@/hooks/usePropertyGeocode";
import { supabase } from "@/integrations/supabase/client";
import { formatAddressForDisplay } from "@/lib/formatAddressDisplay";
import type { ContactChannel } from "./useContactChannels";

// Type definitions (tables not in auto-generated types)
export interface Property {
  id: string;
  user_id: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  estimated_value?: number | null;
  price_listed?: number | null;
  rental_yield?: number | null;
  cap_rate?: number | null;
  lot_size?: number | null;
  building_size?: number | null;
  property_condition?: string | null;
  year_built?: number | null;
  car_spaces?: number | null;
  property_report?: Record<string, unknown> | null;
  images?: unknown;
  documents?: unknown;
  suburb?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocoded_at?: string | null;
}

export interface PropertyInsert {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  status?: string | null;
  notes?: string | null;
  estimated_value?: number | null;
  price_listed?: number | null;
  rental_yield?: number | null;
  cap_rate?: number | null;
  lot_size?: number | null;
  building_size?: number | null;
  property_condition?: string | null;
  year_built?: number | null;
  car_spaces?: number | null;
  property_report?: Record<string, unknown> | null;
  images?: unknown;
  documents?: unknown;
}

export interface PropertyUpdate extends Partial<PropertyInsert> {
  id?: string;
}

export type PropertyWithLinks = Property & {
  contact_property_links?: Array<{
    id: string;
    contact_id: string;
    property_id: string;
    role: string;
    notes: string | null;
    contacts: { id: string; name: string; email: string | null; phone: string | null } | null;
  }>;
};

const PROPERTIES_SELECT =
  "*, contact_property_links(id, contact_id, property_id, role, notes, contacts(id, name, email, phone))";

const PROPERTIES_QUERY_KEYS = [["properties"]];

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
  "Properties table not set up. Run migrations or create the table in the database.";

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      try {
        // Try simple select first (works with HubSpot schema)
        const { data: simple, error: simpleError } = await (supabase as any)
          .from("properties")
          .select("*")
          .order("created_at", { ascending: false });
        if (!simpleError && simple != null) {
          const props = (simple ?? []) as Property[];
          const ids = props.map((p) => p.id);
          if (ids.length === 0) {
            return props.map((p) => ({ ...p, contact_property_links: [] })) as PropertyWithLinks[];
          }
          try {
            const { data: links, error: linksErr } = await (supabase as any)
              .from("contact_property_links")
              .select("id, contact_id, property_id, role, notes")
              .in("property_id", ids);
            if (linksErr || !Array.isArray(links) || links.length === 0) {
              return props.map((p) => ({ ...p, contact_property_links: [] })) as PropertyWithLinks[];
            }
            const contactIds = [...new Set(links.map((l: { contact_id: string }) => l.contact_id))];
            const { data: contactRows } = await (supabase as any)
              .from("contacts")
              .select("id, name, first_name, last_name, email, phone")
              .in("id", contactIds);
            const contactMap = new Map(
              (contactRows ?? []).map((c: { id: string; name?: string | null; first_name?: string | null; last_name?: string | null }) => [
                c.id,
                { ...c, name: c.name?.trim() || [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || null },
              ])
            );
            const linksByPropertyId = new Map<string, typeof links>();
            for (const l of links) {
              const list = linksByPropertyId.get(l.property_id) ?? [];
              list.push(l);
              linksByPropertyId.set(l.property_id, list);
            }
            return props.map((p) => {
              const propLinks = linksByPropertyId.get(p.id) ?? [];
              const mergedLinks = propLinks.map(
                (l: { id: string; contact_id: string; property_id: string; role: string; notes: string | null }) => ({
                  id: l.id,
                  contact_id: l.contact_id,
                  property_id: l.property_id,
                  role: l.role,
                  notes: l.notes ?? "",
                  contacts: contactMap.get(l.contact_id) ?? null,
                })
              );
              return { ...p, contact_property_links: mergedLinks } as PropertyWithLinks;
            }) as PropertyWithLinks[];
          } catch {
            return props.map((p) => ({ ...p, contact_property_links: [] })) as PropertyWithLinks[];
          }
        }
        const { data, error } = await (supabase as any)
          .from("properties")
          .select(PROPERTIES_SELECT)
          .order("created_at", { ascending: false });
        if (!error) return (data ?? []) as PropertyWithLinks[];
        const err = simpleError ?? error;
        if (err && isPropertiesTableOrRelationError((err?.message ?? "").toLowerCase())) {
          throw new Error(PROPERTIES_MISSING_MESSAGE);
        }
        throw err;
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
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      if (!id) throw new Error("No property ID");
      let property: PropertyWithLinks;
      // Try simple select first (HubSpot schema)
      const { data: simpleData, error: simpleErr } = await (supabase as any)
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!simpleErr && simpleData) {
        property = { ...simpleData, contact_property_links: [] } as PropertyWithLinks;
      } else {
        const { data, error } = await (supabase as any)
          .from("properties")
          .select(PROPERTIES_SELECT)
          .eq("id", id)
          .maybeSingle();
        if (!error && data) {
          property = data as PropertyWithLinks;
        } else {
          if (simpleErr && !isPropertiesTableOrRelationError((simpleErr?.message ?? "").toLowerCase())) {
            throw simpleErr;
          }
          throw new Error("Property not found");
        }
      }
      try {
        const { data: links, error: linksErr } = await (supabase as any)
          .from("contact_property_links")
          .select("id, contact_id, property_id, role, notes")
          .eq("property_id", id);
        if (!linksErr && Array.isArray(links) && links.length > 0) {
          const contactIds = [...new Set(links.map((l: { contact_id: string }) => l.contact_id))];
          const { data: contactRows } = await (supabase as any)
            .from("contacts")
            .select("id, name, first_name, last_name, email, phone")
            .in("id", contactIds);
          const contactMap = new Map(
            (contactRows ?? []).map((c: { id: string; name?: string | null; first_name?: string | null; last_name?: string | null }) => [
              c.id,
              { ...c, name: c.name?.trim() || [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || null },
            ])
          );
          property.contact_property_links = links.map((l: { id: string; contact_id: string; property_id: string; role: string; notes: string | null }) => ({
            id: l.id,
            contact_id: l.contact_id,
            property_id: l.property_id,
            role: l.role,
            notes: l.notes ?? "",
            contacts: contactMap.get(l.contact_id) ?? null,
          })) as PropertyWithLinks["contact_property_links"];
        } else {
          property.contact_property_links = [];
        }
      } catch {
        property.contact_property_links = [];
      }
      return property;
    },
    enabled: !!id,
  });
}

const DEFAULT_PROPERTY_TYPE = "house";

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PropertyInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const tryInsert = (payload: Record<string, unknown>) =>
        (supabase as any).from("properties").insert(payload).select().single();
      const isColumnError = (e: { code?: string; message?: string } | null) =>
        e && (e.code === "PGRST204" || (e.message && String(e.message).toLowerCase().includes("column")));

      // Prefer RPC when available (more robust vs schema-cache edge cases).
      let payload: Record<string, unknown> = {
        ...p,
        property_type: p.property_type ?? DEFAULT_PROPERTY_TYPE,
        // Keep as null/undefined when empty so SQL NULLIF(TRIM(...), '') works.
        state: p.state ?? null,
      };

      try {
        const { data, error } = await supabase.rpc("create_property_with_address", {
          payload,
        });
        if (error) throw error;
        return data as Property;
      } catch {
        // Fall back to direct insert for older schemas / missing RPCs.
      }

      let { data, error } = await tryInsert(payload);

      if (isColumnError(error)) {
        payload = {
          // Newer schema uses street_address + suburb, but keep address/address_line1 if present too
          address: p.address_line1 ?? (p as any).address ?? "",
          address_line1: p.address_line1 ?? null,
          street_address: p.address_line1 ?? (p as any).street_address ?? null,
          city: p.city ?? null,
          suburb: (p as any).suburb ?? p.city ?? null,
          state: p.state ?? null,
          postcode: p.postcode ?? null,
          country: p.country ?? "Australia",
          owner_id: userData.user.id,
          property_type: p.property_type ?? DEFAULT_PROPERTY_TYPE,
        };
        let r = await tryInsert(payload);
        if (isColumnError(r.error)) {
          // Some schemas may not have address_line1/city, try minimal column set
          const minimal: Record<string, unknown> = {
            street_address: p.address_line1 ?? (p as any).street_address ?? "",
            suburb: (p as any).suburb ?? p.city ?? null,
            state: p.state ?? null,
            postcode: p.postcode ?? null,
            country: p.country ?? "Australia",
            owner_id: userData.user.id,
            property_type: p.property_type ?? DEFAULT_PROPERTY_TYPE,
          };
          r = await tryInsert(minimal);
          if (isColumnError(r.error)) {
            // As a last resort, drop optional fields
            const minimal2 = {
              street_address: minimal.street_address,
              owner_id: userData.user.id,
              property_type: p.property_type ?? DEFAULT_PROPERTY_TYPE,
            };
            r = await tryInsert(minimal2);
          }
        }
        data = r.data;
        error = r.error;
      }

      if (error) throw error;
      return data as Property;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      void tryGeocodePropertyAfterSave({
        id: data.id,
        address_line1: data.address_line1,
        suburb: (data as { suburb?: string | null }).suburb ?? data.city,
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        latitude: (data as { latitude?: number | null }).latitude,
        longitude: (data as { longitude?: number | null }).longitude,
      });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("properties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Property;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", d.id] });
      void tryGeocodePropertyAfterSave({
        id: d.id,
        address_line1: d.address_line1,
        suburb: (d as { suburb?: string | null }).suburb ?? d.city,
        city: d.city,
        state: d.state,
        postcode: d.postcode,
        latitude: (d as { latitude?: number | null }).latitude,
        longitude: (d as { longitude?: number | null }).longitude,
      });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

/** Format property address for display */
export function formatPropertyAddress(p: Property & { address?: string | null }): string {
  const line1 = p.address_line1 ?? (p as any).address;
  const parts = [
    line1,
    p.address_line2,
    [p.city, p.state].filter(Boolean).join(" "),
    p.postcode,
    p.country,
  ].filter(Boolean);
  const raw = parts.join(", ") || "—";
  return raw === "—" ? raw : formatAddressForDisplay(raw);
}
