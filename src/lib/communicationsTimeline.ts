import type { ActivityLogRow } from "@/hooks/useActivityLog";
import type { Interaction } from "@/hooks/useInteractions";

export type CommunicationsKind =
  | "note"
  | "call"
  | "email"
  | "sms"
  | "inspection"
  | "offer"
  | "comms"
  | "status_change"
  | "system"
  | "open_house"
  | "settlement"
  | "appointment"
  | "enquiry"
  | "other";

export type CommunicationsSource = "activity_log" | "interaction" | "sms_outbound" | "appointment";

export type UnifiedCommItem = {
  id: string;
  source: CommunicationsSource;
  kind: CommunicationsKind;
  title: string;
  description: string | null;
  occurredAt: string;
  contactId?: string | null;
  listingId?: string | null;
  propertyId?: string | null;
};

export type SmsOutboundRow = {
  id: string;
  contact_id: string | null;
  to_phone: string;
  body_preview: string | null;
  status: string;
  created_at: string;
};

export type AppointmentRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
};

function mapInteractionKind(type: string, channel: string | null): CommunicationsKind {
  const t = type.toLowerCase();
  const c = (channel ?? "").toLowerCase();
  if (t.includes("call") || c === "phone") return "call";
  if (t.includes("email") || c === "email") return "email";
  if (t.includes("sms") || c === "sms") return "sms";
  if (t.includes("note")) return "note";
  if (t.includes("inspection") || t.includes("open")) return "inspection";
  return "other";
}

function activityLogKind(row: ActivityLogRow): CommunicationsKind {
  const title = row.title?.toLowerCase() ?? "";
  if (title.startsWith("enquiry")) return "enquiry";
  return (row.activity_type as CommunicationsKind) || "other";
}

export function activityLogToComm(row: ActivityLogRow): UnifiedCommItem {
  return {
    id: `activity:${row.id}`,
    source: "activity_log",
    kind: activityLogKind(row),
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    contactId: row.contact_id,
    listingId: row.listing_id,
    propertyId: row.property_id,
  };
}

export function interactionToComm(row: Interaction): UnifiedCommItem {
  return {
    id: `interaction:${row.id}`,
    source: "interaction",
    kind: mapInteractionKind(row.type, row.channel),
    title: row.subject?.trim() || row.type.replace(/_/g, " "),
    description: row.body,
    occurredAt: row.timestamp,
    contactId: row.contact_id,
  };
}

export function smsOutboundToComm(row: SmsOutboundRow): UnifiedCommItem {
  return {
    id: `sms:${row.id}`,
    source: "sms_outbound",
    kind: "sms",
    title: row.status === "failed" ? `SMS failed · ${row.to_phone}` : `SMS · ${row.to_phone}`,
    description: row.body_preview,
    occurredAt: row.created_at,
    contactId: row.contact_id,
  };
}

export function appointmentToComm(row: AppointmentRow): UnifiedCommItem {
  return {
    id: `appointment:${row.id}`,
    source: "appointment",
    kind: "appointment",
    title: row.title,
    description: row.location,
    occurredAt: row.date,
  };
}

function normalizeKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

/** Drop legacy interaction rows that duplicate a nearby activity_log entry. */
export function dedupeCommunications(items: UnifiedCommItem[]): UnifiedCommItem[] {
  const activityKeys = new Set<string>();
  for (const item of items) {
    if (item.source !== "activity_log") continue;
    const bucket = Math.floor(new Date(item.occurredAt).getTime() / 120_000);
    activityKeys.add(`${item.kind}:${normalizeKey(item.title)}:${bucket}`);
  }

  return items.filter((item) => {
    if (item.source !== "interaction") return true;
    const bucket = Math.floor(new Date(item.occurredAt).getTime() / 120_000);
    const key = `${item.kind}:${normalizeKey(item.title)}:${bucket}`;
    return !activityKeys.has(key);
  });
}

export function mergeCommunicationsTimeline(
  activities: ActivityLogRow[],
  interactions: Interaction[],
  smsRows: SmsOutboundRow[],
  appointments: AppointmentRow[] = [],
): UnifiedCommItem[] {
  const merged = [
    ...activities.map(activityLogToComm),
    ...interactions.map(interactionToComm),
    ...smsRows.map(smsOutboundToComm),
    ...appointments.map(appointmentToComm),
  ];

  const deduped = dedupeCommunications(merged);
  deduped.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return deduped;
}
