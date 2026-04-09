#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BUILD_DIR = PROJECT_ROOT / "build"
ICON_PNG_PATH = BUILD_DIR / "icon.png"
ICON_ICO_PATH = BUILD_DIR / "icon.ico"
ICNS_PATH = BUILD_DIR / "icon.icns"
LINUX_ICONS_DIR = BUILD_DIR / "icons"
ICONSET_DIR = BUILD_DIR / "icon.iconset"
BASE_SIZE = 1024
ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024]
ICONSET_MAP = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
    ("icon_1024x1024.png", 1024),
]


def ensure_clean_dir(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True, exist_ok=True)


def lerp(a: float, b: float, t: float) -> float:
    return a + ((b - a) * t)


def blend_color(start: tuple[int, int, int], end: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(round(lerp(left, right, t))) for left, right in zip(start, end))


def draw_gradient_panel(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (40, 40, size - 40, size - 40),
        radius=220,
        fill=255,
    )

    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient)
    top = (255, 247, 236)
    bottom = (236, 192, 112)

    for y in range(size):
        t = y / (size - 1)
        color = blend_color(top, bottom, t)
        gradient_draw.line((0, y, size, y), fill=(*color, 255))

    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.ellipse(
        (-120, -160, int(size * 0.82), int(size * 0.6)),
        fill=(255, 255, 255, 92),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(28))

    image.alpha_composite(gradient)
    image.alpha_composite(highlight)
    image.putalpha(mask)
    return image


def draw_cat(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(
        (220, 690, 804, 876),
        fill=(63, 38, 12, 72),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    image.alpha_composite(shadow)

    body_color = (38, 28, 22, 255)
    fur_warm = (87, 58, 34, 255)
    ear_inner = (236, 171, 143, 255)
    eye_color = (244, 186, 71, 255)
    eye_glint = (255, 244, 220, 255)
    nose_color = (228, 145, 125, 255)
    whisker_color = (247, 231, 205, 220)

    draw.ellipse((230, 470, 794, 884), fill=body_color)
    draw.ellipse((238, 340, 786, 768), fill=body_color)
    draw.polygon([(286, 396), (372, 160), (486, 398)], fill=body_color)
    draw.polygon([(542, 398), (652, 162), (738, 398)], fill=body_color)
    draw.polygon([(336, 365), (376, 234), (448, 382)], fill=ear_inner)
    draw.polygon([(578, 382), (650, 236), (688, 364)], fill=ear_inner)
    draw.ellipse((302, 428, 716, 702), fill=fur_warm)
    draw.ellipse((356, 474, 668, 704), fill=(244, 223, 194, 255))

    draw.ellipse((376, 444, 500, 598), fill=eye_color)
    draw.ellipse((526, 444, 650, 598), fill=eye_color)
    draw.ellipse((410, 472, 470, 584), fill=(18, 14, 12, 255))
    draw.ellipse((560, 472, 620, 584), fill=(18, 14, 12, 255))
    draw.ellipse((424, 488, 446, 520), fill=eye_glint)
    draw.ellipse((574, 488, 596, 520), fill=eye_glint)

    draw.polygon([(490, 572), (462, 610), (518, 610)], fill=nose_color)
    draw.arc((438, 598, 490, 658), start=18, end=160, fill=(74, 46, 32, 255), width=8)
    draw.arc((490, 598, 542, 658), start=20, end=162, fill=(74, 46, 32, 255), width=8)

    for start_x, delta in [(304, -72), (318, -84), (332, -70)]:
        draw.line((start_x, 612 + (332 - start_x) * 0.4, start_x + delta, 596 + (332 - start_x) * 0.1), fill=whisker_color, width=8)

    for start_x, delta in [(692, 72), (678, 84), (664, 70)]:
        draw.line((start_x, 612 + (start_x - 664) * 0.4, start_x + delta, 596 + (start_x - 664) * 0.1), fill=whisker_color, width=8)

    draw.rounded_rectangle((340, 714, 684, 764), radius=25, fill=(239, 139, 101, 255))
    draw.ellipse((470, 704, 552, 786), fill=(255, 236, 208, 255))
    draw.ellipse((492, 726, 530, 764), fill=(216, 134, 101, 255))
    return image


def create_base_icon() -> Image.Image:
    panel = draw_gradient_panel(BASE_SIZE)
    cat = draw_cat(BASE_SIZE)
    panel.alpha_composite(cat)
    return panel


def save_resized_pngs(base_icon: Image.Image) -> None:
    ensure_clean_dir(LINUX_ICONS_DIR)

    for size in ICON_SIZES:
        resized = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(LINUX_ICONS_DIR / f"{size}x{size}.png")

    base_icon.save(ICON_PNG_PATH)


def save_ico(base_icon: Image.Image) -> None:
    icon_sizes = [(size, size) for size in ICON_SIZES[:-1]]
    base_icon.save(ICON_ICO_PATH, format="ICO", sizes=icon_sizes)


def save_icns() -> None:
    if sys.platform != "darwin":
        return

    ensure_clean_dir(ICONSET_DIR)
    ICNS_PATH.unlink(missing_ok=True)

    for filename, size in ICONSET_MAP:
        source = LINUX_ICONS_DIR / f"{size}x{size}.png"
        shutil.copy2(source, ICONSET_DIR / filename)

    result = subprocess.run(
        ["iconutil", "-c", "icns", str(ICONSET_DIR), "-o", str(ICNS_PATH)],
        check=False,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print("warning: iconutil could not generate icon.icns; electron-builder will use build/icon.png instead.")


def main() -> None:
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    base_icon = create_base_icon()
    save_resized_pngs(base_icon)
    save_ico(base_icon)
    save_icns()
    print(f"generated {ICON_PNG_PATH}")
    print(f"generated {ICON_ICO_PATH}")

    if sys.platform == "darwin" and ICNS_PATH.exists():
        print(f"generated {ICNS_PATH}")


if __name__ == "__main__":
    main()
