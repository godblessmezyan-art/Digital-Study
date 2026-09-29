import { authHeaders, getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';

const localPreview = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (localPreview ? `http://${location.hostname}:3000/api` : withAppBase('/api'));

async function request(path = '', options = {}) {
  if (!getStoredUser()) throw new Error('请先登录后发现世界纪事');
  const response = await fetch(`${apiBase}/chronicles${path}`, {
    cache: 'no-store',
    ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `世界纪事请求失败（${response.status}）`);
  }
  return payload;
}

export const listChronicles = () => request();
export const listDiscoveredChronicles = () => request('/discovered');
export const getChronicle = id => request(`/${encodeURIComponent(id)}`);
export const markChronicleRead = id => request(`/${encodeURIComponent(id)}/read`, { method: 'POST' });
export function checkChronicleTriggers(context) {
  const query = new URLSearchParams(Object.entries(context).filter(([, value]) => value !== '' && value != null));
  return request(`/check-triggers?${query}`);
}
