import { esc } from '../utils.js';
import { coverArt } from '../cover.js';
import { progressText } from '../data.js';

/**
 * 书卡模板：书架与「继续阅读」共用同一套结构（书 > Card）
 * 收藏心形是轻量视觉元素：点击切换点亮态（内存状态，不接数据层）
 */
export function bookCardHTML(book, extraClass = '') {
  const done = book.progress >= 100;
  return `
    <article class="book-card ${extraClass}">
      <div class="cover" data-cover="${book.cover}">${coverArt(book.cover)}</div>
      <div class="book-card__body">
        <h3 class="book-card__title">${esc(book.title)}</h3>
        <p class="book-card__author">${esc(book.author)}</p>
        <p class="book-card__meta">${esc(progressText(book))}</p>
        <div class="book-card__foot">
          <div class="progress ${done ? 'is-done' : ''}"><i style="width:${book.progress}%"></i></div>
          <span class="book-card__pct">${done ? '已读完' : `${book.progress}%`}</span>
          <button class="book-card__heart" type="button" title="收藏" aria-label="收藏">♡</button>
        </div>
      </div>
    </article>
  `;
}

/** 在容器内接线心形点击（事件委托，一次绑定） */
export function wireHearts(container) {
  container.addEventListener('click', (e) => {
    const heart = e.target.closest('.book-card__heart');
    if (!heart) return;
    const on = heart.classList.toggle('is-on');
    heart.textContent = on ? '♥' : '♡';
  });
}
