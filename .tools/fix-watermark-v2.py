"""主题插画水印精修 v2：
1) 先从 vibe_images 原图恢复（v1 误把内容当水印克隆覆盖了）
2) 检测窗口收窄到底部窄带（水印贴底右角）
3) 用「局部中位数」判定离群：只有细笔画文字会被标记，大面积内容不会
4) 仅对确认的文字 bbox 做克隆修补
"""
from PIL import Image, ImageFilter, ImageChops
import os, shutil

VIBE = r'C:\Users\Administrator\.qoder-cn\vibe_images'
BASE = r'c:\Users\Administrator\Documents\digital-study\frontend\public\assets\themes'
SHOTS = r'c:\Users\Administrator\Documents\digital-study\.shots'
SRC = {
    'fresh-natural':     'theme-fresh-natural_1788329035.png',
    'night-library':     'theme-night-library_1788329024.png',
    'minimal-white':     'theme-minimal-white_1788329146.png',
    'retro-paper':       'theme-retro-paper_1788329146.png',
    'dream-illustration':'theme-dream-illustration_1788329249.png',
}

def local_median(px, x, y, half=10, step=3):
    rs, gs, bs = [], [], []
    for yy in range(max(0, y-half), y+half+1, step):
        for xx in range(max(0, x-half), x+half+1, step):
            try:
                r, g, b = px[xx, yy]
                rs.append(r); gs.append(g); bs.append(b)
            except IndexError:
                pass
    if not rs: return (0,0,0)
    rs.sort(); gs.sort(); bs.sort(); n = len(rs)
    return (rs[n//2], gs[n//2], bs[n//2])

for t, src in SRC.items():
    dst_dir = os.path.join(BASE, t)
    dst = os.path.join(dst_dir, 'hero.png')
    # 1) 恢复原图
    shutil.copyfile(os.path.join(VIBE, src), dst)
    im = Image.open(dst).convert('RGB')
    w, h = im.size
    px = im.load()

    # 2) 底部窄带搜索窗（水印贴底：y 距底 ≤ 80px，x 距右 ≤ 480px）
    X0, Y0 = w - 480, h - 80
    outliers = []
    for y in range(Y0, h, 1):
        for x in range(X0, w, 1):
            r, g, b = px[x, y]
            m = local_median(px, x, y)
            if abs(r-m[0]) + abs(g-m[1]) + abs(b-m[2]) > 90:
                outliers.append((x, y))
    # 3) 只有形成「宽而扁」的文字带才认定为水印
    if len(outliers) < 60:
        print(t, '-> clean (outliers=%d)' % len(outliers))
        continue
    xs = [p[0] for p in outliers]; ys = [p[1] for p in outliers]
    bw_, bh_ = max(xs)-min(xs), max(ys)-min(ys)
    if bw_ < 60 or bh_ > 60 or len(outliers) > 8000:
        print(t, '-> suspicious shape, skip patch (w=%d h=%d n=%d)' % (bw_, bh_, len(outliers)))
        continue
    bx0, by0 = max(0, min(xs)-8), max(0, min(ys)-8)
    bx1, by1 = min(w, max(xs)+8), min(h, max(ys)+8)
    pw, ph = bx1-bx0, by1-by0
    src_y = by0 - ph - 20
    if src_y < 0: src_y = min(h-ph, by1+20)
    patch = im.crop((bx0, src_y, bx1, src_y+ph))
    mask = Image.new('L', (pw, ph), 255).filter(ImageFilter.GaussianBlur(9))
    inner = Image.new('L', (pw, ph), 0)
    inner.paste(Image.new('L', (max(1,pw-14), max(1,ph-14)), 255), (7, 7))
    mask = ImageChops.lighter(mask, inner.filter(ImageFilter.GaussianBlur(5)))
    im2 = im.copy()
    im2.paste(patch, (bx0, by0), mask)
    im2.save(dst)
    im2.crop((max(0,bx0-100), max(0,by0-100), min(w,bx1+40), min(h,by1+20))).save(
        os.path.join(SHOTS, f'wmv2-{t}.png'))
    print(t, '-> PATCHED bbox:', (bx0,by0,bx1,by1), 'outliers:', len(outliers))
print('DONE')
