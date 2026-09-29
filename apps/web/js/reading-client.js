import { authHeaders, getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';

const isLocalStaticPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (isLocalStaticPreview ? `http://${window.location.hostname}:3000/api` : withAppBase('/api'));

async function request(path = '', options = {}) {
  if (!getStoredUser()) {
    window.dispatchEvent(new CustomEvent('study-auth-required'));
    throw new Error('请先登录后使用阅读空间');
  }
  const response = await fetch(`${apiBase}/reading/entries${path}`, {
    cache: 'no-store',
    ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `阅读记录请求失败（${response.status}）`);
  }
  return payload;
}

export const listReadingEntries = filters => {
  if (typeof filters === 'string') filters = { type: filters };
  const query = new URLSearchParams(Object.entries(filters || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return request(query.size ? `?${query}` : '');
};
export const createReadingEntry = input => request('', { method: 'POST', body: JSON.stringify(input) });
export const updateReadingEntry = (id, input) => request(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteReadingEntry = id => request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
