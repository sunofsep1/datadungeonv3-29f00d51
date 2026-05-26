import { describe, expect, it } from "vitest";
import { nextCycleMood } from "./drakoInteractive";

describe("nextCycleMood", () => {
  it("cycles through the four video moods", () => {
    expect(nextCycleMood("sleeping")).toBe("celebrate");
    expect(nextCycleMood("celebrate")).toBe("fire-breath");
    expect(nextCycleMood("fire-breath")).toBe("coffee-break");
    expect(nextCycleMood("coffee-break")).toBe("sleeping");
  });

  it("starts from sleeping for unknown moods", () => {
    expect(nextCycleMood("idle")).toBe("celebrate");
    expect(nextCycleMood("working")).toBe("coffee-break");
  });
});
