# Doer

一个本地运行的 Web 应用，帮助职场人员记录和管理工作内容。

## 功能

- **今日看板**：一屏展示今天所有类别（完成、未做、会议、学习、问题）
- **今日完成**：记录每天完成了什么，支持标签分类
- **未做工作**：待办管理，支持优先级和截止日期，完成后自动转入"今日完成"
- **会议记录**：记录会议标题、内容和日期
- **学习知识点**：记录学习内容，支持展开/折叠
- **当前问题**：记录遇到的问题，支持标记解决
- **周报**：自动汇总本周每日完成项，按标签分组，支持导出 Markdown
- **数据备份**：一键备份 SQLite 数据库

## 技术栈

- 前端：React + Vite + TypeScript + TailwindCSS
- 后端：Express + TypeScript + better-sqlite3
- 数据库：SQLite

## 启动

```bash
npm install
npm run dev
```

前端访问 http://localhost:5173，后端运行在 http://localhost:3001。

## 数据存储

SQLite 数据文件位于 `server/data/doer.db`，备份文件位于 `server/data/backups/`。
