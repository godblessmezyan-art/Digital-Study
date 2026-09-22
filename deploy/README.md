# 部署基础框架

`docker-compose.yml` 提供 MySQL、NestJS API 和 Nginx 前端三项服务。服务器书库位于 `runtime-data/books`，与代码仓库的 `content/books` 分离。

生产使用前至少需要：修改 `.env` 密码、设置真实 `CORS_ORIGIN`、配置 HTTPS，并确认 `STUDY_AUTH_BASE_URL` 指向可用的主站认证服务。

AI 工坊复用现有 `wxhappylife.top/study` 账号认证。浏览器保存旧 Study 签发的 JWT，后端通过 `STUDY_AUTH_BASE_URL` 校验登录态；写入书籍、生成内容与模型配置只允许管理员角色。

Cloudflare 第一阶段仅用于部署静态前端，配置与 Dashboard 命令见 [`docs/CLOUDFLARE.md`](../docs/CLOUDFLARE.md)。本目录中的 NestJS、MySQL 与 Nginx 传统部署方案保持不变。

## wxhappylife.top 子路径部署

`wxhappylife.compose.yml` 用于把完整 Monorepo 部署到现有 1Panel 服务器：

- 访问路径：`https://wxhappylife.top/digital-study/`
- Web 只监听宿主机 `127.0.0.1:8780`，由现有 OpenResty 提供 HTTPS。
- API 不公开端口，由 Web 容器内部代理 `/api/`。
- API 通过外部 `1panel-network` 连接现有 MySQL，但使用独立数据库和账号。
- 旧 `/study` FastAPI 服务、Halo 数据库和现有 MySQL 容器均不替换。

服务器根目录需要创建不入 Git 的 `.env.production`，至少配置 `DATABASE_URL`、`CORS_ORIGIN`、`STUDY_AUTH_BASE_URL` 与 `AI_SETTINGS_ENCRYPTION_KEY`。OpenResty 子路径配置见 `nginx/wxhappylife-location.conf`。

```bash
docker compose -f deploy/wxhappylife.compose.yml build
docker compose -f deploy/wxhappylife.compose.yml run --rm api ./node_modules/.bin/prisma migrate deploy --schema database/schema.prisma
pnpm migrate-content-storage
docker compose -f deploy/wxhappylife.compose.yml run --rm api node apps/api/dist/scripts/sync-content.js
docker compose -f deploy/wxhappylife.compose.yml up -d
```

首次切换前先备份数据库与 `content/books`，再运行迁移脚本。脚本只复制缺失目录，不覆盖 `runtime-data/books` 中已有书籍。Git 同步需要在 `git-mirror` 中准备一份检出 `content` 分支的专用 clone，并为容器配置可推送凭据；未配置时网站发布仍正常，只会拒绝 Git 同步任务。
