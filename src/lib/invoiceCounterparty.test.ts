import { describe, expect, it } from "vitest";
import { isAgencyCounterparty, looksLikeMisclassifiedAgencyPayment } from "./invoiceCounterparty";

describe("invoiceCounterparty", () => {
  it("detects agency names", () => {
    expect(isAgencyCounterparty("Queensland Sotheby's International Realty")).toBe(true);
    expect(isAgencyCounterparty("Sothebys Head Office")).toBe(true);
    expect(isAgencyCounterparty("Contract Dep")).toBe(true);
    expect(isAgencyCounterparty("Paynter & Williams Pty Ltd")).toBe(false);
  });

  it("flags incoming agency rows as misclassified", () => {
    expect(
      looksLikeMisclassifiedAgencyPayment({
        direction: "incoming",
        counterparty_name: "Sothebys Head Office",
      }),
    ).toBe(true);
    expect(
      looksLikeMisclassifiedAgencyPayment({
        direction: "outgoing",
        counterparty_name: "Sothebys Head Office",
      }),
    ).toBe(false);
  });
});
