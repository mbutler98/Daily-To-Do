"""Draws the app icon (a white check in a ring on iOS blue) at the sizes phones and browsers ask for."""
from pathlib import Path

from PIL import Image, ImageDraw

STATIC = Path(__file__).resolve().parent.parent / "static"


def icon(size):
    s = 4  # draw big, then shrink, for smooth edges
    n = size * s
    img = Image.new("RGB", (n, n))
    d = ImageDraw.Draw(img)
    top, bottom = (64, 156, 255), (0, 100, 230)
    for y in range(n):
        f = y / n
        d.line([(0, y), (n, y)], fill=tuple(round(a + (b - a) * f) for a, b in zip(top, bottom)))
    c, r, w = n / 2, n * 0.29, max(2, round(n * 0.055))
    d.ellipse([c - r, c - r, c + r, c + r], outline="white", width=w)
    pts = [(c - r * 0.45, c + r * 0.02), (c - r * 0.1, c + r * 0.36), (c + r * 0.5, c - r * 0.34)]
    d.line(pts, fill="white", width=round(w * 1.15), joint="curve")
    for p in (pts[0], pts[-1]):
        rr = w * 0.575
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill="white")
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    icon(180).save(STATIC / "apple-touch-icon.png")
    icon(192).save(STATIC / "icon-192.png")
    icon(512).save(STATIC / "icon-512.png")
    print("icons written to", STATIC)
