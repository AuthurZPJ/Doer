import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { backupApi } from '../api';
import { showToast } from './Toast';
import ConfirmButton from './ConfirmButton';

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: '▤' },
  { path: '/tasks', labelKey: 'nav.doing', icon: '▶' },
  { path: '/todos', labelKey: 'nav.todos', icon: '◇' },
  { path: '/meetings', labelKey: 'nav.meetings', icon: '▣' },
  { path: '/learnings', labelKey: 'nav.learnings', icon: '◆' },
  { path: '/weekly-report', labelKey: 'nav.weeklyReport', icon: '▦' },
  { path: '/search', labelKey: 'nav.search', icon: '🔍' },
  { path: '/tags', labelKey: 'nav.tags', icon: '🏷' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const [showBackup, setShowBackup] = useState(false);
  const [backups, setBackups] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

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
      showToast(`${t('common.backupSuccess')}: ${result.filename}`);
      loadBackups();
    } catch {
      showToast(t('common.backupFail'), 'error');
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
      showToast(t('common.restoreSuccess'));
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      showToast(t('common.restoreFail'), 'error');
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await backupApi.delete(filename);
      showToast(t('common.deleteSuccess'));
      loadBackups();
    } catch {
      showToast(t('common.deleteFail'), 'error');
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
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700 dark:border-gray-800 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-base"
          >
            <span className="w-5 text-center">{dark ? '☀️' : '🌙'}</span>
            {dark ? t('common.themeLight') : t('common.theme')}
          </button>
          <button
            onClick={openBackupPanel}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-base"
          >
            <span className="w-5 text-center">💾</span>
            {t('common.backup')}
          </button>
          <button
            onClick={toggleLang}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-base"
          >
            <span className="w-5 text-center">🌐</span>
            {i18n.language === 'zh' ? 'EN' : '中'}
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
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('backup.title')}</h2>
              <button onClick={() => setShowBackup(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <button
              onClick={handleBackup}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-base mb-4"
            >
              {t('backup.createBackup')}
            </button>
            <div className="space-y-2">
              {backups.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('backup.noBackups')}</p>
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
                        {t('common.restore')}
                      </button>
                      <ConfirmButton onConfirm={() => handleDeleteBackup(filename)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">
                        {t('common.delete')}
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
