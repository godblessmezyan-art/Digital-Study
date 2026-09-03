# -*- coding: utf-8 -*-
"""书封水印修补：右下角（亮底深字/暗底亮字两种检测）+ 6.png 顶部
策略：局部离群检测 → 上方同源纹理克隆覆盖 → 高斯羽化边缘
大面积检出视为画面内容，跳过不动（宁可留痕也不误伤画面）"""
import os
from PIL import Image, ImageFilter, ImageChops

DEST = r"c:\Users\Administrator\Documents\digital-study\frontend\public\assets\covers"

def local_median(px, x, y, half=12, step=4, W=0, H=0):
    rs, gs, bs = [], [], []
    for yy in range(max(0, y - half), min(H, y + half + 1), step):
        for xx in range(max(0, x - half), min(W, x + half + 1), step):
            r, g, b = px[xx, y if False else yy]
            rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort(); n = len(rs)
    return (rs[n // 2], gs[n // 2], bs[n // 2])

def detect(px, x0, y0, x1, y1, W, H, mode):
    pts = []
    for y in range(max(0, y0), min(H, y1), 2):
        for x in range(max(0, x0), min(W, x1), 2):
            r, g, b = px[x, y]
            m = local_median(px, x, y, W=W, H=H)
            d_bright = (r - m[0]) + (g - m[1]) + (b - m[2])
            d_dark = (m[0] - r) + (m[1] - g) + (m[2] - b)
            if mode == "dark":      # 亮底上的深色字
                hit = d_dark > 150
            elif mode == "bright":  # 暗底上的亮色字
                hit = d_bright > 150
            else:                    # both
                hit = d_dark > 150 or d_bright > 130
            if hit:
                pts.append((x, y))
    return pts

def feather_patch(im, box, blur=14):
    x0, y0, x1, y1 = box
    pw, ph = x1 - x0, y1 - y0
    src_y = max(0, y0 - ph - 24)
    patch = im.crop((x0, src_y, x1, src_y + ph))
    mask = Image.new("L", (pw, ph), 255).filter(ImageFilter.GaussianBlur(blur))
    inner = Image.new("L", (pw, ph), 0)
    inner.paste(Image.new("L", (max(1, pw - 28), max(1, ph - 28)), 255), (14, 14))
    mask = ImageChops.lighter(mask, inner.filter(ImageFilter.GaussianBlur(9)))
    out = im.copy()
    out.paste(patch, (x0, y0), mask)
    return out

def patch_zone(im, zone, mode, tag):
    """zone=(x0,y0,x1,y1) 搜索窗；检出 40~6000 点才修补，否则跳过"""
    w, h = im.size
    px = im.load()
    pts = detect(px, *zone, w, h, mode)
    n = len(pts)
    if n < 40:
        print(f"  [{tag}] clean, pts={n}")
        return im, False
    if n > 6000:
        print(f"  [{tag}] SKIP suspicious large area, pts={n}")
        return im, False
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    if bw < 40 or bh > 140:
        print(f"  [{tag}] SKIP odd shape w={bw} h={bh} pts={n}")
        return im, False
    box = (max(0, min(xs) - 16), max(0, min(ys) - 14), min(w, max(xs) + 16), min(h, max(ys) + 16))
    print(f"  [{tag}] patched bbox={box} pts={n}")
    return feather_patch(im, box), True

for i in range(1, 7):
    p = os.path.join(DEST, f"{i}.png")
    im = Image.open(p).convert("RGB")
    w, h = im.size
    print(f"{i}.png ({w}x{h}):")
    # 右下角水印：右 55% 宽 × 底 14% 高；1-5 亮底深字，6 夜空亮字
    mode = "bright" if i == 6 else "dark"
    zone_br = (int(w * 0.45), int(h * 0.855), w, h)
    im, hit1 = patch_zone(im, zone_br, mode, "bottom-right")
    hit2 = False
    if i == 6:
        # 顶部水印：全宽 × 顶 12%，夜空亮字
        im, hit2 = patch_zone(im, (0, 0, w, int(h * 0.12)), "bright", "top")
    if hit1 or (i == 6 and hit2):
        im.save(p)
        print("  saved")
print("ALL DONE")
