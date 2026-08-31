# AGENTS.md — 多 Agent 共享项目规则

> 所有接手的 Agent 开工前必读。本文档与 `docs/requirements.md`（硬性边界）、`docs/architecture.md`（结构）配合使用。

## 0. 30 秒速览

- **项目**：数字书房（个人网站），前端静态原型已上线 `https://wxhappylife.top/test/`，后端为 Express 骨架待开发。
- **结构**：`frontend/`（Vite + 原生 ES Modules，无框架） + `backend/`（Node.js + Express） + `docs/`。
- **入口**：`frontend/index.html` → `frontend/src/main.js`；后端 `backend/src/index.js`。
- **发布**：根目录 `.\deploy.ps1`（git 提交推送 → 前端构建 → 上传线上 → 验证 200）。

## 1. 产品铁律（违反 = 返工）

1. 这是**一间书房**，不是 SaaS Dashboard、不是图书管理后台。判据："去掉所有文字和按钮，页面是否仍像一间完整的书房？" 必须为"是"。
2. **不加功能/组件/动画/高饱和颜色**，除非用户明确要求。
3. **主题变量纪律**：组件样式只允许用 `frontend/src/css/variables.css` 的语义变量（`--bg`/`--card`/`--text`/`--primary-*`/`--room-*`/`--shadow-*`/`--radius-*`…），写死颜色 = 破坏未来主题。
4. **保留范式**：四份 CSS + `theme.js` + "一个区块一个组件文件"的结构不推翻。改内容可以，换范式不行。
5. **后端纪律**：配置走 `backend/config/index.js` + 环境变量，不硬编码；路由/服务/模型分层，不放裸逻辑进 `src/index.js`。

## 2. 通用流程（任何改动都走这五步）

1. 先读 `docs/requirements.md` 与 `docs/progress.md`，确认本轮范围（用户常划定期望："这一轮只做 X，不要 Y"）。
2. 改 → 起服务自检：
   - 前端：`cd frontend; npm run dev`（http://localhost:5173），Console 无报错。
   - 后端：`cd backend; npm run dev`（http://localhost:3000/api/health）。
3. 截图对照目标（Edge headless 管线见 `docs/handoff.md` 第 8.2 节），**必须真的看图**，不凭代码推断。
4. 至少迭代一轮再汇报。
5. 汇报格式：改了什么 / 为什么 / 哪里仍需优化（坦率指出剩余问题，用户欣赏）。

## 3. 命令速查

```powershell
# 前端
cd frontend
npm install        # 首次
npm run dev        # 本地开发 http://localhost:5173
npm run build      # 生产构建 -> frontend/dist/（base=/test/）

# 后端
cd backend
npm install
npm run dev        # watch 模式 http://localhost:3000

# 发布（根目录执行）
.\deploy.ps1
```

## 4. 分支与版本约定

- `main` = 线上发布版本；`feature/*`、`refactor/*` 开发分支，验收后再并入。
- 用户历史操作：备份用 git tag（如 `v2-final-archive`），切换分支用 `git switch -C <branch> <commit>` 或 `git checkout <commit>`。
- 提交信息风格：`phase1: 描述` / `docs: 描述` / `publish: 描述` / `chore: 描述`。

## 5. 环境注意

- Shell 是 **PowerShell 5.1**：不支持 `&&`，用 `;`。
- git log 会进分页器，按 `q` 退出或用 `git --no-pager log`。
- 本地 Node v22、npm 10（满足 Vite 7）。
- 部署服务器：OpenResty 静态根 `/opt/1panel/apps/openresty/openresty/root/test`，SSH root@wxhappylife.top（免密）。
