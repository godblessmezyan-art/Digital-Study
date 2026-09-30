import { getStoredUser } from './auth-client.js';
import { collectContexts, contextLabel } from './ai-context.js';
import { actionsForContexts } from './ai-actions.js';
import {
  deleteEchoSession, echoChat, getEchoInscription, getEchoModels, getEchoSession,
  listEchoInscriptions, listEchoSessions, saveEchoJournal, saveEchoNote,
} from './echoes-client.js';
import { getCuratorInsights } from './curator-client.js?v=2';
import { PageContainer, PageHero, PaperSurface, EmptyState } from './page-system.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '&quot;': '"', "'": '&#39;',
}[char]));
const RECENT_KEY = 'echo-recent-inscriptions';

function pushRecent(inscription) {
  if (!inscription?.id) return;
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ id: inscription.id, name: inscription.name }, ...recent.filter(item => item.id !== inscription.id)].slice(0, 4)));
  } catch { /* 存储满降级 */ }
}

export function createCuratorPage(root, { showToast, openLogin }) {
  if (!getStoredUser()) {
    root.innerHTML = `<section class="echoes-page">${PageContainer(EmptyState({ title: '登录后进入秘典回响', description: '向埃瑟瑞恩中留下的知识、记录与铭文发起追问。', action: '<button type="button" class="primary" data-echo-login>登录账号</button>' }))}</section>`;
    root.querySelector('[data-echo-login]').onclick = event => { event.preventDefault(); openLogin?.(); };
    return;
  }

  const state = {
    sessions: [],
    sessionId: null,
    messages: [],
    inscriptions: [],
    models: { available: [], current: null },
    inscription: null,          // 启动的铭文（详情+变量值）
    variableValues: {},
    model: '',
    useLibrary: false,
    disabledContexts: new Set(),
    input: '',
    streaming: false,
    insights: null,
  };

  // URL 参数：#curator?inscription=xxx / ?q=消息
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const launchInscriptionId = params.get('inscription');
  const presetQuestion = params.get('q');

  const activeContexts = () => collectContexts().filter(item => !state.disabledContexts.has(`${item.type}:${item.id || item.title || ''}`));

  // ===== render =====

  const sessionListHtml = () => `
    <div class="echoes-sessions">
      <button type="button" class="echoes-new-session" data-new-session>＋ 新的回响</button>
      ${state.sessions.length ? state.sessions.map(session => `
        <button type="button" class="echoes-session-item ${session.id === state.sessionId ? 'is-active' : ''}" data-session="${esc(session.id)}">
          <b>${esc(session.title)}</b>
          <small>${new Date(session.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${session._count?.messages ?? 0} 条</small>
          <span class="echoes-session-delete" data-delete-session="${esc(session.id)}" role="button" aria-label="删除会话">×</span>
        </button>`).join('') : '<p class="echoes-sessions-empty">尚无回响记录</p>'}
    </div>`;

  const inscriptionBannerHtml = () => {
    if (!state.inscription) return '';
    const variables = state.inscription.variables || [];
    return `<div class="echoes-inscription-banner">
      <div class="echoes-inscription-head">
        <span class="echoes-inscription-badge">运行铭文 · v${state.inscription.currentVersion}</span>
        <h3>${esc(state.inscription.name)}</h3>
        ${state.inscription.description ? `<p>${esc(state.inscription.description)}</p>` : ''}
        <button type="button" data-clear-inscription>取消铭文</button>
      </div>
      ${variables.length ? `<div class="echoes-variables">${variables.map(variable => `
        <label><span>${esc(variable.label)}${variable.required ? ' <em>*</em>' : ''}</span>
        <input data-variable="${esc(variable.key)}" value="${esc(state.variableValues[variable.key] ?? variable.defaultValue ?? '')}" placeholder="${esc(variable.placeholder || variable.label)}" ${variable.required ? 'required' : ''}>
        </label>`).join('')}</div>` : ''}
    </div>`;
  };

  const messagesHtml = () => {
    if (!state.messages.length) {
      const actions = actionsForContexts(collectContexts());
      return EmptyState({
        title: '向埃瑟瑞恩发起追问',
        description: '输入问题、选择铭文或站内上下文，回响将在此展开。',
        icon: '✦',
        action: `<div class="echoes-suggestions">${actions.map((action, index) => `<button type="button" data-suggestion="${index}">✦ ${esc(action.label)}</button>`).join('')}</div>`,
      });
    }
    return state.messages.map((message, index) => message.role === 'user' ? `
      <article class="echo-msg echo-msg--user"><div class="echo-msg__body"><p>${esc(message.content)}</p></div></article>` : `
      <article class="echo-msg echo-msg--assistant" data-message-index="${index}">
        <div class="echo-msg__body">
          <pre>${esc(message.content)}${state.streaming && index === state.messages.length - 1 ? '<span class="echo-cursor">▍</span>' : ''}</pre>
          ${message.model ? `<small class="echo-msg__model">${esc(message.model)}${message.inscriptionId ? ' · 铭文驱动' : ''}</small>` : ''}
          ${!state.streaming || index !== state.messages.length - 1 ? `
          <div class="echo-msg__actions">
            <button type="button" data-msg-copy="${index}">复制</button>
            <button type="button" data-msg-note="${index}">保存为笔记</button>
            <button type="button" data-msg-journal="${index}">加入手记</button>
            <button type="button" data-msg-followup="${index}">继续追问</button>
          </div>` : ''}
        </div>
      </article>`).join('');
  };

  const composerHtml = () => {
    const contexts = collectContexts();
    return `<div class="echoes-composer">
      <div class="echoes-context-row">
        <small>上下文</small>
        ${contexts.length ? contexts.map(item => {
          const key = `${item.type}:${item.id || item.title || ''}`;
          const enabled = !state.disabledContexts.has(key);
          return `<button type="button" class="echoes-context-chip ${enabled ? 'is-on' : ''}" data-toggle-context="${esc(key)}">${enabled ? '☑' : '☐'} ${esc(contextLabel(item))}</button>`;
        }).join('') : '<span class="echoes-context-chip muted">无页面上下文</span>'}
        <button type="button" class="echoes-context-chip library ${state.useLibrary ? 'is-on' : ''}" data-toggle-library>${state.useLibrary ? '☑' : '☐'} 全部知识库</button>
      </div>
      <div class="echoes-input-row">
        <textarea data-echo-input rows="3" placeholder="向埃瑟瑞恩发起追问……（Enter 发送，Shift+Enter 换行）">${esc(state.input)}</textarea>
      </div>
      <div class="echoes-control-row">
        <label>使用铭文
          <select data-echo-inscription>
            <option value="">不使用铭文</option>
            ${state.inscriptions.map(item => `<option value="${esc(item.id)}" ${state.inscription?.id === item.id ? 'selected' : ''}>${esc(item.name)}${item.category ? ` · ${esc(item.category)}` : ''}</option>`).join('')}
          </select>
        </label>
        <label>模型
          <select data-echo-model>
            <option value="">当前模型${state.models.current?.displayName ? `（${esc(state.models.current.displayName)}）` : ''}</option>
            ${state.models.available.map(model => `<option value="${esc(model.id)}" ${state.model === model.id ? 'selected' : ''}>${esc(model.displayName)}${model.isActive ? ' · 默认' : ''}</option>`).join('')}
          </select>
        </label>
        <button type="button" class="primary" data-echo-send ${state.streaming ? 'disabled' : ''}>${state.streaming ? '回响中…' : '✦ 发起回响'}</button>
      </div>
    </div>`;
  };

  const paint = (scroll = false) => {
    root.innerHTML = `<section class="echoes-page">${PageContainer(`
      ${PageHero({ eyebrow: 'ECHOES OF THE ARCHIVE', title: '秘典回响', description: '向埃瑟瑞恩中留下的知识、记录与铭文发起追问。' })}
      <div class="echoes-layout">
        ${PaperSurface(sessionListHtml(), 'echoes-sessions-surface')}
        ${PaperSurface(`
          ${inscriptionBannerHtml()}
          <div class="echoes-messages" data-echo-messages>${messagesHtml()}</div>
          ${composerHtml()}
        `, 'echoes-main-surface')}
      </div>
    `)}</section>`;
    bind();
    if (scroll) {
      const box = root.querySelector('[data-echo-messages]');
      if (box) box.scrollTop = box.scrollHeight;
    }
  };

  // ===== actions =====

  const send = async () => {
    const message = state.input.trim();
    if (!message) { showToast('请输入你的问题'); return; }
    if (state.inscription) {
      const missing = (state.inscription.variables || []).filter(variable => variable.required && !(state.variableValues[variable.key] || '').trim());
      if (missing.length) { showToast(`请先填写铭文变量：${missing.map(variable => variable.label).join('、')}`); return; }
    }
    pushRecent(state.inscription);
    state.messages.push({ role: 'user', content: message });
    state.messages.push({ role: 'assistant', content: '', model: null, inscriptionId: state.inscription?.id || null });
    state.input = '';
    state.streaming = true;
    paint(true);
    const contexts = activeContexts();
    try {
      await echoChat({
        message,
        sessionId: state.sessionId || undefined,
        inscriptionId: state.inscription?.id || undefined,
        variables: state.variableValues,
        contextRefs: contexts.map(item => ({ type: item.type, id: item.id, title: item.title, content: item.content, description: item.description })),
        useLibrary: state.useLibrary,
        model: state.model || undefined,
      }, {
        onSession: id => { state.sessionId = id; void loadSessions(); },
        onDelta: text => {
          const last = state.messages[state.messages.length - 1];
          last.content += text;
          const pre = root.querySelector('.echo-msg--assistant:last-of-type pre');
          if (pre) {
            pre.textContent = last.content;
            pre.insertAdjacentHTML('beforeend', '<span class="echo-cursor">▍</span>');
            const box = root.querySelector('[data-echo-messages]');
            if (box) box.scrollTop = box.scrollHeight;
          }
        },
        onError: msg => {
          const last = state.messages[state.messages.length - 1];
          last.content = last.content || `〔回响失败〕${msg}`;
          showToast(msg);
        },
        onDone: () => {
          state.streaming = false;
          const last = state.messages[state.messages.length - 1];
          if (last.role === 'assistant' && !last.content) state.messages.pop();
          paint(true);
          void loadSessions();
        },
      });
    } catch (error) {
      state.streaming = false;
      const last = state.messages[state.messages.length - 1];
      if (last?.role === 'assistant') last.content = last.content || `〔回响失败〕${error.message}`;
      paint(true);
      showToast(error.message);
    }
  };

  const loadSessions = async () => {
    state.sessions = await listEchoSessions().catch(() => []);
  };

  const openSession = async id => {
    const session = await getEchoSession(id);
    state.sessionId = session.id;
    state.messages = session.messages.map(message => ({
      role: message.role, content: message.content, model: message.model, inscriptionId: message.inscriptionId,
    }));
    state.inscription = null;
    paint(true);
  };

  const selectInscription = async id => {
    if (!id) { state.inscription = null; state.variableValues = {}; paint(); return; }
    const inscription = await getEchoInscription(id);
    state.inscription = inscription;
    state.variableValues = {};
    (inscription.variables || []).forEach(variable => { state.variableValues[variable.key] = variable.defaultValue || ''; });
    paint();
  };

  const bind = () => {
    root.querySelector('[data-new-session]').onclick = () => {
      state.sessionId = null; state.messages = []; state.inscription = null; state.variableValues = {}; state.input = '';
      paint();
    };
    root.querySelectorAll('[data-session]').forEach(button => button.onclick = event => {
      if (event.target.closest('[data-delete-session]')) return;
      openSession(button.dataset.session).catch(error => showToast(error.message));
    });
    root.querySelectorAll('[data-delete-session]').forEach(button => button.onclick = async event => {
      event.stopPropagation();
      if (!confirm('删除这次回响会话？')) return;
      try {
        await deleteEchoSession(button.dataset.deleteSession);
        if (state.sessionId === button.dataset.deleteSession) { state.sessionId = null; state.messages = []; }
        await loadSessions(); paint();
      } catch (error) { showToast(error.message); }
    });
    root.querySelectorAll('[data-suggestion]').forEach(button => button.onclick = () => {
      state.input = actionsForContexts(collectContexts())[Number(button.dataset.suggestion)].instruction;
      paint();
    });
    root.querySelectorAll('[data-toggle-context]').forEach(button => button.onclick = () => {
      const key = button.dataset.toggleContext;
      state.disabledContexts.has(key) ? state.disabledContexts.delete(key) : state.disabledContexts.add(key);
      paint();
    });
    root.querySelector('[data-toggle-library]').onclick = () => { state.useLibrary = !state.useLibrary; paint(); };
    root.querySelector('[data-clear-inscription]')?.addEventListener('click', () => { state.inscription = null; state.variableValues = {}; paint(); });
    root.querySelectorAll('[data-variable]').forEach(input => input.addEventListener('input', () => { state.variableValues[input.dataset.variable] = input.value; }));
    root.querySelector('[data-echo-inscription]').onchange = event => selectInscription(event.target.value).catch(error => showToast(error.message));
    root.querySelector('[data-echo-model]').onchange = event => { state.model = event.target.value; };
    const input = root.querySelector('[data-echo-input]');
    input.oninput = () => { state.input = input.value; };
    input.onkeydown = event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); }
    };
    root.querySelector('[data-echo-send]').onclick = () => void send();
    root.querySelectorAll('[data-msg-copy]').forEach(button => button.onclick = async () => {
      try { await navigator.clipboard.writeText(state.messages[Number(button.dataset.msgCopy)].content); showToast('已复制回响'); } catch { showToast('复制失败'); }
    });
    root.querySelectorAll('[data-msg-note]').forEach(button => button.onclick = async () => {
      try {
        await saveEchoNote({ content: state.messages[Number(button.dataset.msgNote)].content, title: `回响摘录 · ${new Date().toLocaleDateString('zh-CN')}` });
        showToast('已保存为笔记（静阅室 · 笔记列表）');
      } catch (error) { showToast(error.message); }
    });
    root.querySelectorAll('[data-msg-journal]').forEach(button => button.onclick = async () => {
      try {
        await saveEchoJournal({ content: state.messages[Number(button.dataset.msgJournal)].content, title: '秘典回响' });
        showToast('已加入旅者手记（今日）');
      } catch (error) { showToast(error.message); }
    });
    root.querySelectorAll('[data-msg-followup]').forEach(button => button.onclick = () => {
      const message = state.messages[Number(button.dataset.msgFollowup)];
      state.input = `关于你刚才的回答「${(message.content || '').slice(0, 40)}……」，`;
      paint();
      root.querySelector('[data-echo-input]')?.focus();
    });
  };

  // ===== boot =====

  const boot = async () => {
    paint();
    const [sessions, inscriptions, models, insights] = await Promise.all([
      listEchoSessions().catch(() => []),
      listEchoInscriptions().catch(() => []),
      getEchoModels().catch(() => ({ available: [], current: null })),
      getCuratorInsights().catch(() => null),
    ]);
    state.sessions = sessions;
    state.inscriptions = inscriptions;
    state.models = models;
    state.insights = insights;
    if (launchInscriptionId) {
      await selectInscription(launchInscriptionId).catch(() => undefined);
      return; // selectInscription 已 paint
    }
    if (presetQuestion) state.input = presetQuestion;
    paint();
    if (presetQuestion) root.querySelector('[data-echo-input]')?.focus();
  };

  void boot();
}
