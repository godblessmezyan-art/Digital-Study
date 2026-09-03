import { h, esc } from '../utils.js';
import { icons } from '../icons.js';
import { bookmarks } from '../data.js';

/** 今日书签：摘录卡片 */
export function renderBookmarks() {
  const cards = bookmarks.map((b) => `
    <article class="bookmark-card">
      <div class="bookmark-card__icon">${icons.bookmark}</div>
      <p class="bookmark-card__quote">${esc(b.quote)}</p>
      <div class="bookmark-card__foot">
        <span>${esc(b.source)} · ${esc(b.meta)}</span>
        <a class="bookmark-card__go" href="#">继续阅读 →</a>
      </div>
    </article>
  `).join('');

  return h(`
    <section class="section" id="sec-bookmarks">
      <h2 class="section-title">今日书签</h2>
      <div class="bookmark-grid">${cards}</div>
    </section>
  `);
}
