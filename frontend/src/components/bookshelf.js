import { h } from '../utils.js';
import { bookCardHTML, wireHearts } from './book-card.js';

/**
 * 书籍网格（受控）：由书架页喂入过滤后的列表，自身不管分类/搜索逻辑
 * 首页与书架页都可复用；分类/搜索联动在 shelf-page.js
 */
export function renderBookGrid(initialList) {
  const el = h('<div class="shelf-grid"></div>');
  wireHearts(el);

  el.paint = (list) => {
    if (!list.length) {
      el.innerHTML = '<p class="shelf-empty">这个书架还空着，去挑一本书吧 🌱</p>';
      return;
    }
    el.innerHTML = list.map((b) => bookCardHTML(b)).join('');
  };

  el.paint(initialList);
  return el;
}
