import { getStoredUser } from './auth-client.js';
import { checkChronicleTriggers, getChronicle, listChronicles, markChronicleRead } from './chronicles-client.js';
import { withAppBase } from './runtime-paths.js';
import { recordWorldFeedback } from './world-feedback.js';

const TYPES = {
  voyage_log: ['航行记录', 'VOYAGE RECORD', '⌁'], adventure_log: ['冒险者日志', 'ADVENTURE LOG', '✦'],
  lost_letter: ['失落信件', 'LOST LETTER', '✉'], ancient_fragment: ['古代残卷', 'ANCIENT FRAGMENT', '◫'],
  map_annotation: ['地图批注', 'MAP ANNOTATION', '⌖'], observation: ['观测记录', 'OBSERVATION RECORD', '◉'],
  archive_record: ['档案记录', 'ARCHIVE RECORD', '◇'],
};
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const paragraphs = value => esc(value).split(/\n{2,}/).map(text => `<p>${text.replace(/\n/g, '<br>')}</p>`).join('');

class ChronicleController {
  constructor({ world, page = 'home' } = {}) {
    this.world = world;
    this.page = page;
    this.busy = false;
    this.archive = null;
    this.returnFocus = null;
    this.root = document.createElement('div');
    this.root.className = 'chronicle-system';
    this.root.innerHTML = `<aside class="chronicle-discovery" role="status" aria-live="polite" aria-hidden="true"></aside>
      <aside class="chronicle-reader" role="dialog" aria-modal="true" aria-labelledby="chronicle-reader-title" aria-hidden="true">
        <button class="chronicle-reader__backdrop" type="button" data-chronicle-close aria-label="关闭纪事"></button>
        <article class="chronicle-reader__folio"></article>
      </aside>`;
    document.body.append(this.root);
    this.bind();
    void this.refresh();
  }

