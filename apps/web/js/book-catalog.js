import { withAppBase } from './runtime-paths.js';
import { authHeaders, getStoredUser } from './auth-client.js';

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
    shelf: book.shelf || null,
  };
}

async function fetchJson(url, timeoutMs = 3000, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      ...options,
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const CACHE_KEY = 'digital-study-catalog-cache-v1';
const SHELF_CACHE_PREFIX = 'digital-study-shelf-cache-v2';
const shelfCacheKey = () => `${SHELF_CACHE_PREFIX}:${getStoredUser()?.username || 'signed-out'}`;

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

function readCache(key = CACHE_KEY) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
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

export async function refreshShelfBooks() {
  if (!getStoredUser()) throw new Error('请先登录后查看私人藏书');
  const apiBooks=await fetchJson(`${apiBase}/shelf`,3000,{headers:authHeaders()});
  const books=mergeBooks([],Array.isArray(apiBooks)?apiBooks:[]);
  try { sessionStorage.setItem(shelfCacheKey(),JSON.stringify({savedAt:Date.now(),books})) } catch { /* 缓存不可用时仍返回服务器数据。 */ }
  return books;
}

export async function loadShelfBooks() {
  const cached=readCache(shelfCacheKey());
  const snapshot=mergeBooks([],cached?.books||[]);
  return refreshShelfBooks().catch(error=>{if(snapshot.length)return snapshot;throw error});
}

async function shelfMutation(slug,{method='POST',body}={}){
  if(!getStoredUser()){window.dispatchEvent(new CustomEvent('study-auth-required'));throw new Error('请先登录后操作私人藏书')}
  const response=await fetch(`${apiBase}/shelf/${encodeURIComponent(slug)}`,{method,headers:{...authHeaders(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json().catch(()=>null);
  if(response.status===401)window.dispatchEvent(new CustomEvent('study-auth-required'));
  if(!response.ok)throw new Error(payload?.message||`书架操作失败（${response.status}）`);
  try{sessionStorage.removeItem(shelfCacheKey())}catch{/* 无可用存储时无需处理。 */}
  return payload;
}

export const addShelfBook=slug=>shelfMutation(slug);
export const updateShelfBook=(slug,input)=>shelfMutation(slug,{method:'PATCH',body:input});
export const removeShelfBook=slug=>shelfMutation(slug,{method:'DELETE'});

export function invalidateBookCaches(){
  try { sessionStorage.removeItem(CACHE_KEY);sessionStorage.removeItem(shelfCacheKey()) } catch { /* 无可用存储时无需处理。 */ }
}
