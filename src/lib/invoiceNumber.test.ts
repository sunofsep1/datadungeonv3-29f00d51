import { describe, expect, it } from "vitest";
import { nextInvoiceNumber } from "./invoiceNumber";

describe("nextInvoiceNumber", () => {
  it("increments from existing outgoing numbers", () => {
    expect(nextInvoiceNumber(["INV-004", "INV-006", "INV-005"])).toBe("INV-007");
  });

  it("starts at 001 when empty", () => {
    expect(nextInvoiceNumber([])).toBe("INV-001");
  });
});
