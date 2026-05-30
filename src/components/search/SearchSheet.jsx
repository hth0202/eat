import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { dateFromKey } from '../../utils/date';
import MealCard from '../home/MealCard';
import { useHistoryBack } from '../../hooks/useHistoryBack';

function formatSearchDate(dateKey) {
  const date = dateFromKey(dateKey);
  const thisYear = new Date().getFullYear();
  const opts = { month: 'long', day: 'numeric', weekday: 'long' };
  if (date.getFullYear() !== thisYear) opts.year = 'numeric';
  return new Intl.DateTimeFormat('ko-KR', opts).format(date);
}

export default function SearchSheet({ onClose }) {
  const meals = useAppStore((s) => s.appState?.meals ?? []);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const inputRef = useRef(null);

  useHistoryBack(onClose);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => { document.body.style.overflow = ''; };
  }, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const filtered = meals.filter((m) =>
      String(m.title ?? '').toLowerCase().includes(q.toLowerCase())
    );
    return filtered.sort((a, b) => {
      const cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt ?? 0) - (b.createdAt ?? 0);
      return sortOrder === 'newest' ? -cmp : cmp;
    });
  }, [query, meals, sortOrder]);

  const grouped = useMemo(() => {
    const map = new Map();
    results.forEach((meal) => {
      if (!map.has(meal.date)) map.set(meal.date, []);
      map.get(meal.date).push(meal);
    });
    return [...map.entries()];
  }, [results]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 safe-top pt-3 pb-2 border-b border-line/40">
        <button className="w-10 h-10 grid place-items-center text-muted flex-shrink-0" onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-2 h-10 bg-surface-ui rounded-xl px-3">
          <svg className="w-4 h-4 text-soft flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-body text-ink placeholder:text-soft outline-none"
            placeholder="끼니 이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {hasQuery && (
            <button className="text-soft" onClick={() => setQuery('')} aria-label="지우기">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Sort + count */}
      {hasQuery && results.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-caption text-muted">{results.length}개</span>
          <div className="flex gap-1.5">
            {['newest', 'oldest'].map((order) => (
              <button
                key={order}
                className={`text-caption font-semibold px-3 py-1 rounded-full transition-colors ${sortOrder === order ? 'bg-primary text-bg' : 'bg-surface-ui text-muted'}`}
                onClick={() => setSortOrder(order)}
              >
                {order === 'newest' ? '최신순' : '오래된 순'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-10">
        {hasQuery && results.length === 0 && (
          <p className="text-caption text-muted text-center mt-16">검색 결과가 없어요</p>
        )}
        {!hasQuery && (
          <p className="text-caption text-muted text-center mt-16">끼니 이름을 입력해봐요</p>
        )}
        {grouped.map(([dateKey, dayMeals]) => (
          <div key={dateKey} className="mb-5">
            <p className="text-caption font-semibold text-muted mb-2">{formatSearchDate(dateKey)}</p>
            <div className="grid gap-2">
              {dayMeals.map((meal) => <MealCard key={meal.id} meal={meal} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