  bind() {
    this.root.addEventListener('click', event => {
      const close = event.target.closest('[data-chronicle-close]');
      if (close) this.closeReader();
      const view = event.target.closest('[data-chronicle-view]');
      if (view) void this.openReader(view.dataset.chronicleView);
      const dismiss = event.target.closest('[data-chronicle-dismiss]');
      if (dismiss) this.hideDiscovery();
      const archive = event.target.closest('[data-chronicle-archive]');
      if (archive) location.href = withAppBase('/chronicles');
    });
    document.addEventListener('click', event => {
      const view = event.target.closest('[data-open-chronicle]');
      if (view) void this.openReader(view.dataset.openChronicle);
      if (event.target.closest('[data-open-chronicles]')) location.href = withAppBase('/chronicles');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isReaderOpen()) { event.preventDefault(); this.closeReader(); }
      if (event.key === 'Tab' && this.isReaderOpen()) this.trapFocus(event);
    });
    window.addEventListener('study-auth-changed', () => { this.archive = null; void this.refresh(); });
  }

  setContext(page) { this.page = page || 'home'; }

  async refresh() {
    if (!getStoredUser()) { this.archive = null; this.renderCounts(); return null; }
    try {
      this.archive = await listChronicles();
      this.renderCounts();
      window.dispatchEvent(new CustomEvent('chroniclearchivechange', { detail: this.archive }));
      return this.archive;
    }
    catch { this.archive = null; this.renderCounts(); return null; }
  }

  renderCounts() {
    const found = this.archive?.discovered || 0;
    const total = this.archive?.total || 12;
    document.querySelectorAll('[data-chronicle-count]').forEach(node => { node.textContent = `${found} / ${total}`; });
    const unread = this.archive?.entries?.filter(entry => entry.status === 'discovered') || [];
    document.querySelectorAll('[data-chronicle-signal]').forEach(button => {
      button.hidden = !unread.length;
      button.dataset.openChronicle = unread[0]?.id || '';
      const label = button.querySelector('[data-chronicle-signal-label]');
      if (label) label.textContent = unread.length > 1 ? `${unread.length} 条新的世界记录` : '新的世界记录';
    });
  }

  async check(page = this.page) {
    if (!getStoredUser() || this.busy) return null;
    this.busy = true;
    try {
      const snapshot = this.world?.snapshot?.() || {};
      const result = await checkChronicleTriggers({
        page, weather: snapshot.weather || '', period: snapshot.effectivePeriod || snapshot.period || '',
        scene: snapshot.scene || document.documentElement.dataset.scene || '', date: this.localDate(),
      });
      if (result.discovered && result.entry) {
        await this.refresh();
        recordWorldFeedback('chronicle_discovered', {
          id: result.entry.id, title: result.entry.title, recordNumber: result.entry.recordNumber,
          coordinates: result.entry.coordinates || null, regionId: result.entry.regionId || '',
        });
        this.showDiscovery(result.entry);
        window.dispatchEvent(new CustomEvent('chroniclechange', { detail: result.entry }));
      }
      return result;
    } catch { return null; }
    finally { this.busy = false; }
  }

  getEntries() { return this.archive?.entries || []; }

  showDiscovery(entry) {
    const type = TYPES[entry.type] || TYPES.archive_record;
    const toast = this.root.querySelector('.chronicle-discovery');
    toast.innerHTML = `<span class="chronicle-discovery__glow" aria-hidden="true"></span><span class="chronicle-discovery__icon">${type[2]}</span>
      <span><small>WORLD CHRONICLES</small><strong>发现新的${type[0]}</strong><em>${type[1]} · ${String(entry.recordNumber).padStart(4, '0')}<br>《${esc(entry.title)}》</em></span>
      <button type="button" data-chronicle-view="${esc(entry.id)}">查看记录</button><button type="button" data-chronicle-dismiss aria-label="稍后查看">×</button>`;
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-chronicle-discovery-visible');
  }

  hideDiscovery() {
    const toast = this.root.querySelector('.chronicle-discovery');
    toast.classList.remove('is-visible');
    toast.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-chronicle-discovery-visible');
  }

  async openReader(id) {
    if (!id) return;
    try {
      const entry = await getChronicle(id);
      this.returnFocus = document.activeElement;
      this.hideDiscovery();
      this.renderReader(entry);
      const reader = this.root.querySelector('.chronicle-reader');
      reader.classList.add('is-open'); reader.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-chronicle-reader-open');
      requestAnimationFrame(() => reader.querySelector('.chronicle-reader__close')?.focus());
      if (entry.status !== 'read') {
        await markChronicleRead(id);
        await this.refresh();
        window.dispatchEvent(new CustomEvent('chroniclechange', { detail: { ...entry, status: 'read' } }));
      }
    } catch (error) { window.dispatchEvent(new CustomEvent('study-toast', { detail: error.message })); }
  }

  renderReader(entry) {
    const type = TYPES[entry.type] || TYPES.archive_record;
    const entries = this.archive?.entries?.filter(item => item.status !== 'locked') || [];
    const index = entries.findIndex(item => item.id === entry.id);
    const previous = entries[index - 1]; const next = entries[index + 1];
    this.root.querySelector('.chronicle-reader__folio').innerHTML = `<header>
      <button class="chronicle-reader__close" type="button" data-chronicle-close aria-label="关闭">×</button>
      <small>WORLD CHRONICLES</small><span class="chronicle-reader__rule"></span>
      <p>${type[2]} ${type[1]} · ${String(entry.recordNumber).padStart(4, '0')}</p>
      <h2 id="chronicle-reader-title">${esc(entry.title)}</h2><em>${esc(entry.subtitle || entry.recordDate || '')}</em>
    </header><section class="chronicle-reader__content">${paragraphs(entry.content)}</section>
    <footer><div><small>记录者</small><strong>${esc(entry.author || '未知')}</strong></div><div><small>发现于</small><strong>${esc(entry.discoverLocation || '未知地点')}</strong></div>
      <nav aria-label="纪事记录导航"><button type="button" data-chronicle-view="${previous?.id || ''}" ${previous ? '' : 'disabled'}>← 上一条</button><button type="button" data-chronicle-archive>收入档案 · ${this.archive?.discovered || 1}/${this.archive?.total || 12}</button><button type="button" data-chronicle-view="${next?.id || ''}" ${next ? '' : 'disabled'}>下一条 →</button></nav></footer>`;
  }

  closeReader() {
    const reader = this.root.querySelector('.chronicle-reader');
    reader.classList.remove('is-open'); reader.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-chronicle-reader-open');
    this.returnFocus?.focus?.({ preventScroll: true });
  }
  isReaderOpen() { return this.root.querySelector('.chronicle-reader').classList.contains('is-open'); }
  trapFocus(event) {
    const controls = [...this.root.querySelectorAll('.chronicle-reader button:not([disabled])')].filter(item => item.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

export const chronicleTypes = TYPES;
export function initChronicles(options = {}) {
  if (window.cloudRealmChronicles) {
    window.cloudRealmChronicles.world ||= options.world;
    window.cloudRealmChronicles.setContext(options.page);
    return window.cloudRealmChronicles;
  }
  window.cloudRealmChronicles = new ChronicleController(options);
  return window.cloudRealmChronicles;
}
