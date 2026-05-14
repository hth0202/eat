export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayKey = () => formatDateKey(new Date());

export function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

export function addDays(dateKey, days) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function isToday(dateKey) {
  return dateKey === todayKey();
}

export function monthKeyFor(dateKey) {
  return dateKey.slice(0, 7);
}

export function addMonths(monthKey, months) {
  const date = dateFromKey(`${monthKey}-01`);
  date.setMonth(date.getMonth() + months);
  return formatDateKey(date).slice(0, 7);
}

export function daysInMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function formatMonthLabel(monthKey) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(
    dateFromKey(`${monthKey}-01`)
  );
}

export function formatHistoryDate(dateKey) {
  const date = dateFromKey(dateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - date) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

export function thisWeekStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  today.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday
  return formatDateKey(today);
}

export function thisWeekDateKeys() {
  const startKey = thisWeekStart();
  const endKey = todayKey();
  const keys = [];
  let cur = startKey;
  while (cur <= endKey) {
    keys.push(cur);
    cur = addDays(cur, 1);
  }
  return keys;
}

export function weekStartOf(dateKey) {
  const d = dateFromKey(dateKey);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday
  return formatDateKey(d);
}

export function weekOffsetOf(dateKey) {
  const diff = (dateFromKey(weekStartOf(dateKey)) - dateFromKey(thisWeekStart())) / (7 * 86400000);
  return Math.round(diff);
}

export function weekStartByOffset(offset) {
  return addDays(thisWeekStart(), offset * 7);
}

export function weekEndByOffset(offset) {
  return addDays(weekStartByOffset(offset), 6);
}

export function weekDateKeysByOffset(offset) {
  const start = weekStartByOffset(offset);
  const end = offset === 0 ? todayKey() : weekEndByOffset(offset);
  const keys = [];
  let cur = start;
  while (cur <= end) {
    keys.push(cur);
    cur = addDays(cur, 1);
  }
  return keys;
}

export function formatWeekLabel(offset) {
  const fmt = (key) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(dateFromKey(key));
  return `${fmt(weekStartByOffset(offset))} – ${fmt(weekEndByOffset(offset))}`;
}

export function weekTitle(offset) {
  if (offset === 0) return '이번 주';
  if (offset === -1) return '지난주';
  return `${Math.abs(offset)}주 전`;
}

export function formatHomeDate(dateKey) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(dateFromKey(dateKey));
}

export function formatDateLabel(dateKey) {
  return formatHomeDate(dateKey);
}

export function formatDateSubLabel(dateKey) {
  return isToday(dateKey) ? '오늘' : '지난 기록';
}

export function parseTime(t) {
  const [h, m] = (t || '12:00').split(':').map(Number);
  return { period: h < 12 ? '오전' : '오후', hour: h % 12 || 12, minute: m };
}

export function formatTimeDisplay(t) {
  if (!t) return '';
  const { period, hour, minute } = parseTime(t);
  return `${period} ${hour}:${String(minute).padStart(2, '0')}`;
}

export function kstHour() {
  const kstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kstNow.getHours();
}
