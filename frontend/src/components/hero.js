import { h, esc } from '../utils.js';
import { themeAsset } from '../theme.js';
import { bookmarks } from '../data.js';

/**
 * Hero：纸面上的开场白（非 Banner 卡片）
 * - 桌面端：文字直接落在纸面，右侧插画由 body 级 .env-art 环境层承担
 * - 移动端（≤900）：恢复卡片壳，场景图在 Hero 内部纵排展示
 * - 今日书签手记卡：叠在右侧插画上，数据取 bookmarks[0]（真实数据，不新增）
 */
/**
 * 时辰问候：按当前时间给一句生活式提醒（情绪细节，不接数据层）
 * 只影响文案，所有主题共用
 */
function greeting() {
  const hr = new Date().getHours();
  if (hr < 6) return '夜深了，读一页就睡。';
  if (hr < 9) return '清晨好，先读几页再出门。';
  if (hr < 12) return '上午好，泡杯茶，翻开书。';
  if (hr < 14) return '午后阳光正好，适合读书。';
  if (hr < 18) return '下午了，歇一歇，读两页。';
  if (hr < 22) return '傍晚了，读两页再吃饭。';
  return '夜里安静，正适合读书。';
}

export function renderHero() {
  const today = bookmarks[0];
  const el = h(`
    <section class="hero">
      <div class="hero__text">
        <span class="hero__badge">🌿 书房</span>
        <h1 class="hero__title">在书的世界里，<br />慢慢成为自己</h1>
        <p class="hero__desc">每天一点阅读，给思想留一点空间。</p>
        <p class="hero__greeting">${greeting()}</p>
        <div class="hero__actions">
          <button class="btn btn-primary" type="button" data-go="continue">开始阅读</button>
          <button class="btn btn-soft" type="button" data-go="shelf">去书架逛逛</button>
        </div>
      </div>

      <!-- 今日书签手记卡：贴在书房墙上的一张纸 -->
      <aside class="today-note" aria-label="今日书签">
        <span class="today-note__tag">📌 手记</span>
        <p class="today-note__quote">「${esc(today.quote)}」</p>
        <p class="today-note__src">今日书签 · ${esc(today.source)}</p>
      </aside>

      <div class="hero__scene">
        <img src="${themeAsset('hero.png')}" alt="温暖手绘书房：书桌、台灯、书堆、绿植与打盹的猫" />
      </div>
    </section>
  `);

  // 主按钮 → 首屏下方的「继续阅读」；次按钮 → 书架页（hash 路由）
  el.querySelector('[data-go="continue"]')?.addEventListener('click', () => {
    document.getElementById('sec-continue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  el.querySelector('[data-go="shelf"]')?.addEventListener('click', () => {
    location.hash = '#/shelf';
  });

  // 主题切换时同步更换移动端 Hero 场景图（桌面端 env-art 由 CSS 令牌自动切换）
  document.addEventListener('study:theme', () => {
    const img = el.querySelector('.hero__scene img');
    if (img) img.src = themeAsset('hero.png');
  });

  return el;
}
