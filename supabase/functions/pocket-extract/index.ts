// pocket-extract — Note Master AI extraction (Phase 3)
//
// Reads received injector_notes (dictated Pocket prospecting notes), asks Claude to
// pull out the real people / properties / tasks, matches each person against the
// existing CRM contacts, classifies owner-occupier vs investor, and writes
// injector_proposals (status=pending) for the Review Inbox to approve.
//
// Invoked by pg_cron every minute (service_role bearer) to sweep status='received'
// notes, or directly with { "note_id": "..." } to (re)process a single note.
//
// Reuses ANTHROPIC_API_KEY (already set in Supabase). No new secret required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Model is overridable via env so we can swap it without a redeploy.
const MODEL = Deno.env.get("POCKET_EXTRACT_MODEL") ?? "claude-sonnet-5";
const FALLBACK_MODEL = Deno.env.get("POCKET_EXTRACT_FALLBACK_MODEL") ?? "claude-haiku-4-5-20251001";

const OWNER_USER_ID = "e1bd63ad-b120-4a5a-91c0-c3189bc8938c";
const BATCH = 5; // notes per cron sweep

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// ---------- helpers ----------
function onlyDigits(s: unknown): string {
  return typeof s === "string" ? s.replace(/\D+/g, "") : "";
}
// Loose suburb/postcode key for comparing two addresses.
function localityKey(addr: unknown): string {
  if (typeof addr !== "string" || !addr.trim()) return "";
  const lower = addr.toLowerCase();
  const postcode = (lower.match(/\b(\d{4})\b/) || [])[1] || "";
  // strip unit/street-number noise, keep alpha tokens (suburb + state)
  const words = lower
    .replace(/[.,/]/g, " ")
    .split(/\s+/)
    .filter((w) => /^[a-z]{3,}$/.test(w) && !["street", "st", "road", "rd", "avenue", "ave", "drive", "dr", "court", "ct", "lane", "ln", "place", "pl", "unit", "apt", "the", "and"].includes(w));
  const tail = words.slice(-3).join(" ");
  return (postcode ? postcode + " " : "") + tail;
}
function sanitizeForFilter(s: string): string {
  // PostgREST or() is sensitive to , ( ) — keep it clean for ilike patterns.
  return s.replace(/[,()*%]/g, " ").trim();
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "\n…[truncated]" : s;
}

type Entity = {
  name?: string;
  mobile?: string | null;
  email?: string | null;
  residential_address?: string | null;
  subject_property_address?: string | null;
  ownership?: "owner_occupier" | "investor_absentee" | "buyer" | "unknown";
  confidence?: number;
  note?: string | null;
  tasks?: { title: string; due?: string | null }[];
};
type Extraction = {
  note_type: string;
  note_summary?: string;
  entities: Entity[];
  session_todos: { title: string; due?: string | null }[];
};

const EXTRACTION_TOOL = {
  name: "record_extraction",
  description: "Record the real-estate business entities, properties and tasks found in the note.",
  input_schema: {
    type: "object",
    properties: {
      note_type: {
        type: "string",
        enum: ["contact_conversation", "contact_update", "general_prospecting", "task_only", "idea_or_offtopic"],
        description: "Classify the note. Use idea_or_offtopic for app/feature brainstorming or non-client chatter.",
      },
      note_summary: { type: "string", description: "One short line describing what this note is about." },
      entities: {
        type: "array",
        description: "Each real person discussed (owner, prospect, buyer). Empty if the note has no real people.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            mobile: { type: ["string", "null"], description: "Australian mobile/phone as spoken, digits ok." },
            email: { type: ["string", "null"] },
            residential_address: { type: ["string", "null"], description: "Where the person LIVES." },
            subject_property_address: { type: ["string", "null"], description: "The property being discussed/sold/owned." },
            ownership: {
              type: "string",
              enum: ["owner_occupier", "investor_absentee", "buyer", "unknown"],
              description: "owner_occupier = lives in the subject property; investor_absentee = owns it but lives elsewhere; buyer = looking to buy.",
            },
            confidence: { type: "number", description: "0-1 confidence this is a real, correctly-read entity." },
            note: { type: ["string", "null"], description: "Key business context (e.g. 'Listed with Ray White, appraisal in 2 weeks')." },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, due: { type: ["string", "null"], description: "YYYY-MM-DD or null" } },
                required: ["title"],
              },
            },
          },
          required: ["name", "ownership", "confidence"],
        },
      },
      session_todos: {
        type: "array",
        description: "General to-dos from the note not tied to a specific person.",
        items: {
          type: "object",
          properties: { title: { type: "string" }, due: { type: ["string", "null"] } },
          required: ["title"],
        },
      },
    },
    required: ["note_type", "entities", "session_todos"],
  },
};

