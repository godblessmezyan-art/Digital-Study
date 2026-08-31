# 数字书房（Digital Study）

一个治愈、安静、自然的个人数字书房网站。每天留一点时间，给阅读和自己。

在线预览：https://wxhappylife.top/test/

## 项目结构

```
my-website/
├── frontend/            # 前端：Vite + 原生 ES Modules（无框架）
├── backend/             # 后端：Node.js + Express（开发中）
├── docs/                # 项目文档（架构 / 需求 / 进度）
├── AGENTS.md            # 多 Agent 协作规则
├── deploy.ps1           # 一键发布（GitHub 同步 + 构建 + 上传 + 验证）
├── docker-compose.yml   # 本地开发环境
└── .env.example         # 环境变量模板
```

## 快速开始

```powershell
# 前端（本地开发 http://localhost:5173）
cd frontend
npm install
npm run dev

# 后端（http://localhost:3000，健康检查 /api/health）
cd backend
npm install
npm run dev
```

## 发布

```powershell
.\deploy.ps1   # 提交并推送 GitHub → 构建前端 → 上传 wxhappylife.top/test → 验证 HTTP 200
```

## 文档

- 架构说明：`docs/architecture.md`
- 需求与设计语言：`docs/requirements.md`
- 迭代进度与遗留债：`docs/progress.md`
- 历史交接：`docs/handoff.md`

## 技术栈

前端：Vite · 原生 HTML/CSS/ES Modules（零框架、零后端依赖，数据在 `frontend/src/data.js`）
后端：Node.js · Express（骨架期，路由/服务/模型分层）
部署：GitHub（版本） + OpenResty 静态托管（`/test` 子路径）
