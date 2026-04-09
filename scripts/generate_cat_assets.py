#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src" / "assets" / "cat-raster"
SOURCE_FILE = OUT_DIR / "cat-source.png"
CANVAS_SIZE = 512
BASE_SCALE = 1.36


STATE_SPECS = {
    "idle": {"dx": 0, "dy": 0, "scale": 1.0},
    "blink": {"dx": 0, "dy": 0, "scale": 1.0, "blink": 1.0},
    "groom": {"dx": -10, "dy": 6, "scale_x": 0.96, "scale_y": 1.04, "rotate": -6, "blink": 0.45},
    "walk-1": {"dx": -18, "dy": 5, "rotate": -4, "scale_x": 1.01, "scale_y": 0.99},
    "walk-2": {"dx": 0, "dy": 0, "rotate": 0, "scale": 1.0},
    "walk-3": {"dx": 18, "dy": 5, "rotate": 4, "scale_x": 1.01, "scale_y": 0.99},
    "run-1": {"dx": -28, "dy": 11, "rotate": -9, "scale_x": 1.06, "scale_y": 0.94},
    "run-2": {"dx": 26, "dy": 11, "rotate": 9, "scale_x": 1.06, "scale_y": 0.94},
    "climb-1": {"dx": -4, "dy": -2, "rotate": -88, "scale_x": 1.0, "scale_y": 1.02},
    "climb-2": {"dx": 6, "dy": 8, "rotate": -94, "scale_x": 1.04, "scale_y": 0.98},
    "hang": {"dx": 0, "dy": -16, "rotate": 180, "scale_x": 1.02, "scale_y": 1.0},
    "drag-left": {"dx": -8, "dy": -12, "rotate": 20, "scale_x": 0.98, "scale_y": 1.05},
    "drag-center": {"dx": 0, "dy": -16, "rotate": 0, "scale_x": 0.98, "scale_y": 1.08},
    "drag-right": {"dx": 8, "dy": -12, "rotate": -20, "scale_x": 0.98, "scale_y": 1.05},
    "fall": {"dx": 10, "dy": 0, "rotate": 28, "scale_x": 1.06, "scale_y": 0.95},
    "land": {"dx": 0, "dy": 18, "rotate": 0, "scale_x": 1.1, "scale_y": 0.82},
    "loaf": {"dx": 0, "dy": 24, "rotate": 0, "scale_x": 1.08, "scale_y": 0.82, "blink": 0.28},
    "poop": {"dx": 0, "dy": 28, "rotate": 0, "scale_x": 1.06, "scale_y": 0.8, "blink": 0.18, "strain": True},
    "paw": {"dx": 6, "dy": 0, "rotate": -5, "scale": 1.02, "sparkle": True},
    "sit": {"dx": 0, "dy": 6, "scale_x": 1.02, "scale_y": 0.98},
    "look": {"dx": 0, "dy": 6, "scale_x": 1.0, "scale_y": 1.0, "look_up": True},
    "dangle-1": {"dx": -6, "dy": -18, "rotate": 8, "scale_x": 0.98, "scale_y": 1.08},
    "dangle-2": {"dx": 6, "dy": -20, "rotate": -8, "scale_x": 0.98, "scale_y": 1.08},
    "crawl-1": {"dx": -14, "dy": 22, "rotate": -3, "scale_x": 1.06, "scale_y": 0.82},
    "crawl-2": {"dx": 12, "dy": 24, "rotate": 3, "scale_x": 1.1, "scale_y": 0.8},
}


ALIAS_MAP = {
    "lick": "groom",
    "rest": "loaf",
    "drag": "drag-center",
}


def rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    red, green, blue = ImageColor.getrgb(value)
    return (red, green, blue, alpha)


def remove_white_background(image: Image.Image) -> Image.Image:
    rgba_image = image.convert("RGBA")
    pixels: list[tuple[int, int, int, int]] = []

    for red, green, blue, alpha in rgba_image.getdata():
        average = (red + green + blue) // 3

        if red > 248 and green > 248 and blue > 248:
            pixels.append((red, green, blue, 0))
            continue

        if red > 232 and green > 232 and blue > 232:
            soften = max(0, min(255, int((248 - average) * 16)))
            pixels.append((red, green, blue, min(alpha, soften)))
            continue

        pixels.append((red, green, blue, alpha))

    rgba_image.putdata(pixels)
    return rgba_image


def load_sprite() -> Image.Image:
    if not SOURCE_FILE.exists():
        raise FileNotFoundError(f"missing cat source: {SOURCE_FILE}")

    source = remove_white_background(Image.open(SOURCE_FILE))
    bbox = source.getbbox()

    if not bbox:
        raise RuntimeError("cat source became empty after background cleanup")

    return source.crop(bbox)


def make_soft_shadow(size: tuple[int, int]) -> Image.Image:
    width, height = size
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((width * 0.16, height * 0.84, width * 0.84, height * 0.95), fill=(10, 10, 10, 78))
    return shadow.filter(ImageFilter.GaussianBlur(12))


