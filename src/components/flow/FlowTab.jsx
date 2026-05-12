import { useAppStore } from '../../store/appStore';
import { thisWeekMeals, recentMeals, countTags, getStreakDays } from '../../utils/meal';
import { thisWeekDateKeys, formatHistoryDate } from '../../utils/date';
import { flowInsight, getWeekHighlights } from '../../utils/insights';
import { tagById } from '../../utils/meal';
import { CONDITION_MOODS } from '../../constants';

const highlightColors = {
  great: 'bg-primary-soft text-primary-dark',
  good:  'bg-green-soft text-green-dark',
  watch: 'bg-coral-soft text-coral-dark',
};

export default function FlowTab() {
  const appState = useAppStore((s) => s.appState);
  const meals = appState?.meals ?? [];
  const weekMeals = thisWeekMeals(meals);
  const monthMeals = recentMeals(meals, 30);
  const weekCounts = countTags(weekMeals);
  const streak = getStreakDays(meals);
  const highlights = getWeekHighlights(weekMeals, weekCounts, streak);
  const insightText = flowInsight(weekMeals, monthMeals, weekCounts, streak);

  const trackedTags = (appState?.trackedTags ?? [])
    .map(tagById).filter(Boolean)
    .map((tag) => ({ ...tag, count: weekCounts[tag.id] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCount = Math.max(1, ...trackedTags.map((t) => t.count));

  const weekConditions = thisWeekDateKeys()
    .reverse()
    .map((dk) => ({ dateKey: dk, note: appState?.dailyNotes?.[dk] }))
    .filter(({ note }) => note?.mood);

  const metrics = [
    { value: weekMeals.length, label: '이번 주 기록' },
    { value: weekCounts.veg || 0, label: '채소를 챙긴 끼니' },
    { value: weekMeals.filter((m) => m.carbs === '많이').length, label: '탄수화물 많음' },
    { value: weekMeals.filter((m) => m.speed === '20분 이내').length, label: '20분 이내 식사' },
    { value: weekMeals.filter((m) => m.fullness === '적당함').length, label: '적당한 포만감' },
  ];

  return (
    <div>
      {/* Weekly Summary */}
      <section className="mt-5">
        <div className="mb-3">
          <h2 className="text-title font-semibold tracking-tight">이번 주 요약</h2>
          <p className="text-caption text-muted">이번 주 식습관이에요</p>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))' }}>
          {metrics.map(({ value, label }) => (
            <div key={label} className="min-h-[92px] p-4 rounded-xl bg-surface shadow-float flex flex-col justify-between">
              <strong className="text-display font-bold text-green-dark leading-none">{value}</strong>
              <span className="text-caption text-soft mt-2 leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tag trend */}
      <section className="mt-5">
        <h2 className="text-title font-semibold tracking-tight mb-3">자주 나온 태그</h2>
        {trackedTags.length ? (
          <div className="grid gap-3">
            {trackedTags.map((tag) => (
              <div key={tag.id}>
                <div className="flex justify-between text-caption font-semibold mb-1">
                  <span>{tag.label}</span>
                  <span className="text-muted">{tag.count}회</span>
                </div>
                <div className="h-2 rounded-full bg-surface-ui overflow-hidden">
                  <div
                    className={`h-full rounded-full bar-fill ${tag.group === 'watch' ? 'bg-coral' : 'bg-primary'}`}
                    style={{ width: `${(tag.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-caption text-muted">기록이 쌓이면 패턴이 보여요.</p>
        )}
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="mt-5">
          <h2 className="text-title font-semibold tracking-tight mb-3">이번 주 하이라이트</h2>
          <div className="grid gap-2">
            {highlights.map((h, i) => (
              <div key={i} className={`px-4 py-3 rounded-lg text-caption font-semibold ${highlightColors[h.type] ?? 'bg-surface-ui text-muted'}`}>
                {h.text}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Condition history */}
      {weekConditions.length > 0 && (
        <section className="mt-5">
          <h2 className="text-title font-semibold tracking-tight mb-3">이번 주 컨디션</h2>
          <div className="grid gap-2">
            {weekConditions.map(({ dateKey, note }) => {
              const cfg = CONDITION_MOODS.find((c) => c.id === note.mood);
              const moodStyles = {
                good: 'bg-primary-soft text-primary-dark',
                ok: 'bg-accent-soft text-accent-dark',
                bad: 'bg-coral-soft text-coral-dark',
              };
              return (
                <div key={dateKey} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${moodStyles[note.mood] ?? ''}`}>
                  <span className="text-xl leading-none">{cfg.face}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-caption text-muted">{formatHistoryDate(dateKey)}</span>
                    {note.memo && <p className="text-caption font-semibold truncate">{note.memo}</p>}
                  </div>
                  <span className="text-caption font-bold flex-shrink-0">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Insight */}
      <section className="mt-5 mb-2">
        <div className="p-4 rounded-lg bg-primary-soft text-primary-dark">
          <div className="mb-2">
            <span className="text-[11px] font-bold bg-primary text-bg px-2 py-0.5 rounded-full">이번 주 패턴</span>
          </div>
          <h3 className="font-bold text-body mb-1">
            {weekMeals.length ? '이번 주 기록이에요' : '기록을 시작해봐요'}
          </h3>
          <p className="text-caption leading-relaxed">{insightText}</p>
        </div>
      </section>
    </div>
  );
}
