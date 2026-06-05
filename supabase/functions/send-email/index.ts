import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "status") {
      return new Response(
        JSON.stringify({ configured: Boolean(RESEND_API_KEY) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      to?: unknown;
      subject?: unknown;
      html?: unknown;
      replyTo?: unknown;
      contact_id?: unknown;
      log_to_timeline?: unknown;
      from_name?: unknown;
    };
    const { to, subject, html, replyTo, contact_id: contactIdRaw, log_to_timeline: logTimeline, from_name: fromNameRaw } = body;

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing to or subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = data.claims.email as string | undefined;
    const userId = data.claims.sub as string;

    // Sanitize HTML: strip script tags, event handlers, javascript: URIs
    const sanitize = (h: string): string =>
      h
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/\bon\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/\bon\w+\s*=\s*'[^']*'/gi, "")
        .replace(/javascript\s*:/gi, "");

    const fromName = typeof fromNameRaw === "string" ? fromNameRaw.trim() : "";
    const from =
      fromName && !EMAIL_FROM.includes("<") ? `${fromName} <${EMAIL_FROM}>` : EMAIL_FROM;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: sanitize(html || ""),
        reply_to: replyTo || userEmail,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: resData?.message || "Failed to send email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeHtml = sanitize(html || "");
    if (logTimeline !== false && contactIdRaw && typeof contactIdRaw === "string") {
      const bodyPreview = safeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
      await supabase.from("interactions").insert({
        contact_id: contactIdRaw,
        user_id: userId,
        type: "email",
        channel: "email",
        subject: String(subject),
        body: bodyPreview || null,
      });
    }

    return new Response(JSON.stringify({ id: resData.id, success: true }), {
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
