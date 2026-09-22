import { withAppBase } from './runtime-paths.js';

const isLocalStaticPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && window.location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE
  || (isLocalStaticPreview ? `http://${window.location.hostname}:3000/api` : withAppBase('/api'));

function normalizeBook(book) {
  const category = book.category
    ? { slug: book.category.slug, name: book.category.name }
    : null;
  return {
    slug: book.slug,
    title: book.title,
    author: book.author || '佚名',
    summary: book.summary || '',
    tags: Array.isArray(book.tags) ? book.tags : [],
    status: book.status || 'draft',
    publishedAt: book.publishedAt || null,
    updatedAt: book.updatedAt || book.publishedAt || null,
    category,
    coverUrl: withAppBase(book.coverUrl || book.cover || ''),
    contentUrl: withAppBase(book.contentUrl || `/content/books/${book.slug}/content.html`),
  };
}

async function fetchJson(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const CACHE_KEY = 'digital-study-catalog-cache-v1';

function mergeBooks(indexSource, apiSource = []) {
  const indexBooks = indexSource.map(normalizeBook);
  const apiBooks = apiSource.map(normalizeBook);
  const merged = new Map(indexBooks.map((book) => [book.slug, book]));
  apiBooks.forEach((book) => merged.set(book.slug, { ...merged.get(book.slug), ...book }));
  return [...merged.values()].sort((left, right) => {
    const dateOrder = String(right.updatedAt ?? right.publishedAt ?? '').localeCompare(String(left.updatedAt ?? left.publishedAt ?? ''));
    return dateOrder || left.title.localeCompare(right.title, 'zh-CN');
  });
}

function readCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return Array.isArray(cached?.books) ? cached : null;
  } catch {
    return null;
  }
}

export async function refreshCatalogBooks() {
  const apiBooks = await fetchJson(`${apiBase}/books`);
  const books = mergeBooks([], Array.isArray(apiBooks) ? apiBooks : []);
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), books })); } catch { /* 浏览器禁用存储时仍返回新数据。 */ }
  return books;
}

export async function loadCatalogBooks({ fresh = false } = {}) {
  const cached = readCache();
  const snapshot = mergeBooks([], cached?.books || []);
  return refreshCatalogBooks().catch(() => snapshot);
}
