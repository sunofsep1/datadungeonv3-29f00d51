import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UsageEventInput = {
  user_id: string | null;
  request_id: string | null;
  model: string;
  usage_date: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost_usd: number;
  raw_payload: Record<string, unknown>;
};

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function pickRows(json: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(json.data)) return json.data as Record<string, unknown>[];
  if (Array.isArray(json.results)) return json.results as Record<string, unknown>[];
  if (Array.isArray((json as { usage?: unknown }).usage)) return (json as { usage: Record<string, unknown>[] }).usage;
  return [];
}

function normalizeUsageRow(row: Record<string, unknown>): UsageEventInput {
  const input = toNumber(row.input_tokens ?? row.input_token_count);
  const output = toNumber(row.output_tokens ?? row.output_token_count);
  const cacheCreate = toNumber(row.cache_creation_tokens ?? row.cache_creation_input_tokens);
  const cacheRead = toNumber(row.cache_read_tokens ?? row.cache_read_input_tokens);
  const total = toNumber(row.total_tokens) || input + output + cacheCreate + cacheRead;

  return {
    user_id: row.user_id ? String(row.user_id) : null,
    request_id: row.request_id ? String(row.request_id) : null,
    model: String(row.model ?? row.model_name ?? "unknown"),
    usage_date: toDate(row.usage_date ?? row.created_at ?? row.date),
    input_tokens: input,
    output_tokens: output,
    cache_creation_tokens: cacheCreate,
    cache_read_tokens: cacheRead,
    total_tokens: total,
    cost_usd: toNumber(row.cost_usd ?? row.usd ?? row.total_cost_usd),
    raw_payload: row,
  };
}

function aggregateDaily(rows: UsageEventInput[]) {
  const map = new Map<string, UsageEventInput>();
  for (const row of rows) {
    const key = [row.user_id ?? "null", row.usage_date, "anthropic", row.model].join("|");
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...row });
      continue;
    }
    prev.input_tokens += row.input_tokens;
    prev.output_tokens += row.output_tokens;
    prev.cache_creation_tokens += row.cache_creation_tokens;
    prev.cache_read_tokens += row.cache_read_tokens;
    prev.total_tokens += row.total_tokens;
    prev.cost_usd += row.cost_usd;
    map.set(key, prev);
  }
  return [...map.values()].map((row) => ({
    user_id: row.user_id,
    usage_date: row.usage_date,
    provider: "anthropic",
    model: row.model,
    input_tokens: row.input_tokens,
    output_tokens: row.output_tokens,
    cache_creation_tokens: row.cache_creation_tokens,
    cache_read_tokens: row.cache_read_tokens,
    total_tokens: row.total_tokens,
    cost_usd: row.cost_usd,
    updated_at: new Date().toISOString(),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: "Missing ANTHROPIC_API_KEY env var" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const start = String((body as { start_date?: string }).start_date ?? "");
    const end = String((body as { end_date?: string }).end_date ?? "");
    const usageUrlBase =
      Deno.env.get("ANTHROPIC_USAGE_URL") ?? "https://api.anthropic.com/v1/organizations/usage_report/messages";
    const usageUrl = new URL(usageUrlBase);
    if (start) usageUrl.searchParams.set("start_date", toDate(start));
    if (end) usageUrl.searchParams.set("end_date", toDate(end));

    const apiRes = await fetch(usageUrl.toString(), {
      method: "GET",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    });

    if (!apiRes.ok) {
      const txt = await apiRes.text();
      return new Response(
        JSON.stringify({
          error: "Anthropic usage request failed",
          status: apiRes.status,
          body: txt.slice(0, 700),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = (await apiRes.json()) as Record<string, unknown>;
    const sourceRows = pickRows(json);
    const events = sourceRows.map(normalizeUsageRow);

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, inserted_events: 0, upserted_daily: 0, note: "No usage rows returned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: eventsErr } = await (supabase as any).from("ai_usage_events").insert(
      events.map((e) => ({
        user_id: e.user_id,
        source: "anthropic",
        provider_request_id: e.request_id,
        model: e.model,
        usage_date: e.usage_date,
        input_tokens: e.input_tokens,
        output_tokens: e.output_tokens,
        cache_creation_tokens: e.cache_creation_tokens,
        cache_read_tokens: e.cache_read_tokens,
        total_tokens: e.total_tokens,
        cost_usd: e.cost_usd,
        raw_payload: e.raw_payload,
        fetched_at: new Date().toISOString(),
      })),
    );
    if (eventsErr) throw eventsErr;

    const dailyRows = aggregateDaily(events);
    const { error: dailyErr } = await (supabase as any)
      .from("ai_usage_daily")
      .upsert(dailyRows, { onConflict: "user_id,usage_date,provider,model" });
    if (dailyErr) throw dailyErr;

    return new Response(
      JSON.stringify({
        success: true,
        inserted_events: events.length,
        upserted_daily: dailyRows.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
