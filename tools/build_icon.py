#!/usr/bin/env python3
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "web" / "icons"

BG = "#f3ebdd"
INK = "#695f4f"
BLUE = "#3f769f"
GOLD = "#9b792d"

PETAL_ANGLES = (0, 72, 144, 216, 288)
ACCENT_WIDTH = 9


def icon_svg() -> str:
    petal_lines = "\n".join(
        f'    <ellipse cx="0" cy="-106" rx="47" ry="100" transform="rotate({angle})"/>'
        for angle in PETAL_ANGLES
    )
    accent_lines = "\n".join(
        f'    <path d="{ellipse_arc_path(start, end)}" transform="rotate({angle})" stroke="{color}" stroke-width="{ACCENT_WIDTH}"/>'
        for angle, start, end, color in accent_specs()
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Vybrané slová">
  <rect width="512" height="512" rx="104" fill="{BG}"/>
  <g transform="translate(256 258)" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
{petal_lines}
{accent_lines}
    <circle cx="0" cy="0" r="23" fill="{BG}"/>
  </g>
</svg>
'''


def rounded_rect(draw: ImageDraw.ImageDraw, size: int) -> None:
    draw.rounded_rectangle((0, 0, size, size), radius=int(size * 0.203), fill=BG)


def composite_rotated_petal(
    base: Image.Image,
    scale: int,
    angle: float,
    width: int,
) -> None:
    cx = cy = 256 * scale
    center_y = 258 * scale
    petal_w = 102 * scale
    petal_h = 210 * scale
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    box = (
        cx - petal_w / 2,
        center_y - 106 * scale - petal_h / 2,
        cx + petal_w / 2,
        center_y - 106 * scale + petal_h / 2,
    )
    draw.ellipse(box, fill=None, outline=INK, width=width)
    rotated = layer.rotate(-angle, center=(cx, center_y), resample=Image.Resampling.BICUBIC)
    base.alpha_composite(rotated)


def ellipse_point(theta_degrees: float) -> tuple[float, float]:
    theta = math.radians(theta_degrees)
    return 47 * math.cos(theta), -106 + 100 * math.sin(theta)


def ellipse_arc_path(start: float, end: float) -> str:
    start_x, start_y = ellipse_point(start)
    end_x, end_y = ellipse_point(end)
    sweep = (end - start) % 360
    large_arc = 1 if sweep > 180 else 0
    return f'M {start_x:.2f} {start_y:.2f} A 47 100 0 {large_arc} 1 {end_x:.2f} {end_y:.2f}'


def accent_specs() -> tuple[tuple[int, float, float, str], ...]:
    return (
        # The "i" is two separated highlights on the left edge of the top petal.
        (0, 160, 198, BLUE),
        (0, 222, 236, BLUE),
        # The "y" is where the top and right petals already meet and branch.
        (0, 306, 30, GOLD),
        (72, 100, 150, GOLD),
        (72, 150, 178, GOLD),
    )


def composite_rotated_arc(
    base: Image.Image,
    scale: int,
    angle: float,
    start: float,
    end: float,
    color: str,
    width: int,
) -> None:
    cx = 256 * scale
    cy = 258 * scale
    petal_w = 102 * scale
    petal_h = 210 * scale
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    box = (
        cx - petal_w / 2,
        cy - 106 * scale - petal_h / 2,
        cx + petal_w / 2,
        cy - 106 * scale + petal_h / 2,
    )
    draw.arc(box, start=start, end=end, fill=color, width=width)

    cap_radius = width / 2
    for theta in (start, end):
        x, y = ellipse_point(theta)
        x = cx + x * scale
        y = cy + y * scale
        draw.ellipse((x - cap_radius, y - cap_radius, x + cap_radius, y + cap_radius), fill=color)

    rotated = layer.rotate(-angle, center=(cx, cy), resample=Image.Resampling.BICUBIC)
    base.alpha_composite(rotated)


def make_png(size: int) -> Image.Image:
    scale = max(4, math.ceil(1024 / size))
    canvas_size = 512 * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    rounded_rect(draw, canvas_size)

    for angle in PETAL_ANGLES:
        composite_rotated_petal(image, scale, angle, width=8 * scale)

    for angle, start, end, color in accent_specs():
        composite_rotated_arc(image, scale, angle, start, end, color, ACCENT_WIDTH * scale)

    draw = ImageDraw.Draw(image)
    draw.ellipse(
        (233 * scale, 235 * scale, 279 * scale, 281 * scale),
        fill=BG,
        outline=INK,
        width=8 * scale,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    (ICON_DIR / "icon.svg").write_text(icon_svg(), encoding="utf-8")
    for size, filename in [(192, "icon-192.png"), (512, "icon-512.png")]:
        make_png(size).save(ICON_DIR / filename)


if __name__ == "__main__":
    main()
