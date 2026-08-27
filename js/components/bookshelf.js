import { h, esc } from '../utils.js';
import { booksByCategory, progressText } from '../data.js';

/** 生成单本书的卡片 */
function bookCardHTML(book) {
  const done = book.progress >= 100;
  return `
    <article class="book-card">
      <div class="book-card__slot">
        <div class="cover" data-cover="${book.cover}">
          <div class="cover__title">${esc(book.title)}</div>
          <div class="cover__author">${esc(book.author)}</div>
          <span class="cover__leaf">🌿</span>
        </div>
      </div>
      <div>
        <h3 class="book-card__title">${esc(book.title)}</h3>
        <p class="book-card__author">${esc(book.author)}</p>
      </div>
      <p class="book-card__meta">${esc(progressText(book))}</p>
      <div class="book-card__foot">
        <div class="progress ${done ? 'is-done' : ''}"><i style="width:${book.progress}%"></i></div>
        <span class="book-card__pct">${done ? '已读完' : `${book.progress}%`}</span>
      </div>
    </article>
  `;
}

/** 书架：书籍卡片网格（随分类切换过滤） */
export function renderBookshelf() {
  const el = h(`
    <section class="section" id="sec-shelf">
      <h2 class="section-title section-title--leaf">我的书架</h2>
      <div class="shelf-grid page-grid-4"></div>
    </section>
  `);

  const grid = el.querySelector('.shelf-grid');

  const paint = (catId) => {
    const list = booksByCategory(catId);
    if (!list.length) {
      grid.innerHTML = '<p class="shelf-empty">这个书架还空着，去挑一本书吧 🌱</p>';
      return;
    }
    // 按每排 4 本排成「一排书架」：每排落在自己的木架上，形成有节奏的书墙，而非一整块库存网格
    const rows = [];
    for (let i = 0; i < list.length; i += 4) rows.push(list.slice(i, i + 4));
    grid.innerHTML = rows.map((row) => `
      <div class="shelf-row">
        <div class="shelf-row__books">${row.map(bookCardHTML).join('')}</div>
        <div class="shelf-row__board" aria-hidden="true"></div>
      </div>
    `).join('');
  };

  paint('all');
  document.addEventListener('study:category', (e) => paint(e.detail.catId));

  return el;
}
