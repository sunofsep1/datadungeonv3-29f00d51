import { deriveStatus, type InvoiceDirection, type InvoiceStoredStatus } from "@/lib/invoiceStatus";

export type RecoverableInvoice = {
  id: string;
  direction: InvoiceDirection;
  status: InvoiceStoredStatus;
  due_date: string;
  total: number;
  paid_amount?: number | null;
  reimbursable?: boolean;
  reimbursement_invoice_id?: string | null;
};

export type RecoverablePosition = {
  owedToMe: number;
  overdue: number;
  unbilledCosts: number;
  outOfPocket: number;
};

function num(v: number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isUnpaid(invoice: RecoverableInvoice, today: Date): boolean {
  const effective = deriveStatus(
    { direction: invoice.direction, status: invoice.status, due_date: invoice.due_date },
    today,
  );
  return effective !== "paid" && invoice.status !== "void";
}

/** KPI recoverable position — no double counting linked bills. */
export function computeRecoverablePosition(
  invoices: RecoverableInvoice[],
  today: Date = new Date(),
): RecoverablePosition {
  let owedToMe = 0;
  let overdue = 0;
  let unbilledCosts = 0;
  let incomingPaid = 0;
  let outgoingPaid = 0;

  for (const inv of invoices) {
    if (inv.status === "void") continue;
    const total = num(inv.total);
    const paid = num(inv.paid_amount ?? (inv.status === "paid" ? inv.total : 0));

    if (inv.direction === "outgoing") {
      if (inv.status === "paid") {
        outgoingPaid += paid || total;
      } else if (isUnpaid(inv, today)) {
        const effective = deriveStatus(
          { direction: inv.direction, status: inv.status, due_date: inv.due_date },
          today,
        );
        if (effective === "sent" || effective === "overdue") {
          owedToMe += total;
        }
        if (effective === "overdue") {
          overdue += total;
        }
      }
      continue;
    }

    if (inv.direction === "incoming") {
      if (inv.status === "paid") {
        incomingPaid += paid || total;
      }

      if (inv.reimbursable !== false && !inv.reimbursement_invoice_id) {
        owedToMe += total;
        if (inv.status === "paid") {
          unbilledCosts += total;
        }
      }
    }
  }

  return {
    owedToMe: roundMoney(owedToMe),
    overdue: roundMoney(overdue),
    unbilledCosts: roundMoney(unbilledCosts),
    outOfPocket: roundMoney(incomingPaid - outgoingPaid),
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function reimbursementStateLabel(invoice: RecoverableInvoice): string {
  if (invoice.direction !== "incoming") return "—";
  if (!invoice.reimbursable) return "Not reimbursable";
  if (invoice.reimbursement_invoice_id) {
    return invoice.status === "paid" ? "Reimbursed" : "Invoiced";
  }
  if (invoice.status === "paid") return "Unbilled";
  return "Pending";
}
