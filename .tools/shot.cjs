/**
 * Phase 2A 响应式自检：puppeteer-core + 本机 Edge
 * 精确设备视口仿真（解决 headless 窗口最小宽度 ~492px 的坑）
 * 输出：每档视口截图 + 横向溢出度量 JSON
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:5175/';
const OUT = path.join(__dirname, '..', '.shots');

const SIZES = [
  [1920, 1080], [1440, 900], [1024, 768], [768, 1024],
  [430, 932], [390, 844], [375, 812],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--disable-gpu', '--hide-scrollbars'],
  });

  for (const [w, h] of SIZES) {
    const page = await browser.newPage();
    const mobile = w <= 500;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800)); // 等字体/图片/HMR 稳定

    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const q = (s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x * 10) / 10, w: Math.round(r.width * 10) / 10, right: Math.round(r.right * 10) / 10 };
      };
      // 找出所有横向溢出视口的元素
      const vw = de.clientWidth;
      const overflowers = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
          // 排除内部滚动容器里被裁剪的子元素
          let p = el.parentElement, clipped = false;
          while (p && p !== document.body) {
            const cs = getComputedStyle(p);
            if (cs.overflowX === 'auto' || cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.overflowX === 'scroll') { clipped = true; break; }
            p = p.parentElement;
          }
          if (!clipped && overflowers.length < 8) {
            overflowers.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
          }
        }
      });
      return {
        viewport: de.clientWidth,
        docScrollW: de.scrollWidth,
        hOverflow: de.scrollWidth > de.clientWidth,
        capsule: q('.top-nav__inner'),
        app: q('.app'),
        hero: q('.hero'),
        overflowers,
      };
    });

    const name = `${w}x${h}`;
    await page.screenshot({ path: path.join(OUT, `p2b-${name}.png`) });
    if (mobile || w === 768) {
      await page.screenshot({ path: path.join(OUT, `p2b-${name}-full.png`), fullPage: true });
    }
    console.log(name, JSON.stringify(metrics));
    await page.close();
  }

  await browser.close();
  console.log('ALL DONE');
})().catch((e) => { console.error(e); process.exit(1); });
