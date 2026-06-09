import type { InvoiceDirection, InvoiceStoredStatus } from "@/lib/invoiceStatus";
import type { InvoiceGstMode } from "@/lib/invoiceTotals";

const STORAGE_KEY = "datadungeon_invoice_undo_v1";

export type InvoiceUndoLineItem = {
  description: string;
  quantity?: number;
  unit_price: number;
  gst_rate?: number;
  position?: number;
};

export type InvoiceUndoSnapshot = {
  id: string;
  savedAt: string;
  label: string;
  header: {
    direction: InvoiceDirection;
    invoice_number: string;
    status: InvoiceStoredStatus;
    counterparty_name: string;
    counterparty_abn: string | null;
    listing_id: string | null;
    property_address: string | null;
    issue_date: string;
    terms_days: number;
    due_date: string;
    gst_mode: InvoiceGstMode;
    reimbursable: boolean;
    notes: string | null;
    subtotal: number;
    gst_amount: number | null;
    total: number;
    paid_date: string | null;
    paid_amount: number | null;
  };
  lineItems: InvoiceUndoLineItem[];
};

export function saveInvoiceUndoSnapshot(snapshot: InvoiceUndoSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota errors */
  }
}

export function peekInvoiceUndoSnapshot(): InvoiceUndoSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InvoiceUndoSnapshot;
  } catch {
    return null;
  }
}

export function clearInvoiceUndoSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasUndoForInvoice(invoiceId: string): boolean {
  return peekInvoiceUndoSnapshot()?.id === invoiceId;
}
