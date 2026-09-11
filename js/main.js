import { icons } from './icons.js?v=cloud-realm-study-29';
import {
  books, categories, dailyBookmarks, notes, popularCategories, quotes, stats,
} from './data.js?v=cloud-realm-study-29';
import { applyScene, initTheme } from './theme.js?v=cloud-realm-study-35';

const theme = initTheme();
const app = document.querySelector('#app');
const sidebar = document.querySelector('#sidebar');
const topbar = document.querySelector('#topbar');
const toast = document.querySelector('#toast');
const sceneCaption = document.querySelector('#scene-caption');
let activeCategory = 'all';
let query = '';
let bookmarkIndex = 0;
let atlasSceneId = document.documentElement.dataset.scene;
let atlasViewId = document.documentElement.dataset.sceneView || 'default';

const navItems = [
  ['首页', 'tower', '#top'], ['我的书架', 'tome', '#shelf'], ['书籍分类', 'astrolabe', '#categories'],
  ['阅读笔记', 'quill', '#notes'], ['精选书摘', 'scroll', '#quotes'], ['时间线', 'hourglass', '#shelf'],
  ['设置', 'alchemy', '#settings'],
];

const sigil = icons[theme.logo].replace('<svg ', '<svg class="brand__sigil" ');

sidebar.innerHTML = `
  <a class="brand" href="#top">${sigil}<span class="brand__name">${theme.name}</span><small class="brand__en">${theme.englishName}</small></a>
  <span class="sidebar__rule" aria-hidden="true"></span>
  <nav class="nav" aria-label="主导航">${navItems.map(([label, icon, target], i) => `<button class="nav__item ${i === 0 ? 'is-active' : ''}" data-target="${target}" aria-label="${label}">${icons[icon]}<span>${label}</span></button>`).join('')}</nav>
  <button class="sidebar__explore" data-target="#categories"><span>${icons.astrolabe}</span><strong>探索更多</strong><small>未知的故事正在云海深处等待</small><i>→</i></button>`;

topbar.innerHTML = `<div class="topbar__inner">
  <button class="scene-status" id="scene-status" type="button" aria-label="打开天空城航行图"><span class="scene-status__astrolabe" aria-hidden="true">${icons.astrolabe}</span><span><small>当前窗景</small><strong id="scene-status-name"></strong></span></button>
  <button class="circle-btn scenic-toggle" id="scenic-toggle" aria-label="进入观景模式" title="进入观景模式">${icons.telescope}</button>
  <button class="circle-btn" aria-label="通知">${icons.bell}</button>
  <button class="circle-btn" id="theme-button" aria-label="主题设置">${icons.settings}</button>
  <button class="circle-btn avatar" aria-label="个人中心">旅</button>
</div>`;

const statHTML = stats.map((s) => `<a class="stat-card" href="${s.target}"><span class="stat-card__watermark" aria-hidden="true">${icons[s.icon]}</span><span class="stat-card__icon">${icons[s.icon]}</span><span class="stat-card__copy"><strong>${s.label}</strong><small>${s.detail}</small></span><span class="stat-card__arrow">›</span></a>`).join('');
const noteHTML = notes.map((n) => `<article class="note-item"><span class="note-thumb"></span><span><strong>${n.title}</strong><small>${n.meta}</small></span></article>`).join('');
const quoteHTML = quotes.map((q) => `<blockquote class="quote">${q.text}<cite>—— ${q.source}</cite></blockquote>`).join('');
const categoryHTML = popularCategories.map((item) => `<button class="category-card" data-category="${item.category}" style="--category-art:url('${item.image}')"><span><strong>${item.title}</strong><small>${item.subtitle}</small></span><i>→</i></button>`).join('');
const mapPinHTML = theme.scenes.filter((scene) => scene.map).map((scene) => `<button class="map-pin ${document.documentElement.dataset.scene === scene.id ? 'is-active is-selected' : ''}" type="button" data-scene="${scene.id}" style="--pin-x:${scene.map.x}%;--pin-y:${scene.map.y}%" aria-label="选择${scene.name}"><span class="map-pin__orbit" aria-hidden="true"></span><b>${scene.map.marker}</b><span class="map-pin__label">${scene.name}</span></button>`).join('');

