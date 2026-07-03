import { useState, useEffect, useRef } from 'react';
import { tagsApi } from '../api';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TagInput({ value, onChange }: TagInputProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchTags = () => {
    tagsApi.list().then((data: any[]) => setTags(data.map(t => t.name)));
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
  const suggestions = tags.filter(t => 
    t.toLowerCase().includes(input.toLowerCase()) && !currentTags.includes(t)
  );

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
      <div className="flex flex-wrap gap-1 items-center min-h-[2.5rem] border border-gray-300 rounded px-2 py-1">
        {currentTags.map(tag => (
          <span key={tag} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded flex items-center gap-1">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-blue-500 hover:text-blue-700">&times;</button>
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
          placeholder={currentTags.length === 0 ? '输入标签' : ''}
          className="flex-1 min-w-[60px] outline-none text-sm"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-auto w-full">
          {suggestions.slice(0, 10).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
