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

    const results: Array<{
      user_id: string;
      email: string | undefined;
      unread_count: number;
      digest_generated: boolean;
      error?: string;
    }> = [];

    for (const user of usersData.users) {
      try {
        // Count unread notifications for this user
        const { count: unreadCount, error: countError } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);

        if (countError) {
          results.push({
            user_id: user.id,
            email: user.email,
            unread_count: 0,
            digest_generated: false,
            error: countError.message,
          });
          continue;
        }

        const totalUnread = unreadCount ?? 0;

        if (totalUnread === 0) {
          results.push({
            user_id: user.id,
            email: user.email,
            unread_count: 0,
            digest_generated: false,
          });
          continue;
        }

        // Fetch the unread notifications (most recent 50)
        const { data: unreadNotifications, error: fetchError } = await supabase
          .from("notifications")
          .select("id, kind, title, body, entity_type, entity_id, created_at")
          .eq("user_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (fetchError) {
          results.push({
            user_id: user.id,
            email: user.email,
            unread_count: totalUnread,
            digest_generated: false,
            error: fetchError.message,
          });
          continue;
        }

        // Group notifications by kind for summary
        const byKind: Record<string, number> = {};
        for (const n of unreadNotifications ?? []) {
          byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
        }

        // Insert a digest summary notification
        const summaryLines = Object.entries(byKind)
          .map(([kind, count]) => `${count} ${kind.replace(/_/g, " ")}`)
          .join(", ");

        const { error: insertError } = await supabase
          .from("notifications")
          .insert({
            user_id: user.id,
            kind: "notification_digest",
            title: `Notification digest: ${totalUnread} unread`,
            body: `You have ${totalUnread} unread notification${totalUnread !== 1 ? "s" : ""}: ${summaryLines}.`,
            entity_type: null,
            entity_id: null,
          });

        if (insertError) {
          results.push({
            user_id: user.id,
            email: user.email,
            unread_count: totalUnread,
            digest_generated: false,
            error: insertError.message,
          });
          continue;
        }

        results.push({
          user_id: user.id,
          email: user.email,
          unread_count: totalUnread,
          digest_generated: true,
        });
      } catch (userErr) {
        results.push({
          user_id: user.id,
          email: user.email,
          unread_count: 0,
          digest_generated: false,
          error: String(userErr),
        });
      }
    }

    console.log("[notification-digest] Completed:", JSON.stringify(results));
    return new Response(
      JSON.stringify({
        success: true,
        users_processed: results.length,
        digests_generated: results.filter((r) => r.digest_generated).length,
        results,
        timestamp: new Date().toISOString(),
      }),
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
