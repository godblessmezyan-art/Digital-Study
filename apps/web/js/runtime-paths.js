function normalizeBasePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function detectBasePath() {
  const configured = globalThis.DIGITAL_STUDY_BASE_PATH;
  if (configured !== undefined) return normalizeBasePath(configured);

  const pathname = window.location.pathname;
  const documentMatch = pathname.match(/\/(?:index|home)\.html$/i);
  if (documentMatch) return normalizeBasePath(pathname.slice(0, documentMatch.index));
  if (pathname.endsWith('/')) return normalizeBasePath(pathname.slice(0, -1));
  return '';
}

export const APP_BASE_PATH = detectBasePath();

export function withAppBase(path) {
  if (!path || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('#')) return path;
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  if (!APP_BASE_PATH || absolutePath === APP_BASE_PATH || absolutePath.startsWith(`${APP_BASE_PATH}/`)) return absolutePath;
  return `${APP_BASE_PATH}${absolutePath}`;
}
