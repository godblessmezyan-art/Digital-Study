import { icons } from './icons.js?v=cloud-realm-study-29';

export const navigationGroups = [
  { label: '探索', items: [
    { id: 'home', label: '首页', icon: 'tower', href: 'home.html#top' },
    { id: 'shelf', label: '我的书架', icon: 'tome', href: 'home.html#shelf' },
    { id: 'categories', label: '书籍分类', icon: 'astrolabe', href: 'index.html#categories' },
    { id: 'reading', label: '阅读空间', icon: 'quill', href: 'index.html#reading' },
  ] },
  { label: '创作', items: [
    { id: 'studio', label: 'AI 工坊', icon: 'scroll', href: 'index.html#studio' },
  ] },
  { label: '管理', items: [
    { id: 'content', label: '内容管理', icon: 'tome', href: 'index.html#content' },
  ] },
];

export const settingsNavigation = { id: 'settings', label: '设置', icon: 'alchemy', href: 'home.html#settings' };

function itemMarkup(item, activeId, variant) {
  const active = item.id === activeId;
  const className = variant === 'home' ? `nav__item${active ? ' is-active' : ''}` : active ? 'active' : '';
  return `<a class="${className}" data-nav-id="${item.id}" href="${item.href}"${active ? ' aria-current="page"' : ''}>${icons[item.icon]}<span>${item.label}</span></a>`;
}

export function renderSidebar(root, { variant = 'app', activeId = '', brandName = '云天幻境', brandEnglish = 'CLOUD REALM ARCHIVE', brandIcon = icons.astrolabe } = {}) {
  const brandClass = variant === 'home' ? 'brand__sigil' : 'brand-mark';
  const brand = variant === 'home'
    ? `<a class="brand" href="home.html#top">${brandIcon.replace('<svg ', '<svg class="brand__sigil" ')}<span class="brand__name">${brandName}</span><small class="brand__en">${brandEnglish}</small></a><span class="sidebar__rule" aria-hidden="true"></span>`
    : `<a class="brand" href="home.html#top"><span class="${brandClass}">${brandIcon}</span><h2>${brandName}</h2><small>${brandEnglish}</small></a><span class="sidebar-rule" aria-hidden="true"></span>`;
  const groups = navigationGroups.map(group => `<section class="nav-group"><h3>${group.label}</h3>${group.items.map(item => itemMarkup(item, activeId, variant)).join('')}</section>`).join('');
  root.innerHTML = `${brand}<nav class="nav" aria-label="主导航">${groups}</nav><div class="sidebar-settings">${itemMarkup(settingsNavigation, activeId, variant)}</div>`;
}
