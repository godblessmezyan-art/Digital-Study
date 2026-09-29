import { getStoredUser } from './auth-client.js';

const STORAGE_PREFIX = 'cloud-realm-footprints-v1';
const MAX_ITEMS = 20;

const kindMeta = {
  book: { icon: '▥', label: '阅读' },
  note: { icon: '✎', label: '笔记' },
  quote: { icon: '❞', label: '书摘' },
};

const activityLabels = {
  opened: '翻开了',
  progress: '阅读至',
  collected: '珍藏了',
  edited: '修改了',
  created: '写下了',
  draft: '保存了草稿',
  published: '发布了',
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function identity() {
  const user = getStoredUser();
  return user?.id || user?.username || null;
}

function storageKey() {
  const id = identity();
  return id ? `${STORAGE_PREFIX}:${encodeURIComponent(id)}` : null;
}

function blankEnvelope() {
  return { items: [], hidden: [], clearedAt: 0 };
}

function readEnvelope() {
  const key = storageKey();
  if (!key) return blankEnvelope();
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    return {
      items: Array.isArray(stored?.items) ? stored.items.slice(0, MAX_ITEMS) : [],
      hidden: Array.isArray(stored?.hidden) ? stored.hidden : [],
      clearedAt: Number(stored?.clearedAt || 0),
    };
  } catch {
    return blankEnvelope();
  }
}

export function readFootprints() {
  return readEnvelope().items.slice(0, MAX_ITEMS);
}

function writeEnvelope(envelope) {
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify({
    ...envelope,
    items: envelope.items.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_ITEMS),
    hidden: envelope.hidden.slice(-80),
  }));
  window.dispatchEvent(new CustomEvent('footprints-change'));
}

function itemKey(kind, targetId) {
  return `${kind}:${targetId}`;
}

