"""
Generates the app's raster assets: intro video, icons, splash image and background.

Usage (from the project root):
    python scripts/generate-assets.py

Requires: pillow, numpy, imageio, imageio-ffmpeg
"""
import math
import os
import random

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FONT_DIR = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "orbitron")
FONT_BLACK = os.path.join(FONT_DIR, "900Black", "Orbitron_900Black.ttf")
FONT_MED = os.path.join(FONT_DIR, "500Medium", "Orbitron_500Medium.ttf")

BG_TOP = (5, 6, 15)
BG_BOTTOM = (14, 10, 40)
CYAN = (0, 240, 255)
VIOLET = (139, 92, 246)
GREEN = (37, 211, 102)
MAGENTA = (255, 60, 172)
PALETTE = [CYAN, VIOLET, GREEN, MAGENTA]

random.seed(7)


# ---------- helpers ----------

def vertical_gradient(w, h, top, bottom):
    t = np.linspace(0, 1, h)[:, None, None]
    top = np.array(top, dtype=np.float32)[None, None, :]
    bottom = np.array(bottom, dtype=np.float32)[None, None, :]
    arr = top * (1 - t) + bottom * t
    arr = np.repeat(arr, w, axis=1)
    return arr


def add_glow(base_arr, layer, radius):
    """Additively composites a blurred copy (and the sharp layer) of `layer` onto base_arr."""
    blurred = np.asarray(layer.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)
    sharp = np.asarray(layer, dtype=np.float32)
    rgb_b, a_b = blurred[..., :3], blurred[..., 3:4] / 255.0
    rgb_s, a_s = sharp[..., :3], sharp[..., 3:4] / 255.0
    base_arr += rgb_b * a_b * 1.6
    base_arr[:] = base_arr * (1 - a_s) + rgb_s * a_s
    return base_arr


def ease_out_back(t):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def clamp01(x):
    return max(0.0, min(1.0, x))


def phase(t, start, end):
    return clamp01((t - start) / (end - start))


def draw_broadcast_glyph(d, cx, cy, r, color, width_scale=1.0, alpha=255):
    """Chat bubble with radiating broadcast waves — the app's mark."""
    col = color + (alpha,)
    w = max(2, int(r * 0.09 * width_scale))
    # bubble
    br = r * 0.62
    d.ellipse([cx - br, cy - br, cx + br, cy + br], outline=col, width=w)
    # bubble tail
    d.line([(cx - br * 0.55, cy + br * 0.8), (cx - br * 0.95, cy + br * 1.15), (cx - br * 0.1, cy + br * 0.98)],
           fill=col, width=w, joint="curve")
    # dot + waves inside
    dr = r * 0.1
    d.ellipse([cx - dr, cy - dr, cx + dr, cy + dr], fill=col)
    for i, rr in enumerate([r * 0.26, r * 0.42]):
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], start=-50, end=50, fill=col, width=w)
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], start=130, end=230, fill=col, width=w)


def draw_chat_bubble(d, cx, cy, s, color, alpha):
    col = color + (int(alpha),)
    w, h = s * 1.6, s
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=h * 0.38,
                        outline=col, width=max(2, int(s * 0.08)))
    d.polygon([(cx - w * 0.25, cy + h / 2 - 2), (cx - w * 0.38, cy + h * 0.85), (cx - w * 0.08, cy + h / 2 - 2)],
              fill=col)
    for i in range(3):
        dx = (i - 1) * s * 0.36
        rr = s * 0.09
        d.ellipse([cx + dx - rr, cy - rr, cx + dx + rr, cy + rr], fill=col)


# ---------- intro video ----------

