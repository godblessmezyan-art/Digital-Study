const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function Stat({ value, valueHtml = '', label }) {
  return `<span class="ui-stat"><b>${valueHtml || esc(value)}</b><small>${esc(label)}</small></span>`;
}

export function PageHero({ eyebrow, title, description, stats = [], action = '', tabs = '', tone = 'chronicle', className = '' }) {
  return `<header class="page-hero page-hero--${tone} ${className}">
    <div class="page-hero__copy"><small>${esc(eyebrow)}</small><h1>${esc(title)}</h1><p>${esc(description)}</p></div>
    ${stats.length ? `<div class="page-hero__stats" aria-label="页面统计">${stats.map(Stat).join('')}</div>` : ''}
    ${action ? `<div class="page-hero__action">${action}</div>` : ''}
    ${tabs ? `<div class="page-hero__tabs">${tabs}</div>` : ''}
  </header>`;
}

export function PageToolbar({ search = '', controls = '', action = '', className = '' }) {
  return `<div class="page-toolbar ${className}">${search ? `<div class="page-toolbar__search">${search}</div>` : ''}${controls ? `<div class="page-toolbar__controls">${controls}</div>` : ''}${action ? `<div class="page-toolbar__action">${action}</div>` : ''}</div>`;
}

export function EmptyState({ title, description, action = '', icon = '✦', className = '' }) {
  return `<section class="empty-state ${className}"><span aria-hidden="true">${esc(icon)}</span><h2>${esc(title)}</h2><p>${esc(description)}</p>${action}</section>`;
}

export function Panel(content, className = '') {
  return `<section class="page-panel ${className}">${content}</section>`;
}

export function SectionBlock(content, className = '') {
  return `<section class="section-block ${className}">${content}</section>`;
}

export function PaperSurface(content, className = '', tag = 'section') {
  return `<${tag} class="paper-surface ${className}">${content}</${tag}>`;
}

export function Badge(label, tone = 'neutral', className = '') {
  return `<span class="ui-badge ui-badge--${tone} ${className}">${esc(label)}</span>`;
}

export function PageContainer(content, { tone = 'chronicle', className = '' } = {}) {
  return `<section class="page-container page-container--${tone} ${className}">${content}</section>`;
}
