const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!NEWS_API_KEY) {
      return new Response(
        JSON.stringify({
          status: "ok",
          totalResults: 0,
          articles: [],
          error: "NEWS_API_KEY not configured. Add it in Supabase Edge Function secrets.",
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
    const data = await res.json();

    if (data.status === "error") {
      return new Response(
        JSON.stringify({ status: "error", articles: [], message: data.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
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
