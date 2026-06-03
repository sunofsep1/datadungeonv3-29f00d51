import { supabase } from "@/integrations/supabase/client";
import type {
  PricefinderErrorResponse,
  PricefinderPropertyData,
  PricefinderRequest,
  PricefinderSuburbStats,
} from "@/lib/pricefinderTypes";

function getProxyUrl(): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? `${base.replace(/\/$/, "")}/functions/v1/pricefinder-proxy` : null;
}

async function pricefinderFetch<T>(body: PricefinderRequest): Promise<T> {
  const url = getProxyUrl();
  if (!url) throw new Error("App URL not configured");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to load Pricefinder data");

  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(anonKey ? { apikey: anonKey } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as T & PricefinderErrorResponse;

  if (res.status === 503) {
    throw new Error(data.message ?? "Pricefinder not configured in Supabase secrets");
  }
  if (res.status === 404) {
    throw new Error(data.message ?? "No property match for this address");
  }
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Pricefinder request failed");
  }

  return data;
}

export function fetchPricefinderHealth(): Promise<{
  mode: "api" | "pdf";
  oauth_configured?: boolean;
  api_key_configured?: boolean;
}> {
  return pricefinderFetch({
    action: "health",
  } as PricefinderRequest & { action: "health" });
}

export function enrichPropertyByAddress(address: string): Promise<PricefinderPropertyData> {
  return pricefinderFetch<PricefinderPropertyData>({ full_address: address });
}

export function fetchSuburbStats(
  suburb: string,
  state = "QLD",
  postcode?: string,
): Promise<PricefinderSuburbStats> {
  return pricefinderFetch<PricefinderSuburbStats>({
    action: "suburb_stats",
    suburb,
    state,
    postcode,
  });
}

export function isPricefinderConfiguredError(message: string): boolean {
  return /not configured|503|OAuth|API Integration|widget key|PRICEFINDER_CLIENT/i.test(message);
}