app.innerHTML = `
  <section class="hero" id="top">
    <div class="hero__welcome">
      <span class="hero__eyebrow">${theme.welcomeEyebrow}</span>
      <h1>${theme.welcomeTitle}</h1>
      <p>${theme.subtitle}</p>
      <label class="hero-search">${icons.search}<span class="sr-only">搜索书籍</span><input id="search" placeholder="搜索书籍、笔记或灵感……"><button type="button" id="search-go" aria-label="开始搜索">→</button></label>
    </div>
    <button class="daily-bookmark" id="daily-bookmark" type="button" aria-label="切换今日书签">
      <span class="daily-bookmark__cord" aria-hidden="true"></span>
      <small>今日书签</small><i aria-hidden="true">✦</i>
      <q id="bookmark-text">${dailyBookmarks[0].text}</q>
      <cite id="bookmark-source">—— ${dailyBookmarks[0].source}</cite>
      <em>轻触翻阅下一则</em>
    </button>
  </section>
  <div class="dashboard">
    <section class="stat-grid" aria-label="书房概览">${statHTML}</section>
    <section class="content-grid">
      <article class="panel reading" id="continue-reading"><div class="reading__art" aria-hidden="true"></div><div class="reading__cover"></div><div class="reading__body"><span class="reading__label">继续阅读 · 第十二章</span><h2>三体</h2><p class="reading__author">刘慈欣</p><div class="reading__meta"><span>上次阅读 <time datetime="2026-09-07T22:36">昨晚 22:36</time></span><span>预计剩余 <time datetime="PT4H20M">4 小时 20 分</time></span></div><div class="progress-line"><i><b aria-hidden="true">✦</b></i><span>已读 42%</span></div><button class="primary-btn" data-action="read">继续阅读 →</button></div></article>
      <section class="panel notes-panel" id="notes"><div class="panel__head"><h2 class="panel__title">最近笔记</h2><button class="panel__more">查看全部 →</button></div><div class="notes">${noteHTML}</div></section>
      <section class="panel quotes-panel" id="quotes"><div class="panel__head"><h2 class="panel__title">精选书摘</h2><button class="panel__more">查看全部 →</button></div><div class="quotes">${quoteHTML}</div></section>
    </section>
    <section class="category-section" id="categories"><div class="section-head"><div><span>漫游云端藏书世界</span><h2>热门分类</h2></div><a href="#shelf">查看全部分类 →</a></div><div class="category-grid">${categoryHTML}</div></section>
    <section class="panel shelf" id="shelf"><div class="shelf__head"><h2>我的书架</h2><div class="tabs">${categories.map((c, i) => `<button class="tab ${i === 0 ? 'is-active' : ''}" data-category="${c.id}">${c.label}</button>`).join('')}</div><span class="shelf__more">共 24 本藏书</span></div><div class="books" id="books"></div></section>
  </div>
  <aside class="scene-atlas" id="settings" role="dialog" aria-modal="true" aria-labelledby="atlas-title" aria-hidden="true">
    <button class="scene-atlas__backdrop" type="button" data-atlas-close aria-label="关闭航行图"></button>
    <section class="scene-atlas__panel">
      <header class="scene-atlas__head">
        <span class="atlas-sigil" aria-hidden="true">${icons.astrolabe}</span>
        <span><small>${theme.name} · CELESTIAL ATLAS</small><h2 id="atlas-title">${theme.navigator.title}</h2><p>${theme.navigator.subtitle}</p></span>
        <button class="scene-atlas__close" id="atlas-close" type="button" aria-label="关闭航行图">×</button>
      </header>
      <div class="scene-atlas__body">
        <div class="atlas-map-frame">
          <span class="atlas-map-frame__corner atlas-map-frame__corner--a" aria-hidden="true"></span>
          <span class="atlas-map-frame__corner atlas-map-frame__corner--b" aria-hidden="true"></span>
          <div class="atlas-map">
            <img data-atlas-src="${theme.navigator.image}" alt="云天幻境场景分布地图" />
            ${mapPinHTML}
          </div>
          <span class="atlas-map__hint">选择地图上的黄铜坐标</span>
          <button class="atlas-home" type="button" data-atlas-home><span aria-hidden="true">⌂</span> 一键返回首页</button>
        </div>
        <aside class="atlas-detail" aria-live="polite">
          <span class="atlas-detail__code" id="atlas-detail-code"></span>
          <div class="atlas-detail__preview" id="atlas-detail-preview"></div>
          <h3 id="atlas-detail-name"></h3>
          <span class="atlas-detail__region" id="atlas-detail-region"></span>
          <div class="atlas-view-switcher" id="atlas-view-switcher" aria-label="选择地点视角"></div>
          <p id="atlas-detail-description"></p>
          <button class="atlas-travel" id="atlas-travel" type="button"><span>抵达此处</span><i aria-hidden="true">→</i></button>
          <button class="theme-option atlas-atmosphere" id="atmosphere"><span class="theme-swatch"></span><span><strong>天光校准</strong><small>切换晨光 / 暮色氛围</small></span></button>
          <button class="scene-enter" id="scene-enter" type="button">${icons.telescope}<span>隐藏界面，欣赏当前风景</span></button>
        </aside>
      </div>
    </section>
  </aside>`;

