import { useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { mealsForDate, countTags, tagById, recommendedSlot, availableSlot } from '../../utils/meal';
import { effectiveDateKey, addDays } from '../../utils/date';
import DateNav from './DateNav';
import MealCard from './MealCard';
import ConditionBar from './ConditionBar';
import InsightBar from './InsightBar';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function HomeTab() {
  const appState = useAppStore((s) => s.appState);
  const viewedDate = useAppStore((s) => s.viewedDate);
  const setViewedDate = useAppStore((s) => s.setViewedDate);
  const openEditor = useAppStore((s) => s.openEditor);
  const dayStartHour = useAppStore((s) => s.appState?.conditionPromptHour ?? 0);
  const effectiveToday = effectiveDateKey(dayStartHour);

  const touchStart = useRef(null);

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e) {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 50) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) {
      if (viewedDate < effectiveToday) setViewedDate(addDays(viewedDate, 1));
    } else {
      setViewedDate(addDays(viewedDate, -1));
    }
  }

  const meals = mealsForDate(appState?.meals ?? [], viewedDate);
  const isToday = viewedDate === effectiveToday;
  const dayCopy = isToday ? '오늘' : '이날';

  const allMeals = appState?.meals ?? [];
  const preferred = recommendedSlot(allMeals, viewedDate);
  const canAdd = !!availableSlot(allMeals, preferred, null, viewedDate);

  function handleOpenEditor() {
    if (!canAdd) return;
    const slot = availableSlot(allMeals, preferred, null, viewedDate);
    openEditor({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      date: viewedDate,
      slot,
      title: '',
      tags: [],
      fullness: '적당함',
      carbs: '보통',
      speed: '모르겠음',
      memo: '',
      photos: [],
      mealTime: '',
      isNew: true,
    });
  }

  const counts = countTags(meals);
  const topTags = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([id, count]) => ({ tag: tagById(id), count }))
    .filter(({ tag }) => tag);

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="min-h-dvh">
      <DateNav />
      <ConditionBar dateKey={viewedDate} />
      <InsightBar dateKey={viewedDate} dayCopy={dayCopy} />

      <section className="mt-5">
        {meals.length > 0 ? (
          <>
            <div className="grid gap-3">
              {meals.map((meal) => <MealCard key={meal.id} meal={meal} />)}
            </div>

            {/* 이어서 기록하기 / 다 기록했어요 CTA */}
            <button
              className="w-full flex items-center gap-4 mt-3 px-4 py-4 rounded-xl bg-surface shadow-card text-left disabled:opacity-50"
              disabled={!canAdd}
              onClick={handleOpenEditor}
            >
              <span className={`flex w-12 h-12 flex-shrink-0 items-center justify-center rounded-full ${canAdd ? 'bg-primary text-bg' : 'bg-surface-ui text-soft'}`}>
                {canAdd ? <PlusIcon /> : <CheckIcon />}
              </span>
              <span>
                <strong className="block text-body font-bold">
                  {canAdd ? '이어서 기록하기' : `${dayCopy} 끼니는 다 기록했어요`}
                </strong>
                <small className="block text-caption text-muted mt-0.5">
                  {canAdd ? '다음 끼니를 이어서 기록해요' : '카드를 누르면 수정할 수 있어요'}
                </small>
              </span>
            </button>

            {/* 태그 개요 */}
            {topTags.length > 0 && (
              <section className="mt-5">
                <div className="mb-3">
                  <h2 className="text-title font-semibold tracking-tight">{dayCopy}의 기록</h2>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))' }}>
                  {topTags.map(({ tag, count }) => (
                    <div key={tag.id} className="min-h-[92px] p-4 rounded-xl bg-surface shadow-float flex flex-col justify-between">
                      <strong className={`text-display font-bold ${tag.group === 'watch' ? 'text-coral' : 'text-green-dark'}`}>{count}</strong>
                      <span className="text-caption text-soft mt-2 leading-tight">{tag.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <button
            className="w-full flex flex-col items-center gap-3 py-7 px-6 rounded-xl bg-surface shadow-card text-center"
            onClick={handleOpenEditor}
          >
            <strong className="block text-[17px] font-[800] tracking-[-0.02em]">
              {isToday ? '오늘 첫 끼니를 기록해봐요' : '이날 기록이 없어요'}
            </strong>
            <small className="block text-caption text-muted leading-relaxed">
              {isToday ? '뭐 드셨어요? 간단하게 적어도 충분해요' : '이날의 끼니를 추가할 수 있어요'}
            </small>
            {canAdd && (
              <span className="inline-flex items-center justify-center min-h-[40px] px-5 rounded-full bg-primary text-bg text-caption font-bold">
                끼니 입력하기
              </span>
            )}
          </button>
        )}
      </section>
    </div>
  );
}
