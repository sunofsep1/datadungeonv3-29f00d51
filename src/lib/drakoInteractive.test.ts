import { describe, expect, it } from "vitest";
import { nextCycleMood, nextLairCycleMood } from "./drakoInteractive";

describe("nextCycleMood", () => {
  it("cycles through all OpenArt clips (no working PC)", () => {
    expect(nextCycleMood("play")).toBe("eat");
    expect(nextCycleMood("sad")).toBe("celebrate");
    expect(nextCycleMood("coffee-break")).toBe("play");
  });

  it("maps route aliases into the cycle", () => {
    expect(nextCycleMood("idle")).toBe("sad");
    expect(nextCycleMood("working")).toBe("coffee-break");
    expect(nextCycleMood("wave")).toBe("fire-breath");
  });
});

describe("nextLairCycleMood", () => {
  it("matches nextCycleMood", () => {
    expect(nextLairCycleMood("bounce")).toBe(nextCycleMood("bounce"));
  });
});
