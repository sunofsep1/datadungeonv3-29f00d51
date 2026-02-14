import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICEFINDER_API_KEY = Deno.env.get("PRICEFINDER_API_KEY");
const PRICEFINDER_API_URL = Deno.env.get("PRICEFINDER_API_URL") || "https://api.pricefinder.com.au";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

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

    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PRICEFINDER_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Pricefinder not configured",
          message: "Set PRICEFINDER_API_KEY in Edge Function secrets. See docs/PRICEFINDER_INTEGRATION.md.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let body: { address?: string; propertyId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    const address = body?.address ?? body?.propertyId ?? "";
    if (!address || typeof address !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing address or propertyId in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Pricefinder API. Endpoint and format may vary; adjust per Pricefinder docs.
    const encoded = encodeURIComponent(address.trim());
    const url = `${PRICEFINDER_API_URL.replace(/\/$/, "")}/v1/valuation?address=${encoded}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PRICEFINDER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Pricefinder API error",
          status: res.status,
          data,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return simplified shape for the frontend. Adjust keys to match Pricefinder response.
    const simplified = {
      estimateMin: (data as any)?.estimateMin ?? (data as any)?.low ?? null,
      estimateMax: (data as any)?.estimateMax ?? (data as any)?.high ?? null,
      lastSale: (data as any)?.lastSale ?? (data as any)?.last_sale ?? null,
      raw: data,
    };

    return new Response(JSON.stringify(simplified), {
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
