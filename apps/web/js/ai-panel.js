import { getStoredUser } from './auth-client.js';
import { collectContexts, contextLabel } from './ai-context.js';
import { actionsForContexts } from './ai-actions.js';
import { echoChat, listEchoInscriptions } from './echoes-client.js';

const RECENT_KEY = 'echo-recent-inscriptions';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '&quot;': '"', "'": '&#39;',
}[char]));

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
function pushRecent(inscription) {
  if (!inscription) return;
  const next = [inscription, ...loadRecent().filter(item => item.id !== inscription.id)].slice(0, 4);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* 存储满降级 */ }
}

/**
 * Global AI Command Panel — the quick entry to the Echo workspace.
 * Opens with Ctrl+E or the HUD ✦ button on every SPA page.
 */
export function initAiPanel({ showToast, openLogin }) {
  const overlay = document.createElement('div');
  overlay.className = 'ai-panel-overlay';
  overlay.hidden = true;
  document.body.append(overlay);

  let abortController = null;
  let inscriptions = [];

  const close = () => {
    abortController?.abort();
    overlay.hidden = true;
    overlay.innerHTML = '';
  };

  const render = (state) => {
    const contexts = state.contexts;
    const actions = actionsForContexts(contexts);
    const recent = loadRecent();
    overlay.innerHTML = `<div class="ai-panel-card" role="dialog" aria-modal="true" aria-label="唤起回响">
      <header>
        <div><small>ECHO COMMAND · CTRL+E</small><h2>你想让埃瑟瑞恩做什么？</h2></div>
        <button type="button" data-panel-close aria-label="关闭">×</button>
      </header>
      <div class="ai-panel-contexts">
        ${contexts.length ? contexts.map(item => `<span class="ai-panel-chip">✦ ${esc(contextLabel(item))}</span>`).join('') : '<span class="ai-panel-chip muted">无页面上下文</span>'}
        <span class="ai-panel-chip library" data-panel-library>＋ 全部知识库</span>
      </div>
      <textarea data-panel-input rows="3" placeholder="输入问题，或选择下方推荐动作……">${esc(state.input)}</textarea>
      <div class="ai-panel-actions">
        ${actions.map((action, index) => `<button type="button" data-panel-action="${index}">✦ ${esc(action.label)}</button>`).join('')}
      </div>
      ${recent.length ? `<div class="ai-panel-recent"><small>最近铭文</small>${recent.map(item => `<button type="button" data-panel-inscription="${esc(item.id)}">${esc(item.name)}</button>`).join('')}</div>` : ''}
      ${state.answer ? `<div class="ai-panel-answer ${state.streaming ? 'streaming' : ''}"><pre>${esc(state.answer)}</pre></div>` : ''}
      ${state.error ? `<p class="ai-panel-error">${esc(state.error)}</p>` : ''}
      <footer>
        <span>${state.streaming ? '回响中……' : '回答由统一执行层生成，Prompt 来自铭文库'}</span>
        <div>
          ${state.answer && !state.streaming ? '<button type="button" data-panel-copy>复制</button>' : ''}
          <button type="button" data-panel-expand>进入秘典回响 →</button>
          <button type="button" class="primary" data-panel-send ${state.streaming ? 'disabled' : ''}>${state.streaming ? '回响中…' : '快速回响'}</button>
        </div>
      </footer>
    </div>`;
    bind(state);
  };

  const bind = (state) => {
    overlay.querySelector('[data-panel-close]').onclick = close;
    overlay.querySelector('[data-panel-library]').onclick = () => {
      state.useLibrary = !state.useLibrary;
      overlay.querySelector('[data-panel-library]').classList.toggle('active', state.useLibrary);
    };
    const input = overlay.querySelector('[data-panel-input]');
    input.oninput = () => { state.input = input.value; };
    overlay.querySelectorAll('[data-panel-action]').forEach(button => button.onclick = () => {
      const action = actionsForContexts(state.contexts)[Number(button.dataset.panelAction)];
      state.input = action.instruction;
      render(state);
      overlay.querySelector('[data-panel-input]').focus();
    });
    overlay.querySelectorAll('[data-panel-inscription]').forEach(button => button.onclick = () => {
      location.hash = `#curator?inscription=${encodeURIComponent(button.dataset.panelInscription)}`;
      close();
    });
    overlay.querySelector('[data-panel-expand]').onclick = () => {
      const query = state.input.trim() ? `?q=${encodeURIComponent(state.input.trim())}` : '';
      location.hash = `#curator${query}`;
      close();
    };
    overlay.querySelector('[data-panel-copy]')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(state.answer); showToast('回响已复制'); } catch { showToast('复制失败'); }
    });
    overlay.querySelector('[data-panel-send]').onclick = () => send(state);
  };

  const send = async (state) => {
    if (!getStoredUser()) { close(); openLogin?.(); return; }
    const message = state.input.trim();
    if (!message) { showToast('请先输入问题'); return; }
    state.answer = ''; state.error = ''; state.streaming = true;
    render(state);
    abortController = new AbortController();
    try {
      await echoChat({
        message,
        contextRefs: state.contexts,
        useLibrary: state.useLibrary,
        inscriptionId: state.inscriptionId || undefined,
      }, {
        signal: abortController.signal,
        onDelta: text => {
          state.answer += text;
          const answerEl = overlay.querySelector('.ai-panel-answer pre');
          if (answerEl) { answerEl.textContent = state.answer; answerEl.parentElement.scrollTop = answerEl.parentElement.scrollHeight; }
        },
        onError: msg => { state.error = msg; },
        onDone: () => { state.streaming = false; render(state); },
      });
    } catch (error) {
      if (error.name !== 'AbortError') state.error = error.message;
      state.streaming = false;
      render(state);
    }
  };

  const open = async ({ inscription } = {}) => {
    if (!getStoredUser()) { openLogin?.(); return; }
    const state = { input: '', contexts: collectContexts(), answer: '', error: '', streaming: false, useLibrary: false, inscriptionId: inscription?.id || null };
    if (inscription) {
      pushRecent({ id: inscription.id, name: inscription.name });
      location.hash = `#curator?inscription=${encodeURIComponent(inscription.id)}`;
      return;
    }
    render(state);
    overlay.hidden = false;
    overlay.querySelector('[data-panel-library]')?.classList.toggle('active', state.useLibrary);
    overlay.querySelector('[data-panel-input]')?.focus();
    if (!inscriptions.length) inscriptions = await listEchoInscriptions().catch(() => []);
  };

  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      overlay.hidden ? open() : close();
    }
    if (event.key === 'Escape' && !overlay.hidden) close();
  });

  return { open, close };
}
