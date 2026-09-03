import { h, esc } from '../utils.js';
import { recentReads, books, progressText } from '../data.js';
import { coverArt } from '../cover.js';

/**
 * 继续阅读：左侧为正在读的书（水彩封面 + 进度），右侧为最近翻开的两三本
 */
export function renderContinueReading() {
  const [featuredRef, ...others] = recentReads;
  const featured = books.find((b) => b.id === featuredRef.bookId);

  const listItems = others.map(({ bookId }) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return '';
    return `
      <div class="continue-item">
        <div class="cover cover--sm" data-cover="${book.cover}">${coverArt(book.cover)}</div>
        <div class="continue-item__info">
          <h3 class="continue-item__title">${esc(book.title)}</h3>
          <p class="continue-item__meta">${esc(book.author)} · ${book.progress}%</p>
        </div>
        <a class="continue-item__go" href="#">继续阅读 →</a>
      </div>
    `;
  }).join('');

  return h(`
    <section class="section" id="sec-continue">
      <h2 class="section-title section-title--leaf">继续阅读</h2>
      <div class="continue-wrap">
        <article class="continue-featured">
          <div class="cover" data-cover="${featured.cover}">${coverArt(featured.cover)}</div>
          <div class="continue-featured__info">
            <h3 class="continue-featured__title">${esc(featured.title)}</h3>
            <p class="continue-featured__meta">${esc(featured.author)} · ${esc(progressText(featured))}</p>
            <div class="continue-featured__progress">
              <div class="progress"><i style="width:${featured.progress}%"></i></div>
              <span class="continue-featured__pct">阅读进度 ${featured.progress}%</span>
            </div>
            <div>
              <button class="btn btn-primary" type="button">继续阅读 →</button>
            </div>
          </div>
        </article>
        <div class="continue-list">${listItems}</div>
      </div>
    </section>
  `);
}
