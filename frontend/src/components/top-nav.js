import { h } from '../utils.js';
import { icons } from '../icons.js';

/** 顶部导航：品牌 + 搜索框 + 收藏 / 笔记 / 设置 */
export function renderTopNav(container) {
  const el = h(`
    <div class="top-nav__inner">
      <a class="brand" href="#">
        <span class="brand__mark">🌿</span>
        <span>数字书房</span>
      </a>

      <div class="search">
        ${icons.search}
        <input type="text" id="search-input" placeholder="搜索书名、作者或书签..." autocomplete="off" />
        <kbd>Ctrl&nbsp;+&nbsp;K</kbd>
      </div>

      <nav class="top-nav__actions">
        <button class="icon-btn" type="button">${icons.bookmark}<span>收藏</span></button>
        <button class="icon-btn" type="button">${icons.note}<span>笔记</span></button>
        <button class="icon-btn" type="button">${icons.sliders}<span>设置</span></button>
      </nav>
    </div>
  `);

  container.appendChild(el);

  // Ctrl + K 聚焦搜索框（静态原型的小细节）
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      el.querySelector('#search-input')?.focus();
    }
  });
}
