// AI 馆长 · 展示组件库（纯 HTML 字符串组件，遵循 journal-components 模式）

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export const SOURCE_TYPES = {
  book: { label: '书籍内容', short: '书籍', tone: 'book' },
  note: { label: '你的笔记', short: '笔记', tone: 'note' },
  excerpt: { label: '你的书摘', short: '书摘', tone: 'excerpt' },
  journal: { label: '你的日记', short: '日记', tone: 'journal' },
  plan: { label: '你的计划', short: '计划', tone: 'plan' },
};

export const SCOPES = [
  ['all', '全部'], ['books', '书籍'], ['notes', '笔记'],
  ['excerpts', '书摘'], ['journals', '日记'], ['plans', '计划'],
];

export const QUICK_ACTIONS = [
  { id: 'recall', icon: '☾', label: '回忆过去', prompt: '我过去记录过哪些关于「{topic}」的想法？请找出相关的日记、笔记和书摘，并告诉我当时的思考。' },
  { id: 'connect', icon: '∞', label: '连接观点', prompt: '帮我找出我的书籍、笔记、日记和计划之间相互关联的观点，指出哪些想法反复出现、哪些彼此呼应或矛盾。' },
  { id: 'summarize', icon: '✦', label: '总结主题', prompt: '总结我最近阅读和记录的核心主题：我最关注什么？我的观点有什么变化趋势？' },
  { id: 'answer', icon: '⌕', label: '从书房找答案', prompt: '基于我书房中的书籍内容和我的个人记录，回答我接下来提出的问题，并标注每个结论的来源。' },
];

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

/* ===== Hero 与索引状态 ===== */

export function IndexStatusChip(status) {
  if (!status) return '<button type="button" class="curator-index-chip" data-index-toggle aria-expanded="false"><i class="dot"></i><span>知识库状态获取中…</span></button>';
  const synced = status.total > 0;
  const when = synced && status.lastIndexedAt ? timeAgo(status.lastIndexedAt) : '';
  return `<button type="button" class="curator-index-chip${synced ? ' is-synced' : ''}" data-index-toggle aria-expanded="false">
    <i class="dot" aria-hidden="true"></i>
    <span>${synced ? `知识库已同步${when ? ` · ${when}` : ''}` : '知识库尚未建立索引'}</span>
    <b aria-hidden="true">⌄</b>
  </button>`;
}

export function IndexStatusPanel(status, { isAdmin = false } = {}) {
  const byType = status?.byType || {};
  const rows = [
    ['书籍章节', byType.book], ['笔记', byType.note], ['书摘', byType.excerpt],
    ['日记', byType.journal], ['计划', byType.plan],
  ].filter(([, count]) => count !== undefined);
  return `<div class="curator-index-panel" data-index-panel hidden>
    <dl>
      <div><dt>索引内容</dt><dd>${status?.total ?? 0} 条</dd></div>
      ${rows.map(([label, count]) => `<div><dt>${label}</dt><dd>${count}</dd></div>`).join('')}
      <div><dt>最后更新</dt><dd>${status?.lastIndexedAt ? timeAgo(status.lastIndexedAt) : '—'}</dd></div>
    </dl>
    ${isAdmin ? '<button type="button" class="curator-rebuild" data-curator-rebuild>重新索引</button>' : ''}
  </div>`;
}

export function CuratorHero(indexChipHtml, indexPanelHtml) {
  return `<header class="curator-hero">
    <div class="curator-hero-copy">
      <small>AI CURATOR · KNOWLEDGE SANCTUM</small>
      <h1>AI 馆长</h1>
      <p>“他记得你读过什么，也知道你的想法曾经如何改变。”</p>
    </div>
    <div class="curator-index">${indexChipHtml}${indexPanelHtml}</div>
  </header>`;
}

/* ===== 搜索与快捷入口 ===== */

export function CuratorSearchBox(scope = 'all') {
  return `<form class="curator-query" data-curator-form>
    <div class="curator-input-wrap">
      <textarea data-curator-input maxlength="2000" rows="2" required placeholder="问我关于你的书房、阅读和过去的思考……" aria-label="询问 AI 馆长"></textarea>
      <div class="curator-query-actions">
        <div class="curator-scopes" role="group" aria-label="检索范围">${SCOPES.map(([id, label]) => `<button type="button" class="${id === scope ? 'active' : ''}" data-curator-scope="${id}">${label}</button>`).join('')}</div>
        <button class="curator-submit" type="submit">智能搜索</button>
        <button class="curator-stop" type="button" data-curator-stop hidden>停止生成</button>
      </div>
    </div>
    <small class="curator-keyboard-hint">Enter 搜索 · Shift + Enter 换行</small>
  </form>`;
}

