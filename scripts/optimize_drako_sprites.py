#!/usr/bin/env python3
"""Rebuild public/drako sprites from transparent RGBA sources."""
from __future__ import annotations

import os
import sys
from collections import deque

from PIL import Image


def is_background(r: int, g: int, b: int, a: int) -> bool:
    if a < 8:
        return True
    # White / off-white matte from cutout exports
    if r > 210 and g > 210 and b > 210:
        spread = max(r, g, b) - min(r, g, b)
        if spread < 28:
            return True
    # Light grey fringe
    if r > 190 and g > 190 and b > 190 and a < 240:
        spread = max(r, g, b) - min(r, g, b)
        if spread < 20:
            return True
    return False


def flood_remove_background(im: Image.Image) -> Image.Image:
    """Remove background connected to image edges (typical white matte)."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def idx(x: int, y: int) -> int:
        return y * w + x

    def push(x: int, y: int) -> None:
        i = idx(x, y)
        if seen[i]:
            return
        if not is_background(*px[x, y]):
            return
        seen[i] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        if x > 0:
            push(x - 1, y)
        if x < w - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < h - 1:
            push(x, y + 1)

    return im


def clean_edge_halos(im: Image.Image, passes: int = 3) -> Image.Image:
    """Strip light matte pixels bordering transparency."""
    im = im.convert("RGBA")
    w, h = im.size

    for _ in range(passes):
        src = im.copy()
        spx = src.load()
        dpx = im.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = spx[x, y]
                if a == 0:
                    continue

                touches_clear = False
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and spx[nx, ny][3] == 0:
                        touches_clear = True
                        break

                if not touches_clear:
                    continue

                lum = (r + g + b) / 3
                spread = max(r, g, b) - min(r, g, b)

                if lum > 205 and spread < 30:
                    dpx[x, y] = (r, g, b, 0)
                elif lum > 175 and spread < 24:
                    dpx[x, y] = (r, g, b, max(0, int(a * 0.35)))
                elif lum > 150 and spread < 18 and a < 220:
                    dpx[x, y] = (r, g, b, max(0, int(a * 0.65)))

    return im


def trim(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def resize_nearest(im: Image.Image, width: int) -> Image.Image:
    height = max(1, round(im.height * width / im.width))
    return im.resize((width, height), Image.Resampling.NEAREST)


def process_source(im: Image.Image) -> Image.Image:
    im = flood_remove_background(im)
    im = clean_edge_halos(im, passes=4)
    return trim(im)


def process_output(im: Image.Image) -> Image.Image:
    """Second pass after downscale — kills halos introduced by resize."""
    return clean_edge_halos(im, passes=2)


def main() -> None:
    src_dir = sys.argv[1]
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    for name in sorted(os.listdir(src_dir)):
        if not name.endswith(".png") or "walk" in name:
            continue
        base = name[:-4]
        im = Image.open(os.path.join(src_dir, name))
        im = process_source(im)
        for suffix, width in [("", 128), ("@2x", 256)]:
            out = resize_nearest(im, width)
            out = process_output(out)
            out.save(os.path.join(out_dir, f"{base}{suffix}.png"), optimize=True)
            out.save(os.path.join(out_dir, f"{base}{suffix}.webp"), "WEBP", quality=92, method=6)
        print("ok", base)

    print("done", out_dir)


if __name__ == "__main__":
    main()
