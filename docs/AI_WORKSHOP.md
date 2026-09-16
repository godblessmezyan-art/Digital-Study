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

## Provider 配置

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
- `POST /api/ai/generations`：创建任务。
- `GET /api/ai/generations`：最近 20 条任务。
- `GET /api/ai/generations/:id`：任务进度和结果。
- `POST /api/ai/generations/:id/cancel`：取消活动任务。
- `POST /api/ai/generations/:id/sections/:key/regenerate`：重新生成单个模块并记录修订。
- `POST /api/ai/generations/:id/save-draft`：原子写入草稿内容目录并同步索引。
- `POST /api/ai/generations/:id/publish`：确保草稿已落盘，将状态改为 published 并同步索引。

除 config 和 templates 外，设置 `AI_WORKSHOP_TOKEN` 后，以上端点要求 `x-ai-workshop-token` 请求头。

## 安全边界

- API Key 永远不发送到浏览器。
- 模型内容按纯文本处理，HTML 特殊字符会转义。
- 输入限制为 100,000 字符，请求体限制为 2 MB。
- 模板明确要求不编造引用；仍需人工审阅，不能把模型结果当作事实证明。
- 当前没有用户系统，普通 `POST /api/books` 仍应通过 Nginx 或防火墙限制访问。
