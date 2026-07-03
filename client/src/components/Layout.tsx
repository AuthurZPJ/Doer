import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { backupApi } from '../api';
import { showToast } from './Toast';

const navItems = [
  { path: '/', label: '今日看板', icon: '▤' },
  { path: '/tasks', label: 'Doing', icon: '▶' },
  { path: '/todos', label: '未来计划', icon: '◇' },
  { path: '/meetings', label: '会议记录', icon: '▣' },
  { path: '/learnings', label: '知识点', icon: '◆' },
  { path: '/weekly-report', label: '周报', icon: '▦' },
  { path: '/search', label: '全局搜索', icon: '🔍' },
  { path: '/tags', label: '标签管理', icon: '🏷' },
];

export default function Layout() {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

  const handleBackup = async () => {
    try {
      const result = await backupApi.create();
      showToast(`备份成功: ${result.filename}`);
    } catch {
      showToast('备份失败', 'error');
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-gray-800 dark:bg-gray-950 text-white flex flex-col shrink-0 shadow-lg">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-gray-700 dark:border-gray-800">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold tracking-tight">Doer</span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-base ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700 dark:border-gray-800 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-base"
          >
            <span className="w-5 text-center">{dark ? '☀️' : '🌙'}</span>
            {dark ? '浅色' : '深色'}
          </button>
          <button
            onClick={handleBackup}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-base"
          >
            <span className="w-5 text-center">💾</span>
            数据备份
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
