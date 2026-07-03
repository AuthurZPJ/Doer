#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.DOER_API || 'http://localhost:3001/api';

function showHelp() {
  console.log(`
Doer CLI - 快速记录工作内容

用法:
  doer <内容>              添加到 Doing
  doer -t <内容>           添加到 Doing (带标签)
  doer -p <内容>           添加到未来计划
  doer -m <标题>           添加会议记录 (今天)
  doer -l <标题>           添加知识点
  doer list                查看 Doing 列表
  doer todos               查看未来计划
  doer complete <id>       完成 Doing 中的任务
  doer start <id>          从未来计划开始做
  doer --help              显示帮助

选项:
  -t, --tags <标签>        标签 (逗号分隔)
  -p, --plan               添加到未来计划
  -m, --meeting             添加会议记录
  -l, --learning           添加知识点
  --priority <high|medium|low>  优先级 (仅未来计划)

环境变量:
  DOER_API                 后端地址 (默认 http://localhost:3001/api)

示例:
  doer 完成了登录页面
  doer -t 前端,紧急 修复了样式bug
  doer -p 调研OAuth方案 --priority high
  doer complete 3
`);
}

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error('无法连接到 Doer 服务器，请确认后端已启动 (npm run dev)');
      process.exit(1);
    }
    throw err;
  }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  let tags = '';
  let priority = 'medium';
  let mode = 'task';
  const contentParts = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-t' || arg === '--tags') {
      tags = args[++i] || '';
    } else if (arg === '-p' || arg === '--plan') {
      mode = 'todo';
    } else if (arg === '-m' || arg === '--meeting') {
      mode = 'meeting';
    } else if (arg === '-l' || arg === '--learning') {
      mode = 'learning';
    } else if (arg === '--priority') {
      priority = args[++i] || 'medium';
    } else if (arg === 'list') {
      const tasks = await api('/tasks?status=in_progress');
      if (tasks.length === 0) { console.log('Doing 为空'); return; }
      console.log('\n📋 Doing:');
      tasks.forEach(t => console.log(`  [${t.id}] ${t.content}${t.tags ? ` (${t.tags})` : ''}`));
      return;
    } else if (arg === 'todos') {
      const todos = await api('/todos?status=pending');
      if (todos.length === 0) { console.log('未来计划为空'); return; }
      console.log('\n📌 未来计划:');
      todos.forEach(t => console.log(`  [${t.id}] ${t.content} (${t.priority})${t.due_date ? ` 截止:${t.due_date}` : ''}`));
      return;
    } else if (arg === 'complete') {
      const id = args[++i];
      if (!id) { console.error('请指定任务 ID'); process.exit(1); }
      await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) });
      console.log(`✓ 任务 ${id} 已完成`);
      return;
    } else if (arg === 'start') {
      const id = args[++i];
      if (!id) { console.error('请指定任务 ID'); process.exit(1); }
      await api(`/todos/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
      console.log(`✓ 任务 ${id} 已转入 Doing`);
      return;
    } else {
      contentParts.push(arg);
    }
  }

  const content = contentParts.join(' ').trim();
  if (!content) {
    console.error('内容不能为空');
    showHelp();
    process.exit(1);
  }

  switch (mode) {
    case 'task':
      await api('/tasks', { method: 'POST', body: JSON.stringify({ content, tags }) });
      console.log(`✓ 已添加到 Doing: ${content}`);
      break;
    case 'todo':
      await api('/todos', { method: 'POST', body: JSON.stringify({ content, priority, tags }) });
      console.log(`✓ 已添加到未来计划: ${content}`);
      break;
    case 'meeting':
      await api('/meetings', { method: 'POST', body: JSON.stringify({ title: content, meeting_date: todayStr(), tags }) });
      console.log(`✓ 已添加会议记录: ${content}`);
      break;
    case 'learning':
      await api('/learnings', { method: 'POST', body: JSON.stringify({ title: content, tags }) });
      console.log(`✓ 已添加知识点: ${content}`);
      break;
  }
}

main().catch(err => {
  console.error(`错误: ${err.message}`);
  process.exit(1);
});