// The atlas is rendered with the page template, then moved to the viewport root
// so its modal layer is not constrained by the main content stacking context.
document.body.append(document.querySelector('#settings'));

document.querySelector('#scenic-prev').innerHTML = `${icons.return}<span>上一处</span>`;
document.querySelector('#scenic-next').innerHTML = `${icons.astrolabe}<span>下一处</span>`;
document.querySelector('#scenic-return').innerHTML = `${icons.return}<span>返回书房</span>`;

function renderBooks() {
  const filtered = books.filter((book) => (activeCategory === 'all' || book.category === activeCategory)
    && `${book.title}${book.author}`.toLowerCase().includes(query.toLowerCase()));
  const addBook = activeCategory === 'all' && !query ? `<button class="book-add" type="button" data-action="add-book">${icons.tome}<span>添加书籍</span></button>` : '';
  document.querySelector('#books').innerHTML = filtered.length
    ? filtered.map((book) => `<button class="book" data-title="${book.title}"><span class="book__cover" style="--cover:${book.cover};--cover-accent:${book.accent || '#e3c17d'}"><span>${book.title}</span></span><strong>${book.title}</strong><small>${book.author}</small></button>`).join('') + addBook
    : '<p class="empty">云海里暂时没有找到这本书</p>';
}

function selectCategory(id) {
  activeCategory = id;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.category === id));
  renderBooks();
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function updateSceneUI(scene) {
  document.querySelector('#scene-status-name').textContent = scene.name;
  const visual = scene.activeView || scene;
  sceneCaption.innerHTML = `<span class="scene-caption__top">${scene.code} · ${visual.region}</span><h2>${scene.name}${scene.activeView ? ` · ${scene.activeView.name}` : ''}</h2><p>${visual.description}</p>`;
  document.querySelectorAll('.map-pin').forEach((pin) => pin.classList.toggle('is-active', pin.dataset.scene === scene.id));
  document.querySelector('[data-atlas-home]').classList.toggle('is-active', scene.id === theme.defaultScene);
}

function updateAtlasSelection(id, viewId = null) {
  const scene = theme.scenes.find((item) => item.id === id) || theme.scenes[0];
  const view = scene.views?.find((item) => item.id === viewId) || scene.views?.[0] || null;
  const visual = view || scene;
  atlasSceneId = scene.id;
  atlasViewId = view?.id || 'default';
  document.querySelectorAll('.map-pin').forEach((pin) => pin.classList.toggle('is-selected', pin.dataset.scene === scene.id));
  document.querySelector('#atlas-detail-code').textContent = scene.map ? `${scene.code} · 坐标 ${scene.map.marker}` : `${scene.code} · 主航道`;
  document.querySelector('#atlas-detail-preview').style.backgroundImage = `url('${visual.image}')`;
  document.querySelector('#atlas-detail-name').textContent = view ? `${scene.name} · ${view.name}` : scene.name;
  document.querySelector('#atlas-detail-region').textContent = visual.region;
  document.querySelector('#atlas-detail-description').textContent = visual.description;
  const viewSwitcher = document.querySelector('#atlas-view-switcher');
  viewSwitcher.hidden = !scene.views?.length;
  viewSwitcher.innerHTML = scene.views?.map((item) => `<button type="button" class="atlas-view ${item.id === atlasViewId ? 'is-active' : ''}" data-view="${item.id}" style="--view-image:url('${item.image}')"><span></span><b>${item.name}</b></button>`).join('') || '';
  const travelButton = document.querySelector('#atlas-travel');
  const isCurrent = scene.id === document.documentElement.dataset.scene && atlasViewId === document.documentElement.dataset.sceneView;
  travelButton.classList.toggle('is-current', isCurrent);
  travelButton.querySelector('span').textContent = isCurrent ? '当前所在位置' : '抵达此处';
  travelButton.querySelector('i').textContent = isCurrent ? '✓' : '→';
  return scene;
}

