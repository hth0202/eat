import { useAppStore } from '../../store/appStore';
import { countTags } from '../../utils/meal';
import { todayInsight } from '../../utils/insights';
import { mealsForDate } from '../../utils/meal';

export default function InsightBar({ dateKey, dayCopy = '오늘' }) {
  const appState = useAppStore((s) => s.appState);
  const meals = mealsForDate(appState?.meals ?? [], dateKey);
  const counts = countTags(meals);
  const text = todayInsight(meals, counts, dayCopy);

  return (
    <div className="mt-3 px-4 py-4 rounded-lg bg-primary-soft text-primary-dark text-13 font-semibold leading-relaxed">
      {text}
    </div>
  );
}
