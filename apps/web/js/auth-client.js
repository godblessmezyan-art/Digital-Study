import { withAppBase } from './runtime-paths.js';

const TOKEN_KEY = 'study_token';
const USER_KEY = 'study_user';
const AUTH_BASE = withAppBase('/api/auth');

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${AUTH_BASE}${path}`, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join('；')
      : payload?.message || '登录请求失败';
    throw new Error(message);
  }
  return payload;
}

export async function login(username, password) {
  const result = await authRequest('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    username: result.username,
    display_name: result.display_name,
    role: result.role,
  }));
  return getStoredUser();
}

export async function validateAuth() {
  if (!getAuthToken()) return null;
  try {
    const current = await authRequest('/me', { headers: authHeaders() });
    const stored = getStoredUser() || {};
    const user = { ...stored, ...current };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    clearAuth();
    return null;
  }
}
