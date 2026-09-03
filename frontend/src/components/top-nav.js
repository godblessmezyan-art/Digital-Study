import { h } from '../utils.js';
import { icons } from '../icons.js';
import { openSettings } from './settings.js';

/** 顶部导航（设计图 02 §12）：📚 书房 / Demian Library + 搜索 + 铃铛/设置/头像 */
export function renderTopNav(container) {
  const el = h(`
    <div class="top-nav__inner">
      <a class="brand" href="#">
        <span class="brand__mark">📚</span>
        <span>书房</span>
        <span class="brand__sub">Demian Library</span>
      </a>

      <div class="search">
        ${icons.search}
        <input type="text" id="search-input" placeholder="搜索书名、作者、标签..." autocomplete="off" />
        <kbd>Ctrl&nbsp;+&nbsp;K</kbd>
      </div>

      <nav class="top-nav__actions">
        <button class="icon-btn" type="button" title="通知">${icons.bell}</button>
        <button class="icon-btn" type="button" title="设置">${icons.sliders}</button>
        <div class="top-nav__avatar" title="Administrator">👤</div>
      </nav>
    </div>
  `);

  container.appendChild(el);

  // ⚙ 设置 → 主题切换面板
  el.querySelector('.icon-btn[title="设置"]')?.addEventListener('click', openSettings);

  // Ctrl + K 聚焦搜索框（静态原型的小细节）
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      el.querySelector('#search-input')?.focus();
    }
  });
}
