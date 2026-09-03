# 数字书房 · 架构说明（architecture.md）

> 面向新结构（my-website/ monorepo）的架构总览。历史交接详见 `docs/handoff.md`。

## 1. 总体结构

```
my-website/
├── frontend/                # 前端：Vite + 原生 ES Modules（构建产物 dist/）
│   ├── index.html           # Vite 入口
│   ├── vite.config.js       # 构建配置（生产 base=/test/）
│   ├── package.json
│   ├── public/              # 原样拷贝的静态资源（构建时进入 dist/ 根）
│   │   └── assets/hero.png
│   └── src/
│       ├── main.js          # 入口：initTheme → 挂 top/side → 按顺序挂载 6 个 section
│       ├── data.js          # 所有 mock 数据与派生函数
│       ├── theme.js         # 主题切换（localStorage key = 'digital-study-theme'）
│       ├── utils.js         # h(template)→HTMLElement；esc() HTML 转义
│       ├── icons.js         # 19 个内联 SVG（feather 风格）
│       ├── components/      # 9 个区块组件（top-nav / side-nav / hero / … / footer）
│       └── css/
│           ├── variables.css    # ★ 主题 Token 唯一来源
│           ├── base.css         # reset、body 纸纹、排版基线、公共元素
│           ├── layout.css       # .room 环境层 / 骨架 / 断点
│           └── components.css   # 各组件样式（最大文件）
├── backend/                 # 后端：Node.js + Express（当前为骨架）
│   ├── src/index.js         # Express 入口（/api/health 健康检查）
│   ├── config/index.js      # 配置中心（读取环境变量）
│   ├── routes/              # 路由（index.js 注册中心 + 各业务模块）
│   ├── services/            # 业务逻辑层（待开发）
│   ├── models/              # 数据模型层（待开发）
│   └── package.json
├── docs/                    # 项目文档
│   ├── architecture.md      # 本文档
│   ├── requirements.md      # 需求与设计语言
│   ├── progress.md          # 迭代进度与遗留债
│   └── handoff.md           # 历史交接文档（原 HANDOFF.md，保留完整记录）
├── AGENTS.md                # 多 Agent 协作规则（改代码前必读）
├── README.md                # 给人看的项目说明
├── deploy.ps1               # 一键发布（GitHub 同步 + 构建 + 上传 + 验证）
├── docker-compose.yml       # 本地开发环境
└── .env.example             # 环境变量模板
```

## 2. 技术选型

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Vite + 原生 ES Modules | 无框架，保持"零依赖"心智；Vite 提供 dev server 与生产构建 |
| 后端 | Node.js + Express | 用户确认；`backend/` 为骨架，业务待开发 |
| 部署 | OpenResty 静态托管 | `https://wxhappylife.top/test/` 子路径；前端构建产物上传 |
| 版本 | git + GitHub | main 分支发布；feature/ 分支开发 |

## 3. 前端要点

- **组件契约**：每个 `render*()` 返回一个 DOM 节点（或渲染进传入 container），不做状态管理，不引框架。
- **构建**：`npm run build` 输出 `frontend/dist/`；`vite.config.js` 中生产 `base='/test/'`（环境变量 `VITE_BASE` 可覆盖），本地 dev 为 `/`。
- **静态资源**：`public/` 内资源以绝对路径引用（如 `/assets/hero.png`），构建时原样拷贝。
- **样式纪律**：组件只允许使用 `css/variables.css` 的语义变量（`--bg`/`--card`/`--text`/`--room-*`…），写死颜色 = 破坏未来主题。

## 4. 后端约定（骨架期）

- `backend/src/index.js` 为唯一入口，`npm run dev`（watch）/ `npm start`。
- 新增业务路由三步：`routes/<module>.js` 建 router → `routes/index.js` 挂载 → `services/`、`models/` 各建对应文件。
- 配置一律走 `config/index.js` + 环境变量（模板见 `.env.example`），禁止硬编码。

## 5. 组件间通信（唯一事件）

```js
document.dispatchEvent(new CustomEvent('study:category', { detail: { catId, source: 'sidenav' | 'cat-index' } }))
```

监听方：`bookshelf.js`（重绘网格 + 空态）、`categories.js`（同步选中态）。
锚点 ID：`#sec-continue`、`#sec-shelf`、`#sec-cats`、`#sec-stats`。

## 6. 运行方式

```powershell
# 前端 dev（本地 http://localhost:5173）
cd frontend; npm run dev

# 前端生产构建
cd frontend; npm run build

# 后端 dev（http://localhost:3000）
cd backend; npm install; npm run dev

# 一键发布（GitHub + wxhappylife.top/test）
.\deploy.ps1
```
