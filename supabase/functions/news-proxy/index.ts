import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY");
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

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!NEWS_API_KEY) {
      return new Response(
        JSON.stringify({
          status: "ok",
          totalResults: 0,
          articles: [],
          error: "NEWS_API_KEY not configured. Add it in Edge Function secrets.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "real estate OR property OR housing Australia";
    const pageSize = Math.min(Number(url.searchParams.get("pageSize")) || 10, 20);

    const apiUrl =
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(q)}` +
      `&language=en` +
      `&sortBy=publishedAt` +
      `&pageSize=${pageSize}` +
      `&apiKey=${NEWS_API_KEY}`;

    const res = await fetch(apiUrl);
    const resData = await res.json();

    if (resData.status === "error") {
      return new Response(
        JSON.stringify({ status: "error", articles: [], message: resData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("News proxy error:", err);
    return new Response(
      JSON.stringify({ status: "error", articles: [], message: "Failed to fetch news" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
