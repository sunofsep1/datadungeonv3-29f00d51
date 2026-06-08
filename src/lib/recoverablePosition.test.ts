import { describe, expect, it } from "vitest";
import {
  computeRecoverablePosition,
  markPaidActionLabel,
  reimbursementStateLabel,
} from "./recoverablePosition";

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

  it("clears out of pocket when supplier bill and linked reimbursement are both paid", () => {
    const position = computeRecoverablePosition([
      {
        id: "meta",
        direction: "incoming",
        status: "paid",
        due_date: "2026-06-01",
        total: 500,
        reimbursable: true,
        reimbursement_invoice_id: "reimb",
      },
      {
        id: "reimb",
        direction: "outgoing",
        status: "paid",
        due_date: "2026-06-30",
        total: 500,
        reimbursable: true,
        reimbursement_invoice_id: null,
      },
    ]);

    expect(position.outOfPocket).toBe(0);
    expect(position.unbilledCosts).toBe(0);
  });

  it("keeps out of pocket until agency pays the linked reimbursement", () => {
    const position = computeRecoverablePosition([
      {
        id: "meta",
        direction: "incoming",
        status: "paid",
        due_date: "2026-06-01",
        total: 500,
        reimbursable: true,
        reimbursement_invoice_id: "reimb",
      },
      {
        id: "reimb",
        direction: "outgoing",
        status: "sent",
        due_date: "2026-06-30",
        total: 500,
        reimbursable: true,
        reimbursement_invoice_id: null,
      },
    ]);

    expect(position.outOfPocket).toBe(500);
    expect(position.owedToMe).toBe(500);
  });
});

describe("reimbursementStateLabel", () => {
  const paidBill = {
    id: "inc",
    direction: "incoming" as const,
    status: "paid" as const,
    due_date: "2026-06-01",
    total: 500,
    reimbursable: true,
    reimbursement_invoice_id: "out",
  };

  it("does not show reimbursed until the outgoing invoice is paid", () => {
    expect(
      reimbursementStateLabel(paidBill, { status: "sent", invoice_number: "INV-006" }),
    ).toBe("Awaiting payment · INV-006");
    expect(
      reimbursementStateLabel(paidBill, { status: "paid", invoice_number: "INV-006" }),
    ).toBe("Reimbursed");
  });
});

describe("markPaidActionLabel", () => {
  it("uses agency-specific copy for outgoing invoices", () => {
    expect(markPaidActionLabel("outgoing")).toContain("agency");
    expect(markPaidActionLabel("incoming")).toContain("paid this bill");
  });
});