function openAtlas() {
  const atlas = document.querySelector('#settings');
  const mapImage = atlas.querySelector('[data-atlas-src]');
  if (!mapImage.getAttribute('src')) mapImage.setAttribute('src', mapImage.dataset.atlasSrc);
  updateAtlasSelection(document.documentElement.dataset.scene, document.documentElement.dataset.sceneView);
  atlas.classList.add('is-open');
  atlas.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-atlas-open');
  window.setTimeout(() => document.querySelector('#atlas-close').focus(), 80);
}

function closeAtlas() {
  const atlas = document.querySelector('#settings');
  atlas.classList.remove('is-open');
  atlas.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-atlas-open');
}

function changeAtlasSelection(offset) {
  const current = theme.scenes.findIndex((scene) => scene.id === atlasSceneId);
  const next = (current + offset + theme.scenes.length) % theme.scenes.length;
  const scene = updateAtlasSelection(theme.scenes[next].id);
  const destination = document.querySelector(`.map-pin[data-scene="${scene.id}"]`) || document.querySelector('[data-atlas-home]');
  destination?.focus({ preventScroll: true });
}

function selectScene(id, announce = true, viewId = null) {
  const nextScene = theme.scenes.find((item) => item.id === id) || theme.scenes[0];
  document.body.classList.add('is-scene-changing');
  window.setTimeout(() => {
    const scene = applyScene(theme, nextScene.id, viewId);
    updateSceneUI(scene);
    updateAtlasSelection(scene.id, scene.activeView?.id);
    preloadSceneNeighbors(scene.id);
    window.setTimeout(() => document.body.classList.remove('is-scene-changing'), 300);
  }, 170);
  if (announce) showToast(`已抵达：${nextScene.name}`);
  return nextScene;
}

function changeScene(offset) {
  const current = theme.scenes.findIndex((scene) => scene.id === document.documentElement.dataset.scene);
  const next = (current + offset + theme.scenes.length) % theme.scenes.length;
  selectScene(theme.scenes[next].id);
}

function preloadSceneNeighbors(id) {
  const current = theme.scenes.findIndex((scene) => scene.id === id);
  [-1, 1].forEach((offset) => {
    const scene = theme.scenes[(current + offset + theme.scenes.length) % theme.scenes.length];
    (scene.views?.length ? scene.views : [scene]).forEach((visual) => {
      const image = new Image();
      image.src = visual.image;
    });
  });
}

function setScenicMode(enabled) {
  if (enabled) window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.classList.toggle('is-scenic', enabled);
  closeAtlas();
  const toggle = document.querySelector('#scenic-toggle');
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? '退出观景模式' : '进入观景模式');
}

renderBooks();
const initialScene = applyScene(theme, document.documentElement.dataset.scene, document.documentElement.dataset.sceneView);
updateSceneUI(initialScene);
updateAtlasSelection(initialScene.id, initialScene.activeView?.id);
const preloadScenes = () => preloadSceneNeighbors(initialScene.id);
if ('requestIdleCallback' in window) window.requestIdleCallback(preloadScenes); else window.setTimeout(preloadScenes, 900);

const readingCard = document.querySelector('#continue-reading');
if (window.matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches) {
  readingCard.addEventListener('pointermove', (event) => {
    const bounds = readingCard.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * -9;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * -6;
    readingCard.style.setProperty('--parallax-x', `${x}px`);
    readingCard.style.setProperty('--parallax-y', `${y}px`);
  });
  readingCard.addEventListener('pointerleave', () => {
    readingCard.style.setProperty('--parallax-x', '0px');
    readingCard.style.setProperty('--parallax-y', '0px');
  });
}

