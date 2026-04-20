import { describe, expect, it } from "vitest";
import { canTransitionAIOpsStatus } from "./aiOpsState";

describe("canTransitionAIOpsStatus", () => {
  it("allows expected transitions", () => {
    expect(canTransitionAIOpsStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionAIOpsStatus("confirmed", "executing")).toBe(true);
    expect(canTransitionAIOpsStatus("executing", "succeeded")).toBe(true);
    expect(canTransitionAIOpsStatus("failed", "confirmed")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionAIOpsStatus("pending", "succeeded")).toBe(false);
    expect(canTransitionAIOpsStatus("cancelled", "pending")).toBe(false);
    expect(canTransitionAIOpsStatus("succeeded", "failed")).toBe(false);
  });
});
