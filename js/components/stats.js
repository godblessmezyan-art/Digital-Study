import { h } from '../utils.js';
import { icons } from '../icons.js';
import { stats } from '../data.js';

/** 阅读统计：4 张数据卡片 */
export function renderStats() {
  const cards = stats.map((s) => `
    <div class="stat-card">
      <div class="stat-card__icon ${s.accent ? 'is-accent' : ''}">${icons[s.icon]}</div>
      <div>
        <div class="stat-card__num">${s.num}<small>${s.unit}</small></div>
        <div class="stat-card__label">${s.label}</div>
      </div>
    </div>
  `).join('');

  return h(`
    <section class="section" id="sec-stats">
      <div class="section-head">
        <h2 class="section-title">我的阅读生活</h2>
        <p class="life-note">日子很慢，书很长。</p>
      </div>
      <div class="stats-grid">${cards}</div>
    </section>
  `);
}
