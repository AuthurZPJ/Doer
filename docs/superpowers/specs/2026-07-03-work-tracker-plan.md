# Doer 实现计划

> 基于 `docs/superpowers/specs/2026-07-03-work-tracker-design.md`
> 创建日期：2026-07-03

## 阶段总览

| 阶段 | 内容 | 依赖 | 验证方式 |
|------|------|------|----------|
| 1 | 项目脚手架 | 无 | `npm run dev` 能启动前后端 |
| 2 | 数据库层 | 阶段 1 | 首次启动自动建表，WAL 模式生效 |
| 3 | 后端 API | 阶段 2 | curl 各端点返回正确数据 |
| 4 | 后端测试 | 阶段 3 | `npm test` 全部通过 |
| 5 | 前端基础设施 | 阶段 1 | 侧边栏布局 + 路由 + API 封装可用 |
| 6 | 前端页面 | 阶段 3, 5 | 7 个页面功能完整，手动验证 |
| 7 | 集成与收尾 | 阶段 4, 6 | 端到端流程跑通 |

---

## 阶段 1：项目脚手架

### 任务 1.1：根目录 workspace 初始化
- 创建根 `package.json`，配置 npm workspaces (`client/`, `server/`)
- 添加根脚本：`dev`（concurrently 启动前后端）、`build`、`test`
- 安装 `concurrently` 依赖
- 创建 `.gitignore`（忽略 `node_modules/`、`server/data/`、`dist/`）

### 任务 1.2：Server 脚手架 (Express + TypeScript)
- `server/package.json`，依赖：`express`、`better-sqlite3`、`cors`；dev 依赖：`typescript`、`tsx`、`@types/*`
- `server/tsconfig.json`
- `server/src/index.ts`：Express 应用，监听 3001，挂载 CORS 和 JSON 中间件，统一错误处理中间件
- 启动脚本：`tsx watch src/index.ts`

### 任务 1.3：Client 脚手架 (Vite + React + TypeScript)
- 用 `npm create vite@latest client -- --template react-ts` 初始化
- 安装依赖：`react-router-dom`、`axios`、`tailwindcss`、`postcss`、`autoprefixer`
- 配置 TailwindCSS（`tailwind.config.js`、`postcss.config.js`、`index.css`）
- 配置 Vite proxy：`/api` → `http://localhost:3001`
- 基础 `App.tsx`：React Router 框架，7 个路由占位页面

**验证**：`npm run dev` 同时启动前后端，浏览器访问 `localhost:5173` 看到占位页面

---

## 阶段 2：数据库层

### 任务 2.1：schema.sql 建表语句
- 6 张表：`tasks`、`todos`、`meetings`、`learnings`、`issues`、`tags`
- 字段定义严格按照 spec 第 4 节
- `todos.status` 默认 `pending`，`issues.status` 默认 `open`
- `tags.name` 加 UNIQUE 约束

### 任务 2.2：better-sqlite3 封装
- `server/src/db/index.ts`：
  - 打开 `server/data/doer.db`（目录不存在则创建）
  - 开启 WAL 模式：`PRAGMA journal_mode = WAL`
  - 启动时执行 `schema.sql` 建表（`CREATE TABLE IF NOT EXISTS`）
  - 导出 `db` 实例

**验证**：启动后端，`server/data/doer.db` 文件生成，用 `sqlite3` CLI 确认 6 张表存在

---

## 阶段 3：后端 API

### 任务 3.1：tasks 路由
- `server/src/routes/tasks.ts`
- `GET /api/tasks?date=` — 按日期查，默认今天
- `POST /api/tasks` — 新增，`completed_at` 默认今天
- `PUT /api/tasks/:id` — 编辑
- `DELETE /api/tasks/:id` — 删除

### 任务 3.2：todos 路由（含状态流转）
- `server/src/routes/todos.ts`
- `GET /api/todos?status=` — 默认查 pending
- `POST /api/todos` — 新增
- `PUT /api/todos/:id` — 编辑或标记完成
  - 当 `status` 改为 `done` 时，事务内：
    1. 更新 `todos` 记录，设 `status=done`、`done_at=now`
    2. 向 `tasks` 插入一条记录，`content` 和 `tags` 继承自原 todo，`completed_at` 取今天
- `DELETE /api/todos/:id`

### 任务 3.3：meetings 路由
- `server/src/routes/meetings.ts`
- `GET /api/meetings?date=` — 按日期查
- `POST` / `PUT` / `DELETE` 标准 CRUD

### 任务 3.4：learnings 路由
- `server/src/routes/learnings.ts`
- `GET /api/learnings` — 全部，按 `created_at` 倒序
- `POST` / `PUT` / `DELETE` 标准 CRUD

### 任务 3.5：issues 路由
- `server/src/routes/issues.ts`
- `GET /api/issues?status=` — 默认查 open
- `POST` / `PUT`（含标记 resolved 设 `resolved_at`）/ `DELETE`

### 任务 3.6：dashboard 路由
- `server/src/routes/dashboard.ts`
- `GET /api/dashboard?date=`
- 聚合查询：当天 tasks + 当天 meetings + 所有 pending todos + 最近 5 条 learnings + 所有 open issues
- 单次响应返回所有数据

