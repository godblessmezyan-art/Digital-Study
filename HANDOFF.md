# 数字书房 · 项目交接文档（HANDOFF）

> **给接手的 Agent**：这份文档是唯一入口。请先完整读完第 1、2、5、9 节再动手改代码。
> 项目位置：`c:\Users\Administrator\Documents\digital-study`
> 文档更新时点：第 11 轮视觉迭代完成后（承接确认的"清新自然 + 温暖手绘"方向，重构 Hero 与书架结构）

---

## 0. 30 秒概览

| 项 | 内容 |
|---|---|
| 是什么 | 「个人数字书房」网站**纯静态前端原型**（第一主题：清新自然治愈风） |
| 技术栈 | 原生 HTML + CSS + ES Module，**零构建、零依赖、零后端** |
| 入口 | `index.html` → `js/main.js` 按顺序挂载组件 |
| 数据 | `js/data.js` 里的静态 mock（24 本书 / 7 个分类 / 4 条阅读生活 / 2 条书签） |
| 预览 | `http://localhost:8321`（`python -m http.server`，见第 8 节） |
| 视觉基线 | `.shots/baseline-top.png`、`.shots/baseline-full.png`（1440px 宽，当前状态） |
| 版本管理 | **无 git**（尚未 `git init`） |
| 当前状态 | 首页视觉/空间已完成 10 轮迭代并被用户认可，功能仍是"只有分类过滤会动"的原型 |

---

## 1. 硬性边界（违反 = 返工）

这几条是用户反复强调过的，优先级高于任何"我觉得这样更好"：

1. **纯静态原型**：不写后端、不接数据库、不调真实 API、不做登录/支付/AI 功能。数据只来自 `js/data.js`。
2. **不加功能、不加组件、不加动画、不加高饱和颜色**（除非用户明确要求）。历史上用户两次点名："这一轮不要增加功能"、"不要为了填空白而增加元素"。
3. **不许做成 SaaS Dashboard / 图书管理后台**。用户的判据是一句话：
   > "如果把所有文字和按钮去掉，这个页面是否仍然像一个完整的书房空间？"
   答案必须为"是"。
4. **主题变量纪律**：组件样式**只允许**使用 `css/variables.css` 里的语义变量（`--bg`/`--card`/`--text`/`--primary-soft-text`/`--shadow-*`/`--radius-*`…）。写死颜色 = 破坏未来主题（深色夜读 / 蓝色梦幻 / 复古纸张）。
   ⚠️ 已知例外见第 9 节第 2 条（`.room` 环境层与部分前景 SVG 目前含硬编码色值，是待办技术债）。
5. **保留现有架构**：`variables.css / base.css / layout.css / components.css / theme.js` 与"一个区块一个组件文件"的结构不要推翻。可以改内容，不要换范式。
6. **改完必须自检**：不要只说"完成"。流程固定为「改 → 起服务 → headless 截图 → 看图对照目标 → 至少迭代一轮 → 汇报改了什么/为什么/还有什么不够好」。用户明确说过"请不要只修改代码后告诉我完成"。

---

## 2. 产品定位与设计语言

### 定位

**一个治愈、安静、自然的数字书房**，不是阅读管理工具。用户打开时应产生：
"我进入了自己的书房，想坐下来读一本书。"

### 四个核心关键词（所有设计决策回到这里）

**【书】·【空间】·【生活】·【治愈】**

### 信息层级：**书籍优先，数据靠后**

首页固定顺序（`js/main.js` 中即此顺序）：

```
1. Hero 书房场景          —— 空间核心，不是 Banner
2. 继续阅读               —— 首页主角（一本正在读的书 + 最近翻开的两本）
3. 我的书架               —— 书封构成的"一排书"，落在木色架板上
4. 书架分类               —— 书房索引，不是筛选器
5. 我的阅读生活           —— 生活记录，不是 KPI
6. 今日书签               —— 句子卡片
7. Footer
```

