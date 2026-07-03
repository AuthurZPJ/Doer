import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { backupApi } from '../api';
import { showToast } from './Toast';

const navItems = [
  { path: '/', label: '今日看板' },
  { path: '/tasks', label: 'Doing' },
  { path: '/todos', label: '未来计划' },
  { path: '/meetings', label: '会议记录' },
  { path: '/learnings', label: '知识点' },
  { path: '/weekly-report', label: '周报' },
  { path: '/search', label: '全局搜索' },
  { path: '/tags', label: '标签管理' },
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
      <aside className="w-56 bg-gray-800 dark:bg-gray-950 text-white flex flex-col shrink-0">
        <div className="px-6 py-4 text-xl font-bold border-b border-gray-700 dark:border-gray-800">
          Doer
        </div>
        <nav className="flex-1 py-2">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `block px-6 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-700 dark:bg-gray-800 text-white border-l-4 border-blue-400'
                    : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 dark:border-gray-800 flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded text-sm text-gray-200"
          >
            {dark ? '☀️ 浅色' : '🌙 深色'}
          </button>
          <button
            onClick={handleBackup}
            className="w-full px-4 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded text-sm text-gray-200"
          >
            数据备份
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}
