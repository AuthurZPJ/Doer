import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { learningsApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';
import type { Learning } from '../types';

export default function Learnings() {
  const { t } = useTranslation();
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await learningsApi.list();
      setLearnings(result);
    } catch {
      showToast(t('common.loadFail'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      await learningsApi.create({ title: title.trim(), content, tags });
      setTitle('');
      setContent('');
      setTags('');
      setShowForm(false);
      showToast(t('common.addSuccess'));
      load();
    } catch {
      showToast(t('common.addFail'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await learningsApi.delete(id);
      showToast(t('common.deleteSuccess'));
      load();
    } catch {
      showToast(t('common.deleteFail'), 'error');
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight dark:text-gray-100">{t('learnings.title')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-base"
        >
          {showForm ? t('common.cancel') : t('learnings.newItem')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6 fade-in">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('learnings.titlePlaceholder')}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-base"
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('learnings.contentPlaceholder')}
              rows={5}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-base"
            />
            <TagInput value={tags} onChange={setTags} />
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 self-start transition-base"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 mr-2"></div>{t('common.loading')}</div>
      ) : learnings.length === 0 ? (
            <EmptyState message={t('learnings.noLearnings')} onRetry={load} />
      ) : (
        <div className="space-y-2 slide-up">
          {learnings.map(l => (
            <div key={l.id} className="bg-white dark:bg-gray-800 rounded-xl shadow transition-base hover:shadow-md">
              <button
                onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                className="block w-full text-left p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium dark:text-gray-100">{l.title}</span>
                  <div className="flex items-center gap-3">
                    {l.tags && <span className="text-xs text-blue-500 dark:text-blue-400">{l.tags}</span>}
                    <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(l.created_at).toLocaleDateString()}</span>
                    <span className="text-gray-400 dark:text-gray-500">{expandedId === l.id ? '▾' : '▸'}</span>
                  </div>
                </div>
              </button>
              {expandedId === l.id && (
                <div className="px-4 pb-4">
                  <div className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                    {l.content || t('meetings.noContent')}
                  </div>
                  <div className="mt-3">
                    <ConfirmButton onConfirm={() => handleDelete(l.id)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
