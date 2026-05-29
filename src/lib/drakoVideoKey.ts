/** Chroma-key settings for OpenArt export mattes (off-white or green). */
export interface DrakoVideoKey {
  key: [number, number, number];
  /** Max RGB distance from key color to treat as background. */
  similarity: number;
  /** Feather band beyond similarity (px alpha ramp). */
  blend: number;
  green?: boolean;
  /** Horizontal fade on fire-plume tips (fire-breath clip). */
  softenFlameTips?: boolean;
  /** Skip painting near loop seams (seconds). */
  loopMarginS?: number;
  /** Key bright green monitor/UI fills inside the frame (working PC clip). */
  removeBrightGreens?: boolean;
}

function keyAlphaFromDistance(dist: number, similarity: number, blend: number): number | null {
  if (dist <= similarity) return 0;
  if (blend > 0 && dist <= similarity + blend) {
    return Math.round(((dist - similarity) / blend) * 255);
  }
  return null;
}

/**
 * Near-white OpenArt exports (252–254) + H.264 banding — key by luminance/saturation,
 * not RGB distance alone (stops horizontal line artifacts on fire-breath etc.).
 */
function whiteMatteAlpha(r: number, g: number, b: number): number | null {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC - minC;

  if (maxC < 198 || sat > 44) return null;

  if (maxC >= 244 && sat <= 16) return 0;

  if (maxC >= 220 && sat <= 36) {
    const lumT = Math.max(0, Math.min(1, (244 - maxC) / 24));
    const satT = Math.max(0, Math.min(1, (sat - 6) / 30));
    const edge = Math.max(lumT, satT);
    if (edge >= 1) return null;
    return Math.round(edge * 255);
  }

  return null;
}

function despillGreen(r: number, g: number, b: number, alpha: number): { r: number; g: number; b: number } {
  if (alpha === 0) return { r, g, b };
  const rbMax = Math.max(r, b);
  if (g <= rbMax + 4) return { r, g, b };
  const spill = g - rbMax;
  const strength = alpha < 255 ? 0.92 : 0.78;
  const newG = Math.round(g - spill * strength);
  return { r, g: Math.max(rbMax, newG), b };
}

function isFirePixel(r: number, g: number, b: number): boolean {
  if (r < 80) return false;
  const rbMax = Math.max(r, b);
  if (r >= rbMax - 10 && r >= 100 && g >= 50 && b < r - 5) return true;
  if (r >= 180 && g >= 120 && b >= 60 && r >= g - 30) return true;
  return false;
}

function isWarmSubjectPixel(r: number, g: number, b: number): boolean {
  return isFirePixel(r, g, b) || (r > 60 && g > 40 && b > 30 && r + g + b > 120);
}

/** Remove semi-transparent green haze that reads as a flickering box. */
function defringeGreenHaze(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dominance = g - Math.max(r, b);

    if (dominance >= 10 && g >= 65 && a < 200) {
      data[i + 3] = 0;
      continue;
    }

    if (a < 36) {
      data[i + 3] = 0;
    } else if (a > 245 && !isWarmSubjectPixel(r, g, b)) {
      data[i + 3] = 255;
    }
  }
}

/** Taper flame plume tips — removes the hard vertical cut at the stream end. */
function softenFlameTips(data: Uint8ClampedArray, width: number, height: number, featherPx = 14): void {
  for (let y = 0; y < height; y++) {
    let rightEdge = -1;
    for (let x = width - 1; x >= 0; x--) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 140) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isFirePixel(r, g, b)) {
        rightEdge = x;
        break;
      }
    }
    if (rightEdge < 0) continue;

    for (let dx = 0; dx < featherPx; dx++) {
      const x = rightEdge - dx;
      if (x < 0) break;
      const i = (y * width + x) * 4;
      const fadeIn = Math.min(1, dx / (featherPx * 0.55));
      data[i + 3] = Math.round(data[i + 3] * fadeIn * fadeIn);
    }
  }
}

