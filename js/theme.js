/**
 * 主题管理器
 * ------------------------------------------------------------
 * 当前仅启用「清新自然风」(fresh)。
 * 未来主题命名约定：
 *   night  深色夜读
 *   ocean  蓝色梦幻
 *   retro  复古纸张
 *
 * 新增主题步骤：
 * 1. 在 css/variables.css 追加 [data-theme="xxx"] 变量块
 * 2. 把主题 id 加入下方 AVAILABLE_THEMES
 * 3. 调用 setTheme('xxx') 或在 <html> 上设置 data-theme="xxx"
 */

const STORAGE_KEY = 'digital-study-theme';

export const AVAILABLE_THEMES = ['fresh'];

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY)
    || document.documentElement.dataset.theme
    || 'fresh';
}

export function setTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem(STORAGE_KEY, name);
}

/** 应用已保存的主题（页面加载时调用） */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && AVAILABLE_THEMES.includes(saved)) {
    document.documentElement.dataset.theme = saved;
  }
}
