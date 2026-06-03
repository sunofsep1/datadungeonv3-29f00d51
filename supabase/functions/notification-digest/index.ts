import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron calls this with the service role key. All digest logic lives in Postgres
 * (`run_notification_digest_system`) so it stays in sync with the per-user RPC
 * and excludes prior `notification_digest` rows from counts.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      console.warn("Unauthorized call — not service_role key");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log(`[notification-digest] Starting at ${new Date().toISOString()}`);

    const { data, error } = await supabase.rpc("run_notification_digest_system");

    if (error) {
      console.error("[notification-digest] RPC error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[notification-digest] Completed:", data);
    return new Response(
      JSON.stringify({
        success: true,
        result: data,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notification-digest] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err), timestamp: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
