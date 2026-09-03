import { h } from '../utils.js';
import { icons } from '../icons.js';
import { books } from '../data.js';
import { renderCategories } from './categories.js';
import { renderBookGrid } from './bookshelf.js';

/**
 * 书架页（#/shelf）：全部书籍 + 分类筛选 + 搜索 + 收藏心形
 * 「我的书架」不再挤在首页——首页是阅读入口，这里才是书房的管理桌
 */
export function renderShelfPage() {
  const el = h(`
    <div class="shelf-page">
      <div class="shelf-tools">
        <div class="search search--page">
          ${icons.search}
          <input type="text" id="shelf-search" placeholder="在书架里找一本书..." autocomplete="off" />
        </div>
      </div>
    </div>
  `);

  el.appendChild(renderCategories());
  el.appendChild(renderBookGrid(books));

  const grid = el.querySelector('.shelf-grid');
  const input = el.querySelector('#shelf-search');
  let catId = 'all';
  let query = '';

  const repaint = () => {
    const q = query.trim().toLowerCase();
    const list = (catId === 'all' ? books : books.filter((b) => b.category === catId))
      .filter((b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    grid.paint(list);
  };

  // 分类：来自书架页分类条或侧栏「我的分类」
  document.addEventListener('study:category', (e) => { catId = e.detail.catId; repaint(); });

  // 搜索：顶栏搜索框（跨视图）与本页搜索框共用 study:search 事件
  document.addEventListener('study:search', (e) => {
    query = e.detail.query || '';
    if (input.value !== query) input.value = query;
    repaint();
  });

  input.addEventListener('input', () => {
    document.dispatchEvent(new CustomEvent('study:search', { detail: { query: input.value } }));
  });

  return el;
}
