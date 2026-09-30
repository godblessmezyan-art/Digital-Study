import { icons } from './icons.js?v=cloud-realm-study-30';
import { PAGE_NAMES, WORLD } from './world-naming.js?v=1';

export const navigationGroups = [
  { label: '书房', items: [
    { id: 'home', label: '首页', icon: 'tower', href: 'home.html#top' },
    { id: 'shelf', label: PAGE_NAMES.shelf.zh, icon: 'tome', href: 'index.html#shelf' },
    { id: 'categories', label: PAGE_NAMES.categories.zh, icon: 'catalog', href: 'index.html#categories' },
  ] },
  { label: '记录', items: [
    { id: 'reading', label: PAGE_NAMES.reading.zh, icon: 'hourglass', href: 'index.html#reading' },
    { id: 'journal', label: PAGE_NAMES.journal.zh, icon: 'journal', href: 'journal' },
    { id: 'plans', label: PAGE_NAMES.plans.zh, icon: 'plan', href: 'plans' },
  ] },
  { label: '创作', items: [
    { id: 'studio', label: PAGE_NAMES.studio.zh, icon: 'scroll', href: 'index.html#studio' },
    { id: 'curator', label: PAGE_NAMES.curator.zh, icon: 'search', href: 'index.html#curator' },
    { id: 'inscriptions', label: PAGE_NAMES.inscriptions.zh, icon: 'quill', href: 'index.html#inscriptions' },
  ] },
  { label: '管理', items: [
    { id: 'content', label: PAGE_NAMES.content.zh, icon: 'archive', href: 'index.html#content' },
  ] },
];

export const settingsNavigation = { id: 'settings', label: PAGE_NAMES.settings.zh, icon: 'alchemy', href: 'home.html#settings' };

export { WORLD };

function itemMarkup(item, activeId) {
  const active = item.id === activeId;
  const className = `nav__item${active ? ' is-active' : ''}`;
  return `<a class="${className}" data-nav-id="${item.id}" href="${item.href}"${active ? ' aria-current="page"' : ''}>${icons[item.icon]}<span>${item.label}</span></a>`;
}

export function renderSidebar(root, { variant = 'app', activeId = '', brandName = '云天幻境', brandEnglish = 'CLOUD REALM ARCHIVE', brandIcon = icons.astrolabe } = {}) {
  const sigil = brandIcon.includes('<svg ') ? brandIcon.replace('<svg ', '<svg class="brand__sigil" ') : brandIcon;
  const brand = `<a class="brand" href="home.html#top">${sigil}<span class="brand__name">${brandName}</span><small class="brand__en">${brandEnglish}</small></a><span class="sidebar__rule" aria-hidden="true"></span>`;
  const groups = navigationGroups.map(group => `<section class="nav-group"><h3>${group.label}</h3>${group.items.map(item => itemMarkup(item, activeId)).join('')}</section>`).join('');
  root.innerHTML = `${brand}<nav class="nav" aria-label="主导航">${groups}</nav><div class="sidebar-settings">${itemMarkup(settingsNavigation, activeId)}</div>`;
}
