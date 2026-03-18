/**
 * SMS diagnostic: hit send-sms Edge Function and print responses.
 * Run: npx tsx scripts/sms-diagnostic.ts
 * Requires: .env with VITE_SUPABASE_URL (optional: VITE_SUPABASE_PUBLISHABLE_KEY for real session).
 *
 * 1. GET  /functions/v1/send-sms  → should return 200 { ok: true } (no auth).
 * 2. POST with dummy body + fake token → see function response (auth pass, then config or provider error).
 * 3. If key present: POST with real session token → same as app.
 */
import "dotenv/config";

const base = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!base) {
  console.error("Missing VITE_SUPABASE_URL in .env");
  process.exit(1);
}

const url = `${base}/functions/v1/send-sms`;

async function run() {
  console.log("SMS diagnostic\n");
  console.log("Base URL:", base);
  console.log("Function URL:", url);
  console.log("");

  // 1. GET ping
  console.log("1. GET (ping, no auth)");
  try {
    const getRes = await fetch(url);
    const getText = await getRes.text();
    console.log("   Status:", getRes.status, getRes.statusText);
    console.log("   Body:", getText.slice(0, 200));
    if (!getRes.ok) {
      console.log("   -> Function may not be deployed or URL wrong. Deploy: npx supabase functions deploy send-sms");
    } else {
      console.log("   -> Function is reachable.");
    }
  } catch (e) {
    console.error("   Error:", e instanceof Error ? e.message : e);
    console.log("   -> Check network and VITE_SUPABASE_URL.");
  }
  console.log("");

  // 2. POST with fake token (no real session)
  console.log("2. POST with dummy body + fake Bearer token");
  try {
    const postRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer fake-token-for-diagnostic",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: "0457637578", body: "test" }),
    });
    const postText = await postRes.text();
    console.log("   Status:", postRes.status, postRes.statusText);
    console.log("   Body:", postText.slice(0, 400));
    let parsed: unknown = null;
    try {
      parsed = postText ? JSON.parse(postText) : null;
    } catch {
      // ignore
    }
    if (parsed && typeof parsed === "object" && parsed !== null && "error" in parsed) {
      console.log("   Server error message:", (parsed as { error?: string }).error);
    }
    if (postRes.status === 401) {
      console.log("   -> If you see this in the app too: gateway or function is rejecting the token.");
      console.log("   -> In Supabase Dashboard → Edge Functions → send-sms: set Verify JWT to OFF.");
    }
    if (postRes.status === 500 && postText.includes("not configured")) {
      console.log("   -> Add Mobile Message or Twilio secrets in Dashboard → send-sms → Secrets.");
    }
  } catch (e) {
    console.error("   Error:", e instanceof Error ? e.message : e);
  }
  console.log("");

  // 3. Optional: real session
  if (anonKey) {
    console.log("3. POST with real session (anon key present)");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(base, anonKey);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("   No session (not signed in in this environment). Sign in via the app, then run again or use the app.");
      } else {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ to: "0457637578", body: "diagnostic test" }),
        });
        const text = await res.text();
        console.log("   Status:", res.status, res.statusText);
        console.log("   Body:", text.slice(0, 400));
      }
    } catch (e) {
      console.error("   Error:", e instanceof Error ? e.message : e);
    }
  } else {
    console.log("3. Skipped (no VITE_SUPABASE_PUBLISHABLE_KEY in .env for real session)");
  }

  console.log("\nNext: Supabase Dashboard → Edge Functions → send-sms → Logs (see [send-sms] lines after you try Send SMS in the app).");
}

run();
