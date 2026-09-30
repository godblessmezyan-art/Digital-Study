/**
 * AI Context Layer (frontend registry).
 * Single source of truth for "what is the AI looking at right now".
 * Pages never assemble prompt strings; they only declare typed contexts.
 */

let currentContexts = [];

export function setPageContexts(contexts) {
  currentContexts = Array.isArray(contexts) ? contexts.filter(Boolean) : [];
  window.dispatchEvent(new CustomEvent('ai-context-changed', { detail: currentContexts }));
}

export function getPageContexts() {
  return [...currentContexts];
}

/** Text the user has selected anywhere on the page, promoted to top priority. */
export function getSelectedTextContext() {
  const selection = window.getSelection ? window.getSelection() : null;
  const text = selection ? String(selection).trim() : '';
  if (!text || text.length < 4) return null;
  return { type: 'SELECTED_TEXT', title: '选中文字', content: text.slice(0, 3000) };
}

/** Effective contexts for an AI call: selection first, then page contexts. */
export function collectContexts() {
  const selected = getSelectedTextContext();
  return selected ? [selected, ...currentContexts] : [...currentContexts];
}

export const CONTEXT_TYPE_LABELS = {
  SELECTED_TEXT: '选中文字',
  BOOK: '当前书籍',
  NOTE: '当前笔记',
  JOURNAL: '当前手记',
  PLAN: '当前计划',
  PAGE: '当前页面',
};

export function contextLabel(context) {
  const base = CONTEXT_TYPE_LABELS[context.type] || context.type;
  return context.title && context.title !== base ? `${base} · ${context.title}` : base;
}
