# 开发指南

## 常用命令

```text
pnpm dev:web          启动原有前端
pnpm dev:api          启动 NestJS API
pnpm build            构建 shared、web、api
pnpm validate-content 无数据库校验书籍目录格式和必需文件
pnpm prisma:generate  生成 Prisma Client
pnpm prisma:migrate   部署已提交的 migration
pnpm sync-content     扫描并 upsert content/books
```

修改 Prisma schema 时，在开发数据库执行 `pnpm prisma:migrate:dev --name <name>`，检查生成 SQL 后再提交。生产环境只运行 `prisma migrate deploy`。

## 内容发布

可以直接创建 `content/books/{slug}` 后运行同步，也可向 `POST /api/books` 发送 JSON：

```json
{
  "slug": "my-book",
  "title": "我的书",
  "author": "作者",
  "summary": "简介",
  "categorySlug": "literature",
  "categoryName": "文学",
  "contentHtml": "<article><h1>我的书</h1><p>正文</p></article>"
}
```

接口会生成默认 `cover.svg`。需要正式封面时，替换同目录文件并保持 `book.json.cover` 与文件名一致。同步器会拒绝目录 slug 不一致、封面缺失或日期无效的内容。
