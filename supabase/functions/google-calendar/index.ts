import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Where to redirect the browser after OAuth (your app URL). Set in Supabase Dashboard → Edge Functions → google-calendar → Secrets.
const REDIRECT_BASE_URL = Deno.env.get("REDIRECT_BASE_URL") || "http://localhost:8080";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Create Supabase client with service role for admin operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle OAuth callback BEFORE auth check (Google redirects here without auth)
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // This contains the user ID
      const error = url.searchParams.get("error");

      console.log("OAuth callback received. State token:", state);

      if (error) {
        console.error("OAuth error:", error);
        // Redirect to app with error
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${REDIRECT_BASE_URL}/dashboard?calendar_error=${encodeURIComponent(error)}`,
          },
        });
      }

      if (!code || !state) {
        console.error("Missing code or state in callback");
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${REDIRECT_BASE_URL}/dashboard?calendar_error=missing_params`,
          },
        });
      }

      // Validate the state token from database to prevent CSRF attacks
      const { data: stateRecord, error: stateError } = await supabase
        .from("oauth_states")
        .select("user_id, expires_at")
        .eq("token", state)
        .single();

      if (stateError || !stateRecord) {
        console.error("Invalid or missing state token:", stateError);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${REDIRECT_BASE_URL}/dashboard?calendar_error=invalid_state`,
          },
        });
      }

      // Check if state token has expired (10 minute validity)
      if (new Date(stateRecord.expires_at) < new Date()) {
        console.error("State token expired");
        // Clean up expired token
        await supabase.from("oauth_states").delete().eq("token", state);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${REDIRECT_BASE_URL}/dashboard?calendar_error=state_expired`,
          },
        });
      }

      const validatedUserId = stateRecord.user_id;
      console.log("State validated for user:", validatedUserId);

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar?action=callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Token exchange error:", tokens);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${REDIRECT_BASE_URL}/dashboard?calendar_error=${encodeURIComponent(tokens.error_description || tokens.error)}`,
          },
        });
      }

      console.log("Token exchange successful for user:", validatedUserId);

      // Store tokens in user metadata using the VALIDATED user ID from database
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        validatedUserId,
        {
          user_metadata: {
            google_access_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            google_token_expiry: Date.now() + (tokens.expires_in * 1000),
          },
        }
      );

      if (updateError) {
        console.error("Error storing tokens:", updateError);
        // Clean up used state token even on error
        await supabase.from("oauth_states").delete().eq("token", state);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${REDIRECT_BASE_URL}/dashboard?calendar_error=storage_failed`,
          },
        });
      }

      // Delete the used state token to prevent replay attacks
      await supabase.from("oauth_states").delete().eq("token", state);

      console.log("Tokens stored successfully, redirecting to app");

      // Redirect back to the app with success
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${REDIRECT_BASE_URL}/dashboard?calendar_connected=true`,
        },
      });
    }

    // For all other actions, require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User authenticated:", user.id);

    if (action === "auth-url") {
      // Generate OAuth URL for Google Calendar with read+write scope
      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar?action=callback`;
      const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar");
      
      // Generate a secure random state token instead of using user ID directly
      const stateToken = crypto.randomUUID();
      
      // Store state token with user ID and expiration (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase
        .from("oauth_states")
        .insert({
          token: stateToken,
          user_id: user.id,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Failed to store OAuth state:", insertError);
        return new Response(JSON.stringify({ error: "Failed to initiate OAuth" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${stateToken}`;

      console.log("Generated auth URL for user:", user.id);
      console.log("Redirect URI:", redirectUri);

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "events") {
      // Fetch calendar events
      const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(user.id);

      if (fetchError || !userData.user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = userData.user.user_metadata?.google_access_token;
      const refreshToken = userData.user.user_metadata?.google_refresh_token;
      const tokenExpiry = userData.user.user_metadata?.google_token_expiry;

      if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify({ error: "Not connected", needsAuth: true }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh token if expired
      if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
        console.log("Refreshing token for user:", user.id);
        
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...userData.user.user_metadata,
              google_access_token: refreshData.access_token,
              google_token_expiry: Date.now() + (refreshData.expires_in * 1000),
            },
          });
        }
      }

      // Fetch events from Google Calendar
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `maxResults=50&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const eventsData = await eventsResponse.json();

      if (eventsData.error) {
        console.error("Google Calendar API error:", eventsData.error);
        
        if (eventsData.error.code === 401) {
          return new Response(JSON.stringify({ error: "Token expired", needsAuth: true }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ error: eventsData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Fetched ${eventsData.items?.length || 0} events for user:`, user.id);

      return new Response(JSON.stringify({ events: eventsData.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      // Remove Google tokens from user metadata
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);
      
      if (userData.user) {
        const { google_access_token, google_refresh_token, google_token_expiry, ...restMetadata } = userData.user.user_metadata || {};
        
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: restMetadata,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-event") {
      // Create a new event in Google Calendar
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);

      if (!userData.user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = userData.user.user_metadata?.google_access_token;
      const refreshToken = userData.user.user_metadata?.google_refresh_token;
      const tokenExpiry = userData.user.user_metadata?.google_token_expiry;

      if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify({ error: "Not connected", needsAuth: true }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh token if expired
      if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...userData.user.user_metadata,
              google_access_token: refreshData.access_token,
              google_token_expiry: Date.now() + (refreshData.expires_in * 1000),
            },
          });
        }
      }

      // Parse request body
      const body = await req.json();
      const { summary, description, start, end, location } = body;

      if (!summary || !start) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build event object
      const eventData: any = {
        summary,
        description: description || "",
        start: {
          dateTime: start,
          timeZone: "Australia/Sydney",
        },
        end: {
          dateTime: end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: "Australia/Sydney",
        },
      };

      if (location) {
        eventData.location = location;
      }

      console.log("Creating event:", eventData);

      const createResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      const createdEvent = await createResponse.json();

      if (createdEvent.error) {
        console.error("Google Calendar create error:", createdEvent.error);
        return new Response(JSON.stringify({ error: createdEvent.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Event created successfully:", createdEvent.id);

      return new Response(JSON.stringify({ event: createdEvent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-event") {
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);
      if (!userData.user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = userData.user.user_metadata?.google_access_token;
      const refreshToken = userData.user.user_metadata?.google_refresh_token;
      const tokenExpiry = userData.user.user_metadata?.google_token_expiry;

      if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify({ error: "Not connected", needsAuth: true }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });
        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...userData.user.user_metadata,
              google_access_token: refreshData.access_token,
              google_token_expiry: Date.now() + (refreshData.expires_in * 1000),
            },
          });
        }
      }

      const body = await req.json();
      const { eventId, summary, description, start, end, location } = body;

      if (!eventId || !summary || !start) {
        return new Response(JSON.stringify({ error: "Missing eventId, summary, or start" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventData: Record<string, unknown> = {
        summary,
        description: description || "",
        start: { dateTime: start, timeZone: "Australia/Sydney" },
        end: { dateTime: end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: "Australia/Sydney" },
      };
      if (location) eventData.location = location;

      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      const result = await updateResponse.json();
      if (result.error) {
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ event: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-event") {
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);
      if (!userData.user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = userData.user.user_metadata?.google_access_token;
      const refreshToken = userData.user.user_metadata?.google_refresh_token;
      const tokenExpiry = userData.user.user_metadata?.google_token_expiry;

      if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify({ error: "Not connected", needsAuth: true }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenExpiry && Date.now() > tokenExpiry - 60000) {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });
        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...userData.user.user_metadata,
              google_access_token: refreshData.access_token,
              google_token_expiry: Date.now() + (refreshData.expires_in * 1000),
            },
          });
        }
      }

      const body = await req.json();
      const { eventId } = body;

      if (!eventId) {
        return new Response(JSON.stringify({ error: "Missing eventId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 204) {
        const err = await deleteResponse.text();
        return new Response(JSON.stringify({ error: err || "Delete failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Edge function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
