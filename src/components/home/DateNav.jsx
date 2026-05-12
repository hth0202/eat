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

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const key = formatDateKey(new Date(year, month - 1, d));
      cells.push(key);
    }

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
      <div className="absolute top-full left-3 right-3 z-10 mt-2 p-3 rounded-xl border border-line/90 bg-surface shadow-sheet">
        <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2 mb-2">
          <button
            className="w-9 h-9 grid place-items-center rounded-sm bg-surface-ui text-title font-bold"
            onClick={() => setPickerMonth(addMonths(pickerMonth, -1))}
          >‹</button>
          <strong className="text-center text-body font-[750]">{formatMonthLabel(pickerMonth)}</strong>
          <button
            className="w-9 h-9 grid place-items-center rounded-sm bg-surface-ui text-title font-bold disabled:opacity-35"
            disabled={pickerMonth >= monthKeyFor(today)}
            onClick={() => setPickerMonth(addMonths(pickerMonth, 1))}
          >›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((d) => (
            <div key={d} className="text-center text-[11px] font-[650] text-soft">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) =>
            key === null ? (
              <div key={`e-${i}`} className="h-9" />
            ) : (
              <button
                key={key}
                disabled={key > today}
                onClick={() => selectDate(key)}
                className={`h-9 grid place-items-center rounded-sm text-caption font-[650] ${
                  key === viewedDate ? 'bg-primary text-bg' :
                  key === today ? 'text-primary-dark' :
                  'text-ink'
                } disabled:text-disabled disabled:cursor-default`}
              >
                {parseInt(key.slice(-2))}
              </button>
            )
          )}
        </div>

        <button
          className="w-full min-h-[40px] mt-2 rounded-md bg-primary-soft text-primary-dark text-caption font-bold"
          onClick={() => selectDate(today)}
        >
          오늘로 이동
        </button>
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
