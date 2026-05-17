import {
  DEFAULT_TAGS, MEAL_SLOT_ORDER, REPEATABLE_SLOTS,
  FULLNESS_OPTIONS, CARB_OPTIONS, SPEED_OPTIONS,
} from '../constants';
import { todayKey, thisWeekStart, addDays, dateFromKey, formatDateKey, weekStartByOffset, weekEndByOffset } from './date';

export function tagById(id) {
  return DEFAULT_TAGS.find((t) => t.id === id) ?? null;
}

export function isRepeatableSlot(slot) {
  return REPEATABLE_SLOTS.includes(slot);
}

export function visibleTagsForSlot(slot, selectedTags) {
  return DEFAULT_TAGS.filter((tag) => {
    if (!selectedTags.includes(tag.id)) return false;
    if (tag.onlySlots && !tag.onlySlots.includes(slot)) return false;
    if (tag.hideInSlots && tag.hideInSlots.includes(slot)) return false;
    return true;
  });
}

export function applyTagToggle(currentTags, id, forceAdd = false) {
  const tag = tagById(id);
  if (!tag) return currentTags;
  const exists = currentTags.includes(id);
  if (exists && !forceAdd) return currentTags.filter((tid) => tid !== id);
  let next = currentTags;
  if (tag.exclusiveGroup) {
    next = next.filter((tid) => tagById(tid)?.exclusiveGroup !== tag.exclusiveGroup);
  }
  return next.includes(id) ? next : [...next, id];
}

export function normalizeTags(tags) {
  return tags.reduce((acc, id) => applyTagToggle(acc, id, true), []);
}

export function slotIsTaken(meals, slot, exceptId = null, date = todayKey()) {
  if (isRepeatableSlot(slot)) return false;
  return meals.some((m) => m.date === date && m.slot === slot && m.id !== exceptId);
}

export function migrateSpeed(speed) {
  if (speed === '10분 이내') return '20분 이내';
  if (speed === '20-30분') return '30-50분 이내';
  return speed;
}

function displayOrderForMeal(meal, mainMeals) {
  if (!isRepeatableSlot(meal.slot)) return (MEAL_SLOT_ORDER[meal.slot] ?? 10) * 1000;
  const mealTs = Number(meal.createdAt || 0);
  const anchor = mainMeals.reduce((latest, main) => {
    if (Number(main.createdAt || 0) > mealTs) return latest;
    return Math.max(latest, MEAL_SLOT_ORDER[main.slot] ?? latest);
  }, -1);
  return anchor * 1000 + 500;
}

export function sortMealsForDisplay(meals) {
  const main = meals.filter((m) => !isRepeatableSlot(m.slot));
  return [...meals].sort((a, b) => {
    const diff = displayOrderForMeal(a, main) - displayOrderForMeal(b, main);
    if (diff !== 0) return diff;
    const tsDiff = Number(a.createdAt || 0) - Number(b.createdAt || 0);
    if (tsDiff !== 0) return tsDiff;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

export function mealsForDate(meals, dateKey) {
  return sortMealsForDisplay(meals.filter((m) => m.date === dateKey));
}

export function thisWeekMeals(meals) {
  const start = thisWeekStart();
  const end = todayKey();
  return meals.filter((m) => m.date >= start && m.date <= end);
}

export function mealsForWeekOffset(meals, offset) {
  const start = weekStartByOffset(offset);
  const end = offset === 0 ? todayKey() : weekEndByOffset(offset);
  return meals.filter((m) => m.date >= start && m.date <= end);
}

export function recentMeals(meals, days) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return meals.filter((m) => dateFromKey(m.date) >= start);
}

export function countTags(meals) {
  return meals.reduce((acc, meal) => {
    meal.tags.forEach((id) => { acc[id] = (acc[id] || 0) + 1; });
    return acc;
  }, {});
}

export function getStreakDays(meals) {
  const dates = new Set(meals.map((m) => m.date));
  let streak = 0;
  let date = todayKey();
  while (dates.has(date)) { streak++; date = addDays(date, -1); }
  return streak;
}

export function groupedMealsByDate(meals) {
  const groups = meals.reduce((acc, meal) => {
    acc[meal.date] = acc[meal.date] || [];
    acc[meal.date].push(meal);
    return acc;
  }, {});
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, ms]) => ({ date, meals: sortMealsForDisplay(ms) }));
}

export function recommendedSlot(meals, date = todayKey()) {
  const taken = new Set(meals.filter((m) => m.date === date).map((m) => m.slot));
  const mainOrder = ['아침', '점심', '저녁'];
  let lastIdx = -1;
  mainOrder.forEach((slot, i) => { if (taken.has(slot)) lastIdx = i; });
  if (lastIdx < mainOrder.length - 1) return mainOrder[lastIdx + 1];
  return '간식';
}

export function availableSlot(meals, preferred, exceptId = null, date = todayKey()) {
  if (preferred && !slotIsTaken(meals, preferred, exceptId, date)) return preferred;
  const SLOTS = ['아침', '점심', '저녁', '간식', '음료'];
  return SLOTS.find((s) => !slotIsTaken(meals, s, exceptId, date)) ?? null;
}
