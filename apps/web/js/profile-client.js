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
    headers: { ...authHeaders(), ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `档案请求失败（${response.status}）`);
  }
  return payload;
}

export const getMyProfile = () => request('/profiles/me');
export const updateMyProfile = input => request('/profiles/me', { method: 'PUT', body: JSON.stringify(input) });

export async function uploadAvatar(file) {
  if (!getStoredUser()) throw new Error('请先登录');
  const form = new FormData();
  form.append('avatar', file);
  const response = await fetch(`${apiBase}/profiles/me/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `头像上传失败（${response.status}）`);
  }
  return payload;
}

/** Avatar URLs from the API are app-relative; always wrap with the base path. */
export const resolveAvatarUrl = url => (url ? withAppBase(url) : '');
