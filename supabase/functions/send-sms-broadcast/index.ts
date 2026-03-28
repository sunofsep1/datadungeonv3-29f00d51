import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  appendCommercialOptOutIfMissing,
  digitsKey,
  mergeSmsTemplateForRecipient,
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
  type SmsMergeFields,
} from "../_shared/smsCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MM_BATCH = 100;
const MAX_RECIPIENTS = 2000;

const mmCreds = mobileMessageCredsFromEnv();

function previewBody(text: string, max = 200): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

type RecipientRow = {
  id: string;
  sms_opt_out: boolean | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  contact_channels: { channel_type: string; value: string | null; is_primary: boolean | null }[];
};

function primaryPhone(channels: RecipientRow["contact_channels"]): string | null {
  const list = channels ?? [];
  const primary = list.find((c) => c.channel_type === "phone" && c.is_primary && c.value);
  if (primary?.value) return primary.value;
  const anyP = list.find((c) => c.channel_type === "phone" && c.value);
  return anyP?.value ?? null;
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

    if (!mmCreds) {
      return new Response(
        JSON.stringify({
          error:
            "Bulk SMS requires Mobile Message. Set MOBILE_MESSAGE_API_USER, MOBILE_MESSAGE_API_PASSWORD, MOBILE_MESSAGE_SENDER on this function.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    const uniqueIds = [...new Set(body.contact_ids.filter((id) => typeof id === "string" && id.length > 0))];
    if (uniqueIds.length === 0) {
      return new Response(JSON.stringify({ error: "No valid contact_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (uniqueIds.length > MAX_RECIPIENTS) {
      return new Response(JSON.stringify({ error: `Maximum ${MAX_RECIPIENTS} contacts per request` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contacts, error: cErr } = await svc
      .from("contacts")
      .select(
        "id, sms_opt_out, first_name, last_name, name, user_id, owner_id, contact_channels ( channel_type, value, is_primary )",
      )
      .in("id", uniqueIds);

    if (cErr) {
      return new Response(JSON.stringify({ error: cErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowed = (contacts ?? []).filter((c) => {
      const r = c as RecipientRow & { user_id: string | null; owner_id: string | null };
      return r.user_id === userId || r.owner_id === userId;
    }) as RecipientRow[];

    const batchId = crypto.randomUUID();
    const messages: { to: string; message: string; contact_id: string }[] = [];
    const skipped: { contact_id: string; reason: string }[] = [];

    for (const c of allowed) {
      if (c.sms_opt_out === true) {
        skipped.push({ contact_id: c.id, reason: "sms_opt_out" });
        continue;
      }
      const rawPhone = primaryPhone(c.contact_channels);
      if (!rawPhone?.trim()) {
        skipped.push({ contact_id: c.id, reason: "no_phone" });
        continue;
      }
      let to = rawPhone.trim().replace(/\s/g, "");
      if (/^0?4\d{8}$/.test(to.replace(/\D/g, "")) || /^61\d{9}$/.test(to.replace(/\D/g, ""))) {
        to = toE164Australia(to);
      }
      if (digitsKey(to).length < 8) {
        skipped.push({ contact_id: c.id, reason: "invalid_phone" });
        continue;
      }
      let text = mergeSmsTemplateForRecipient(body.message, c, mergeFields, smsSignatureFromDb);
      if (appendOptOut) {
        text = appendCommercialOptOutIfMissing(text);
      }
      if (!text.trim()) {
        skipped.push({ contact_id: c.id, reason: "empty_message" });
        continue;
      }
      messages.push({ to, message: text.trim(), contact_id: c.id });
    }

    const notFound = uniqueIds.filter((id) => !allowed.some((c) => c.id === id));
    for (const id of notFound) {
      skipped.push({ contact_id: id, reason: "not_found_or_denied" });
    }

    let sent = 0;
    const failures: { to: string; contact_id: string; error: string }[] = [];

    for (let i = 0; i < messages.length; i += MM_BATCH) {
      const chunk = messages.slice(i, i + MM_BATCH);
      const batch = await postMobileMessageBatch(
        mmCreds,
        chunk.map((m) => ({ to: m.to, message: m.message })),
      );
      const results = (batch.data?.results as Array<{ message_id?: string; status?: string; error?: string }> | undefined) ??
        [];

      if (!batch.ok) {
        const err =
          (batch.data?.error as string) || (batch.data?.message as string) || `HTTP ${batch.status}`;
        for (const m of chunk) {
          failures.push({ to: m.to, contact_id: m.contact_id, error: err });
          await svc.from("sms_outbound").insert({
            user_id: userId,
            contact_id: m.contact_id,
            to_phone: m.to,
            body_preview: previewBody(m.message),
            provider: "mobile_message",
            provider_message_id: null,
            status: "failed",
            error: err.slice(0, 500),
            batch_id: batchId,
          });
        }
        continue;
      }

      for (let j = 0; j < chunk.length; j++) {
        const m = chunk[j];
        const r = results[j];
        const mid = r?.message_id ?? r?.status ?? null;
        const oneErr = r?.error as string | undefined;
        if (oneErr) {
          failures.push({ to: m.to, contact_id: m.contact_id, error: oneErr });
          await svc.from("sms_outbound").insert({
            user_id: userId,
            contact_id: m.contact_id,
            to_phone: m.to,
            body_preview: previewBody(m.message),
            provider: "mobile_message",
            provider_message_id: null,
            status: "failed",
            error: oneErr.slice(0, 500),
            batch_id: batchId,
          });
        } else {
          sent++;
          await svc.from("sms_outbound").insert({
            user_id: userId,
            contact_id: m.contact_id,
            to_phone: m.to,
            body_preview: previewBody(m.message),
            provider: "mobile_message",
            provider_message_id: typeof mid === "string" ? mid : null,
            status: "sent",
            error: null,
            batch_id: batchId,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batchId,
        sent,
        skipped,
        failures,
        total_requested: uniqueIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
