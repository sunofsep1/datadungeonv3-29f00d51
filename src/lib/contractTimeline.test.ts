import { describe, expect, it } from "vitest";
import {
  buildContractTimeline,
  contractMilestoneDetailLine,
  contractTimelinePhaseSummary,
  contractTimelineProgressLabel,
  formatContractWeekday,
} from "@/lib/contractTimeline";
import type { OfferCondition } from "@/lib/offerConditions";

const baseOffer = {
  exchange_date: "2026-05-18",
  expected_unconditional_date: "2026-06-02",
  expected_settlement_date: "2026-06-16",
  settlement_date: null,
  status: "conditional",
};

const baseConditions: Pick<OfferCondition, "id" | "label" | "due_date" | "status">[] = [
  { id: "c1", label: "Initial deposit", due_date: "2026-05-25", status: "complete" },
  { id: "c2", label: "Finance approval", due_date: "2026-06-05", status: "pending" },
];

describe("buildContractTimeline", () => {
  it("returns null without contract and settlement dates", () => {
    expect(buildContractTimeline({ exchange_date: null, settlement_date: null }, [])).toBeNull();
  });

  it("builds milestones from contract through settlement", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-05-25T12:00:00"));
    expect(model).not.toBeNull();
    expect(model!.milestones.map((m) => m.kind)).toEqual([
      "contract",
      "condition",
      "unconditional",
      "condition",
      "settlement",
    ]);
    expect(model!.startDateIso).toBe("2026-05-18");
    expect(model!.endDateIso).toBe("2026-06-16");
  });

  it("builds contract weeks from exchange to settlement", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-05-25T12:00:00"));
    expect(model!.weeks.length).toBeGreaterThanOrEqual(4);
    expect(model!.weeks[0].label).toBe("Week 1");
    expect(model!.weeks.some((w) => w.isCurrent)).toBe(true);
    const contract = model!.milestones.find((m) => m.kind === "contract");
    expect(contract!.weekOfContract).toBe(1);
  });

  it("places today between contract and settlement", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-05-25T12:00:00"));
    expect(model!.todayPosition).toBeGreaterThan(0);
    expect(model!.todayPosition).toBeLessThan(100);
    expect(model!.progressPercent).toBeGreaterThan(0);
    expect(model!.progressPercent).toBeLessThan(100);
  });

  it("marks complete when past settlement", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-06-20T12:00:00"));
    expect(model!.isComplete).toBe(true);
    expect(model!.progressPercent).toBe(100);
  });
});

describe("formatContractWeekday", () => {
  it("formats ISO date with weekday", () => {
    expect(formatContractWeekday("2026-05-18")).toBe("Mon, 18 May 2026");
  });
});

describe("contractTimelinePhaseSummary", () => {
  it("describes conditional period before unconditional", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-05-25T12:00:00"));
    expect(contractTimelinePhaseSummary(model!)).toMatch(/Conditional period/);
  });

  it("describes unconditional period after unconditional date", () => {
    const model = buildContractTimeline(
      { ...baseOffer, status: "unconditional" },
      baseConditions.map((c) => ({ ...c, status: "complete" as const })),
      new Date("2026-06-08T12:00:00"),
    );
    expect(contractTimelinePhaseSummary(model!)).toMatch(/Unconditional period/);
  });
});

describe("contractMilestoneDetailLine", () => {
  it("joins weekday, day of contract, and settlement countdown", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-05-25T12:00:00"));
    const contract = model!.milestones.find((m) => m.kind === "contract")!;
    expect(contractMilestoneDetailLine(contract)).toContain("Week 1");
    expect(contractMilestoneDetailLine(contract)).toContain("Mon, 18 May 2026");
    expect(contractMilestoneDetailLine(contract)).toContain("Day 1");
    expect(contractMilestoneDetailLine(contract)).toContain("settlement");
  });
});

describe("contractTimelineProgressLabel", () => {
  it("describes in-progress contract", () => {
    const model = buildContractTimeline(baseOffer, baseConditions, new Date("2026-05-25T12:00:00"));
    expect(model).not.toBeNull();
    expect(contractTimelineProgressLabel(model!)).toMatch(/Day \d+ of \d+/);
  });
});
