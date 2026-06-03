import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  geocodePropertiesBatch,
  geocodePropertyRecord,
  getGeocodeBlockedMessage,
  isGeocodeServiceBlocked,
  propertyNeedsGeocode,
  subscribeGeocodeStatus,
  type GeocodableProperty,
} from "@/lib/propertyGeocode";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import type { PropertyForMarket } from "@/lib/contactMarkets";

export function useGeocodeBlockedMessage(): string | null {
  const [message, setMessage] = useState(getGeocodeBlockedMessage());
  useEffect(() => subscribeGeocodeStatus(() => setMessage(getGeocodeBlockedMessage())), []);
  return message;
}

export function usePropertyGeocode() {
  const queryClient = useQueryClient();

  const saveCoords = useMutation({
    mutationFn: async ({ propertyId, lat, lng }: { propertyId: string; lat: number; lng: number }) => {
      const { error } = await supabase
        .from("properties")
        .update({
          latitude: lat,
          longitude: lng,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const geocodeOne = useMutation({
    mutationFn: async (prop: PropertyForMarket & { id: string }) => {
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) throw new Error("Google Maps API key not configured");
      const coords = await geocodePropertyRecord(prop, apiKey);
      if (!coords) throw new Error("Could not geocode address");
      await saveCoords.mutateAsync({ propertyId: prop.id, ...coords });
      return coords;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const geocodeBatch = useMutation({
    mutationFn: async (properties: GeocodableProperty[]) => {
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) throw new Error("Google Maps API key not configured");
      const { results } = await geocodePropertiesBatch(properties, apiKey, { limit: 50, delayMs: 150 });
      for (const row of results) {
        await saveCoords.mutateAsync({ propertyId: row.id, lat: row.lat, lng: row.lng });
      }
      return results.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const saveCoordsBatch = useMutation({
    mutationFn: async (rows: Array<{ propertyId: string; lat: number; lng: number }>) => {
      for (const row of rows) {
        const { error } = await supabase
          .from("properties")
          .update({
            latitude: row.lat,
            longitude: row.lng,
            geocoded_at: new Date().toISOString(),
          })
          .eq("id", row.propertyId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  return { saveCoords, saveCoordsBatch, geocodeOne, geocodeBatch, propertyNeedsGeocode };
}

/** Fire-and-forget geocode after property save when coords missing. */
export async function tryGeocodePropertyAfterSave(
  prop: PropertyForMarket & { id: string },
): Promise<void> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey || !propertyNeedsGeocode(prop) || isGeocodeServiceBlocked()) return;
  try {
    const coords = await geocodePropertyRecord(prop, apiKey);
    if (!coords) return;
    await supabase
      .from("properties")
      .update({
        latitude: coords.lat,
        longitude: coords.lng,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", prop.id);
  } catch {
    // Non-blocking — map can retry later
  }
}
