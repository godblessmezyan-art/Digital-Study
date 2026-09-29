import { icons } from './icons.js?v=cloud-realm-study-29';

export const navigationGroups = [
  { label: '书房', items: [
    { id: 'home', label: '首页', icon: 'tower', href: 'home.html#top' },
    { id: 'shelf', label: '我的书架', icon: 'tome', href: 'index.html#shelf' },
    { id: 'categories', label: '书籍分类', icon: 'astrolabe', href: 'index.html#categories' },
  ] },
  { label: '记录', items: [
    { id: 'reading', label: '阅读空间', icon: 'hourglass', href: 'index.html#reading' },
    { id: 'journal', label: '旅者手记', icon: 'journal', href: 'journal' },
    { id: 'plans', label: '计划', icon: 'compass', href: 'plans' },
  ] },
  { label: '创作', items: [
    { id: 'studio', label: 'AI 工坊', icon: 'scroll', href: 'index.html#studio' },
    { id: 'curator', label: 'AI 馆长', icon: 'search', href: 'index.html#curator' },
  ] },
  { label: '管理', items: [
    { id: 'content', label: '内容管理', icon: 'tome', href: 'index.html#content' },
  ] },
];

export const settingsNavigation = { id: 'settings', label: '设置', icon: 'alchemy', href: 'home.html#settings' };

const groupEnglish = {
  '书房': 'COLLECTION',
  '记录': 'JOURNAL',
  '创作': 'WORKSHOP',
  '管理': 'ARCHIVE',
};

const weatherLabels = {
  clear: ['☀', '晴朗'], cloudy: ['☁', '多云'], rain: ['☂', '雨'], snow: ['❄', '雪'],
};

function itemMarkup(item, activeId) {
  const active = item.id === activeId;
  const className = `nav__item${active ? ' is-active' : ''}`;
  return `<a class="${className}" data-nav-id="${item.id}" href="${item.href}"${active ? ' aria-current="page"' : ''}><i class="nav__node" aria-hidden="true">${icons[item.icon]}</i><span>${item.label}</span></a>`;
}

function bindSidebarWorldStatus(root, brandName) {
  const weather = root.querySelector('[data-sidebar-weather]');
  const clock = root.querySelector('[data-sidebar-time]');
  const updateClock = () => { if (clock) clock.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); };
  const updateWeather = value => {
    const [icon, label] = weatherLabels[value] || weatherLabels.clear;
    if (weather) weather.innerHTML = `<i aria-hidden="true">${icon}</i>${label}`;
  };
  root.querySelector('[data-sidebar-world-name]').textContent = brandName;
  updateClock();
  updateWeather(document.documentElement.dataset.worldWeather);
  window.addEventListener('worldchange', event => updateWeather(event.detail.weather));
  clearInterval(window.__sidebarWorldClock);
  window.__sidebarWorldClock = window.setInterval(updateClock, 30_000);
}

function bindMobileNavigation(root, brandName) {
  let bar = document.querySelector('[data-mobile-navigation], .mobilebar');
  if (!bar) {
    bar = document.createElement('header');
    root.insertAdjacentElement('afterend', bar);
  }
  bar.className = 'mobilebar';
  bar.dataset.mobileNavigation = '';
  bar.innerHTML = `<button class="mobilebar__toggle" id="menuButton" type="button" aria-label="打开导航" aria-controls="sidebar" aria-expanded="false"><i></i><i></i><i></i></button><a class="mobilebar__brand" href="home.html#top"><b>${brandName}</b><small>CLOUD REALM</small></a><span class="mobilebar__coordinate" aria-hidden="true">✦</span>`;

  let scrim = document.querySelector('[data-sidebar-scrim]');
  if (!scrim) {
    scrim = document.createElement('button');
    scrim.type = 'button';
    scrim.className = 'sidebar-scrim';
    scrim.dataset.sidebarScrim = '';
    scrim.setAttribute('aria-label', '关闭导航');
    root.insertAdjacentElement('afterend', scrim);
  }

  const toggle = bar.querySelector('#menuButton');
  const setOpen = open => {
    root.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  scrim.addEventListener('click', () => setOpen(false));
  root.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root.classList.contains('open')) setOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 820) setOpen(false);
  });
}

export function renderSidebar(root, { variant = 'app', activeId = '', brandName = '云天幻境', brandEnglish = 'CLOUD REALM ARCHIVE', brandIcon = icons.astrolabe } = {}) {
  const sigil = brandIcon.includes('<svg ') ? brandIcon.replace('<svg ', '<svg class="brand__sigil" ') : brandIcon;
  const brand = `<a class="brand" href="home.html#top"><span class="brand__instrument" aria-hidden="true"><span class="brand__stars"></span>${sigil}</span><span class="brand__name">${brandName}</span><small class="brand__en">${brandEnglish}</small></a><span class="sidebar__rule" aria-hidden="true"><i>✦</i></span>`;
  const groups = navigationGroups.map(group => `<section class="nav-group"><h3><i aria-hidden="true"></i><span>${group.label}</span><small>${groupEnglish[group.label]}</small></h3>${group.items.map(item => itemMarkup(item, activeId)).join('')}</section>`).join('');
  const worldStatus = `<aside class="sidebar-world-status" aria-label="世界状态"><small>WORLD STATUS</small><strong data-sidebar-world-name>${brandName}</strong><p><span data-sidebar-weather><i aria-hidden="true">☀</i>晴朗</span><b aria-hidden="true">·</b><time data-sidebar-time>--:--</time></p></aside>`;
  root.innerHTML = `<span class="sidebar__chart" aria-hidden="true"></span>${brand}<nav class="nav" aria-label="主导航">${groups}</nav>${worldStatus}<div class="sidebar-settings">${itemMarkup(settingsNavigation, activeId)}</div>`;
  bindSidebarWorldStatus(root, brandName);
  bindMobileNavigation(root, brandName);
}
