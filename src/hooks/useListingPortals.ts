import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import type { PortalStatus } from "@/lib/listingPortals";
import { legacyListingPortalPatch } from "@/lib/listingPortals";

export type ListingPortalConfig = {
  id: string;
  listing_id: string;
  user_id: string;
  portal_key: string;
  enabled: boolean;
  last_status: string;
  last_pushed_at: string | null;
  portal_listing_id: string | null;
  last_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingPortalFeedLog = {
  id: string;
  listing_id: string;
  user_id: string;
  portal_key: string;
  exported_at: string;
  processed_at: string | null;
  portal_listing_id: string | null;
  status: string;
  message: string | null;
  created_at: string;
};

export function useListingPortalConfigs(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_portal_configs", listingId ?? ""],
    queryFn: async (): Promise<ListingPortalConfig[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_portal_configs")
        .select("*")
        .eq("listing_id", listingId)
        .order("portal_key", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingPortalConfig[];
    },
    enabled: !!listingId,
  });
}

export function useListingPortalFeedLogs(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_portal_feed_logs", listingId ?? ""],
    queryFn: async (): Promise<ListingPortalFeedLog[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("listing_portal_feed_logs")
        .select("*")
        .eq("listing_id", listingId)
        .order("exported_at", { ascending: false })
        .limit(50);
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingPortalFeedLog[];
    },
    enabled: !!listingId,
  });
}

export function useUpsertListingPortalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      portal_key: string;
      enabled: boolean;
      last_status?: PortalStatus;
      portal_listing_id?: string | null;
      last_message?: string | null;
      log_export?: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const status = input.last_status ?? (input.enabled ? "pending" : "not_listed");
      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from("listing_portal_configs")
        .select("id")
        .eq("listing_id", input.listing_id)
        .eq("portal_key", input.portal_key)
        .maybeSingle();

      let row: ListingPortalConfig;
      if (existing?.id) {
        const { data, error } = await supabase
          .from("listing_portal_configs")
          .update({
            enabled: input.enabled,
            last_status: status,
            last_pushed_at: input.enabled ? now : null,
            portal_listing_id: input.portal_listing_id ?? null,
            last_message: input.last_message?.trim() || null,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw new Error(supabaseErrorMessage(error));
        row = data as ListingPortalConfig;
      } else {
        const { data, error } = await supabase
          .from("listing_portal_configs")
          .insert({
            listing_id: input.listing_id,
            user_id: user.id,
            portal_key: input.portal_key,
            enabled: input.enabled,
            last_status: status,
            last_pushed_at: input.enabled ? now : null,
            portal_listing_id: input.portal_listing_id ?? null,
            last_message: input.last_message?.trim() || null,
          })
          .select()
          .single();
        if (error) throw new Error(supabaseErrorMessage(error));
        row = data as ListingPortalConfig;
      }

      const legacy = legacyListingPortalPatch(input.portal_key, input.enabled, status);
      if (legacy) {
        await supabase.from("listings").update(legacy).eq("id", input.listing_id);
      }

      if (input.log_export && input.enabled) {
        await supabase.from("listing_portal_feed_logs").insert({
          listing_id: input.listing_id,
          user_id: user.id,
          portal_key: input.portal_key,
          exported_at: now,
          processed_at: status === "live" ? now : null,
          portal_listing_id: input.portal_listing_id ?? null,
          status: status === "error" ? "error" : status === "live" ? "processed" : "pending",
          message: input.last_message?.trim() || `Export queued to ${input.portal_key}`,
        });
      }

      return row;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_portal_configs", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing_portal_feed_logs", row.listing_id] });
      void qc.invalidateQueries({ queryKey: ["listing", row.listing_id] });
    },
  });
}

export function useAddListingPortalFeedLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      portal_key: string;
      message?: string | null;
      portal_listing_id?: string | null;
      status?: string;
      processed?: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("listing_portal_feed_logs")
        .insert({
          listing_id: input.listing_id,
          user_id: user.id,
          portal_key: input.portal_key,
          exported_at: now,
          processed_at: input.processed ? now : null,
          portal_listing_id: input.portal_listing_id ?? null,
          status: input.status ?? (input.processed ? "processed" : "pending"),
          message: input.message?.trim() || null,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingPortalFeedLog;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_portal_feed_logs", row.listing_id] });
    },
  });
}
