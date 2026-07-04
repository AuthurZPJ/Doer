import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { tagsApi } from '../api';

interface TagInfo {
  name: string;
  color: string | null;
}

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TagInput({ value, onChange }: TagInputProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchTags = () => {
    tagsApi.list().then((data: any[]) => setTags(data.map(t => ({ name: t.name, color: t.color }))));
  };

  useEffect(() => { fetchTags(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentTags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const tagColorMap = new Map(tags.map(t => [t.name, t.color]));
  const suggestions = tags.filter(t =>
    t.name.toLowerCase().includes(input.toLowerCase()) && !currentTags.includes(t.name)
  );

  const getTagColor = (name: string): string => tagColorMap.get(name) || '#3b82f6';

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    onChange([...currentTags, trimmed].join(','));
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(currentTags.filter(t => t !== tag).join(','));
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-1 items-center min-h-[2.5rem] border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-base">
        {currentTags.map(tag => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1 text-white"
            style={{ backgroundColor: getTagColor(tag) }}
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="opacity-70 hover:opacity-100">&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(input);
            } else if (e.key === 'Backspace' && !input && currentTags.length > 0) {
              removeTag(currentTags[currentTags.length - 1]);
            }
          }}
          onFocus={() => { fetchTags(); setShowSuggestions(true); }}
          placeholder={currentTags.length === 0 ? t('common.optionalTags') : ''}
          className="flex-1 min-w-[60px] outline-none text-sm"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-auto w-full fade-in">
          {suggestions.slice(0, 10).map(tag => (
            <button
              key={tag.name}
              type="button"
              onClick={() => addTag(tag.name)}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-base"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color || '#cbd5e1' }} />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