function applyGreenKey(
  data: Uint8ClampedArray,
  kr: number,
  kg: number,
  kb: number,
  similarity: number,
  blend: number,
): void {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (isFirePixel(r, g, b)) {
      const despilled = despillGreen(r, g, b, data[i + 3]);
      data[i] = despilled.r;
      data[i + 1] = despilled.g;
      data[i + 2] = despilled.b;
      continue;
    }

    const whiteAlpha = whiteMatteAlpha(r, g, b);
    if (whiteAlpha === 0) {
      data[i + 3] = 0;
      continue;
    }

    const rbMax = Math.max(r, b);
    const dominance = g - rbMax;

    let alpha: number | null = whiteAlpha;

    if (dominance >= 10 && g >= 55) {
      const dr = r - kr;
      const dg = g - kg;
      const db = b - kb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      const dominanceBoost = Math.min(40, dominance * 0.55);
      const adjusted = Math.max(0, dist - dominanceBoost);
      const greenAlpha = keyAlphaFromDistance(adjusted, similarity, blend);
      if (greenAlpha !== null) {
        alpha = alpha === null ? greenAlpha : Math.min(alpha, greenAlpha);
      }
    }

    if (alpha === null && dominance >= 22 && g >= 95 && g > r + 12) {
      const spillAlpha = Math.max(0, Math.min(255, Math.round(255 - (dominance - 18) * 7)));
      alpha = spillAlpha === 255 ? null : spillAlpha;
      if (dominance >= 38) alpha = 0;
    }

    if (alpha === 0) {
      data[i + 3] = 0;
      continue;
    }

    if (alpha !== null) {
      data[i + 3] = Math.min(data[i + 3], alpha);
    }

    const outAlpha = data[i + 3];
    if (outAlpha === 0) continue;

    const despilled = despillGreen(r, g, b, outAlpha);
    data[i] = despilled.r;
    data[i + 1] = despilled.g;
    data[i + 2] = despilled.b;
  }
}

function applyWhiteKey(
  data: Uint8ClampedArray,
  kr: number,
  kg: number,
  kb: number,
  similarity: number,
  blend: number,
): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let alpha = whiteMatteAlpha(r, g, b);

    if (alpha === null) {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      if (maxC >= 165 && maxC - minC <= 38) {
        const dr = r - kr;
        const dg = g - kg;
        const db = b - kb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        alpha = keyAlphaFromDistance(dist, similarity, blend);
      }
    }

    if (alpha === 0) {
      data[i + 3] = 0;
    } else if (alpha !== null) {
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }
}

function removeBrightDisplayGreens(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;
    if (isFirePixel(r, g, b)) continue;

    const rbMax = Math.max(r, b);
    const dominance = g - rbMax;

    // PC monitor / UI fill — visible when the working clip breathes fire.
    if (g >= 192 && r >= 95 && dominance >= 16 && g > r + 8) {
      data[i + 3] = 0;
      continue;
    }

    if (g >= 200 && dominance >= 32) {
      data[i + 3] = 0;
      continue;
    }

    if (g >= 185 && dominance >= 28 && r >= 105) {
      data[i + 3] = Math.min(a, Math.max(0, Math.round(a - dominance * 4)));
    }
  }
}

export function applyDrakoVideoKey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  config: DrakoVideoKey,
): void {
  const [kr, kg, kb] = config.key;
  const { similarity, blend, green, softenFlameTips: softenTips, removeBrightGreens } = config;

  if (green) {
    applyGreenKey(data, kr, kg, kb, similarity, blend);
    defringeGreenHaze(data);
    if (softenTips) {
      softenFlameTips(data, width, height);
    }
  } else {
    applyWhiteKey(data, kr, kg, kb, similarity, blend);
  }

  if (removeBrightGreens) {
    removeBrightDisplayGreens(data);
  }
}
