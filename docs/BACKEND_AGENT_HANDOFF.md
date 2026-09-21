# Digital Study 后端开发交接文档

> 更新日期：2026-09-21  
> 仓库：https://github.com/godblessmezyan-art/Digital-Study  
> 默认分支：`main`  
> 编写时基线提交：`c25ccf2`  
> 线上入口：https://wxhappylife.top/digital-study/

## 1. 项目简介

Digital Study（界面名称“云天幻境”）是一个个人数字书房与 AI 内容工坊。项目采用 pnpm Monorepo，将以下内容放在同一个 GitHub 仓库中：

- Vite 静态前端；
- NestJS API；
- Prisma Schema、MySQL migration 和 seed；
- 可长期保存、可审阅的书籍文件；
- AI 模板与生成任务；
- Docker、Nginx、Cloudflare 前端部署配置；
- 架构、开发和运维文档。

项目最重要的设计原则是：

> GitHub 保存代码和长期书籍内容；MySQL 主要保存检索索引和运行时状态。书籍正文不能只存在数据库中。

服务器迁移的目标流程是：clone 仓库、配置 `.env`、启动 MySQL 和服务、执行 migration、执行 `sync-content`，即可恢复网站。

## 2. 不可破坏的边界

后续 Agent 开发前必须先阅读仓库根目录的 `AGENTS.md`，并遵守以下规则：

1. `content/books/{slug}` 是书籍元数据、HTML 正文和封面的长期事实来源。
2. MySQL 可以重建，不能成为书籍正文的唯一副本。
3. 发布流程必须先安全写入内容目录，再 upsert 数据库索引。
4. 不得实现自动 Git commit 或自动 Git push。
5. 不要擅自把现有原生 JavaScript 前端重写成 React/Vue 等框架。
6. 不要把 `.env`、生产密码、JWT、API Key、数据库卷或构建输出提交到 Git。
7. 删除书籍、清理数据库孤儿记录等破坏性操作必须单独设计审计和备份流程。

## 3. GitHub 与协作方式

### 3.1 仓库信息

```text
Remote:  origin
URL:     https://github.com/godblessmezyan-art/Digital-Study.git
Branch:  main
Package: pnpm@11.19.0
Node:    >= 22
```

`main` 当前也是生产服务器使用的分支。服务器上的仓库位于 `/opt/digital-study`，线上部署目前是人工拉取和重建容器，不存在自动 Git push。

### 3.2 推荐开发流程

```bash
git status
git pull --ff-only origin main
git switch -c codex/<short-task-name>
pnpm install --frozen-lockfile

# 开发、验证后
pnpm build
git diff --check
git status
```

提交信息建议使用：

```text
feat: ...
fix: ...
docs: ...
refactor: ...
test: ...
```

开始工作前必须检查工作区，不能覆盖用户已有的未提交修改。除非用户明确授权，不要替用户提交、推送或部署。

### 3.3 pnpm 安装安全策略

仓库使用 pnpm 11 的 `allowBuilds` 白名单，只允许实际需要的依赖执行安装脚本：

- `@prisma/client`
- `@prisma/engines`
- `prisma`
- `esbuild`
- `workerd`

不要通过全局关闭 pnpm build-script 安全检查来解决 CI 问题。

## 4. 技术栈

| 层级 | 技术 |
|---|---|
| Monorepo | pnpm workspaces 11.19.0 |
| 前端 | 原生 HTML/CSS/JavaScript + Vite 7 |
| 后端 | NestJS 11 + Express 5 |
| ORM | Prisma 6 |
| 数据库 | MySQL 8 |
| 共享类型 | TypeScript，`packages/shared` |
| 内容 | `book.json` + `content.html` + cover |
| 传统部署 | Docker Compose + Nginx/OpenResty |
| Cloudflare | Workers Static Assets，仅部署前端 |
| 生产认证 | 复用 wxhappylife.top 的 Halo/旧 Study 登录 |

## 5. 仓库结构

```text
apps/
  web/                   Vite 静态前端，不使用前端框架
  api/                   NestJS API
    src/auth/            主站账号认证代理与 Guard
    src/books/           书籍查询、草稿与发布
    src/categories/      分类查询
    src/content/         文件写入、校验和内容同步核心
    src/ai/              模型配置、生成任务和 HTML 渲染
    src/prisma/          PrismaService

packages/shared/         前后端共享 DTO/类型
content/books/           长期书籍内容，必须纳入 Git
content/templates/       AI 工坊长期模板
database/
  schema.prisma          数据模型
  migrations/            数据库迁移
  seed.ts                 初始化数据
scripts/                 内容校验、索引、同步和本地静态服务
deploy/                  Dockerfile、Compose、Nginx 配置
docs/                    架构、开发、AI、Cloudflare 和交接文档
wrangler.jsonc           Cloudflare 静态资源配置
```

