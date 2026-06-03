import { describe, expect, it } from "vitest";
import { parseInvoiceFromText } from "./parseInvoiceText";

const PAYNTER_SAMPLE = `
Paynter & Williams Pty Ltd ABN 95 664 041 241 Tax Invoice
Invoice No INV-1187 Issue Date 5 May 2026 Due 4 Jun 2026
Bill To Greg Leigh
20 Hickory Drive, Narangba — Sotheby's QLD: Imagery, Floor Plan & Property Video
Qty 1 $1,280.00 GST inclusive GST component $116.36 Total $1,280.00 AUD
`;

const GREG_OUT_SAMPLE = `
Greg Leigh Real Estate Sales Executive Queensland Sotheby's International Realty Thornlands QLD
Invoice INV-006 Issue Date 1 May 2026
To Accounts Department Queensland Sotheby's International Realty
Property 20 Hickory Drive, Narangba
Social Media — Marketing Spend / Instagram / Meta advertising campaigns for property listing
Total Due $500.00
Reimbursement of Social Media (Meta/Instagram) advertising expenses paid from personal funds.
No ABN quoted: this reimbursement is not a supply of goods or services.
`;

describe("parseInvoiceFromText", () => {
  it("parses Paynter incoming bill fixture", () => {
    const d = parseInvoiceFromText(PAYNTER_SAMPLE);
    expect(d.direction).toBe("incoming");
    expect(d.invoice_number).toBe("INV-1187");
    expect(d.counterparty_abn).toContain("95 664 041 241");
    expect(d.counterparty_name).toMatch(/Paynter/i);
    expect(d.property_address).toMatch(/20 Hickory Drive/i);
    expect(d.issue_date).toBe("2026-05-05");
    expect(d.gst_mode).toBe("inclusive");
    expect(d.line_items?.[0]?.unit_price).toBe(1280);
  });

  it("parses Greg outgoing reimbursement fixture", () => {
    const d = parseInvoiceFromText(GREG_OUT_SAMPLE);
    expect(d.direction).toBe("outgoing");
    expect(d.invoice_number).toBe("INV-006");
    expect(d.gst_mode).toBe("none");
    expect(d.line_items?.[0]?.unit_price).toBe(500);
    expect(d.notes).toMatch(/Reimbursement/i);
  });
});