const SYSTEM_PROMPT =
  "You are Note Master, an extraction engine for an Australian real-estate agent's CRM (Redlands / Brisbane south, Queensland Sotheby's). " +
  "You read a dictated note (a Pocket summary, action items and speaker transcript) captured during prospecting calls, door-knocks or meetings, and extract ONLY real, business-relevant people, properties and tasks. " +
  "Rules: (1) Ignore app/feature/product brainstorming, software development chatter, and personal/off-topic content — if the note is not about real clients or properties, return note_type=idea_or_offtopic with empty entities and session_todos. " +
  "(2) Never invent people, phone numbers, emails or addresses — only capture what is actually stated. If unsure, lower the confidence. " +
  "(3) Australian context: mobiles look like 04xx xxx xxx; addresses include a suburb, a state (QLD/NSW/ACT/VIC) and a 4-digit postcode. " +
  "(4) Distinguish where a person LIVES (residential_address) from the PROPERTY being discussed (subject_property_address). If they live somewhere different from a property they own, they are investor_absentee. " +
  "Always call the record_extraction tool.";

async function callClaude(userText: string, model: string): Promise<{ ok: boolean; data?: Extraction; status: number; error?: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "record_extraction" },
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, error: `anthropic ${res.status}: ${body.slice(0, 400)}` };
  }
  const out = await res.json();
  const toolUse = (out?.content ?? []).find((c: { type?: string }) => c?.type === "tool_use");
  if (!toolUse?.input) return { ok: false, status: 502, error: "no tool_use in response" };
  return { ok: true, status: 200, data: toolUse.input as Extraction };
}

type ContactRow = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  suburb: string | null;
  postcode: string | null;
};
const CONTACT_COLS = "id,name,first_name,last_name,email,mobile,phone,suburb,postcode";

