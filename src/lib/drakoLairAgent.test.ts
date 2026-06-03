import { describe, expect, it } from "vitest";
import {
  clampLairPosition,
  randomWaypoint,
  pickNextBehavior,
  type LairBounds,
} from "@/lib/drakoLairAgent";

const bounds: LairBounds = {
  width: 800,
  height: 600,
  paddingTop: 96,
  paddingBottom: 48,
  paddingLeft: 160,
  paddingRight: 160,
  spriteW: 280,
  spriteH: 210,
};

describe("drakoLairAgent", () => {
  it("clamps position inside safe bounds", () => {
    const clamped = clampLairPosition(-50, 9999, bounds);
    expect(clamped.x).toBeGreaterThanOrEqual(bounds.paddingLeft);
    expect(clamped.y).toBeGreaterThanOrEqual(bounds.paddingTop);
    expect(clamped.x).toBeLessThanOrEqual(bounds.width - bounds.paddingRight - bounds.spriteW);
    expect(clamped.y).toBeLessThanOrEqual(bounds.height - bounds.paddingBottom - bounds.spriteH);
  });

  it("randomWaypoint stays inside bounds", () => {
    for (let i = 0; i < 20; i++) {
      const pt = randomWaypoint(bounds);
      const clamped = clampLairPosition(pt.x, pt.y, bounds);
      expect(clamped.x).toBe(pt.x);
      expect(clamped.y).toBe(pt.y);
    }
  });

  it("pickNextBehavior avoids repeating wander", () => {
    const next = pickNextBehavior("wander");
    expect(next).not.toBe("wander");
  });
});
