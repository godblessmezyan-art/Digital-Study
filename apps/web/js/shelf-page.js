import { loadShelfBooks, removeShelfBook, updateShelfBook } from './book-catalog.js?v=3';
import { getStoredUser } from './auth-client.js';
import { markFootprintUnavailable, recordFootprint, seedFootprints } from './footprints.js?v=1';
import { attachReadingRecorder } from './reading-reader.js?v=1';
import { PageHero } from './page-system.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dateText = value => value ? new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '尚未阅读';
const readingLabels = { want_to_read: '想读', reading: '阅读中', completed: '已读完' };

function coverStyle(book) {
  return book.coverUrl ? ` style="--shelf-cover:url('${esc(book.coverUrl)}')"` : '';
}

function personalStatus(book) {
  return book.shelf?.status || 'want_to_read';
}

function bookCard(book) {
  const status = personalStatus(book);
  const progress = Number(book.shelf?.progress || 0);
  const published = book.status === 'published';
  return `<article class="shelf-book-card" data-shelf-book="${esc(book.slug)}">
    <div class="shelf-book-cover"${coverStyle(book)}><span>${esc(book.category?.name || '未分类')}</span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></div>
    <div class="shelf-book-copy">
      <div class="shelf-book-line"><span class="shelf-state ${status}">${readingLabels[status]}</span><time>${dateText(book.shelf?.lastReadAt || book.shelf?.addedAt)}</time></div>
      <h3>${esc(book.title)}</h3><p class="shelf-author">${esc(book.author)}</p>
      <div class="shelf-progress" aria-label="阅读进度 ${progress}%"><i style="width:${progress}%"></i></div><p class="shelf-progress-copy">${published ? `阅读进度 ${progress}%` : '草稿 · 完善后即可阅读'}</p>
      <footer><button type="button" data-shelf-action="${published ? 'read' : 'edit'}" data-slug="${esc(book.slug)}">${published ? (progress ? '继续阅读' : '开始阅读') : '继续编辑'}</button><button type="button" class="danger" data-shelf-remove="${esc(book.slug)}">移出书架</button></footer>
    </div>
  </article>`;
}

function signedOutView(root, navigateToCategories) {
  root.innerHTML = `<section class="shelf-page-v2"><div class="shelf-signed-out"><small>PERSONAL COLLECTION</small><h1>登录后查看私人藏书</h1><p>“私人藏书”只保存当前用户自己的书籍、阅读进度和最近阅读记录，与全站的“典籍目录”资源库相互独立。</p><div><button type="button" class="primary" data-shelf-login>登录账号</button><button type="button" data-shelf-categories>浏览典籍目录</button></div></div></section>`;
  root.querySelector('[data-shelf-login]').onclick = () => window.dispatchEvent(new CustomEvent('study-auth-required'));
  root.querySelector('[data-shelf-categories]').onclick = () => navigateToCategories?.();
}

