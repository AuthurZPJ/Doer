import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { backupApi } from '../api';
import { showToast } from './Toast';
import ConfirmButton from './ConfirmButton';

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
  const [showBackup, setShowBackup] = useState(false);
  const [backups, setBackups] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);

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
      loadBackups();
    } catch {
      showToast('备份失败', 'error');
    }
  };

  const loadBackups = async () => {
    try {
      const files = await backupApi.list();
      setBackups(files);
    } catch {
      setBackups([]);
    }
  };

  const openBackupPanel = async () => {
    setShowBackup(!showBackup);
    if (!showBackup) await loadBackups();
  };

  const handleRestore = async (filename: string) => {
    setRestoring(true);
    try {
      await backupApi.restore(filename);
      showToast('恢复成功，页面将刷新');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      showToast('恢复失败', 'error');
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await backupApi.delete(filename);
      showToast('已删除备份');
      loadBackups();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-gray-800 dark:bg-gray-950 text-white flex flex-col shrink-0 shadow-lg">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-gray-700 dark:border-gray-800">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold tracking-tight">Doer</span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-auto">
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
            onClick={openBackupPanel}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-base"
          >
            <span className="w-5 text-center">💾</span>
            数据备份
          </button>
        </div>
      </aside>
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
        {showBackup && (
          <aside className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-auto fade-in shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">备份管理</h2>
              <button onClick={() => setShowBackup(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <button
              onClick={handleBackup}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-base mb-4"
            >
              + 创建备份
            </button>
            <div className="space-y-2">
              {backups.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">暂无备份</p>
              ) : (
                backups.map(filename => (
                  <div key={filename} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 transition-base">
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all mb-2">{filename}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(filename)}
                        disabled={restoring}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 transition-base"
                      >
                        恢复
                      </button>
                      <ConfirmButton onConfirm={() => handleDeleteBackup(filename)} className="text-xs text-red-400 hover:text-red-600">
                        删除
                      </ConfirmButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