### 任务 3.7：weekly-report 路由
- `server/src/routes/weekly-report.ts`
- `GET /api/weekly-report?week_start=`
- 查询 `week_start` 到 `week_start + 6` 的 tasks
- 按 `tags` 分组汇总
- 返回 `{ week_start, days: [...], summary_by_tag: {...} }`

### 任务 3.8：tags 路由 + backup 路由
- `server/src/routes/tags.ts`：`GET /api/tags` — 返回所有标签
- `server/src/routes/backup.ts`：`POST /api/backup` — 复制 db 文件到 `server/data/backups/doer_YYYYMMDD_HHmmss.db`
- 在 `index.ts` 中挂载所有路由

**验证**：用 curl 逐个测试所有端点的 CRUD + todos 完成流转

---

## 阶段 4：后端测试

### 任务 4.1：Vitest 环境搭建
- `server/` 安装 `vitest`
- `vitest.config.ts`，配置测试环境
- 测试用独立的临时数据库（内存或临时文件）

### 任务 4.2：核心测试用例
- tasks CRUD 测试
- todos CRUD 测试 + **完成流转测试**（验证 done 后 tasks 表多了一条记录）
- meetings / learnings / issues CRUD 测试
- dashboard 聚合数据测试
- weekly-report 汇总测试

**验证**：`npm test` 全部通过

---

## 阶段 5：前端基础设施

### 任务 5.1：布局与侧边栏
- `client/src/components/Layout.tsx`：左侧固定侧边栏 + 右侧 `<Outlet />`
- 侧边栏导航项：今日看板、今日完成、未做工作、会议记录、学习知识点、当前问题、周报
- 侧边栏底部：数据备份按钮
- `client/src/App.tsx`：配置路由，Layout 为父路由，7 个页面为子路由

### 任务 5.2：API 客户端封装
- `client/src/api/index.ts`：axios 实例，baseURL `/api`
- 按模块封装 API 调用函数：`tasksApi`、`todosApi`、`meetingsApi`、`learningsApi`、`issuesApi`、`dashboardApi`、`weeklyReportApi`、`tagsApi`、`backupApi`

### 任务 5.3：共享组件
- `TagInput.tsx`：标签输入组件，支持自动补全（从 `/api/tags` 获取）
- `Toast.tsx`：轻量 Toast 提示（成功/错误）
- `EmptyState.tsx`：空状态展示 + 重试按钮
- `ConfirmButton.tsx`：带确认的删除按钮

**验证**：浏览器看到侧边栏导航可切换，路由正常工作

---

## 阶段 6：前端页面

### 任务 6.1：今日看板页（`/`）
- 顶部：日期显示 + 快速录入框（输入内容 + 选类别 + 回车提交）
- 5 栏卡片横向排列：今日完成 / 未做工作 / 今日会议 / 学习知识点 / 当前问题
- 每栏显示条目摘要，底部"查看全部"链接到对应独立页
- 未做工作栏按优先级排序，high 标红，快到期标黄

### 任务 6.2：今日完成页（`/tasks`）
- 日期选择器（默认今天）
- 录入表单：内容 + 标签（TagInput）
- 列表：按时间倒序，行内编辑、删除

### 任务 6.3：未做工作页（`/todos`）
- 录入表单：内容 + 优先级 + 截止日期 + 标签
- 列表：按优先级 → 截止日期排序
- 完成按钮：点击后从列表移除，Toast 提示"已转入今日完成"

### 任务 6.4：会议记录页（`/meetings`）
- 左右布局：左侧日期列表，右侧选中会议详情
- 新建/编辑：标题 + 内容（textarea）+ 标签 + 日期

### 任务 6.5：学习知识点页（`/learnings`）
- 列表：标题列表，点击展开内容
- 新建/编辑：标题 + 内容 + 标签

### 任务 6.6：当前问题页（`/issues`）
- 两组：未解决（默认展示）/ 已解决（折叠）
- 新建：内容 + 标签
- 标记解决按钮

### 任务 6.7：周报页（`/weekly-report`）
- 周选择器（默认本周）
- 按天列出每日完成项
- 底部按标签分组的汇总
- 导出按钮：复制为 Markdown 纯文本

**验证**：逐页手动验证 CRUD 交互、数据流转、空状态

---

## 阶段 7：集成与收尾

### 任务 7.1：端到端验证
- 完整流程测试：
  1. 新增一条未做工作 → 标记完成 → 确认出现在今日完成
  2. 在看板页确认数据同步
  3. 查看周报确认汇总正确
  4. 点击备份按钮确认文件生成

### 任务 7.2：错误处理与边界
- 前端：API 失败 Toast 提示 + 空状态重试
- 后端：确认错误中间件捕获所有异常
- 空数据库首次启动正常渲染空状态

### 任务 7.3：README
- 简短 README：项目介绍、启动方式（`npm install && npm run dev`）、技术栈

**验证**：从零 clone 仓库，`npm install && npm run dev`，完整使用一遍所有功能
