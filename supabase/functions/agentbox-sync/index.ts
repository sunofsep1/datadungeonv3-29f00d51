import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENTBOX_API_URL = (Deno.env.get("AGENTBOX_API_URL") ?? "https://api.agentbox.com.au/v2").replace(/\/$/, "");
const AGENTBOX_API_KEY = Deno.env.get("AGENTBOX_API_KEY");
const AGENTBOX_CLIENT_ID = Deno.env.get("AGENTBOX_CLIENT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type AgentboxContact = {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  homePhone?: string;
  workPhone?: string;
  companyName?: string;
  jobTitle?: string;
};

function isConfigured(): boolean {
  return Boolean(AGENTBOX_API_KEY && AGENTBOX_CLIENT_ID);
}

async function fetchAgentbox(path: string): Promise<unknown> {
  const res = await fetch(`${AGENTBOX_API_URL}${path}`, {
    headers: {
      "X-Api-Key": AGENTBOX_API_KEY!,
      "X-Client-Id": AGENTBOX_CLIENT_ID!,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AgentBox API ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json();
}

function normalizeContactsPayload(payload: unknown): AgentboxContact[] {
  if (Array.isArray(payload)) return payload as AgentboxContact[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["contacts", "data", "results", "items"]) {
      if (Array.isArray(o[key])) return o[key] as AgentboxContact[];
    }
  }
  return [];
}

function contactDisplayName(c: AgentboxContact): string {
  const first = c.firstName ?? c.first_name ?? "";
  const last = c.lastName ?? c.last_name ?? "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined || c.name?.trim() || "AgentBox contact";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return json({ ok: false, error: "Invalid token" }, 401);
    }

    let body: { action?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = body.action ?? "status";

    if (action === "status") {
      return json({
        ok: true,
        action,
        configured: isConfigured(),
        message: isConfigured()
          ? "AgentBox credentials are configured."
          : "Set AGENTBOX_API_KEY and AGENTBOX_CLIENT_ID in Supabase Edge Function secrets.",
      });
    }

    if (!isConfigured()) {
      return json(
        {
          ok: false,
          action,
          configured: false,
          error: "AgentBox not configured. Add AGENTBOX_API_KEY and AGENTBOX_CLIENT_ID secrets.",
        },
        503,
      );
    }

    if (action === "sync_contacts") {
      const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);
      const raw = await fetchAgentbox(`/contacts?limit=${limit}`);
      const remote = normalizeContactsPayload(raw);
      const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const remoteContact of remote) {
        const agentboxId = Number(remoteContact.id);
        if (!Number.isFinite(agentboxId) || agentboxId <= 0) {
          skipped += 1;
          continue;
        }

        const row = {
          user_id: user.id,
          agentbox_id: agentboxId,
          agentbox_synced_at: new Date().toISOString(),
          name: contactDisplayName(remoteContact),
          first_name: remoteContact.firstName ?? remoteContact.first_name ?? null,
          last_name: remoteContact.lastName ?? remoteContact.last_name ?? null,
          email: remoteContact.email?.trim() || null,
          mobile: remoteContact.mobile?.trim() || null,
          phone: remoteContact.phone?.trim() || remoteContact.mobile?.trim() || null,
          home_phone: remoteContact.homePhone?.trim() || null,
          work_phone: remoteContact.workPhone?.trim() || null,
          company_name: remoteContact.companyName?.trim() || null,
          job_title: remoteContact.jobTitle?.trim() || null,
        };

        const { data: existing } = await admin
          .from("contacts")
          .select("id")
          .eq("user_id", user.id)
          .eq("agentbox_id", agentboxId)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await admin.from("contacts").update(row).eq("id", existing.id);
          if (error) {
            skipped += 1;
            continue;
          }
          updated += 1;
        } else {
          const { error } = await admin.from("contacts").insert(row);
          if (error) {
            skipped += 1;
            continue;
          }
          imported += 1;
        }
      }

      return json({
        ok: true,
        action,
        configured: true,
        imported,
        updated,
        skipped,
        total: remote.length,
      });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: message }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
