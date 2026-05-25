import { describe, expect, it } from "vitest";
import { normalizeOfiInterestLevel, ofiInterestLabel } from "@/lib/ofiInterestLevel";

describe("ofiInterestLevel", () => {
  it("normalizes unknown values to warm", () => {
    expect(normalizeOfiInterestLevel("")).toBe("warm");
    expect(normalizeOfiInterestLevel("HOT")).toBe("hot");
  });

  it("labels interest levels", () => {
    expect(ofiInterestLabel("not_interested")).toBe("Not interested");
  });
});
