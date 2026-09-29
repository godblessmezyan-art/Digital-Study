import { createReadingEntry, listReadingEntries } from './reading-client.js?v=2';
import { AIContextBuilder } from './reading-ai-context.js?v=1';
import { ReadingAIAssistant } from './reading-ai-assistant.js?v=1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const blockSelector = 'p,blockquote,li,h1,h2,h3,h4,h5,h6';

function hash(value) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return (result >>> 0).toString(36);
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function prepareBlocks(doc, bookSlug) {
  const blocks = [...doc.body.querySelectorAll(blockSelector)].filter(node => !node.closest('nav,header,footer,button'));
  let chapter = { id: 'opening', title: '正文' };
  blocks.forEach((block, index) => {
    if (/^H[1-6]$/.test(block.tagName)) {
      const title = normalizeText(block.textContent) || `章节 ${index + 1}`;
      chapter = { id: block.id || `chapter-${hash(title)}`, title };
    }
    const text = normalizeText(block.textContent);
    block.dataset.blockId ||= block.id || `${bookSlug}-${chapter.id}-${index}-${hash(text.slice(0, 120))}`;
    block.dataset.chapterId = chapter.id;
    block.dataset.chapterTitle = chapter.title;
  });
  return blocks;
}

function textOffset(block, node, offset) {
  const range = block.ownerDocument.createRange();
  range.selectNodeContents(block);
  range.setEnd(node, offset);
  return range.toString().length;
}

function selectionPayload(win, progress) {
  const selection = win.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  const end = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
  const startBlock = start?.closest?.('[data-block-id]');
  const endBlock = end?.closest?.('[data-block-id]');
  if (!startBlock || !endBlock) return null;
  const exactText = normalizeText(selection.toString());
  if (!exactText) return null;
  const startOffset = textOffset(startBlock, range.startContainer, range.startOffset);
  const endOffset = startBlock === endBlock ? textOffset(startBlock, range.endContainer, range.endOffset) : normalizeText(endBlock.textContent).indexOf(normalizeText(range.endContainer.textContent).slice(0, 12)) + range.endOffset;
  const blockText = normalizeText(startBlock.textContent);
  return {
    quote: exactText,
    chapterId: startBlock.dataset.chapterId,
    chapterTitle: startBlock.dataset.chapterTitle,
    readingProgress: progress(),
    anchor: {
      blockId: startBlock === endBlock ? startBlock.dataset.blockId : undefined,
      startBlockId: startBlock.dataset.blockId,
      endBlockId: endBlock.dataset.blockId,
      exactText,
      prefix: blockText.slice(Math.max(0, startOffset - 32), startOffset),
      suffix: blockText.slice(startOffset + exactText.length, startOffset + exactText.length + 32),
      startOffset,
      endOffset,
    },
    range: range.cloneRange(),
  };
}

function findTextRange(doc, entry) {
  const anchor = entry.anchor || {};
  const blocks = [anchor.blockId || anchor.startBlockId, anchor.endBlockId].filter(Boolean).map(id => doc.querySelector(`[data-block-id="${CSS.escape(id)}"]`));
  const scope = blocks[0] || doc.body;
  const exact = normalizeText(anchor.exactText || entry.quote);
  if (!exact) return null;
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let text = '';
  while (walker.nextNode()) { nodes.push({ node: walker.currentNode, start: text.length }); text += walker.currentNode.textContent; }
  let index = text.indexOf(exact);
  if (index < 0 && anchor.prefix) index = text.indexOf(`${anchor.prefix}${exact}`) + anchor.prefix.length;
  if (index < 0 && Number.isInteger(anchor.startOffset) && scope !== doc.body) index = anchor.startOffset;
  if (index < 0) return null;
  const locate = position => {
    const item = [...nodes].reverse().find(candidate => candidate.start <= position) || nodes[0];
    return item && { node: item.node, offset: Math.min(item.node.textContent.length, position - item.start) };
  };
  const start = locate(index), end = locate(index + exact.length);
  if (!start || !end) return null;
  const range = doc.createRange();
  range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset);
  return range;
}

function markRange(range, entry) {
  const doc = range.startContainer.ownerDocument;
  const mark = doc.createElement('mark');
  mark.className = `reading-mark ${entry.type}`;
  mark.dataset.readingEntry = entry.id;
  mark.title = entry.type === 'note' ? `笔记：${entry.content}` : '书摘';
  try { range.surroundContents(mark); return mark; } catch {
    const fragment = range.extractContents(); mark.append(fragment); range.insertNode(mark); return mark;
  }
}

