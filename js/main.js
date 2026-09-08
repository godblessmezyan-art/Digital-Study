import { icons } from './icons.js?v=cloud-realm-study-27';
import {
  books, categories, dailyBookmarks, notes, popularCategories, quotes, stats,
} from './data.js?v=cloud-realm-study-27';
import { applyScene, initTheme } from './theme.js?v=cloud-realm-study-27';

const theme = initTheme();
const app = document.querySelector('#app');
const sidebar = document.querySelector('#sidebar');
const topbar = document.querySelector('#topbar');
const toast = document.querySelector('#toast');
const sceneCaption = document.querySelector('#scene-caption');
let activeCategory = 'all';
let query = '';
let bookmarkIndex = 0;

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
  <button class="scene-status" id="scene-status" type="button" aria-label="打开天空城风景图鉴">${icons.astrolabe}<span><small>当前窗景</small><strong id="scene-status-name"></strong></span></button>
  <button class="circle-btn scenic-toggle" id="scenic-toggle" aria-label="进入观景模式" title="进入观景模式">${icons.telescope}</button>
  <button class="circle-btn" aria-label="通知">${icons.bell}</button>
  <button class="circle-btn" id="theme-button" aria-label="主题设置">${icons.settings}</button>
  <button class="circle-btn avatar" aria-label="个人中心">旅</button>
</div>`;

const statHTML = stats.map((s) => `<a class="stat-card" href="${s.target}"><span class="stat-card__watermark" aria-hidden="true">${icons[s.icon]}</span><span class="stat-card__icon">${icons[s.icon]}</span><span class="stat-card__copy"><strong>${s.label}</strong><small>${s.detail}</small></span><span class="stat-card__arrow">›</span></a>`).join('');
const noteHTML = notes.map((n) => `<article class="note-item"><span class="note-thumb"></span><span><strong>${n.title}</strong><small>${n.meta}</small></span></article>`).join('');
const quoteHTML = quotes.map((q) => `<blockquote class="quote">${q.text}<cite>—— ${q.source}</cite></blockquote>`).join('');
const categoryHTML = popularCategories.map((item) => `<button class="category-card" data-category="${item.category}" style="--category-art:url('${item.image}')"><span><strong>${item.title}</strong><small>${item.subtitle}</small></span><i>→</i></button>`).join('');
const sceneHTML = theme.scenes.map((scene) => `<button class="scene-option ${document.documentElement.dataset.scene === scene.id ? 'is-active' : ''}" type="button" data-scene="${scene.id}"><span class="scene-option__preview" data-code="${scene.code}" style="background-image:url('${scene.image}')"></span><span><em>${scene.region}</em><strong>${scene.name}</strong><small>${scene.description}</small></span><i>✓</i></button>`).join('');

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
  <aside class="theme-popover" id="settings"><h3>天空城风景图鉴</h3><p>选择一扇窗，抵达天空城的不同地点。后续新增风景只需扩展主题配置。</p><button class="theme-option" id="atmosphere"><span class="theme-swatch"></span><span><strong>${theme.name}</strong><small>点击切换晨光 / 暮色氛围</small></span></button><div class="scene-settings"><div class="scene-settings__head"><span class="scene-settings__label">可抵达的窗景</span><span class="scene-settings__count">共 ${theme.scenes.length} 处风景</span></div>${sceneHTML}<button class="scene-enter" id="scene-enter" type="button">${icons.telescope}<span>隐藏界面，欣赏当前风景</span></button></div></aside>`;

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
  sceneCaption.innerHTML = `<span class="scene-caption__top">${scene.code} · ${scene.region}</span><h2>${scene.name}</h2><p>${scene.description}</p>`;
  document.querySelectorAll('.scene-option').forEach((option) => option.classList.toggle('is-active', option.dataset.scene === scene.id));
}

function selectScene(id, announce = true) {
  const nextScene = theme.scenes.find((item) => item.id === id) || theme.scenes[0];
  document.body.classList.add('is-scene-changing');
  window.setTimeout(() => {
    const scene = applyScene(theme, nextScene.id);
    updateSceneUI(scene);
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

function setScenicMode(enabled) {
  if (enabled) window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.classList.toggle('is-scenic', enabled);
  document.querySelector('#settings').classList.remove('is-open');
  const toggle = document.querySelector('#scenic-toggle');
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? '退出观景模式' : '进入观景模式');
}

renderBooks();
updateSceneUI(theme.scenes.find((scene) => scene.id === document.documentElement.dataset.scene) || theme.scenes[0]);
const preloadScenes = () => theme.scenes.forEach((scene) => { const image = new Image(); image.src = scene.image; });
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
  }
  if (button.dataset.target === '#settings') document.querySelector('#settings').classList.toggle('is-open');
  else document.querySelector(button.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
}));
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => selectCategory(tab.dataset.category)));
document.querySelectorAll('.category-card').forEach((card) => card.addEventListener('click', () => {
  selectCategory(card.dataset.category);
  document.querySelector('#shelf').scrollIntoView({ behavior: 'smooth' });
}));
document.querySelectorAll('.scene-option').forEach((option) => option.addEventListener('click', () => selectScene(option.dataset.scene)));
document.querySelector('#search').addEventListener('input', (event) => { query = event.target.value.trim(); renderBooks(); });
document.querySelector('#search-go').addEventListener('click', () => document.querySelector('#shelf').scrollIntoView({ behavior: 'smooth' }));
document.querySelector('#daily-bookmark').addEventListener('click', () => {
  bookmarkIndex = (bookmarkIndex + 1) % dailyBookmarks.length;
  document.querySelector('#bookmark-text').textContent = dailyBookmarks[bookmarkIndex].text;
  document.querySelector('#bookmark-source').textContent = `—— ${dailyBookmarks[bookmarkIndex].source}`;
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#search').focus(); }
  if (document.body.classList.contains('is-scenic') && event.key === 'ArrowLeft') changeScene(-1);
  if (document.body.classList.contains('is-scenic') && event.key === 'ArrowRight') changeScene(1);
  if (event.key === 'Escape' && document.body.classList.contains('is-scenic')) setScenicMode(false);
  else if (event.key === 'Escape') document.querySelector('#settings').classList.remove('is-open');
});
document.querySelector('#scenic-toggle').addEventListener('click', () => setScenicMode(true));
document.querySelector('#scene-enter').addEventListener('click', () => setScenicMode(true));
document.querySelector('#scene-status').addEventListener('click', () => document.querySelector('#settings').classList.toggle('is-open'));
document.querySelector('#scenic-return').addEventListener('click', () => setScenicMode(false));
document.querySelector('#scenic-prev').addEventListener('click', () => changeScene(-1));
document.querySelector('#scenic-next').addEventListener('click', () => changeScene(1));
document.querySelector('#theme-button').addEventListener('click', () => document.querySelector('#settings').classList.toggle('is-open'));
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
