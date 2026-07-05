import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { todayStr, parseLocalDate } from '../utils/date';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className = '' }: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? parseLocalDate(value).getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseLocalDate(value).getMonth() : new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = parseLocalDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const today = todayStr();

  const days: (string | null)[] = [];
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(dateStr);
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(i18n.language, { month: 'long' });
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(i18n.language, { weekday: 'narrow' })
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-w-[120px] transition-base"
        >
          {value || t('datePicker.selectDate')}
        </button>
        {open && (
          <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 w-72 fade-in">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="px-2 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg transition-base">‹</button>
              <span className="text-sm font-medium dark:text-gray-200">{viewYear} {monthName}</span>
              <button onClick={nextMonth} className="px-2 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg transition-base">›</button>
            </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdayNames.map((w, i) => (
              <div key={i} className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const isSelected = d === value;
              const isToday = d === today;
              return (
                <button
                  key={i}
                  onClick={() => { onChange(d); setOpen(false); }}
                  className={`text-sm rounded w-9 h-9 transition-base ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isToday
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {Number(d.slice(-2))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
