export type InvoiceGstMode = "none" | "inclusive" | "exclusive";

export type InvoiceLineItemInput = {
  quantity: number;
  unit_price: number;
  gst_rate?: number;
};

export type InvoiceTotals = {
  subtotal: number;
  gstAmount: number | null;
  total: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function lineItemAmount(item: InvoiceLineItemInput): number {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  return roundMoney(qty * price);
}

export function computeTotals(
  lineItems: InvoiceLineItemInput[],
  gstMode: InvoiceGstMode,
): InvoiceTotals {
  const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + lineItemAmount(item), 0));

  if (gstMode === "none") {
    return { subtotal, gstAmount: null, total: subtotal };
  }

  if (gstMode === "inclusive") {
    const total = subtotal;
    const gstAmount = roundMoney(total / 11);
    return { subtotal: roundMoney(total - gstAmount), gstAmount, total };
  }

  const rate = (lineItems[0]?.gst_rate ?? 10) / 100;
  const gstAmount = roundMoney(subtotal * rate);
  return { subtotal, gstAmount, total: roundMoney(subtotal + gstAmount) };
}
