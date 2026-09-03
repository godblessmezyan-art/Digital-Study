/**
 * 六主题截图验证：
 * - 每主题 1920×1080 桌面首屏（localStorage 预置主题）
 * - dream-illustration 加测 390×844 移动端（全屏背景模式）
 * - warm-study 加测设置面板打开状态
 * - 每档输出横向溢出度量
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:5175/';
const OUT = path.join(__dirname, '..', '.shots');

const THEMES = ['fresh-natural', 'warm-study', 'night-library', 'minimal-white', 'retro-paper', 'dream-illustration'];

const METRIC_FN = () => {
  const de = document.documentElement;
  return {
    viewport: de.clientWidth,
    docScrollW: de.scrollWidth,
    hOverflow: de.scrollWidth > de.clientWidth,
    theme: de.dataset.theme,
  };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--disable-gpu', '--hide-scrollbars'],
  });

  for (const t of THEMES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((id) => {
      localStorage.setItem('digital-study-theme', id);
    }, t);
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 900));
    const m = await page.evaluate(METRIC_FN);
    await page.screenshot({ path: path.join(OUT, `th-${t}-1920.png`) });
    console.log(t, '1920', JSON.stringify(m));

    // dream 主题加测移动端（全屏背景模式在 ≤900 是否生效）
    if (t === 'dream-illustration') {
      const mp = await browser.newPage();
      await mp.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await mp.evaluateOnNewDocument((id) => localStorage.setItem('digital-study-theme', id), t);
      await mp.goto(URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 900));
      const mm = await mp.evaluate(METRIC_FN);
      await mp.screenshot({ path: path.join(OUT, `th-${t}-390.png`) });
      console.log(t, '390', JSON.stringify(mm));
      await mp.close();
    }

    // warm-study 加测设置面板
    if (t === 'warm-study') {
      await page.evaluate(() => {
        const btn = document.querySelector('.icon-btn[title="设置"]');
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(OUT, 'th-settings-panel.png') });
      const opened = await page.evaluate(() => !!document.querySelector('.settings-overlay.is-open'));
      const tiles = await page.evaluate(() => document.querySelectorAll('.theme-tile').length);
      console.log('settings panel opened:', opened, 'tiles:', tiles);
      // 面板里点一下「插画梦境」验证切换链路
      await page.evaluate(() => {
        const tile = document.querySelector('.theme-tile[data-theme-id="dream-illustration"]');
        if (tile) tile.click();
      });
      await new Promise((r) => setTimeout(r, 700));
      const switched = await page.evaluate(() => document.documentElement.dataset.theme);
      await page.screenshot({ path: path.join(OUT, 'th-switched-to-dream.png') });
      console.log('after click tile, data-theme =', switched);
    }

    await page.close();
  }

  await browser.close();
  console.log('THEME SHOTS DONE');
})().catch((e) => { console.error(e); process.exit(1); });
