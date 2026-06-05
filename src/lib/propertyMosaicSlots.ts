export type PropertyMosaicTile =
  | { kind: "image"; imageIndex: number }
  | { kind: "more"; imageIndex: number; extraCount: number };

/** Up to 5 REA-style mosaic tiles; 5th becomes "+N more" when imageCount > 5. */
export function getPropertyMosaicTiles(imageCount: number): PropertyMosaicTile[] {
  if (imageCount <= 0) return [];
  if (imageCount === 1) return [{ kind: "image", imageIndex: 0 }];

  const showCount = Math.min(imageCount, 5);
  const tiles: PropertyMosaicTile[] = [];

  for (let slot = 0; slot < showCount; slot++) {
    if (slot === 4 && imageCount > 5) {
      tiles.push({ kind: "more", imageIndex: 4, extraCount: imageCount - 5 });
    } else {
      tiles.push({ kind: "image", imageIndex: slot });
    }
  }

  return tiles;
}

export function getMosaicGridClassName(tileCount: number): string {
  if (tileCount === 1) return "grid grid-cols-1";
  if (tileCount === 2) {
    return "grid grid-cols-2 grid-rows-1 md:grid-rows-2 gap-1 min-h-[280px] sm:min-h-[320px]";
  }
  return "grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-1 min-h-[280px] sm:min-h-[320px] md:min-h-[360px]";
}

export function getMosaicTileClassName(slotIndex: number, tileCount: number): string {
  const base =
    "relative overflow-hidden bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (tileCount === 1) {
    return `${base} col-span-full min-h-[280px] sm:min-h-[320px] md:min-h-[360px]`;
  }
  if (tileCount === 2) {
    return `${base} col-span-1 row-span-2 min-h-[140px] md:min-h-[360px]`;
  }
  if (slotIndex === 0) {
    return `${base} col-span-2 row-span-2 min-h-[180px] md:min-h-[360px]`;
  }
  if (tileCount === 3) {
    return `${base} col-span-2 row-span-1 min-h-[90px] md:min-h-[178px]`;
  }
  if (tileCount === 4) {
    if (slotIndex === 1 || slotIndex === 2) {
      return `${base} col-span-1 row-span-1 min-h-[90px] md:min-h-[178px]`;
    }
    return `${base} col-span-2 row-span-1 min-h-[90px] md:min-h-[178px]`;
  }
  return `${base} col-span-1 row-span-1 min-h-[90px] md:min-h-[178px]`;
}
