"""水印修补 v3：按图定制
- fresh-natural / night-library：右下角整条半透明水印条 → 强制克隆角落区带（该区域为纯背景留白，安全）
- dream-illustration：底部中央白色大字 → 亮色离群检测定位文字 bbox → 克隆修补
修补后重新输出核查拼图
"""
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import os

BASE = r'c:\Users\Administrator\Documents\digital-study\frontend\public\assets\themes'
SHOTS = r'c:\Users\Administrator\Documents\digital-study\.shots'

def local_median(px, x, y, half=10, step=3, size=None):
    rs, gs, bs = [], [], []
    W, H = size
    for yy in range(max(0, y-half), min(H, y+half+1), step):
        for xx in range(max(0, x-half), min(W, x+half+1), step):
            r, g, b = px[xx, yy]
            rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort(); n = len(rs)
    return (rs[n//2], gs[n//2], bs[n//2])

def feather_patch(im, box, src_dy=None, blur=12):
    """用 box 正上方同源区域覆盖 box，边缘羽化"""
    x0, y0, x1, y1 = box
    pw, ph = x1-x0, y1-y0
    src_y = y0 - ph - 20 if src_dy is None else src_dy
    src_y = max(0, src_y)
    patch = im.crop((x0, src_y, x1, src_y+ph))
    mask = Image.new('L', (pw, ph), 255).filter(ImageFilter.GaussianBlur(blur))
    inner = Image.new('L', (pw, ph), 0)
    inner.paste(Image.new('L', (max(1,pw-24), max(1,ph-24)), 255), (12, 12))
    mask = ImageChops.lighter(mask, inner.filter(ImageFilter.GaussianBlur(8)))
    out = im.copy()
    out.paste(patch, (x0, y0), mask)
    return out

# 1) fresh-natural / 2) night-library：已在首次运行中修补完成，跳过

# 3) dream-illustration：底部中央白色大字，亮色离群检测
p = os.path.join(BASE, 'dream-illustration', 'hero.png')
im = Image.open(p).convert('RGB'); w, h = im.size
px = im.load()
X0, X1, Y0 = w//2-420, w//2+420, h-130
pts = []
for y in range(Y0, h):
    for x in range(X0, X1):
        r, g, b = px[x, y]
        m = local_median(px, x, y, size=(w, h))
        if (r-m[0]) + (g-m[1]) + (b-m[2]) > 110:   # 明显亮于局部背景 = 白字
            pts.append((x, y))
if len(pts) >= 60:
    xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
    box = (max(0,min(xs)-14), max(0,min(ys)-14), min(w,max(xs)+14), min(h,max(ys)+14))
    im = feather_patch(im, box, blur=14)
    im.save(p)
    print('dream-illustration text patched, bbox:', box, 'pts:', len(pts))
else:
    print('dream-illustration: no light text found, pts=', len(pts))

# 核查拼图
themes = ['fresh-natural','night-library','minimal-white','retro-paper','dream-illustration']
crops = []
for t in themes:
    imc = Image.open(os.path.join(BASE,t,'hero.png')).convert('RGB')
    wc, hc = imc.size
    if t == 'dream-illustration':
        c = imc.crop((wc//2-420, hc-140, wc//2+420, hc))
    else:
        c = imc.crop((wc-560, hc-130, wc, hc))
    c = c.resize((560, c.size[1]*560//c.size[0]))
    d = ImageDraw.Draw(c)
    d.rectangle([0,0,c.size[0]-1,c.size[1]-1], outline=(200,60,60), width=2)
    d.text((8,6), t, fill=(200,60,60))
    crops.append(c)
H = sum(c.size[1] for c in crops)
out = Image.new('RGB', (560, H), (255,255,255))
yy = 0
for c in crops:
    out.paste(c, (0, yy)); yy += c.size[1]
out.save(os.path.join(SHOTS, 'wm-corners-v3.png'))
print('montage v3 saved')
