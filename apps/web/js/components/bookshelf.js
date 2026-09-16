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
      <div class="shelf-grid page-grid-4"></div>
    </section>
  `);

  const grid = el.querySelector('.shelf-grid');
  let activeCategory = 'all';
  let searchQuery = '';

  const paint = (catId) => {
    activeCategory = catId;
    const list = booksByCategory(catId).filter((book) => {
      const target = `${book.title} ${book.author}`.toLowerCase();
      return !searchQuery || target.includes(searchQuery.toLowerCase());
    });
    if (!list.length) {
      grid.innerHTML = '<p class="shelf-empty">这个书架还空着，去挑一本书吧 🌱</p>';
      return;
    }
    grid.innerHTML = list.map(bookCardHTML).join('');
  };

  paint('all');
  document.addEventListener('study:category', (e) => paint(e.detail.catId));
  document.addEventListener('study:search', (e) => {
    searchQuery = e.detail.query;
    paint(activeCategory);
  });

  return el;
}
