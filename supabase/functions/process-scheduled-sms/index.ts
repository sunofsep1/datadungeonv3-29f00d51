/**
 * Dispatches due scheduled SMS broadcasts for the authenticated user.
 * Call from the SMS suite when the page loads or via a "Run due sends" action.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SmsMergeFields } from "../_shared/smsCore.ts";
import { runSmsBroadcast } from "../_shared/smsBroadcastRun.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimData.claims.sub as string;
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const { data: due, error: qErr } = await svc
      .from("sms_scheduled_broadcasts")
      .select("id, message, merge_fields, append_opt_out, title")
      .eq("user_id", userId)
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true });

    if (qErr) {
      return new Response(JSON.stringify({ error: qErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = due ?? [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: commRow } = await svc
      .from("user_communication_settings")
      .select("sms_signature")
      .eq("user_id", userId)
      .maybeSingle();
    const smsSignatureFromDb = typeof commRow?.sms_signature === "string" ? commRow.sms_signature.trim() : "";

    const results: Array<{
      broadcast_id: string;
      ok: boolean;
      error?: string;
      sent?: number;
      skipped?: number;
      failures?: number;
    }> = [];

    for (const row of rows) {
      const bid = row.id as string;
      const { data: recRows, error: rErr } = await svc
        .from("sms_scheduled_broadcast_recipients")
        .select("contact_id")
        .eq("broadcast_id", bid);
      if (rErr) {
        await svc
          .from("sms_scheduled_broadcasts")
          .update({
            status: "failed",
            error: rErr.message.slice(0, 500),
            updated_at: nowIso,
            completed_at: nowIso,
          })
          .eq("id", bid);
        results.push({ broadcast_id: bid, ok: false, error: rErr.message });
        continue;
      }

      const contactIds = (recRows ?? []).map((r: { contact_id: string }) => r.contact_id).filter(Boolean);
      if (contactIds.length === 0) {
        await svc
          .from("sms_scheduled_broadcasts")
          .update({
            status: "failed",
            error: "No recipients",
            updated_at: nowIso,
            completed_at: nowIso,
          })
          .eq("id", bid);
        results.push({ broadcast_id: bid, ok: false, error: "No recipients" });
        continue;
      }

      const raw = row.merge_fields as Record<string, unknown> | null;
      const mergeFields: SmsMergeFields = {
        custom1: typeof raw?.custom1 === "string" ? raw.custom1 : "",
        custom2: typeof raw?.custom2 === "string" ? raw.custom2 : "",
        custom3: typeof raw?.custom3 === "string" ? raw.custom3 : "",
        custom4: typeof raw?.custom4 === "string" ? raw.custom4 : "",
      };
      const appendOptOut = row.append_opt_out !== false;
      const message = String(row.message ?? "").trim();

      try {
        const out = await runSmsBroadcast(
          svc,
          userId,
          contactIds,
          message,
          mergeFields,
          appendOptOut,
          smsSignatureFromDb,
          null,
        );
        const failed = out.sent === 0 && out.failures.length > 0;
        await svc
          .from("sms_scheduled_broadcasts")
          .update({
            status: failed ? "failed" : "completed",
            error: failed ? out.failures.map((f) => f.error).join("; ").slice(0, 500) : null,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", bid);
        results.push({
          broadcast_id: bid,
          ok: !failed,
          sent: out.sent,
          skipped: out.skipped.length,
          failures: out.failures.length,
          ...(failed ? { error: "All sends failed or provider error" } : {}),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        await svc
          .from("sms_scheduled_broadcasts")
          .update({
            status: "failed",
            error: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", bid);
        results.push({ broadcast_id: bid, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