export async function createShelfPage(root, { showToast, navigateToStudio, navigateToCategories, initialBookSlug = '' }) {
  if (!getStoredUser()) {
    signedOutView(root, navigateToCategories);
    return;
  }

  root.innerHTML = '<div class="shelf-loading"><span></span><p>正在整理你的私人书架…</p></div>';
  let books = [];
  try {
    books = await loadShelfBooks({ fresh: true });
    seedFootprints(books.filter(book => book.shelf?.lastReadAt || book.shelf?.addedAt).map(book => ({
      kind: 'book', targetId: book.slug,
      activity: book.shelf?.lastReadAt ? 'progress' : 'collected',
      timestamp: book.shelf?.lastReadAt || book.shelf?.addedAt,
      title: book.title, detail: book.author || book.category?.name,
      href: `index.html#shelf?book=${encodeURIComponent(book.slug)}`,
      coverUrl: book.coverUrl, progress: book.shelf?.progress || 0,
    })));
  } catch (error) {
    showToast(error.message || '暂时无法读取书架');
    if (!getStoredUser()) signedOutView(root, navigateToCategories);
  }

  const state = { query: '', status: 'all', category: 'all', sort: 'lastRead', view: 'grid' };
  const categories = [...new Set(books.map(book => book.category?.name || '未分类'))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const counts = key => books.filter(book => personalStatus(book) === key).length;
  const continueBook = books.find(book => book.status === 'published' && book.shelf?.lastReadAt)
    || books.find(book => book.status === 'published' && personalStatus(book) === 'reading')
    || books.find(book => book.status === 'published')
    || books[0];

  root.innerHTML = `<section class="shelf-page-v2">
    ${PageHero({eyebrow:'PERSONAL COLLECTION',title:'私人藏书',description:'这里收藏当前账号加入、生成或导入的书。继续阅读，或前往公共书库发现新的旅程。',className:'shelf-hero-v2',stats:[{value:books.length,label:'我的书'},{value:counts('reading'),label:'阅读中'},{value:counts('completed'),label:'已读完'},{value:counts('want_to_read'),label:'想读'}]})}    ${continueBook ? `<section class="shelf-feature"><div class="shelf-feature-cover"${coverStyle(continueBook)}><span>${continueBook.shelf?.lastReadAt ? '最近阅读' : '新加入'}</span><strong>${esc(continueBook.title)}</strong><small>${esc(continueBook.author)}</small></div><div class="shelf-feature-copy"><small>CONTINUE READING · ${esc(continueBook.category?.name || '未分类')}</small><h2>${esc(continueBook.title)}</h2><p class="author">${esc(continueBook.author)} · ${continueBook.shelf?.progress || 0}%</p><p>${esc(continueBook.summary || '这本书已在你的书架中，随时可以继续阅读。')}</p><div><button type="button" class="primary" data-shelf-action="${continueBook.status === 'published' ? 'read' : 'edit'}" data-slug="${esc(continueBook.slug)}">${continueBook.status === 'published' ? (continueBook.shelf?.progress ? '继续阅读' : '开始阅读') : '继续完善'}</button><button type="button" data-go-categories>发现更多书籍</button></div></div><blockquote>你的阅读进度会自动保存，<br>下次从这里继续。</blockquote></section>` : ''}
    <section class="shelf-library-v2"><header><div><small>YOUR COLLECTION</small><h2>我的全部书籍 <span id="shelfResultCount">${books.length}</span></h2></div><div class="shelf-view-switch"><button type="button" class="active" data-shelf-view="grid" aria-label="网格视图">▦</button><button type="button" data-shelf-view="list" aria-label="列表视图">☷</button></div></header>
      <div class="shelf-toolbar"><label class="shelf-search"><span>⌕</span><input data-shelf-search placeholder="搜索我的书籍…"></label><div class="shelf-status-filter"><button type="button" class="active" data-shelf-status="all">全部 <b>${books.length}</b></button><button type="button" data-shelf-status="reading">阅读中 <b>${counts('reading')}</b></button><button type="button" data-shelf-status="completed">已读完 <b>${counts('completed')}</b></button><button type="button" data-shelf-status="want_to_read">想读 <b>${counts('want_to_read')}</b></button></div><select data-shelf-category aria-label="按分类筛选"><option value="all">全部分类</option>${categories.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select><select data-shelf-sort aria-label="书架排序"><option value="lastRead">最近阅读</option><option value="added">最近加入</option><option value="title">按书名</option></select></div>
      <div class="shelf-grid" id="shelfGrid"></div>
    </section>
  </section>`;

  const filtered = () => books.filter(book => {
    const matchesStatus = state.status === 'all' || personalStatus(book) === state.status;
    const matchesCategory = state.category === 'all' || (book.category?.name || '未分类') === state.category;
    const haystack = `${book.title}${book.author}${book.summary}${book.category?.name || ''}`.toLowerCase();
    return matchesStatus && matchesCategory && haystack.includes(state.query);
  }).sort((a, b) => {
    if (state.sort === 'title') return a.title.localeCompare(b.title, 'zh-CN');
    const field = state.sort === 'added' ? 'addedAt' : 'lastReadAt';
    return String(b.shelf?.[field] || b.shelf?.addedAt || '').localeCompare(String(a.shelf?.[field] || a.shelf?.addedAt || ''));
  });

  let reader = null;
  const saveProgress = async (book, progress) => {
    const next = Math.max(0, Math.min(100, Math.round(progress)));
    try {
      const updated = await updateShelfBook(book.slug, { progress: next, status: next >= 99 ? 'completed' : 'reading' });
      book.shelf = { ...book.shelf, status: updated.status, progress: updated.progress, lastReadAt: updated.lastReadAt };
      recordFootprint({
        kind: 'book', targetId: book.slug, activity: 'progress',
        timestamp: updated.lastReadAt || Date.now(), title: book.title,
        detail: book.author || book.category?.name,
        href: `index.html#shelf?book=${encodeURIComponent(book.slug)}`,
        coverUrl: book.coverUrl, progress: updated.progress,
      });
      return updated;
    } catch (error) {
      showToast(error.message || '阅读进度保存失败');
    }
  };

  const closeReader = async () => {
    if (!reader) return;
    clearTimeout(reader.timer);
    if (reader.pending !== null) await saveProgress(reader.book, reader.pending);
    reader.element.remove();
    reader = null;
    paint();
  };

  const openReader = async book => {
    if (!book.contentUrl) return showToast('这本书暂时没有可用阅读地址');
    const element = document.createElement('section');
    element.className = 'shelf-reader';
    element.innerHTML = `<header><button type="button" data-reader-close>← 返回书架</button><div><strong>${esc(book.title)}</strong><button type="button" data-quick-note>＋ 记录</button><button type="button" class="reader-record-trigger" data-toggle-records>✎ <b data-reader-record-count>0</b></button><span data-reader-progress>${book.shelf?.progress || 0}%</span></div></header><iframe title="${esc(book.title)}" src="${esc(book.contentUrl)}"></iframe>
      <div class="reader-selection-toolbar" data-selection-toolbar hidden><button type="button" data-save-quote>书摘</button><button type="button" data-write-note>写笔记</button><button type="button" class="ask-ai" data-ask-ai>问 AI</button></div>
      <aside class="reader-record-drawer" data-reader-drawer hidden><header><div><small>READING RECORDS</small><h2>本书记录</h2></div><button type="button" data-drawer-close>×</button></header><section data-record-browser><nav><button class="active" data-record-filter="all">全部</button><button data-record-filter="note">笔记</button><button data-record-filter="quote">书摘</button></nav><div class="reader-record-list" data-reader-records></div></section><form data-note-compose data-note-form hidden><label>引用</label><blockquote data-note-quote></blockquote><label for="readerNoteContent">你的想法</label><textarea id="readerNoteContent" data-note-content maxlength="50000" required placeholder="写下此刻的想法…"></textarea><footer><button type="button" data-drawer-close>取消</button><button type="submit">保存</button></footer></form></aside>`;
    document.body.appendChild(element);
    const iframe = element.querySelector('iframe');
    reader = { element, book, timer: null, pending: null };
    element.querySelector('[data-reader-close]').onclick = closeReader;
    await saveProgress(book, book.shelf?.progress || 0);
    iframe.addEventListener('load', () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        const initial = Number(book.shelf?.progress || 0);
        requestAnimationFrame(() => {
          const height = Math.max(0, doc.documentElement.scrollHeight - win.innerHeight);
          if (height && initial) win.scrollTo({ top: height * initial / 100, behavior: 'instant' });
        });
        win.addEventListener('scroll', () => {
          const height = Math.max(1, doc.documentElement.scrollHeight - win.innerHeight);
          const progress = Math.max(0, Math.min(100, Math.round(win.scrollY / height * 100)));
          element.querySelector('[data-reader-progress]').textContent = `${progress}%`;
          reader.pending = progress;
          clearTimeout(reader.timer);
          reader.timer = setTimeout(async () => { const pending = reader?.pending; if (pending === null || pending === undefined) return; reader.pending = null; await saveProgress(book, pending); }, 4000);
        }, { passive: true });
        attachReadingRecorder({ container: element, iframe, book, showToast }).catch(() => showToast('阅读记录组件加载失败'));
      } catch {
        showToast('已打开阅读器；此内容暂时无法自动记录进度');
      }
    });
  };

  const openBook = slug => {
    const book = books.find(item => item.slug === slug);
    if (!book) return;
    if (book.status !== 'published') return navigateToStudio?.(book);
    openReader(book);
  };

  const removeBook = async slug => {
    const book = books.find(item => item.slug === slug);
    if (!book || !confirm(`将《${book.title}》移出你的书架？这不会删除典籍目录中的网站资源。`)) return;
    try {
      await removeShelfBook(slug);
      books = books.filter(item => item.slug !== slug);
      markFootprintUnavailable('book', slug);
      showToast('已移出私人藏书');
      paint();
    } catch (error) {
      showToast(error.message || '移出书架失败');
    }
  };

  const bindCards = () => {
    root.querySelectorAll('[data-shelf-action]').forEach(button => button.onclick = () => openBook(button.dataset.slug));
    root.querySelectorAll('[data-shelf-remove]').forEach(button => button.onclick = () => removeBook(button.dataset.shelfRemove));
  };
  const paint = () => {
    const items = filtered();
    const grid = root.querySelector('#shelfGrid');
    grid.classList.toggle('list', state.view === 'list');
    grid.innerHTML = items.length ? items.map(bookCard).join('') : `<div class="shelf-empty"><span>◇</span><h3>${books.length ? '没有找到匹配的书籍' : '你的书架还是空的'}</h3><p>${books.length ? '换个关键词或筛选条件试试。' : '从典籍目录中挑选资源，或生成、导入一本属于你的新书。'}</p><div><button type="button" data-empty-categories>浏览典籍目录</button><button type="button" class="primary" data-go-studio>生成或导入新书</button></div></div>`;
    root.querySelector('#shelfResultCount').textContent = items.length;
    bindCards();
    root.querySelector('[data-empty-categories]')?.addEventListener('click', () => navigateToCategories?.());
    root.querySelector('[data-go-studio]')?.addEventListener('click', () => navigateToStudio?.());
  };

  root.querySelector('[data-shelf-search]').addEventListener('input', event => { state.query = event.target.value.trim().toLowerCase(); paint(); });
  root.querySelector('[data-shelf-category]').addEventListener('change', event => { state.category = event.target.value; paint(); });
  root.querySelector('[data-shelf-sort]').addEventListener('change', event => { state.sort = event.target.value; paint(); });
  root.querySelectorAll('[data-shelf-status]').forEach(button => button.onclick = () => { state.status = button.dataset.shelfStatus; root.querySelectorAll('[data-shelf-status]').forEach(item => item.classList.toggle('active', item === button)); paint(); });
  root.querySelectorAll('[data-shelf-view]').forEach(button => button.onclick = () => { state.view = button.dataset.shelfView; root.querySelectorAll('[data-shelf-view]').forEach(item => item.classList.toggle('active', item === button)); paint(); });
  root.querySelectorAll('[data-shelf-action]').forEach(button => button.onclick = () => openBook(button.dataset.slug));
  root.querySelector('[data-go-categories]')?.addEventListener('click', () => navigateToCategories?.());
  paint();
  if (initialBookSlug) {
    const target = books.find(book => book.slug === initialBookSlug);
    if (target) openBook(target.slug);
    else {
      markFootprintUnavailable('book', initialBookSlug);
      showToast('对应书籍已不在书架中或暂不可访问');
    }
  }
}
