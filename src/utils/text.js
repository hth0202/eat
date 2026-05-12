import { MEAL_TITLE_LIMIT, MEAL_MEMO_LIMIT } from '../constants';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function characterCount(value) {
  return Array.from(String(value ?? '')).length;
}

export function trimMealTitle(value) {
  return String(value ?? '').trim().slice(0, MEAL_TITLE_LIMIT);
}

export function trimMealMemo(value) {
  return Array.from(String(value ?? '').trim()).slice(0, MEAL_MEMO_LIMIT).join('');
}

export function truncateText(value, limit) {
  const letters = Array.from(value);
  return letters.length > limit ? `${letters.slice(0, limit).join('')}...` : value;
}

export function mealTitleItems(title) {
  return String(title ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function formatMealCardTitle(title) {
  const items = mealTitleItems(title);
  if (!items.length) return '제목 없음';
  const extraCount = items.length - 1;
  return { first: truncateText(items[0], 10), extra: extraCount || null };
}

export function josa(word, type) {
  const code = word.charCodeAt(word.length - 1);
  const hasFinal = (code - 0xAC00) % 28 !== 0;
  switch (type) {
    case '이/가': return hasFinal ? '이' : '가';
    case '을/를': return hasFinal ? '을' : '를';
    case '은/는': return hasFinal ? '은' : '는';
    case '이/': return hasFinal ? '이' : '';
    case '으로/로': return hasFinal ? '으로' : '로';
    default: return '';
  }
}