### 设计语言要点（用户的原话精神）

- 空间层次、光影、材质、留白、微妙不对称产生治愈感 —— **不是靠"米白 + 绿"模拟**
- 页面是**一个连续的房间**，不是一堆 Card 的拼接（借鉴"蓝色梦幻方案"的连续世界思路，转译为清新自然风）
- 允许元素**跨越区域边界**产生纵深（出血、叠压、悬浮便签）
- 卡片要"纸感 + 半透明"，与环境融合，不要实心白盒
- 中文标题用**衬线**，正文用**无衬线**；标题减字重、加字距（文学感）
- 装饰必须服务于书房逻辑（窗 → 光 → 窗边阅读角 是因果链），禁止无来由的点缀

---

## 3. 技术架构与文件地图

```
digital-study/
├── index.html                  页面骨架 + .room 房间环境层（墙面/光窗/光线/书架/地板/地毯）
├── assets/hero.png             Hero 书房场景插画（1792×1024，2.4MB，右下角水印已用纹理修补）
├── css/
│   ├── variables.css           ★ 主题 Token 唯一来源（色板/语义层/书封渐变/圆角/阴影/字体/页宽）
│   ├── base.css                reset、body 纸纹、排版基线、.btn/.progress/.section-title/.page-grid-4
│   ├── layout.css              .room 环境层 / .top-nav / .app 骨架 / .side-nav / .page / footer / 900px 断点
│   └── components.css          Hero / 继续阅读 / 统计 / 分类 / 书封 / 书架 / 书签 + 680px 断点（846 行，最大文件）
├── js/
│   ├── main.js                 入口：initTheme → 挂 top/side → 按顺序 appendChild 6 个 section
│   ├── data.js                 ★ 所有 mock 数据与派生函数（progressText / booksByCategory）
│   ├── theme.js                setTheme / getTheme / initTheme，localStorage key = 'digital-study-theme'
│   ├── utils.js                h(template) → HTMLElement；esc(str) HTML 转义
│   ├── icons.js                19 个内联 SVG（feather 风格）：home bookshelf clock chart note star folder sliders search bookmark calendar flame leaf feather heart bulb briefcase rocket grid
│   └── components/
│       ├── top-nav.js          品牌 + 窄搜索框(260px 靠右) + 图标按钮
│       ├── side-nav.js         私人书房目录（三组 + 分隔线 + 「我的分类」4 条 + 设置）
│       ├── hero.js             文案 + 场景图 + 两件前景 SVG（.hero__plant / .hero__props）
│       ├── continue-reading.js 桌上便签 .desk-note + 主书卡(7fr) + 最近两本(5fr)
│       ├── bookshelf.js        .shelf-grid(flex) + .shelf-row__books / .shelf-row__board 书墙；监听 study:category 重绘
│       ├── categories.js       .cat-index 六格索引；点击广播 study:category
│       ├── stats.js            「我的阅读生活」+ .life-note 手记
│       ├── bookmarks.js        今日书签两张纸片
│       └── footer.js           页脚格言与链接
└── .shots/                     10 轮迭代截图证据（r1…r10 + baseline-*）
```

**组件契约**：每个 `render*()` 返回一个 DOM 节点（或渲染进传入 container），不做状态管理，不引框架。

---

## 4. 主题 / 设计 Token（要改感觉，先改这里）

`css/variables.css` 中 `[data-theme="fresh"]`：

