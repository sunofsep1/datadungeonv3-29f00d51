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

function addDaysToNow(days: number, maxDays: number): string {
  const bounded = Math.min(maxDays, Math.max(0, Math.floor(days)));
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + bounded);
  return d.toISOString();
}

function getPeriodRange(period: "this_month" | "this_quarter" | "this_year") {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(now);

  if (period === "this_year") {
    start.setUTCMonth(0, 1);
  } else if (period === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    start.setUTCMonth(quarterStartMonth, 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
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

server.registerTool(
  "list_due_tasks",
  {
    title: "List Due Tasks",
    description: "List open tasks due within the next N days for a user.",
    inputSchema: {
      userId: z.string().uuid(),
      daysAhead: z.number().int().positive().max(30).default(7),
    },
  },
  async ({ userId, daysAhead }) => {
    assertUserAllowed(userId);
    const dueBy = addDaysToNow(daysAhead, 30);
    const { data, error } = await supabase
      .from("contact_tasks")
      .select("id, title, due_at, contact_id, priority")
      .eq("user_id", userId)
      .is("completed_at", null)
      .not("due_at", "is", null)
      .lte("due_at", dueBy)
      .order("due_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const tasks = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      title: row.title ?? null,
      due_date: row.due_at ?? null,
      contact_id: row.contact_id ?? null,
      priority: row.priority ?? null,
    }));
    return text({ count: tasks.length, tasks });
  },
);

server.registerTool(
  "get_contact_timeline",
  {
    title: "Get Contact Timeline",
    description: "Get the recent activity timeline for one contact.",
    inputSchema: {
      userId: z.string().uuid(),
      contactId: z.string().uuid(),
    },
  },
  async ({ userId, contactId }) => {
    assertUserAllowed(userId);
    await assertContactOwnership(contactId, userId);
    const { data, error } = await supabase
      .from("interactions")
      .select("id, type, body, created_at")
      .eq("user_id", userId)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    const timeline = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      type: row.type ?? null,
      notes: row.body ?? null,
      created_at: row.created_at ?? null,
    }));
    return text({ count: timeline.length, timeline });
  },
);

server.registerTool(
  "list_upcoming_appointments",
  {
    title: "List Upcoming Appointments",
    description: "List upcoming appointments for a user within the next N days.",
    inputSchema: {
      userId: z.string().uuid(),
      daysAhead: z.number().int().positive().max(60).default(14),
    },
  },
  async ({ userId, daysAhead }) => {
    assertUserAllowed(userId);
    const dueBy = addDaysToNow(daysAhead, 60);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("appointments")
      .select("id, title, date, location, contact_id")
      .eq("user_id", userId)
      .gte("date", now)
      .lte("date", dueBy)
      .order("date", { ascending: true })
      .limit(20);
    if (error) throw error;
    return text({ count: (data ?? []).length, appointments: data ?? [] });
  },
);