def render_intro():
    W, H, FPS, DUR = 720, 1280, 30, 4.8
    frames = int(FPS * DUR)
    out = os.path.join(ASSETS, "video", "intro.mp4")
    silent = os.path.join(ASSETS, "video", "_intro_silent.mp4")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    bg = vertical_gradient(W, H, BG_TOP, BG_BOTTOM)
    stars = [(random.uniform(0, W), random.uniform(0, H * 0.7), random.uniform(0.6, 2.2), random.uniform(0, 6.28))
             for _ in range(140)]
    font_title = ImageFont.truetype(FONT_BLACK, 120)
    font_sub = ImageFont.truetype(FONT_MED, 26)

    cx, cy = W / 2, H * 0.40
    n_bubbles = 8
    orbit = 230
    horizon = H * 0.66

    writer = imageio.get_writer(silent, fps=FPS, codec="libx264", pixelformat="yuv420p", quality=8,
                                macro_block_size=16, ffmpeg_params=["-movflags", "+faststart"])
    for f in range(frames):
        t = f / FPS
        arr = bg.copy()

        # --- sharp + glow layers
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)

        # stars (twinkle)
        star_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(star_layer)
        for (x, y, r, ph) in stars:
            a = int(120 + 120 * math.sin(t * 3 + ph))
            sd.ellipse([x - r, y - r, x + r, y + r], fill=(200, 220, 255, max(0, a)))
        s_np = np.asarray(star_layer, dtype=np.float32)
        arr = arr * (1 - s_np[..., 3:4] / 255) + s_np[..., :3] * (s_np[..., 3:4] / 255)

        # perspective neon grid (moves toward the viewer)
        grid_alpha = int(160 * phase(t, 0.0, 0.8))
        if grid_alpha > 0:
            for i in range(-12, 13):
                x_far = cx + i * 30
                x_near = cx + i * 260
                gd.line([(x_far, horizon), (x_near, H)], fill=VIOLET + (grid_alpha,), width=2)
            offset = (t * 0.9) % 1.0
            for k in range(12):
                z = (k + offset) / 12
                y = horizon + (H - horizon) * (z ** 2.2)
                gd.line([(0, y), (W, y)], fill=CYAN + (int(grid_alpha * (0.3 + 0.7 * z)),), width=2)

        # pulse rings
        for k in range(3):
            p = ((t - 0.5 - k * 0.55) % 1.65) / 1.65 if t > 0.5 + k * 0.55 else None
            if p is not None:
                rr = 90 + p * 330
                a = int(200 * (1 - p))
                gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=CYAN + (a,), width=3)

        # network lines + bubbles
        for i in range(n_bubbles):
            start = 0.8 + i * 0.12
            p = ease_out_back(phase(t, start, start + 0.7)) if t > start else 0
            if p <= 0:
                continue
            ang = -math.pi / 2 + i * (2 * math.pi / n_bubbles) + t * 0.25
            rr = orbit * p
            bx = cx + math.cos(ang) * rr
            by = cy + math.sin(ang) * rr * 0.92
            col = PALETTE[i % len(PALETTE)]
            a = 255 * clamp01(p)
            gd.line([(cx, cy), (bx, by)], fill=col + (int(a * 0.45),), width=2)
            # travelling packet along the line
            q = (t * 1.3 + i * 0.17) % 1.0
            px, py = cx + (bx - cx) * q, cy + (by - cy) * q
            gd.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(255, 255, 255, int(a)))
            draw_chat_bubble(gd, bx, by, 44, col, a)

        # hub
        hp = ease_out_back(phase(t, 0.1, 0.9))
        if hp > 0:
            hr = 95 * hp
            gd.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=(10, 14, 36, 235), outline=GREEN + (255,), width=5)
            draw_broadcast_glyph(gd, cx, cy + 4, hr * 0.95, CYAN)

        arr = add_glow(arr, glow, 14)

        # title
        tp = ease_out_cubic(phase(t, 2.2, 3.0))
        if tp > 0:
            txt = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            td = ImageDraw.Draw(txt)
            ty = H * 0.69 + (1 - tp) * 40
            a = int(255 * tp)
            for label, font, y, col in [("PINGLE", font_title, ty, CYAN),
                                        ("ONE MESSAGE  /  EVERY CHAT", font_sub, ty + 160, VIOLET)]:
                bbox = td.textbbox((0, 0), label, font=font)
                tw = bbox[2] - bbox[0]
                td.text(((W - tw) / 2, y), label, font=font, fill=col + (a,))
            arr = add_glow(arr, txt, 10)

        # fade out to background at the very end (smooth handoff into the app)
        fo = phase(t, DUR - 0.45, DUR)
        if fo > 0:
            arr = arr * (1 - fo) + np.array(BG_TOP, dtype=np.float32) * fo
        # fade in from black
        fi = phase(t, 0, 0.25)
        arr = arr * fi + np.array(BG_TOP, dtype=np.float32) * (1 - fi)

        writer.append_data(np.clip(arr, 0, 255).astype(np.uint8))
    writer.close()
    add_voice(silent, out, DUR)
    os.remove(silent)
    print("intro video ->", out, os.path.getsize(out) // 1024, "KB")


def add_voice(video_in, video_out, duration):
    """Mixes the "Welcome to Pingle" voice (assets/audio/welcome.wav) in as the title appears."""
    import subprocess
    import imageio_ffmpeg
    voice = os.path.join(ASSETS, "audio", "welcome.wav")
    subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
        "-i", video_in, "-i", voice,
        "-filter_complex", "[1:a]adelay=2000:all=1,apad[a]", "-t", str(duration),
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", video_out,
    ], check=True)


