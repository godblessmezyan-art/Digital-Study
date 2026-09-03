import { h, esc } from '../utils.js';
import { themeAsset } from '../theme.js';
import { bookmarks } from '../data.js';

/**
 * Hero：纸面上的开场白（非 Banner 卡片）
 * - 桌面端：文字直接落在纸面，右侧插画由 body 级 .env-art 环境层承担
 * - 移动端（≤900）：恢复卡片壳，场景图在 Hero 内部纵排展示
 * - 今日书签手记卡：叠在右侧插画上，数据取 bookmarks[0]（真实数据，不新增）
 */
export function renderHero() {
  const today = bookmarks[0];
  const el = h(`
    <section class="hero">
      <div class="hero__text">
        <span class="hero__badge">🌿 书房</span>
        <h1 class="hero__title">在书的世界里，<br />慢慢成为自己</h1>
        <p class="hero__desc">每天一点阅读，给思想留一点空间。</p>
        <div class="hero__actions">
          <button class="btn btn-primary" type="button">开始阅读</button>
          <button class="btn btn-soft" type="button">继续阅读</button>
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

  // 主题切换时同步更换移动端 Hero 场景图（桌面端 env-art 由 CSS 令牌自动切换）
  document.addEventListener('study:theme', () => {
    const img = el.querySelector('.hero__scene img');
    if (img) img.src = themeAsset('hero.png');
  });

  return el;
}
