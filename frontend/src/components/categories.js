import { h, esc } from '../utils.js';
import { icons } from '../icons.js';
import { categories, books } from '../data.js';

/**
 * 书架分类：书房里的分类索引（非筛选器）
 * 通过 study:category 事件与侧栏「我的分类」、书架联动
 */
export function renderCategories() {
  const items = categories.map((c) => `
    <button class="cat-index__item ${c.id === 'all' ? 'is-active' : ''}" type="button" data-cat="${c.id}">
      <span class="cat-index__icon">${icons[c.icon]}</span>
      <span class="cat-index__name">${esc(c.name)}</span>
      <span class="cat-index__count">${c.count} 本</span>
    </button>
  `).join('');

  const el = h(`
    <section class="section section--compact" id="sec-cats">
      <div class="section-head">
        <h2 class="section-title">书架分类</h2>
        <p class="section-sub" id="cat-sub">共 ${books.length} 本书籍 · 已读 ${books.filter((b) => b.progress >= 100).length} 本</p>
      </div>
      <div class="cat-index">${items}</div>
    </section>
  `);

  const sub = el.querySelector('#cat-sub');

  const applyState = (catId) => {
    el.querySelectorAll('.cat-index__item').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.cat === catId);
    });
    if (catId === 'all') {
      sub.textContent = `共 ${books.length} 本书籍 · 已读 ${books.filter((b) => b.progress >= 100).length} 本`;
    } else {
      const cat = categories.find((c) => c.id === catId);
      sub.textContent = `「${cat.name}」这一格 · ${cat.count} 本`;
    }
  };

  el.querySelectorAll('.cat-index__item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('study:category', { detail: { catId: btn.dataset.cat, source: 'cat-index' } }));
    });
  });

  document.addEventListener('study:category', (e) => applyState(e.detail.catId));

  return el;
}