export function CuratorQuickActions() {
  return `<div class="curator-quick" role="group" aria-label="快捷探索">${QUICK_ACTIONS.map(action => `<button type="button" data-quick-action="${action.id}"><i aria-hidden="true">${action.icon}</i><span>${action.label}</span></button>`).join('')}</div>`;
}

/* ===== 首页三区 ===== */

export function RecentExplorations(history) {
  const items = (history || []).slice(0, 6);
  return `<section class="curator-block" data-block="recent">
    <header><small>RECENT EXPLORATIONS</small><h2>最近探索</h2></header>
    ${items.length ? `<div class="curator-recent-list">${items.map(item => `<button type="button" data-replay-query="${esc(item.query)}" title="${esc(item.query)}"><span>${esc(item.query.length > 26 ? `${item.query.slice(0, 26)}…` : item.query)}</span><small>${timeAgo(item.time)}</small></button>`).join('')}</div>`
      : '<p class="curator-block-empty">还没有探索记录。提出的第一个问题，会留在这里。</p>'}
  </section>`;
}

const COLLECTION_LABELS = [['books', '书籍'], ['notes', '笔记'], ['excerpts', '书摘'], ['journals', '日记'], ['plans', '计划']];

export function CuratorInsightsBlock(insights) {
  if (!insights) return `<section class="curator-block" data-block="insights"><header><small>CURATOR INSIGHTS</small><h2>馆长发现</h2></header><div class="curator-insights-loading"><i></i><i></i><i></i></div></section>`;
  const discoveries = insights.discoveries || [];
  const collections = COLLECTION_LABELS
    .map(([key, label]) => [label, insights.collections?.[key] ?? 0])
    .filter(([, count]) => count > 0);
  return `<section class="curator-block" data-block="insights">
    <header><small>CURATOR INSIGHTS</small><h2>馆长发现</h2></header>
    ${discoveries.length ? `<ul class="curator-discoveries">${discoveries.map(item => `<li>${item.href ? `<a href="${esc(item.href)}">` : '<span>'}<i aria-hidden="true">${esc(item.icon)}</i>${esc(item.text)}${item.href ? '<b>去看看 →</b></a>' : '</span>'}</li>`).join('')}</ul>`
      : '<p class="curator-block-empty">馆长还在观察你的书房。写下笔记、日记或计划后，他会主动发现之间的联系。</p>'}
    ${collections.length ? `<footer class="curator-collections">${collections.map(([label, count]) => `<span><b>${count}</b>${label}</span>`).join('')}</footer>` : ''}
  </section>`;
}

export function RecentSession(session) {
  return `<section class="curator-block" data-block="session">
    <header><small>LAST SESSION</small><h2>最近一次探索</h2></header>
    ${session ? `<article class="curator-session">
      <h3 data-replay-query="${esc(session.query)}" role="link" tabindex="0">${esc(session.query)}</h3>
      <p>${esc(session.excerpt || '（该次探索没有留下回答摘要）')}</p>
      <footer><time>${timeAgo(session.time)}</time>${session.sourcesCount ? `<span>${session.sourcesCount} 条资料</span>` : ''}<button type="button" class="curator-continue" data-resume-session>继续探索 →</button></footer>
    </article>`
      : '<p class="curator-block-empty">完成一次搜索后，这里会保留上次的问题与回答摘要，方便你随时继续。</p>'}
  </section>`;
}

/* ===== 回答视图 ===== */

export function QuestionBlock(query, scope) {
  const scopeLabel = SCOPES.find(([id]) => id === scope)?.[1] || '全部';
  return `<section class="curator-question"><small>你的问题 · 范围：${scopeLabel}</small><h2>${esc(query)}</h2></section>`;
}

export function AnswerBlock() {
  return `<section class="curator-answer" data-curator-answer>
    <header><span>AI 馆长回答</span><small>综合你的书籍、笔记、书摘、日记与计划</small></header>
    <div class="curator-thinking" data-curator-thinking hidden><i></i><i></i><i></i><span>馆长正在翻阅你的书房…</span></div>
    <div data-curator-answer-content></div>
  </section>`;
}

