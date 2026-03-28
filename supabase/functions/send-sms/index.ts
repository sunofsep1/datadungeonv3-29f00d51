import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  digitsKey,
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
} from "../_shared/smsCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const mmCreds = mobileMessageCredsFromEnv();
const useMobileMessage = Boolean(mmCreds);

function previewBody(text: string, max = 200): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token. Sign in and try again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (useMobileMessage) {
      if (!mmCreds) {
        return new Response(
          JSON.stringify({ error: "Mobile Message not fully configured." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({
          error:
            "SMS service not configured. Set MOBILE_MESSAGE_* or TWILIO_* secrets on send-sms.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let payload: { to?: string; body?: string; contact_id?: string | null };
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, body: messageBody, contact_id } = payload;

    if (!to || typeof to !== "string" || !to.trim()) {
      return new Response(JSON.stringify({ error: "Missing to (phone number)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!messageBody || typeof messageBody !== "string" || !messageBody.trim()) {
      return new Response(JSON.stringify({ error: "Missing body (message text)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

    let resolvedContactId: string | null = contact_id && typeof contact_id === "string" ? contact_id : null;

    if (resolvedContactId && !svc) {
      return new Response(
        JSON.stringify({
          error:
            "Server missing SUPABASE_SERVICE_ROLE_KEY on send-sms. Add it in Supabase Dashboard to enforce opt-out and logging.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (svc && resolvedContactId) {
      const { data: row } = await svc
        .from("contacts")
        .select("id, sms_opt_out, user_id, owner_id")
        .eq("id", resolvedContactId)
        .maybeSingle();

      const ok =
        row &&
        (row.user_id === userId || row.owner_id === userId);
      if (!ok) {
        return new Response(JSON.stringify({ error: "Contact not found or access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (row.sms_opt_out === true) {
        return new Response(JSON.stringify({ error: "Contact has opted out of SMS" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (svc) {
      let toNorm = to.trim().replace(/\s/g, "");
      if (/^0?4\d{8}$/.test(toNorm.replace(/\D/g, "")) || /^61\d{9}$/.test(toNorm.replace(/\D/g, ""))) {
        toNorm = toE164Australia(toNorm);
      }
      const key = digitsKey(toNorm);

      const [{ data: byUser }, { data: byOwner }] = await Promise.all([
        svc.from("contacts").select("id, sms_opt_out").eq("user_id", userId),
        svc.from("contacts").select("id, sms_opt_out").eq("owner_id", userId),
      ]);
      const contactMeta = new Map<string, boolean | null>();
      for (const r of [...(byUser ?? []), ...(byOwner ?? [])] as { id: string; sms_opt_out: boolean | null }[]) {
        contactMeta.set(r.id, r.sms_opt_out);
      }
      const ids = [...contactMeta.keys()];
      if (ids.length > 0) {
        const { data: chs } = await svc
          .from("contact_channels")
          .select("contact_id, value")
          .eq("channel_type", "phone")
          .in("contact_id", ids);
        for (const ch of chs ?? []) {
          if (!ch.value || digitsKey(ch.value) !== key) continue;
          const opt = contactMeta.get(ch.contact_id);
          if (opt === true) {
            return new Response(JSON.stringify({ error: "Contact has opted out of SMS" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          resolvedContactId = ch.contact_id;
          break;
        }
      }
    }

    let toNormalized = to.trim().replace(/\s/g, "");
    if (/^0?4\d{8}$/.test(toNormalized.replace(/\D/g, "")) || /^61\d{9}$/.test(toNormalized.replace(/\D/g, ""))) {
      toNormalized = toE164Australia(toNormalized);
    }

    const provider = useMobileMessage ? "mobile_message" : "twilio";
    let providerMessageId: string | null = null;
    let sendError: string | null = null;

    if (useMobileMessage && mmCreds) {
      const batch = await postMobileMessageBatch(mmCreds, [{ to: toNormalized, message: messageBody.trim() }]);
      if (!batch.ok) {
        sendError =
          (batch.data?.error as string) ||
          (batch.data?.message as string) ||
          `Mobile Message HTTP ${batch.status}`;
      } else {
        const first = (batch.data?.results as Array<{ message_id?: string; status?: string }> | undefined)?.[0];
        providerMessageId = first?.message_id ?? first?.status ?? null;
      }
    } else {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      const form = new URLSearchParams({
        To: toNormalized,
        From: TWILIO_PHONE_NUMBER!,
        Body: messageBody.trim(),
      });
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const resData = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; error_message?: string };
      if (!res.ok) {
        sendError = resData?.message || resData?.error_message || res.statusText || "Twilio failed";
      } else {
        providerMessageId = resData.sid ?? null;
      }
    }

    if (sendError) {
      if (svc) {
        await svc.from("sms_outbound").insert({
          user_id: userId,
          contact_id: resolvedContactId,
          to_phone: toNormalized,
          body_preview: previewBody(messageBody),
          provider,
          provider_message_id: null,
          status: "failed",
          error: sendError.slice(0, 500),
        });
      }
      return new Response(JSON.stringify({ error: sendError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (svc) {
      await svc.from("sms_outbound").insert({
        user_id: userId,
        contact_id: resolvedContactId,
        to_phone: toNormalized,
        body_preview: previewBody(messageBody),
        provider,
        provider_message_id: providerMessageId,
        status: "sent",
        error: null,
      });
    }

    return new Response(JSON.stringify({ sid: providerMessageId, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