| 语义变量 | 值 | 用途 |
|---|---|---|
| `--bg` | `#F6F5EC` | 页面背景（实际底色由 `.room` 渐变提供） |
| `--card` | `#FFFDF7` | 卡片暖白（多处已改为 `rgba(255,253,247,.6~.9)` 半透明） |
| `--primary` | `#7C9B72` | 鼠尾草绿主色 |
| `--primary-soft` | `#E7EFE1` | 浅绿选中底 |
| `--primary-soft-text` | `#5C7A53` | 选中态文字 |
| `--accent` | `#D9B86C` | 暖金强调 |
| `--text` / `--text-muted` | `#374238` / `#899187` | 主/次文字 |
| `--border` | `#E4E4D8` | 发丝线 |
| `--cover-1 ~ --cover-6` | 6 套低饱和渐变 | 灰绿/米金/雾蓝/暖陶/橄榄/亚麻 |
| `--radius-xl/lg/md/sm` | 28 / 20 / 14 / 10 px | |
| `--shadow-soft / hover / cover` | 暖调 rgba(96,90,70,…) | 冷灰阴影被明确禁止 |
| `--hero-panel` / `--hero-fade` | 渐变 | Hero 底色与图文融合遮罩（fade 到 46%） |
| `--paper-texture` | SVG feTurbulence data-URI | 纸噪点 |
| `--page-max` / `--sidebar-w` | **1320px / 232px** | 主内容区实际约 1048px |

**新增一个主题的三步**（`js/theme.js` 顶部注释亦有说明）：
1. `variables.css` 追加 `[data-theme="xxx"] { …覆盖同名变量… }`
2. 把 id 加入 `AVAILABLE_THEMES`（当前只有 `['fresh']`）
3. `setTheme('xxx')` 或 `<html data-theme="xxx">`

⚠️ 换主题目前**不会**改变 `.room` 环境层与 Hero 前景 SVG 的颜色（硬编码），必须先做第 9 节第 2 条的收敛。

---

## 5. 当前视觉方案：一间连续的"书房"（第 10 轮成果，勿轻易推翻）

### 5.1 空间纵深层级（z 轴，从后到前）

```
z=0   .room        固定环境层：墙面渐变 / 左墙光窗 + 窗台盆栽 / 斜入午后光线 / 右墙远处书架线稿 / 地板 + 地毯
      ↓            （position: fixed，内容滚动时房间不动 → 真实空间感来源）
z=1   body 纸纹    极淡噪点（--paper-texture）
z=1   .top-nav     82% 半透明（滚动时不切断房间空气）
z=1   .side-nav    墙面色底板 rgba(234,227,206,0.5) + 20px 圆角 → "被光照亮的一面墙"
z=1   .hero        左右出血 margin: 0 -26px，无阴影
z=3   #sec-continue margin-top: -34px（叠压 Hero 底部，两区缝合）
z=4   .desk-note   旋转 -3° 的便签 + 胶带，悬浮在 Hero 与继续阅读之间
      .book-card   书封落在 .shelf-board 木色架板上
```

### 5.2 已确立的关键空间手法（改动前请理解其意图）

| 手法 | 实现位置 | 意图 |
|---|---|---|
| Hero 左右出血 | `components.css` `.hero { margin: 0 -26px }` | 场景比内容栏更宽 → 房间向两侧延伸，非 Banner |
| Hero 无阴影 + 底部落地光 | `box-shadow: none` + `.hero::after` 46px 渐变 | 让空间有"地"，Hero 像一块光而非卡片 |
| 前景盆栽 / 书堆花瓶 | `hero.js` 两个内联 SVG（`.hero__plant` 左下 / `.hero__props` 右下） | 与插画同色系的"房间里真实的物件"，制造前后层次 |
| 继续阅读叠压 Hero | `#sec-continue { margin-top: -34px; z-index: 3 }` | 上下区不断裂 |
| 桌上便签 + 胶带 | `.desk-note` / `.desk-note::before` | "人的痕迹"，缝合物件而非 UI 卡 |
| 主书封实体感 | `.continue-featured .cover { rotate(-1.2deg); box-shadow: 5px 6px 0 纸色, … }` | 纸页堆叠的实体书 |
| 书架化 | `.book-card__slot` 底对齐 + `nth-child` 四档高度(206~228px) + `±0.5deg` 倾角 + `.shelf-board` 木色架板 | "我看到一排书"，不是四个相同 Card |
| 书封质感 | `.cover::before` 光斑 / `.cover::after` 11px 书脊暗边 + 合页亮线 | 书像书 |
| 统计降权 | `.stats-grid` 半透明整板 + `--shadow: none` + `.stat-card + .stat-card` 发丝左线 + `.life-note`「日子很慢，书很长。」 | 生活记录，不是 Dashboard KPI |
| 分类索引化 | `.cat-index__item`（非胶囊、12px 圆角、淡暖白底、衬线名 + "N 本"） | 书架格子的索引，不是筛选器 |
| Nav 存在感 | 文字 15.5px / 项高 46px / 图标 18px / 项距 8px / 分隔线呼吸 14px；`.side-nav__item--cat` 衬线 + 0.07em 字距 | 视觉锚点 + 书房目录 |

