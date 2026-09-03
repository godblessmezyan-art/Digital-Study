import { h } from '../utils.js';
import { THEME_META, getTheme, setTheme } from '../theme.js';

/**
 * 设置面板：主题切换（唯一设置项，后续可扩展）
 * - 入口：顶栏 ⚙ 按钮 / 侧栏「设置」项 → openSettings()
 * - 点击主题卡即时生效（setTheme 广播 study:theme，全页令牌切换）
 * - Esc / 遮罩点击 / 关闭按钮均可关闭
 */

let overlay = null;

function themeTile(t, active) {
  return `
    <button class="theme-tile ${active ? 'is-active' : ''}" type="button" data-theme-id="${t.id}">
      <span class="theme-tile__swatch" style="background: linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[0]} 46%, ${t.colors[1]} 46%, ${t.colors[1]} 74%, ${t.colors[2]} 74%)"></span>
      <span class="theme-tile__name">${t.name}${active ? ' ✓' : ''}</span>
      <span class="theme-tile__desc">${t.desc}</span>
    </button>
  `;
}

function paintGrid() {
  if (!overlay) return;
  const current = getTheme();
  overlay.querySelector('.theme-grid').innerHTML =
    THEME_META.map((t) => themeTile(t, t.id === current)).join('');
  overlay.querySelectorAll('.theme-tile').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeId);
      paintGrid();
    });
  });
}

export function openSettings() {
  if (!overlay) {
    overlay = h(`
      <div class="settings-overlay" id="settingsOverlay">
        <div class="settings-card" role="dialog" aria-label="设置">
          <div class="settings-head">
            <h3 class="settings-title">设置</h3>
            <button class="settings-close" type="button" aria-label="关闭">✕</button>
          </div>
          <p class="settings-sub">选择书房的主题 · 即时生效</p>
          <div class="theme-grid"></div>
        </div>
      </div>
    `);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSettings();
    });
    overlay.querySelector('.settings-close').addEventListener('click', closeSettings);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeSettings();
    });
    document.body.appendChild(overlay);
  }
  paintGrid();
  overlay.classList.add('is-open');
}

export function closeSettings() {
  if (overlay) overlay.classList.remove('is-open');
}