export async function attachReadingRecorder({ container, iframe, book, showToast, onProgress }) {
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  const blocks = prepareBlocks(doc, book.slug);
  const style = doc.createElement('style');
  style.textContent = `.reading-mark{padding:.04em 0;background:rgba(190,151,87,.18);color:inherit;border-bottom:1px solid rgba(151,108,48,.42);border-radius:2px}.reading-mark.note{background:rgba(190,151,87,.14);border-bottom-style:dashed}.reading-mark.is-target,.reading-curator-target{animation:reading-pulse 1.5s ease}@keyframes reading-pulse{50%{background:rgba(190,151,87,.38)}}`;
  doc.head.append(style);
  let entries = await listReadingEntries({ bookSlug: book.slug }).catch(error => { showToast(error.message || '本书记录加载失败'); return []; });
  const progress = () => Math.max(0, Math.min(100, Math.round(win.scrollY / Math.max(1, doc.documentElement.scrollHeight - win.innerHeight) * 100)));
  const toolbar = container.querySelector('[data-selection-toolbar]');
  const drawer = container.querySelector('[data-reader-drawer]');
  const list = container.querySelector('[data-reader-records]');
  const count = container.querySelector('[data-reader-record-count]');
  let active = null;
  const contextBuilder = new AIContextBuilder(book, blocks);

  const paintList = (filter = 'all') => {
    const visible = entries.filter(item => filter === 'all' || item.type === filter);
    count.textContent = entries.length;
    list.innerHTML = visible.length ? visible.map(entry => `<button type="button" data-record-id="${esc(entry.id)}"><small>${entry.chapterTitle || entry.pageLabel || '正文'} · ${entry.type === 'note' ? '笔记' : '书摘'}</small><strong>${esc(entry.quote || entry.content)}</strong>${entry.type === 'note' ? `<span>${esc(entry.content)}</span>` : ''}</button>`).join('') : '<p>这本书还没有阅读记录。</p>';
    list.querySelectorAll('[data-record-id]').forEach(button => button.onclick = () => focusEntry(entries.find(item => item.id === button.dataset.recordId)));
  };
  const restore = () => entries.forEach(entry => { const range = findTextRange(doc, entry); if (range) markRange(range, entry); });
  const focusEntry = entry => {
    if (!entry) return;
    let mark = doc.querySelector(`[data-reading-entry="${CSS.escape(entry.id)}"]`);
    if (!mark) { const range = findTextRange(doc, entry); if (range) mark = markRange(range, entry); }
    const fallback = entry.chapterId && doc.querySelector(`[data-chapter-id="${CSS.escape(entry.chapterId)}"]`);
    (mark || fallback)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mark?.classList.add('is-target'); setTimeout(() => mark?.classList.remove('is-target'), 1700);
  };
  const closeToolbar = () => { toolbar.hidden = true; active = null; };
  const openDrawer = (mode = 'records') => {
    drawer.hidden = false;
    drawer.dataset.mode = mode;
    drawer.querySelector('[data-note-compose]').hidden = mode !== 'note';
    drawer.querySelector('[data-record-browser]').hidden = mode === 'note';
    if (mode === 'note') {
      drawer.querySelector('[data-note-quote]').textContent = active?.quote || '无引用 · 记录此刻的想法';
      setTimeout(() => drawer.querySelector('[data-note-content]').focus(), 50);
    }
  };
  const openNoteDraft = (selection, initialContent = '') => {
    active = selection || null;
    openDrawer('note');
    const textarea = drawer.querySelector('[data-note-content]');
    textarea.value = initialContent;
    setTimeout(() => textarea.focus(), 50);
  };
  const assistant = new ReadingAIAssistant({
    container,
    book,
    showToast,
    onSaveNote: (selection, content) => { assistant.close(); openNoteDraft(selection, content); },
  });
  const save = async (type, content = '') => {
    const payload = active || { quote: null, chapterId: blocks.find(block => block.getBoundingClientRect().top >= 0)?.dataset.chapterId, chapterTitle: blocks.find(block => block.getBoundingClientRect().top >= 0)?.dataset.chapterTitle, readingProgress: progress(), anchor: null };
    const saved = await createReadingEntry({ type, title: type === 'note' ? (payload.quote ? '划词笔记' : '阅读随想') : undefined, content: type === 'quote' ? payload.quote : content, quote: payload.quote || undefined, bookSlug: book.slug, chapterId: payload.chapterId, chapterTitle: payload.chapterTitle, pageLabel: payload.chapterTitle, anchor: payload.anchor || undefined, tags: [], readingProgress: payload.readingProgress });
    if (!entries.some(item => item.id === saved.id)) entries.unshift(saved);
    if (payload.range && !doc.querySelector(`[data-reading-entry="${CSS.escape(saved.id)}"]`)) markRange(payload.range, saved);
    paintList(); closeToolbar(); onProgress?.(entries.length);
    showToast(type === 'quote' ? (entries.filter(item => item.id === saved.id).length ? '已收入书摘' : '这段内容已收入书摘') : '笔记已保存');
    return saved;
  };

  const selected = () => {
    active = selectionPayload(win, progress);
    if (!active) return closeToolbar();
    const rect = win.getSelection().getRangeAt(0).getBoundingClientRect();
    const frame = iframe.getBoundingClientRect();
    toolbar.style.left = `${Math.max(12, Math.min(innerWidth - 320, frame.left + rect.left + rect.width / 2 - 150))}px`;
    toolbar.style.top = `${Math.max(66, frame.top + rect.top - 50)}px`;
    toolbar.hidden = false;
  };
  doc.addEventListener('mouseup', () => setTimeout(selected));
  doc.addEventListener('touchend', () => setTimeout(selected, 120));
  win.addEventListener('scroll', closeToolbar, { passive: true });
  container.querySelector('[data-save-quote]').onclick = () => save('quote').catch(error => showToast(error.message || '书摘保存失败'));
  container.querySelector('[data-write-note]').onclick = () => openNoteDraft(active);
  container.querySelector('[data-ask-ai]').onclick = () => {
    if (!active) return;
    drawer.hidden = true;
    assistant.open(contextBuilder.fromSelection(active));
    closeToolbar();
  };
  container.querySelector('[data-quick-note]').onclick = () => { active = null; openDrawer('note'); };
  container.querySelector('[data-toggle-records]').onclick = () => openDrawer('records');
  container.querySelectorAll('[data-drawer-close]').forEach(button => button.onclick = () => { drawer.hidden = true; });
  container.querySelector('[data-note-form]').onsubmit = event => { event.preventDefault(); const value = container.querySelector('[data-note-content]').value.trim(); if (!value) return; save('note', value).then(() => { container.querySelector('[data-note-content]').value = ''; drawer.hidden = true; }).catch(error => showToast(error.message || '笔记保存失败')); };
  container.querySelectorAll('[data-record-filter]').forEach(button => button.onclick = () => { container.querySelectorAll('[data-record-filter]').forEach(item => item.classList.toggle('active', item === button)); paintList(button.dataset.recordFilter); });
  let chapterTimer = null;
  win.addEventListener('scroll', () => { clearTimeout(chapterTimer); chapterTimer = setTimeout(() => assistant.chapterChanged(contextBuilder.visibleChapter()), 180); }, { passive: true });
  doc.addEventListener('keydown', event => { if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return; if (event.key.toLowerCase() === 'e') { event.preventDefault(); selected(); if (active) save('quote'); } if (event.key.toLowerCase() === 'n') { event.preventDefault(); selected(); openDrawer('note'); } });
  restore(); paintList(); onProgress?.(entries.length);
  const requestParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const requested = requestParams.get('entry');
  const requestedChapter = requestParams.get('chapter');
  const requestedText = normalizeText(requestParams.get('text'));
  if (requested) setTimeout(() => focusEntry(entries.find(item => item.id === requested)), 200);
  else if (requestedChapter || requestedText) setTimeout(() => {
    const matchedChapterBlocks = requestedChapter
      ? blocks.filter(block => block.dataset.chapterId === requestedChapter)
      : blocks;
    const chapterBlocks = matchedChapterBlocks.length ? matchedChapterBlocks : blocks;
    const needle = requestedText.slice(0, 64);
    const target = (needle && chapterBlocks.find(block => normalizeText(block.textContent).includes(needle))) || chapterBlocks[0];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('reading-curator-target');
    setTimeout(() => target.classList.remove('reading-curator-target'), 1900);
  }, 240);
}
