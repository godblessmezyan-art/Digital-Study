import { h } from '../utils.js';

/** Hero：文字直接落在房间场景的亮墙上（场景由 layout.css 的 .room 背景图供给） */
export function renderHero() {
  return h(`
    <section class="hero">
      <div class="hero__text">
        <span class="hero__badge">🌿 你的数字书房</span>
        <h1 class="hero__title">安静阅读，<br />慢下来</h1>
        <p class="hero__desc">每天留一点时间，给阅读和自己</p>
        <div class="hero__actions">
          <button class="btn btn-primary" type="button">开始阅读</button>
          <button class="btn btn-soft" type="button">继续阅读</button>
        </div>
      </div>
    </section>
  `);
}
