import { notes, quotes } from './data.js?v=cloud-realm-study-29';

const tabs = [
  ['notes', '笔记'],
  ['quotes', '书摘'],
  ['timeline', '时间线'],
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function createReadingSpacePage(root, initialTab = 'notes') {
  let activeTab = tabs.some(([id]) => id === initialTab) ? initialTab : 'notes';
  const timeline = [
    ...notes.map(item => ({ type: '笔记', title: item.title, detail: item.meta })),
    ...quotes.map(item => ({ type: '书摘', title: item.text, detail: item.source })),
  ];

  root.innerHTML = `<section class="reading-space-page">
    <header class="reading-space-header"><span>READING ARCHIVE</span><h1>阅读空间</h1><p>在一处整理笔记、书摘与阅读足迹</p>
      <nav class="reading-space-tabs" aria-label="阅读空间内容">${tabs.map(([id, label]) => `<button data-reading-tab="${id}">${label}</button>`).join('')}</nav>
    </header>
    <section class="reading-space-content" id="readingSpaceContent"></section>
  </section>`;

  const paint = () => {
    root.querySelectorAll('[data-reading-tab]').forEach(button => {
      const selected = button.dataset.readingTab === activeTab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    const content = root.querySelector('#readingSpaceContent');
    if (activeTab === 'notes') content.innerHTML = `<div class="reading-space-list">${notes.map(item => `<article><i>✦</i><div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.meta)}</p></div><button aria-label="打开笔记">查看</button></article>`).join('')}</div>`;
    if (activeTab === 'quotes') content.innerHTML = `<div class="reading-space-quotes">${quotes.map(item => `<blockquote><p>${escapeHtml(item.text)}</p><cite>—— ${escapeHtml(item.source)}</cite></blockquote>`).join('')}</div>`;
    if (activeTab === 'timeline') content.innerHTML = `<ol class="reading-space-timeline">${timeline.map(item => `<li><span>${item.type}</span><div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.detail)}</p></div></li>`).join('')}</ol>`;
  };
  root.querySelectorAll('[data-reading-tab]').forEach(button => button.addEventListener('click', () => {
    activeTab = button.dataset.readingTab;
    history.replaceState(null, '', `#reading?tab=${activeTab}`);
    paint();
  }));
  paint();
}
