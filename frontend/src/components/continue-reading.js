import { h, esc } from '../utils.js';
import { recentReads, books, progressText } from '../data.js';
import { coverArt } from '../cover.js';
import { wireHearts } from './book-card.js';

/**
 * 继续阅读：左边最近读的那本（主书，大封面 + 完整状态），右边两本（小卡纵排）
 * 主次分明 = 「我最近在读什么」的叙事，而不是四张等价的数据卡
 */

/** 右侧小卡：小封面 + 书名 + 作者·进度 + 箭头 */
function sideItemHTML(book) {
  const done = book.progress >= 100;
  return `
    <div class="continue-item">
      <div class="cover cover--sm" data-cover="${book.cover}">${coverArt(book.cover)}</div>
      <div class="continue-item__info">
        <h3 class="continue-item__title">${esc(book.title)}</h3>
        <p class="continue-item__meta">${esc(book.author)} · ${done ? '已读完' : `${book.progress}%`}</p>
      </div>
      <a class="continue-item__go" href="#" aria-label="继续阅读《${esc(book.title)}》">→</a>
    </div>
  `;
}

export function renderContinueReading() {
  const list = recentReads
    .map(({ bookId }) => books.find((b) => b.id === bookId))
    .filter(Boolean);
  const [main, ...rest] = list;
  const side = rest.slice(0, 2);

  if (!main) {
    return h(`
      <section class="section" id="sec-continue">
        <h2 class="section-title section-title--leaf">继续阅读</h2>
        <p class="shelf-empty">还没有正在读的书，去书架挑一本吧 🌱</p>
      </section>
    `);
  }

  const done = main.progress >= 100;

  const el = h(`
    <section class="section" id="sec-continue">
      <h2 class="section-title section-title--leaf">继续阅读</h2>
      <div class="continue-wrap">
        <article class="continue-main">
          <div class="cover" data-cover="${main.cover}">${coverArt(main.cover)}</div>
          <div class="continue-main__info">
            <h3 class="continue-main__title">${esc(main.title)}</h3>
            <p class="continue-main__meta">${esc(main.author)} · ${esc(progressText(main))}</p>
            <div class="continue-main__foot">
              <div class="progress ${done ? 'is-done' : ''}"><i style="width:${main.progress}%"></i></div>
              <span class="continue-main__pct">${done ? '已读完' : `${main.progress}%`}</span>
              <button class="book-card__heart" type="button" title="收藏" aria-label="收藏">♡</button>
            </div>
            <a class="continue-main__go" href="#">继续阅读 →</a>
          </div>
        </article>
        <div class="continue-side">
          ${side.map(sideItemHTML).join('')}
        </div>
      </div>
    </section>
  `);

  wireHearts(el);
  return el;
}
