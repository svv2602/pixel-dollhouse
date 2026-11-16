"""Иконки PWA: пиксельный домик 16×16, увеличенный целым множителем на розовом фоне."""
import sys

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "game/public"

HOUSE = [
    "................",
    ".......KK.......",
    "......KRRK......",
    ".....KRRRRK.....",
    "....KRRrRRRK....",
    "...KRRRRRrRRK...",
    "..KRRrRRRRRRRK..",
    ".KKKKKKKKKKKKKK.",
    "..KWWWWWWWWWWK..",
    "..KWHHWWWDDDWK..",
    "..KWHHWWWDDDWK..",
    "..KWWWWWWDDDWK..",
    "..KWWWWWWDdDWK..",
    "..KWWWWWWDDDWK..",
    "..KKKKKKKKKKKK..",
    "................",
]
PAL = {
    "K": (43, 29, 46), "R": (242, 122, 166), "r": (255, 208, 228), "W": (255, 246, 250),
    "H": (255, 107, 154), "D": (196, 143, 242), "d": (242, 201, 76),
}
BG = (248, 220, 232)


def icon(size, pad):
    scale = (size - 2 * pad) // 16
    img = Image.new("RGB", (size, size), BG)
    off = (size - 16 * scale) // 2
    for y, row in enumerate(HOUSE):
        for x, ch in enumerate(row):
            if ch in PAL:
                for dy in range(scale):
                    for dx in range(scale):
                        img.putpixel((off + x * scale + dx, off + y * scale + dy), PAL[ch])
    return img


icon(192, 16).save(f"{OUT}/icon-192.png")
icon(512, 40).save(f"{OUT}/icon-512.png")
icon(512, 96).save(f"{OUT}/icon-maskable.png")   # с запасом под маску Android
icon(180, 14).save(f"{OUT}/apple-touch-icon.png")
print("icons ok")
