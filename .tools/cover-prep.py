# -*- coding: utf-8 -*-
"""书封归档 + 通用水印文字检测（不修补，只报告可疑 bbox 供目检）"""
import os, shutil
from PIL import Image

VIBE = r"C:\Users\Administrator\.qoder-cn\vibe_images"
DEST = r"c:\Users\Administrator\Documents\digital-study\frontend\public\assets\covers"
os.makedirs(DEST, exist_ok=True)

MAP = {
    "cover-1-lake": "1.png",
    "cover-2-dunes": "2.png",
    "cover-3-village": "3.png",
    "cover-4-teahouse": "4.png",
    "cover-5-forest": "5.png",
    "cover-6-starry-night": "6.png",
}

def local_median(px, x, y, half=12, step=4, W=0, H=0):
    rs, gs, bs = [], [], []
    for yy in range(max(0, y - half), min(H, y + half + 1), step):
        for xx in range(max(0, x - half), min(W, x + half + 1), step):
            r, g, b = px[xx, yy]
            rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort(); n = len(rs)
    return (rs[n // 2], gs[n // 2], bs[n // 2])

def scan(fname, W, H):
    """扫描底部 12% 全宽 + 四角区域，报告离群点聚类"""
    im = Image.open(fname).convert("RGB")
    px = im.load()
    W, H = im.size
    regions = {
        "bottom": (0, int(H * 0.88), W, H),
        "top": (0, 0, W, int(H * 0.10)),
    }
    found = {}
    for name, (x0, y0, x1, y1) in regions.items():
        pts = []
        for y in range(y0, y1, 2):
            for x in range(x0, x1, 2):
                r, g, b = px[x, y]
                m = local_median(px, x, y, W=W, H=H)
                d_bright = (r - m[0]) + (g - m[1]) + (b - m[2])
                d_dark = (m[0] - r) + (m[1] - g) + (m[2] - b)
                # 白字（亮离群）或深字（暗离群）
                if d_bright > 130 or d_dark > 150:
                    pts.append((x, y))
        if len(pts) >= 40:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            found[name] = (len(pts), (min(xs), min(ys), max(xs), max(ys)))
    return found

# 找到最新的 vibe 文件并归档
for prefix, dest in MAP.items():
    cands = sorted([f for f in os.listdir(VIBE) if f.startswith(prefix)],
                   key=lambda f: os.path.getmtime(os.path.join(VIBE, f)))
    if not cands:
        print(f"[MISS] {prefix}")
        continue
    src = os.path.join(VIBE, cands[-1])
    dst = os.path.join(DEST, dest)
    shutil.copy(src, dst)
    sus = scan(dst, 0, 0)
    if sus:
        for zone, (n, box) in sus.items():
            print(f"[SUSPECT] {dest} {zone}: pts={n} bbox={box}")
    else:
        print(f"[CLEAN] {dest}")
print("ALL DONE")
