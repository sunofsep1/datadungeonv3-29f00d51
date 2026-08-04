// microsoft-calendar — Outlook/Microsoft 365 calendar integration (Microsoft Graph).
//
// Mirrors the google-calendar edge function exactly: action-based routing, CSRF
// state tokens in oauth_states, tokens stored in auth user_metadata, and the
// OAuth callback hosted ON this function so no frontend route is required.
//
// Redirect URI to register in Microsoft Entra (Web platform, NO query string —
// Entra disallows query strings on redirect URIs for personal accounts, and
// path-based is safest for all account types):
//   https://sujyalrzbubvhpkntwja.supabase.co/functions/v1/microsoft-calendar/callback
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   MS_CLIENT_ID       — Entra app (client) ID from Nick
//   MS_CLIENT_SECRET   — Entra client secret VALUE (not the secret ID)
//   MS_TENANT_ID       — optional; tenant GUID or domain. Defaults to "common".
//   REDIRECT_BASE_URL  — already set (shared with google-calendar) — where the
//                        browser lands after OAuth completes.
//
// Actions: auth-url · callback · status · events · create-event · update-event
//          · delete-event · disconnect

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MS_CLIENT_ID = Deno.env.get("MS_CLIENT_ID");
const MS_CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET");
const MS_TENANT_ID = Deno.env.get("MS_TENANT_ID") || "common";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const REDIRECT_BASE_URL = Deno.env.get("REDIRECT_BASE_URL") || "http://localhost:8080";

const AUTH_BASE = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0`;
const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPES = "offline_access User.Read Calendars.ReadWrite";

// Path-based callback (no query string — Entra-safe for every account type).
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/microsoft-calendar/callback`;

// Queensland has no DST — Brisbane is a flat UTC+10:00 year-round.
// Graph prefers a NAIVE local dateTime plus a named timeZone; the Windows name
// for Brisbane is "E. Australia Standard Time".
const GRAPH_TIME_ZONE = "E. Australia Standard Time";
const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;

/** Normalise an incoming datetime to a NAIVE Brisbane-local "YYYY-MM-DDTHH:mm:ss". */
function toBrisbaneNaive(value: string): string {
  const v = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(v)) return v; // already naive
  // Offset-bearing → convert the absolute instant to Brisbane wall time.
  const instant = new Date(v).getTime();
  return new Date(instant + BRISBANE_OFFSET_MS).toISOString().slice(0, 19);
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

/** Exchange or refresh tokens against the Entra token endpoint. */
async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID!,
      client_secret: MS_CLIENT_SECRET!,
      scope: SCOPES,
      ...params,
    }),
  });
  return res.json();
}

/** Get a valid access token for the user, refreshing (and re-storing) if needed. */
async function getAccessToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ token?: string; error?: Response }> {
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  if (!userData?.user) return { error: json({ error: "User not found" }, 404) };

  const meta = userData.user.user_metadata || {};
  let accessToken: string | undefined = meta.ms_access_token;
  const refreshToken: string | undefined = meta.ms_refresh_token;
  const tokenExpiry: number | undefined = meta.ms_token_expiry;

  if (!accessToken || !refreshToken) {
    return { error: json({ error: "Not connected", needsAuth: true }, 401) };
  }

  if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
    const refreshed = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...meta,
          ms_access_token: refreshed.access_token,
          // Microsoft rotates refresh tokens — always store the newest one.
          ms_refresh_token: refreshed.refresh_token || refreshToken,
          ms_token_expiry: Date.now() + refreshed.expires_in * 1000,
        },
      });
    } else {
      console.error("MS token refresh failed:", refreshed.error, refreshed.error_description);
      return { error: json({ error: "Token refresh failed", needsAuth: true }, 401) };
    }
  }

  return { token: accessToken };
}