## 6. 核心数据流

```text
Git: content/books/{slug}/book.json + content.html + cover
                         │
                         │ pnpm sync-content / POST /api/books
                         ▼
MySQL: Book + Category 元数据索引
       GenerationTask / Revision / AiModelConfig 运行时数据
                         │
                         ▼
NestJS API: 查询索引，并从磁盘读取或写入正文
```

### 6.1 书籍目录规范

```text
content/books/{slug}/
  book.json
  content.html
  cover.svg              # 也可以是 png/jpg/webp
```

示例 `book.json`：

```json
{
  "schemaVersion": 1,
  "slug": "welcome-to-digital-study",
  "title": "欢迎来到数字书房",
  "author": "数字书房",
  "summary": "书籍简介",
  "cover": "cover.svg",
  "status": "published",
  "publishedAt": "2026-09-15T12:00:00.000Z",
  "category": {
    "slug": "guides",
    "name": "使用指南"
  }
}
```

约束：

- 文件夹名必须等于 `slug`；
- slug 只允许小写字母、数字和连字符；
- `schemaVersion` 当前为 `1`；
- `status` 只能是 `draft` 或 `published`；
- `cover` 必须是本目录内的文件名，不能越权引用其他路径；
- 正文是完整或可独立渲染的 HTML；
- `content/books/index.json` 和 `apps/web/js/generated-book-index.js` 是构建生成的派生索引。

### 6.2 内容写入原则

`ContentService` 负责内容目录写入。修改这部分时重点关注：

- 防止目录穿越；
- 同一 slug 并发写入；
- 临时目录与原子替换；
- 文件写入成功、数据库失败时内容仍可通过 `sync-content` 恢复；
- 不要在数据库事务中假设文件系统也能回滚；
- 不要把未经处理的用户 HTML直接注入管理界面。

## 7. 当前数据库模型

Prisma Schema 位于 `database/schema.prisma`。

### Category

- `slug` 唯一；
- 保存名称、描述和时间戳；
- 与 Book 一对多。

### Book

- `slug` 唯一；
- 保存标题、作者、简介、封面文件名和 `contentPath`；
- 状态为 `DRAFT` 或 `PUBLISHED`；
- 正文不保存在此表。

### GenerationTask

- 保存 AI 生成输入、进度、状态、结果、错误和最终书籍 slug；
- 状态包括 queued、generating、reviewing、completed、failed、cancelled。

### GenerationRevision

- 保存单个内容模块的重新生成记录；
- `(taskId, sectionKey, version)` 唯一。

### AiModelConfig

- 保存 OpenAI-compatible 模型配置；
- API Key 使用 AES-256-GCM 加密字段保存；
- API Key 永远不应再次返回给浏览器；
- `AI_SETTINGS_ENCRYPTION_KEY` 必须在迁移服务器时保持不变，否则旧密文无法解密。

当前 migration：

```text
20260915120000_init
20260916090000_ai_workshop
20260916110000_ai_model_configs
```

修改 Schema 后必须创建新的 migration，不允许直接修改已在生产执行的旧 migration。

## 8. 认证与权限

Digital Study 不维护另一套用户名和密码，复用现有 wxhappylife.top / Halo 用户系统：

1. 前端向 `POST /digital-study/api/auth/login` 提交账号密码；
2. NestJS 将登录请求转发给 `STUDY_AUTH_BASE_URL`；
3. 旧 Study 使用 Halo 用户的 Argon2 密码哈希完成校验；
4. 旧 Study 签发约 7 天有效的 JWT；
5. 浏览器在同域 `localStorage` 中使用兼容键 `study_token` 和 `study_user`；
6. NestJS 对受保护请求调用旧 Study `/me` 校验 JWT；
7. `StudyAdminGuard` 只允许 JWT 中角色为 `admin` 的账号执行写操作。

权限边界：

| 操作 | 权限 |
|---|---|
| 浏览已发布书籍、分类、模板 | 公开 |
| 登录状态查询 | 已登录用户 |
| 保存草稿、发布书籍 | 管理员 |
| AI 生成任务及历史 | 管理员 |
| AI 模型/API Key 配置与测试 | 管理员 |

不要恢复旧的共享 `AI_WORKSHOP_TOKEN` 方案，也不要在 Digital Study 数据库保存用户密码。

当前认证依赖旧 `/study` 服务。未来若拆分统一认证服务，应保持 JWT/用户角色兼容，或设计明确的迁移策略。

## 9. 已有 API

所有 NestJS 路由以 `/api` 为全局前缀；生产环境完整前缀为 `/digital-study/api`。

