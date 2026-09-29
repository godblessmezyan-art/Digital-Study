import { authHeaders, getStoredUser } from './auth-client.js';
import { withAppBase } from './runtime-paths.js';

const isLocalStaticPreview = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (isLocalStaticPreview ? `http://${location.hostname}:3000/api` : withAppBase('/api'));

export async function streamNdjson(path, input, { signal, onEvent }) {
  if (!getStoredUser()) {
    window.dispatchEvent(new CustomEvent('study-auth-required'));
    throw new Error('请先登录后使用 AI 阅读助手');
  }
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  if (response.status === 401) window.dispatchEvent(new CustomEvent('study-auth-required'));
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(Array.isArray(payload?.message) ? payload.message.join('；') : payload?.message || `AI 请求失败（${response.status}）`);
  }
  if (!response.body) throw new Error('AI 服务未返回可读取的数据流');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      onEvent(event);
    }
  }
  if (buffer.trim()) {
    let event;
    try { event = JSON.parse(buffer); } catch { return; }
    onEvent(event);
  }
}

export const streamReadingAI = (input, options) => streamNdjson('/reading/ai/stream', input, options);
