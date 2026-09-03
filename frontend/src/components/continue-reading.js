import { h } from '../utils.js';
import { recentReads, books } from '../data.js';
import { bookCardHTML, wireHearts } from './book-card.js';

/**
 * 继续阅读：四本平等的书架排列（设计图 01/02）
 * 与「我的书架」共用同一套书卡模板——最近翻开的书就是书架上被拿出来的四本，
 * 两个区域共用同一套视觉语言，不再左大右小失衡
 */
export function renderContinueReading() {
  const list = recentReads
    .map(({ bookId }) => books.find((b) => b.id === bookId))
    .filter(Boolean)
    .slice(0, 4);

  const el = h(`
    <section class="section" id="sec-continue">
      <h2 class="section-title section-title--leaf">继续阅读</h2>
      <div class="continue-grid">
        ${list.map((b) => bookCardHTML(b, 'continue-card')).join('')}
      </div>
    </section>
  `);

  wireHearts(el.querySelector('.continue-grid'));
  return el;
}
