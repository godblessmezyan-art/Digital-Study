# AI 工坊

## 工作流

AI 工坊以用户提供的资料为主要事实来源。模型返回结构化 JSON，NestJS 使用固定模板转成不包含脚本的 HTML。完成结果在用户确认前属于临时任务数据；保存草稿或发布后才进入 `content/books/{slug}`。

```text
模板 + 书籍信息 + 参考资料
  → GenerationTask
  → AI Provider 返回 JSON
  → 服务端校验 sections
  → 服务端转义文本并渲染 HTML
  → 审阅 / 逐段重生成
  → 保存草稿 / 发布 / sync Book 索引
```

## 手动创建与 HTML 导入

手动编辑或导入 HTML 后有两种持久化方式：

- 后端可用时，“保存草稿”或“发布”通过 API 原子写入 `content/books/{slug}`，再更新数据库索引。
- 后端或 MySQL 暂不可用时，点击“写入 Git 内容目录”，并在浏览器目录选择器中选择当前仓库的 `content/books`。浏览器会直接创建 `{slug}/book.json`、`content.html` 和封面文件。

直接写目录需要支持 File System Access API 的最新版 Chrome 或 Edge。该操作只修改本地 Git 工作区，不会自动 commit 或 push；保存后应使用 `git status` 检查，再由维护者提交到 GitHub。

## Provider 配置

推荐在 AI 工坊页面点击“配置模型”，保存 OpenAI Chat Completions 兼容服务。支持保存多个模型、切换当前模型、完整请求 URL、自定义显示名称和连接测试。数据库没有当前模型时，才使用下方环境变量配置作为回退。

页面保存 API Key 前，服务端必须配置稳定的加密主密钥：

```env
AI_SETTINGS_ENCRYPTION_KEY=至少32位的随机字符串
```

API Key 使用 AES-256-GCM 加密后写入 MySQL。主密钥只存在服务器 `.env` 中；迁移服务器时必须一并安全迁移，否则旧密钥无法解密。浏览器只能看到 `hasApiKey`，不能读取 API Key 或数据库中的密文。

离线验证：

```env
AI_PROVIDER=mock
```

OpenAI-compatible 服务：

```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=replace-me
AI_MODEL=replace-me
AI_MAX_CONCURRENCY=1
AI_TIMEOUT_MS=120000
AI_WORKSHOP_TOKEN=replace-with-a-long-random-token
```

Provider 使用 `POST {AI_BASE_URL}/chat/completions` 和 JSON object 输出。若目标服务不支持 `response_format: {"type":"json_object"}`，需要在 provider 适配层中针对该服务调整，不能把兼容差异放进前端。

## API

- `GET /api/ai/config`：公开返回是否配置、Provider 和模型名称，不返回密钥。
- `GET /api/ai/templates`：公开返回 Git 模板的前端字段，不返回系统 Prompt。
- `GET /api/ai/models`：列出安全的模型元数据，不返回密钥或密文。
- `POST /api/ai/models`：加密保存模型配置。
- `PATCH /api/ai/models/:id`：修改模型配置；不传 API Key 时保留原值。
- `POST /api/ai/models/:id/activate`：切换当前模型。
- `POST /api/ai/models/:id/test`：发送一次最小真实请求测试连接，可能产生少量费用。
- `DELETE /api/ai/models/:id`：删除模型配置。
- `POST /api/ai/generations`：创建任务。
- `GET /api/ai/generations`：最近 20 条任务。
- `GET /api/ai/generations/:id`：任务进度和结果。
- `POST /api/ai/generations/:id/cancel`：取消活动任务。
- `POST /api/ai/generations/:id/sections/:key/regenerate`：重新生成单个模块并记录修订。
- `POST /api/ai/generations/:id/save-draft`：原子写入草稿内容目录并同步索引。
- `POST /api/ai/generations/:id/publish`：确保草稿已落盘，将状态改为 published 并同步索引。
- `POST /api/books/drafts`：将手动创建或导入的 HTML 保存为长期草稿内容。
- `POST /api/books`：写入或更新长期内容，并将书籍标记为 published。

除 config 和 templates 外，设置 `AI_WORKSHOP_TOKEN` 后，以上端点要求 `x-ai-workshop-token` 请求头。

## 安全边界

- API Key 在提交后不再发送到浏览器，数据库仅保存 AES-256-GCM 密文。
- 模型管理和测试接口受 `AI_WORKSHOP_TOKEN` 保护；公网部署必须设置该 Token。
- 模型内容按纯文本处理，HTML 特殊字符会转义。
- 输入限制为 100,000 字符，请求体限制为 2 MB。
- 模板明确要求不编造引用；仍需人工审阅，不能把模型结果当作事实证明。
- 当前没有用户系统，普通 `POST /api/books` 仍应通过 Nginx 或防火墙限制访问。
