import { authHeaders, getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';

const isLocalStaticPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (isLocalStaticPreview ? `http://${window.location.hostname}:3000/api` : withAppBase('/api'));

async function request(path = '', options = {}) {
  if (!getStoredUser()) {
    window.dispatchEvent(new CustomEvent('study-auth-required'));
    throw new Error('请先登录后使用计划');
  }
  const response = await fetch(`${apiBase}/plans${path}`, {
    cache: 'no-store',
    ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join('、') : payload?.message;
    throw new Error(message || `计划请求失败（${response.status}）`);
  }
  return payload;
}

export const listPlans = status => request(status ? `?status=${encodeURIComponent(status)}` : '');
export const getPlan = id => request(`/${encodeURIComponent(id)}`);
export const createPlan = input => request('', { method: 'POST', body: JSON.stringify(input) });
export const updatePlan = (id, input) => request(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
export const deletePlan = id => request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listTodayTasks = () => request('/today');
export const createPlanTask = (planId, input) => request(`/${encodeURIComponent(planId)}/tasks`, { method: 'POST', body: JSON.stringify(input) });
export const updatePlanTask = (planId, taskId, input) => request(`/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'PUT', body: JSON.stringify(input) });
export const deletePlanTask = (planId, taskId) => request(`/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
export const reorderPlanTasks = (planId, items) => request(`/${encodeURIComponent(planId)}/tasks/reorder`, { method: 'POST', body: JSON.stringify({ items }) });

export const aiBreakdown = input => request('/ai/breakdown', { method: 'POST', body: JSON.stringify(input) });
export const aiBreakdownTask = input => request('/ai/breakdown-task', { method: 'POST', body: JSON.stringify(input) });
export const aiApplyBreakdown = input => request('/ai/apply', { method: 'POST', body: JSON.stringify(input) });
