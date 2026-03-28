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

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const mmCreds = mobileMessageCredsFromEnv();

function getContactEmail(contact: {
  email?: string | null;
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean | null }>;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "email" && c.is_primary);
  if (primary?.value) return String(primary.value);
  const anyE = channels.find((c) => c.channel_type === "email" && c.value);
  if (anyE?.value) return String(anyE.value);
  return contact.email ?? null;
}

function getContactPhone(contact: {
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean | null }>;
  mobile?: string | null;
  phone?: string | null;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "phone" && c.is_primary && c.value);
  if (primary?.value) return String(primary.value);
  const anyP = channels.find((c) => c.channel_type === "phone" && c.value);
  if (anyP?.value) return String(anyP.value);
  return contact.mobile ?? contact.phone ?? null;
}

function mergeListingTokens(
  text: string,
  ctx: { listing_address?: string | null; contact_name?: string | null },
): string {
  return text
    .replace(/\{\{\s*listing_address\s*\}\}/gi, ctx.listing_address ?? "")
    .replace(/\{\{\s*contact_name\s*\}\}/gi, ctx.contact_name ?? "");
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

    const token = authHeader.replace("Bearer ", "").trim();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
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
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null) as {
      listing_id?: string;
      new_stage?: string;
      previous_stage?: string | null;
    } | null;

    if (!body?.listing_id || !body?.new_stage) {
      return new Response(JSON.stringify({ error: "Expected listing_id and new_stage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.previous_stage != null && body.previous_stage === body.new_stage) {
      return new Response(JSON.stringify({ skipped: true, reason: "same_stage" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: listing, error: lErr } = await svc
      .from("listings")
      .select("id, user_id, address, contact_id")
      .eq("id", body.listing_id)
      .maybeSingle();

    if (lErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rule } = await svc
      .from("listing_stage_automations")
      .select("sms_body, email_subject, email_html")
      .eq("user_id", userId)
      .eq("pipeline_stage", body.new_stage)
      .maybeSingle();

    if (!rule || (!rule.sms_body?.trim() && !rule.email_subject?.trim())) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_rule" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!listing.contact_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_contact_on_listing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contact, error: cErr } = await svc
      .from("contacts")
      .select("id, name, email, mobile, phone, sms_opt_out, email_opt_out, contact_channels ( channel_type, value, is_primary )")
      .eq("id", listing.contact_id)
      .maybeSingle();

    if (cErr || !contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = {
      listing_address: listing.address ?? "",
      contact_name: contact.name ?? "",
    };

    const actions: Record<string, unknown> = {};

    if (rule.sms_body?.trim() && mmCreds && contact.sms_opt_out !== true) {
      const raw = getContactPhone(contact);
      if (raw?.trim()) {
        let to = raw.trim().replace(/\s/g, "");
        if (/^0?4\d{8}$/.test(to.replace(/\D/g, "")) || /^61\d{9}$/.test(to.replace(/\D/g, ""))) {
          to = toE164Australia(to);
        }
        if (digitsKey(to).length >= 8) {
          const msg = mergeListingTokens(rule.sms_body, ctx);
          const batch = await postMobileMessageBatch(mmCreds, [{ to, message: msg }]);
          if (batch.ok) {
            const first = (batch.data?.results as Array<{ message_id?: string }> | undefined)?.[0];
            await svc.from("sms_outbound").insert({
              user_id: userId,
              contact_id: contact.id,
              to_phone: to,
              body_preview: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg,
              provider: "mobile_message",
              provider_message_id: first?.message_id ?? null,
              status: "sent",
              error: null,
            });
            actions.sms = "sent";
          } else {
            actions.sms = "failed";
            actions.sms_error = batch.data;
          }
        } else actions.sms = "skipped_invalid_phone";
      } else actions.sms = "skipped_no_phone";
    } else if (rule.sms_body?.trim()) actions.sms = "skipped_no_mm_or_opt_out";

    if (rule.email_subject?.trim() && RESEND_API_KEY && contact.email_opt_out !== true) {
      const to = getContactEmail(contact);
      if (to) {
        const sub = mergeListingTokens(rule.email_subject, ctx);
        const html = mergeListingTokens(rule.email_html ?? `<p></p>`, ctx);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [to],
            subject: sub,
            html: html || "<p></p>",
          }),
        });
        actions.email = res.ok ? "sent" : "failed";
        if (!res.ok) actions.email_error = await res.json().catch(() => ({}));
      } else actions.email = "skipped_no_email";
    } else if (rule.email_subject?.trim()) actions.email = "skipped_no_resend_or_opt_out";

    return new Response(JSON.stringify({ ok: true, actions }), {
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
