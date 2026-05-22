import { describe, expect, it } from "vitest";
import { deriveStatus, daysUntilDue, isOverdue } from "./invoiceStatus";

describe("deriveStatus", () => {
  it("outgoing sent past due becomes overdue", () => {
    expect(
      deriveStatus(
        { direction: "outgoing", status: "sent", due_date: "2026-04-01" },
        new Date("2026-05-21T12:00:00.000Z"),
      ),
    ).toBe("overdue");
  });

  it("outgoing paid stays paid", () => {
    expect(
      deriveStatus(
        { direction: "outgoing", status: "paid", due_date: "2026-04-01" },
        new Date("2026-05-21T12:00:00.000Z"),
      ),
    ).toBe("paid");
  });

  it("incoming unpaid past due becomes overdue", () => {
    expect(
      deriveStatus(
        { direction: "incoming", status: "unpaid", due_date: "2026-05-01" },
        new Date("2026-05-21T12:00:00.000Z"),
      ),
    ).toBe("overdue");
  });
});

describe("daysUntilDue", () => {
  it("returns positive days before due", () => {
    expect(daysUntilDue("2026-06-01", new Date("2026-05-21T00:00:00.000Z"))).toBe(11);
  });
});

describe("isOverdue", () => {
  it("detects overdue outgoing", () => {
    expect(
      isOverdue(
        { direction: "outgoing", status: "sent", due_date: "2026-01-01" },
        new Date("2026-05-21T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