def place_sprite(sprite: Image.Image, spec: dict[str, float | bool]) -> tuple[Image.Image, tuple[int, int, int, int]]:
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    shadow = make_soft_shadow((CANVAS_SIZE, CANVAS_SIZE))
    canvas.alpha_composite(shadow)

    scale = float(spec.get("scale", 1.0))
    scale_x = float(spec.get("scale_x", 1.0)) * scale
    scale_y = float(spec.get("scale_y", 1.0)) * scale
    rotate = float(spec.get("rotate", 0))
    dx = int(spec.get("dx", 0))
    dy = int(spec.get("dy", 0))

    target_width = max(1, int(sprite.width * BASE_SCALE * scale_x))
    target_height = max(1, int(sprite.height * BASE_SCALE * scale_y))
    transformed = sprite.resize((target_width, target_height), Image.Resampling.LANCZOS)
    rotated = transformed.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)

    anchor_x = (CANVAS_SIZE // 2) + dx
    anchor_y = int(CANVAS_SIZE * 0.84) + dy
    position = (
        int(anchor_x - (rotated.width / 2)),
        int(anchor_y - rotated.height),
    )
    canvas.alpha_composite(rotated, position)
    return canvas, (position[0], position[1], rotated.width, rotated.height)


def draw_eye_lids(canvas: Image.Image, box: tuple[int, int, int, int], amount: float, look_up: bool = False) -> None:
    x, y, width, height = box
    eye_y = y + int(height * (0.36 if not look_up else 0.31))
    left_eye_x = x + int(width * 0.36)
    right_eye_x = x + int(width * 0.62)
    eye_w = max(8, int(width * 0.13))
    eye_h = max(6, int(height * 0.13 * max(0.22, 1 - amount)))
    lid_height = max(8, int(height * 0.08 * max(0.55, amount + 0.2)))

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for center_x in (left_eye_x, right_eye_x):
        draw.rounded_rectangle(
            (
                center_x - eye_w,
                eye_y - lid_height,
                center_x + eye_w,
                eye_y + eye_h,
            ),
            radius=max(4, lid_height // 2),
            fill=rgba("#232323", 236),
        )
        if amount >= 0.95:
            draw.line(
                (
                    center_x - eye_w + 3,
                    eye_y + 1,
                    center_x + eye_w - 3,
                    eye_y + 1,
                ),
                fill=rgba("#6d6d6d", 190),
                width=max(2, lid_height // 3),
            )

    canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(1.2)))


def add_sparkles(canvas: Image.Image, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    base_x = x + int(width * 0.18)
    base_y = y + int(height * 0.46)

    for offset_x, offset_y, radius, alpha in (
        (0, 0, 9, 210),
        (18, 26, 5, 180),
        (38, -8, 6, 160),
    ):
        draw.ellipse(
            (
                base_x + offset_x - radius,
                base_y + offset_y - radius,
                base_x + offset_x + radius,
                base_y + offset_y + radius,
            ),
            fill=(255, 238, 184, alpha),
        )

    canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(4.2)))


def add_strain_marks(canvas: Image.Image, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    base_x = x + int(width * 0.78)
    base_y = y + int(height * 0.18)

    draw.line((base_x, base_y, base_x + 18, base_y - 20), fill=rgba("#f7c9d2", 220), width=4)
    draw.line((base_x + 8, base_y + 10, base_x + 30, base_y - 4), fill=rgba("#f7c9d2", 220), width=4)
    canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(0.8)))


def render_state(sprite: Image.Image, name: str, spec: dict[str, float | bool]) -> Image.Image:
    canvas, box = place_sprite(sprite, spec)

    blink_amount = float(spec.get("blink", 0.0))

    if blink_amount > 0:
        draw_eye_lids(canvas, box, blink_amount, look_up=bool(spec.get("look_up", False)))

    if spec.get("sparkle"):
        add_sparkles(canvas, box)

    if spec.get("strain"):
        add_strain_marks(canvas, box)

    if name == "hang":
        canvas = canvas.filter(ImageFilter.GaussianBlur(0.2))

    bbox = canvas.getbbox()

    if not bbox:
        return canvas

    left = max(0, bbox[0] - 22)
    top = max(0, bbox[1] - 18)
    right = min(canvas.width, bbox[2] + 22)
    bottom = min(canvas.height, bbox[3] + 28)
    cropped = canvas.crop((left, top, right, bottom))
    fitted = ImageOps.contain(cropped, (458, 458), Image.Resampling.LANCZOS)
    normalized = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    position = (
        int((CANVAS_SIZE - fitted.width) / 2),
        int(CANVAS_SIZE - fitted.height - 22),
    )
    normalized.alpha_composite(fitted, position)
    return normalized


def save_state(name: str, image: Image.Image) -> None:
    image.save(OUT_DIR / f"cat-{name}.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sprite = load_sprite()
    rendered: dict[str, Image.Image] = {}

    for name, spec in STATE_SPECS.items():
        image = render_state(sprite, name, spec)
        rendered[name] = image
        save_state(name, image)

    for alias_name, target_name in ALIAS_MAP.items():
        save_state(alias_name, rendered[target_name])

    print(f"generated {len(STATE_SPECS) + len(ALIAS_MAP)} cat raster assets from {SOURCE_FILE}")


if __name__ == "__main__":
    main()