export function SourcesBlock() {
  return `<section class="curator-related" data-curator-related hidden>
    <header><div><small>REFERENCES</small><h2>参考资料 · <span data-curator-count>0</span></h2></div></header>
    <div class="curator-results" data-curator-results></div>
  </section>`;
}

export function SourceCard(source) {
  const meta = SOURCE_TYPES[source.type] || { label: source.type, tone: 'note' };
  return `<a class="curator-result ${meta.tone}" href="${esc(source.href)}">
    <header><span>${meta.label}</span><b>${Math.round((source.score || 0) * 100)}%</b></header>
    <h3>${esc(source.title)}</h3>
    <small>${esc(source.source || '')}${source.createdAt ? ` · ${new Date(source.createdAt).toLocaleDateString('zh-CN')}` : ''}</small>
    <p>${esc(source.excerpt)}</p>
    <em>查看来源 →</em>
  </a>`;
}

export function NoResultsBlock() {
  return '<div class="curator-no-results"><span>✦</span><p>没有找到足够相关的个人资料。<br>试试换一个说法，或扩大检索范围到「全部」。</p></div>';
}

/* 轻量相关概念：从回答与来源中提取真实高频关键词（非写死数据） */
const STOP_WORDS = new Set(['我们', '你们', '他们', '这个', '那个', '自己', '可以', '一个', '没有', '什么', '以及', '但是', '如果', '这些', '那些', '内容', '资料', '来源', '相关', '笔记', '书摘', '日记', '计划', '书籍', '分析', '综合', '观点', '提到', '记录', '认为', '可能', '需要', '通过', '进行', '已经', '其中', '例如', '比如', '你的', '我的', '馆长', 'AI']);

export function extractConcepts(answerText, sources) {
  const corpus = `${answerText} ${sources.map(item => `${item.title} ${item.excerpt}`).join(' ')}`;
  const counter = new Map();
  const tokens = corpus.match(/[一-龥]{2,6}|[A-Za-z][A-Za-z0-9+#.-]{1,20}/g) || [];
  for (const raw of tokens) {
    const token = raw.trim();
    if (token.length < 2 || STOP_WORDS.has(token)) continue;
    counter.set(token, (counter.get(token) || 0) + 1);
  }
  return [...counter.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 6)
    .map(([word]) => word);
}

export function RelatedConcepts(concepts, query) {
  if (!concepts.length) return '';
  return `<section class="curator-concepts">
    <header><small>RELATED CONCEPTS</small><h2>相关概念</h2></header>
    <div class="curator-concept-chain">${concepts.map((word, index) => `${index ? '<i aria-hidden="true">→</i>' : ''}<button type="button" data-concept-query="${esc(word)}${index === 0 && query ? `（与「${esc(query.slice(0, 20))}」相关）` : ''}">${esc(word)}</button>`).join('')}</div>
  </section>`;
}

export function FollowupActions(query) {
  return `<section class="curator-followup">
    <header><small>CONTINUE</small><h2>继续探索</h2></header>
    <div class="curator-followup-actions">
      <button type="button" data-followup="ask">继续追问</button>
      <button type="button" data-followup="compare" ${query ? `data-followup-query="${esc(query)}"` : ''}>对比过去观点</button>
      <button type="button" data-followup="note">生成笔记</button>
      <button type="button" data-followup="journal">加入旅者手记</button>
      <button type="button" data-followup="plan">创建计划</button>
    </div>
  </section>`;
}

/* ===== 状态 ===== */

export function CuratorSkeleton() {
  return `<section class="curator-page"><div class="curator-skeleton">
    <div class="curator-skeleton-hero"></div><i></i><i></i>
    <div class="curator-skeleton-grid"><i></i><i></i><i></i></div>
  </div></section>`;
}

export function SignedOutBlock() {
  return `<section class="curator-page"><div class="curator-signed-out">
    <small>AI CURATOR · KNOWLEDGE SANCTUM</small>
    <h1>登录后唤醒你的馆长</h1>
    <p>他记得你读过什么，也知道你的想法曾经如何改变。<br>登录后，馆长会在你的书籍、笔记、书摘、日记与计划中寻找关联，并给出可以追溯的回答。</p>
    <button type="button" data-curator-login>登录账号</button>
  </div></section>`;
}

export function ErrorBlock(message, retryLabel = '重新尝试') {
  return `<div class="curator-error"><span>档案馆的灯暂时熄灭了</span><p>${esc(message)}</p><button type="button" data-curator-retry>${retryLabel}</button></div>`;
}
