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
    category,
    coverUrl: withAppBase(book.coverUrl || book.cover || ''),
    contentUrl: withAppBase(book.contentUrl || `/content/books/${book.slug}/content.html`),
  };
}

async function fetchJson(url, timeoutMs = 1800) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

export async function loadCatalogBooks() {
  const [apiResult, indexResult] = await Promise.allSettled([
    fetchJson(`${apiBase}/books`),
    fetchJson(`${withAppBase('/content/books/index.json')}?time=${Date.now()}`),
  ]);
  const indexBooks = indexResult.status === 'fulfilled' && Array.isArray(indexResult.value?.books)
    ? indexResult.value.books.map(normalizeBook)
    : [];
  const apiBooks = apiResult.status === 'fulfilled' && Array.isArray(apiResult.value)
    ? apiResult.value.map(normalizeBook)
    : [];
  const merged = new Map(indexBooks.map((book) => [book.slug, book]));
  apiBooks.forEach((book) => merged.set(book.slug, { ...merged.get(book.slug), ...book }));
  return [...merged.values()].sort((left, right) => {
    const dateOrder = String(right.publishedAt ?? '').localeCompare(String(left.publishedAt ?? ''));
    return dateOrder || left.title.localeCompare(right.title, 'zh-CN');
  });
}
