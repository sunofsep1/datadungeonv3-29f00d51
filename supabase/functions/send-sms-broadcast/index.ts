import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type SmsMergeFields } from "../_shared/smsCore.ts";
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

    const token = authHeader.replace("Bearer ", "").trim();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY for broadcast logging" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: commRow } = await svc
      .from("user_communication_settings")
      .select("sms_signature")
      .eq("user_id", userId)
      .maybeSingle();
    const smsSignatureFromDb = typeof commRow?.sms_signature === "string" ? commRow.sms_signature.trim() : "";

    const body = await req.json().catch(() => null) as {
      contact_ids?: string[];
      message?: string;
      merge_fields?: SmsMergeFields;
      append_opt_out_if_missing?: boolean;
    } | null;

    if (!body?.contact_ids || !Array.isArray(body.contact_ids) || !body.message?.trim()) {
      return new Response(
        JSON.stringify({
          error:
            "Expected { contact_ids: string[], message: string, merge_fields?: object, append_opt_out_if_missing?: boolean }",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const mergeFields: SmsMergeFields = {
      custom1: typeof body.merge_fields?.custom1 === "string" ? body.merge_fields.custom1 : "",
      custom2: typeof body.merge_fields?.custom2 === "string" ? body.merge_fields.custom2 : "",
      custom3: typeof body.merge_fields?.custom3 === "string" ? body.merge_fields.custom3 : "",
      custom4: typeof body.merge_fields?.custom4 === "string" ? body.merge_fields.custom4 : "",
    };
    const appendOptOut = body.append_opt_out_if_missing !== false;

    try {
      const result = await runSmsBroadcast(
        svc,
        userId,
        body.contact_ids,
        body.message.trim(),
        mergeFields,
        appendOptOut,
        smsSignatureFromDb,
        null,
      );
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Broadcast failed";
      const status = msg.includes("Mobile Message") ? 501 : 400;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
