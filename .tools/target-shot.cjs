/**
 * 对齐验证截图：按指定主题出 1440 首屏 + 整页，并回报 JS 错误
 * 用法：node .tools/target-shot.cjs [themeId] [url]
 *   themeId 缺省 fresh-natural；url 缺省 http://localhost:5173/
 *   （本机 vite 只监听 IPv6 时用 http://[::1]:5173/）
 * 输出：.shots/align-<theme>-top.png / align-<theme>-full.png
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.argv[3] || 'http://localhost:5173/';
const OUT = path.join(__dirname, '..', '.shots');
const theme = process.argv[2] || 'fresh-natural';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((id) => {
    localStorage.setItem('digital-study-theme', id);
  }, theme);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT, `align-${theme}-top.png`) });
  await page.screenshot({ path: path.join(OUT, `align-${theme}-full.png`), fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(theme, 'ok, docHeight=', h, 'errors=', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