// deno-lint-ignore no-explicit-any
async function findMatch(svc: any, ent: Entity): Promise<{ contact: ContactRow; confidence: number; by: string } | null> {
  // 1) phone (strongest)
  const digits = onlyDigits(ent.mobile);
  if (digits.length >= 8) {
    const last9 = digits.slice(-9);
    const { data } = await svc
      .from("contacts")
      .select(CONTACT_COLS)
      .eq("user_id", OWNER_USER_ID)
      .or(`mobile.ilike.%${last9}%,phone.ilike.%${last9}%,home_phone.ilike.%${last9}%,work_phone.ilike.%${last9}%`)
      .limit(5);
    if (data?.length) return { contact: data[0], confidence: 0.95, by: "phone" };
  }
  // 2) email
  if (ent.email && ent.email.includes("@")) {
    const { data } = await svc.from("contacts").select(CONTACT_COLS).eq("user_id", OWNER_USER_ID).ilike("email", ent.email).limit(5);
    if (data?.length) return { contact: data[0], confidence: 0.9, by: "email" };
  }
  // 3) name (+ suburb tiebreak)
  const nm = sanitizeForFilter(ent.name ?? "");
  if (nm.length >= 3) {
    let { data } = await svc.from("contacts").select(CONTACT_COLS).eq("user_id", OWNER_USER_ID).ilike("name", `%${nm}%`).limit(10);
    if (!data?.length) {
      const parts = nm.split(/\s+/);
      const first = parts[0];
      const last = parts[parts.length - 1];
      if (first && last && first !== last) {
        const r = await svc
          .from("contacts")
          .select(CONTACT_COLS)
          .eq("user_id", OWNER_USER_ID)
          .ilike("first_name", `%${first}%`)
          .ilike("last_name", `%${last}%`)
          .limit(10);
        data = r.data;
      }
    }
    if (data?.length) {
      const resKey = localityKey(ent.residential_address);
      // prefer a match whose suburb/postcode matches the residential address, and that has phone/email populated
      let best = data[0];
      let bestScore = -1;
      for (const c of data as ContactRow[]) {
        let score = 0;
        if (resKey && (localityKey(c.suburb) && resKey.includes((c.suburb ?? "").toLowerCase()))) score += 2;
        if (resKey && c.postcode && resKey.includes(c.postcode)) score += 2;
        if (c.mobile || c.phone) score += 1;
        if (c.email) score += 1;
        if (score > bestScore) { bestScore = score; best = c; }
      }
      const conf = data.length === 1 ? 0.7 : 0.55;
      return { contact: best, confidence: conf, by: "name" };
    }
  }
  return null;
}

function classifyOwnership(ent: Entity): { type: string; reason: string } {
  const res = ent.residential_address ?? "";
  const sub = ent.subject_property_address ?? "";
  if (ent.ownership === "owner_occupier") return { type: "owner_occupier", reason: "Note indicates they live at the property" };
  if (ent.ownership === "investor_absentee") {
    const rk = localityKey(res), sk = localityKey(sub);
    return { type: "investment", reason: rk && sk ? `Absentee owner — lives ${rk}, property ${sk}` : "Note indicates absentee owner / investor" };
  }
  if (ent.ownership === "buyer") return { type: "unknown", reason: "Buyer — not the owner of a subject property" };
  // unknown → address tiebreaker
  const rk = localityKey(res), sk = localityKey(sub);
  if (rk && sk) {
    if (rk !== sk) return { type: "investment", reason: `Residence (${rk}) differs from property (${sk})` };
    return { type: "owner_occupier", reason: `Residence locality matches property (${sk})` };
  }
  return { type: "unknown", reason: "Insufficient address detail to classify" };
}

