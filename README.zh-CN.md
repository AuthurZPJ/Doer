# Doer

[English](./README.md) | [简体中文](./README.zh-CN.md) | [Español](./README.es.md)

一个本地运行的 Web 应用，帮助记录和管理工作内容。

## 功能

- **今日看板**：一屏展示今天所有类别（正在做、未来计划、会议、知识点），顶部快速录入
- **Doing**：正在做的任务管理，支持子项（可无限嵌套）、点击文字直接编辑、子项完成追踪、截止日期
- **未来计划**：待办管理，支持优先级和截止日期，按截止日期分组展示，点击"开始做"自动转入 Doing 并携带截止日期
- **会议记录**：记录会议标题、内容和日期，支持编辑
- **知识点**：记录知识点，支持展开/折叠
- **周报**：自动汇总本周每日完成项及子项进度，按标签分组，支持导出 Markdown（当前周/周区间/从指定周到本周）
- **全局搜索**：跨所有模块搜索关键词
- **标签管理**：创建、编辑、删除标签，设置颜色，全局自动补全
- **数据备份与恢复**：备份管理面板，支持创建、恢复、删除备份
- **暗色模式**：支持明暗主题切换
- **CLI 快速记录**：终端中直接记录，无需打开浏览器
- **桌面应用**：支持 Electron 打包为桌面应用

## 技术栈

- 前端：React + Vite + TypeScript + TailwindCSS
- 后端：Express + TypeScript + better-sqlite3
- 数据库：SQLite
- 桌面：Electron

## 启动

### Web 模式

```bash
npm install
npm run dev
```

前端访问 http://localhost:5173，后端运行在 http://localhost:3001，启动后自动打开浏览器。

### 桌面模式 (Electron)

```bash
npm install
npm run build
npm run electron:rebuild   # 为 Electron 重新编译原生模块（仅首次）
npm run electron
```

开发模式：

```bash
npm run electron:dev
```

注意：`npm run electron:rebuild` 会为 Electron 的 Node 版本重新编译 `better-sqlite3`。运行 Electron 后，需要执行 `npm rebuild better-sqlite3` 切回普通 Node 以使用 `npm run dev`。

打包为安装包：

```bash
npm run build
npx electron-builder --config electron-builder.cjs
```

## CLI 使用

先全局链接：

```bash
npm link
```

然后可以在终端任何地方使用：

```bash
doer 完成了登录页面              # 添加到 Doing
doer -t 前端,紧急 修复样式bug    # 带标签添加到 Doing
doer -p 调研OAuth --priority high  # 添加到未来计划
doer -m 周会                     # 添加会议记录
doer -l React Hooks              # 添加知识点
doer list                        # 查看 Doing 列表
doer todos                       # 查看未来计划
doer complete 3                  # 完成任务
doer start 1                     # 从未来计划开始做
```

环境变量 `DOER_API` 可指定后端地址（默认 `http://localhost:3001/api`）。

## 数据存储

SQLite 数据文件位于 `server/data/doer.db`，备份文件位于 `server/data/backups/`。
