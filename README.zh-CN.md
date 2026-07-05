# Doer

[English](./README.md) | [简体中文](./README.zh-CN.md)

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

> **Windows 用户注意**：
> - 如果 `npm install` 报 SSL 证书错误（`UNABLE_TO_VERIFY_LEAF_SIGNATURE`），以管理员身份运行 PowerShell 执行：`npm config set strict-ssl false`，安装完成后恢复：`npm config set strict-ssl true`
> - 如果 `npm install` 报 `EPERM` 权限错误，关闭所有使用 node_modules 的程序（如 VS Code、终端），删除 `node_modules` 文件夹后重试
> - 开发模式 `npm run dev` 在 Windows 上可直接使用，无需额外配置

### 桌面应用 (Electron)

从 [GitHub Releases](https://github.com/AuthurZPJ/Doer/releases) 下载最新安装包，支持 Windows、macOS、Linux，无需安装 Node.js 或编译工具。

本地打包（仅当前平台）：

```bash
npm run dist
```

跨平台构建，推送 tag 触发 CI：

```bash
git tag v1.2.0
git push origin v1.2.0
```

GitHub Actions 会自动构建并发布 `.exe`、`.dmg`、`.AppImage` 到 Releases。

开发模式（Electron 窗口 + 热重载）：

```bash
npm run electron:dev
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
