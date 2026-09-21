# 书籍内容约定

每本书使用稳定的英文 `slug` 作为目录名：

```text
content/books/{slug}/
├── book.json
├── content.html
└── cover.svg|cover.webp|cover.jpg|cover.png
```

`book.json` 是可版本管理的元数据源，当前格式版本为 `1`：

```json
{
  "schemaVersion": 1,
  "slug": "example-book",
  "title": "示例书籍",
  "author": "作者",
  "summary": "简介",
  "cover": "cover.svg",
  "status": "published",
  "publishedAt": "2026-09-15T12:00:00.000Z",
  "category": {
    "slug": "literature",
    "name": "文学"
  }
}
```

规则：

- 目录名必须与 `book.json.slug` 一致，只能使用小写字母、数字和连字符。
- 正文只放在 `content.html`，数据库不保存正文副本。
- `cover` 必须是同一书籍目录内真实存在的文件名。
- `status` 只能是 `draft` 或 `published`；公开 API 只返回 `published`。
- 修改内容后执行根目录的 `pnpm sync-content`，将索引字段 upsert 到数据库。
- 以下划线或点开头的目录会被同步器忽略，可用于本地草稿或模板。

## 从旧 Study 导入

旧 `wxhappylife.top/study` 的书籍可以在同一台服务器上一次性导入：

```bash
pnpm import:legacy-study -- --dry-run
pnpm import:legacy-study
pnpm build-content-index
pnpm sync-content
```

脚本从旧服务 API 读取书籍和分类元数据，从 `/opt/study-api/books_html` 复制原始 HTML，写入稳定目录 `content/books/legacy-study-{id}`。默认不会覆盖已导入书籍；只有明确传入 `--overwrite` 才会覆盖对应目录。
