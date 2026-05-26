import { describe, expect, it } from "vitest";
import { applyDrakoVideoKey } from "./drakoVideoKey";

const WHITE_KEY = { key: [252, 252, 252] as [number, number, number], similarity: 38, blend: 28 };
const GREEN_KEY = {
  key: [32, 128, 68] as [number, number, number],
  similarity: 72,
  blend: 28,
  green: true as const,
};
const GREEN_FIRE_KEY = { ...GREEN_KEY, softenFlameTips: true as const };

describe("applyDrakoVideoKey", () => {
  it("keys near-white matte pixels (luminance pass)", () => {
    const data = new Uint8ClampedArray([
      253, 253, 253, 255,
      251, 251, 251, 255,
      40, 80, 120, 255,
    ]);
    applyDrakoVideoKey(data, 3, 1, WHITE_KEY);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
    expect(data[11]).toBe(255);
  });

  it("keys H.264 banding blocks on white matte", () => {
    const data = new Uint8ClampedArray([252, 252, 254, 255, 254, 254, 254, 255]);
    applyDrakoVideoKey(data, 2, 1, WHITE_KEY);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
  });

  it("keys green screen pixels and despills fringe", () => {
    const data = new Uint8ClampedArray([
      32, 128, 68, 255,
      90, 40, 30, 255,
      55, 95, 50, 255,
    ]);
    applyDrakoVideoKey(data, 3, 1, GREEN_KEY);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
    expect(data[6]).toBeLessThan(95);
  });

  it("preserves orange fire pixels on green-screen clips", () => {
    const data = new Uint8ClampedArray([249, 225, 133, 255]);
    applyDrakoVideoKey(data, 1, 1, GREEN_KEY);
    expect(data[3]).toBe(255);
  });

  it("softens the right edge of a fire row", () => {
    const w = 12;
    const data = new Uint8ClampedArray(w * 4);
    for (let x = 0; x < w; x++) {
      const i = x * 4;
      data[i] = 250;
      data[i + 1] = 220;
      data[i + 2] = 120;
      data[i + 3] = 255;
    }
    applyDrakoVideoKey(data, w, 1, GREEN_FIRE_KEY);
    expect(data[(w - 1) * 4 + 3]).toBeLessThan(80);
    expect(data[0 * 4 + 3]).toBe(255);
  });
});
