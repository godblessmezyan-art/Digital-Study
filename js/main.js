/**
 * 数字书房 · 入口
 * 静态原型：所有组件按页面结构顺序挂载，数据来自 js/data.js
 */
import { initTheme } from './theme.js';
import { renderTopNav } from './components/top-nav.js';
import { renderSideNav } from './components/side-nav.js';
import { renderHero } from './components/hero.js';
import { renderContinueReading } from './components/continue-reading.js';
import { renderBookshelf } from './components/bookshelf.js';
import { renderCategories } from './components/categories.js';
import { renderStats } from './components/stats.js';
import { renderBookmarks } from './components/bookmarks.js';
import { renderFooter } from './components/footer.js';

initTheme();

renderTopNav(document.getElementById('top-nav'));
renderSideNav(document.getElementById('side-nav'));

const page = document.getElementById('page');
[
  renderHero(),             // 1. Hero 书房空间
  renderContinueReading(),  // 2. 继续阅读（首页主角）
  renderBookshelf(),        // 3. 我的书架（书优先）
  renderCategories(),       // 4. 书架分类（轻量索引）
  renderStats(),            // 5. 我的阅读生活（数据靠后）
  renderBookmarks(),        // 6. 今日书签
].forEach((node) => page.appendChild(node));

// 9. 页脚
document.getElementById('site-footer').appendChild(renderFooter());
