import { useState, useCallback } from 'react';
import { searchApi } from '../api';
import { showToast } from '../components/Toast';

interface SearchResults {
  tasks: any[];
  meetings: any[];
  learnings: any[];
  issues: any[];
}

const EMPTY: SearchResults = { tasks: [], meetings: [], learnings: [], issues: [] };

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const data = await searchApi.search(trimmed);
      setResults(data);
      setSearched(true);
    } catch {
      showToast('搜索失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(query);
  };

  const hasResults =
    results.tasks.length + results.meetings.length + results.learnings.length + results.issues.length > 0;

  const dateOf = (row: any, field: string) =>
    row[field] ? new Date(row[field]).toLocaleDateString() : '';

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">全局搜索</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索任务、会议、学习、问题..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={() => doSearch(query)}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {searched && !loading && !hasResults && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <p>暂无结果</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-6">
          <Section title="今日完成" count={results.tasks.length}>
            {results.tasks.map((t: any) => (
              <ResultCard
                key={t.id}
                preview={t.content}
                date={dateOf(t, t.completed_at ? 'completed_at' : 'created_at')}
                tags={t.tags}
              />
            ))}
          </Section>

          <Section title="会议记录" count={results.meetings.length}>
            {results.meetings.map((m: any) => (
              <ResultCard
                key={m.id}
                preview={m.title}
                date={m.meeting_date}
                tags={m.tags}
              />
            ))}
          </Section>

          <Section title="学习知识点" count={results.learnings.length}>
            {results.learnings.map((l: any) => (
              <ResultCard
                key={l.id}
                preview={l.title}
                date={dateOf(l, 'created_at')}
                tags={l.tags}
              />
            ))}
          </Section>

          <Section title="当前问题" count={results.issues.length}>
            {results.issues.map((i: any) => (
              <ResultCard
                key={i.id}
                preview={i.content}
                date={dateOf(i, 'created_at')}
                tags={i.tags}
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 mb-2">{title} ({count})</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResultCard({ preview, date, tags }: { preview: string; date: string; tags?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm">{preview}</p>
      <div className="flex gap-3 mt-1 text-xs text-gray-400">
        {tags && <span className="text-blue-500">{tags}</span>}
        {date && <span>{date}</span>}
      </div>
    </div>
  );
}
