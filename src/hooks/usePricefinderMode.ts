import { useQuery } from "@tanstack/react-query";
import { fetchPricefinderHealth, isPricefinderConfiguredError } from "@/lib/pricefinderClient";
import { resolvePricefinderMode, type PricefinderMode } from "@/lib/pricefinderMode";

export function usePricefinderMode() {
  const query = useQuery({
    queryKey: ["pricefinder", "mode"],
    queryFn: async (): Promise<PricefinderMode> => {
      try {
        const health = await fetchPricefinderHealth();
        return resolvePricefinderMode(health.mode);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (isPricefinderConfiguredError(msg)) return "pdf";
        return "pdf";
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return {
    mode: query.data ?? "pdf",
    isLoading: query.isLoading,
    ...query,
  };
}
