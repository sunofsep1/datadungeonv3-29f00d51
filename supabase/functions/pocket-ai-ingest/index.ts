/**
 * pocket-ai-ingest — receives Pocket AI recording webhooks, extracts CRM data
 * via Claude, and writes contacts / activity_log / touches / contact_tasks.
 *
 * Deploy: npx supabase functions deploy pocket-ai-ingest --no-verify-jwt
 *
 * Required Supabase secrets:
 *   POCKET_AI_WEBHOOK_SECRET   HMAC signing secret from Pocket AI dashboard
 *   ANTHROPIC_API_KEY          already present (used by sync-anthropic-usage)
 *
 * Pocket AI webhook config:
 *   URL: https://sujyalrzbubvhpkntwja.supabase.co/functions/v1/pocket-ai-ingest
 *   Trigger: recording completion
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OWNER_USER_ID = "e1bd63ad-b120-4a5a-91c0-c3189bc8938c";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── HMAC verification ───────────────────────────────────────────────────────

async function verifyHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Pocket AI may or may not prefix with "sha256="
  const stripped = signature.toLowerCase().replace(/^sha256=/, "");
  return computed === stripped;
}

// ─── Claude extraction ────────────────────────────────────────────────────────

type ExtractedContact = {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  notes: string | null;
};

type ExtractedProperty = {
  address: string;
  suburb: string | null;
  state: string | null;
  context: string;
};

type ExtractedTask = {
  title: string;
  due_days: number;
  contact_name: string | null;
};

type ClaudeExtraction = {
  contacts: ExtractedContact[];
  properties: ExtractedProperty[];
  tasks: ExtractedTask[];
  meeting_summary: string;
  meeting_type: string;
};

async function extractWithClaude(
  transcript: string,
  summary: string,
  apiKey: string,
): Promise<ClaudeExtraction> {
  const systemPrompt =
    "You are a real estate CRM data extraction assistant. Extract structured data from meeting transcripts. Return valid JSON only. No explanation text.";

  const userPrompt = `Extract CRM data from this real estate meeting transcript.

TRANSCRIPT:
${transcript}

SUMMARY:
${summary}

Return JSON with this exact shape:
{
  "contacts": [
    {
      "first_name": "string",
      "last_name": "string",
      "phone": "string or null",
      "email": "string or null",
      "role": "buyer|seller|landlord|tenant|investor|agent|other",
      "notes": "any relevant context about this person"
    }
  ],
  "properties": [
    {
      "address": "full street address",
      "suburb": "string or null",
      "state": "QLD or NSW or VIC etc, or null",
      "context": "for_sale|interest|appraisal|mentioned"
    }
  ],
  "tasks": [
    {
      "title": "action item title",
      "due_days": 3,
      "contact_name": "full name of who this relates to, or null"
    }
  ],
  "meeting_summary": "2-3 sentence summary for CRM notes",
  "meeting_type": "call|meeting|site_visit|appraisal|open_home|other"
}

Rules:
- Only include people and properties explicitly mentioned
- Normalise Australian phone numbers to 04XX XXX XXX format where possible
- Empty array if nothing found in a category
- due_days is calendar days from today until due (default 3 if unclear)`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude API error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const json = await res.json() as { content: Array<{ type: string; text: string }> };
  const text = json.content?.[0]?.text ?? "{}";

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    return JSON.parse(cleaned) as ClaudeExtraction;
  } catch {
    console.error("[pocket-ai-ingest] Claude returned non-JSON:", cleaned.slice(0, 200));
    return { contacts: [], properties: [], tasks: [], meeting_summary: summary, meeting_type: "other" };
  }
}

// ─── Contact upsert (dedup by phone → name) ──────────────────────────────────

async function upsertContact(
  supabase: ReturnType<typeof createClient>,
  contact: ExtractedContact,
  source: string,
): Promise<string | null> {
  // 1. Try by phone
  if (contact.phone) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", OWNER_USER_ID)
      .or(`phone.eq.${contact.phone},mobile.eq.${contact.phone}`)
      .maybeSingle();
    if (data?.id) {
      // Append notes without overwriting
      if (contact.notes) {
        const { data: existing } = await supabase
          .from("contacts")
          .select("notes")
          .eq("id", data.id)
          .single();
        const merged = [existing?.notes, contact.notes].filter(Boolean).join("\n\n");
        await supabase.from("contacts").update({ notes: merged }).eq("id", data.id);
      }
      return data.id;
    }
  }

  // 2. Try by first + last name
  if (contact.first_name && contact.last_name) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", OWNER_USER_ID)
      .ilike("first_name", contact.first_name)
      .ilike("last_name", contact.last_name)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // 3. Insert new contact
  const roleToContactType: Record<string, string> = {
    buyer: "buyer",
    seller: "seller",
    landlord: "landlord",
    tenant: "tenant",
    investor: "investor",
    both: "both",
  };
  const contactType = roleToContactType[contact.role] ?? null;

  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      user_id: OWNER_USER_ID,
      owner_id: OWNER_USER_ID,
      first_name: contact.first_name,
      last_name: contact.last_name || null,
      name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
      phone: contact.phone ?? null,
      email: contact.email ?? null,
      notes: contact.notes ?? null,
      source,
      contact_type: contactType,
      contact_category: contact.role === "seller" ? "seller_lead" : "warm_lead",
      lead_status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pocket-ai-ingest] contact insert error:", error.message);
    return null;
  }
  return newContact?.id ?? null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read raw body first (needed for HMAC verification before JSON parse)
  const rawBody = await req.text();

  // Verify HMAC signature
  const webhookSecret = Deno.env.get("POCKET_AI_WEBHOOK_SECRET") ?? "";
  if (webhookSecret) {
    const signature = req.headers.get("x-pocket-ai-signature") ?? "";
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const valid = await verifyHmac(rawBody, signature, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    console.warn("[pocket-ai-ingest] POCKET_AI_WEBHOOK_SECRET not set — skipping HMAC check");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recordingId = typeof payload.recording_id === "string" ? payload.recording_id : null;
  const transcript = typeof payload.transcript === "string" ? payload.transcript : "";
  const summary = typeof payload.summary === "string" ? payload.summary : "";
  const actionItems: string[] = Array.isArray(payload.action_items)
    ? (payload.action_items as string[]).filter((x) => typeof x === "string")
    : [];
  const speakerCount = typeof payload.speaker_count === "number" ? payload.speaker_count : null;
  const durationSecs = typeof payload.duration === "number" ? payload.duration : null;
  const occurredAt = typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString();

  if (!transcript && !summary) {
    return new Response(JSON.stringify({ error: "Payload must include transcript or summary" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Idempotency check
  if (recordingId) {
    const { data: existing } = await supabase
      .from("activity_log")
      .select("id")
      .eq("user_id", OWNER_USER_ID)
      .eq("metadata->>recording_id" as any, recordingId)
      .maybeSingle();

    if (existing?.id) {
      return new Response(
        JSON.stringify({ ok: true, already_processed: true, activity_id: existing.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Extract structured data with Claude
  let extracted: ClaudeExtraction = {
    contacts: [],
    properties: [],
    tasks: actionItems.map((title) => ({ title, due_days: 3, contact_name: null })),
    meeting_summary: summary || transcript.slice(0, 300),
    meeting_type: "other",
  };

  if (anthropicApiKey && (transcript || summary)) {
    try {
      extracted = await extractWithClaude(transcript, summary, anthropicApiKey);
      // Merge in raw action_items if Claude found none
      if (extracted.tasks.length === 0 && actionItems.length > 0) {
        extracted.tasks = actionItems.map((title) => ({ title, due_days: 3, contact_name: null }));
      }
    } catch (err) {
      console.error("[pocket-ai-ingest] Claude extraction failed:", err);
      // Continue with fallback data — don't fail the whole ingestion
    }
  }

  // Upsert contacts
  const contactIdMap = new Map<string, string>(); // full_name → id
  const contactIds: string[] = [];

  for (const c of extracted.contacts) {
    const id = await upsertContact(supabase, c, "pocket_ai");
    if (id) {
      contactIds.push(id);
      const fullName = `${c.first_name} ${c.last_name || ""}`.trim().toLowerCase();
      contactIdMap.set(fullName, id);
    }
  }

  const primaryContactId = contactIds[0] ?? null;

  // Determine activity type from meeting_type
  const meetingTypeToActivityType: Record<string, string> = {
    call: "call",
    meeting: "meeting",
    site_visit: "meeting",
    appraisal: "meeting",
    open_home: "open_house",
    other: "meeting",
    voice_recording: "voice_recording",
  };
  const activityType = meetingTypeToActivityType[extracted.meeting_type] ?? "meeting";

  // Insert activity_log row
  const { data: activityRow, error: activityErr } = await supabase
    .from("activity_log")
    .insert({
      user_id: OWNER_USER_ID,
      activity_type: activityType,
      title: extracted.meeting_summary.slice(0, 120),
      description: extracted.meeting_summary,
      occurred_at: occurredAt,
      contact_id: primaryContactId,
      metadata: {
        recording_id: recordingId,
        duration_seconds: durationSecs,
        speaker_count: speakerCount,
        source: payload.source ?? "pocket_ai",
        transcript_length: transcript.length,
        raw_action_items: actionItems,
        properties_mentioned: extracted.properties,
        contacts_extracted: extracted.contacts.length,
      },
    })
    .select("id")
    .single();

  if (activityErr) {
    console.error("[pocket-ai-ingest] activity_log insert:", activityErr);
  }

  // Insert touches for each contact
  for (const contactId of contactIds) {
    const touchType = extracted.meeting_type === "call" ? "call" : "other";
    const { error: touchErr } = await supabase.from("touches").insert({
      contact_id: contactId,
      touch_type: touchType,
      notes: extracted.meeting_summary.slice(0, 255),
      logged_by: OWNER_USER_ID,
      touch_date: occurredAt,
    });
    if (touchErr) {
      console.error("[pocket-ai-ingest] touches insert:", touchErr.message);
    }
  }

  // Insert contact_tasks from extracted action items
  const taskIds: string[] = [];
  const nowMs = Date.now();

  for (const task of extracted.tasks) {
    // Resolve contact: match contact_name to upserted contacts, fall back to primary
    let taskContactId = primaryContactId;
    if (task.contact_name) {
      const key = task.contact_name.toLowerCase().trim();
      for (const [name, id] of contactIdMap.entries()) {
        if (name.includes(key) || key.includes(name)) {
          taskContactId = id;
          break;
        }
      }
    }

    if (!taskContactId) continue;

    const dueDays = typeof task.due_days === "number" && task.due_days > 0 ? task.due_days : 3;
    const dueAt = new Date(nowMs + dueDays * 86_400_000).toISOString();

    const { data: taskRow, error: taskErr } = await supabase
      .from("contact_tasks")
      .insert({
        contact_id: taskContactId,
        user_id: OWNER_USER_ID,
        title: task.title,
        notes: `From Pocket AI recording${recordingId ? ` (${recordingId})` : ""}`,
        due_at: dueAt,
      })
      .select("id")
      .single();

    if (taskErr) {
      console.error("[pocket-ai-ingest] contact_tasks insert:", taskErr.message);
    } else if (taskRow?.id) {
      taskIds.push(taskRow.id);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      activity_id: activityRow?.id ?? null,
      contact_ids: contactIds,
      task_ids: taskIds,
      contacts_found: extracted.contacts.length,
      tasks_created: taskIds.length,
      meeting_type: extracted.meeting_type,
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
