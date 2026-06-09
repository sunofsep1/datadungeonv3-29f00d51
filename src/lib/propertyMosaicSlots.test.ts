import { describe, expect, it } from "vitest";
import { getPropertyMosaicTiles } from "./propertyMosaicSlots";

describe("getPropertyMosaicTiles", () => {
  it("returns empty for zero images", () => {
    expect(getPropertyMosaicTiles(0)).toEqual([]);
  });

  it("returns single tile for one image", () => {
    expect(getPropertyMosaicTiles(1)).toEqual([{ kind: "image", imageIndex: 0 }]);
  });

  it("returns five image tiles for exactly five images", () => {
    const tiles = getPropertyMosaicTiles(5);
    expect(tiles).toHaveLength(5);
    expect(tiles.every((t) => t.kind === "image")).toBe(true);
  });

  it("shows +N more on fifth tile when more than five images", () => {
    expect(getPropertyMosaicTiles(8)).toEqual([
      { kind: "image", imageIndex: 0 },
      { kind: "image", imageIndex: 1 },
      { kind: "image", imageIndex: 2 },
      { kind: "image", imageIndex: 3 },
      { kind: "more", imageIndex: 4, extraCount: 3 },
    ]);
  });
});
