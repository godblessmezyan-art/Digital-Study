/**
 * 主题管理器 —— 六主题
 * ------------------------------------------------------------
 * 主题 = css/themes/<id>.css（令牌）+ public/assets/themes/<id>/（插画资产）
 * 切换：setTheme(id) → 更新 <html data-theme> → 广播 study:theme 事件
 * （env-art 背景、颜色令牌由 CSS 自动切换；Hero <img> 由事件驱动换 src）
 */

const STORAGE_KEY = 'digital-study-theme';

/** 全部可用主题（顺序 = 设置面板展示顺序） */
export const THEME_META = [
  { id: 'fresh-natural',     name: '清新自然', desc: '晨光 · 绿意 · 治愈',   colors: ['#F6F5EC', '#7C9B72', '#D9B86C'] },
  { id: 'warm-study',        name: '温暖手绘', desc: '暖阳 · 手绘 · 橘猫',   colors: ['#F8F0DF', '#D88A3D', '#5A4632'] },
  { id: 'night-library',     name: '深夜夜读', desc: '夜阑 · 台灯 · 星空',   colors: ['#1B2440', '#D9A441', '#E8E4D8'] },
  { id: 'minimal-white',     name: '极简留白', desc: '纯粹 · 留白 · 一枝绿', colors: ['#FAFAF7', '#6B8A62', '#3C443C'] },
  { id: 'retro-paper',       name: '复古纸质', desc: '旧纸 · 羽毛笔 · 岁月', colors: ['#EFE5CE', '#8C5A3C', '#4A3826'] },
  { id: 'dream-illustration',name: '插画梦境', desc: '星空 · 提灯 · 全屏梦境', colors: ['#241E45', '#9B8AE8', '#F2C879'] },
];

export const AVAILABLE_THEMES = THEME_META.map((t) => t.id);

/* 旧主题 id → 新主题 id 迁移映射（老用户 localStorage 里存的 'fresh'） */
const THEME_MIGRATION = { fresh: 'warm-study' };

export function getTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const current = saved || document.documentElement.dataset.theme || 'warm-study';
  return THEME_MIGRATION[current] || current;
}

export function setTheme(name) {
  if (!AVAILABLE_THEMES.includes(name)) return;
  document.documentElement.dataset.theme = name;
  localStorage.setItem(STORAGE_KEY, name);
  // 广播：Hero 插画等 JS 侧资产随主题切换
  document.dispatchEvent(new CustomEvent('study:theme', { detail: { theme: name } }));
}

/** 应用已保存的主题（页面加载时调用），并迁移旧 id */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  const theme = THEME_MIGRATION[saved] || saved;
  if (AVAILABLE_THEMES.includes(theme)) {
    document.documentElement.dataset.theme = theme;
    if (theme !== saved) localStorage.setItem(STORAGE_KEY, theme);
  }
}

/** 主题资产路径：/assets/themes/<当前主题>/<文件名> */
export function themeAsset(filename) {
  return `/assets/themes/${getTheme()}/${filename}`;
}
