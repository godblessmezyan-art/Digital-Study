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
  renderHero(),             // 1. Hero 欢迎区（视觉中心）
  renderStats(),            // 2. 数据统计（我的阅读生活）
  renderCategories(),       // 3. 分类标签
  renderContinueReading(),  // 4. 继续阅读
  renderBookshelf(),        // 5. 书籍卡片（我的书架）
  renderBookmarks(),        // 6. 今日书签
].forEach((node) => page.appendChild(node));

// 9. 页脚
document.getElementById('site-footer').appendChild(renderFooter());
