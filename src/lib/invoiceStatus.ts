export type InvoiceDirection = "incoming" | "outgoing";
export type InvoiceStoredStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "void"
  | "unpaid";

export type InvoiceEffectiveStatus = InvoiceStoredStatus;

export type InvoiceStatusInput = {
  direction: InvoiceDirection;
  status: InvoiceStoredStatus;
  due_date: string;
  paid_date?: string | null;
};

export function deriveStatus(
  invoice: InvoiceStatusInput,
  today: Date = new Date(),
): InvoiceEffectiveStatus {
  if (invoice.status === "void" || invoice.status === "paid") return invoice.status;

  const due = parseDateOnly(invoice.due_date);
  const todayDay = startOfDay(today);

  if (invoice.direction === "outgoing") {
    if (invoice.status === "sent" && due && due < todayDay) return "overdue";
    return invoice.status;
  }

  if (invoice.status === "unpaid" && due && due < todayDay) return "overdue";
  return invoice.status;
}

export function isOverdue(invoice: InvoiceStatusInput, today: Date = new Date()): boolean {
  return deriveStatus(invoice, today) === "overdue";
}

export function daysUntilDue(dueDate: string, today: Date = new Date()): number {
  const due = parseDateOnly(dueDate);
  if (!due) return 0;
  const ms = due.getTime() - startOfDay(today).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function statusBadgeVariant(
  status: InvoiceEffectiveStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid") return "default";
  if (status === "overdue") return "destructive";
  if (status === "sent" || status === "unpaid") return "secondary";
  if (status === "void") return "outline";
  return "outline";
}

export function statusLabel(status: InvoiceEffectiveStatus): string {
  const labels: Record<InvoiceEffectiveStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    void: "Void",
    unpaid: "Unpaid",
  };
  return labels[status] ?? status;
}

function parseDateOnly(iso: string): Date | null {
  if (!iso?.trim()) return null;
  const d = iso.includes("T") ? new Date(iso) : new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function computeDueDate(issueDate: string, termsDays: number): string {
  const base = parseDateOnly(issueDate);
  if (!base) return issueDate;
  const due = new Date(base);
  due.setUTCDate(due.getUTCDate() + Math.max(0, termsDays));
  return due.toISOString().slice(0, 10);
}
