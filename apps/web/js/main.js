import { icons } from './icons.js?v=cloud-realm-study-30';
import {
  dailyBookmarks, popularCategories, stats,
} from './data.js?v=cloud-realm-study-29';
import { applyScene, applyWorldBackground, initTheme } from './theme.js?v=cloud-realm-study-36';
import { createCelestialGlobe } from './celestial-globe.js?v=2';
import { initChronicles } from './chronicles.js?v=1';
import { initMotionSystem } from './motion.js?v=1';
import { renderSidebar } from './navigation.js?v=2';
import { getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';
import { loadShelfBooks } from './book-catalog.js?v=3';
import { listReadingEntries } from './reading-client.js?v=1';
import { initWorld } from './world.js?v=1';
import { initFootprints, seedFootprints } from './footprints.js?v=1';
import { recordWorldFeedback } from './world-feedback.js';
import { createSceneTransitionManager } from './scene-transition.js?v=1';

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
let globeController = null;
let worldMapReturnFocus = null;
let shelfBooks = [];
let readingEntries = [];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const worldArt = document.querySelector('.world__art');
const revealWorldArt = () => worldArt?.classList.add('is-loaded');
if (worldArt?.complete) revealWorldArt();
else worldArt?.addEventListener('load', revealWorldArt, { once: true });

const homeNavId = () => location.hash === '#shelf' ? 'shelf' : location.hash === '#settings' ? 'settings' : 'home';
renderSidebar(sidebar, { variant: 'home', activeId: homeNavId(), brandName: theme.name, brandEnglish: theme.englishName, brandIcon: icons[theme.logo] });

topbar.innerHTML = `<div class="topbar__inner world-hud">
  <div class="hud-anchor hud-anchor--status">
    <button class="hud-status" id="hud-world-status" type="button" data-hud-toggle="status" aria-expanded="false" aria-controls="hud-status-popover"><span class="hud-status__mark" aria-hidden="true">◉</span><span class="hud-status__copy"><strong id="hud-status-place">云天幻境</strong><small><span id="hud-status-weather">晴朗</span><i aria-hidden="true">·</i><time id="hud-status-time">--:--</time></small></span></button>
    <section class="hud-popover hud-status-popover" id="hud-status-popover" data-hud-popover="status" aria-label="世界状态详情" hidden><header><small>WORLD STATUS</small><strong>世界状态</strong></header><div class="hud-status-detail"><span>当前窗景</span><b id="scene-status-name"></b><span>天气与时间</span><b><i id="hud-detail-weather">晴朗</i> · <time id="hud-detail-time">--:--</time> · <em id="hud-detail-period">白昼</em></b></div><footer><button id="scene-status" type="button">查看当前窗景 <span>→</span></button><button type="button" data-hud-action="world">调整世界氛围 <span>→</span></button></footer></section>
  </div>
  <button class="world-map-button hud-map" id="world-map-toggle" type="button" aria-label="世界地图" aria-haspopup="dialog" aria-controls="world-map-modal">${icons.astrolabe}<span>世界地图</span></button>
  <div class="hud-anchor hud-anchor--notice">
    <button class="hud-circle hud-notice" type="button" data-hud-toggle="notice" aria-label="通知" aria-expanded="false" aria-controls="hud-notice-popover">${icons.bell}<b class="hud-badge" data-hud-badge hidden></b></button>
    <section class="hud-popover hud-menu" id="hud-notice-popover" data-hud-popover="notice" aria-label="通知" hidden><header><small>WORLD MESSAGES</small><strong>通知</strong></header><button type="button" data-hud-action="chronicle"><span><i>✦</i><b>世界记录</b><small data-hud-chronicle-text>暂无新的世界记录</small></span><em>→</em></button><button type="button" data-hud-action="footprints"><span><i>◌</i><b>足迹更新</b><small>查看最近的阅读与珍藏</small></span><em>→</em></button><p><i aria-hidden="true">◉</i><span>世界天气会随当前设置自然变化</span></p></section>
  </div>
  <div class="hud-anchor hud-anchor--console">
    <button class="hud-circle hud-console-toggle" type="button" data-hud-toggle="console" aria-label="世界控制台" title="世界控制台" aria-expanded="false" aria-controls="hud-console-popover"><span aria-hidden="true">◈</span></button>
    <section class="hud-popover hud-menu hud-console" id="hud-console-popover" data-hud-popover="console" aria-label="世界控制台" hidden><header><small>NAVIGATION CONSOLE</small><strong>世界控制台</strong></header><button type="button" data-hud-action="world"><span><i>☁</i><b>环境与天气</b><small>天气、时间与氛围强度</small></span><em>→</em></button><button type="button" data-hud-action="world"><span><i>♫</i><b>环境音效</b><small>风声、雨声与总音量</small></span><em>→</em></button><button type="button" data-hud-action="footprints"><span><i>◌</i><b>世界足迹</b><small>最近阅读与探索记录</small></span><em>→</em></button><button class="hud-source-action" id="scenic-toggle" type="button"><span><i>${icons.telescope}</i><b>观景模式</b><small>隐藏界面，欣赏当前风景</small></span><em>→</em></button><button class="hud-source-action" id="theme-button" type="button"><span><i>${icons.settings}</i><b>界面设置</b><small>窗景航行与昼夜校准</small></span><em>→</em></button></section>
  </div>
  <button class="hud-circle hud-avatar" id="homeAvatar" aria-label="旅者入口" title="旅者入口">旅</button>
  <span class="hud-source" data-world-entry hidden></span><span class="hud-source" data-footprint-entry hidden></span><button class="chronicle-home-signal hud-source" type="button" data-chronicle-signal hidden><i aria-hidden="true"></i><span data-chronicle-signal-label>新的世界记录</span></button>
</div>`;
const world = initWorld({ mount: document.querySelector('[data-world-entry]'), scene: 'home' });
const chronicles = initChronicles({ world, page: 'home' });
const sceneTransitions = createSceneTransitionManager();
applyWorldBackground(theme, world.snapshot());
window.addEventListener('worldchange', event => applyWorldBackground(theme, {
  weather: event.detail.weather,
  period: event.detail.effectivePeriod,
}));
window.addEventListener('worldchange', event => {
  void chronicles.check('home');
  globeController?.setAtmosphere({ weather: event.detail.weather, period: event.detail.effectivePeriod });
});
window.addEventListener('chroniclearchivechange', event => globeController?.setChronicles(event.detail?.entries || []));
const footprints = initFootprints({ mount: document.querySelector('[data-footprint-entry]') });
setupWorldHud();
const syncWorldScene = scene => {
  const outdoor = ['city-overview', 'white-stone-courtyard', 'sea-of-clouds-terrace'].includes(scene.id)
    || (scene.id === 'hidden-sanctuary' && scene.activeView?.id !== 'hall');
  world.setScene(outdoor ? 'terrace' : 'study');
};

const statHTML = stats.map((s, index) => `<a class="stat-card" href="${s.target}" data-stat-index="${index}"><span class="stat-card__watermark" aria-hidden="true">${icons[s.icon]}</span><span class="stat-card__icon">${icons[s.icon]}</span><span class="stat-card__copy"><strong>${s.label}</strong><small>${s.detail}</small></span><span class="stat-card__arrow">›</span></a>`).join('');
const noteHTML = '<p class="home-data-loading">正在读取你的笔记…</p>';
const quoteHTML = '<p class="home-data-loading">正在读取你的书摘…</p>';
const categoryHTML = popularCategories.map((item) => `<a class="category-card" href="index.html#categories?category=${encodeURIComponent(item.category)}" style="--category-art:url('${item.image}')"><span><strong>${item.title}</strong><small>${item.subtitle}</small></span><i>→</i></a>`).join('');
const mapPinHTML = theme.scenes.filter((scene) => scene.map).map((scene) => `<button class="map-pin ${document.documentElement.dataset.scene === scene.id ? 'is-active is-selected' : ''}" type="button" data-scene="${scene.id}" style="--pin-x:${scene.map.x}%;--pin-y:${scene.map.y}%" aria-label="选择${scene.name}"><span class="map-pin__orbit" aria-hidden="true"></span><b>${scene.map.marker}</b><span class="map-pin__label">${scene.name}</span></button>`).join('');

app.innerHTML = `
  <section class="hero" id="top">
    <div class="hero__welcome">
      <span class="hero__eyebrow">${theme.welcomeEyebrow}</span>
      <h1>${theme.welcomeTitle}</h1>
      <p>${theme.subtitle}</p>
      <label class="hero-search">${icons.search}<span class="sr-only">搜索书籍</span><input id="search" placeholder="搜索书籍、笔记或灵感……"><button type="button" id="search-go" aria-label="开始搜索">→</button></label>
    </div>
    <button class="daily-bookmark daily-bookmark--hero" id="daily-bookmark" type="button" aria-label="切换今日书签">
      <span class="daily-bookmark__cord" aria-hidden="true"></span>
      <small>今日书签</small><i aria-hidden="true">✦</i>
      <q id="bookmark-text">${dailyBookmarks[0].text}</q>
      <cite id="bookmark-source">—— ${dailyBookmarks[0].source}</cite>
      <em>轻触翻阅下一则</em>
    </button>
    <aside class="world-presence" data-world-presence aria-label="云天幻境当前状态"></aside>
    <a class="hero-scroll" href="#home-content"><span>继续探索</span><i aria-hidden="true">↓</i></a>
  </section>
  <div class="dashboard" id="home-content">
    <section class="home-section quick-entries" aria-labelledby="quick-entries-title"><div class="home-section__head home-section__head--compact"><div><span>MY STUDY</span><h2 id="quick-entries-title">我的书房</h2></div></div><div class="stat-grid" aria-label="书房快捷入口">${statHTML}</div></section>
    <section class="home-section continue-section" aria-labelledby="continue-title"><div class="home-section__head"><div><span>CONTINUE THE JOURNEY</span><h2 id="continue-title">继续阅读</h2></div><p>回到上次停留的文字之间</p></div><article class="panel reading" id="continue-reading"><div class="reading__art" aria-hidden="true"></div><div class="reading__cover" data-title=""></div><div class="reading__body"><span class="reading__label">正在读取书架…</span><h2>我的阅读</h2><p class="reading__author">登录后同步最近进度</p><div class="reading__meta"><span>上次阅读 <time>—</time></span><span>最近章节 <time>正文</time></span></div><div class="progress-line" style="--reading-progress:0%"><i><b aria-hidden="true">✦</b></i><span>已读 0%</span></div><button class="primary-btn" data-action="read">打开私人藏书 →</button></div></article></section>
    <section class="home-section recent-section" aria-labelledby="recent-title"><div class="home-section__head"><div><span>RECENT TRACES</span><h2 id="recent-title">最近留下的痕迹</h2></div><p>想法与句子，都是旅途的坐标</p></div><div class="recent-grid"><section class="panel notes-panel" id="notes"><div class="panel__head"><h3 class="panel__title">最近写下的想法</h3><button class="panel__more" data-home-reading="notes">查看全部 →</button></div><div class="notes" id="homeNotes">${noteHTML}</div></section><section class="panel quotes-panel" id="quotes"><div class="panel__head"><h3 class="panel__title">最近收藏的片段</h3><button class="panel__more" data-home-reading="quotes">查看全部 →</button></div><div class="quotes" id="homeQuotes">${quoteHTML}</div></section></div></section>
    <section class="home-section category-section" id="categories"><div class="section-head"><div><span>EXPLORE THE LIBRARY</span><h2>探索藏书</h2><p>沿着兴趣，寻找下一段阅读旅程</p></div><a href="#shelf">查看全部分类 →</a></div><div class="category-grid">${categoryHTML}</div></section>
    <section class="panel shelf" id="shelf"><div class="shelf__head"><h2>私人藏书</h2><div class="tabs" id="shelfTabs"><button class="tab is-active" data-category="all">最近加入</button></div><a class="shelf__more" id="shelfCount" href="index.html#shelf">正在读取…</a></div><div class="books" id="books"></div></section>
  </div>
  <aside class="world-map-modal" id="world-map-modal" role="dialog" aria-modal="true" aria-labelledby="world-map-title" aria-hidden="true">
    <div class="world-map-modal__backdrop" data-world-map-close aria-hidden="true"></div>
    <section class="world-map-modal__panel">
      <header class="world-map-modal__head">
        <span class="world-map-modal__sigil" aria-hidden="true">${icons.astrolabe}</span>
        <span><small>AETHERION CELESTIAL ATLAS</small><h2 id="world-map-title">埃瑞瑞恩航行图</h2><p>转动星盘，寻访云海之上的埃瑞瑞恩</p></span>
        <button class="world-map-modal__close" id="world-map-close" type="button" aria-label="关闭世界地图">×</button>
      </header>
      <div class="world-map-modal__body">
        <span class="world-map-modal__tick world-map-modal__tick--top" aria-hidden="true"></span>
        <span class="world-map-modal__tick world-map-modal__tick--bottom" aria-hidden="true"></span>
        <div class="celestial-globe" id="celestial-globe"></div>
      </div>
      <footer class="world-map-modal__foot">
        <span class="chronicle-map-entry"><button type="button" data-open-chronicles><small>WORLD CHRONICLES</small><strong>世界纪事 · <b data-chronicle-count>0 / 12</b></strong></button></span>
        <span><i aria-hidden="true"></i> 已发现坐标：埃瑞瑞恩</span>
        <button type="button" id="globe-map">查看埃瑞瑞恩地图 →</button>
      </footer>
    </section>
  </aside>
  <aside class="scene-atlas" id="settings" role="dialog" aria-modal="true" aria-labelledby="atlas-title" aria-hidden="true">
    <button class="scene-atlas__backdrop" type="button" data-atlas-close aria-label="关闭航行图"></button>
    <section class="scene-atlas__panel">
      <header class="scene-atlas__head">
        <span class="atlas-sigil" aria-hidden="true">${icons.astrolabe}</span>
        <span><small>埃瑞瑞恩 · CELESTIAL ATLAS</small><h2 id="atlas-title">${theme.navigator.title}</h2><p>${theme.navigator.subtitle}</p></span>
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
document.body.append(document.querySelector('#world-map-modal'), document.querySelector('#settings'));
const motion = initMotionSystem({ surface: 'home' });

document.querySelector('#scenic-prev').innerHTML = `${icons.return}<span>上一处</span>`;
document.querySelector('#scenic-next').innerHTML = `${icons.astrolabe}<span>下一处</span>`;
document.querySelector('#scenic-return').innerHTML = `${icons.return}<span>返回书房</span>`;

function renderBooks() {
  const filtered = shelfBooks.filter((book) => (activeCategory === 'all' || (book.category?.name || '未分类') === activeCategory)
    && `${book.title}${book.author}`.toLowerCase().includes(query.toLowerCase()));
  const addBook = activeCategory === 'all' && !query ? `<button class="book-add" type="button" data-action="add-book">${icons.tome}<span>浏览典籍目录</span></button>` : '';
  document.querySelector('#books').innerHTML = filtered.length
    ? filtered.slice(0, 8).map((book) => `<button class="book" data-title="${esc(book.title)}" data-home-book="${esc(book.slug)}"><span class="book__cover" style="--cover:${book.coverUrl ? `linear-gradient(rgba(6,20,31,.12),rgba(6,20,31,.55)),url('${esc(book.coverUrl)}') center/cover` : 'linear-gradient(145deg,#17344a,#486a79)'}"><span>${esc(book.title)}</span></span><strong>${esc(book.title)}</strong><small>${esc(book.author || '佚名')}</small></button>`).join('') + addBook
    : `<p class="empty">${getStoredUser() ? '你的书架里暂时没有匹配的书' : '登录后查看你的真实书架'}</p>${addBook}`;
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

function setupWorldHud() {
  const weatherText = { clear: '晴朗', cloudy: '多云', rain: '雨', snow: '雪' };
  const periodText = { dawn: '晨曦', day: '白昼', dusk: '黄昏', night: '夜晚' };
  const popovers = [...topbar.querySelectorAll('[data-hud-popover]')];
  const toggles = [...topbar.querySelectorAll('[data-hud-toggle]')];
  const closeAll = except => {
    popovers.forEach(popover => {
      if (popover.dataset.hudPopover === except) return;
      popover.hidden = true;
      topbar.querySelector(`[data-hud-toggle="${popover.dataset.hudPopover}"]`)?.setAttribute('aria-expanded', 'false');
    });
  };
  const togglePopover = button => {
    const id = button.dataset.hudToggle;
    const popover = topbar.querySelector(`[data-hud-popover="${id}"]`);
    const opening = popover.hidden;
    closeAll(opening ? id : null);
    popover.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    if (opening) popover.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
  };
  const clockText = () => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const syncStatus = (snapshot = world.snapshot()) => {
    const weather = snapshot.enabled === false ? '氛围关闭' : (weatherText[snapshot.weather] || '晴朗');
    const period = periodText[snapshot.effectivePeriod || snapshot.period] || '白昼';
    const time = clockText();
    const scene = document.querySelector('#scene-status-name')?.textContent || theme.name;
    document.querySelector('#hud-status-place').textContent = scene;
    document.querySelector('#hud-status-weather').textContent = weather;
    document.querySelector('#hud-status-time').textContent = time;
    document.querySelector('#hud-detail-weather').textContent = weather;
    document.querySelector('#hud-detail-time').textContent = time;
    document.querySelector('#hud-detail-period').textContent = period;
  };
  const sourceSignal = topbar.querySelector('[data-chronicle-signal]');
  const syncNotice = () => {
    const unread = sourceSignal.hidden ? 0 : (Number(sourceSignal.querySelector('[data-chronicle-signal-label]')?.textContent.match(/\d+/)?.[0]) || 1);
    const badge = topbar.querySelector('[data-hud-badge]');
    const text = topbar.querySelector('[data-hud-chronicle-text]');
    const action = topbar.querySelector('[data-hud-action="chronicle"]');
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : String(unread);
    text.textContent = unread ? `${unread} 条新的世界记录` : '暂无新的世界记录';
    action.disabled = unread === 0;
  };
  toggles.forEach(button => button.addEventListener('click', event => { event.stopPropagation(); togglePopover(button); }));
  topbar.addEventListener('click', event => {
    const action = event.target.closest('[data-hud-action]');
    if (action) {
      closeAll();
      if (action.dataset.hudAction === 'world') world.open();
      if (action.dataset.hudAction === 'footprints') footprints.open();
      if (action.dataset.hudAction === 'chronicle' && !sourceSignal.hidden) sourceSignal.click();
    }
    if (event.target.closest('#scene-status,#scenic-toggle,#theme-button')) closeAll();
  });
  document.addEventListener('click', event => { if (!event.target.closest('.hud-anchor')) closeAll(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !popovers.some(popover => !popover.hidden)) return;
    event.preventDefault();
    closeAll();
  });
  window.addEventListener('worldchange', event => syncStatus({ ...event.detail, enabled: world.snapshot().enabled }));
  new MutationObserver(syncNotice).observe(sourceSignal, { attributes: true, childList: true, subtree: true, characterData: true });
  window.setInterval(() => syncStatus(), 30_000);
  syncStatus();
  syncNotice();
}

function renderHomeReadingData() {
  const notes = readingEntries.filter(item => item.type === 'note').slice(0, 3);
  const quotes = readingEntries.filter(item => item.type === 'quote').slice(0, 3);
  document.querySelector('#homeNotes').innerHTML = notes.length ? notes.map(item => `<article class="note-item" role="link" tabindex="0" data-home-entry="${esc(item.id)}" data-entry-tab="notes"><span class="note-thumb"></span><span><strong>${esc(item.title)}</strong><small>${esc(item.book?.title || item.source || new Date(item.updatedAt).toLocaleDateString('zh-CN'))}</small></span></article>`).join('') : '<div class="home-data-empty"><strong>这里还没有留下想法</strong><span>阅读时选中文字即可快速记录</span></div>';
  document.querySelector('#homeQuotes').innerHTML = quotes.length ? quotes.map(item => `<blockquote class="quote" role="link" tabindex="0" data-home-entry="${esc(item.id)}" data-entry-tab="quotes">${esc(item.content)}<cite>—— ${esc(item.book?.title || item.source || '我的书摘')}</cite></blockquote>`).join('') : '<div class="home-data-empty"><strong>这里还没有收藏片段</strong><span>遇见喜欢的句子，就把它留在书房</span></div>';
}

function renderContinueReading() {
  const book = shelfBooks.find(item => item.status === 'published' && item.shelf?.lastReadAt)
    || shelfBooks.find(item => item.status === 'published' && item.shelf?.status === 'reading')
    || shelfBooks.find(item => item.status === 'published');
  const card = document.querySelector('#continue-reading');
  if (!book) {
    card.querySelector('.reading__label').textContent = getStoredUser() ? '私人藏书还是空的' : '登录后同步阅读进度';
    card.querySelector('h2').textContent = getStoredUser() ? '去发现一本好书' : '我的阅读';
    card.querySelector('.reading__author').textContent = getStoredUser() ? '从典籍目录加入书架' : '你的书架、笔记与书摘会显示在这里';
    return;
  }
  const progress = Number(book.shelf?.progress || 0);
  card.querySelector('.reading__cover').dataset.title = book.title;
  if (book.coverUrl) card.querySelector('.reading__cover').style.backgroundImage = `linear-gradient(rgba(7,22,36,.12),rgba(7,22,36,.5)),url('${book.coverUrl}')`;
  card.querySelector('.reading__label').textContent = '上次翻开的书';
  card.querySelector('h2').textContent = book.title;
  card.querySelector('.reading__author').textContent = book.author || '佚名';
  const last = book.shelf?.lastReadAt ? new Date(book.shelf.lastReadAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '尚未开始';
  card.querySelectorAll('.reading__meta time')[0].textContent = last;
  card.querySelectorAll('.reading__meta time')[1].textContent = '正文';
  card.querySelector('.progress-line').style.setProperty('--reading-progress', `${progress}%`);
  card.querySelector('.progress-line span').textContent = `已读 ${progress}%`;
  card.querySelector('[data-action="read"]').textContent = `${progress ? '继续阅读' : '打开阅读'} →`;
}

async function hydratePersonalHome() {
  if (!getStoredUser()) {
    shelfBooks = [];
    readingEntries = [];
  } else {
    [shelfBooks, readingEntries] = await Promise.all([loadShelfBooks({ fresh: true }), listReadingEntries()]).catch(() => [[], []]);
    seedFootprints([
      ...shelfBooks.filter(book => book.shelf?.lastReadAt || book.shelf?.addedAt).map(book => ({ kind: 'book', targetId: book.slug, activity: book.shelf?.lastReadAt ? 'progress' : 'collected', timestamp: book.shelf?.lastReadAt || book.shelf?.addedAt, title: book.title, detail: book.author || book.category?.name, href: `index.html#shelf?book=${encodeURIComponent(book.slug)}`, coverUrl: book.coverUrl, progress: book.shelf?.progress || 0 })),
      ...readingEntries.map(entry => ({ kind: entry.type, targetId: entry.id, activity: 'edited', timestamp: entry.updatedAt, title: entry.type === 'note' ? entry.title : entry.content.slice(0, 48), detail: entry.book?.title || entry.source, href: `index.html#reading?tab=${entry.type === 'note' ? 'notes' : 'quotes'}&entry=${encodeURIComponent(entry.id)}` })),
    ]);
  }
  const categories = [...new Set(shelfBooks.map(book => book.category?.name || '未分类'))];
  document.querySelector('#shelfTabs').innerHTML = `<button class="tab is-active" data-category="all">最近加入</button>${categories.slice(0, 5).map(name => `<button class="tab" data-category="${esc(name)}">${esc(name)}</button>`).join('')}`;
  document.querySelector('#shelfCount').textContent = getStoredUser() ? `共 ${shelfBooks.length} 本藏书 →` : '登录查看 →';
  const statDetails = [
    getStoredUser() ? `${shelfBooks.length} 本藏书` : '登录查看藏书',
    '探索知识领域',
    `${readingEntries.filter(item => item.type === 'note').length} 条记录`,
    `${readingEntries.filter(item => item.type === 'quote').length} 条收藏`,
  ];
  document.querySelectorAll('[data-stat-index]').forEach(item => { item.querySelector('small').textContent = statDetails[Number(item.dataset.statIndex)]; });
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => selectCategory(tab.dataset.category)));
  renderBooks();
  renderContinueReading();
  renderHomeReadingData();
}

