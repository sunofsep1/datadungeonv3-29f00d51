import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      console.warn("Unauthorized call — not service_role key");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log(`[notification-digest] Starting at ${new Date().toISOString()}`);

    // Get all users from auth.users
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("[notification-digest] Failed to list users:", usersError);
      return new Response(
        JSON.stringify({ success: false, error: usersError.message, timestamp: new Date().toISOString() }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const users = usersData?.users ?? [];
    const results: { user_id: string; email: string | undefined; unread_count: number; summary: string }[] = [];

    for (const user of users) {
      // Fetch unread notifications for this user
      const { data: unread, error: nErr } = await supabase
        .from("notifications")
        .select("id, kind, title, body, entity_type, entity_id, created_at")
        .eq("user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (nErr) {
        console.error(`[notification-digest] Error fetching notifications for ${user.id}:`, nErr);
        results.push({ user_id: user.id, email: user.email, unread_count: 0, summary: `Error: ${nErr.message}` });
        continue;
      }

      const notifications = unread ?? [];
      if (notifications.length === 0) {
        results.push({ user_id: user.id, email: user.email, unread_count: 0, summary: "No unread notifications" });
        continue;
      }

      // Group notifications by kind
      const byKind: Record<string, number> = {};
      for (const n of notifications) {
        byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
      }

      const summaryParts = Object.entries(byKind).map(([kind, count]) => `${count} ${kind}`);
      const summary = `${notifications.length} unread: ${summaryParts.join(", ")}`;

      // Insert a digest notification for this user
      const digestTitle = `Notification Digest: ${notifications.length} unread`;
      const digestBody = `You have ${notifications.length} unread notification${notifications.length === 1 ? "" : "s"}. Breakdown: ${summaryParts.join(", ")}.`;

      const { error: insertErr } = await supabase.from("notifications").insert({
        user_id: user.id,
        kind: "digest",
        title: digestTitle,
        body: digestBody,
      });

      if (insertErr) {
        console.error(`[notification-digest] Failed to insert digest for ${user.id}:`, insertErr);
      }

      results.push({ user_id: user.id, email: user.email, unread_count: notifications.length, summary });
    }

    console.log("[notification-digest] Completed:", JSON.stringify(results));
    return new Response(
      JSON.stringify({ success: true, users_processed: results.length, results, timestamp: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notification-digest] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err), timestamp: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
