# 架构说明

## 数据所有权

```text
Git: content/books/{slug}/book.json + content.html + cover
                         |
                         | pnpm sync-content / POST /api/books
                         v
MySQL: Category + Book 元数据索引（不保存正文）
                         |
                         v
NestJS API: 查询索引，并从 content/books 读取正文
```

Git 中的内容文件是长期事实来源。数据库可以丢弃并由 migration、seed 和 `sync-content` 重建。阅读进度、用户状态等未来运行时数据可以进入数据库，但不应替代正文源文件。

## 请求边界

- `GET /api/books`：返回已发布书籍的元数据列表；封面字段是 `/content/books/{slug}/{cover}` URL。
- `GET /api/books/:slug`：从数据库确认已发布状态，再从磁盘读取 `content.html`。
- `POST /api/books`：先原子创建书籍目录、JSON、HTML 和默认 SVG 封面，再 upsert 数据库。若数据库暂时不可用，内容文件仍是可恢复状态。
- `GET /api/categories`：返回数据库中的分类索引。

同步当前只做 upsert，不自动删除数据库中已不存在的书籍，避免误删运行时关联数据。删除策略应在有审计和备份后单独设计。

## 部署边界

Nginx 提供前端静态文件、代理 `/api`，并以只读方式提供 `/content/books` 下的封面。API 容器以读写方式挂载内容目录，因为发布接口需要创建本地内容；将发布后的内容纳入 Git 仍由人工审阅和提交，系统不会自动 push。
