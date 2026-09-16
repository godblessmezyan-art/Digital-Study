# 部署基础框架

`docker-compose.yml` 提供 MySQL、NestJS API 和 Nginx 前端三项服务。它刻意不包含自动 Git 操作、证书签发、云厂商绑定和零停机发布；这些应在服务器环境确定后补充。

生产使用前至少需要：修改 `.env` 密码、设置真实 `CORS_ORIGIN`、配置 HTTPS，并在公网开放 `POST /api/books` 前增加鉴权或网络访问控制。

AI 生成接口支持单独的 `AI_WORKSHOP_TOKEN`。生产环境应设置长随机值，并通过 HTTPS 访问；Token 只保存在工坊页面的浏览器会话中。
