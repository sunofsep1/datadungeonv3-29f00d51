import { describe, expect, it } from "vitest";
import { applyDrakoVideoKey } from "./drakoVideoKey";

describe("applyDrakoVideoKey", () => {
  it("keys off-white matte pixels", () => {
    const data = new Uint8ClampedArray([233, 243, 249, 255, 40, 80, 120, 255]);
    applyDrakoVideoKey(data, { key: [233, 243, 249], similarity: 52, blend: 0 });
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
  });

  it("keys green screen pixels", () => {
    const data = new Uint8ClampedArray([28, 127, 69, 255, 90, 40, 30, 255]);
    applyDrakoVideoKey(data, { key: [28, 127, 69], similarity: 85, blend: 0, green: true });
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
  });
});
