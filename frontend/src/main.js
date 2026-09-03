/**
 * 数字书房 · 入口
 * 两个视图（hash 路由，静态原型的最小实现）：
 *   #/       首页 —— 阅读入口：Hero → 继续阅读 → 阅读状态 → 今日手记
 *   #/shelf  书架 —— 管理桌：分类筛选 + 搜索 + 全部书籍
 * 首页不再承担完整书架管理职责，打开后很短的视觉路径内就能看到「我正在读什么」
 */
import { initTheme } from './theme.js';
import { renderTopNav } from './components/top-nav.js';
import { renderSideNav, syncNav } from './components/side-nav.js';
import { renderHero } from './components/hero.js';
import { renderContinueReading } from './components/continue-reading.js';
import { renderStats } from './components/stats.js';
import { renderBookmarks } from './components/bookmarks.js';
import { renderShelfPage } from './components/shelf-page.js';
import { renderFooter } from './components/footer.js';

initTheme();

renderTopNav(document.getElementById('top-nav'));
renderSideNav(document.getElementById('side-nav'));

const page = document.getElementById('page');

// 首页：阅读入口（视觉优先级 Hero → 继续阅读 → 阅读状态 → 今日手记）
const homeView = document.createElement('div');
homeView.className = 'view view--home';
[
  renderHero(),             // 1. Hero 开场白（紧凑，服务于继续阅读）
  renderContinueReading(),  // 2. 继续阅读（首页视觉重点，首屏可见）
  renderStats(),            // 3. 阅读状态（轻量信息栏）
  renderBookmarks(),        // 4. 今日手记
].forEach((node) => homeView.appendChild(node));

// 书架页：全部书籍 + 分类 + 搜索
const shelfView = document.createElement('div');
shelfView.className = 'view view--shelf';
shelfView.appendChild(renderShelfPage());

page.appendChild(homeView);
page.appendChild(shelfView);

// hash 路由：切换视图 + 侧栏选中态同步 + 回顶
const applyRoute = () => {
  const isShelf = location.hash.startsWith('#/shelf');
  homeView.hidden = isShelf;
  shelfView.hidden = !isShelf;
  syncNav(isShelf ? 'shelf' : 'home');
};

window.addEventListener('hashchange', () => {
  applyRoute();
  window.scrollTo({ top: 0 });
});
applyRoute();

// 页脚
document.getElementById('site-footer').appendChild(renderFooter());
