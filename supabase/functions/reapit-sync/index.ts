import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REAPIT_TOKEN_URL = Deno.env.get("REAPIT_TOKEN_URL") ?? "https://connect.reapit.cloud/token";
const REAPIT_API_URL = (Deno.env.get("REAPIT_API_URL") ?? "https://platform.reapit.cloud").replace(/\/$/, "");
const REAPIT_CLIENT_ID = Deno.env.get("REAPIT_CLIENT_ID");
const REAPIT_CLIENT_SECRET = Deno.env.get("REAPIT_CLIENT_SECRET");
const REAPIT_CUSTOMER_ID = Deno.env.get("REAPIT_CUSTOMER_ID");
const REAPIT_API_VERSION = Deno.env.get("REAPIT_API_VERSION") ?? "2020-01-31";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type ReapitContact = {
  id?: string;
  forename?: string | null;
  surname?: string | null;
  title?: string | null;
  homePhone?: string | null;
  workPhone?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  officeName?: string | null;
  jobTitle?: string | null;
};

function isConfigured(): boolean {
  return Boolean(REAPIT_CLIENT_ID && REAPIT_CLIENT_SECRET && REAPIT_CUSTOMER_ID);
}

async function getReapitToken(): Promise<string> {
  const credentials = btoa(`${REAPIT_CLIENT_ID}:${REAPIT_CLIENT_SECRET}`);
  const res = await fetch(REAPIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reapit token ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Reapit token response missing access_token");
  return data.access_token;
}

async function fetchReapit(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${REAPIT_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "api-version": REAPIT_API_VERSION,
      "reapit-customer": REAPIT_CUSTOMER_ID!,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reapit API ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json();
}

function normalizeContactsPayload(payload: unknown): ReapitContact[] {
  if (Array.isArray(payload)) return payload as ReapitContact[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    const embedded = o._embedded;
    if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
      const contacts = (embedded as Record<string, unknown>).contacts;
      if (Array.isArray(contacts)) return contacts as ReapitContact[];
    }
    for (const key of ["contacts", "data", "results", "items"]) {
      if (Array.isArray(o[key])) return o[key] as ReapitContact[];
    }
  }
  return [];
}

function contactName(c: ReapitContact): string {
  const combined = [c.forename, c.surname].filter(Boolean).join(" ").trim();
  return combined || "Reapit contact";
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

    let body: { action?: string; pageSize?: number } = {};
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
        customerId: REAPIT_CUSTOMER_ID ?? null,
        message: isConfigured()
          ? `Reapit credentials configured for ${REAPIT_CUSTOMER_ID}.`
          : "Set REAPIT_CLIENT_ID, REAPIT_CLIENT_SECRET, and REAPIT_CUSTOMER_ID in Edge Function secrets.",
      });
    }

    if (!isConfigured()) {
      return json(
        {
          ok: false,
          action,
          configured: false,
          error: "Reapit not configured.",
        },
        503,
      );
    }

    if (action === "sync_contacts") {
      const pageSize = Math.min(Math.max(body.pageSize ?? 100, 1), 250);
      const reapitToken = await getReapitToken();
      const raw = await fetchReapit(reapitToken, `/contacts?pageSize=${pageSize}`);
      const remote = normalizeContactsPayload(raw);
      const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const remoteContact of remote) {
        const reapitId = remoteContact.id?.trim();
        if (!reapitId) {
          skipped += 1;
          continue;
        }

        const row = {
          user_id: user.id,
          reapit_id: reapitId,
          reapit_synced_at: new Date().toISOString(),
          name: contactName(remoteContact),
          first_name: remoteContact.forename?.trim() || null,
          last_name: remoteContact.surname?.trim() || null,
          title: remoteContact.title?.trim() || null,
          email: remoteContact.email?.trim() || null,
          mobile: remoteContact.mobilePhone?.trim() || null,
          phone: remoteContact.mobilePhone?.trim() || remoteContact.homePhone?.trim() || null,
          home_phone: remoteContact.homePhone?.trim() || null,
          work_phone: remoteContact.workPhone?.trim() || null,
          company_name: remoteContact.officeName?.trim() || null,
          job_title: remoteContact.jobTitle?.trim() || null,
        };

        const { data: existing } = await admin
          .from("contacts")
          .select("id")
          .eq("user_id", user.id)
          .eq("reapit_id", reapitId)
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
        customerId: REAPIT_CUSTOMER_ID,
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
