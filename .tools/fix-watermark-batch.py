"""批量检查并修补主题插画右下角 AI 水印：
局部中位数背景估计 → 离群像素定位 → 上方相邻纹理克隆 + 羽化"""
from PIL import Image, ImageFilter, ImageChops
import os

BASE = r'c:\Users\Administrator\Documents\digital-study\frontend\public\assets\themes'
THEMES = ['fresh-natural', 'night-library', 'minimal-white', 'retro-paper', 'dream-illustration']

def median_color(px, x0, y0, x1, y1, step=6):
    rs, gs, bs = [], [], []
    for y in range(y0, y1, step):
        for x in range(x0, x1, step):
            r, g, b = px[x, y]
            rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort()
    n = len(rs)
    return (rs[n//2], gs[n//2], bs[n//2])

for t in THEMES:
    p = os.path.join(BASE, t, 'hero.png')
    if not os.path.exists(p):
        print(t, 'MISSING FILE'); continue
    im = Image.open(p).convert('RGB')
    w, h = im.size
    px = im.load()
    # 搜索窗：右下角 420x160
    X0, Y0 = w - 420, h - 160
    med = median_color(px, X0, Y0, w, h)
    minx, miny, maxx, maxy = w, h, 0, 0
    found = 0
    for y in range(Y0, h):
        for x in range(X0, w):
            r, g, b = px[x, y]
            # 与局部中位背景差异大 = 水印笔画
            if abs(r-med[0]) + abs(g-med[1]) + abs(b-med[2]) > 66:
                found += 1
                minx, miny = min(minx, x), min(miny, y)
                maxx, maxy = max(maxx, x), max(maxy, y)
    if found < 40:
        print(t, 'clean, watermark pixels:', found); continue
    pad = 10
    bx0, by0 = max(0, minx-pad), max(0, miny-pad)
    bx1, by1 = min(w, maxx+pad), min(h, maxy+pad)
    bw, bh = bx1-bx0, by1-by0
    src_y = by0 - bh - 24
    if src_y < 0:
        src_y = min(h-bh, by1+24)
    patch = im.crop((bx0, src_y, bx1, src_y+bh))
    mask = Image.new('L', (bw, bh), 255).filter(ImageFilter.GaussianBlur(12))
    inner = Image.new('L', (bw, bh), 0)
    inner.paste(Image.new('L', (max(1,bw-16), max(1,bh-16)), 255), (8, 8))
    inner = inner.filter(ImageFilter.GaussianBlur(6))
    mask = ImageChops.lighter(mask, inner)
    im2 = im.copy()
    im2.paste(patch, (bx0, by0), mask)
    im2.save(p)
    im2.crop((max(0,bx0-80), max(0,by0-80), min(w,bx1+80), min(h,by1+80))).save(
        os.path.join(r'c:\Users\Administrator\Documents\digital-study\.shots', f'wmcheck-{t}.png'))
    print(t, 'PATCHED bbox:', (bx0,by0,bx1,by1), 'pixels:', found)
print('DONE')
