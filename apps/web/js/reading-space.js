import { getStoredUser } from './auth-client.js';
import { loadShelfBooks } from './book-catalog.js?v=3';
import { createReadingEntry, deleteReadingEntry, listReadingEntries, updateReadingEntry } from './reading-client.js?v=1';
import { markFootprintUnavailable, recordFootprint, seedFootprints } from './footprints.js?v=1';
import { EmptyState, PageHero, PageToolbar } from './page-system.js';

const tabs = [['notes', '笔记'], ['quotes', '书摘']];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dateText = value => new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

function entryCard(entry) {
  const isNote = entry.type === 'note';
  const source = entry.book?.title || entry.source || '未关联书籍';
  return `<article class="reading-entry-card ${entry.type}" data-entry-id="${esc(entry.id)}">
    <header><span>${isNote ? 'NOTE' : 'QUOTE'}</span><time>${dateText(entry.updatedAt)}</time></header>
    ${isNote ? `<h2>${esc(entry.title)}</h2>${entry.quote ? `<blockquote class="reading-entry-quote">${esc(entry.quote)}</blockquote>` : ''}<p>${esc(entry.content)}</p>` : `<blockquote>${esc(entry.quote || entry.content)}</blockquote>`}
    <footer><div><strong>${esc(source)}</strong>${entry.chapterTitle || entry.pageLabel ? `<small>${esc(entry.chapterTitle || entry.pageLabel)}</small>` : ''}</div><div>${entry.book ? `<button type="button" data-entry-source="${esc(entry.id)}">回到原文</button>` : ''}<button type="button" data-entry-edit="${esc(entry.id)}">编辑</button><button type="button" class="danger" data-entry-delete="${esc(entry.id)}">删除</button></div></footer>
  </article>`;
}

function signedOut(root) {
  root.innerHTML = `<section class="reading-space-page"><div class="reading-signed-out"><small>PRIVATE READING ARCHIVE</small><h1>登录后使用阅读空间</h1><p>笔记和书摘属于当前账号，登录后可以在不同设备上继续整理。</p><button type="button" data-reading-login>登录账号</button></div></section>`;
  root.querySelector('[data-reading-login]').onclick = () => window.dispatchEvent(new CustomEvent('study-auth-required'));
}

