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
    throw new Error(message || `回响请求失败（${response.status}）`);
  }
  return payload;
}

/**
 * Unified AI execution entry. Streams NDJSON frames:
 * {type:'delta',text} / {type:'done'} / {type:'error',message}
 */
export async function echoChat(payload, handlers = {}) {
  if (!getStoredUser()) {
    window.dispatchEvent(new CustomEvent('study-auth-required'));
    throw new Error('请先登录');
  }
  const response = await fetch(`${apiBase}/curator/echoes/chat`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: handlers.signal,
  });
  if (!response.ok || !response.body) {
    const payloadError = await response.json().catch(() => null);
    const message = Array.isArray(payloadError?.message) ? payloadError.message.join('、') : payloadError?.message;
    throw new Error(message || `回响请求失败（${response.status}）`);
  }
  const sessionId = response.headers.get('X-Echo-Session');
  if (sessionId) handlers.onSession?.(sessionId);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  const finish = () => { if (!finished) { finished = true; handlers.onDone?.(); } };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const frame = JSON.parse(line);
        if (frame.type === 'delta') handlers.onDelta?.(frame.text || '');
        else if (frame.type === 'error') handlers.onError?.(frame.message || 'AI 服务异常');
        else if (frame.type === 'done') finish();
      } catch { /* keep-alive frame */ }
    }
  }
  finish();
}

export const listEchoSessions = () => request('/curator/echoes/sessions');
export const getEchoSession = id => request(`/curator/echoes/sessions/${encodeURIComponent(id)}`);
export const deleteEchoSession = id => request(`/curator/echoes/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const listEchoInscriptions = () => request('/curator/echoes/inscriptions');
export const getEchoInscription = id => request(`/curator/echoes/inscriptions/${encodeURIComponent(id)}`);
export const getEchoModels = () => request('/curator/echoes/models');
export const saveEchoNote = input => request('/curator/echoes/save-note', { method: 'POST', body: JSON.stringify(input) });
export const saveEchoJournal = input => request('/curator/echoes/save-journal', { method: 'POST', body: JSON.stringify(input) });
