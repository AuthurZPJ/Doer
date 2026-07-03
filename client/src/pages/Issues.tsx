import { useState, useEffect, useCallback } from 'react';
import { issuesApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';

export default function Issues() {
  const [openIssues, setOpenIssues] = useState<any[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [open, resolved] = await Promise.all([
        issuesApi.list('open'),
        issuesApi.list('resolved'),
      ]);
      setOpenIssues(open);
      setResolvedIssues(resolved);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await issuesApi.create({ content: content.trim(), tags });
      setContent('');
      setTags('');
      showToast('添加成功');
      load();
    } catch {
      showToast('添加失败', 'error');
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await issuesApi.update(id, { status: 'resolved' });
      showToast('已标记为解决');
      load();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await issuesApi.delete(id);
      showToast('删除成功');
      load();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const renderIssue = (issue: any, isResolved: boolean) => (
    <div key={issue.id} className="bg-white rounded-lg shadow p-4 flex items-start justify-between">
      <div>
        <p className={`text-sm ${isResolved ? 'text-gray-400 line-through' : ''}`}>{issue.content}</p>
        <div className="flex gap-3 mt-1 text-xs text-gray-400">
          {issue.tags && <span className="text-blue-500">{issue.tags}</span>}
          <span>{new Date(issue.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex gap-3 shrink-0">
        {!isResolved && (
          <button
            onClick={() => handleResolve(issue.id)}
            className="text-sm text-green-600 hover:text-green-800"
          >
            解决
          </button>
        )}
        <ConfirmButton onConfirm={() => handleDelete(issue.id)} />
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">当前问题</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="遇到了什么问题？"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <TagInput value={tags} onChange={setTags} />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 self-start"
          >
            添加
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">未解决 ({openIssues.length})</h2>
          {openIssues.length === 0 ? (
            <EmptyState message="没有未解决的问题" />
          ) : (
            <div className="space-y-2 mb-6">
              {openIssues.map(i => renderIssue(i, false))}
            </div>
          )}

          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            已解决 ({resolvedIssues.length}) {showResolved ? '▾' : '▸'}
          </button>
          {showResolved && resolvedIssues.length > 0 && (
            <div className="space-y-2">
              {resolvedIssues.map(i => renderIssue(i, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
