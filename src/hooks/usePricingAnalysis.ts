import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AnalysisRow = Database["public"]["Tables"]["pricing_analyses"]["Row"];
type BracketRow = Database["public"]["Tables"]["price_brackets"]["Row"];
type CompetitorRow = Database["public"]["Tables"]["competitor_listings"]["Row"];

export type PricingBundle = AnalysisRow & {
  price_brackets: BracketRow[];
  competitor_listings: CompetitorRow[];
};

/** Half-open style steps from tam_low toward tam_high using bracket_size (e.g. 25_000). */
export function buildBracketRows(tamLow: number, tamHigh: number, bracketSize: number) {
  if (!(Number.isFinite(tamLow) && Number.isFinite(tamHigh)) || !(tamHigh > tamLow) || !(bracketSize > 0)) {
    return [];
  }
  const rows: { bracket_low: number; bracket_high: number }[] = [];
  let v = tamLow;
  for (let i = 0; i < 500 && v < tamHigh - 1e-6; i++) {
    const hi = Math.min(v + bracketSize, tamHigh);
    rows.push({ bracket_low: v, bracket_high: hi });
    if (hi <= v) break;
    v = hi;
  }
  return rows;
}

export function pickSuggestedBracketLow(brackets: BracketRow[]): number | null {
  if (!brackets.length) return null;
  const scored = brackets.map((b) => ({
    b,
    s: b.opportunity_score != null ? Number(b.opportunity_score) : Number.NEGATIVE_INFINITY,
    d: b.recent_demand ?? 0,
  }));
  scored.sort((a, b) => b.s - a.s || b.d - a.d);
  const top = scored[0]?.b;
  return top ? Number(top.bracket_low) : null;
}

export function usePricingAnalysis(listingId: string | undefined) {
  return useQuery({
    queryKey: ["pricing-analysis", listingId],
    enabled: Boolean(listingId),
    queryFn: async (): Promise<PricingBundle | null> => {
      if (!listingId) return null;
      const { data, error } = await supabase
        .from("pricing_analyses")
        .select(
          `
          *,
          price_brackets (*),
          competitor_listings (*)
        `
        )
        .eq("listing_id", listingId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as PricingBundle;
      const brackets = [...(row.price_brackets ?? [])].sort(
        (a, b) => Number(a.bracket_low) - Number(b.bracket_low)
      );
      return {
        ...row,
        price_brackets: brackets,
        competitor_listings: row.competitor_listings ?? [],
      };
    },
  });
}

export function useCreatePricingAnalysisWithBrackets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      listingId: string;
      tamLow: number;
      tamHigh: number;
      bracketSize: number;
      listingPriceEstimate: number | null;
      notes: string | null;
    }) => {
      const rows = buildBracketRows(payload.tamLow, payload.tamHigh, payload.bracketSize);
      if (rows.length === 0) {
        throw new Error("TAM range and bracket size must produce at least one bracket.");
      }

      const { data: analysis, error: aErr } = await supabase
        .from("pricing_analyses")
        .insert({
          listing_id: payload.listingId,
          tam_low: payload.tamLow,
          tam_high: payload.tamHigh,
          bracket_size: payload.bracketSize,
          listing_price_estimate: payload.listingPriceEstimate,
          notes: payload.notes,
        })
        .select("*")
        .single();

      if (aErr) throw aErr;

      const { error: bErr } = await supabase.from("price_brackets").insert(
        rows.map((r) => ({
          analysis_id: analysis.id,
          bracket_low: r.bracket_low,
          bracket_high: r.bracket_high,
          active_supply: 0,
          recent_demand: 0,
        }))
      );

      if (bErr) {
        await supabase.from("pricing_analyses").delete().eq("id", analysis.id);
        throw bErr;
      }

      return analysis;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-analysis", v.listingId] });
    },
  });
}

export function useRebuildPriceBrackets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      listingId: string;
      analysisId: string;
      tamLow: number;
      tamHigh: number;
      bracketSize: number;
    }) => {
      const rows = buildBracketRows(payload.tamLow, payload.tamHigh, payload.bracketSize);
      if (rows.length === 0) {
        throw new Error("Invalid TAM or bracket size.");
      }

      const { error: delErr } = await supabase
        .from("price_brackets")
        .delete()
        .eq("analysis_id", payload.analysisId);
      if (delErr) throw delErr;

      const { error: uErr } = await supabase
        .from("pricing_analyses")
        .update({
          tam_low: payload.tamLow,
          tam_high: payload.tamHigh,
          bracket_size: payload.bracketSize,
          recommended_price: null,
        })
        .eq("id", payload.analysisId);
      if (uErr) throw uErr;

      const { error: insErr } = await supabase.from("price_brackets").insert(
        rows.map((r) => ({
          analysis_id: payload.analysisId,
          bracket_low: r.bracket_low,
          bracket_high: r.bracket_high,
          active_supply: 0,
          recent_demand: 0,
        }))
      );
      if (insErr) throw insErr;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-analysis", v.listingId] });
    },
  });
}

export function useUpdatePricingAnalysisFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      listingId: string;
      id: string;
      patch: Partial<
        Pick<
          AnalysisRow,
          "listing_price_estimate" | "notes" | "recommended_price" | "tam_low" | "tam_high" | "bracket_size"
        >
      >;
    }) => {
      const { error } = await supabase.from("pricing_analyses").update(payload.patch).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-analysis", v.listingId] });
    },
  });
}

export function useUpdatePriceBracket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      listingId: string;
      id: string;
      active_supply: number;
      recent_demand: number;
    }) => {
      const { error } = await supabase
        .from("price_brackets")
        .update({
          active_supply: payload.active_supply,
          recent_demand: payload.recent_demand,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-analysis", v.listingId] });
    },
  });
}

export function useAddCompetitorListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      listingId: string;
      analysisId: string;
      address: string;
      listPrice: number | null;
      dom: number | null;
      condition: "better" | "same" | "worse" | null;
      notes: string | null;
    }) => {
      const { error } = await supabase.from("competitor_listings").insert({
        analysis_id: payload.analysisId,
        address: payload.address.trim(),
        list_price: payload.listPrice,
        days_on_market: payload.dom,
        condition_vs_ours: payload.condition,
        notes: payload.notes,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-analysis", v.listingId] });
    },
  });
}

export function useDeleteCompetitorListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { listingId: string; id: string }) => {
      const { error } = await supabase.from("competitor_listings").delete().eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["pricing-analysis", v.listingId] });
    },
  });
}
