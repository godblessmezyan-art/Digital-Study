const API_BASE = '/api';

function workshopToken() {
  return sessionStorage.getItem('ai-workshop-token') || '';
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  if (workshopToken()) headers.set('x-ai-workshop-token', workshopToken());
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join('；')
      : payload?.message || `请求失败（${response.status}）`;
    throw new Error(message);
  }
  return payload;
}

export function setWorkshopToken(value) {
  if (value) sessionStorage.setItem('ai-workshop-token', value);
  else sessionStorage.removeItem('ai-workshop-token');
}

export const getAiConfig = () => request('/ai/config');
export const getAiTemplates = () => request('/ai/templates');
export const getGenerations = () => request('/ai/generations');
export const getGeneration = (id) => request(`/ai/generations/${id}`);
export const createGeneration = (input) => request('/ai/generations', { method: 'POST', body: JSON.stringify(input) });
export const cancelGeneration = (id) => request(`/ai/generations/${id}/cancel`, { method: 'POST' });
export const regenerateSection = (id, key, instruction) => request(`/ai/generations/${id}/sections/${key}/regenerate`, { method: 'POST', body: JSON.stringify({ instruction }) });
export const saveGenerationDraft = (id) => request(`/ai/generations/${id}/save-draft`, { method: 'POST' });
export const publishGeneration = (id) => request(`/ai/generations/${id}/publish`, { method: 'POST' });
export const publishBook = (input) => request('/books', { method: 'POST', body: JSON.stringify(input) });
