import { getStoredUser } from './auth-client.js';
import { listJournalEntries } from './journal-client.js';
import { JournalCalendar } from './journal-calendar.js';
import { escapeJournalHtml, JournalEmptyState, JournalHeader, JournalSearch, JournalSkeleton, JournalTimeline, JournalTodayCard } from './journal-components.js';
import { JournalEditor } from './journal-editor.js';
import { JournalTemplatesPage } from './journal-templates-page.js';
import { JournalReader } from './journal-reader.js';

function journalRoute() {
  const match = location.pathname.match(/\/journal(?:\/([^/?#]+))?(?:\/([^/?#]+))?\/?$/);
  return match ? { first: match[1] ? decodeURIComponent(match[1]) : '', second: match[2] || '' } : { first: '', second: '' };
}

export function renderJournalError(root, message, retry) {
  root.innerHTML = `<section class="journal-page"><div class="journal-error"><span>手记暂时没有翻开</span><p>${escapeJournalHtml(message)}</p><button type="button">重新尝试</button></div></section>`;
  root.querySelector('button').onclick = retry;
}

export async function JournalPage(root, { showToast, openLogin }) {
  root.innerHTML = JournalSkeleton();
  if (!getStoredUser()) {
    root.innerHTML = `<section class="journal-page journal-page--list">${JournalEmptyState({ authenticated: false })}</section>`;
    root.querySelector('[data-journal-login]').onclick = event => { event.preventDefault(); openLogin(); };
    return;
  }
  try {
    const allEntries = await listJournalEntries();
    const years = [...new Set(allEntries.map(entry => entry.entryDate.slice(0, 4)))];
    const tags = [...new Set(allEntries.flatMap(entry => entry.tags || []))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    root.innerHTML = `<section class="journal-page journal-page--list">
      ${JournalHeader(allEntries)}${JournalTodayCard(allEntries)}
      <div class="journal-view-row"><div class="journal-view-switch" role="group" aria-label="手记视图"><button type="button" data-journal-view="timeline" class="is-active">时间轴</button><button type="button" data-journal-view="calendar">日历</button></div>${JournalSearch({ years, tags })}</div>
      <div data-journal-results></div>
    </section>`;
    const controls = root.querySelector('.journal-search'), results = root.querySelector('[data-journal-results]');
    let entries = allEntries, view = 'timeline', timer;
    const bindTags = () => root.querySelectorAll('[data-journal-tag]').forEach(button => button.onclick = () => {
      const select = controls.elements.tag; select.value = button.dataset.journalTag; controls.querySelector('.journal-filters').hidden = false; controls.querySelector('.journal-filter-toggle').setAttribute('aria-expanded', 'true'); void refresh();
    });
    const paint = () => {
      if (!entries.length) { results.innerHTML = JournalEmptyState({ filtered: true }); return; }
      if (view === 'calendar') JournalCalendar(results, entries);
      else { results.innerHTML = JournalTimeline(entries); bindTags(); }
    };
    const refresh = async () => {
      const data = new FormData(controls), filters = Object.fromEntries(data.entries());
      if (filters.month && !filters.year) filters.year = String(new Date().getFullYear());
      results.classList.add('is-loading');
      try { entries = await listJournalEntries(filters); paint(); }
      catch (error) { showToast(error.message); }
      finally { results.classList.remove('is-loading'); }
    };
    root.querySelectorAll('[data-journal-view]').forEach(button => button.onclick = () => {
      view = button.dataset.journalView;
      root.querySelectorAll('[data-journal-view]').forEach(item => item.classList.toggle('is-active', item === button));
      paint();
    });
    const filterToggle = controls.querySelector('.journal-filter-toggle');
    filterToggle.onclick = () => {
      const filters = controls.querySelector('.journal-filters'), expanded = filters.hidden;
      filters.hidden = !expanded; filterToggle.setAttribute('aria-expanded', String(expanded));
    };
    controls.addEventListener('submit', event => { event.preventDefault(); void refresh(); });
    controls.elements.search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refresh, 350); });
    controls.querySelector('.journal-filters').addEventListener('change', refresh);
    paint();
  } catch (error) {
    renderJournalError(root, error.message, () => JournalPage(root, { showToast, openLogin }));
  }
}

export function createJournalPage(root, options) {
  window.__journalCleanup?.(); window.__journalCleanup = null;
  if (!getStoredUser()) return JournalPage(root, options);
  const route = journalRoute();
  const shared = { ...options, renderError: renderJournalError };
  if (route.first === 'templates') return JournalTemplatesPage(root, shared);
  if (route.first === 'new') return JournalEditor(root, shared);
  if (route.first && route.second === 'edit') return JournalEditor(root, { ...shared, id: route.first });
  if (route.first) return JournalReader(root, { ...shared, id: route.first });
  return JournalPage(root, shared);
}
