import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  todayKey, addDays, formatDateKey, dateFromKey,
  formatHomeDate, formatDateSubLabel, formatMonthLabel,
  addMonths, monthKeyFor, daysInMonth,
} from '../../utils/date';

export default function DateNav() {
  const viewedDate = useAppStore((s) => s.viewedDate);
  const setViewedDate = useAppStore((s) => s.setViewedDate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(viewedDate.slice(0, 7));

  const today = todayKey();
  const isToday = viewedDate === today;

  function prev() { setViewedDate(addDays(viewedDate, -1)); }
  function next() { if (!isToday) setViewedDate(addDays(viewedDate, 1)); }

  function selectDate(dateKey) {
    setViewedDate(dateKey);
    setPickerOpen(false);
  }

  function renderCalendar() {
    const [year, month] = pickerMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const total = daysInMonth(pickerMonth);
    const cells = [];

    for (let i = firstDay; i > 0; i--) cells.push(formatDateKey(new Date(year, month - 1, 1 - i)));
    for (let d = 1; d <= total; d++) cells.push(formatDateKey(new Date(year, month - 1, d)));
    let nd = 1;
    while (cells.length < 42) cells.push(formatDateKey(new Date(year, month, nd++)));

    return (
      <div className="absolute top-full left-3 right-3 z-10 mt-2 px-4 py-3 rounded-xl border border-line/90 bg-surface shadow-sheet">
        <div className="flex items-center justify-between mb-3">
          <strong className="text-body font-[750]">{formatMonthLabel(pickerMonth)}</strong>
          <div className="flex items-center gap-1">
            <button
              className="text-caption font-semibold text-muted px-1.5 py-1"
              onClick={() => { setPickerMonth(today.slice(0, 7)); selectDate(today); }}
            >오늘</button>
            <button
              className="w-8 h-8 grid place-items-center rounded-sm text-title font-bold text-muted"
              onClick={() => setPickerMonth(addMonths(pickerMonth, -1))}
            >‹</button>
            <button
              className="w-8 h-8 grid place-items-center rounded-sm text-title font-bold text-muted disabled:opacity-35"
              disabled={pickerMonth >= monthKeyFor(today)}
              onClick={() => setPickerMonth(addMonths(pickerMonth, 1))}
            >›</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="text-center text-[11px] font-[650] text-soft">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-x-1">
          {cells.map((key) => {
            const inMonth = key.slice(0, 7) === pickerMonth;
            const isFuture = key > today;
            const dow = new Date(`${key}T00:00:00`).getDay();
            const textClass =
              key === viewedDate ? 'bg-primary text-bg' :
              key === today ? 'text-primary-dark' :
              isFuture ? 'opacity-20' :
              dow === 0 ? (inMonth ? 'text-coral' : 'text-coral/40') :
              dow === 6 ? (inMonth ? 'text-blue-500' : 'text-blue-500/40') :
              !inMonth ? 'text-soft' :
              'text-ink';
            return (
              <button
                key={key}
                disabled={isFuture}
                onClick={() => selectDate(key)}
                className={`h-8 grid place-items-center rounded-sm text-caption font-[650] disabled:cursor-default ${textClass}`}
              >
                {parseInt(key.slice(-2))}
              </button>
            );
          })}
        </div>

      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-[44px_1fr_44px] items-center gap-2 min-h-[56px] p-2 rounded-xl">
      <button
        className="w-11 h-11 grid place-items-center rounded-md bg-surface-ui text-title font-bold text-ink"
        onClick={prev}
        aria-label="이전 날"
      >‹</button>

      <button
        className="grid place-items-center min-h-[44px] px-2 rounded-md text-center"
        onClick={() => { setPickerOpen((o) => !o); setPickerMonth(viewedDate.slice(0, 7)); }}
        aria-label="날짜 선택"
      >
        <strong className="block text-body font-[750] leading-snug truncate max-w-full">
          {formatHomeDate(viewedDate)}
        </strong>
        <span className="block text-caption text-muted whitespace-nowrap">{formatDateSubLabel(viewedDate)}</span>
      </button>

      <button
        className="w-11 h-11 grid place-items-center rounded-md bg-surface-ui text-title font-bold text-ink disabled:opacity-30 disabled:cursor-default"
        disabled={isToday}
        onClick={next}
        aria-label="다음 날"
      >›</button>

      {pickerOpen && renderCalendar()}
    </div>
  );
}
