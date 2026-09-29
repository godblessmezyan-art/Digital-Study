import { getStoredUser } from './auth-client.js';
import { rebuildCuratorIndex, streamCurator } from './curator-client.js?v=1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const examples = ['我最近记录过哪些关于自由的想法？', '找出关于时间管理的笔记', '哪些书讨论过类似观点？', '我以前是不是写过人生目标会随着环境变化？'];
const labels = { book: '书籍内容', note: '你的笔记', excerpt: '你的书摘' };

export function createCuratorPage(root, { showToast, openLogin }) {
  if (!getStoredUser()) {
    root.innerHTML = `<section class="curator-page"><div class="curator-signed-out"><small>AI CURATOR</small><h1>登录后询问你的书房</h1><p>馆长会在你的书籍、笔记和书摘中寻找相关资料，并给出可以追溯的回答。</p><button type="button" data-curator-login>登录账号</button></div></section>`;
    root.querySelector('[data-curator-login]').onclick = () => openLogin?.();
    return;
  }
  const isAdmin = getStoredUser()?.role === 'admin';
  root.innerHTML = `<section class="curator-page">
    <header class="curator-hero"><div><small>AI CURATOR · SEMANTIC KNOWLEDGE SEARCH</small><h1>馆长</h1><p>询问你的书房。</p></div>${isAdmin ? '<button type="button" data-curator-rebuild>重建 AI 索引</button>' : ''}</header>
    <main class="curator-surface"><form class="curator-query" data-curator-form><label><span>你想寻找什么？</span><textarea data-curator-input maxlength="2000" required placeholder="例如：我以前在哪里讨论过自由？"></textarea></label><div class="curator-scopes" role="group" aria-label="检索范围">${[['all','全部'],['books','书籍'],['notes','笔记'],['excerpts','书摘']].map(([id,label], index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-curator-scope="${id}">${label}</button>`).join('')}</div><button class="curator-submit" type="submit">智能搜索</button><button class="curator-stop" type="button" data-curator-stop hidden>停止生成</button></form>
      <div class="curator-examples">${examples.map(item => `<button type="button" data-curator-example="${esc(item)}">${esc(item)}</button>`).join('')}</div>
      <section class="curator-answer" data-curator-answer hidden><header><span>AI 综合回答</span><small>基于你的书房资料</small></header><div data-curator-answer-content></div></section>
      <section class="curator-related" data-curator-related hidden><header><div><small>SEMANTIC RESULTS</small><h2>相关资料 · <span data-curator-count>0</span></h2></div></header><div class="curator-results" data-curator-results></div></section>
    </main>
  </section>`;
  let scope = 'all', controller = null;
  const form = root.querySelector('[data-curator-form]');
  const input = root.querySelector('[data-curator-input]');
  const answer = root.querySelector('[data-curator-answer]');
  const answerContent = root.querySelector('[data-curator-answer-content]');
  const related = root.querySelector('[data-curator-related]');
  const results = root.querySelector('[data-curator-results]');
  const stop = root.querySelector('[data-curator-stop]');
  const submit = root.querySelector('.curator-submit');

  const paintSources = sources => {
    related.hidden = false;
    root.querySelector('[data-curator-count]').textContent = sources.length;
    results.innerHTML = sources.length ? sources.map(source => `<a class="curator-result ${source.type}" href="${esc(source.href)}"><header><span>${labels[source.type] || source.type}</span><b>${Math.round(source.score * 100)}%</b></header><h3>${esc(source.title)}</h3><small>${esc(source.source || '')}${source.createdAt ? ` · ${new Date(source.createdAt).toLocaleDateString('zh-CN')}` : ''}</small><p>${esc(source.excerpt)}</p><em>查看来源 →</em></a>`).join('') : '<div class="curator-no-results">目前没有找到足够相关的个人资料。</div>';
  };
  const run = async () => {
    const query = input.value.trim();
    if (!query || controller) return;
    answer.hidden = false; related.hidden = true; answerContent.textContent = '';
    submit.disabled = true; stop.hidden = false; controller = new AbortController();
    let text = '';
    try {
      await streamCurator({ query, scope, messages: [{ role: 'user', content: query }] }, { signal: controller.signal, onEvent: event => {
        if (event.type === 'sources') paintSources(event.sources || []);
        if (event.type === 'delta') { text += event.text || ''; answerContent.textContent = text; }
        if (event.type === 'error') throw new Error(event.message || 'AI 馆长暂时不可用');
      }});
      if (!text) answerContent.textContent = '目前没有找到足够相关的个人资料。';
    } catch (error) {
      if (error?.name !== 'AbortError') { answerContent.textContent = text || 'AI 馆长暂时不可用，但你仍可以查看已经检索到的相关资料。'; showToast(error.message || '馆长查询失败'); }
    } finally { controller = null; submit.disabled = false; stop.hidden = true; }
  };
  form.onsubmit = event => { event.preventDefault(); run(); };
  stop.onclick = () => controller?.abort();
  root.querySelectorAll('[data-curator-scope]').forEach(button => button.onclick = () => { scope = button.dataset.curatorScope; root.querySelectorAll('[data-curator-scope]').forEach(item => item.classList.toggle('active', item === button)); });
  root.querySelectorAll('[data-curator-example]').forEach(button => button.onclick = () => { input.value = button.dataset.curatorExample; input.focus(); });
  root.querySelector('[data-curator-rebuild]')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true; event.currentTarget.textContent = '正在重建…';
    try { const result = await rebuildCuratorIndex(); showToast(`索引完成：${result.booksIndexed} 本书，${result.recordsIndexed} 条记录`); }
    catch (error) { showToast(error.message || '索引重建失败'); }
    finally { event.currentTarget.disabled = false; event.currentTarget.textContent = '重建 AI 索引'; }
  });
}
