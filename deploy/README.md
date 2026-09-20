# 部署基础框架

`docker-compose.yml` 提供 MySQL、NestJS API 和 Nginx 前端三项服务。它刻意不包含自动 Git 操作、证书签发、云厂商绑定和零停机发布；这些应在服务器环境确定后补充。

生产使用前至少需要：修改 `.env` 密码、设置真实 `CORS_ORIGIN`、配置 HTTPS，并在公网开放 `POST /api/books` 前增加鉴权或网络访问控制。

AI 生成接口支持单独的 `AI_WORKSHOP_TOKEN`。生产环境应设置长随机值，并通过 HTTPS 访问；Token 只保存在工坊页面的浏览器会话中。

Cloudflare 第一阶段仅用于部署静态前端，配置与 Dashboard 命令见 [`docs/CLOUDFLARE.md`](../docs/CLOUDFLARE.md)。本目录中的 NestJS、MySQL 与 Nginx 传统部署方案保持不变。

## wxhappylife.top 子路径部署

`wxhappylife.compose.yml` 用于把完整 Monorepo 部署到现有 1Panel 服务器：

- 访问路径：`https://wxhappylife.top/digital-study/`
- Web 只监听宿主机 `127.0.0.1:8780`，由现有 OpenResty 提供 HTTPS。
- API 不公开端口，由 Web 容器内部代理 `/api/`。
- API 通过外部 `1panel-network` 连接现有 MySQL，但使用独立数据库和账号。
- 旧 `/study` FastAPI 服务、Halo 数据库和现有 MySQL 容器均不替换。

服务器根目录需要创建不入 Git 的 `.env.production`，至少配置 `DATABASE_URL`、`CORS_ORIGIN`、`AI_WORKSHOP_TOKEN` 与 `AI_SETTINGS_ENCRYPTION_KEY`。OpenResty 子路径配置见 `nginx/wxhappylife-location.conf`。

```bash
docker compose -f deploy/wxhappylife.compose.yml build
docker compose -f deploy/wxhappylife.compose.yml run --rm api ./node_modules/.bin/prisma migrate deploy --schema database/schema.prisma
docker compose -f deploy/wxhappylife.compose.yml run --rm api node apps/api/dist/scripts/sync-content.js
docker compose -f deploy/wxhappylife.compose.yml up -d
```
