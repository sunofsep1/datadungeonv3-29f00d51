import type { InvoiceDirection } from "@/hooks/useInvoices";

/** Counterparty looks like Queensland Sotheby's / agency accounts (not a supplier). */
export function isAgencyCounterparty(name: string | null | undefined): boolean {
  const lower = (name ?? "").trim().toLowerCase();
  if (!lower) return false;
  return (
    lower.includes("sotheby") ||
    lower.includes("accounts department") ||
    lower.includes("head office") ||
    lower.includes("contract dep") ||
    lower.includes("contract department")
  );
}

/** Reimbursement with linked supplier bills cannot become a standalone bill. */
export function canConvertReimbursementToBill(linkedBillCount: number): boolean {
  return linkedBillCount === 0;
}

/** Incoming bill from the agency — usually logged by mistake when payment was received. */
export function looksLikeMisclassifiedAgencyPayment(invoice: {
  direction: InvoiceDirection;
  counterparty_name?: string | null;
}): boolean {
  return invoice.direction === "incoming" && isAgencyCounterparty(invoice.counterparty_name);
}
