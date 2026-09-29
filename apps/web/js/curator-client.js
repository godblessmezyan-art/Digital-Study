import { authHeaders, getStoredUser } from './auth-client.js';
import { streamNdjson } from './reading-ai-client.js?v=2';
import { withAppBase } from './runtime-paths.js';

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '5175';
const apiBase = globalThis.DIGITAL_STUDY_API_BASE || (isLocal ? `http://${location.hostname}:3000/api` : withAppBase('/api'));

export const streamCurator = (input, options) => streamNdjson('/curator/stream', input, options);

export async function rebuildCuratorIndex() {
  if (!getStoredUser()) throw new Error('请先登录');
  const response = await fetch(`${apiBase}/curator/index/rebuild`, { method: 'POST', headers: authHeaders() });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join('；') : payload?.message || '索引重建失败');
  return payload;
}
