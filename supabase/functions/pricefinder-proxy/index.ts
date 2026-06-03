import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICEFINDER_API_KEY = Deno.env.get("PRICEFINDER_API_KEY");
const PRICEFINDER_CLIENT_ID = Deno.env.get("PRICEFINDER_CLIENT_ID");
const PRICEFINDER_CLIENT_SECRET = Deno.env.get("PRICEFINDER_CLIENT_SECRET");
const PRICEFINDER_API = "https://api.pricefinder.com.au/v1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

/** Exchange OAuth client credentials for a Bearer tokenKey (Pricefinder v1). */
async function fetchOAuthToken(clientId: string, clientSecret: string): Promise<string | null> {
  const res = await fetch(`${PRICEFINDER_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { tokenKey?: string; access_token?: string };
  return data.tokenKey ?? data.access_token ?? null;
}

type PfAuth = {
  headers: Record<string, string>;
  queryKey: string;
  mode: "oauth" | "api_key_query";
};

/**
 * Pricefinder REST API expects OAuth client_id + client_secret → tokenKey → Bearer header.
 * Widget/portal "API keys" are NOT valid as Bearer tokens; some plans allow ?apiKey= only.
 */
async function resolvePricefinderAuth(): Promise<PfAuth | { error: string }> {
  if (PRICEFINDER_CLIENT_ID && PRICEFINDER_CLIENT_SECRET) {
    const token = await fetchOAuthToken(PRICEFINDER_CLIENT_ID, PRICEFINDER_CLIENT_SECRET);
    if (!token) {
      return {
        error:
          "Pricefinder OAuth failed for PRICEFINDER_CLIENT_ID + PRICEFINDER_CLIENT_SECRET. Check credentials in the Pricefinder portal (API Integration, not widget key).",
      };
    }
    return {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      queryKey: "",
      mode: "oauth",
    };
  }

  if (PRICEFINDER_API_KEY) {
    // Some accounts use the same value for both — try once, then fall back to ?apiKey= only.
    const token = await fetchOAuthToken(PRICEFINDER_API_KEY, PRICEFINDER_API_KEY);
    if (token) {
      return {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        queryKey: "",
        mode: "oauth",
      };
    }
    return {
      headers: { "Content-Type": "application/json" },
      queryKey: `&apiKey=${encodeURIComponent(PRICEFINDER_API_KEY)}`,
      mode: "api_key_query",
    };
  }

  return {
    error:
      "No Pricefinder credentials. Set PRICEFINDER_CLIENT_ID + PRICEFINDER_CLIENT_SECRET (recommended), or PRICEFINDER_API_KEY. See docs/PRICEFINDER_INTEGRATION.md.",
  };
}

function pricefinderAuthFailureMessage(status: number, mode: PfAuth["mode"]): string {
  if (status === 401) {
    if (mode === "api_key_query") {
      return (
        "Pricefinder rejected the API key (HTTP 401). Widget/portal keys usually cannot call the REST API. " +
        "In the Pricefinder portal, create an API Integration and set PRICEFINDER_CLIENT_ID + PRICEFINDER_CLIENT_SECRET in Supabase secrets."
      );
    }
    return "Pricefinder OAuth token was rejected (HTTP 401). Verify client ID and secret with Domain/Pricefinder support.";
  }
  return `Pricefinder API error (HTTP ${status})`;
}

interface PropertySearchRequest {
  address?: string;
  full_address?: string;
  street_number?: string;
  street_name?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  propertyId?: string;
  action?: string;
}

interface SuburbStatsResponse {
  suburb: string;
  state: string;
  sample_size: number;
  median_last_sale_price: number | null;
  recent_sales_count: number;
  note?: string;
}

interface PropertyResponse {
  address: string;
  lot_plan: string | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  land_area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  property_type: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token", message: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasOAuth = PRICEFINDER_CLIENT_ID && PRICEFINDER_CLIENT_SECRET;
    const hasApiKey = !!PRICEFINDER_API_KEY;
    if (!hasOAuth && !hasApiKey) {
      return new Response(
        JSON.stringify({
          error: "Pricefinder not configured",
          message: "Set PRICEFINDER_CLIENT_ID + PRICEFINDER_CLIENT_SECRET (OAuth), or PRICEFINDER_API_KEY. See docs/PRICEFINDER_INTEGRATION.md.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pfAuth = await resolvePricefinderAuth();
    if ("error" in pfAuth) {
      return new Response(JSON.stringify({ error: "Pricefinder auth failed", message: pfAuth.error }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { headers: pfHeaders, queryKey, mode: pfAuthMode } = pfAuth;

    let body: PropertySearchRequest = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    if (body.action === "health") {
    const oauthConfigured = !!(PRICEFINDER_CLIENT_ID && PRICEFINDER_CLIENT_SECRET);
    return new Response(
      JSON.stringify({
        mode: oauthConfigured ? "api" : "pdf",
        oauth_configured: oauthConfigured,
        api_key_configured: !!PRICEFINDER_API_KEY,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (body.action === "suburb_stats") {
      const suburb = body.suburb?.trim();
      const state = body.state?.trim() || "QLD";
      const postcode = body.postcode?.trim();
      if (!suburb) {
        return new Response(JSON.stringify({ error: "suburb required for suburb_stats" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const queryParts = [suburb, state, postcode, "Australia"].filter(Boolean);
      const searchQuery = queryParts.join(" ");
      const suggestUrl = `${PRICEFINDER_API}/suggest/properties?q=${encodeURIComponent(searchQuery)}${queryKey}`;
      const suggestRes = await fetch(suggestUrl, { headers: pfHeaders });

      if (!suggestRes.ok) {
        return new Response(
          JSON.stringify({
            error: "Pricefinder suburb lookup failed",
            message: pricefinderAuthFailureMessage(suggestRes.status, pfAuthMode),
            status: suggestRes.status,
          }),
          { status: suggestRes.status === 401 ? 503 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const suggestData = await suggestRes.json();
      const matches = (suggestData.matches ?? []).slice(0, 8) as Array<{
        property?: { id?: string };
        display?: string;
      }>;

      const salePrices: number[] = [];
      let recentSales = 0;

      for (const match of matches) {
        const propertyId = match.property?.id;
        if (!propertyId) continue;
        const detailUrl = `${PRICEFINDER_API}/properties/${propertyId}${queryKey ? `?${queryKey.slice(1)}` : ""}`;
        const detailRes = await fetch(detailUrl, { headers: pfHeaders });
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        const priceRaw = detail.lastSalePrice;
        const price =
          priceRaw != null
            ? typeof priceRaw === "number"
              ? priceRaw
              : parseInt(String(priceRaw), 10)
            : null;
        if (price != null && Number.isFinite(price)) {
          salePrices.push(price);
          recentSales += 1;
        }
      }

      salePrices.sort((a, b) => a - b);
      const median =
        salePrices.length > 0
          ? salePrices.length % 2 === 1
            ? salePrices[Math.floor(salePrices.length / 2)]!
            : Math.round(
                (salePrices[salePrices.length / 2 - 1]! + salePrices[salePrices.length / 2]!) / 2,
              )
          : null;

      const stats: SuburbStatsResponse = {
        suburb,
        state,
        sample_size: matches.length,
        median_last_sale_price: median,
        recent_sales_count: recentSales,
        note:
          matches.length === 0
            ? "No sample properties returned — check suburb name or API plan."
            : "Estimated from Pricefinder property sample (not official suburb report).",
      };

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search query: support full_address, address, or assembled parts
    let searchQuery = "";
    if (body.full_address && typeof body.full_address === "string") {
      searchQuery = body.full_address.trim();
    } else if (body.address && typeof body.address === "string") {
      searchQuery = body.address.trim();
    } else if (body.propertyId && typeof body.propertyId === "string") {
      searchQuery = body.propertyId.trim();
    } else {
      const parts = [
        body.street_number,
        body.street_name,
        body.suburb,
        body.state,
        body.postcode,
      ].filter(Boolean) as string[];
      searchQuery = parts.join(" ");
    }

    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: "No address provided. Send { address } or { full_address } or address parts." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const suggestUrl = `${PRICEFINDER_API}/suggest/properties?q=${encodeURIComponent(searchQuery)}${queryKey}`;
    const suggestRes = await fetch(suggestUrl, { headers: pfHeaders });

    if (!suggestRes.ok) {
      const text = await suggestRes.text();
      let errData: unknown;
      try {
        errData = text ? JSON.parse(text) : null;
      } catch {
        errData = { raw: text };
      }
      return new Response(
        JSON.stringify({
          error: "Pricefinder API error",
          message: pricefinderAuthFailureMessage(suggestRes.status, pfAuthMode),
          status: suggestRes.status,
          data: errData,
        }),
        {
          status: suggestRes.status === 401 ? 503 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const suggestData = await suggestRes.json();
    const match = suggestData.matches?.[0];

    if (!match) {
      return new Response(
        JSON.stringify({ message: "No property found", address: searchQuery }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const propertyId = match.property?.id;
    const propertyAddress = match.display ?? searchQuery;

    if (!propertyId) {
      return new Response(
        JSON.stringify({
          address: propertyAddress,
          lot_plan: match.legalDescription || null,
          last_sale_date: null,
          last_sale_price: null,
          land_area_sqm: null,
          bedrooms: null,
          bathrooms: null,
          carspaces: null,
          property_type: null,
        } as PropertyResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const detailUrl = `${PRICEFINDER_API}/properties/${propertyId}${queryKey ? `?${queryKey.slice(1)}` : ""}`;
    const detailRes = await fetch(detailUrl, { headers: pfHeaders });

    if (!detailRes.ok) {
      return new Response(
        JSON.stringify({
          address: propertyAddress,
          lot_plan: match.legalDescription || null,
          last_sale_date: null,
          last_sale_price: null,
          land_area_sqm: null,
          bedrooms: null,
          bathrooms: null,
          carspaces: null,
          property_type: null,
        } as PropertyResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const propertyDetail = await detailRes.json();
    const enrichedData: PropertyResponse = {
      address: propertyAddress,
      lot_plan: propertyDetail.legalDescription ?? match.legalDescription ?? null,
      last_sale_date: propertyDetail.lastSaleDate ?? null,
      last_sale_price:
        propertyDetail.lastSalePrice != null
          ? (typeof propertyDetail.lastSalePrice === "number"
              ? propertyDetail.lastSalePrice
              : parseInt(String(propertyDetail.lastSalePrice), 10))
          : null,
      land_area_sqm:
        propertyDetail.landAreaSqm != null
          ? (typeof propertyDetail.landAreaSqm === "number"
              ? propertyDetail.landAreaSqm
              : parseFloat(String(propertyDetail.landAreaSqm)))
          : null,
      bedrooms: propertyDetail.features?.bedrooms ?? null,
      bathrooms: propertyDetail.features?.bathrooms ?? null,
      carspaces: propertyDetail.features?.carspaces ?? null,
      property_type: propertyDetail.propertyType ?? null,
    };

    return new Response(JSON.stringify(enrichedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pricefinder-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
