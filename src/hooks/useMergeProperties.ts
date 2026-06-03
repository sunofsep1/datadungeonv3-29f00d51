import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/hooks/useProperties";
import { buildMergedPropertyUpdate, mergeLinkNotes } from "@/lib/mergePropertyFields";

type Supabase = typeof supabase;

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function propertyOwnerKey(p: Property): string | null {
  const row = p as Property & { owner_id?: string | null };
  return (row.owner_id ?? p.user_id) || null;
}

async function safeUpdatePropertyId(
  client: Supabase,
  table: string,
  fromPropertyId: string,
  toPropertyId: string,
): Promise<void> {
  try {
    const { error } = await (client as any)
      .from(table)
      .update({ property_id: toPropertyId })
      .eq("property_id", fromPropertyId);
    if (!error) return;
    const m = String(error.message ?? "").toLowerCase();
    if (m.includes("does not exist") || m.includes("schema cache")) return;
    if (m.includes("column") && m.includes("property_id")) return;
    console.warn(`merge properties: skip ${table}`, error.message);
  } catch (e) {
    console.warn(`merge properties: skip ${table}`, e);
  }
}

/**
 * Move links from `secondaryPropertyId` onto `primaryPropertyId`, respecting UNIQUE(contact_id, property_id).
 */
async function mergeContactPropertyLinksForProperties(
  client: Supabase,
  primaryPropertyId: string,
  secondaryPropertyId: string,
): Promise<void> {
  try {
    const { data: secLinks, error } = await (client as any)
      .from("contact_property_links")
      .select("id, contact_id, role, notes")
      .eq("property_id", secondaryPropertyId);
    if (error) throw error;
    for (const link of secLinks ?? []) {
      const { data: existing } = await (client as any)
        .from("contact_property_links")
        .select("id, notes, role")
        .eq("property_id", primaryPropertyId)
        .eq("contact_id", link.contact_id)
        .maybeSingle();
      if (existing) {
        const mergedNotes = mergeLinkNotes(existing.notes, link.notes);
        if (mergedNotes !== trimStr(existing.notes)) {
          await (client as any).from("contact_property_links").update({ notes: mergedNotes }).eq("id", existing.id);
        }
        await (client as any).from("contact_property_links").delete().eq("id", link.id);
      } else {
        await (client as any).from("contact_property_links").update({ property_id: primaryPropertyId }).eq("id", link.id);
      }
    }
  } catch (e) {
    console.warn("merge properties: contact_property_links", e);
  }
}

/**
 * PostgREST schema-cache errors quote identifiers with backticks or single quotes depending on version/client.
 * Examples: Could not find the `building_size` column… / Could not find the 'building_size' column…
 */
function missingPropertyColumnFromError(message: string): string | null {
  const patterns = [
    /Could not find the `([^`]+)` column of `properties`/i,
    /Could not find the '([^']+)' column of 'properties'/i,
    /Could not find the "([^"]+)" column of "properties"/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const col = m?.[1]?.trim();
    if (col) return col;
  }
  return null;
}

/**
 * Update `properties` while dropping keys the live schema does not expose (HubSpot vs full CRM columns).
 */
async function updateMergedPropertyRow(client: Supabase, id: string, payload: Record<string, unknown>): Promise<void> {
  const p = { ...payload };
  for (let attempt = 0; attempt < 48; attempt++) {
    const { error } = await (client as any).from("properties").update(p).eq("id", id);
    if (!error) return;
    const errObj = error as { message?: string; details?: string; hint?: string };
    const msg = [errObj.message, errObj.details, errObj.hint].filter(Boolean).join(" ");
    const missing = missingPropertyColumnFromError(msg);
    if (missing && Object.prototype.hasOwnProperty.call(p, missing)) {
      delete p[missing];
      continue;
    }
    throw error;
  }
  throw new Error("Property merge update failed: too many unknown columns for this database schema.");
}

async function repointPropertyForeignKeys(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  await mergeContactPropertyLinksForProperties(client, primaryId, secondaryId);

  const tables = [
    "activities",
    "activity_log",
    "calendar_events",
    "contact_documents",
    "deals",
    "listings",
    "tasks",
  ] as const;
  for (const t of tables) {
    await safeUpdatePropertyId(client, t, secondaryId, primaryId);
  }
}

export type MergePropertiesInput = {
  primaryPropertyId: string;
  properties: Property[];
};

export function useMergeProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryPropertyId, properties }: MergePropertiesInput) => {
      const ids = [...new Set(properties.map((p) => p.id))];
      if (ids.length < 2) throw new Error("Select at least two properties to merge.");
      if (!ids.includes(primaryPropertyId)) throw new Error("The kept property must be one of the selected rows.");

      const primary = properties.find((p) => p.id === primaryPropertyId);
      if (!primary) throw new Error("Primary property not found.");

      const secondaries = properties.filter((p) => p.id !== primaryPropertyId);
      const secondaryIds = secondaries.map((p) => p.id);

      const ownerKeys = new Set(properties.map((p) => propertyOwnerKey(p)).filter(Boolean) as string[]);
      if (ownerKeys.size > 1) {
        throw new Error("Selected properties belong to different accounts; merge is not allowed.");
      }

      for (const sid of secondaryIds) {
        await repointPropertyForeignKeys(supabase, primaryPropertyId, sid);
      }

      const mergedPayload = buildMergedPropertyUpdate(primary, secondaries);
      await updateMergedPropertyRow(supabase, primaryPropertyId, mergedPayload);

      const { error: delErr } = await supabase.from("properties").delete().in("id", secondaryIds);
      if (delErr) throw delErr;

      return { primaryPropertyId, removedIds: secondaryIds };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property", data.primaryPropertyId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
