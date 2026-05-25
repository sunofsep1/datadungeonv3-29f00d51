/** Chroma-key settings for OpenArt export mattes (off-white or green). */
export interface DrakoVideoKey {
  key: [number, number, number];
  /** Max RGB distance from key color to treat as background. */
  similarity: number;
  /** Feather band beyond similarity (px alpha ramp). */
  blend: number;
  green?: boolean;
}

function keyAlphaFromDistance(dist: number, similarity: number, blend: number): number | null {
  if (dist <= similarity) return 0;
  if (blend > 0 && dist <= similarity + blend) {
    return Math.round(((dist - similarity) / blend) * 255);
  }
  return null;
}

export function applyDrakoVideoKey(
  data: Uint8ClampedArray,
  config: DrakoVideoKey,
): void {
  const [kr, kg, kb] = config.key;
  const { similarity, blend, green } = config;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (green) {
      const dominance = g - Math.max(r, b);
      if (dominance < 12 || g < 55) continue;

      const dr = r - kr;
      const dg = g - kg;
      const db = b - kb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      const dominanceBoost = Math.min(28, dominance * 0.45);
      const adjusted = Math.max(0, dist - dominanceBoost);
      const alpha = keyAlphaFromDistance(adjusted, similarity, blend);
      if (alpha === 0) {
        data[i + 3] = 0;
      } else if (alpha !== null) {
        data[i + 3] = Math.min(data[i + 3], alpha);
      } else if (dominance > 40 && g > 100) {
        data[i + 3] = Math.min(data[i + 3], Math.round(255 - dominance * 4));
      }
      continue;
    }

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    if (maxC < 165 || maxC - minC > 38) continue;

    const dr = r - kr;
    const dg = g - kg;
    const db = b - kb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    const alpha = keyAlphaFromDistance(dist, similarity, blend);
    if (alpha === 0) {
      data[i + 3] = 0;
    } else if (alpha !== null) {
      data[i + 3] = alpha;
    }
  }
}
