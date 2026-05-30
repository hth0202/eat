import { useAppStore } from '../../store/appStore';
import { tagById } from '../../utils/meal';
import { formatTimeDisplay as fmtTime } from '../../utils/date';

const TAG_COLORS = {
  watch: 'bg-coral-soft text-coral-dark',
  care:  'bg-green-soft text-green-dark',
};

function MemoIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-line/30 text-muted ml-1.5 flex-shrink-0">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="3" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="3" y1="6.5" x2="6.5" y2="6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    </span>
  );
}

export default function MealCard({ meal }) {
  const openMealDetail = useAppStore((s) => s.openMealDetail);
  const tags = meal.tags.map(tagById).filter(Boolean);

  const { first, extra } = (() => {
    const items = String(meal.title ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return { first: '제목 없음', extra: null };
    const letters = Array.from(items[0]);
    const truncated = letters.length > 15 ? `${letters.slice(0, 15).join('')}...` : items[0];
    return { first: truncated, extra: items.length - 1 || null };
  })();

  const details = [meal.fullness];
  if (meal.slot !== '음료' && meal.carbs) details.push(`탄수화물 ${meal.carbs}`);
  if (meal.speed && meal.speed !== '모르겠음') details.push(meal.speed);

  return (
    <button
      className="w-full min-h-[88px] px-4 py-4 rounded-lg bg-surface text-left shadow-card"
      onClick={() => openMealDetail(meal.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-[650] text-muted mb-0.5">
            {meal.slot}
            {meal.mealTime ? ` · ${fmtTime(meal.mealTime)}` : ''}
          </p>
          <div className="flex items-center">
            <h3 className="text-17 font-semibold leading-snug">
              {first}
              {extra && <span className="text-muted text-caption font-semibold ml-1">외 {extra}가지</span>}
            </h3>
            {meal.memo && <MemoIcon />}
          </div>
          <p className="text-caption text-muted mt-0.5">{details.join(' · ')}</p>
        </div>
        <span className="text-soft text-title font-bold flex-shrink-0">›</span>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag.id} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[tag.group] ?? ''}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