server.registerTool(
  "get_listing_summary",
  {
    title: "Get Listing Summary",
    description: "Get a summary of a listing including contact name and days on market.",
    inputSchema: {
      userId: z.string().uuid(),
      listingId: z.string().uuid(),
    },
  },
  async ({ userId, listingId }) => {
    assertUserAllowed(userId);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Listing not found for user: ${listingId}`);

    const row = data as Record<string, unknown>;
    let contactName: string | null = null;
    const contactId = typeof row.contact_id === "string" ? row.contact_id : null;
    if (contactId) {
      const { data: contact, error: cErr } = await supabase
        .from("contacts")
        .select("id, name, first_name, last_name")
        .eq("id", contactId)
        .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
        .maybeSingle();
      if (cErr) throw cErr;
      if (contact) contactName = normalizeContactName(contact as Record<string, unknown>);
    }

    const listDateRaw = row.list_date ?? row.created_at ?? null;
    const listDate = listDateRaw ? new Date(String(listDateRaw)) : null;
    const daysOnMarket =
      listDate && !Number.isNaN(listDate.getTime())
        ? Math.max(0, Math.floor((Date.now() - listDate.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
    const address = row.address_line1 ?? row.address ?? row.street_address ?? null;

    return text({
      summary: {
        id: row.id,
        address,
        status: row.status ?? null,
        list_price: row.list_price ?? row.asking_price ?? null,
        contact_name: contactName,
        days_on_market: daysOnMarket,
        stage: row.pipeline_stage ?? row.stage ?? null,
      },
    });
  },
);

server.registerTool(
  "list_nurture_due",
  {
    title: "List Nurture Due",
    description: "List nurture sequence steps that are due now or today for a user.",
    inputSchema: {
      userId: z.string().uuid(),
    },
  },
  async ({ userId }) => {
    assertUserAllowed(userId);
    const dueBy = addDaysToNow(1, 1);
    const { data: enrollments, error } = await supabase
      .from("nurture_sequence_enrollments")
      .select("id, contact_id, sequence_id, current_step_index, next_step_at")
      .eq("user_id", userId)
      .is("completed_at", null)
      .not("next_step_at", "is", null)
      .lte("next_step_at", dueBy)
      .order("next_step_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const rows = (enrollments ?? []) as Array<{
      id: string;
      contact_id: string;
      sequence_id: string;
      current_step_index: number;
      next_step_at: string;
    }>;
    const sequenceIds = [...new Set(rows.map((r) => r.sequence_id))];
    const { data: seqRows, error: seqErr } = sequenceIds.length
      ? await supabase.from("nurture_sequences").select("id, name").in("id", sequenceIds)
      : { data: [], error: null };
    if (seqErr) throw seqErr;
    const seqNameById = new Map((seqRows ?? []).map((s: Record<string, unknown>) => [String(s.id), String(s.name ?? "Sequence")]));

    const due = rows.map((r) => ({
      enrollment_id: r.id,
      contact_id: r.contact_id,
      sequence_name: seqNameById.get(r.sequence_id) ?? "Sequence",
      step_number: r.current_step_index + 1,
      next_step_due_at: r.next_step_at,
    }));
    return text({ count: due.length, due });
  },
);

server.registerTool(
  "get_performance_snapshot",
  {
    title: "Get Performance Snapshot",
    description: "Get a performance summary for a user for a given period.",
    inputSchema: {
      userId: z.string().uuid(),
      period: z.enum(["this_month", "this_quarter", "this_year"]).default("this_month"),
    },
  },
  async ({ userId, period }) => {
    assertUserAllowed(userId);
    const { start, end } = getPeriodRange(period);
    const { data, error } = await supabase
      .from("interactions")
      .select("type")
      .eq("user_id", userId)
      .gte("created_at", start)
      .lte("created_at", end);
    if (error) throw error;

    const rows = (data ?? []) as Array<{ type?: string | null }>;
    const touchesLogged = rows.length;
    const callsMade = rows.filter((r) => String(r.type ?? "").toLowerCase() === "call").length;
    const appointmentsBooked = rows.filter((r) => String(r.type ?? "").toLowerCase() === "meeting").length;

    return text({
      period,
      touches_logged: touchesLogged,
      calls_made: callsMade,
      appointments_booked: appointmentsBooked,
      period_start: start,
      period_end: end,
    });
  },
);

server.registerTool(
  "search_listings",
  {
    title: "Search Listings",
    description: "Search listings for a user by address, status, or stage.",
    inputSchema: {
      userId: z.string().uuid(),
      query: z.string().default(""),
      status: z.string().optional(),
      limit: z.number().int().positive().max(50).default(10),
    },
  },
  async ({ userId, query, status, limit }) => {
    assertUserAllowed(userId);
    let q = supabase
      .from("listings")
      .select("id, address_line1, status, list_price, pipeline_stage, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (query.trim()) q = q.ilike("address_line1", `%${query.trim()}%`);
    if (status?.trim()) q = q.eq("status", status.trim());

    const { data, error } = await q;
    if (error) throw error;
    const listings = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id,
      address: row.address_line1 ?? null,
      status: row.status ?? null,
      list_price: row.list_price ?? null,
      stage: row.pipeline_stage ?? null,
      created_at: row.created_at ?? null,
    }));
    return text({ count: listings.length, listings });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
