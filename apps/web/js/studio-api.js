const isLocalStaticPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && window.location.port === '5175';
const API_BASE = globalThis.DIGITAL_STUDY_API_BASE
  || (isLocalStaticPreview ? `http://${window.location.hostname}:3000/api` : '/api');

function workshopToken() {
  return sessionStorage.getItem('ai-workshop-token') || '';
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  if (workshopToken()) headers.set('x-ai-workshop-token', workshopToken());
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(`无法连接 API 服务（${API_BASE}），请先启动 MySQL 和 NestJS API`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 501 && contentType.includes('text/html')) {
      throw new Error('API 请求被发送到了静态文件服务器，请使用 pnpm dev:web 启动前端并确认 API 运行在 3000 端口');
    }
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
export const getAiModels = () => request('/ai/models');
export const createAiModel = (input) => request('/ai/models', { method: 'POST', body: JSON.stringify(input) });
export const updateAiModel = (id, input) => request(`/ai/models/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const activateAiModel = (id) => request(`/ai/models/${id}/activate`, { method: 'POST' });
export const testAiModel = (id) => request(`/ai/models/${id}/test`, { method: 'POST' });
export const deleteAiModel = (id) => request(`/ai/models/${id}`, { method: 'DELETE' });
export const getGenerations = () => request('/ai/generations');
export const getGeneration = (id) => request(`/ai/generations/${id}`);
export const createGeneration = (input) => request('/ai/generations', { method: 'POST', body: JSON.stringify(input) });
export const cancelGeneration = (id) => request(`/ai/generations/${id}/cancel`, { method: 'POST' });
export const regenerateSection = (id, key, instruction) => request(`/ai/generations/${id}/sections/${key}/regenerate`, { method: 'POST', body: JSON.stringify({ instruction }) });
export const saveGenerationDraft = (id) => request(`/ai/generations/${id}/save-draft`, { method: 'POST' });
export const publishGeneration = (id) => request(`/ai/generations/${id}/publish`, { method: 'POST' });
export const publishBook = (input) => request('/books', { method: 'POST', body: JSON.stringify(input) });
export const saveBookDraft = (input) => request('/books/drafts', { method: 'POST', body: JSON.stringify(input) });
