import { authHeaders, getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';

const isLocalStaticPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (isLocalStaticPreview ? `http://${window.location.hostname}:3000/api` : withAppBase('/api'));

async function request(path = '', options = {}) {
  if (!getStoredUser()) {
    window.dispatchEvent(new CustomEvent('study-auth-required'));
    throw new Error('请先登录后使用旅者手记');
  }
  const response = await fetch(`${apiBase}/journal${path}`, {
    cache: 'no-store',
    ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `旅者手记请求失败（${response.status}）`);
  }
  return payload;
}

export function listJournalEntries(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
  return request(query.size ? `?${query}` : '');
}

export const getJournalEntry = id => request(`/${encodeURIComponent(id)}`);
export const createJournalEntry = input => request('', { method: 'POST', body: JSON.stringify(input) });
export const updateJournalEntry = (id, input) => request(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteJournalEntry = id => request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
