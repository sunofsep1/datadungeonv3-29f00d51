import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const MOBILE_MESSAGE_API_USER = Deno.env.get("MOBILE_MESSAGE_API_USER");
const MOBILE_MESSAGE_API_PASSWORD = Deno.env.get("MOBILE_MESSAGE_API_PASSWORD");
const MOBILE_MESSAGE_SENDER = Deno.env.get("MOBILE_MESSAGE_SENDER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const useMobileMessage = Boolean(
  MOBILE_MESSAGE_API_USER && MOBILE_MESSAGE_API_PASSWORD && MOBILE_MESSAGE_SENDER
);

/** Normalize Australian numbers to E.164. Twilio and many APIs require +61... */
function toE164Australia(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("4")) {
    return `+61${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("04")) {
    return `+61${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith("61")) {
    return `+${digits}`;
  }
  return raw.startsWith("+") ? raw : `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET ping: verify URL and deployment (no auth). Remove or restrict in production if desired.
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
      console.error("[send-sms] Missing token");
      return new Response(
        JSON.stringify({ error: "Missing token. Sign in and try again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[send-sms] Auth: Bearer token present");

    // With verify_jwt = false, the gateway does not validate the JWT. We require a non-empty
    // Bearer token (the client only sends it when signed in).
    if (useMobileMessage) {
      // Mobile Message (Australia) – https://mobilemessage.com.au/api-documentation
      if (!MOBILE_MESSAGE_API_USER || !MOBILE_MESSAGE_API_PASSWORD || !MOBILE_MESSAGE_SENDER) {
        return new Response(
          JSON.stringify({ error: "Mobile Message not fully configured. Set MOBILE_MESSAGE_API_USER, MOBILE_MESSAGE_API_PASSWORD, MOBILE_MESSAGE_SENDER." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("[send-sms] No provider configured: useMobileMessage=", useMobileMessage, "twilio=", !!TWILIO_ACCOUNT_SID);
      return new Response(
        JSON.stringify({
          error: "SMS service not configured. Set either (1) MOBILE_MESSAGE_API_USER, MOBILE_MESSAGE_API_PASSWORD, MOBILE_MESSAGE_SENDER or (2) TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Edge Function secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[send-sms] Provider:", useMobileMessage ? "Mobile Message" : "Twilio");

    let body: { to?: string; body?: string };
    try {
      body = await req.json();
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
      console.error("[send-sms] Body parse error:", msg);
      return new Response(
        JSON.stringify({ error: "Invalid request body. Expected JSON with to and body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { to, body: messageBody } = body;

    if (!to || typeof to !== "string" || !to.trim()) {
      console.error("[send-sms] Missing or invalid to");
      return new Response(JSON.stringify({ error: "Missing to (phone number)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!messageBody || typeof messageBody !== "string" || !messageBody.trim()) {
      console.error("[send-sms] Missing or invalid body");
      return new Response(JSON.stringify({ error: "Missing body (message text)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[send-sms] Request: to=", to.trim().slice(0, 15), "body length=", String(messageBody).length);

    let toNormalized = to.trim().replace(/\s/g, "");
    // Australian numbers: 04... or 4... -> +614... for E.164
    if (/^0?4\d{8}$/.test(toNormalized.replace(/\D/g, "")) || /^61\d{9}$/.test(toNormalized.replace(/\D/g, ""))) {
      toNormalized = toE164Australia(toNormalized);
    }

    if (useMobileMessage) {
      console.log("[send-sms] Calling Mobile Message API");
      const auth = btoa(`${MOBILE_MESSAGE_API_USER}:${MOBILE_MESSAGE_API_PASSWORD}`);
      const res = await fetch("https://api.mobilemessage.com.au/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              to: toNormalized,
              message: messageBody.trim(),
              sender: MOBILE_MESSAGE_SENDER,
            },
          ],
        }),
      });
      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = resData?.error || res.statusText || "Failed to send SMS";
        console.error("[send-sms] Mobile Message error:", res.status, resData);
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const first = resData?.results?.[0];
      const messageId = first?.message_id ?? first?.status;
      console.log("[send-sms] Mobile Message success:", messageId);
      return new Response(JSON.stringify({ sid: messageId, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Twilio
    console.log("[send-sms] Calling Twilio API");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const form = new URLSearchParams({
      To: toNormalized,
      From: TWILIO_PHONE_NUMBER,
      Body: messageBody.trim(),
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = resData?.message || resData?.error_message || res.statusText || "Failed to send SMS";
      console.error("[send-sms] Twilio error:", res.status, resData);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-sms] Twilio success:", resData.sid);
    return new Response(JSON.stringify({ sid: resData.sid, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-sms] Unhandled error:", message, error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
