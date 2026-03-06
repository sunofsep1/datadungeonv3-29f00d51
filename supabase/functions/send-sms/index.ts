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

    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (useMobileMessage) {
      // Mobile Message (Australia) – https://mobilemessage.com.au/api-documentation
      if (!MOBILE_MESSAGE_API_USER || !MOBILE_MESSAGE_API_PASSWORD || !MOBILE_MESSAGE_SENDER) {
        return new Response(
          JSON.stringify({ error: "Mobile Message not fully configured. Set MOBILE_MESSAGE_API_USER, MOBILE_MESSAGE_API_PASSWORD, MOBILE_MESSAGE_SENDER." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({
          error: "SMS service not configured. Set either (1) MOBILE_MESSAGE_API_USER, MOBILE_MESSAGE_API_PASSWORD, MOBILE_MESSAGE_SENDER or (2) TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Edge Function secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { to, body: messageBody } = body;

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

    const toNormalized = to.trim().replace(/\s/g, "");

    if (useMobileMessage) {
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
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const first = resData?.results?.[0];
      const messageId = first?.message_id ?? first?.status;
      return new Response(JSON.stringify({ sid: messageId, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Twilio
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
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sid: resData.sid, success: true }), {
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