### 5.3 尺寸与字号基线（当前值，微调参考）

| 位置 | 值 |
|---|---|
| 页宽 / 侧栏 / 两栏间距 | `--page-max 1320` / `--sidebar-w 232` / `.app gap 56px` |
| `.app` 左右内边距 | 36px |
| 区块间距 `.page gap` | 50px；`.section gap` 18px |
| Hero | `min-height 336px`，`grid-template-columns: 9fr 13fr`，标题 34px/600/0.06em |
| 继续阅读 | `.continue-wrap 7fr:5fr`，主书封 140×198 |
| 书架 | `.shelf-grid repeat(4,1fr)`，gap `30px 22px`，槽高 232px |
| 统计数字 | 21px/600（刻意小于常规 Dashboard 数字） |
| 搜索框 | 260px，透明底 + 1px 边框，focus 才变实底（用户要求"顶部小搜索框"） |
| 断点 | `layout.css` 1280（隐藏光窗/书架）、900（侧栏堆叠）；`components.css` 680（单列） |

---

## 6. 数据模型（`js/data.js`）

```js
categories: [{ id, name, icon, count }]          // all/lit/mind/life/philo/biz/tech，名字是书房语境（心灵成长、生活智慧、哲学思考、科学探索）
books:      [{ id, title, author, category, unit, chapters, progress(0-100), cover(1-6) }]  // 24 本
recentReads:[{ bookId, chapterText }]            // 3 条，第 1 条即"继续阅读"主书（当前 = 瓦尔登湖 67%）
stats:      [{ icon, accent, num, unit, label }] // 4 条：陪伴阅读 / 本周阅读 / 已经读完 / 连续阅读
bookmarks:  [{ quote, source, meta }]            // 2 条
progressText(book)   // '已读完' | '未开始阅读' | `${chapters} ${unit} · 已读到第 N ${unit}`
booksByCategory(id)  // 'all' 返回全部，否则按 category 过滤
```

字段纪律：`unit` 用于中文量词差异（章/卷/辑/讲）；`cover` 只写 1~6，映射到 `--cover-N`。
**换真实封面**：给 book 加 `coverImg` 字段并在 `.cover` 上输出 `background-image` 即可，无需改架构。

---

## 7. 组件间通信（唯一的事件）

```js
document.dispatchEvent(new CustomEvent('study:category', { detail: { catId, source: 'sidenav' | 'cat-index' } }))
```

监听方：`bookshelf.js`（重绘书籍网格 + 空态 `.shelf-empty`）、`categories.js`（同步选中态 + 更新副标题）。
侧栏 `.side-nav__item--cat` 点击后会广播并滚动到 `#sec-shelf`。

**可用锚点 ID**：`#sec-continue`、`#sec-shelf`、`#sec-cats`、`#sec-stats`（`.section { scroll-margin-top: 76px }` 已避开吸顶导航）。

---

## 8. 如何运行 / 如何截图验证（照抄即可）

### 8.1 起服务

```powershell
python -m http.server 8321 --directory "c:\Users\Administrator\Documents\digital-study"
```

