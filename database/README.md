# 数据库目录

- `schema.prisma`：当前逻辑模型。
- `migrations/`：可重复部署的 MySQL 迁移历史。
- `seed.ts`：仅创建不依赖书籍正文的基础运行数据。

书籍正文不属于数据库 migration 或 seed。执行 migration 后，再运行根目录的 `pnpm sync-content` 从 `content/books` 重建书籍索引。