export async function createReadingSpacePage(root, initialTab = 'notes', { showToast = () => {}, focusEntryId = '' } = {}) {
  if (!getStoredUser()) return signedOut(root);
  let activeTab = tabs.some(([id]) => id === initialTab) ? initialTab : 'notes';
  let entries = [];
  let shelf = [];
  let query = '';
  let editingId = null;
  let editingEntry = null;
  let bookFilter = '';

  root.innerHTML = '<div class="reading-space-loading"><span></span><p>正在打开你的阅读空间…</p></div>';
  try {
    [entries, shelf] = await Promise.all([listReadingEntries(), loadShelfBooks({ fresh: true })]);
    seedFootprints(entries.map(entry => ({
      kind: entry.type, targetId: entry.id, activity: 'edited',
      timestamp: entry.updatedAt, title: entry.type === 'note' ? entry.title : entry.content.slice(0, 48),
      detail: entry.book?.title || entry.source,
      href: `index.html#reading?tab=${entry.type === 'note' ? 'notes' : 'quotes'}&entry=${encodeURIComponent(entry.id)}`,
    })));
  } catch (error) {
    showToast(error.message || '阅读空间加载失败');
    if (!getStoredUser()) return signedOut(root);
  }

  const counts = type => entries.filter(item => item.type === type).length;
  root.innerHTML = `<section class="reading-space-page">
    ${PageHero({ eyebrow: 'PRIVATE READING ARCHIVE', title: '阅读空间', description: '把阅读中的想法与触动，整理成只属于你的知识档案。', className: 'reading-space-header', stats: [{ valueHtml: `<span data-note-count>${counts('note')}</span>`, label: '篇笔记' }, { valueHtml: `<span data-quote-count>${counts('quote')}</span>`, label: '条书摘' }], tabs: `<nav class="reading-space-tabs" aria-label="阅读空间内容">${tabs.map(([id, label]) => `<button data-reading-tab="${id}">${label}</button>`).join('')}</nav>` })}
    <section class="reading-space-content">
      ${PageToolbar({ className: 'reading-space-toolbar', search: '<label><span>⌕</span><input data-reading-search placeholder="搜索标题、内容或书名…"></label>', controls: `<select data-reading-book-filter aria-label="按书籍筛选"><option value="">全部书籍</option>${shelf.map(book => `<option value="${esc(book.slug)}">${esc(book.title)}</option>`).join('')}</select>`, action: '<button type="button" class="reading-add" data-entry-new>＋ 新建笔记</button>' })}
      <div class="reading-entry-grid" id="readingEntryGrid"></div>
    </section>
    <div class="reading-editor" data-reading-editor hidden>
      <button type="button" class="reading-editor-backdrop" data-editor-close aria-label="关闭编辑器"></button>
      <form class="reading-editor-panel">
        <header><div><small data-editor-eyebrow>NEW NOTE</small><h2 data-editor-heading>新建笔记</h2></div><button type="button" data-editor-close aria-label="关闭">×</button></header>
        <input type="hidden" data-editor-type value="note">
        <label data-title-field><span>标题</span><input data-entry-title maxlength="255" placeholder="为这条思考写一个标题"></label>
        <label><span data-content-label>笔记内容</span><textarea data-entry-content maxlength="50000" required placeholder="记录你的理解、疑问或灵感…"></textarea></label>
        <div class="reading-editor-row"><label><span>关联书籍</span><select data-entry-book><option value="">不关联书籍</option>${shelf.map(book => `<option value="${esc(book.slug)}">${esc(book.title)}</option>`).join('')}</select></label><label><span>页码 / 章节</span><input data-entry-page maxlength="80" placeholder="例如：第 3 章 / P.128"></label></div>
        <label><span>来源说明</span><input data-entry-source maxlength="255" placeholder="可选：版本、文章或其他来源"></label>
        <footer><button type="button" data-editor-close>取消</button><button type="submit" class="primary">保存</button></footer>
      </form>
    </div>
  </section>`;

  const editor = root.querySelector('[data-reading-editor]');
  const form = root.querySelector('.reading-editor-panel');
  const currentType = () => activeTab === 'notes' ? 'note' : 'quote';
  const updateCounts = () => {
    root.querySelector('[data-note-count]').textContent = counts('note');
    root.querySelector('[data-quote-count]').textContent = counts('quote');
  };
  const closeEditor = () => { editor.hidden = true; document.body.classList.remove('reading-editor-open'); editingId = null; editingEntry = null; };
  const openEditor = entry => {
    const type = entry?.type || currentType();
    editingId = entry?.id || null;
    editingEntry = entry || null;
    form.reset();
    form.querySelector('[data-editor-type]').value = type;
    form.querySelector('[data-entry-title]').value = entry?.title || '';
    form.querySelector('[data-entry-content]').value = entry?.content || '';
    form.querySelector('[data-entry-book]').value = entry?.book?.slug || '';
    form.querySelector('[data-entry-page]').value = entry?.pageLabel || '';
    form.querySelector('[data-entry-source]').value = entry?.source || '';
    form.querySelector('[data-title-field]').hidden = type === 'quote';
    form.querySelector('[data-content-label]').textContent = type === 'quote' ? '书摘内容' : '笔记内容';
    form.querySelector('[data-entry-content]').placeholder = type === 'quote' ? '摘录触动你的原文…' : '记录你的理解、疑问或灵感…';
    form.querySelector('[data-editor-eyebrow]').textContent = `${editingId ? 'EDIT' : 'NEW'} ${type.toUpperCase()}`;
    form.querySelector('[data-editor-heading]').textContent = `${editingId ? '编辑' : '新建'}${type === 'note' ? '笔记' : '书摘'}`;
    editor.hidden = false;
    document.body.classList.add('reading-editor-open');
    setTimeout(() => form.querySelector(type === 'note' ? '[data-entry-title]' : '[data-entry-content]').focus(), 40);
  };

  const filtered = () => entries.filter(entry => entry.type === currentType() && (!bookFilter || entry.book?.slug === bookFilter)).filter(entry => {
    const text = `${entry.title || ''}${entry.content}${entry.source || ''}${entry.book?.title || ''}`.toLowerCase();
    return text.includes(query);
  });
  const paint = () => {
    root.querySelectorAll('[data-reading-tab]').forEach(button => {
      const selected = button.dataset.readingTab === activeTab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    const items = filtered();
    const label = currentType() === 'note' ? '笔记' : '书摘';
    root.querySelector('[data-entry-new]').textContent = `＋ 新建${label}`;
    root.querySelector('#readingEntryGrid').innerHTML = items.length ? items.map(entryCard).join('') : EmptyState({ title: query ? `没有找到匹配的${label}` : `还没有${label}`, description: query ? '换个关键词试试。' : '留下第一条阅读记录，让这间私人档案室从此刻开始。', action: `<button type="button" data-entry-new-empty>新建${label}</button>`, className: 'reading-space-empty' });
    root.querySelectorAll('[data-entry-edit]').forEach(button => button.onclick = () => openEditor(entries.find(item => item.id === button.dataset.entryEdit)));
    root.querySelectorAll('[data-entry-source]').forEach(button => button.onclick = () => {
      const entry = entries.find(item => item.id === button.dataset.entrySource);
      if (entry?.book) location.hash = `#shelf?book=${encodeURIComponent(entry.book.slug)}&entry=${encodeURIComponent(entry.id)}`;
    });
    root.querySelectorAll('[data-entry-delete]').forEach(button => button.onclick = async () => {
      const entry = entries.find(item => item.id === button.dataset.entryDelete);
      if (!entry || !confirm(`确定删除这条${entry.type === 'note' ? '笔记' : '书摘'}吗？删除后无法恢复。`)) return;
      try { await deleteReadingEntry(entry.id); entries = entries.filter(item => item.id !== entry.id); markFootprintUnavailable(entry.type, entry.id); updateCounts(); paint(); showToast('已删除'); } catch (error) { showToast(error.message || '删除失败'); }
    });
    root.querySelector('[data-entry-new-empty]')?.addEventListener('click', () => openEditor());
  };

  root.querySelectorAll('[data-reading-tab]').forEach(button => button.onclick = () => {
    activeTab = button.dataset.readingTab;
    history.replaceState(null, '', `#reading?tab=${activeTab}`);
    paint();
  });
  root.querySelector('[data-reading-search]').oninput = event => { query = event.target.value.trim().toLowerCase(); paint(); };
  root.querySelector('[data-reading-book-filter]').onchange = event => { bookFilter = event.target.value; paint(); };
  root.querySelector('[data-entry-new]').onclick = () => openEditor();
  root.querySelectorAll('[data-editor-close]').forEach(button => button.onclick = closeEditor);
  form.onsubmit = async event => {
    event.preventDefault();
    const type = form.querySelector('[data-editor-type]').value;
    const input = {
      type,
      title: type === 'note' ? form.querySelector('[data-entry-title]').value.trim() : undefined,
      content: form.querySelector('[data-entry-content]').value.trim(),
      bookSlug: form.querySelector('[data-entry-book]').value || undefined,
      pageLabel: form.querySelector('[data-entry-page]').value.trim() || undefined,
      source: form.querySelector('[data-entry-source]').value.trim() || undefined,
      chapterId: editingEntry?.chapterId || undefined,
      chapterTitle: editingEntry?.chapterTitle || undefined,
      quote: editingEntry?.quote || undefined,
      anchor: editingEntry?.anchor || undefined,
      tags: editingEntry?.tags || [],
      readingProgress: editingEntry?.readingProgress ?? undefined,
    };
    if (!input.content || (type === 'note' && !input.title)) return showToast(type === 'note' ? '请填写标题和笔记内容' : '请填写书摘内容');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const wasEditing = Boolean(editingId);
      const saved = wasEditing ? await updateReadingEntry(editingId, input) : await createReadingEntry(input);
      entries = wasEditing ? entries.map(item => item.id === saved.id ? saved : item) : [saved, ...entries];
      recordFootprint({
        kind: saved.type, targetId: saved.id, activity: wasEditing ? 'edited' : 'created',
        timestamp: saved.updatedAt || Date.now(),
        title: saved.type === 'note' ? saved.title : saved.content.slice(0, 48),
        detail: saved.book?.title || saved.source,
        href: `index.html#reading?tab=${saved.type === 'note' ? 'notes' : 'quotes'}&entry=${encodeURIComponent(saved.id)}`,
      });
      closeEditor(); updateCounts(); paint(); showToast(wasEditing ? '修改已保存' : `${type === 'note' ? '笔记' : '书摘'}已保存`);
    } catch (error) { showToast(error.message || '保存失败'); }
    finally { submit.disabled = false; }
  };
  paint();
  if (focusEntryId) {
    const target = entries.find(entry => String(entry.id) === String(focusEntryId));
    if (target) {
      activeTab = target.type === 'note' ? 'notes' : 'quotes';
      paint();
      requestAnimationFrame(() => {
        const card = root.querySelector(`[data-entry-id="${CSS.escape(String(target.id))}"]`);
        card?.classList.add('is-footprint-target');
        card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    } else {
      markFootprintUnavailable(activeTab === 'notes' ? 'note' : 'quote', focusEntryId);
      showToast('对应内容已删除或暂不可访问');
    }
  }
}