### 8.2 Edge headless 截图（本会话已验证可靠的管线）

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
# 首屏
& $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$env:TEMP\edge-shot-x1" `
  --force-device-scale-factor=1 --window-size=1440,900 `
  --screenshot="c:\Users\Administrator\Documents\digital-study\.shots\new-top.png" "http://localhost:8321/index.html"
# 整页（页面总高约 5600~5700px）
& $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$env:TEMP\edge-shot-x2" `
  --force-device-scale-factor=1 --window-size=1440,5700 `
  --screenshot="c:\Users\Administrator\Documents\digital-study\.shots\new-full.png" "http://localhost:8321/index.html"
```

**踩过的坑（务必避开）**：
- `--user-data-dir` **每次必须换新目录**，复用同一 profile 会静默失败（截图文件不生成）。stderr 的 Edge LLM / QQBrowser / geolocation 报错是无害噪音。
- Browser 子代理截图在本机不可靠（窗口 `visibilityState === 'hidden'`、会话易损坏）→ 用上面的 headless 方案。
- 看细节用 PIL 裁剪放大：
  ```powershell
  python -c "from PIL import Image; im=Image.open(r'...\new-full.png'); im.crop((240,560,1440,1360)).save(r'...\crop.png')"
  ```
- 本会话 shell 是 **PowerShell 5.1**：不支持 `&&`，用 `;`；无 `Join-String`。
- 截完图**必须真的 Read 图片看**，不要凭代码推断视觉结论。

---

## 9. 已知遗留与技术债（建议按此顺序处理）

1. **`assets/hero.png` 2.4MB 未压缩**：本地无碍，上线前压缩或转 WebP。右下角原始生成水印已用相邻纹理 + 高斯羽化修补（`.shots/hero-corner-fixed.png` 为修补后证据）。
2. **`.room` 环境层色值硬编码**（`layout.css` 中墙面/光窗/光线/地板/书架共约 10 处 rgba/hex）+ Hero 前景 SVG 与窗台盆栽的 fill 色：换主题会露馅。做第二主题前需收敛为 `--room-wall-top`、`--room-light`、`--room-floor` 一类语义变量。
3. **孤儿 CSS**：`.note-slip`、`.recent-row` / `.recent-item*` 已在第 11 轮清理（组件已删，样式残留）。
4. **纯装饰性交互未实现**（原型阶段刻意为之，别当 bug 修）：搜索框无过滤逻辑、侧栏「读书笔记 / 收藏 / 设置」无 target、Hero 与继续阅读的按钮无 click 行为、`icon-btn` 无反馈。
5. **侧栏选中态语义混用**：主目录项与分类项共用 `.is-active` 但互斥规则不同（点主目录会清掉分类选中态，反之只清分类）；若后续要加路由/多页，需要重构为两组独立状态。
6. **超宽屏（>1920px）未校准**：`.room__window` 用 `max(-40px, calc(50% - 748px))`、`.room__shelf` 用 `calc(50% - 655px)` 定位，宽屏下与内容的相对关系需复查。小屏 ≤1280 已直接隐藏窗与书架。
7. **无 git**：建议接手后第一时间 `git init` 提交当前基线，避免后续无法回滚（本会话未提交任何版本）。
8. **参考图路径可能失效**：初始需求的 6 风格参考图在 `C:\Users\Administrator\AppData\Roaming\QoderCN\SharedClientCache\cache\images\task-256\4lqgaufa-e07e551b.png`（Panel 01 = 清新自然风目标）。若已丢失，以 `.shots/baseline-*.png` 为基线。

---

## 10. 迭代历史（为什么现在长这样）

