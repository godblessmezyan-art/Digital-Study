import { h } from '../utils.js';

/** Hero：完整的书房场景（文字与空间融为一体，而非文字+独立插画） */
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
      <div class="hero__scene">
        <img src="/assets/hero.png" alt="书房一角：窗边阳光、书架、绿植与一杯热茶" />
      </div>

      <!-- 场景前景物：与插画同属一个房间的盆栽、书堆与花瓶 -->
      <svg class="hero__plant" viewBox="0 0 140 170" aria-hidden="true">
        <g fill="#8AA47E">
          <path d="M70 124 C 66 86, 40 66, 20 58 C 50 60, 68 86, 70 124 Z" opacity="0.9"/>
          <path d="M72 124 C 74 80, 96 60, 120 52 C 94 66, 76 90, 72 124 Z" opacity="0.85"/>
          <path d="M71 124 C 70 78, 66 46, 62 20 C 80 50, 76 92, 71 124 Z" opacity="0.95"/>
        </g>
        <path d="M38 122 h64 l-7 36 H45 Z" fill="#C9B18C"/>
        <path d="M34 116 h72 v10 H34 Z" fill="#B99B74"/>
      </svg>
      <svg class="hero__props" viewBox="0 0 200 132" aria-hidden="true">
        <rect x="16" y="100" width="88" height="14" rx="3" fill="#A8B59A"/>
        <rect x="24" y="86" width="76" height="14" rx="3" fill="#C9BA94"/>
        <rect x="32" y="72" width="60" height="14" rx="3" fill="#B9A28A"/>
        <path d="M138 70 c-11 0 -17 8 -17 19 c0 12 7 21 17 21 s17 -9 17 -21 c0 -11 -6 -19 -17 -19z" fill="#B9C4C8"/>
        <path d="M138 70 c0 -14 4 -25 11 -35 M138 70 c0 -16 -6 -27 -13 -33" stroke="#7C9B72" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>
    </section>
  `);
}
