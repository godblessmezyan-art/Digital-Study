"""环境全景图：归档到 themes/<id>/env.png + 水印检测修补（右下角 + 底部中央两个窗口）"""
from PIL import Image, ImageFilter, ImageChops, ImageDraw
import os, shutil

VIBE = r'C:\Users\Administrator\.qoder-cn\vibe_images'
BASE = r'c:\Users\Administrator\Documents\digital-study\frontend\public\assets\themes'
SHOTS = r'c:\Users\Administrator\Documents\digital-study\.shots'
SRC = {
    'fresh-natural':  'env-pano-fresh-natural_1788341153.png',
    'warm-study':     'env-pano-warm-study_1788341202.png',
    'night-library':  'env-pano-night-library_1788341202.png',
    'minimal-white':  'env-pano-minimal-white_1788341247.png',
    'retro-paper':    'env-pano-retro-paper_1788341249.png',
}

def local_median(px, x, y, w, h, half=10, step=3):
    rs, gs, bs = [], [], []
    for yy in range(max(0, y-half), min(h, y+half+1), step):
        for xx in range(max(0, x-half), min(w, x+half+1), step):
            r, g, b = px[xx, yy]
            rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort(); n = len(rs)
    return (rs[n//2], gs[n//2], bs[n//2])

def find_text(im, x0, y0, x1, y1, thresh=80):
    """在窗口内找与局部中位数差异大的离群点（文字笔画）"""
    w, h = im.size
    px = im.load()
    pts = []
    for y in range(y0, min(y1, h)):
        for x in range(x0, min(x1, w)):
            r, g, b = px[x, y]
            m = local_median(px, x, y, w, h)
            if abs(r-m[0]) + abs(g-m[1]) + abs(b-m[2]) > thresh:
                pts.append((x, y))
    return pts

def feather_patch(im, box, blur=12):
    x0, y0, x1, y1 = box
    pw, ph = x1-x0, y1-y0
    src_y = max(0, y0 - ph - 20)
    patch = im.crop((x0, src_y, x1, src_y+ph))
    mask = Image.new('L', (pw, ph), 255).filter(ImageFilter.GaussianBlur(blur))
    inner = Image.new('L', (pw, ph), 0)
    inner.paste(Image.new('L', (max(1,pw-24), max(1,ph-24)), 255), (12, 12))
    mask = ImageChops.lighter(mask, inner.filter(ImageFilter.GaussianBlur(8)))
    out = im.copy()
    out.paste(patch, (x0, y0), mask)
    return out

for t, src in SRC.items():
    dst = os.path.join(BASE, t, 'env.png')
    shutil.copyfile(os.path.join(VIBE, src), dst)
    im = Image.open(dst).convert('RGB')
    w, h = im.size
    patched = False
    # 窗口1：右下角
    pts = find_text(im, w-560, h-90, w, h)
    if 60 <= len(pts) <= 8000:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        bw=max(xs)-min(xs)
        if bw >= 60 and (max(ys)-min(ys)) <= 70:
            im = feather_patch(im, (max(0,min(xs)-12), max(0,min(ys)-12), min(w,max(xs)+12), min(h,max(ys)+12)))
            patched = True
            print(t, 'corner watermark patched,', len(pts), 'pts')
    # 窗口2：底部中央（重新取像素）
    pts2 = find_text(im, w//2-420, h-90, w//2+420, h, thresh=100)
    if 60 <= len(pts2) <= 8000:
        xs=[p[0] for p in pts2]; ys=[p[1] for p in pts2]
        if (max(xs)-min(xs)) >= 60 and (max(ys)-min(ys)) <= 70:
            im = feather_patch(im, (max(0,min(xs)-12), max(0,min(ys)-12), min(w,max(xs)+12), min(h,max(ys)+12)), blur=14)
            patched = True
            print(t, 'center watermark patched,', len(pts2), 'pts')
    if patched:
        im.save(dst)
    else:
        print(t, 'clean')
    # 核查拼图：右下角条带
    c = im.crop((w-560, h-100, w, h))
    c = c.resize((560, 100))
    d = ImageDraw.Draw(c)
    d.rectangle([0,0,559,99], outline=(200,60,60), width=2)
    d.text((8,6), t, fill=(200,60,60))
    c.save(os.path.join(SHOTS, f'envpano-corner-{t}.png'))
print('ALL DONE')