# ---------- icons / splash / background ----------

def glyph_image(size, color, glow=True, scale=0.36):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2
    draw_broadcast_glyph(d, c, c + size * 0.02, size * scale, color, width_scale=1.3)
    if not glow:
        return layer
    arr = np.zeros((size, size, 3), dtype=np.float32)
    arr = add_glow(arr, layer, size * 0.02)
    alpha = np.clip(arr.max(axis=2), 0, 255).astype(np.uint8)
    rgb = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")


def render_icons():
    S = 1024
    bg = vertical_gradient(S, S, (8, 10, 30), (30, 12, 70))
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse([150, 150, S - 150, S - 150], outline=GREEN + (255,), width=18)
    rd.arc([110, 110, S - 110, S - 110], start=200, end=320, fill=VIOLET + (255,), width=10)
    rd.arc([110, 110, S - 110, S - 110], start=20, end=140, fill=CYAN + (255,), width=10)
    arr = add_glow(bg.copy(), ring, 22)
    arr = add_glow(arr, glyph_image(S, CYAN, glow=False, scale=0.3), 18)
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(ASSETS, "icon.png"))

    Image.fromarray(np.clip(vertical_gradient(S, S, (8, 10, 30), (30, 12, 70)), 0, 255).astype(np.uint8)) \
        .save(os.path.join(ASSETS, "android-icon-background.png"))
    glyph_image(S, CYAN, scale=0.24).save(os.path.join(ASSETS, "android-icon-foreground.png"))
    glyph_image(S, (255, 255, 255), glow=False, scale=0.24).save(os.path.join(ASSETS, "android-icon-monochrome.png"))
    glyph_image(S, CYAN, scale=0.34).save(os.path.join(ASSETS, "splash-icon.png"))
    Image.open(os.path.join(ASSETS, "icon.png")).resize((48, 48), Image.LANCZOS).save(os.path.join(ASSETS, "favicon.png"))
    print("icons written")


def render_background():
    W, H = 1080, 1920
    arr = vertical_gradient(W, H, BG_TOP, (10, 8, 30))
    blobs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blobs)
    for (x, y, r, col, a) in [(160, 260, 380, VIOLET, 70), (980, 700, 420, CYAN, 45), (300, 1500, 460, MAGENTA, 38),
                              (900, 1750, 380, GREEN, 32)]:
        bd.ellipse([x - r, y - r, x + r, y + r], fill=col + (a,))
    blobs = blobs.filter(ImageFilter.GaussianBlur(170))
    b = np.asarray(blobs, dtype=np.float32)
    arr += b[..., :3] * (b[..., 3:4] / 255) * 1.4
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    for _ in range(260):
        x, y, r = random.uniform(0, W), random.uniform(0, H), random.uniform(0.5, 1.8)
        sd.ellipse([x - r, y - r, x + r, y + r], fill=(210, 225, 255, random.randint(60, 200)))
    s = np.asarray(stars, dtype=np.float32)
    arr = arr * (1 - s[..., 3:4] / 255) + s[..., :3] * (s[..., 3:4] / 255)
    out = os.path.join(ASSETS, "images", "nebula.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(out, quality=86)
    print("background ->", out)


if __name__ == "__main__":
    render_icons()
    render_background()
    render_intro()
