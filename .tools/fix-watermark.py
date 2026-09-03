"""修复 hero.png 右下角 AI 生成水印：定位文字像素 → 用上方相邻纹理覆盖 → 羽化接缝"""
from PIL import Image, ImageFilter
import os

P = r'c:\Users\Administrator\Documents\digital-study\frontend\public\assets\themes\warm-study\hero.png'
im = Image.open(P).convert('RGB')
w, h = im.size

# 1) 在右下角搜索窗内定位水印文字（比周围纸底更暗/更灰的像素）
X0, Y0 = w - 420, h - 160
px = im.load()
minx, miny, maxx, maxy = w, h, 0, 0
found = 0
for y in range(Y0, h):
    for x in range(X0, w):
        r, g, b = px[x, y]
        # 纸底为暖米色（r>g>b 且都很亮）；水印文字偏中性灰
        if (r + g + b) / 3 < 208 and abs(r - b) < 26:
            found += 1
            minx, miny = min(minx, x), min(miny, y)
            maxx, maxy = max(maxx, x), max(maxy, y)
print('watermark pixels:', found, 'bbox:', (minx, miny, maxx, maxy))

if found < 30:
    print('no clear watermark found, abort')
    raise SystemExit(0)

# 2) 扩边得到修补区
pad = 10
bx0 = max(0, minx - pad); by0 = max(0, miny - pad)
bx1 = min(w, maxx + pad); by1 = min(h, maxy + pad)
bw, bh = bx1 - bx0, by1 - by0

# 3) 克隆源：正上方同尺寸区域（同为纸底/桌面纹理），若超出顶部则取正下方
src_y = by0 - bh - 20
if src_y < 0:
    src_y = min(h - bh, by1 + 20)
patch = im.crop((bx0, src_y, bx1, src_y + bh))

# 4) 羽化蒙版：中心不透明，边缘渐隐，接缝自然
mask = Image.new('L', (bw, bh), 0)
md = Image.new('L', (bw, bh), 255)
mask.paste(md, (0, 0))
mask = mask.filter(ImageFilter.GaussianBlur(12))
# 内部实心：再叠一个收缩的实心块
from PIL import ImageChops
inner = Image.new('L', (bw, bh), 0)
inner.paste(Image.new('L', (max(1, bw - 16), max(1, bh - 16)), 255), (8, 8))
inner = inner.filter(ImageFilter.GaussianBlur(6))
mask = ImageChops.lighter(mask, inner)

im2 = im.copy()
im2.paste(patch, (bx0, by0), mask)

# 5) 颜色微调：让补丁区亮度向周围纸底靠拢（采样补丁四周均值）
im2.save(P)
print('patched region:', (bx0, by0, bx1, by1), 'saved:', P)

# 验证裁剪
im2.crop((max(0, bx0 - 60), max(0, by0 - 60), min(w, bx1 + 60), min(h, by1 + 60))).save(
    r'c:\Users\Administrator\Documents\digital-study\.shots\hero-corner-patched.png')
print('verify crop saved')