### 公开接口

```text
GET  /api/books
GET  /api/books/:slug
GET  /api/categories
GET  /api/ai/config
GET  /api/ai/templates
POST /api/auth/login
```

### 登录接口

```text
GET /api/auth/me
Authorization: Bearer <JWT>
```

### 管理员接口

```text
POST   /api/books
POST   /api/books/drafts

GET    /api/ai/models
POST   /api/ai/models
PATCH  /api/ai/models/:id
DELETE /api/ai/models/:id
POST   /api/ai/models/:id/activate
POST   /api/ai/models/:id/test

POST   /api/ai/generations
GET    /api/ai/generations
GET    /api/ai/generations/:id
POST   /api/ai/generations/:id/cancel
POST   /api/ai/generations/:id/sections/:key/regenerate
POST   /api/ai/generations/:id/save-draft
POST   /api/ai/generations/:id/publish
```

受保护接口使用：

```http
Authorization: Bearer <JWT>
```

## 10. AI 工坊

支持三种内容入口：

- AI 直接生成；
- 手动创建 HTML；
- 导入已有 HTML。

真实模型通过管理界面的“配置模型”保存，当前支持 OpenAI Chat Completions 兼容接口。默认 `AI_PROVIDER=mock` 可在没有外部 API 的情况下验证流程。

长期模板位于 `content/templates`，生成任务和未确认结果属于运行时数据。只有用户点击保存草稿或发布后，结果才应写入 `content/books/{slug}`。

AI 输出必须视为不可信输入：

- 限制请求大小和超时；
- 不允许模型决定磁盘路径；
- 渲染 HTML 时转义模型文本；
- 不向模型或日志泄露 API Key；
- 发布前保留人工审阅步骤。

## 11. 本地开发

前置条件：Node.js 22+、Corepack、pnpm 11.19.0、MySQL 8。

```powershell
Copy-Item .env.example .env
corepack enable
pnpm install
docker compose -f deploy/docker-compose.yml up -d db
pnpm prisma:generate
pnpm prisma:migrate
pnpm validate-content
pnpm sync-content
pnpm dev:api
```

另开终端：

```powershell
pnpm dev:web
```

默认地址：

```text
Web: http://localhost:5173
API: http://localhost:3000/api
```

仅检查静态前端时可以运行：

```powershell
pnpm dev:static
```

### 环境变量

真实值只能保存在 `.env` 或服务器 `.env.production`：

```text
DATABASE_URL
API_PORT
CORS_ORIGIN
CONTENT_ROOT
STUDY_AUTH_BASE_URL
AI_PROVIDER
AI_BASE_URL
AI_API_KEY
AI_MODEL
AI_MAX_CONCURRENCY
AI_TIMEOUT_MS
AI_SETTINGS_ENCRYPTION_KEY
```

禁止把生产值粘贴到 Issue、PR、日志、截图或本文档。

## 12. 必须执行的验证

普通代码修改至少执行：

```bash
pnpm build
git diff --check
```

内容相关修改额外执行：

```bash
pnpm validate-content
pnpm build-content-index
pnpm sync-content
```

Schema 相关修改额外执行：

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Migration 应先在一次性数据库验证，再应用到生产。涉及发布、认证、文件路径或 API Key 的修改必须增加对应的自动化测试或最小集成测试。

## 13. 部署现状

### 13.1 当前传统服务器

```text
URL:             https://wxhappylife.top/digital-study/
服务器仓库:      /opt/digital-study
API 容器:        digital-study-api
Web 容器:        digital-study-web
Web 本机端口:    127.0.0.1:8780
数据库:          现有 MySQL 容器中的独立 digital_study 数据库
代理:            OpenResty/Nginx 子路径 /digital-study/
```

旧版 `https://wxhappylife.top/study/` 仍在运行，并承担统一账号认证。不要覆盖或删除旧服务。

传统服务器部署配置：

```text
deploy/wxhappylife.compose.yml
deploy/api.Dockerfile
deploy/web.Dockerfile
deploy/nginx/wxhappylife-location.conf
```

部署前先备份 `.env.production` 和数据库，并确认内容目录已经提交到 GitHub。不要在不清楚生产状态时直接运行破坏性 Docker 或数据库命令。

### 13.2 Cloudflare

Cloudflare 第一阶段只部署静态前端：

```text
Build command:  pnpm build:cloudflare
Deploy command: pnpm deploy:cloudflare
Output:         apps/web/dist
```

Cloudflare 不运行 NestJS，不使用 D1，也不迁移 MySQL。后端仍部署在传统服务器。

## 14. 新服务器恢复

