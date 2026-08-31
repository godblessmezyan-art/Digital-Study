import { h } from '../utils.js';
import { icons } from '../icons.js';
import { categories } from '../data.js';

/**
 * 左侧导航：私人书房目录
 * 分组 + 极淡分隔线 + 「我的分类」书房索引，而非后台侧边栏
 */

const MAIN_ITEMS = [
  { label: '首页',     icon: 'home',      active: true, target: null },
  { label: '我的书架', icon: 'bookshelf', target: '#sec-shelf' },
  { label: '最近阅读', icon: 'clock',     target: '#sec-continue' },
];

const STUDY_ITEMS = [
  { label: '阅读统计', icon: 'chart', target: '#sec-stats' },
  { label: '读书笔记', icon: 'note',  target: null },
  { label: '收藏',     icon: 'star',  target: null },
];

/** 侧栏「我的分类」只取四个常读分类，作为轻量书房索引 */
const SIDE_CAT_IDS = ['lit', 'philo', 'mind', 'life'];

function navItem(item, extraClass = '') {
  return h(`
    <button class="side-nav__item ${extraClass} ${item.active ? 'is-active' : ''}" type="button">
      ${icons[item.icon]}
      <span>${item.label}</span>
    </button>
  `);
}

export function renderSideNav(container) {
  const ul = h('<ul></ul>');
  const allItems = [];

  const addLi = (node) => {
    const li = document.createElement('li');
    li.appendChild(node);
    ul.appendChild(li);
  };

  const addDivider = () => addLi(h('<div class="side-nav__divider" aria-hidden="true"></div>'));

  // 主目录
  MAIN_ITEMS.forEach((item) => {
    const btn = navItem(item);
    btn.addEventListener('click', () => {
      ul.querySelectorAll('.is-active').forEach((n) => n.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (item.target) document.querySelector(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    allItems.push(btn);
    addLi(btn);
  });

  addDivider();

  // 书房工具
  STUDY_ITEMS.forEach((item) => {
    const btn = navItem(item);
    btn.addEventListener('click', () => {
      ul.querySelectorAll('.is-active').forEach((n) => n.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (item.target) document.querySelector(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    allItems.push(btn);
    addLi(btn);
  });

  addDivider();

  // 我的分类（书房索引）
  addLi(h('<p class="side-nav__label">我的分类</p>'));
  SIDE_CAT_IDS.forEach((catId) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const btn = h(`
      <button class="side-nav__item side-nav__item--cat" type="button" data-cat="${cat.id}">
        ${icons[cat.icon]}
        <span>${cat.name}</span>
        <span class="side-nav__count">${cat.count}</span>
      </button>
    `);
    btn.addEventListener('click', () => {
      ul.querySelectorAll('.side-nav__item--cat.is-active').forEach((n) => n.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.dispatchEvent(new CustomEvent('study:category', { detail: { catId, source: 'sidenav' } }));
      document.querySelector('#sec-shelf')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    addLi(btn);
  });

  addDivider();

  // 设置
  const settingsBtn = navItem({ label: '设置', icon: 'sliders' });
  addLi(settingsBtn);

  container.appendChild(ul);
}