| 轮次 | 做了什么 | 用户反馈要点 |
|---|---|---|
| 1 | 首版搭建：9 大区块、组件化、主题变量预留 | 方向对，但… |
| 2 | 用户判定"太像 SaaS 后台"，13 条纠偏：删大搜索框、Hero 场景化、压缩首屏、侧栏降权、书卡像书、去组件感 | 必须至少 2 轮截图迭代 |
| 3 | 两轮迭代：高饱和选中态/胶囊按钮/厚卡片修正 | "明显接近目标" |
| 4 | 6 项精修：侧栏 232px 锚点、内容区 1048px、Hero 去卡片感、统计改「我的阅读生活」、分类书房化 | 只做比例与层级，不加东西 |
| 5 | **信息层级反转**（书籍优先）：新增「继续阅读」；侧栏改私人书房目录；分类改书架索引；统计移到书架之后 | 用户给出目标结构图 |
| 6 | 空间感深化：房间氛围层（窗光/植物影/书架线稿）、主书封实体感、书架架板、便签、`.life-note` 手记 | "还像高级 Dashboard，不像书房" |
| 7 | 关系重构：Hero 左右出血 + 前景盆栽/书堆、继续阅读上移叠压、Nav 与内容 56px + 墙面底板、修掉插画水印 | 要求元素可跨越区域、有纵深 |
| 8-10 | **环境底层重做**：`room-ambience` 零散三件套 → `.room` 连续房间（墙面/光窗/窗台盆栽/斜入光线/远处书架/地板地毯）；卡片改半透明纸感；修正光窗被 Nav 挡住 + 可见度不足 | 用户："不要通过增加元素解决空白，要重新设计整个背景空间" |
| 11 | **承接确认方向 + 结构级重构**：① Hero 从"带圆角面板"改为"房间开口"（背景透明 + 场景顶部/左侧向墙面羽化 + 去面板色）；② 侧栏去投影、降底色，让光窗透出、更像一面墙；③ 24 本书由"整块库存网格"重构为"一排排落在木架上的书墙"（`.shelf-row__books` + `.shelf-row__board`，每排自己的架板）；④ `.room__floor`/`.room__rug` 加强，页面底部收束到"地面"；⑤ 继续阅读卡片改纸感半透明；⑥ 清理孤儿 CSS（`.note-slip`、`.recent-row*`）；⑦ 副标题色改语义变量 | 用户："不要在现有页面上不断打补丁；如果布局结构阻碍设计，直接重构" |

---

## 11. 用户（需求方）的偏好与验收口味

- **看得懂设计语言，不接受表面模仿**：会直接指出"这不是颜色问题，是设计理念问题"。
- **极度反感**：SaaS Dashboard 感、后台 Sidebar、Card 套 Card、胶囊按钮堆、高饱和色、冷灰阴影、为填空白而堆装饰、复杂渐变、厚重边框。
- **喜欢**：连续空间、光影因果、纸张与木质感、微妙不对称、衬线标题 + 大字距、克制的"人的痕迹"（便签/茶杯/摊开的书）。
- **工作方式**：会明确划定期望（"这一轮只做 X，不要 Y"）；要求主动自检与迭代，不接受"我改完了"；欣赏坦率指出剩余问题（例如"光窗你可能觉得仍太隐晦，可加一档"这类反馈被接受）。
- 曾要求过"这个会话里你都不用验证，我自己来验证"——注意用户会临时调整验证要求，以最新指示为准。

---

## 12. 下一轮开工自检清单

- [ ] 我是否加了功能/组件/动画/颜色？（除非用户要求，应为"否"）
- [ ] 改动是否只落在语义变量与既有文件结构内？
- [ ] 去掉所有文字和按钮，页面还像一间书房吗？
- [ ] 第一眼看到的是"书"，还是"数据/筛选器"？
- [ ] 是否又造出一个孤立白卡片？
- [ ] 服务能起、`localhost:8321` 无 JS 报错（Console 干净）
- [ ] 是否截了图、真的看过、并至少迭代一轮？
- [ ] 是否向用户说明：改了什么 / 为什么 / 哪里仍需优化？

---

*文档由上一轮实现方整理，内容与代码实际状态一致（已逐项核对文件与数值）。*
