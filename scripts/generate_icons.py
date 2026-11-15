#!/usr/bin/env python3
"""Generate TikaTrack's PNG icons and social cover without any image library.

Writes a valid PNG by hand (zlib + struct) so the repo has no binary-tooling
dependency. Run with:  python3 scripts/generate_icons.py
"""

from __future__ import annotations

import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")

# --------------------------------------------------------------------------- #
# Tiny PNG writer
# --------------------------------------------------------------------------- #


def _chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))


def write_png(path: str, size: int, rgba: bytearray) -> None:
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filter type: None
        raw += rgba[y * stride : (y + 1) * stride]
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += _chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(png)


def write_png_rect(path: str, width: int, height: int, rgba: bytearray) -> None:
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw += rgba[y * stride : (y + 1) * stride]
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += _chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(png)


# --------------------------------------------------------------------------- #
# Drawing helpers (deliberately simple: 4x supersampling + alpha compositing)
# --------------------------------------------------------------------------- #


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def blend(dst: list[float], src: tuple[float, float, float], alpha: float) -> None:
    if alpha <= 0:
        return
    a = min(1.0, alpha)
    dst[0] = lerp(dst[0], src[0], a)
    dst[1] = lerp(dst[1], src[1], a)
    dst[2] = lerp(dst[2], src[2], a)
    dst[3] = min(1.0, dst[3] + a * (1 - dst[3]))


def dist_point_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rounded_rect_sdf(x: float, y: float, w: float, h: float, r: float) -> float:
    """Negative = inside."""
    dx = abs(x - w / 2) - (w / 2 - r)
    dy = abs(y - h / 2) - (h / 2 - r)
    ax, ay = max(dx, 0.0), max(dy, 0.0)
    outside = math.hypot(ax, ay)
    inside = min(max(dx, dy), 0.0)
    return outside + inside - r


# Brand palette (emerald 600 -> teal 600 -> cyan 600)
GRADIENT = ((5, 150, 105), (13, 148, 136), (8, 145, 178))
WHITE = (255, 255, 255)

# Check mark, in a 0..100 box
CHECK = ((26.0, 52.0), (43.0, 69.0), (76.0, 33.0))


def gradient_at(t: float) -> tuple[float, float, float]:
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        a, b, u = GRADIENT[0], GRADIENT[1], t / 0.5
    else:
        a, b, u = GRADIENT[1], GRADIENT[2], (t - 0.5) / 0.5
    return (lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u))


def draw_icon(size: int, maskable: bool = False) -> bytearray:
    ss = 4  # supersampling factor
    buf = bytearray(size * size * 4)
    radius = size * (1.0 if maskable else 0.225)

    for y in range(size):
        for x in range(size):
            px = [0.0, 0.0, 0.0, 0.0]
            hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    fx = (x + (sx + 0.5) / ss) / size * 100.0
                    fy = (y + (sy + 0.5) / ss) / size * 100.0

                    # 1. background tile
                    d = rounded_rect_sdf(fx, fy, 100.0, 100.0, radius / size * 100.0)
                    if d > 0.5:
                        continue
                    hits += 1
                    bg = gradient_at((fx + fy) / 200.0)
                    blend(px, (bg[0], bg[1], bg[2]), 1.0)

                    # 2. check mark stroke
                    stroke = 8.6  # stroke width in 0..100 coordinate units
                    d1 = dist_point_segment(fx, fy, *CHECK[0], *CHECK[1])
                    d2 = dist_point_segment(fx, fy, *CHECK[1], *CHECK[2])
                    dcheck = min(d1, d2) - stroke / 2
                    if dcheck < 0.5:
                        blend(px, WHITE, 1.0 - max(0.0, dcheck + 0.5))

            if hits:
                i = (y * size + x) * 4
                buf[i] = int(px[0])
                buf[i + 1] = int(px[1])
                buf[i + 2] = int(px[2])
                buf[i + 3] = int(px[3] * 255)
    return buf


def draw_cover(width: int = 1200, height: int = 630) -> bytearray:
    buf = bytearray(width * height * 4)
    for y in range(height):
        for x in range(width):
            t = (x / width * 0.65) + (y / height * 0.35)
            c = gradient_at(t)
            i = (y * width + x) * 4
            buf[i] = int(c[0])
            buf[i + 1] = int(c[1])
            buf[i + 2] = int(c[2])
            buf[i + 3] = 255

    # centred white check mark
    cx, cy = width / 2, height / 2 - 10
    scale = 3.0
    pts = [((p[0] - 50) * scale + cx, (p[1] - 50) * scale + cy) for p in CHECK]
    stroke = 8.6 * scale / 2
    for y in range(height):
        for x in range(width):
            d = min(
                dist_point_segment(x + 0.5, y + 0.5, *pts[0], *pts[1]),
                dist_point_segment(x + 0.5, y + 0.5, *pts[1], *pts[2]),
            ) - stroke
            if d < 0:
                i = (y * width + x) * 4
                buf[i] = buf[i + 1] = buf[i + 2] = 255
    return buf


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (192, 512):
        write_png(os.path.join(OUT_DIR, f"icon-{size}.png"), size, draw_icon(size))
        print(f"wrote icon-{size}.png")
    write_png(os.path.join(OUT_DIR, "maskable-512.png"), 512, draw_icon(512, maskable=True))
    print("wrote maskable-512.png")
    write_png_rect(os.path.join(OUT_DIR, "og-cover.png"), 1200, 630, draw_cover())
    print("wrote og-cover.png")


if __name__ == "__main__":
    main()
