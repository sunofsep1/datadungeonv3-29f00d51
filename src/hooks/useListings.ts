import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { updateLeadCategoriesFromDealChange } from "@/lib/leadCategoryService";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseMissingListingsTableColumn,
  LISTING_INSERT_STRIPPABLE_COLUMN_NAMES,
  isListingsPipelineStageCheckError,
  LISTING_PIPELINE_STAGE_LEGACY_FALLBACK,
  isListingsContactForeignKeyError,
  isListingsPropertyForeignKeyError,
} from "@/lib/supabaseErrorMessage";
import { invokeListingStageAutomation } from "@/lib/listingStageAutomation";

export type Listing = Tables<"listings">;
export type ListingInsert = TablesInsert<"listings">;
export type ListingUpdate = TablesUpdate<"listings">;

export type ListingWithContact = Listing & {
  contacts?: { id: string; name: string } | null;
};

export function useListing(id: string | undefined) {
  useRealtimeSubscription("listings", [["listings"], ["listing", id ?? ""]]);

  return useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Listing;
    },
    enabled: !!id,
  });
}

export function useListings() {
  // Subscribe to realtime changes
  useRealtimeSubscription("listings", [["listings"]]);

  return useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      // Try simple select first (HubSpot schema - listings table may not have contacts relation)
      const { data: simple, error: simpleError } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!simpleError && simple != null) {
        return ((simple ?? []) as Listing[]).map((l) => ({ ...l, contacts: null })) as ListingWithContact[];
      }
      const { data, error } = await supabase
        .from("listings")
        .select("*, contacts(id, name)")
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []) as ListingWithContact[];
      throw simpleError ?? error;
    },
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (listing: Omit<ListingInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const stripUndefined = (row: Record<string, unknown>) => {
        const o = { ...row };
        for (const k of Object.keys(o)) {
          if (o[k] === undefined) delete o[k];
        }
        return o;
      };

      let payload = stripUndefined({ ...listing, user_id: user.id } as Record<string, unknown>);
      const strippable = new Set<string>(LISTING_INSERT_STRIPPABLE_COLUMN_NAMES);

      for (let attempt = 0; attempt < strippable.size + 12; attempt++) {
        const res = await supabase.from("listings").insert(payload as never).select().single();
        if (!res.error) return res.data;

        const missing = parseMissingListingsTableColumn(res.error);
        if (missing && strippable.has(missing) && Object.prototype.hasOwnProperty.call(payload, missing)) {
          const { [missing]: _, ...rest } = payload;
          payload = stripUndefined(rest);
          continue;
        }

        if (
          isListingsContactForeignKeyError(res.error) &&
          Object.prototype.hasOwnProperty.call(payload, "contact_id") &&
          payload.contact_id != null
        ) {
          const { contact_id: _, ...rest } = payload;
          payload = stripUndefined(rest);
          continue;
        }

        if (
          isListingsPropertyForeignKeyError(res.error) &&
          Object.prototype.hasOwnProperty.call(payload, "property_id") &&
          payload.property_id != null
        ) {
          const { property_id: _pid, listing_image_url: _img, ...rest } = payload;
          payload = stripUndefined(rest);
          continue;
        }

        if (isListingsPipelineStageCheckError(res.error) && typeof payload.pipeline_stage === "string") {
          const fb = LISTING_PIPELINE_STAGE_LEGACY_FALLBACK[payload.pipeline_stage];
          if (fb && fb !== payload.pipeline_stage) {
            payload = stripUndefined({ ...payload, pipeline_stage: fb });
            continue;
          }
        }

        throw res.error;
      }
      throw new Error("Could not insert listing: too many schema retries");
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      if (data?.id) {
        const stage = variables.pipeline_stage ?? data.pipeline_stage ?? null;
        try {
          await updateLeadCategoriesFromDealChange(supabase as SupabaseClient<Database>, data.id, stage, {
            primaryContactId: data.contact_id ?? null,
          });
        } catch {
          /* migration not applied or column missing */
        }
        queryClient.invalidateQueries({ queryKey: ["listing", data.id] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
      }
    },
  });
}

export type ListingUpdateVariables = ListingUpdate & {
  id: string;
  /** When pipeline_stage changes, used for optional listing-stage automations */
  previous_pipeline_stage?: string | null;
};

export function useUpdateListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, previous_pipeline_stage: _prev, ...updates }: ListingUpdateVariables) => {
      let payload: ListingUpdate = { ...updates };

      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (!error) return data;

        if (
          isListingsPipelineStageCheckError(error) &&
          typeof payload.pipeline_stage === "string"
        ) {
          const fallback = LISTING_PIPELINE_STAGE_LEGACY_FALLBACK[payload.pipeline_stage];
          if (fallback && fallback !== payload.pipeline_stage) {
            payload = { ...payload, pipeline_stage: fallback };
            continue;
          }
        }

        throw error;
      }

      throw new Error("Could not update listing: incompatible pipeline_stage constraint");
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      if (
        data &&
        Object.prototype.hasOwnProperty.call(variables, "pipeline_stage") &&
        variables.pipeline_stage !== undefined
      ) {
        try {
          await updateLeadCategoriesFromDealChange(
            supabase as SupabaseClient<Database>,
            variables.id,
            variables.pipeline_stage,
            { primaryContactId: data.contact_id ?? null }
          );
        } catch {
          /* migration not applied */
        }
        queryClient.invalidateQueries({ queryKey: ["listing", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
        void invokeListingStageAutomation(
          variables.id,
          variables.previous_pipeline_stage ?? null,
          variables.pipeline_stage ?? data.pipeline_stage ?? null,
        );
      }
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
