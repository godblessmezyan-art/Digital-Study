# Cloudflare 前端部署

第一阶段只把 `apps/web` 部署到 Cloudflare Workers Static Assets。NestJS API、Prisma 和 MySQL 不参与 Cloudflare 构建，也不改变原有 Docker/传统云服务器部署方式。

## 部署边界

- Cloudflare 静态目录：`apps/web/dist`
- Cloudflare 构建内容：`packages/shared`、`apps/web`
- 不构建或部署：`apps/api`
- 不使用 D1，不迁移 MySQL，不创建 Worker API 入口
- `content/books` 仍由现有 Web 构建复制到静态输出目录

## 本地命令

```bash
pnpm install
pnpm build:cloudflare
pnpm deploy:cloudflare
```

`build:cloudflare` 只构建 shared 和 Web。`deploy:cloudflare` 使用根目录的 `wrangler.jsonc` 上传 `apps/web/dist`。

原有全量构建仍然使用：

```bash
pnpm build
```

它会继续构建 shared、Web 和 NestJS API，传统服务器部署配置位于 `deploy/`。

## Cloudflare Dashboard

在 Workers Builds 连接 GitHub 仓库时，将 Root directory 保持为仓库根目录，然后填写：

```text
Build command:  pnpm build:cloudflare
Deploy command: pnpm deploy:cloudflare
```

Cloudflare 会根据根目录 `package.json` 中的 `packageManager` 使用 pnpm。首次创建 Worker 后，可以在 Dashboard 中为 `digital-study-web` 配置 `workers.dev` 域名或自定义域名。

当前阶段线上 `/api/*` 不由 Cloudflare 托管。需要后端能力时，前端仍应访问单独部署的 NestJS API；不要在此 Worker 中配置数据库连接信息。
