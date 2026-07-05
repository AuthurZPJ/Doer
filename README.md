# Doer

[English](./README.md) | [简体中文](./README.zh-CN.md)

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

> **Windows notes**:
> - If `npm install` fails with SSL error (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), run as Administrator: `npm config set strict-ssl false`, then restore after install: `npm config set strict-ssl true`
> - If `npm install` fails with `EPERM`, close all programs using `node_modules` (VS Code, terminals), delete the `node_modules` folder and retry
> - Dev mode `npm run dev` works on Windows without extra configuration

### Desktop App (Electron)

Download the latest installer from [GitHub Releases](https://github.com/AuthurZPJ/Doer/releases) — available for Windows, macOS, and Linux. No Node.js or build tools required.

Package locally (current platform only):

```bash
npm run dist
```

For cross-platform builds, push a tag to trigger CI:

```bash
git tag v1.2.0
git push origin v1.2.0
```

GitHub Actions will build and publish `.exe`, `.dmg`, and `.AppImage` to Releases automatically.

Dev mode (Electron window with hot reload):

```bash
npm run electron:dev
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