function getDialogControls(dialog) {
  return [...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
    .filter((element) => !element.hidden && element.getClientRects().length);
}

function trapDialogFocus(event, dialog) {
  if (event.key !== 'Tab') return;
  const controls = getDialogControls(dialog);
  if (!controls.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function ensureGlobe() {
  if (globeController) return globeController;
  globeController = createCelestialGlobe(document.querySelector('#celestial-globe'), {
    locations: theme.scenes.filter((scene) => scene.globe),
    activeId: document.documentElement.dataset.scene,
    chronicles: chronicles.getEntries(),
    textureUrl: 'assets/fantasy-world-map-v1.webp',
    onSelect(id) {
      closeWorldMap({ restoreFocus: false });
      openAtlas(id);
    },
    onChronicleSelect(id) {
      closeWorldMap({ restoreFocus: false });
      void chronicles.openReader(id);
    },
  });
  const atmosphere = world.snapshot();
  globeController.setAtmosphere({ weather: atmosphere.weather, period: atmosphere.effectivePeriod });
  return globeController;
}

function openWorldMap() {
  const modal = document.querySelector('#world-map-modal');
  worldMapReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : document.querySelector('#world-map-toggle');
  const globe = ensureGlobe();
  globe.setChronicles(chronicles.getEntries());
  const atmosphere = world.snapshot();
  globe.setAtmosphere({ weather: atmosphere.weather, period: atmosphere.effectivePeriod });
  globe.start();
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-world-map-open');
  void chronicles.check('world');
  window.setTimeout(() => document.querySelector('#world-map-close').focus(), 80);
}

function closeWorldMap({ restoreFocus = true } = {}) {
  const modal = document.querySelector('#world-map-modal');
  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-world-map-open');
  globeController?.pause();
  if (restoreFocus) worldMapReturnFocus?.focus({ preventScroll: true });
}

function updateSceneUI(scene) {
  document.querySelector('#scene-status-name').textContent = scene.name;
  document.querySelector('#hud-status-place').textContent = scene.name;
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

function openAtlas(sceneId = null, viewId = null) {
  const atlas = document.querySelector('#settings');
  const mapImage = atlas.querySelector('[data-atlas-src]');
  if (!mapImage.getAttribute('src')) mapImage.setAttribute('src', mapImage.dataset.atlasSrc);
  const requestedScene = typeof sceneId === 'string' ? sceneId : document.documentElement.dataset.scene;
  const requestedView = typeof viewId === 'string' ? viewId : (requestedScene === document.documentElement.dataset.scene ? document.documentElement.dataset.sceneView : null);
  updateAtlasSelection(requestedScene, requestedView);
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

async function selectScene(id, announce = true, viewId = null) {
  const nextScene = theme.scenes.find((item) => item.id === id) || theme.scenes[0];
  const type = ['city-overview', 'sea-of-clouds-terrace', 'white-stone-courtyard'].includes(nextScene.id) ? 'cloud'
    : ['sky-study', 'cloud-library-tower', 'forgotten-archive'].includes(nextScene.id) ? 'interior' : 'default';
  await sceneTransitions.transition({ type, targetName: nextScene.name, swap: () => {
    const scene = applyScene(theme, nextScene.id, viewId);
    syncWorldScene(scene);
    updateSceneUI(scene);
    updateAtlasSelection(scene.id, scene.activeView?.id);
    preloadSceneNeighbors(scene.id);
    recordWorldFeedback('scene_visited', { sceneId: scene.id, title: scene.name, viewId: scene.activeView?.id || '' });
    window.dispatchEvent(new CustomEvent('scenechange', { detail: scene }));
  } });
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
  [0, -1, 1].forEach((offset) => {
    const scene = theme.scenes[(current + offset + theme.scenes.length) % theme.scenes.length];
    (scene.views?.length ? scene.views : [scene]).forEach((visual) => {
      const collect = value => typeof value === 'string' ? [value] : Object.values(value || {}).flatMap(collect);
      [...new Set([visual.image, ...collect(visual.backgrounds || scene.backgrounds)])].filter(Boolean).forEach(source => {
        const image = new Image();
        image.src = source;
      });
    });
  });
}

function setScenicMode(enabled) {
  if (enabled) window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.classList.toggle('is-scenic', enabled);
  closeWorldMap({ restoreFocus: false });
  closeAtlas();
  const toggle = document.querySelector('#scenic-toggle');
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? '退出观景模式' : '进入观景模式');
}

renderBooks();
hydratePersonalHome();
void chronicles.check('home');
const initialScene = applyScene(theme, document.documentElement.dataset.scene, document.documentElement.dataset.sceneView);
syncWorldScene(initialScene);
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

const homeAvatar = document.querySelector('#homeAvatar');
const syncHomeAvatar = () => {
  const user = getStoredUser();
  if (user && user.avatarUrl) homeAvatar.innerHTML = `<img src="${withAppBase(user.avatarUrl)}" alt="">`;
  else homeAvatar.textContent = '旅';
  homeAvatar.setAttribute('aria-label', user ? `账号：${user.displayName || user.display_name || user.username}` : '旅者档案');
  homeAvatar.title = user ? '旅者档案' : '登录';
};
syncHomeAvatar();
window.addEventListener('study-auth-changed', syncHomeAvatar);
homeAvatar.addEventListener('click', () => { window.location.href = 'index.html#profile'; });

const syncHomeNavigation = () => {
  const activeId = homeNavId();
  document.querySelectorAll('[data-nav-id]').forEach(item => {
    const active = item.dataset.navId === activeId;
    item.classList.toggle('is-active', active);
    item.toggleAttribute('aria-current', active);
  });
  if (activeId === 'settings') openAtlas();
  if (activeId === 'home' && document.documentElement.dataset.scene !== theme.defaultScene) selectScene(theme.defaultScene, false);
};
window.addEventListener('hashchange', syncHomeNavigation);
window.addEventListener('study-auth-changed', () => { void chronicles.refresh().then(() => chronicles.check('home')); });
document.querySelector('.brand').addEventListener('click', () => {
  if (document.documentElement.dataset.scene !== theme.defaultScene) selectScene(theme.defaultScene, false);
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => selectCategory(tab.dataset.category)));
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
  if (document.body.classList.contains('is-world-map-open')) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeWorldMap();
      return;
    }
    trapDialogFocus(event, document.querySelector('#world-map-modal'));
    return;
  }
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
document.querySelector('#world-map-toggle').addEventListener('click', openWorldMap);
document.querySelector('#world-map-close').addEventListener('click', () => closeWorldMap());
document.querySelector('[data-world-map-close]').addEventListener('click', () => closeWorldMap());
document.querySelector('#globe-map').addEventListener('click', () => {
  closeWorldMap({ restoreFocus: false });
  openAtlas(theme.defaultScene);
});
if (location.hash === '#settings') requestAnimationFrame(syncHomeNavigation);
if (location.hash === '#shelf') requestAnimationFrame(() => document.querySelector('#shelf')?.scrollIntoView());
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
  showToast(root.dataset.atmosphere === 'dusk' ? '暮色已降临埃瑞瑞恩' : '埃瑞瑞恩迎来晨光');
});
document.querySelector('[data-action="read"]').addEventListener('click', () => { window.location.href = 'index.html#shelf'; });
document.querySelectorAll('[data-home-reading]').forEach(button => button.addEventListener('click', () => { window.location.href = `index.html#reading?tab=${button.dataset.homeReading}`; }));
const openHomeEntry = target => { window.location.href = `index.html#reading?tab=${target.dataset.entryTab}&entry=${encodeURIComponent(target.dataset.homeEntry)}`; };
['#homeNotes', '#homeQuotes'].forEach(selector => {
  document.querySelector(selector).addEventListener('click', event => { const target = event.target.closest('[data-home-entry]'); if (target) openHomeEntry(target); });
  document.querySelector(selector).addEventListener('keydown', event => { const target = event.target.closest('[data-home-entry]'); if (target && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openHomeEntry(target); } });
});
document.querySelector('#books').addEventListener('click', (event) => {
  const book = event.target.closest('.book');
  if (book) window.location.href = `index.html#shelf?book=${encodeURIComponent(book.dataset.homeBook)}`;
  if (event.target.closest('[data-action="add-book"]')) window.location.href = 'index.html#categories';
});
window.addEventListener('pagehide', () => {
  globeController?.destroy();
  globeController = null;
  motion.destroy();
  sceneTransitions.destroy();
}, { once: true });
