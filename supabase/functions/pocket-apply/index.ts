// pocket-apply — Note Master apply engine (Phase 4)
//
// Writes the APPROVED (still-pending, not-rejected) proposals for one note into the CRM:
//   contacts (create/update, fill-empty-only), contact_property_links + properties
//   (+ ownership_type/reason), contact_tasks / todos, and a contact_conversations
//   timeline entry citing the note. Idempotent: only touches status='pending' rows and
//   flips them to 'applied'.
//
// Called from the Review Inbox with { "note_id": "..." } after the user has reviewed,
// edited, re-matched and rejected as needed. verify_jwt=true (service_role bearer).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_USER_ID = "e1bd63ad-b120-4a5a-91c0-c3189bc8938c";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const AU_STATES = ["QLD", "NSW", "ACT", "VIC", "SA", "WA", "TAS", "NT"];
function parseAddress(addr?: string | null) {
  const out: { address: string | null; suburb: string | null; state: string | null; postcode: string | null } = {
    address: addr ?? null, suburb: null, state: null, postcode: null,
  };
  if (!addr) return out;
  const pc = addr.match(/\b(\d{4})\b/);
  if (pc) out.postcode = pc[1];
  const st = addr.toUpperCase().match(new RegExp(`\\b(${AU_STATES.join("|")})\\b`));
  if (st) out.state = st[1];
  // suburb = the alpha word(s) just before the state/postcode
  const m = addr.match(/([A-Za-z][A-Za-z\s]+?)\s+(?:QLD|NSW|ACT|VIC|SA|WA|TAS|NT)\b/i);
  if (m) out.suburb = m[1].trim().split(/\s+/).slice(-2).join(" ");
  return out;
}
function normAddr(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[.,/]/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method === "GET") return json({ ok: true, fn: "pocket-apply" });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  const noteId = body?.note_id as string | undefined;
  const proposalIds = Array.isArray(body?.proposal_ids)
    ? (body.proposal_ids as unknown[]).filter((x): x is string => typeof x === "string")
    : null;
  if (!noteId) return json({ error: "note_id required" }, 400);

  const { data: note } = await svc.from("injector_notes").select("id,title,summary_md").eq("id", noteId).maybeSingle();
  if (!note) return json({ error: "note not found" }, 404);

  let pq = svc
    .from("injector_proposals")
    .select("*")
    .eq("note_id", noteId)
    .eq("status", "pending");
  if (proposalIds && proposalIds.length) pq = pq.in("id", proposalIds);
  const { data: proposals, error: pErr } = await pq;
  if (pErr) return json({ error: pErr.message }, 500);

  const applied: string[] = [];
  const nameToContact = new Map<string, string>(); // proposed.name -> contact id
  const now = new Date().toISOString();

  // ---- 1) contacts first (so properties/tasks can link to them) ----
  for (const p of (proposals ?? []).filter((x) => x.entity_type === "contact")) {
    const pr = p.proposed ?? {};
    const res = parseAddress(pr.residential_address);
    let contactId: string | null = p.match_contact_id ?? null;

    if (contactId) {
      // update: fill only empty fields, never clobber existing data
      const { data: existing } = await svc
        .from("contacts")
        .select("id,mobile,phone,email,address,suburb,state,postcode")
        .eq("id", contactId)
        .maybeSingle();
      if (existing) {
        const patch: Record<string, unknown> = {};
        if (!existing.mobile && pr.mobile) patch.mobile = pr.mobile;
        if (!existing.email && pr.email) patch.email = pr.email;
        if (!existing.address && res.address) patch.address = res.address;
        if (!existing.suburb && res.suburb) patch.suburb = res.suburb;
        if (!existing.state && res.state) patch.state = res.state;
        if (!existing.postcode && res.postcode) patch.postcode = res.postcode;
        if (Object.keys(patch).length) await svc.from("contacts").update(patch).eq("id", contactId);
      }
    } else {
      const { data: created, error: cErr } = await svc
        .from("contacts")
        .insert({
          user_id: OWNER_USER_ID,
          first_name: pr.first_name ?? null,
          last_name: pr.last_name ?? null,
          name: pr.name ?? null,
          mobile: pr.mobile ?? null,
          email: pr.email ?? null,
          address: res.address,
          suburb: res.suburb,
          state: res.state,
          postcode: res.postcode,
          lead_status: "new",
          contact_type:
            pr.ownership === "buyer" ? "buyer"
            : pr.ownership === "investor_absentee" ? "investor"
            : pr.ownership === "owner_occupier" ? "seller"
            : null,
        })
        .select("id")
        .single();
      if (cErr) return json({ error: `create contact: ${cErr.message}` }, 500);
      contactId = created.id;
    }

    if (contactId && pr.name) nameToContact.set(String(pr.name).toLowerCase(), contactId);

    // Conversation Hub entry citing the note — save the FULL call summary so it reads richly,
    // with the contact-specific takeaway kept as the "next / context" line.
    if (contactId) {
      const convoSummary = note.summary_md
        ? String(note.summary_md)
        : (pr.note ? String(pr.note) : `From Pocket note: ${note.title ?? "(untitled)"}`);
      await svc.from("contact_conversations").insert({
        user_id: OWNER_USER_ID,
        contact_id: contactId,
        occurred_at: now,
        channel: "note",
        source: "pocket_injector",
        summary: convoSummary,
        next_steps: note.summary_md && pr.note ? String(pr.note) : null,
      });
    }
    await svc.from("injector_proposals").update({ status: "applied", applied_at: now }).eq("id", p.id);
    applied.push(p.id);
  }

  // ---- 2) properties ----
  for (const p of (proposals ?? []).filter((x) => x.entity_type === "property")) {
    const pr = p.proposed ?? {};
    const ownerId = p.match_contact_id ?? (pr.owner_name ? nameToContact.get(String(pr.owner_name).toLowerCase()) : null) ?? null;
    const addr = pr.address as string | undefined;
    if (!addr) { await svc.from("injector_proposals").update({ status: "applied", applied_at: now }).eq("id", p.id); applied.push(p.id); continue; }

    // find an existing property for this user by loose address match
    const parsed = parseAddress(addr);
    let propId: string | null = null;
    const { data: hits } = await svc
      .from("properties")
      .select("id,address,street_address")
      .eq("user_id", OWNER_USER_ID)
      .or(`address.ilike.%${(addr.split(",")[0] || addr).slice(0, 24)}%,street_address.ilike.%${(addr.split(",")[0] || addr).slice(0, 24)}%`)
      .limit(5);
    for (const h of hits ?? []) {
      if (normAddr(h.address).includes(normAddr(addr.split(",")[0])) || normAddr(h.street_address).includes(normAddr(addr.split(",")[0]))) { propId = h.id; break; }
    }

    if (propId) {
      await svc.from("properties").update({
        ownership_type: pr.ownership_type ?? "unknown",
        ownership_reason: pr.ownership_reason ?? null,
        owner_contact_id: ownerId ?? undefined,
      }).eq("id", propId);
    } else {
      const { data: created, error: prErr } = await svc.from("properties").insert({
        user_id: OWNER_USER_ID,
        address: parsed.address,
        street_address: (addr.split(",")[0] || addr).trim(),
        suburb: parsed.suburb,
        state: parsed.state,
        postcode: parsed.postcode,
        ownership_type: pr.ownership_type ?? "unknown",
        ownership_reason: pr.ownership_reason ?? null,
        owner_contact_id: ownerId ?? null,
      }).select("id").single();
      if (prErr) return json({ error: `create property: ${prErr.message}` }, 500);
      propId = created.id;
    }

    // link contact <-> property as owner
    if (propId && ownerId) {
      const { data: link } = await svc.from("contact_property_links")
        .select("id").eq("contact_id", ownerId).eq("property_id", propId).maybeSingle();
      if (!link) {
        await svc.from("contact_property_links").insert({
          user_id: OWNER_USER_ID, contact_id: ownerId, property_id: propId,
          role: pr.ownership_type === "investment" ? "landlord" : "owner",
        });
      }
    }
    await svc.from("injector_proposals").update({ status: "applied", applied_at: now }).eq("id", p.id);
    applied.push(p.id);
  }

  // ---- 3) tasks ----
  for (const p of (proposals ?? []).filter((x) => x.entity_type === "task")) {
    const pr = p.proposed ?? {};
    const contactId = p.match_contact_id ?? (pr.contact_name ? nameToContact.get(String(pr.contact_name).toLowerCase()) : null) ?? null;
    const dueAt = pr.due ? new Date(pr.due + "T09:00:00+10:00").toISOString() : null;
    if (contactId) {
      await svc.from("contact_tasks").insert({
        user_id: OWNER_USER_ID, contact_id: contactId, title: pr.title ?? "Follow up", due_at: dueAt,
      });
    } else {
      await svc.from("todos").insert({
        user_id: OWNER_USER_ID, title: pr.title ?? "Follow up", due_at: dueAt, completed: false,
      });
    }
    await svc.from("injector_proposals").update({ status: "applied", applied_at: now }).eq("id", p.id);
    applied.push(p.id);
  }

  // Do NOT auto-complete the note — leave it in the inbox (with its summary) so the user can
  // keep injecting items or add records by hand, until they explicitly Dismiss it.
  const { count: remaining } = await svc
    .from("injector_proposals")
    .select("id", { count: "exact", head: true })
    .eq("note_id", noteId)
    .eq("status", "pending");

  return json({ ok: true, applied: applied.length, remaining: remaining ?? 0 });
});
