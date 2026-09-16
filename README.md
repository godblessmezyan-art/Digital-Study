# 数字书房 Monorepo

代码、长期书籍内容、数据库迁移和部署配置统一保存在这个仓库。书籍正文以 `content/books` 为准，MySQL 只承担索引和运行时状态，因此更换服务器时不需要从数据库反向导出正文。

## 目录

```text
apps/web        原有静态前端（Vite 仅负责开发服务和构建）
apps/api        NestJS + Prisma API
content/books   可纳入 Git 的书籍元数据、HTML 正文和封面
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
pnpm validate-content
pnpm sync-content
pnpm dev:api
```

另开终端运行 `pnpm dev:web`。前端默认是 `http://localhost:5173`，API 默认是 `http://localhost:3000/api`。

`.env.example` 默认启用 `AI_PROVIDER=mock`，无需外部服务即可验证 AI 工坊完整流程。真实模型可在 AI 工坊的“配置模型”中添加；服务端需设置稳定的 `AI_SETTINGS_ENCRYPTION_KEY` 来加密保存 API Key。环境变量 `AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL` 仍可作为回退。公网环境必须设置 `AI_WORKSHOP_TOKEN`。

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

访问 `http://服务器地址:${WEB_PORT:-8080}`。发布接口当前没有用户鉴权，不应直接暴露给不可信网络；用户系统不在本阶段范围内。

更多说明见 [架构文档](docs/ARCHITECTURE.md)、[AI 工坊](docs/AI_WORKSHOP.md) 和 [开发指南](docs/DEVELOPMENT.md)。
