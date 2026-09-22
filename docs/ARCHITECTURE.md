# 架构说明

## 数据所有权

```text
AI 草稿（MySQL） -> 服务器书库（CONTENT_ROOT） -> 网站发布
                                      |
                                      +-- 明确勾选或手动操作 --> Git content 分支
```

服务器书库是网站内容事实来源，正文仍以 `book.json + content.html + cover` 文件长期保存，MySQL 负责检索元数据和运行状态。`content/books` 只作为可选的 Git 导入/导出镜像，不参与网站目录合并，也不会在部署时自动覆盖服务器。

`BookGitSync` 记录内容 Hash、Commit 和同步状态；`GitSyncJob` 执行后台提交。发布网站与同步 Git 是两个独立结果。

## 请求边界

- `GET /api/books`：返回已发布书籍的元数据列表；封面字段是 `/content/books/{slug}/{cover}` URL。
- `GET /api/books/:slug`：从数据库确认已发布状态，再从磁盘读取 `content.html`。
- `POST /api/books`：先原子写入服务器书库，再按 `syncToGit` 选择创建 Git 同步任务。
- `GET /api/admin/books`：后台书籍列表，包含草稿和 Git 同步状态。
- `DELETE /api/admin/books/:slug`：默认软删除到服务器回收站，不删除 Git。
- `POST /api/admin/books/:slug/git-sync`：手动同步指定书籍到 Git。
- `GET /api/categories`：返回数据库中的分类索引。

AI 生成结果自动保存在 MySQL，刷新页面按最后任务 ID 恢复。用户点击“保存草稿”后才写入服务器书库。

同步当前只做 upsert，不自动删除数据库中已不存在的书籍，避免误删运行时关联数据。删除策略应在有审计和备份后单独设计。

## 部署边界

Nginx 只读挂载服务器书库；API 读写同一持久化目录。Git 同步使用另一份专用 clone，并要求检出 `content` 分支，避免内容提交污染代码分支。
