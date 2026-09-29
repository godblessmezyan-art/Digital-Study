import { getWorldFeedbackState } from './world-feedback.js';
import { withAppBase } from './runtime-paths.js';

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const coarseQuery = matchMedia('(pointer: coarse)');

class AmbientEventScheduler {
  constructor(callback) { this.callback = callback; this.timer = 0; this.key = 'cloud-realm-last-ambient-event-v1'; }
  schedule() {
    this.stop();
    if (reducedQuery.matches || document.hidden || document.documentElement.dataset.motionLevel === 'low') return;
    const minimum = 10 * 60 * 1000;
    const elapsed = Date.now() - Number(localStorage.getItem(this.key) || 0);
    const delay = Math.max(minimum - elapsed, 0) + Math.random() * 20 * 60 * 1000;
    this.timer = window.setTimeout(() => {
      localStorage.setItem(this.key, String(Date.now()));
      this.callback?.();
      this.schedule();
    }, delay);
  }
  stop() { clearTimeout(this.timer); this.timer = 0; }
}

class MotionSystem {
  constructor({ surface = 'app' } = {}) {
    this.surface = surface;
    this.reduced = reducedQuery.matches;
    this.coarse = coarseQuery.matches;
    this.returnVisit = sessionStorage.getItem('cloud-realm-motion-entered') === 'true';
    sessionStorage.setItem('cloud-realm-motion-entered', 'true');
    document.body.classList.toggle('motion-return-visit', this.returnVisit);
    this.frame = 0;
    this.eventTimer = 0;
    this.targetX = 0; this.targetY = 0; this.currentX = 0; this.currentY = 0;
    this.seen = new WeakSet();
    this.ambient = this.createAmbientLayer();
    this.observer = this.createRevealObserver();
    this.mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => this.observe(node))));
    this.mutations.observe(document.body, { childList: true, subtree: true });
    this.events = new AmbientEventScheduler(() => this.playAmbientEvent());
    this.bind();
    this.observe(document.body);
    if (surface === 'home') this.renderWorldFeedback();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('motion-ready')));
    this.events.schedule();
  }

  createAmbientLayer() {
    const layer = document.createElement('div');
    layer.className = 'world-ambient-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `<span class="ambient-cloud ambient-cloud--far"></span><span class="ambient-cloud ambient-cloud--mid"></span><span class="ambient-cloud ambient-cloud--near"></span><span class="ambient-light"></span><span class="ambient-stars"></span><span class="ambient-lamp"></span><span class="ambient-dust">${Array.from({ length: this.coarse ? 3 : 7 }, (_, index) => `<i style="--dust-index:${index}"></i>`).join('')}</span><span class="scene-signature scene-signature--paper"></span><span class="scene-signature scene-signature--wind"></span><span class="scene-signature scene-signature--window"></span><span class="ambient-event-stage"></span>`;
    document.body.append(layer);
    return layer;
  }

  createRevealObserver() {
    if (this.reduced || !('IntersectionObserver' in window)) return null;
    return new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-motion-revealed');
      this.observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  }

  observe(root) {
    if (!(root instanceof Element) && root !== document.body) return;
    const selectors = '.hero__welcome,.daily-bookmark,.world-presence,.stat-grid,.content-grid>*,.category-section,.shelf,.journal-page>header,.journal-today,.journal-view-row,.journal-year,.journal-calendar,.chronicles-hero,.chronicle-season,.content-shell,.shelf-page>*,.reading-space>*,.ai-workshop-page>*';
    const found = root.querySelectorAll ? root.querySelectorAll(selectors) : [];
    const nodes = root.matches?.(selectors) ? [root] : [...found];
    nodes.forEach((node, index) => {
      if (this.seen.has(node)) return;
      this.seen.add(node);
      node.dataset.motionReveal = '';
      node.style.setProperty('--motion-order', index % 5);
      if (this.observer) this.observer.observe(node); else node.classList.add('is-motion-revealed');
    });
  }

  bind() {
    document.body.classList.add('motion-enabled');
    document.documentElement.dataset.motionLevel ||= 'normal';
    this.pointer = event => {
      if (this.reduced || this.coarse || this.surface !== 'home' || document.documentElement.dataset.motionLevel === 'low') return;
      this.targetX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
      this.targetY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
      if (!this.frame) this.frame = requestAnimationFrame(() => this.updateParallax());
    };
    window.addEventListener('pointermove', this.pointer, { passive: true });
    this.visibility = () => {
      document.documentElement.classList.toggle('motion-paused', document.hidden);
      if (document.hidden) this.events.stop(); else this.events.schedule();
    };
    document.addEventListener('visibilitychange', this.visibility);
    this.routeChange = () => {
      if (this.reduced || this.coarse || innerWidth < 820) return;
      document.body.classList.add('motion-route-changing');
      setTimeout(() => document.body.classList.remove('motion-route-changing'), 280);
    };
    window.addEventListener('hashchange', this.routeChange);
    this.feedback = () => { if (this.surface === 'home') this.renderWorldFeedback(); };
    window.addEventListener('worldfeedback', this.feedback);
    window.addEventListener('footprintrecorded', this.feedback);
    window.addEventListener('footprints-change', this.feedback);
    this.worldChange = () => { this.events.schedule(); if (this.surface === 'home') this.renderWorldFeedback(); };
    window.addEventListener('worldchange', this.worldChange);
  }

  updateParallax() {
    this.frame = 0;
    this.currentX += (this.targetX - this.currentX) * .07;
    this.currentY += (this.targetY - this.currentY) * .07;
    document.documentElement.style.setProperty('--motion-x', `${(this.currentX * 7).toFixed(2)}px`);
    document.documentElement.style.setProperty('--motion-y', `${(this.currentY * 5).toFixed(2)}px`);
    if (Math.abs(this.targetX - this.currentX) > .003 || Math.abs(this.targetY - this.currentY) > .003) this.frame = requestAnimationFrame(() => this.updateParallax());
  }

  renderWorldFeedback() {
    this.ambient.querySelectorAll('.world-feedback-artifact').forEach(node => node.remove());
    const state = getWorldFeedbackState();
    const journal = state.lastJournalEntry;
    if (journal) this.appendArtifact('journal', { href: withAppBase(`/journal/${encodeURIComponent(journal.detail?.id || '')}`), icon: '✎', eyebrow: '最近一次记录', title: journal.detail?.title || '旅者手记', time: journal.createdAt });
    if (state.lastReadBook) this.appendArtifact('book', { href: state.lastReadBook.detail.href || withAppBase('/index.html#shelf'), icon: '▥', eyebrow: '最近翻开的书', title: state.lastReadBook.detail.title || '继续阅读', time: state.lastReadBook.createdAt, coverUrl: state.lastReadBook.detail.coverUrl });
    if (state.lastChronicleDiscovery) this.appendArtifact('chronicle', { href: withAppBase('/chronicles'), icon: '◇', eyebrow: '新的世界记录', title: state.lastChronicleDiscovery.detail?.title || '世界纪事', time: state.lastChronicleDiscovery.createdAt });
    this.renderPresence(state);
  }

  appendArtifact(kind, data) {
    const link = document.createElement('a');
    link.className = `world-feedback-artifact world-feedback-${kind}`;
    link.href = data.href;
    if (data.coverUrl) link.style.setProperty('--feedback-cover', `url("${String(data.coverUrl).replace(/["\\]/g, '')}")`);
    link.innerHTML = `<span aria-hidden="true">${data.icon}</span><small>${this.escape(data.eyebrow)} · ${this.relativeTime(data.time)}</small><strong>${this.escape(data.title)}</strong>`;
    this.ambient.append(link);
  }

  renderPresence(state) {
    const root = document.querySelector('[data-world-presence]');
    if (!root) return;
    const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const weather = { clear: '晴朗', cloudy: '多云', rain: '雨', snow: '雪' }[document.documentElement.dataset.worldWeather] || '晴朗';
    const period = { dawn: '清晨', day: '白昼', dusk: '黄昏', night: '深夜' }[document.documentElement.dataset.worldTime] || '白昼';
    const rows = [
      state.lastJournalEntry && `<a href="${withAppBase(`/journal/${encodeURIComponent(state.lastJournalEntry.detail?.id || '')}`)}"><span>旅者手记</span><b>${this.relativeTime(state.lastJournalEntry.createdAt)}</b></a>`,
      state.lastReadBook && `<a href="${this.escape(state.lastReadBook.detail.href || 'index.html#shelf')}"><span>最近阅读</span><b>《${this.escape(state.lastReadBook.detail.title)}》</b></a>`,
      state.lastChronicleDiscovery && `<a href="${withAppBase('/chronicles')}"><span>世界记录</span><b>一条新坐标</b></a>`,
    ].filter(Boolean).join('');
    root.innerHTML = `<header><span><small>WORLD PRESENCE</small><strong>云天幻境</strong></span><time>${time}</time></header><p>${period} · ${weather} · 云层缓行</p>${rows ? `<div>${rows}</div>` : '<em>世界正安静地等待你的下一次记录</em>'}`;
  }

  relativeTime(value) {
    const elapsed = Date.now() - Date.parse(value);
    if (!Number.isFinite(elapsed) || elapsed < 60000) return '刚刚';
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}分钟前`;
    if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}小时前`;
    return `${Math.floor(elapsed / 86400000)}天前`;
  }

  playAmbientEvent() {
    if (this.surface !== 'home' || this.reduced || this.coarse || document.documentElement.dataset.motionLevel === 'low') return;
    const period = document.documentElement.dataset.worldTime;
    const weather = document.documentElement.dataset.worldWeather;
    const types = period === 'night' ? ['meteor'] : weather === 'clear' ? ['airship', 'birds'] : ['airship'];
    const type = types[Math.floor(Math.random() * types.length)];
    const stage = this.ambient.querySelector('.ambient-event-stage');
    stage.className = `ambient-event-stage is-active ambient-event--${type}`;
    stage.innerHTML = type === 'birds' ? '<i></i><i></i><i></i><i></i>' : '<i></i>';
    clearTimeout(this.eventTimer);
    this.eventTimer = setTimeout(() => { stage.className = 'ambient-event-stage'; stage.replaceChildren(); }, 10_000);
    window.dispatchEvent(new CustomEvent('ambienteventtick', { detail: { type } }));
  }

  escape(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  destroy() {
    cancelAnimationFrame(this.frame); clearTimeout(this.eventTimer); this.observer?.disconnect(); this.mutations.disconnect(); this.events.stop();
    window.removeEventListener('pointermove', this.pointer); window.removeEventListener('hashchange', this.routeChange);
    window.removeEventListener('worldfeedback', this.feedback); window.removeEventListener('footprintrecorded', this.feedback); window.removeEventListener('footprints-change', this.feedback); window.removeEventListener('worldchange', this.worldChange); document.removeEventListener('visibilitychange', this.visibility);
    this.ambient.remove(); document.body.classList.remove('motion-enabled', 'motion-ready');
    if (window.cloudRealmMotion === this) delete window.cloudRealmMotion;
  }
}

export function initMotionSystem(options = {}) {
  if (window.cloudRealmMotion) return window.cloudRealmMotion;
  window.cloudRealmMotion = new MotionSystem(options);
  return window.cloudRealmMotion;
}
