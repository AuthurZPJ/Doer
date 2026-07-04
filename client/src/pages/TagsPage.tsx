import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { tagsApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import ConfirmButton from '../components/ConfirmButton';

const presetColors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

export default function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(presetColors[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tagsApi.list();
      setTags(result);
    } catch {
      showToast(t('common.loadFail'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await tagsApi.create({ name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(presetColors[0]);
      showToast(t('common.addSuccess'));
      load();
    } catch {
      showToast(t('common.tagExists'), 'error');
    }
  };

  const handleEdit = (tag: any) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || presetColors[0]);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await tagsApi.update(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      showToast(t('tags.tagSaved'));
      load();
    } catch {
      showToast(t('common.tagNameExists'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tagsApi.delete(id);
      showToast(t('tags.tagDeleted'));
      load();
    } catch {
      showToast(t('common.deleteFail'), 'error');
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 tracking-tight">{t('tags.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6 fade-in">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder={t('tags.namePlaceholder')}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-base"
            />
            <div className="flex gap-1">
              {presetColors.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${newColor === color ? 'border-gray-800' : 'border-transparent'} transition-base`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 self-start transition-base"
          >
            {t('tags.addTag')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 mr-2"></div>{t('common.loading')}</div>
      ) : tags.length === 0 ? (
        <EmptyState message={t('tags.noTags')} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700 slide-up">
          {tags.map(tag => (
            <div key={tag.id} className="p-4 flex items-center justify-between transition-base">
              {editingId === tag.id ? (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); }
                    }
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-base"
                  />
                  <div className="flex gap-1">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-5 h-5 rounded-full border-2 ${editColor === color ? 'border-gray-800' : 'border-transparent'} transition-base`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button onClick={handleSaveEdit} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-base">{t('common.save')}</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition-base">{t('common.cancel')}</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#cbd5e1' }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(tag)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition-base">{t('common.edit')}</button>
                    <ConfirmButton onConfirm={() => handleDelete(tag.id)} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