function timestampValue(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizedFootprint(input, previous = {}) {
  const timestamp = timestampValue(input.timestamp || Date.now());
  return {
    key: itemKey(input.kind, input.targetId),
    kind: input.kind,
    targetId: String(input.targetId),
    activity: input.activity || previous.activity || 'opened',
    title: String(input.title || previous.title || '未命名内容'),
    detail: String(input.detail || previous.detail || ''),
    href: String(input.href || previous.href || ''),
    coverUrl: String(input.coverUrl || previous.coverUrl || ''),
    progress: Number.isFinite(Number(input.progress)) ? Number(input.progress) : previous.progress,
    status: input.status || previous.status || '',
    timestamp,
    available: input.available !== false,
  };
}

export function recordFootprint(input) {
  if (!identity() || !kindMeta[input.kind] || !input.targetId) return;
  const envelope = readEnvelope();
  const key = itemKey(input.kind, input.targetId);
  const previous = envelope.items.find(item => item.key === key);
  envelope.hidden = envelope.hidden.filter(item => item !== key);
  const item = normalizedFootprint(input, previous);
  envelope.items = [item, ...envelope.items.filter(entry => entry.key !== key)];
  writeEnvelope(envelope);
  window.dispatchEvent(new CustomEvent('footprintrecorded', { detail: item }));
}

export function seedFootprints(inputs = []) {
  if (!identity() || !inputs.length) return;
  const envelope = readEnvelope();
  const hidden = new Set(envelope.hidden);
  let changed = false;
  inputs.forEach(input => {
    if (!kindMeta[input.kind] || !input.targetId) return;
    const key = itemKey(input.kind, input.targetId);
    const timestamp = input.timestamp ? timestampValue(input.timestamp) : 0;
    if (!timestamp || timestamp <= envelope.clearedAt || hidden.has(key)) return;
    const previous = envelope.items.find(item => item.key === key);
    if (previous && previous.timestamp >= timestamp) return;
    envelope.items = [normalizedFootprint(input, previous), ...envelope.items.filter(item => item.key !== key)];
    changed = true;
  });
  if (changed) writeEnvelope(envelope);
}

export function markFootprintUnavailable(kind, targetId) {
  const envelope = readEnvelope();
  const key = itemKey(kind, targetId);
  const item = envelope.items.find(entry => entry.key === key);
  if (!item) return;
  item.available = false;
  item.detail = '源内容已删除或暂时不可访问';
  writeEnvelope(envelope);
}

function hideFootprint(key) {
  const envelope = readEnvelope();
  envelope.items = envelope.items.filter(item => item.key !== key);
  if (!envelope.hidden.includes(key)) envelope.hidden.push(key);
  writeEnvelope(envelope);
}

function clearFootprints() {
  const envelope = readEnvelope();
  envelope.items = [];
  envelope.hidden = [];
  envelope.clearedAt = Date.now();
  writeEnvelope(envelope);
}

function dateGroup(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const day = 86400000;
  if (date.getTime() >= start) return '今天';
  if (date.getTime() >= start - day) return '昨天';
  return '更早';
}

function timeText(timestamp) {
  const date = new Date(timestamp);
  if (dateGroup(timestamp) === '今天') return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

class FootprintsController {
  constructor({ mount }) {
    this.returnFocus = null;
    this.root = document.createElement('div');
    this.root.className = 'footprints-system';
    this.root.innerHTML = `<aside class="footprints-drawer" role="dialog" aria-modal="true" aria-labelledby="footprints-title" aria-hidden="true">
      <button class="footprints-drawer__backdrop" type="button" data-footprints-close aria-label="关闭足迹"></button>
      <section class="footprints-drawer__panel">
        <header><span><small>TRACES OF READING</small><h2 id="footprints-title">我的足迹</h2><p>最近阅读、编辑与珍藏的内容</p></span><button type="button" data-footprints-close aria-label="关闭">×</button></header>
        <div class="footprints-list" data-footprints-list></div>
        <footer><span>仅保留最近 ${MAX_ITEMS} 条有效活动</span><button type="button" data-footprints-clear>清空足迹</button></footer>
      </section>
    </aside>`;
    document.body.append(this.root);
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'footprints-entry';
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.innerHTML = '<span aria-hidden="true">◌</span><span><small>足迹</small><strong data-footprints-count>0</strong></span>';
    mount.append(this.button);
    this.bind();
    this.render();
  }

  isOpen() { return this.root.querySelector('.footprints-drawer').classList.contains('is-open'); }

  bind() {
    this.button.addEventListener('click', () => this.open());
    this.root.querySelectorAll('[data-footprints-close]').forEach(button => button.addEventListener('click', () => this.close()));
    this.root.querySelector('[data-footprints-clear]').addEventListener('click', () => {
      if (!readEnvelope().items.length || !confirm('清空所有足迹？这不会删除书籍、阅读进度、笔记或书摘。')) return;
      clearFootprints();
    });
    this.root.querySelector('[data-footprints-list]').addEventListener('click', event => {
      const hide = event.target.closest('[data-footprint-hide]');
      if (hide) { event.preventDefault(); hideFootprint(hide.dataset.footprintHide); }
    });
    window.addEventListener('footprints-change', () => this.render());
    window.addEventListener('study-auth-changed', () => this.render());
    window.addEventListener('storage', event => { if (event.key?.startsWith(STORAGE_PREFIX)) this.render(); });
    document.addEventListener('keydown', event => {
      if (!this.isOpen()) return;
      if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...this.root.querySelectorAll('button:not([disabled]),a[href]')].filter(item => item.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  render() {
    const user = getStoredUser();
    const items = readEnvelope().items.slice(0, MAX_ITEMS);
    this.button.querySelector('[data-footprints-count]').textContent = items.length ? String(items.length) : '—';
    this.button.setAttribute('aria-label', `足迹，${items.length} 条记录`);
    const list = this.root.querySelector('[data-footprints-list]');
    if (!user) {
      list.innerHTML = '<div class="footprints-empty"><span>◌</span><h3>登录后留下足迹</h3><p>阅读、笔记和珍藏会按当前账号分别保存。</p></div>';
      return;
    }
    if (!items.length) {
      list.innerHTML = '<div class="footprints-empty"><span>◌</span><h3>还没有足迹</h3><p>翻开书籍、保存笔记或珍藏书摘后，会在这里留下入口。</p></div>';
      return;
    }
    const groups = ['今天', '昨天', '更早'];
    list.innerHTML = groups.map(group => {
      const matches = items.filter(item => dateGroup(item.timestamp) === group);
      if (!matches.length) return '';
      return `<section class="footprints-group"><h3>${group}</h3>${matches.map(item => this.itemMarkup(item)).join('')}</section>`;
    }).join('');
  }

  itemMarkup(item) {
    const meta = kindMeta[item.kind] || kindMeta.book;
    const activity = activityLabels[item.activity] || meta.label;
    const detail = item.progress !== undefined && item.activity === 'progress' ? `阅读进度 ${item.progress}%` : item.detail;
    const cover = item.coverUrl ? ` style="--footprint-cover:url('${esc(item.coverUrl)}')"` : '';
    const content = `<span class="footprint-item__icon ${item.kind}"${cover}>${item.coverUrl ? '' : meta.icon}</span><span class="footprint-item__copy"><small>${activity} · ${timeText(item.timestamp)}</small><strong>${esc(item.title)}</strong><span>${esc(detail || meta.label)}</span></span>`;
    return `<article class="footprint-item ${item.available === false ? 'is-unavailable' : ''}">${item.available === false ? `<div class="footprint-item__link" aria-disabled="true">${content}</div>` : `<a class="footprint-item__link" href="${esc(item.href)}">${content}</a>`}<button type="button" data-footprint-hide="${esc(item.key)}" aria-label="隐藏${esc(item.title)}">×</button></article>`;
  }

  open() {
    this.render();
    this.returnFocus = document.activeElement;
    const drawer = this.root.querySelector('.footprints-drawer');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-footprints-open');
    setTimeout(() => drawer.querySelector('.footprints-drawer__panel [data-footprints-close]').focus(), 40);
  }

  close() {
    const drawer = this.root.querySelector('.footprints-drawer');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-footprints-open');
    this.returnFocus?.focus({ preventScroll: true });
  }
}

export function initFootprints(options) {
  if (window.cloudRealmFootprints) return window.cloudRealmFootprints;
  window.cloudRealmFootprints = new FootprintsController(options);
  return window.cloudRealmFootprints;
}
