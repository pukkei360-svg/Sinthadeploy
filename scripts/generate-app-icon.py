#!/usr/bin/env python3
"""
Generate the SINTHA app icon: Meitei Mayek letter ꯁ (Sa) on a blue gradient.

Outputs (into /home/z/my-project/public/):
  - icon-192.png  (192x192, PWA manifest)
  - icon-512.png  (512x512, PWA manifest)
  - apple-icon.png (180x180, Apple touch icon)
  - favicon-32.png (32x32, browser tab)
  - favicon.ico    (multi-size ICO, browser tab fallback)
  - icon.svg       (vector source, scalable)

The design:
  - Rounded-square background (full bleed, no padding)
  - Diagonal gradient from #0F4C81 (top-left) to #2563eb (bottom-right)
  - White ꯁ glyph centered, ~55% of the canvas height
  - Subtle drop shadow on the glyph for depth
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

OUT_DIR = "/home/z/my-project/public"
FONT_PATH = "/home/z/my-project/scripts/fonts/NotoSansMeeteiMayek-Regular.ttf"
GLYPH = "ꯁ"  # Meitei Mayek SA — Unicode U+ABF1

# Theme colors (from tailwind.config / sintha-gradient)
COLOR_TOP = (15, 76, 129)    # #0F4C81 — deep navy blue
COLOR_BOTTOM = (37, 99, 235) # #2563eb — bright blue

# Sizes to generate
SIZES = [
    (192, "icon-192.png"),
    (512, "icon-512.png"),
    (180, "apple-icon.png"),
    (32,  "favicon-32.png"),
    (16,  "favicon-16.png"),
]


def make_gradient_bg(size: int) -> Image.Image:
    """Draw a diagonal gradient from COLOR_TOP (top-left) to COLOR_BOTTOM (bottom-right)."""
    img = Image.new("RGB", (size, size), COLOR_TOP)
    px = img.load()
    # Diagonal interpolation: t=0 at top-left, t=1 at bottom-right
    diag = math.sqrt(2) * size
    for y in range(size):
        for x in range(size):
            # distance along the diagonal direction
            t = (x + y) / (2 * size)  # 0..1
            t = max(0.0, min(1.0, t))
            r = int(COLOR_TOP[0] + (COLOR_BOTTOM[0] - COLOR_TOP[0]) * t)
            g = int(COLOR_TOP[1] + (COLOR_BOTTOM[1] - COLOR_TOP[1]) * t)
            b = int(COLOR_TOP[2] + (COLOR_BOTTOM[2] - COLOR_TOP[2]) * t)
            px[x, y] = (r, g, b)
    return img


def draw_rounded_mask(size: int, radius: int) -> Image.Image:
    """Return an L-mode mask: white rounded-square on black background."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def find_font_size(font_path: str, target_h: int) -> tuple[ImageFont.FreeTypeFont, int]:
    """
    Find a font size whose rendered glyph height is approximately target_h.
    Meitei Mayek glyphs don't always fill the em box the way Latin glyphs do,
    so we measure the actual ink height and scale to match.
    """
    # Start with a guess — font size ~= target_h * 1.4 (em > cap height)
    size = int(target_h * 1.4)
    font = ImageFont.truetype(font_path, size)
    # Measure ink
    try:
        bbox = font.getbbox(GLYPH)
        ink_h = bbox[3] - bbox[1]
    except Exception:
        ink_h = size
    if ink_h <= 0:
        return font, size
    # Scale so ink height ~= target_h
    scale = target_h / ink_h
    new_size = max(8, int(size * scale))
    return ImageFont.truetype(font_path, new_size), new_size


