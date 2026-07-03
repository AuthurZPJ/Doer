# Doer 设计文档

> 日期：2026-07-03
> 状态：已确认

## 1. 概述

**Doer** — 一个本地运行的 Web 应用，帮助职场人员记录和管理工作内容。核心功能包括：记录今日完成、未做工作、会议记录、学习知识点、当前问题，并自动汇总生成周报。

**使用场景**：纯本地单机使用，localhost 访问，个人工作日志管理。

**设计理念**：快速记录、分类管理、自动汇总。录入路径要短，结构要清晰。

## 2. 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端 | React + Vite + TypeScript | SPA，React Router 路由 |
| 样式 | TailwindCSS | 原子化 CSS，快速开发 |
| 后端 | Express + TypeScript | RESTful API |
| 数据库 | SQLite (better-sqlite3) | 单文件，同步 API，无需额外服务 |
| 启动 | npm workspace | 根目录 `npm run dev` 一键启动前后端 |

- 前端端口 5173，后端端口 3001
- Vite 配置 proxy 转发 `/api` 请求到后端
- SQLite 文件位置：`server/data/mytool.db`，首次启动自动建表

## 3. 页面结构

方案 A+B 结合：首页是"今日看板"一屏展示所有类别，侧边栏可进入各模块的独立管理页。

```
侧边栏（固定）
├── 今日看板（首页）    ← 一屏展示今天所有类别
├── 今日完成            ← 独立列表页，可看历史
├── 未做工作            ← 独立列表页，含状态流转
├── 会议记录            ← 独立列表页，含详情
├── 学习知识点          ← 独立列表页
├── 当前问题            ← 独立列表页
├── 周报                ← 自动汇总本周每日完成
└── 数据备份            ← 手动备份按钮（侧边栏底部）
```

## 4. 数据模型

SQLite 共 6 张表。

### 4.1 `tasks`（今日完成）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content | TEXT | 完成内容 |
| tags | TEXT | 逗号分隔的标签字符串 |
| completed_at | TEXT | 完成日期 (YYYY-MM-DD) |
| created_at | TEXT | 创建时间 (ISO 8601) |

### 4.2 `todos`（未做工作）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content | TEXT | 工作内容 |
| priority | TEXT | 优先级: low / medium / high |
| due_date | TEXT | 截止日期 (YYYY-MM-DD)，可空 |
| tags | TEXT | 逗号分隔的标签字符串 |
| status | TEXT | 状态: pending / done |
| done_at | TEXT | 完成时间 (ISO 8601)，可空 |
| created_at | TEXT | 创建时间 (ISO 8601) |

**流转逻辑**：`status` 从 `pending` 改为 `done` 时，后端在事务中同时向 `tasks` 表插入一条记录，`completed_at` 取当天日期，`content` 和 `tags` 继承自原 todo。

### 4.3 `meetings`（会议记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| title | TEXT | 会议标题 |
| content | TEXT | 会议内容（纯文本） |
| tags | TEXT | 逗号分隔的标签字符串 |
| meeting_date | TEXT | 会议日期 (YYYY-MM-DD) |
| created_at | TEXT | 创建时间 (ISO 8601) |

### 4.4 `learnings`（学习知识点）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| title | TEXT | 标题 |
| content | TEXT | 内容（纯文本） |
| tags | TEXT | 逗号分隔的标签字符串 |
| created_at | TEXT | 创建时间 (ISO 8601) |

### 4.5 `issues`（当前问题）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content | TEXT | 问题描述 |
| tags | TEXT | 逗号分隔的标签字符串 |
| status | TEXT | 状态: open / resolved |
| resolved_at | TEXT | 解决时间 (ISO 8601)，可空 |
| created_at | TEXT | 创建时间 (ISO 8601) |

### 4.6 `tags`（标签字典）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT UNIQUE | 标签名 |
| color | TEXT | 颜色（可空） |

**标签存储策略**：各记录表用逗号分隔字符串存储标签，`tags` 表仅用于输入时自动补全和颜色管理，不做多对多关联表。

## 5. API 设计

### 5.1 今日看板

```
GET /api/dashboard?date=YYYY-MM-DD
```
返回看板所需的所有数据，一次请求填充：
- 当天完成的 tasks（按 completed_at 过滤）
- 当天的 meetings（按 meeting_date 过滤）
- 所有 pending 的 todos（非日期相关）
- 最近 5 条 learnings（按 created_at 倒序）
- 所有 open 的 issues（非日期相关）

### 5.2 今日完成

```
GET    /api/tasks?date=YYYY-MM-DD     # 按日期查，默认今天
POST   /api/tasks                      # 新增 { content, tags }
PUT    /api/tasks/:id                  # 编辑
DELETE /api/tasks/:id                  # 删除
```

### 5.3 未做工作

```
GET    /api/todos?status=pending       # 默认查待办
POST   /api/todos                      # 新增 { content, priority, due_date, tags }
PUT    /api/todos/:id                  # 编辑或标记完成 { status, ... }
DELETE /api/todos/:id                  # 删除
```

