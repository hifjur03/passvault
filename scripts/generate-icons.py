#!/usr/bin/env python3
"""Generate the PassVault PWA icons (no external dependencies).

Draws a padlock on a violet-to-cyan gradient using signed distance fields,
then writes PNG files with the standard library only.
"""

import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')

GRADIENT_START = (0x8B, 0x5C, 0xFF)
GRADIENT_END = (0x22, 0xD3, 0xEE)
GLYPH_COLOR = (0xF5, 0xF7, 0xFF)
KEYHOLE_COLOR = (0x14, 0x18, 0x24)


def clamp(value: float, low: float, high: float) -> float:
    return low if value < low else (high if value > high else value)


def sd_round_rect(x, y, cx, cy, half_w, half_h, radius):
    qx = abs(x - cx) - (half_w - radius)
    qy = abs(y - cy) - (half_h - radius)
    outside = math.hypot(max(qx, 0.0), max(qy, 0.0))
    return outside + min(max(qx, qy), 0.0) - radius


def alpha_for(distance: float, edge: float = 1.0) -> float:
    return clamp(0.5 - distance / edge, 0.0, 1.0)


def render(size: int, glyph_scale: float = 1.0) -> bytearray:
    pixels = bytearray(size * size * 4)
    center = size / 2.0

    # Base geometry, expressed in pixels of a 512 canvas then scaled to `size`.
    unit = size / 512.0
    body_cy = 0.60 * size
    body_half_w = 0.20 * size
    body_half_h = 0.15 * size
    body_radius = 0.05 * size
    shackle_cy = body_cy - 0.17 * size
    shackle_outer = 0.155 * size
    shackle_inner = 0.105 * size
    keyhole_cy = body_cy - 0.03 * size
    keyhole_radius = 0.038 * size
    keyhole_slot_half_w = 0.022 * size
    keyhole_slot_bottom = body_cy + 0.09 * size

    for y in range(size):
        row = y * size * 4
        for x in range(size):
            # Diagonal brand gradient.
            t = (x + y) / (2.0 * max(size - 1, 1))
            red = int(GRADIENT_START[0] + (GRADIENT_END[0] - GRADIENT_START[0]) * t)
            green = int(GRADIENT_START[1] + (GRADIENT_END[1] - GRADIENT_START[1]) * t)
            blue = int(GRADIENT_START[2] + (GRADIENT_END[2] - GRADIENT_START[2]) * t)

            # Glyph coordinates, scaled about the image centre.
            gx = center + (x - center) / glyph_scale
            gy = center + (y - center) / glyph_scale

            # Shackle: a ring, its lower half hidden behind the body.
            ring_distance = math.hypot(gx - center, gy - shackle_cy)
            shackle = max(ring_distance - shackle_outer, shackle_inner - ring_distance)
            shackle_alpha = alpha_for(shackle)

            # Body.
            body = sd_round_rect(gx, gy, center, body_cy, body_half_w, body_half_h, body_radius)
            body_alpha = alpha_for(body)

            # Keyhole: a circle with a tapered slot below it.
            hole = math.hypot(gx - center, gy - keyhole_cy) - keyhole_radius
            slot = sd_round_rect(
                gx,
                gy,
                center,
                (keyhole_cy + keyhole_slot_bottom) / 2.0,
                keyhole_slot_half_w,
                (keyhole_slot_bottom - keyhole_cy) / 2.0,
                keyhole_slot_half_w * 0.9,
            )
            keyhole = min(hole, slot)
            keyhole_alpha = alpha_for(keyhole)

            # Composite: background -> shackle -> body -> keyhole.
            alpha = max(shackle_alpha, body_alpha)
            color = GLYPH_COLOR
            if keyhole_alpha > 0.0 and body_alpha > 0.0:
                blend = keyhole_alpha
                color = tuple(
                    int(color[i] + (KEYHOLE_COLOR[i] - color[i]) * blend) for i in range(3)
                )
                alpha = max(alpha, body_alpha * keyhole_alpha)

            final_red = int(red + (color[0] - red) * alpha)
            final_green = int(green + (color[1] - green) * alpha)
            final_blue = int(blue + (color[2] - blue) * alpha)

            offset = row + x * 4
            pixels[offset] = final_red
            pixels[offset + 1] = final_green
            pixels[offset + 2] = final_blue
            pixels[offset + 3] = 255

    return pixels


def write_png(path: str, size: int, pixels: bytearray) -> None:
    stride = size * 4
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        raw.extend(pixels[y * stride : (y + 1) * stride])

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    payload = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(payload)


def main() -> None:
    targets = [
        ("icon-192.png", 192, 1.0),
        ("icon-512.png", 512, 1.0),
        ("icon-maskable-512.png", 512, 0.72),
        ("apple-touch-icon.png", 180, 0.85),
    ]
    for name, size, scale in targets:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, render(size, scale))
        print(f"wrote {name} ({size}x{size})")


if __name__ == "__main__":
    main()
