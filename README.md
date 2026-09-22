# 数字书房 Monorepo

代码与网站运行书库已经分离。书籍正文以服务器 `CONTENT_ROOT` 为准，MySQL 承担索引和运行状态；`content/books` 是可选 Git 镜像。

## 目录

```text
apps/web        原有静态前端（Vite 仅负责开发服务和构建）
apps/api        NestJS + Prisma API
runtime-data/books  本地运行书库（不入 Git）
content/books   可选 Git 镜像和首次迁移来源
content/templates AI 工坊长期模板
packages/shared 前后端共享 TypeScript 类型
database        Prisma schema、migration、seed
scripts         内容同步等运维入口
deploy          Docker Compose、Dockerfile、Nginx
docs            架构和开发说明
```

## 本地开发

需要 Node.js 22+、Corepack/pnpm 和 MySQL 8。

```powershell
Copy-Item .env.example .env
corepack enable
pnpm install
docker compose -f deploy/docker-compose.yml up -d db
pnpm prisma:generate
pnpm prisma:migrate
pnpm migrate-content-storage
pnpm validate-content
pnpm sync-content
pnpm dev:api
```

另开终端运行 `pnpm dev:web`。前端默认是 `http://localhost:5173`，API 默认是 `http://localhost:3000/api`。

如果暂时没有安装前端依赖或不启动后端，可运行 `pnpm dev:static`。它在 `http://localhost:5175` 同时提供 `apps/web` 和 `content/books`，并在后端恢复后把 `/api` 代理到 3000 端口。

`.env.example` 默认启用 `AI_PROVIDER=mock`，无需外部服务即可验证 AI 工坊完整流程。真实模型可在 AI 工坊的“配置模型”中添加；服务端需设置稳定的 `AI_SETTINGS_ENCRYPTION_KEY` 来加密保存 API Key。环境变量 `AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL` 仍可作为回退。写入书籍、生成内容和模型管理统一复用 `wxhappylife.top` 的 Halo/Study 登录，且只允许管理员账号。

AI 工坊的“导出到本地 Git 目录”是离线备用能力；正常保存和发布写入服务器书库。勾选“发布后同步到 Git”时才创建 Git 同步任务。

网站目录只读取服务器 API，不再合并 Git 静态索引，因此服务器删除的书籍不会从 Git 自动恢复。

## 新服务器恢复

```bash
git clone <repository-url> digital-study
cd digital-study
cp .env.example .env
# 修改 .env 中的密码和域名
docker compose -f deploy/docker-compose.yml up -d db
docker compose -f deploy/docker-compose.yml run --rm api pnpm prisma:migrate
docker compose -f deploy/docker-compose.yml run --rm api pnpm sync-content
docker compose -f deploy/docker-compose.yml up -d api web
```

访问 `http://服务器地址:${WEB_PORT:-8080}`。发布、AI 生成和模型配置接口复用 `wxhappylife.top` 的 Halo/Study 登录，并且只允许管理员角色执行写操作。

更多说明见 [架构文档](docs/ARCHITECTURE.md)、[AI 工坊](docs/AI_WORKSHOP.md)、[开发指南](docs/DEVELOPMENT.md) 和 [后端 Agent 交接文档](docs/BACKEND_AGENT_HANDOFF.md)。
