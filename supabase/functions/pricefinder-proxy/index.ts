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

/** Get Pricefinder Bearer token: OAuth (preferred) or direct API key */
async function getPricefinderToken(): Promise<string> {
  const clientId = PRICEFINDER_CLIENT_ID ?? PRICEFINDER_API_KEY;
  const clientSecret = PRICEFINDER_CLIENT_SECRET ?? PRICEFINDER_API_KEY;
  if (clientId && clientSecret) {
    const res = await fetch(`${PRICEFINDER_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { tokenKey?: string; access_token?: string };
      return data.tokenKey ?? data.access_token ?? "";
    }
  }
  if (PRICEFINDER_API_KEY) return PRICEFINDER_API_KEY;
  throw new Error("No Pricefinder credentials. Set PRICEFINDER_CLIENT_ID + PRICEFINDER_CLIENT_SECRET, or PRICEFINDER_API_KEY.");
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

    const pfToken = await getPricefinderToken();
    if (!pfToken) {
      return new Response(
        JSON.stringify({ error: "Pricefinder OAuth failed", message: "Could not obtain access token" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: PropertySearchRequest = {};
    try {
      body = await req.json();
    } catch {
      // optional body
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

    const pfHeaders = {
      Authorization: `Bearer ${pfToken}`,
      "Content-Type": "application/json",
    };

    // Some Pricefinder plans (e.g. widget) use apiKey as query param
    const queryKey = PRICEFINDER_API_KEY ? `&apiKey=${encodeURIComponent(PRICEFINDER_API_KEY)}` : "";
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
      const msg = (errData as { message?: string; error?: string })?.message ?? (errData as { message?: string; error?: string })?.error;
      return new Response(
        JSON.stringify({
          error: "Pricefinder API error",
          message: msg ?? `HTTP ${suggestRes.status}`,
          status: suggestRes.status,
          data: errData,
        }),
        {
          status: 502,
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
