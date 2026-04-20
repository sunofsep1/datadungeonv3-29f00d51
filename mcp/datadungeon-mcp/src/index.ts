import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { assertUserAllowed } from "./config.js";
import { assertContactOwnership, assertWorkflowExistsForUser, supabase } from "./supabase.js";

function text(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function normalizeContactName(row: Record<string, unknown>): string {
  const name = String(row.name ?? "").trim();
  if (name) return name;
  const first = String(row.first_name ?? "").trim();
  const last = String(row.last_name ?? "").trim();
  return [first, last].filter(Boolean).join(" ").trim() || "—";
}

function searchMatch(row: Record<string, unknown>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const values = [
    row.name,
    row.first_name,
    row.last_name,
    row.email,
    row.phone,
    row.contact_category,
    row.source,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .filter(Boolean);
  return values.some((v) => v.includes(q));
}

function addMinutesToNow(minutes: number): string {
  const bounded = Math.min(525600, Math.max(0, Math.floor(minutes)));
  const d = new Date();
  d.setUTCMinutes(d.getUTCMinutes() + bounded);
  return d.toISOString();
}

const server = new McpServer({
  name: "datadungeon-mcp",
  version: "0.1.0",
});

server.registerTool(
  "search_contacts",
  {
    title: "Search Contacts",
    description: "Search contacts for a user by name/email/phone/category/source text.",
    inputSchema: {
      userId: z.string().uuid(),
      query: z.string().default(""),
      limit: z.number().int().positive().max(50).default(10),
    },
  },
  async ({ userId, query, limit }) => {
    assertUserAllowed(userId);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw error;

    const rows = ((data ?? []) as Record<string, unknown>[])
      .filter((row) => searchMatch(row, query))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        name: normalizeContactName(row),
        email: row.email ?? null,
        phone: row.phone ?? null,
        contact_category: row.contact_category ?? null,
        lead_temperature: row.lead_temperature ?? null,
        next_touch_date: row.next_touch_date ?? null,
        last_touch_date: row.last_touch_date ?? null,
      }));

    return text({ count: rows.length, contacts: rows });
  },
);

server.registerTool(
  "get_contact",
  {
    title: "Get Contact",
    description: "Get full contact row for one contact id (with ownership check).",
    inputSchema: {
      userId: z.string().uuid(),
      contactId: z.string().uuid(),
    },
  },
  async ({ userId, contactId }) => {
    await assertContactOwnership(contactId, userId);
    const { data, error } = await supabase.from("contacts").select("*").eq("id", contactId).single();
    if (error) throw error;
    return text({ contact: data });
  },
);

server.registerTool(
  "update_contact",
  {
    title: "Update Contact",
    description: "Patch safe contact fields for one contact.",
    inputSchema: {
      userId: z.string().uuid(),
      contactId: z.string().uuid(),
      updates: z
        .object({
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          source: z.string().optional(),
          notes: z.string().optional(),
          contact_category: z.string().optional(),
          category: z.string().nullable().optional(),
          next_touch_date: z.string().nullable().optional(),
          last_touch_date: z.string().nullable().optional(),
          lead_temperature: z.string().optional(),
        })
        .strict(),
    },
  },
  async ({ userId, contactId, updates }) => {
    await assertContactOwnership(contactId, userId);
    const { data, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", contactId)
      .select("*")
      .single();
    if (error) throw error;
    return text({ updated: data });
  },
);

server.registerTool(
  "create_task",
  {
    title: "Create Contact Task",
    description: "Create a task for a contact.",
    inputSchema: {
      userId: z.string().uuid(),
      contactId: z.string().uuid(),
      title: z.string().min(1),
      notes: z.string().optional(),
      dueAt: z.string().datetime().optional(),
    },
  },
  async ({ userId, contactId, title, notes, dueAt }) => {
    await assertContactOwnership(contactId, userId);
    const { data, error } = await supabase
      .from("contact_tasks")
      .insert({
        user_id: userId,
        contact_id: contactId,
        title: title.trim(),
        notes: notes?.trim() || null,
        due_at: dueAt ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return text({ task: data });
  },
);

server.registerTool(
  "log_touch",
  {
    title: "Log Contact Touch",
    description: "Write a timeline interaction (call/sms/email/meeting/note).",
    inputSchema: {
      userId: z.string().uuid(),
      contactId: z.string().uuid(),
      type: z.enum(["call", "sms", "email", "meeting", "note"]),
      subject: z.string().optional(),
      body: z.string().optional(),
      channel: z.enum(["phone", "sms", "email", "in_person", "other"]).optional(),
      timestamp: z.string().datetime().optional(),
    },
  },
  async ({ userId, contactId, type, subject, body, channel, timestamp }) => {
    await assertContactOwnership(contactId, userId);
    const payload = {
      user_id: userId,
      contact_id: contactId,
      type,
      subject: subject?.trim() || null,
      body: body?.trim() || null,
      channel: channel ?? null,
      timestamp: timestamp ?? new Date().toISOString(),
    };
    const { data, error } = await supabase.from("interactions").insert(payload).select("*").single();
    if (error) throw error;
    return text({ interaction: data });
  },
);

server.registerTool(
  "enroll_workflow",
  {
    title: "Enroll Contact In Workflow",
    description: "Enroll a contact into an active manual CRM workflow.",
    inputSchema: {
      userId: z.string().uuid(),
      contactId: z.string().uuid(),
      workflowId: z.string().uuid(),
    },
  },
  async ({ userId, contactId, workflowId }) => {
    await assertContactOwnership(contactId, userId);
    await assertWorkflowExistsForUser(workflowId, userId);

    const { data: first, error: firstErr } = await supabase
      .from("crm_workflow_steps")
      .select("delay_minutes")
      .eq("workflow_id", workflowId)
      .order("step_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstErr) throw firstErr;
    const firstDelay = typeof first?.delay_minutes === "number" ? first.delay_minutes : 0;

    const { data, error } = await supabase
      .from("crm_workflow_enrollments")
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        contact_id: contactId,
        listing_id: null,
        current_step_order: 0,
        status: "active",
        next_action_at: addMinutesToNow(firstDelay),
        context: {},
      })
      .select("*")
      .single();
    if (error) throw error;

    return text({ enrollment: data });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
