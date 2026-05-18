import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  effectiveDateKey, formatDateKey, formatMonthLabel, addMonths, monthKeyFor,
  daysInMonth, weekOffsetOf, weekStartByOffset, weekEndByOffset,
} from '../../utils/date';

export default function WeekPicker({ weekOffset, onChange, onClose }) {
  const dayStartHour = useAppStore((s) => s.appState?.conditionPromptHour ?? 0);
  const today = effectiveDateKey(dayStartHour);

  const initialMonth = weekStartByOffset(weekOffset, dayStartHour).slice(0, 7);
  const [pickerMonth, setPickerMonth] = useState(initialMonth);

  const selectedStart = weekStartByOffset(weekOffset, dayStartHour);
  const selectedEnd = weekEndByOffset(weekOffset, dayStartHour);

  function handleDayClick(key) {
    if (key > today) return;
    onChange(weekOffsetOf(key, dayStartHour));
    onClose();
  }

  const [year, month] = pickerMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const total = daysInMonth(pickerMonth);

  const cells = [];
  for (let i = firstDay; i > 0; i--) cells.push(formatDateKey(new Date(year, month - 1, 1 - i)));
  for (let d = 1; d <= total; d++) cells.push(formatDateKey(new Date(year, month - 1, d)));
  let nd = 1;
  while (cells.length < 42) cells.push(formatDateKey(new Date(year, month, nd++)));

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-3 right-3 z-20 mt-2 px-4 py-3 rounded-xl border border-line/90 bg-surface shadow-sheet">
        <div className="flex items-center justify-between mb-3">
          <strong className="text-body font-[750]">{formatMonthLabel(pickerMonth)}</strong>
          <div className="flex items-center gap-1">
            <button
              className="text-caption font-semibold text-muted px-1.5 py-1"
              onClick={() => { onChange(0); onClose(); }}
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

        <div className="grid grid-cols-7 gap-x-0">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="text-center text-[11px] font-[650] text-soft">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-x-0">
          {cells.map((key) => {
            const inMonth = key.slice(0, 7) === pickerMonth;
            const isFuture = key > today;
            const isInWeek = key >= selectedStart && key <= selectedEnd;
            const isSelectedStart = key === selectedStart;
            const isWeekEnd = key === selectedEnd;
            const isToday = key === today;
            const dow = new Date(`${key}T00:00:00`).getDay();
            const isRowStart = dow === 0;
            const isRowEnd = dow === 6;

            const textClass =
              isSelectedStart ? 'text-bg' :
              isInWeek && !isFuture ? 'text-primary-dark' :
              isInWeek && isFuture ? 'text-primary/40' :
              isToday ? 'text-primary-dark' :
              isFuture ? 'opacity-20' :
              dow === 0 ? (inMonth ? 'text-coral' : 'text-coral/40') :
              dow === 6 ? (inMonth ? 'text-blue-500' : 'text-blue-500/40') :
              !inMonth ? 'text-soft' :
              'text-ink';

            return (
              <div key={key} className="relative h-8 flex items-center justify-center">
                {/* 주간 연속 스트립 — selectedStart는 오른쪽 절반만 */}
                {isInWeek && isSelectedStart && !isWeekEnd && (
                  <div className="absolute inset-y-0 left-1/2 right-0 bg-primary/15" />
                )}
                {isInWeek && !isSelectedStart && (
                  <div className={`absolute inset-y-0 inset-x-0 bg-primary/15
                    ${isRowStart ? 'rounded-l-full' : ''}
                    ${(isWeekEnd || isRowEnd) ? 'rounded-r-full' : ''}
                  `} />
                )}
                <button
                  disabled={isFuture}
                  onClick={() => handleDayClick(key)}
                  className={`relative z-10 w-8 h-8 grid place-items-center text-caption font-[650] disabled:cursor-default
                    ${isSelectedStart ? 'rounded-full bg-primary' : ''}
                    ${textClass}`}
                >
                  {parseInt(key.slice(-2))}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
