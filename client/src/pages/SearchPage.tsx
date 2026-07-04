import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { searchApi } from '../api';
import { showToast } from '../components/Toast';

interface SearchResults {
  tasks: any[];
  todos: any[];
  meetings: any[];
  learnings: any[];
}

const EMPTY: SearchResults = { tasks: [], todos: [], meetings: [], learnings: [] };

export default function SearchPage() {
  const { t } = useTranslation();
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
      showToast(t('common.loadFail'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(query);
  };

  const hasResults =
    results.tasks.length + results.todos.length + results.meetings.length + results.learnings.length > 0;

  const dateOf = (row: any, field: string) =>
    row[field] ? new Date(row[field]).toLocaleDateString() : '';

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 tracking-tight">{t('search.title')}</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-base"
        />
        <button
          onClick={() => doSearch(query)}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-base"
        >
          {loading ? t('common.searching') : t('common.search')}
        </button>
      </div>

      {searched && !loading && !hasResults && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 fade-in">
          <p>{t('search.noResults')}</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-6 slide-up">
          <Section title={t('search.sectionDoing')} count={results.tasks.length}>
            {results.tasks.map((t: any) => (
              <ResultCard
                key={t.id}
                preview={t.content}
                date={dateOf(t, t.completed_at ? 'completed_at' : 'created_at')}
                tags={t.tags}
              />
            ))}
          </Section>

          <Section title={t('search.sectionTodos')} count={results.todos.length}>
            {results.todos.map((t: any) => (
              <ResultCard
                key={t.id}
                preview={t.content}
                date={dateOf(t, 'created_at')}
                tags={t.tags}
              />
            ))}
          </Section>

          <Section title={t('search.sectionMeetings')} count={results.meetings.length}>
            {results.meetings.map((m: any) => (
              <ResultCard
                key={m.id}
                preview={m.title}
                date={m.meeting_date}
                tags={m.tags}
              />
            ))}
          </Section>

          <Section title={t('search.sectionKnowledge')} count={results.learnings.length}>
            {results.learnings.map((l: any) => (
              <ResultCard
                key={l.id}
                preview={l.title}
                date={dateOf(l, 'created_at')}
                tags={l.tags}
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
      <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">{title} ({count})</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResultCard({ preview, date, tags }: { preview: string; date: string; tags?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-base hover:shadow-md">
      <p className="text-sm dark:text-gray-100">{preview}</p>
      <div className="flex gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
        {tags && <span className="text-blue-500 dark:text-blue-400">{tags}</span>}
        {date && <span>{date}</span>}
      </div>
    </div>
  );
}
