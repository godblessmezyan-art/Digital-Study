import { h } from '../utils.js';
import { icons } from '../icons.js';
import { openSettings } from './settings.js';

/** 顶部导航（书房顶部工具栏）：📚 书房 / Demian Library + 搜索 + 设置/头像
   收敛原则：元素尽量少而统一，不做 SaaS 网站导航（无铃铛/无快捷键提示） */
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
      </div>

      <nav class="top-nav__actions">
        <button class="icon-btn" type="button" title="设置">${icons.sliders}</button>
        <div class="top-nav__avatar" title="Administrator">👤</div>
      </nav>
    </div>
  `);

  container.appendChild(el);

  // ⚙ 设置 → 主题切换面板
  el.querySelector('.icon-btn[title="设置"]')?.addEventListener('click', openSettings);

  // 搜索：派发 study:search（书架页监听过滤）；在首页输入时自动带到书架页
  const input = el.querySelector('#search-input');
  input?.addEventListener('input', () => {
    if (input.value.trim() && !location.hash.startsWith('#/shelf')) location.hash = '#/shelf';
    document.dispatchEvent(new CustomEvent('study:search', { detail: { query: input.value } }));
  });

  // Ctrl + K 聚焦搜索框（快捷键保留，界面不再展示 kbd 提示）
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      el.querySelector('#search-input')?.focus();
    }
  });
}
