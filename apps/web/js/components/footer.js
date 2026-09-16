import { h } from '../utils.js';

/** 页脚 */
export function renderFooter() {
  return h(`
    <div class="site-footer__inner">
      <p class="site-footer__motto">数字书房 · 让阅读成为每天的一部分</p>
      <nav class="site-footer__links">
        <a href="#">书房</a>
        <a href="#">书架</a>
        <a href="#">统计</a>
        <a href="#">书签</a>
      </nav>
    </div>
  `);
}
