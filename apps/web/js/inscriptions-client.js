import { authHeaders, getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (isLocal ? `http://${location.hostname}:3000/api` : withAppBase('/api'));

async function request(path, options = {}) {
  if (!getStoredUser()) {
    window.dispatchEvent(new CustomEvent('study-auth-required'));
    throw new Error('请先登录');
  }
  const response = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `铭文库请求失败（${response.status}）`);
  }
  return payload;
}

/** Lightweight list for business pages (only enabled resources of a context). */
export const getAvailableInscriptions = context => request(`/inscriptions/available?context=${encodeURIComponent(context)}`);
export const getInscriptionContexts = () => request('/inscriptions/contexts');

export const listInscriptions = (filters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
  return request(query.size ? `/inscriptions?${query}` : '/inscriptions');
};
export const getInscription = id => request(`/inscriptions/${encodeURIComponent(id)}`);
export const createInscription = input => request('/inscriptions', { method: 'POST', body: JSON.stringify(input) });
export const updateInscription = (id, input) => request(`/inscriptions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
export const duplicateInscription = id => request(`/inscriptions/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
export const setInscriptionEnabled = (id, enabled) => request(`/inscriptions/${encodeURIComponent(id)}/enabled`, { method: 'POST', body: JSON.stringify({ enabled }) });
export const deleteInscription = id => request(`/inscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getInscriptionVersions = id => request(`/inscriptions/${encodeURIComponent(id)}/versions`);

export const listInscriptionCategories = () => request('/inscriptions/categories');
export const createInscriptionCategory = input => request('/inscriptions/categories', { method: 'POST', body: JSON.stringify(input) });
export const updateInscriptionCategory = (id, input) => request(`/inscriptions/categories/${id}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteInscriptionCategory = id => request(`/inscriptions/categories/${id}`, { method: 'DELETE' });
export const reorderInscriptionCategories = items => request('/inscriptions/categories/reorder', { method: 'POST', body: JSON.stringify({ items }) });
