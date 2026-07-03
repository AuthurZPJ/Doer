import { useState, useEffect, useCallback } from 'react';
import { meetingsApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [meetingDate, setMeetingDate] = useState(todayStr());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await meetingsApi.list();
      setMeetings(result);
      if (result.length > 0 && !selectedId) setSelectedId(result[0].id);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = meetings.find(m => m.id === selectedId);

  const handleAdd = async () => {
    if (!title.trim()) return;
    try {
      await meetingsApi.create({ title: title.trim(), content, tags, meeting_date: meetingDate });
      setTitle('');
      setContent('');
      setTags('');
      setMeetingDate(todayStr());
      setShowForm(false);
      showToast('添加成功');
      load();
    } catch {
      showToast('添加失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await meetingsApi.delete(id);
      if (selectedId === id) setSelectedId(null);
      showToast('删除成功');
      load();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">会议记录</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          {showForm ? '取消' : '新建会议'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col gap-3 max-w-2xl">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="会议标题"
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="会议内容"
              rows={6}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <div className="flex-1"><TagInput value={tags} onChange={setTags} /></div>
            </div>
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 self-start"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : meetings.length === 0 ? (
        <EmptyState message="暂无会议记录" onRetry={load} />
      ) : (
        <div className="flex gap-4">
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
              {meetings.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`block w-full text-left p-3 hover:bg-gray-50 ${selectedId === m.id ? 'bg-blue-50' : ''}`}
                >
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.meeting_date}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            {selected ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">{selected.meeting_date}</p>
                    {selected.tags && <span className="text-xs text-blue-500">{selected.tags}</span>}
                  </div>
                  <ConfirmButton onConfirm={() => handleDelete(selected.id)} />
                </div>
                <div className="text-sm whitespace-pre-wrap">{selected.content || '（无内容）'}</div>
              </div>
            ) : (
              <EmptyState message="选择左侧会议查看详情" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