// deno-lint-ignore no-explicit-any
async function processNote(svc: any, note: any): Promise<{ note_id: string; proposals: number; note_type: string }> {
  const parts: string[] = [];
  if (note.title) parts.push(`TITLE: ${note.title}`);
  if (note.summary_md) parts.push(`SUMMARY:\n${note.summary_md}`);
  if (note.action_items) parts.push(`ACTION ITEMS:\n${truncate(JSON.stringify(note.action_items), 3000)}`);
  if (note.transcript) {
    const t = typeof note.transcript === "string" ? note.transcript : JSON.stringify(note.transcript);
    parts.push(`TRANSCRIPT:\n${truncate(t, 12000)}`);
  }
  const userText = parts.join("\n\n") || "(empty note)";

  let result = await callClaude(userText, MODEL);
  if (!result.ok && result.status === 404 && FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
    result = await callClaude(userText, FALLBACK_MODEL);
  }
  if (!result.ok || !result.data) {
    await svc.from("injector_notes").update({ status: "error", error: result.error ?? "extraction failed", updated_at: new Date().toISOString() }).eq("id", note.id);
    return { note_id: note.id, proposals: 0, note_type: "error" };
  }
  const ex = result.data;

  // Idempotent: clear prior *pending* proposals for this note (keep applied/rejected).
  await svc.from("injector_proposals").delete().eq("note_id", note.id).eq("status", "pending");

  // deno-lint-ignore no-explicit-any
  const rows: any[] = [];
  for (const ent of ex.entities ?? []) {
    if (!ent.name) continue;
    const match = await findMatch(svc, ent);
    const own = classifyOwnership(ent);
    const nameParts = (ent.name ?? "").trim().split(/\s+/);
    rows.push({
      note_id: note.id,
      user_id: OWNER_USER_ID,
      entity_type: "contact",
      action: match ? "update" : "create",
      match_contact_id: match?.contact.id ?? null,
      confidence: Math.min(ent.confidence ?? 0.5, match?.confidence ?? 1),
      proposed: {
        name: ent.name,
        first_name: nameParts[0] ?? null,
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
        mobile: ent.mobile ?? null,
        email: ent.email ?? null,
        residential_address: ent.residential_address ?? null,
        subject_property_address: ent.subject_property_address ?? null,
        ownership: ent.ownership ?? "unknown",
        note: ent.note ?? null,
        match_by: match?.by ?? null,
        match_name: match?.contact.name ?? null,
      },
    });
    // property proposal when a subject property is named
    if (ent.subject_property_address) {
      rows.push({
        note_id: note.id,
        user_id: OWNER_USER_ID,
        entity_type: "property",
        action: "flag",
        match_contact_id: match?.contact.id ?? null,
        confidence: ent.confidence ?? 0.5,
        proposed: {
          address: ent.subject_property_address,
          ownership_type: own.type,
          ownership_reason: own.reason,
          owner_name: ent.name,
        },
      });
    }
    // per-entity tasks
    for (const t of ent.tasks ?? []) {
      if (!t?.title) continue;
      rows.push({
        note_id: note.id,
        user_id: OWNER_USER_ID,
        entity_type: "task",
        action: "create",
        match_contact_id: match?.contact.id ?? null,
        confidence: ent.confidence ?? 0.5,
        proposed: { title: t.title, due: t.due ?? null, contact_name: ent.name },
      });
    }
  }
  // unassigned session todos
  for (const t of ex.session_todos ?? []) {
    if (!t?.title) continue;
    rows.push({
      note_id: note.id,
      user_id: OWNER_USER_ID,
      entity_type: "task",
      action: "create",
      match_contact_id: null,
      confidence: 0.6,
      proposed: { title: t.title, due: t.due ?? null, contact_name: null },
    });
  }

  if (rows.length) {
    const { error } = await svc.from("injector_proposals").insert(rows);
    if (error) {
      await svc.from("injector_notes").update({ status: "error", error: `insert proposals: ${error.message}`, updated_at: new Date().toISOString() }).eq("id", note.id);
      return { note_id: note.id, proposals: 0, note_type: "error" };
    }
  }
  await svc
    .from("injector_notes")
    .update({ status: "extracted", error: null, updated_at: new Date().toISOString() })
    .eq("id", note.id);
  return { note_id: note.id, proposals: rows.length, note_type: ex.note_type };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method === "GET") return json({ ok: true, fn: "pocket-extract", configured: Boolean(ANTHROPIC_API_KEY), model: MODEL });
  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 503);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cron may send empty */ }
  const singleId = body?.note_id as string | undefined;

  // deno-lint-ignore no-explicit-any
  let notes: any[] = [];
  if (singleId) {
    const { data } = await svc.from("injector_notes").select("*").eq("id", singleId).limit(1);
    notes = data ?? [];
  } else {
    const { data } = await svc
      .from("injector_notes")
      .select("*")
      .eq("status", "received")
      .order("created_at", { ascending: true })
      .limit(BATCH);
    notes = data ?? [];
  }

  const results = [];
  for (const n of notes) {
    try {
      results.push(await processNote(svc, n));
    } catch (e) {
      await svc.from("injector_notes").update({ status: "error", error: String(e), updated_at: new Date().toISOString() }).eq("id", n.id);
      results.push({ note_id: n.id, proposals: 0, note_type: "error" });
    }
  }
  return json({ ok: true, processed: results.length, results });
});
