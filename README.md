# Doer

[English](./README.md) | [简体中文](./README.zh-CN.md) | [Español](./README.es.md)

A locally-run web application to help you record and manage your work.

## Features

- **Dashboard**: One-screen overview of all categories (Doing, Future Plans, Meetings, Knowledge), with quick entry at the top
- **Doing**: In-progress task management with nested subtasks (unlimited depth), click-to-edit text, subtask completion tracking, and due dates
- **Future Plans**: Todo management with priority and due dates, grouped by deadline, auto-transfers to Doing with due date preserved
- **Meetings**: Record meeting title, content, and date, with edit support
- **Knowledge**: Record knowledge points, expandable/collapsible
- **Weekly Report**: Auto-summarizes daily completed items and subtask progress, grouped by tags, export to Markdown (current week / week range / from specified week to this week)
- **Global Search**: Search across all modules
- **Tag Management**: Create, edit, delete tags with colors, global autocomplete
- **Backup & Restore**: Backup management panel with create, restore, and delete
- **Dark Mode**: Light/dark theme toggle
- **CLI Quick Log**: Record from terminal without opening browser
- **Desktop App**: Electron packaging support

## Tech Stack

- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Express + TypeScript + better-sqlite3
- Database: SQLite
- Desktop: Electron

## Getting Started

### Web Mode

```bash
npm install
npm run dev
```

Frontend at http://localhost:5173, backend at http://localhost:3001, auto-opens browser on start.

### Desktop Mode (Electron)

```bash
npm install
npm run build
npm run electron:rebuild   # rebuild native modules for Electron (first time only)
npm run electron
```

Dev mode:

```bash
npm run electron:dev
```

Note: `npm run electron:rebuild` rebuilds `better-sqlite3` for Electron's Node version. After running Electron, run `npm rebuild better-sqlite3` to switch back to regular Node for `npm run dev`.

Package as installer:

```bash
npm run build
npx electron-builder --config electron-builder.cjs
```

## CLI Usage

Link globally:

```bash
npm link
```

Then use from anywhere:

```bash
doer finished login page              # Add to Doing
doer -t frontend,urgent fix style bug # Add to Doing with tags
doer -p research OAuth --priority high  # Add to Future Plans
doer -m weekly meeting                # Add meeting
doer -l React Hooks                   # Add knowledge point
doer list                             # View Doing list
doer todos                            # View Future Plans
doer complete 3                       # Complete task
doer start 1                          # Start from Future Plans
```

Environment variable `DOER_API` can specify backend URL (default: `http://localhost:3001/api`).

## Data Storage

SQLite database at `server/data/doer.db`, backups at `server/data/backups/`.
