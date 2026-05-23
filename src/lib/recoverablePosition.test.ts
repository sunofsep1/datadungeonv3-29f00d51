import { describe, expect, it } from "vitest";
import { computeRecoverablePosition } from "./recoverablePosition";

const today = new Date("2026-05-21T00:00:00.000Z");

describe("computeRecoverablePosition", () => {
  it("handles fixture pair without double counting", () => {
    const incomingId = "inc-1";
    const outgoingId = "out-1";

    const unlinked = computeRecoverablePosition(
      [
        {
          id: incomingId,
          direction: "incoming",
          status: "paid",
          due_date: "2026-06-04",
          total: 1280,
          reimbursable: true,
          reimbursement_invoice_id: null,
        },
        {
          id: outgoingId,
          direction: "outgoing",
          status: "sent",
          due_date: "2026-05-31",
          total: 500,
          reimbursable: true,
          reimbursement_invoice_id: null,
        },
      ],
      today,
    );

    expect(unlinked.owedToMe).toBe(1780);
    expect(unlinked.unbilledCosts).toBe(1280);
    expect(unlinked.outOfPocket).toBe(1280);

    const linked = computeRecoverablePosition(
      [
        {
          id: incomingId,
          direction: "incoming",
          status: "paid",
          due_date: "2026-06-04",
          total: 1280,
          reimbursable: true,
          reimbursement_invoice_id: outgoingId,
        },
        {
          id: outgoingId,
          direction: "outgoing",
          status: "sent",
          due_date: "2026-05-31",
          total: 500,
          reimbursable: true,
          reimbursement_invoice_id: null,
        },
      ],
      today,
    );

    expect(linked.owedToMe).toBe(500);
    expect(linked.unbilledCosts).toBe(0);
  });

  it("does not count unpaid supplier bills in owedToMe", () => {
    const position = computeRecoverablePosition(
      [
        {
          id: "paynter",
          direction: "incoming",
          status: "unpaid",
          due_date: "2026-06-04",
          total: 1280,
          reimbursable: true,
          reimbursement_invoice_id: null,
        },
        {
          id: "sothebys",
          direction: "outgoing",
          status: "sent",
          due_date: "2026-05-31",
          total: 1280,
          reimbursable: true,
          reimbursement_invoice_id: null,
        },
      ],
      today,
    );

    expect(position.owedToMe).toBe(1280);
    expect(position.unbilledCosts).toBe(0);
  });
});
