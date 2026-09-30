import { getStoredUser } from './auth-client.js';
import { getCuratorIndexStatus, getCuratorInsights, rebuildCuratorIndex, streamCurator } from './curator-client.js?v=2';
import { PaperSurface } from './page-system.js';
import {
  AnswerBlock, CuratorHero, CuratorQuickActions, CuratorSearchBox, CuratorSkeleton, CuratorInsightsBlock,
  ErrorBlock, esc, extractConcepts, FollowupActions, IndexStatusChip, IndexStatusPanel,
  NoResultsBlock, QuestionBlock, QUICK_ACTIONS, RecentExplorations, RecentSession,
  RelatedConcepts, SignedOutBlock, SourceCard, SourcesBlock,
} from './curator-components.js?v=2';

const HISTORY_KEY = 'curator-history';
const SESSION_KEY = 'curator-last-session';
const MAX_HISTORY = 8;

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 存储满时静默降级 */ }
}

export function createCuratorPage(root, { showToast, openLogin }) {
  if (!getStoredUser()) {
    root.innerHTML = SignedOutBlock();
    root.querySelector('[data-curator-login]').onclick = event => { event.preventDefault(); openLogin?.(); };
    return;
  }
  const isAdmin = getStoredUser()?.role === 'admin';
  const state = {
    scope: 'all',
    controller: null,
    messages: [],
    history: loadJson(HISTORY_KEY, []),
    session: loadJson(SESSION_KEY, null),
    insights: null,
    indexStatus: null,
    currentQuery: '',
    currentAnswer: '',
    currentSources: [],
  };

  /* ---------- 首页 ---------- */

  function paintHome() {
    root.innerHTML = `<section class="curator-page curator-home">
      ${CuratorHero(IndexStatusChip(state.indexStatus), IndexStatusPanel(state.indexStatus, { isAdmin }))}
      ${PaperSurface(`
        ${CuratorSearchBox(state.scope)}
        ${CuratorQuickActions()}
        <div class="curator-columns">
          ${RecentExplorations(state.history)}
          ${CuratorInsightsBlock(state.insights)}
          ${RecentSession(state.session)}
        </div>
      `, 'curator-surface', 'main')}
    </section>`;
    bindIndexStatus();
    bindSearch();
    bindHomeActions();
  }

  async function bootHome() {
    root.innerHTML = CuratorSkeleton();
    paintHome();
    // 数据到达后局部刷新，避免整页 skeleton 阻塞搜索框可用
    try {
      const [insights, indexStatus] = await Promise.all([
        getCuratorInsights().catch(() => null),
        getCuratorIndexStatus().catch(() => null),
      ]);
      state.insights = insights;
      state.indexStatus = indexStatus;
      const insightsBlock = root.querySelector('[data-block="insights"]');
      if (insightsBlock) insightsBlock.outerHTML = CuratorInsightsBlock(insights);
      const chip = root.querySelector('[data-index-toggle]');
      if (chip) chip.outerHTML = IndexStatusChip(indexStatus);
      const panel = root.querySelector('[data-index-panel]');
      if (panel) panel.outerHTML = IndexStatusPanel(indexStatus, { isAdmin });
      bindIndexStatus();
    } catch { /* 首页降级：insights 区块保留 loading 占位 */ }
  }

  function bindIndexStatus() {
    const chip = root.querySelector('[data-index-toggle]');
    const panel = root.querySelector('[data-index-panel]');
    if (!chip || !panel) return;
    chip.onclick = () => {
      const open = panel.hidden;
      panel.hidden = !open;
      chip.setAttribute('aria-expanded', String(open));
    };
    root.querySelector('[data-curator-rebuild]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true; button.textContent = '正在重建索引…';
      try {
        const result = await rebuildCuratorIndex();
        showToast(`索引完成：${result.booksIndexed} 本书，${result.recordsIndexed} 条记录`);
        state.indexStatus = await getCuratorIndexStatus().catch(() => state.indexStatus);
        chip.outerHTML = IndexStatusChip(state.indexStatus);
        panel.outerHTML = IndexStatusPanel(state.indexStatus, { isAdmin });
        bindIndexStatus();
      } catch (error) {
        showToast(error.message || '索引重建失败');
        button.disabled = false; button.textContent = '重新索引';
      }
    });
  }

  function bindHomeActions() {
    root.querySelectorAll('[data-quick-action]').forEach(button => button.onclick = () => {
      const action = QUICK_ACTIONS.find(item => item.id === button.dataset.quickAction);
      if (!action) return;
      const input = root.querySelector('[data-curator-input]');
      input.value = action.prompt;
      input.focus();
      input.setSelectionRange(0, input.value.length);
    });
    root.querySelectorAll('[data-replay-query]').forEach(element => {
      const replay = () => runSearch(element.dataset.replayQuery);
      element.onclick = replay;
      element.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); replay(); } };
    });
    root.querySelector('[data-resume-session]')?.addEventListener('click', () => {
      if (!state.session) return;
      state.messages = [{ role: 'user', content: state.session.query }];
      if (state.session.answer) state.messages.push({ role: 'assistant', content: state.session.answer });
      runSearch(state.session.query, { resume: true });
    });
  }

  /* ---------- 搜索与回答视图 ---------- */

  function bindSearch() {
    const form = root.querySelector('[data-curator-form]');
    const input = root.querySelector('[data-curator-input]');
    if (!form || !input) return;
    form.onsubmit = event => { event.preventDefault(); runSearch(input.value.trim()); };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); runSearch(input.value.trim()); }
    });
    root.querySelectorAll('[data-curator-scope]').forEach(button => button.onclick = () => {
      state.scope = button.dataset.curatorScope;
      root.querySelectorAll('[data-curator-scope]').forEach(item => item.classList.toggle('active', item === button));
    });
  }

  function paintAnswerView(query, { resume = false } = {}) {
    root.innerHTML = `<section class="curator-page curator-answer-view">
      ${PaperSurface(`
        <div class="curator-answer-toolbar">
          <button type="button" class="curator-back" data-curator-back>← 返回馆长首页</button>
          ${resume ? '<small class="curator-resume-flag">继续上次探索</small>' : ''}
        </div>
        ${QuestionBlock(query, state.scope)}
        ${CuratorSearchBox(state.scope)}
        ${AnswerBlock()}
        ${SourcesBlock()}
        <div data-curator-concepts></div>
        <div data-curator-followup></div>
      `, 'curator-surface', 'main')}
    </section>`;
    bindSearch();
    root.querySelector('[data-curator-back]').onclick = () => { abortStream(); bootHome(); };
  }

  function abortStream() {
    state.controller?.abort();
    state.controller = null;
  }

  async function runSearch(query, options = {}) {
    query = String(query || '').trim();
    if (!query) return;
    if (state.controller) return; // 生成中忽略重复提交
    if (!options.resume) state.messages = [];
    state.currentQuery = query;
    state.currentAnswer = '';
    state.currentSources = [];
    paintAnswerView(query, options);

    const thinking = root.querySelector('[data-curator-thinking]');
    const answerContent = root.querySelector('[data-curator-answer-content]');
    const related = root.querySelector('[data-curator-related]');
    const results = root.querySelector('[data-curator-results]');
    const submit = root.querySelector('.curator-submit');
    const stop = root.querySelector('[data-curator-stop]');
    thinking.hidden = false;
    submit.disabled = true; stop.hidden = false;
    stop.onclick = () => abortStream();
    state.controller = new AbortController();
    state.messages.push({ role: 'user', content: query });

    let text = '';
    let sources = [];
    let failed = false;
    try {
      await streamCurator(
        { query, scope: state.scope, messages: state.messages.slice(0, -1).concat([{ role: 'user', content: query }]).slice(-8) },
        {
          signal: state.controller.signal,
          onEvent: event => {
            if (event.type === 'sources') {
              sources = event.sources || [];
              related.hidden = false;
              root.querySelector('[data-curator-count]').textContent = sources.length;
              results.innerHTML = sources.length ? sources.map(source => SourceCard(source)).join('') : NoResultsBlock();
            }
            if (event.type === 'delta') {
              if (thinking.hidden === false) thinking.hidden = true;
              text += event.text || '';
              answerContent.textContent = text;
            }
            if (event.type === 'error') throw new Error(event.message || 'AI 馆长暂时不可用');
          },
        },
      );
      if (!text) {
        thinking.hidden = true;
        answerContent.innerHTML = `<p class="curator-answer-empty">${sources.length ? '馆长检索到了资料，但这次没有生成综述。可以直接查看下方参考资料。' : '目前没有找到足够相关的个人资料。试着换个说法，或把范围扩大到「全部」。'}</p>`;
      }
    } catch (error) {
      failed = true;
      thinking.hidden = true;
      if (error?.name !== 'AbortError') {
        answerContent.innerHTML = ErrorBlock(error.message || 'AI 馆长暂时不可用', '重新搜索');
        answerContent.querySelector('[data-curator-retry]')?.addEventListener('click', () => runSearch(query));
        showToast(error.message || '馆长查询失败');
      } else {
        answerContent.textContent = text || '（已停止生成）';
      }
    } finally {
      state.controller = null;
      const submitNow = root.querySelector('.curator-submit');
      const stopNow = root.querySelector('[data-curator-stop]');
      if (submitNow) submitNow.disabled = false;
      if (stopNow) stopNow.hidden = true;
    }

    state.currentAnswer = text;
    state.currentSources = sources;
    if (text) state.messages.push({ role: 'assistant', content: text.slice(0, 6000) });

    if (!failed && text) {
      recordHistory(query, text, sources.length);
      paintTail(query, text, sources);
    }
  }

  function paintTail(query, text, sources) {
    const conceptsHost = root.querySelector('[data-curator-concepts]');
    const followupHost = root.querySelector('[data-curator-followup]');
    if (conceptsHost) conceptsHost.innerHTML = RelatedConcepts(extractConcepts(text, sources), query);
    if (followupHost) followupHost.innerHTML = FollowupActions(query);
    conceptsHost?.querySelectorAll('[data-concept-query]').forEach(button => button.onclick = () => runSearch(button.dataset.conceptQuery));
    followupHost?.querySelectorAll('[data-followup]').forEach(button => button.onclick = () => handleFollowup(button.dataset.followup, button.dataset.followupQuery || query));
  }

  function handleFollowup(kind, query) {
    if (kind === 'ask') { root.querySelector('[data-curator-input]')?.focus(); return; }
    if (kind === 'compare') { runSearch(`对比我过去和现在关于「${query}」的观点：以前的记录里我怎么想？最近的想法有什么变化？`); return; }
    if (kind === 'note') { location.href = 'index.html#reading?tab=notes'; return; }
    if (kind === 'journal') { location.href = 'journal/new'; return; }
    if (kind === 'plan') { location.href = 'plans/new'; return; }
  }

  function recordHistory(query, answer, sourcesCount) {
    state.history = [{ query, time: new Date().toISOString() }, ...state.history.filter(item => item.query !== query)].slice(0, MAX_HISTORY);
    saveJson(HISTORY_KEY, state.history);
    state.session = {
      query,
      excerpt: answer.replace(/\s+/g, ' ').trim().slice(0, 160),
      answer: answer.slice(0, 3000),
      time: new Date().toISOString(),
      sourcesCount,
    };
    saveJson(SESSION_KEY, state.session);
  }

  void bootHome();
}
