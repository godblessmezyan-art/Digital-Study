import { h, esc } from '../utils.js';
import { icons } from '../icons.js';
import { categories } from '../data.js';
import { openSettings } from './settings.js';

/**
 * 左侧导航：书房侧厅（品牌只在顶栏左上角出现一次，侧栏直接从「首页」开始）
 * 结构：主目录 → 我的分类（联动书架）→ 底部名言 + 盆栽
 * 分类点击派发 study:category 事件（与书架/分类区联动）
 */

const ITEMS = [
  { label: '首页',   icon: 'home',      active: true, target: null },
  { label: '书架',   icon: 'bookshelf', target: '#sec-shelf' },
  { label: '分类',   icon: 'folder',    target: '#sec-cats' },
  { label: '笔记',   icon: 'note',      target: '#sec-bookmarks' },
  { label: '书摘',   icon: 'bookmark',  target: '#sec-bookmarks' },
  { label: '时间线', icon: 'clock',     target: null },
  { label: '设置',   icon: 'sliders',   action: 'settings' },
];

/** 侧栏「我的分类」：真实分类数据（除「全部书籍」），点击联动书架过滤 */
const SIDE_CATS = categories.filter((c) => c.id !== 'all');

export function renderSideNav(container) {
  const ul = h('<ul></ul>');

  const addLi = (node) => {
    const li = document.createElement('li');
    li.appendChild(node);
    ul.appendChild(li);
  };

  // 直接从主目录开始（不再放「书房」铭牌）
  ITEMS.forEach((item) => {
    const btn = h(`
      <button class="side-nav__item ${item.active ? 'is-active' : ''}" type="button">
        ${icons[item.icon]}
        <span>${item.label}</span>
      </button>
    `);
    btn.addEventListener('click', () => {
      // 设置项：不改变选中态，直接打开主题面板
      if (item.action === 'settings') { openSettings(); return; }
      ul.querySelectorAll('.side-nav__item:not(.side-nav__item--cat).is-active')
        .forEach((n) => n.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (item.target) document.querySelector(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    addLi(btn);
  });

  addLi(h('<div class="side-nav__divider" aria-hidden="true"></div>'));

  // 我的分类（书房目录索引）
  addLi(h('<p class="side-nav__label">我的分类</p>'));
  SIDE_CATS.forEach((cat) => {
    const btn = h(`
      <button class="side-nav__item side-nav__item--cat" type="button" data-cat="${cat.id}">
        ${icons[cat.icon]}
        <span>${esc(cat.name)}</span>
        <span class="side-nav__count">${cat.count}</span>
      </button>
    `);
    btn.addEventListener('click', () => {
      ul.querySelectorAll('.side-nav__item--cat.is-active').forEach((n) => n.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.dispatchEvent(new CustomEvent('study:category', { detail: { catId: cat.id, source: 'sidenav' } }));
      document.querySelector('#sec-shelf')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    addLi(btn);
  });

  // 底部名言 + 小盆栽（属于书房空间的绿植）
  addLi(h('<p class="side-nav__quote">一本好书，<br />就是一位好朋友。</p>'));
  addLi(h(`
    <svg class="side-nav__plant" viewBox="0 0 60 66" aria-hidden="true">
      <g class="leaf">
        <path d="M30 46 C 28 30, 18 22, 10 19 C 22 20, 29 30, 30 46 Z" opacity="0.9"/>
        <path d="M31 46 C 32 28, 40 20, 50 17 C 40 23, 33 32, 31 46 Z" opacity="0.85"/>
        <path d="M30 46 C 30 28, 28 16, 27 6 C 34 18, 32 34, 30 46 Z"/>
      </g>
      <path class="pot" d="M20 46 h20 l-3 14 H23 Z"/>
    </svg>
  `));

  container.appendChild(ul);
}
