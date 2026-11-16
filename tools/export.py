"""Отбирает лучшие варианты спрайтов для каждого subject и экспортирует их для игры.

Выход:
  game/public/assets/items/<cat>.png   — атлас категории (сетка 16x16, по 32 в ряд)
  game/public/assets/items/items.json  — манифест: id, subject, caption, cat, tags, атлас, кадр
  data/review/<cat>.png                — контактный лист x4 для визуальной проверки
"""
import json
import os
import re
import sys
from collections import defaultdict

import numpy as np
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
VARIANTS = int(sys.argv[2]) if len(sys.argv) > 2 else 3
COLS = 32

sys.path.insert(0, os.path.join(ROOT, "tools"))
from classify import BLOCK_CAPTION  # noqa: E402

GOOD = re.compile(r"\b(cute|bright|shiny|pastel|pink|colorful|colourful|sparkl\w*|glossy|happy|"
                  r"smiling|fluffy|rainbow|polished|new|fresh|ripe|cheerful|round)\b", re.I)
BAD = re.compile(r"\b(muted|dusty|old|worn|earthy|dark|grim|gloomy|faded|ancient|weathered|"
                 r"stained|empty|half|bitten|melted|spilled|overflowing|tiny|giant|huge)\b", re.I)


def components(mask):
    """Число 4-связных компонент и размер наибольшей (mask 16x16 bool)."""
    seen = np.zeros_like(mask)
    sizes = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        stack, n = [(y, x)], 0
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop()
            n += 1
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < 16 and 0 <= nx < 16 and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        sizes.append(n)
    return len(sizes), max(sizes) if sizes else 0


def cheap_score(tok, caption, palette):
    """Быстрая оценка без поиска компонент: заполненность, цвета, яркость, подпись."""
    vis = tok[tok != 0]
    cov = len(vis) / 256
    if cov < 0.12 or cov > 0.9:
        return -99
    ncol = len(np.unique(vis))
    rgb = palette[vis].astype(np.float32) / 255
    mx, mn = rgb.max(1), rgb.min(1)
    lum = (0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]).mean()
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0).mean()
    s = 0.0
    s -= abs(cov - 0.45) * 4                 # хорошо заполненный кадр
    s -= max(0, 4 - ncol) * 0.6              # слишком плоский
    s -= max(0, ncol - 16) * 0.15            # шумный
    s += sat * 2.5                           # детям — сочные цвета
    s -= max(0, 0.38 - lum) * 10             # мрачные/чёрные варианты вниз
    s += len(GOOD.findall(caption)) * 0.6
    s -= len(BAD.findall(caption)) * 0.6
    s -= len(caption.split()) * 0.03         # короткие подписи = «канонический» вид предмета
    return s


def score(tok, caption, palette):
    s = cheap_score(tok, caption, palette)
    if s <= -99:
        return s
    mask = (tok != 0).reshape(16, 16)
    ncomp, biggest = components(mask)
    s -= (ncomp - 1) * 0.5                   # мусорные островки пикселей
    s -= (1 - biggest / mask.sum()) * 3
    return s


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    raw = f"{ROOT}/data/raw"
    tokens = np.load(f"{raw}/tokens.npy", mmap_mode="r")
    palette = np.load(f"{raw}/palette.npy")
    caps = json.load(open(f"{raw}/captions.json"))
    objs = json.load(open(f"{raw}/objects.json"))
    classes = json.load(open(f"{ROOT}/data/subjects_classified.json"))

    rows_by_subj = defaultdict(list)
    for i, o in enumerate(objs):
        if o in classes and not BLOCK_CAPTION.search(caps[i]):
            rows_by_subj[o].append(i)

    chosen = defaultdict(list)  # cat -> [(subject, row)]
    for subj, rows in sorted(rows_by_subj.items()):
        block = np.asarray(tokens[rows[0]:rows[-1] + 1]) if rows[-1] - rows[0] < 5000 else None
        get = (lambda r: block[r - rows[0]]) if block is not None else (lambda r: np.asarray(tokens[r]))
        pre = sorted(((cheap_score(get(r), caps[r], palette), r) for r in rows), reverse=True)[:12]
        scored = sorted(((score(get(r), caps[r], palette), r) for _, r in pre), reverse=True)
        picks = [r for sc, r in scored[:VARIANTS] if sc > -99]
        for r in picks:
            chosen[classes[subj]["cat"]].append((subj, r))

    out_dir = f"{ROOT}/game/public/assets/items"
    rev_dir = f"{ROOT}/data/review"
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(rev_dir, exist_ok=True)

    manifest = []
    for cat, items in sorted(chosen.items()):
        n = len(items)
        rows_n = (n + COLS - 1) // COLS
        sheet = np.zeros((rows_n * 16, COLS * 16, 4), np.uint8)
        for k, (subj, r) in enumerate(items):
            px = np.asarray(tokens[r]).reshape(16, 16)
            rgba = np.dstack((palette[px], (px != 0).astype(np.uint8) * 255))
            y, x = divmod(k, COLS)
            sheet[y * 16:(y + 1) * 16, x * 16:(x + 1) * 16] = rgba
            ys, xs = np.nonzero(px)
            manifest.append({
                # стабильный id: не зависит от порядка в атласе -> перегенерация не ломает сохранения
                "id": f"{slug(subj)}-{int(r)}", "row": int(r), "subject": subj, "caption": caps[r],
                "cat": cat, "tags": classes[subj]["tags"], "atlas": cat, "frame": k,
                "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
            })
        Image.fromarray(sheet).save(f"{out_dir}/{cat}.png")
        # контактный лист: x4, на клетчатом фоне, чтобы видеть прозрачность
        big = Image.fromarray(sheet).resize((COLS * 64, rows_n * 64), Image.NEAREST)
        bg = Image.new("RGBA", big.size, (235, 235, 240, 255))
        checker = np.indices((rows_n * 4, COLS * 4)).sum(0) % 2
        bgarr = np.array(bg)
        bgarr[np.kron(checker, np.ones((16, 16))).astype(bool)] = (215, 215, 222, 255)
        bg = Image.fromarray(bgarr)
        bg.alpha_composite(big)
        bg.convert("RGB").save(f"{rev_dir}/{cat}.png")
        print(f"{cat:10s} {n:5d} sprites from {len({s for s, _ in items})} subjects")

    # алиасы: старые id (cat_frame из прошлых версий и прошлые стабильные id) -> текущие
    aliases = {}
    old_path = f"{out_dir}/items.json"
    if os.path.exists(old_path):
        old = json.load(open(old_path))
        aliases.update(old.get("aliases", {}))
        by_row = {m["row"]: m["id"] for m in manifest}
        by_subj = {m["subject"]: m["id"] for m in manifest}
        for m in old["items"]:
            new = by_row.get(m["row"]) or by_subj.get(m["subject"])
            if new and m["id"] != new:
                aliases[m["id"]] = new
    live = {m["id"] for m in manifest}
    aliases = {k: v for k, v in aliases.items() if v in live and k not in live}
    json.dump({"tile": 16, "cols": COLS, "items": manifest, "aliases": aliases},
              open(f"{out_dir}/items.json", "w"), ensure_ascii=False)
    print("total", len(manifest))


if __name__ == "__main__":
    main()