```bash
git clone https://github.com/godblessmezyan-art/Digital-Study.git digital-study
cd digital-study
cp .env.example .env
# 填写数据库、认证地址和加密密钥

docker compose -f deploy/docker-compose.yml up -d db
docker compose -f deploy/docker-compose.yml run --rm api pnpm prisma:migrate
docker compose -f deploy/docker-compose.yml run --rm api pnpm sync-content
docker compose -f deploy/docker-compose.yml up -d api web
```

恢复时必须同时保留原 `AI_SETTINGS_ENCRYPTION_KEY`。如果统一登录服务地址变化，需要更新 `STUDY_AUTH_BASE_URL`。

## 15. 当前已知欠账与推荐后端路线

### P0：可靠性与测试

- 为 NestJS 增加 `/api/health`，分别报告进程、数据库、内容目录和认证上游状态；
- 为认证代理增加超时、有限缓存、失败降级和集成测试；
- 为 `StudyAuthGuard`、`StudyAdminGuard` 增加 401/403/上游 502 测试；
- 为发布流程增加并发写入、数据库失败恢复和重复 slug 测试；
- 为 API 增加结构化日志和请求 ID，严禁记录密码、JWT、API Key、完整书籍正文。

### P1：书籍管理后端

- 管理员书籍列表应支持 draft/published、分类、分页和搜索；
- 增加安全的编辑接口，继续保持文件优先、数据库随后同步；
- 设计封面上传、MIME/大小校验和安全文件名；
- 如需删除书籍，先设计软删除、审计、备份和 Git 恢复流程，不要直接实现硬删除；
- 让当前“藏书管理”页面移除演示数据，完全使用真实 API。

### P2：个人阅读状态

前端中的阅读笔记、精选书摘、时间线、设置、分类与标签、导入记录仍有占位内容。开发这些功能时：

- 用户运行时数据可以进 MySQL；
- 必须关联主站登录用户，而不是新建密码系统；
- 笔记、书摘和进度不能改变书籍正文的 Git 事实来源；
- 先补共享 DTO、Prisma migration 和 API，再接前端；
- 明确数据导出和服务器迁移策略。

### P3：部署与可观测性

- 增加数据库和内容目录备份说明；
- 增加只读健康检查、容器 healthcheck 和告警；
- 评估 GitHub Actions，只允许执行构建和测试，不允许自动提交生成的书籍；
- 如果未来把 API 放到边缘环境，需要重新评估文件系统写入和 MySQL 连接，不能直接改用 D1 破坏现有部署。

## 16. 给后续 Agent 的执行清单

接手任何后端任务时按以下顺序执行：

1. 阅读 `AGENTS.md`、本文档、`docs/ARCHITECTURE.md` 和相关模块代码。
2. 执行 `git status`，确认并保护用户已有修改。
3. 明确本次修改属于长期内容、索引数据还是运行时状态。
4. 先更新共享 DTO 和数据边界，再修改 Controller/Service。
5. Schema 变更只新增 migration，不篡改历史 migration。
6. 写操作使用管理员 Guard；个人数据至少使用登录 Guard。
7. 不记录或返回密码、JWT、API Key 密文和加密密钥。
8. 对文件路径、HTML、URL、上传和模型输出做严格校验。
9. 执行本节要求的构建、内容和数据库验证。
10. 总结修改文件、验证结果、部署影响和未验证部分。

## 17. 可直接交给 Agent 的任务前缀

```text
你正在开发 Digital Study 后端。仓库：
https://github.com/godblessmezyan-art/Digital-Study

开始前请完整阅读：
- AGENTS.md
- docs/BACKEND_AGENT_HANDOFF.md
- docs/ARCHITECTURE.md
- 与任务相关的现有模块

核心约束：
1. content/books/{slug} 是书籍正文与元数据的长期事实来源；
2. MySQL 主要保存索引和运行时状态，不能成为正文唯一副本；
3. 不自动 Git commit/push；
4. 不重写现有原生前端；
5. 复用 wxhappylife.top/Halo 登录，写操作仅管理员；
6. 不提交任何密码、JWT、API Key 或 .env；
7. 修改后至少运行 pnpm build；Schema/内容修改执行对应 migration、validate-content 和 sync-content 验证。

请先检查当前 git 状态和现有实现，再给出最小改动方案并完成开发。最终报告修改文件、验证方式、兼容性和剩余风险。
```

## 18. 相关文档

- `AGENTS.md`：仓库强制规则；
- `README.md`：快速开始；
- `docs/ARCHITECTURE.md`：数据与部署边界；
- `docs/DEVELOPMENT.md`：开发流程；
- `docs/AI_WORKSHOP.md`：AI 工坊设计与安全；
- `docs/CLOUDFLARE.md`：Cloudflare 静态前端部署；
- `deploy/README.md`：传统服务器部署说明。