def render_icon(size: int, rounded: bool = True) -> Image.Image:
    """Render the icon at the given size.

    rounded=True  → rounded-square with transparent corners (for PWA/web)
    rounded=False → full solid square, no transparency (for APK/Android launcher)
    """
    # 1. Gradient background (4x supersampled for smooth edges, then downscaled)
    SS = 4
    big = make_gradient_bg(size * SS)

    if rounded:
        # 2a. Rounded-square mask (so corners are rounded) — for web/PWA
        radius = int(size * 0.22) * SS  # ~22% corner radius
        mask = draw_rounded_mask(size * SS, radius)
        icon = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
        icon.paste(big, (0, 0), mask)
    else:
        # 2b. Full solid square — no transparency, no rounded corners.
        # The Android launcher applies its OWN mask (circle, squircle, etc.)
        # so we give it a full-bleed icon. This prevents the "black corners"
        # problem when the icon is displayed on a dark background.
        icon = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 255))
        icon.paste(big, (0, 0))

    # 4. Draw the ꯁ glyph in white, centered, with a soft drop shadow
    target_glyph_h = int(size * SS * 0.55)  # glyph fills ~55% of canvas
    font, _ = find_font_size(FONT_PATH, target_glyph_h)

    # Measure glyph to center it precisely
    try:
        bbox = font.getbbox(GLYPH)
        gw = bbox[2] - bbox[0]
        gh = bbox[3] - bbox[1]
        # bbox top-left isn't always (0,0) — offset to compensate
        ox, oy = bbox[0], bbox[1]
    except Exception:
        gw = gh = size * SS * 0.5
        ox = oy = 0

    cx = (size * SS) // 2
    cy = (size * SS) // 2
    # Position so the glyph's visual center sits at (cx, cy)
    draw_x = cx - gw // 2 - ox
    draw_y = cy - gh // 2 - oy

    # Drop shadow layer (offset + blurred, semi-transparent black)
    shadow = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    shadow_offset = max(2, int(size * SS * 0.015))
    sd.text((draw_x + shadow_offset, draw_y + shadow_offset), GLYPH,
            font=font, fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(2, int(size * SS * 0.01))))
    icon = Image.alpha_composite(icon, shadow)

    # White glyph on top
    d = ImageDraw.Draw(icon)
    d.text((draw_x, draw_y), GLYPH, font=font, fill=(255, 255, 255, 255))

    # 5. Downscale to final size with high-quality resampling
    icon = icon.resize((size, size), Image.LANCZOS)
    return icon


def write_svg(path: str):
    """Also write a vector SVG version — useful for future edits."""
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F4C81"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="2" dy="3" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="256" y="256"
        font-family="'Noto Sans Meetei Mayek', sans-serif"
        font-size="290"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
        filter="url(#shadow)">ꯁ</text>
</svg>
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


def write_favicon_ico(path: str):
    """Multi-size .ico (16, 32, 48) for legacy browser tab support."""
    sizes_in_ico = [16, 32, 48]
    imgs = []
    for s in sizes_in_ico:
        imgs.append(render_icon(s, rounded=True).convert("RGBA"))
    # PIL writes ICO when filename ends with .ico
    imgs[0].save(path, format="ICO", sizes=[(s, s) for s in sizes_in_ico],
                 append_images=imgs[1:])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # ── Rounded icons (for web/PWA — transparent corners) ──
    for size, name in SIZES:
        img = render_icon(size, rounded=True)
        out = os.path.join(OUT_DIR, name)
        img.save(out, "PNG")
        print(f"✓ {name} ({size}x{size}, rounded — web)")

    # Favicon .ico (multi-size, rounded)
    write_favicon_ico(os.path.join(OUT_DIR, "favicon.ico"))
    print("✓ favicon.ico (16, 32, 48, rounded)")

    # Vector source
    write_svg(os.path.join(OUT_DIR, "icon.svg"))
    print("✓ icon.svg (vector source)")

    # ── Solid square icons (for APK / Android launcher — NO transparency) ──
    # These prevent the "black corners" problem when the APK builder
    # displays the icon on a dark preview background. The Android launcher
    # applies its own mask (circle, squircle, etc.) at runtime.
    apk_sizes = [
        (512, "icon-512-solid.png"),
        (192, "icon-192-solid.png"),
    ]
    for size, name in apk_sizes:
        img = render_icon(size, rounded=False)
        out = os.path.join(OUT_DIR, name)
        img.save(out, "PNG")
        print(f"✓ {name} ({size}x{size}, solid — APK)")

    print("\nAll icons generated in:", OUT_DIR)
    print("\nFor APK builder: use icon-512-solid.png (no transparency, no black corners)")


if __name__ == "__main__":
    main()
