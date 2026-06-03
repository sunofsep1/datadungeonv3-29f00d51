import { useMutation, useQuery } from "@tanstack/react-query";
import { enrichPropertyByAddress, fetchSuburbStats } from "@/lib/pricefinderClient";
import type { PricefinderPropertyData, PricefinderSuburbStats } from "@/lib/pricefinderTypes";

export function usePricefinderPropertyEnrich() {
  return useMutation({
    mutationFn: (address: string) => enrichPropertyByAddress(address),
  });
}

export function usePricefinderSuburbStats(
  suburb: string | null,
  state = "QLD",
  postcode?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["pricefinder", "suburb_stats", suburb, state, postcode],
    queryFn: () => fetchSuburbStats(suburb!, state, postcode),
    enabled: enabled && !!suburb?.trim(),
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}

export type { PricefinderPropertyData, PricefinderSuburbStats };
