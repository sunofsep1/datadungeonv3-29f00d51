import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * resend-admin — small operational helper for The Redlands Insider.
 *
 * The Resend dashboard editor is plan-locked for HTML paste on this account, so
 * broadcasts are built through the API. This also handles audience hygiene:
 * listing contacts, unsubscribing or removing individuals, and clearing anyone
 * who bounced or complained.
 *
 * Auth: every request must carry ?t=<RESEND_ADMIN_TOKEN>. Set that secret with
 *   supabase secrets set RESEND_ADMIN_TOKEN=...
 * The function refuses all requests if the secret is not configured.
 */

const RESEND = "https://api.resend.com";
const AUDIENCE = "1cef3192-1a2b-4285-a818-f072a668a5db";
const FROM = "Greg Leigh <greg@redlandshomevalue.com.au>";
const REPLY_TO = "greg.leigh@qldsir.com";

async function rs(path: string, init?: RequestInit) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not set");
  const r = await fetch(RESEND + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await r.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}

/** Only fetch newsletter HTML from Greg's own sites. */
function assertAllowed(src: string) {
  const u = new URL(src);
  const ok = ["redlandshomevalue.com.au", "gregleighproperty.com.au"];
  if (u.protocol !== "https:" || !ok.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) {
    throw new Error("src must be https on an owned domain");
  }
}

async function loadHtml(req: Request, url: URL): Promise<string> {
  const src = url.searchParams.get("src");
  if (src) {
    assertAllowed(src);
    const r = await fetch(src, { headers: { "Cache-Control": "no-cache" } });
    if (!r.ok) throw new Error(`src fetch ${r.status}`);
    return await r.text();
  }
  if (req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    if (typeof b?.html === "string" && b.html.length > 200) return b.html;
  }
  throw new Error("provide ?src= or POST { html }");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = Deno.env.get("RESEND_ADMIN_TOKEN");
  if (!token) return Response.json({ error: "RESEND_ADMIN_TOKEN not configured" }, { status: 503 });
  if (url.searchParams.get("t") !== token) return Response.json({ error: "forbidden" }, { status: 403 });

  const action = url.searchParams.get("action") ?? "contacts";
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();

  try {
    if (action === "audiences") return Response.json(await rs("/audiences"));

    if (action === "contacts") {
      const r = await rs(`/audiences/${AUDIENCE}/contacts`);
      const data = (r.body as { data?: Array<Record<string, unknown>> })?.data ?? [];
      return Response.json({
        status: r.status,
        total: data.length,
        unsubscribed: data.filter((c) => c.unsubscribed === true).length,
        contacts: data.map((c) => ({
          id: c.id, email: c.email, first_name: c.first_name,
          last_name: c.last_name, unsubscribed: c.unsubscribed, created_at: c.created_at,
        })),
      });
    }

    if (action === "find") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const r = await rs(`/audiences/${AUDIENCE}/contacts`);
      const data = (r.body as { data?: Array<Record<string, unknown>> })?.data ?? [];
      const hit = data.filter((c) =>
        `${c.email ?? ""} ${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase().includes(q)
      );
      return Response.json({ q, matches: hit });
    }

    if (action === "unsubscribe") {
      if (!email) return Response.json({ error: "email required" }, { status: 400 });
      return Response.json(await rs(`/audiences/${AUDIENCE}/contacts/${encodeURIComponent(email)}`, {
        method: "PATCH", body: JSON.stringify({ unsubscribed: true }),
      }));
    }

    if (action === "remove") {
      if (!email) return Response.json({ error: "email required" }, { status: 400 });
      return Response.json(await rs(`/audiences/${AUDIENCE}/contacts/${encodeURIComponent(email)}`, {
        method: "DELETE",
      }));
    }

    if (action === "broadcasts") return Response.json(await rs("/broadcasts"));

    if (action === "broadcast") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      return Response.json(await rs(`/broadcasts/${id}`));
    }

    if (action === "create" || action === "patch") {
      const html = await loadHtml(req, url);
      const subject = url.searchParams.get("subject") ?? "";
      const name = url.searchParams.get("name") ?? "The Redlands Insider";
      const preview = url.searchParams.get("preview") ?? undefined;
      if (!subject) return Response.json({ error: "subject required" }, { status: 400 });
      const payload: Record<string, unknown> = {
        audience_id: AUDIENCE, from: FROM, reply_to: [REPLY_TO], subject, name, html,
      };
      if (preview) payload.preview_text = preview;
      if (action === "create") {
        return Response.json({ htmlBytes: html.length, ...(await rs("/broadcasts", {
          method: "POST", body: JSON.stringify(payload),
        })) });
      }
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      return Response.json({ htmlBytes: html.length, ...(await rs(`/broadcasts/${id}`, {
        method: "PATCH", body: JSON.stringify(payload),
      })) });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