`PUT` 设 `status=done` 时，后端事务自动写入 `tasks` 表。

### 5.4 会议记录

```
GET    /api/meetings?date=YYYY-MM-DD
POST   /api/meetings                   # { title, content, tags, meeting_date }
PUT    /api/meetings/:id
DELETE /api/meetings/:id
```

### 5.5 学习知识点

```
GET    /api/learnings
POST   /api/learnings                  # { title, content, tags }
PUT    /api/learnings/:id
DELETE /api/learnings/:id
```

### 5.6 当前问题

```
GET    /api/issues?status=open         # 默认查未解决
POST   /api/issues                     # { content, tags }
PUT    /api/issues/:id                 # 编辑或标记解决
DELETE /api/issues/:id
```

### 5.7 周报

```
GET /api/weekly-report?week_start=YYYY-MM-DD
```
返回本周每日完成数据，按 `tags` 分组汇总：

```json
{
  "week_start": "2026-06-29",
  "days": [
    { "date": "2026-06-29", "tasks": [...] }
  ],
  "summary_by_tag": {
    "前端": ["xxx", "yyy"],
    "沟通": ["zzz"]
  }
}
```

### 5.8 标签

```
GET /api/tags                          # 用于输入时自动补全
```

### 5.9 数据备份

```
POST /api/backup
```
复制 `mytool.db` 到 `server/data/backups/mytool_YYYYMMDD_HHmmss.db`，返回文件路径。

## 6. 前端页面与交互

整体布局：左侧固定侧边栏 + 右侧主内容区，React Router 做页面切换。

### 6.1 今日看板（首页 `/`）

- 顶部：日期显示 + 快速录入框（输入内容，选类别，回车提交）
- 下方 5 栏卡片，横向排列：
  - 今日完成：条目列表
  - 未做工作：按优先级排序，高优先级标红，快到期标黄
  - 今日会议：标题列表，点击展开内容
  - 学习知识点：标题列表，点击展开
  - 当前问题：未解决项列表
- 每栏显示对应数据，底部"查看全部"进入独立页（未做工作、学习、问题栏显示全部待办/最近/未解决项，非仅当天）

### 6.2 今日完成页（`/tasks`）

- 日期选择器（默认今天）
- 录入表单：内容、标签（自动补全）
- 列表：按时间倒序，支持行内编辑、删除

### 6.3 未做工作页（`/todos`）

- 录入表单：内容、优先级、截止日期、标签
- 列表：按优先级 → 截止日期排序，支持行内编辑、删除
- 完成按钮：点击后该条变为"已完成"状态，从列表移除（或折叠到"已完成"分组），后端自动写入今日完成

### 6.4 会议记录页（`/meetings`）

- 列表 + 详情：左侧日期列表，右侧选中会议的内容
- 录入：标题、内容（多行文本）、标签、日期

### 6.5 学习知识点页（`/learnings`）

- 列表：标题列表，点击展开内容
- 录入：标题、内容、标签

### 6.6 当前问题页（`/issues`）

- 分两组：未解决（默认展示）/ 已解决（折叠）
- 录入：内容、标签
- 标记解决按钮

### 6.7 周报页（`/weekly-report`）

- 周选择器（默认本周）
- 按天列出每日完成项，底部按标签分组的汇总
- 导出按钮：复制为纯文本 / Markdown，方便贴周报邮件

## 7. 项目结构

```
mytool/
├── client/                    # React 前端
│   ├── src/
│   │   ├── pages/             # 7 个页面组件
│   │   ├── components/        # 共享组件（TagInput、DatePicker 等）
│   │   ├── api/               # axios 封装
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── server/                    # Express 后端
│   ├── src/
│   │   ├── routes/            # API 路由模块
│   │   ├── db/
│   │   │   ├── schema.sql     # 建表语句
│   │   │   └── index.ts       # better-sqlite3 封装
│   │   └── index.ts
│   ├── data/                  # SQLite 数据文件（gitignore）
│   │   ├── mytool.db
│   │   └── backups/
│   └── package.json
└── package.json               # 根 workspace，一键启动前后端
```

## 8. 测试与错误处理

### 测试

- 后端：用 Vitest 对每个 API 路由做基本测试（增删改查 + 未做工作完成时自动写入 tasks 的事务）
- 前端：暂不做单元测试，手动验证交互
- 首次启动验证：空数据库能正常建表，看板正常渲染空状态

### 错误处理

- 后端：统一错误中间件，返回 `{ error: "message" }` + 对应 HTTP 状态码
- 前端：API 调用失败时 Toast 提示，列表加载失败显示空状态 + 重试按钮
- 数据库：开启 WAL 模式，避免并发读写问题

## 9. 明确不做的事（YAGNI）

- 不做用户认证（纯本地单机）
- 不做数据导入（除手动复制 db 文件外）
- 不做多用户/同步
- 不做富文本编辑（纯文本即可）
- 不做每日自动备份（仅手动触发）
