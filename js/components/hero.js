import { h } from '../utils.js';
import { icons } from '../icons.js';
import { stats } from '../data.js';

/** Hero：完整的书房场景（文字与空间融为一体，而非文字+独立插画） */
export function renderHero() {
  const heroStats = stats.map((item) => `
    <div class="hero-stat">
      <strong>${item.num}<small>${item.unit}</small></strong>
      <span>${item.label}</span>
    </div>
  `).join('');

  return h(`
    <section class="hero">
      <div class="hero__text">
        <p class="hero__eyebrow">下午好，欢迎回到书房</p>
        <h1 class="hero__title">书房 <span>🌿</span></h1>
        <p class="hero__desc">每一本书，都是一次与智者的对话</p>
        <div class="hero__stats">${heroStats}</div>
        <div class="hero__actions">
          <a class="btn btn-primary" href="#sec-continue">继续阅读</a>
          <a class="hero__link" href="#sec-shelf">浏览书架 ${icons.arrowRight || '→'}</a>
        </div>
      </div>
      <div class="hero__scene">
        <img src="assets/hero.png" alt="书房一角：窗边阳光、书架、绿植与一杯热茶" />
        <article class="hero-note">
          <span class="hero-note__label">今日书签</span>
          <p>生活不在别处，<br />当下的每一刻，<br />都是最好的时光。</p>
          <small>《瓦尔登湖》</small>
        </article>
      </div>
    </section>
  `);
}
