import { h, esc } from '../utils.js';
import { booksByCategory, progressText } from '../data.js';
import { coverArt } from '../cover.js';

/** 生成单本书的卡片（设计图 02：水彩封面 + 完整不透明卡片） */
function bookCardHTML(book) {
  const done = book.progress >= 100;
  return `
    <article class="book-card">
      <div class="cover" data-cover="${book.cover}">${coverArt(book.cover)}</div>
      <div class="book-card__body">
        <h3 class="book-card__title">${esc(book.title)}</h3>
        <p class="book-card__author">${esc(book.author)}</p>
        <p class="book-card__meta">${esc(progressText(book))}</p>
        <div class="book-card__foot">
          <div class="progress ${done ? 'is-done' : ''}"><i style="width:${book.progress}%"></i></div>
          <span class="book-card__pct">${done ? '已读完' : `${book.progress}%`}</span>
        </div>
      </div>
    </article>
  `;
}

/** 书架：书籍卡片网格（随分类切换过滤） */
export function renderBookshelf() {
  const el = h(`
    <section class="section" id="sec-shelf">
      <h2 class="section-title section-title--leaf">我的书架</h2>
      <div class="shelf-grid"></div>
    </section>
  `);

  const grid = el.querySelector('.shelf-grid');

  const paint = (catId) => {
    const list = booksByCategory(catId);
    if (!list.length) {
      grid.innerHTML = '<p class="shelf-empty">这个书架还空着，去挑一本书吧 🌱</p>';
      return;
    }
    // 平铺 4 列卡片网格（设计图 02 §15），不再有架板/书墙分层
    grid.innerHTML = list.map(bookCardHTML).join('');
  };

  paint('all');
  document.addEventListener('study:category', (e) => paint(e.detail.catId));

  return el;
}