/** Map a Graph event to the app's normalised shape (google-calendar-compatible). */
function normaliseEvent(e: Record<string, unknown>) {
  const start = e.start as { dateTime?: string; timeZone?: string } | undefined;
  const end = e.end as { dateTime?: string; timeZone?: string } | undefined;
  const location = e.location as { displayName?: string } | undefined;
  return {
    id: e.id,
    summary: e.subject ?? "",
    description: (e.bodyPreview as string) ?? "",
    location: location?.displayName ?? "",
    start: { dateTime: start?.dateTime, timeZone: start?.timeZone },
    end: { dateTime: end?.dateTime, timeZone: end?.timeZone },
    isAllDay: e.isAllDay ?? false,
    webLink: e.webLink ?? null,
    provider: "microsoft",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const isCallback =
      url.pathname.endsWith("/callback") || url.searchParams.get("action") === "callback";
    const action = isCallback ? "callback" : url.searchParams.get("action");

    if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) {
      // Configured check up front so every path fails loudly and clearly.
      if (action === "status") return json({ configured: false, connected: false });
      return json(
        { error: "Server not configured — MS_CLIENT_ID / MS_CLIENT_SECRET secrets missing" },
        500,
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // ---- OAuth callback: Microsoft redirects here with NO auth header. ----
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        const desc = url.searchParams.get("error_description") || error;
        console.error("MS OAuth error:", error, desc);
        return redirect(`${REDIRECT_BASE_URL}/dashboard?calendar_error=${encodeURIComponent(error)}`);
      }
      if (!code || !state) {
        return redirect(`${REDIRECT_BASE_URL}/dashboard?calendar_error=missing_params`);
      }

      // Validate CSRF state token (same oauth_states table as google-calendar).
      const { data: stateRecord, error: stateError } = await supabase
        .from("oauth_states")
        .select("user_id, expires_at")
        .eq("token", state)
        .single();

      if (stateError || !stateRecord) {
        console.error("Invalid MS state token:", stateError);
        return redirect(`${REDIRECT_BASE_URL}/dashboard?calendar_error=invalid_state`);
      }
      if (new Date(stateRecord.expires_at) < new Date()) {
        await supabase.from("oauth_states").delete().eq("token", state);
        return redirect(`${REDIRECT_BASE_URL}/dashboard?calendar_error=state_expired`);
      }

      const validatedUserId = stateRecord.user_id;

      const tokens = await tokenRequest({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      });

      if (tokens.error) {
        console.error("MS token exchange error:", tokens.error, tokens.error_description);
        await supabase.from("oauth_states").delete().eq("token", state);
        return redirect(
          `${REDIRECT_BASE_URL}/dashboard?calendar_error=${encodeURIComponent(tokens.error_description || tokens.error)}`,
        );
      }

      const { data: existing } = await supabase.auth.admin.getUserById(validatedUserId);
      const { error: updateError } = await supabase.auth.admin.updateUserById(validatedUserId, {
        user_metadata: {
          ...(existing?.user?.user_metadata || {}),
          ms_access_token: tokens.access_token,
          ms_refresh_token: tokens.refresh_token,
          ms_token_expiry: Date.now() + tokens.expires_in * 1000,
        },
      });

      await supabase.from("oauth_states").delete().eq("token", state);

      if (updateError) {
        console.error("Error storing MS tokens:", updateError);
        return redirect(`${REDIRECT_BASE_URL}/dashboard?calendar_error=storage_failed`);
      }

      console.log("MS tokens stored for user:", validatedUserId);
      return redirect(`${REDIRECT_BASE_URL}/dashboard?outlook_connected=true`);
    }

    // ---- Everything else requires the caller's JWT (same as google-calendar). ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    if (action === "auth-url") {
      const stateToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase
        .from("oauth_states")
        .insert({ token: stateToken, user_id: user.id, expires_at: expiresAt });
      if (insertError) {
        console.error("Failed to store MS OAuth state:", insertError);
        return json({ error: "Failed to initiate OAuth" }, 500);
      }

      const authUrl =
        `${AUTH_BASE}/authorize?client_id=${MS_CLIENT_ID}` +
        `&response_type=code&response_mode=query` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&prompt=select_account&state=${stateToken}`;

      return json({ authUrl, redirectUri: REDIRECT_URI });
    }

    if (action === "status") {
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);
      const meta = userData?.user?.user_metadata || {};
      return json({
        configured: true,
        connected: Boolean(meta.ms_access_token && meta.ms_refresh_token),
        redirectUri: REDIRECT_URI,
      });
    }

    if (action === "events") {
      const got = await getAccessToken(supabase, user.id);
      if (got.error) return got.error;

      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `${GRAPH}/me/calendarView?startDateTime=${encodeURIComponent(timeMin)}` +
          `&endDateTime=${encodeURIComponent(timeMax)}` +
          `&$top=50&$orderby=start/dateTime`,
        {
          headers: {
            Authorization: `Bearer ${got.token}`,
            Prefer: `outlook.timezone="${GRAPH_TIME_ZONE}"`,
          },
        },
      );
      const data = await res.json();
      if (data.error) {
        console.error("Graph calendarView error:", data.error);
        const needsAuth = res.status === 401;
        return json({ error: data.error.message, needsAuth }, needsAuth ? 401 : 400);
      }
      return json({ events: (data.value || []).map(normaliseEvent) });
    }

    if (action === "create-event") {
      const got = await getAccessToken(supabase, user.id);
      if (got.error) return got.error;

      const body = await req.json();
      const { summary, description, start, end, location } = body;
      if (!summary || !start) return json({ error: "Missing required fields" }, 400);

      const startNaive = toBrisbaneNaive(start);
      const endNaive = end
        ? toBrisbaneNaive(end)
        : toBrisbaneNaive(new Date(new Date(`${startNaive}+10:00`).getTime() + 3600000).toISOString());

      const eventData: Record<string, unknown> = {
        subject: summary,
        body: { contentType: "Text", content: description || "" },
        start: { dateTime: startNaive, timeZone: GRAPH_TIME_ZONE },
        end: { dateTime: endNaive, timeZone: GRAPH_TIME_ZONE },
      };
      if (location) eventData.location = { displayName: location };

      const res = await fetch(`${GRAPH}/me/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${got.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      const created = await res.json();
      if (created.error) {
        console.error("Graph create error:", created.error);
        return json({ error: created.error.message }, 400);
      }
      return json({ event: normaliseEvent(created) });
    }

    if (action === "update-event") {
      const got = await getAccessToken(supabase, user.id);
      if (got.error) return got.error;

      const body = await req.json();
      const { eventId, summary, description, start, end, location } = body;
      if (!eventId || !summary || !start) {
        return json({ error: "Missing eventId, summary, or start" }, 400);
      }

      const startNaive = toBrisbaneNaive(start);
      const eventData: Record<string, unknown> = {
        subject: summary,
        body: { contentType: "Text", content: description || "" },
        start: { dateTime: startNaive, timeZone: GRAPH_TIME_ZONE },
        end: {
          dateTime: end
            ? toBrisbaneNaive(end)
            : toBrisbaneNaive(new Date(new Date(`${startNaive}+10:00`).getTime() + 3600000).toISOString()),
          timeZone: GRAPH_TIME_ZONE,
        },
      };
      if (location) eventData.location = { displayName: location };

      const res = await fetch(`${GRAPH}/me/events/${eventId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${got.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      const updated = await res.json();
      if (updated.error) return json({ error: updated.error.message }, 400);
      return json({ event: normaliseEvent(updated) });
    }

    if (action === "delete-event") {
      const got = await getAccessToken(supabase, user.id);
      if (got.error) return got.error;

      const body = await req.json();
      const { eventId } = body;
      if (!eventId) return json({ error: "Missing eventId" }, 400);

      const res = await fetch(`${GRAPH}/me/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${got.token}` },
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.text();
        return json({ error: err || "Delete failed" }, 400);
      }
      return json({ success: true });
    }

    if (action === "disconnect") {
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);
      if (userData?.user) {
        const { ms_access_token, ms_refresh_token, ms_token_expiry, ...rest } =
          userData.user.user_metadata || {};
        await supabase.auth.admin.updateUserById(user.id, { user_metadata: rest });
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      JSON.stringify({ level: "error", function: "microsoft-calendar", message }),
    );
    return json({ error: message }, 500);
  }
});
