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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
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

    const sourceDomain = (url.searchParams.get("domain") ?? "realestate.com.au").trim();

    const buildUrl = (opts: { query: string; domain?: string }) =>
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(opts.query)}` +
      (opts.domain ? `&domains=${encodeURIComponent(opts.domain)}` : "") +
      `&language=en` +
      `&sortBy=publishedAt` +
      `&pageSize=${pageSize}` +
      `&apiKey=${NEWS_API_KEY}`;

    // Try a specific property-news source first (realestate.com.au), then fallback.
    const primaryRes = await fetch(buildUrl({ query: q, domain: sourceDomain }));
    const primaryData = await primaryRes.json();

    if (primaryData.status === "error") {
      return new Response(
        JSON.stringify({ status: "error", articles: [], message: primaryData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const primaryArticles = Array.isArray(primaryData.articles) ? primaryData.articles : [];
    if (primaryArticles.length > 0) {
      return new Response(JSON.stringify(primaryData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to broader AU property coverage if source-specific search is empty.
    const fallbackRes = await fetch(buildUrl({ query: q }));
    const fallbackData = await fallbackRes.json();

    if (fallbackData.status === "error") {
      return new Response(
        JSON.stringify({ status: "error", articles: [], message: fallbackData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(fallbackData), {
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