document.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => {
  if (button.classList.contains('nav__item')) {
    document.querySelectorAll('.nav__item').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    if (button.dataset.target === '#top' && document.documentElement.dataset.scene !== theme.defaultScene) selectScene(theme.defaultScene, false);
  }
  if (button.dataset.target === '#settings') openAtlas();
  else document.querySelector(button.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
}));
document.querySelector('.brand').addEventListener('click', () => {
  if (document.documentElement.dataset.scene !== theme.defaultScene) selectScene(theme.defaultScene, false);
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => selectCategory(tab.dataset.category)));
document.querySelectorAll('.category-card').forEach((card) => card.addEventListener('click', () => {
  selectCategory(card.dataset.category);
  document.querySelector('#shelf').scrollIntoView({ behavior: 'smooth' });
}));
document.querySelectorAll('.map-pin').forEach((pin) => pin.addEventListener('click', () => updateAtlasSelection(pin.dataset.scene)));
document.querySelector('[data-atlas-home]').addEventListener('click', () => {
  if (document.documentElement.dataset.scene === theme.defaultScene) {
    closeAtlas();
    return;
  }
  closeAtlas();
  selectScene(theme.defaultScene);
});
document.querySelector('#atlas-view-switcher').addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]');
  if (view) updateAtlasSelection(atlasSceneId, view.dataset.view);
});
document.querySelector('#search').addEventListener('input', (event) => { query = event.target.value.trim(); renderBooks(); });
document.querySelector('#search-go').addEventListener('click', () => document.querySelector('#shelf').scrollIntoView({ behavior: 'smooth' }));
document.querySelector('#daily-bookmark').addEventListener('click', () => {
  bookmarkIndex = (bookmarkIndex + 1) % dailyBookmarks.length;
  document.querySelector('#bookmark-text').textContent = dailyBookmarks[bookmarkIndex].text;
  document.querySelector('#bookmark-source').textContent = `—— ${dailyBookmarks[bookmarkIndex].source}`;
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#search').focus(); }
  if (document.body.classList.contains('is-atlas-open') && event.key === 'ArrowLeft') { event.preventDefault(); changeAtlasSelection(-1); }
  if (document.body.classList.contains('is-atlas-open') && event.key === 'ArrowRight') { event.preventDefault(); changeAtlasSelection(1); }
  if (document.body.classList.contains('is-scenic') && event.key === 'ArrowLeft') changeScene(-1);
  if (document.body.classList.contains('is-scenic') && event.key === 'ArrowRight') changeScene(1);
  if (event.key === 'Escape' && document.body.classList.contains('is-scenic')) setScenicMode(false);
  else if (event.key === 'Escape' && document.body.classList.contains('is-atlas-open')) closeAtlas();
});
document.querySelector('#scenic-toggle').addEventListener('click', () => setScenicMode(true));
document.querySelector('#scene-enter').addEventListener('click', () => setScenicMode(true));
document.querySelector('#scene-status').addEventListener('click', openAtlas);
document.querySelector('#scenic-return').addEventListener('click', () => setScenicMode(false));
document.querySelector('#scenic-prev').addEventListener('click', () => changeScene(-1));
document.querySelector('#scenic-next').addEventListener('click', () => changeScene(1));
document.querySelector('#theme-button').addEventListener('click', openAtlas);
document.querySelector('#atlas-close').addEventListener('click', closeAtlas);
document.querySelector('[data-atlas-close]').addEventListener('click', closeAtlas);
document.querySelector('#atlas-travel').addEventListener('click', () => {
  if (atlasSceneId === document.documentElement.dataset.scene && atlasViewId === document.documentElement.dataset.sceneView) {
    closeAtlas();
    return;
  }
  const destination = atlasSceneId;
  const destinationView = atlasViewId === 'default' ? null : atlasViewId;
  closeAtlas();
  selectScene(destination, true, destinationView);
});
document.querySelector('#atmosphere').addEventListener('click', () => {
  const root = document.documentElement;
  root.dataset.atmosphere = root.dataset.atmosphere === 'dusk' ? 'day' : 'dusk';
  localStorage.setItem('library-atmosphere', root.dataset.atmosphere);
  showToast(root.dataset.atmosphere === 'dusk' ? '暮色已降临天空城' : '天空城迎来晨光');
});
document.querySelector('[data-action="read"]').addEventListener('click', () => showToast('正在打开《三体》第十二章…'));
document.querySelector('#books').addEventListener('click', (event) => {
  const book = event.target.closest('.book');
  if (book) showToast(`已选中《${book.dataset.title}》`);
  if (event.target.closest('[data-action="add-book"]')) showToast('添加书籍入口已打开');
});
