import { useAppStore } from '../../store/appStore';
import { recommendedSlot, availableSlot } from '../../utils/meal';
import { todayKey } from '../../utils/date';

export default function BottomNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const openEditor = useAppStore((s) => s.openEditor);
  const appState = useAppStore((s) => s.appState);
  const viewedDate = useAppStore((s) => s.viewedDate);

  const meals = appState?.meals ?? [];
  const preferred = recommendedSlot(meals);
  const canAdd = !!availableSlot(meals, preferred, null, viewedDate);
  const isToday = viewedDate === todayKey();
  const addLabel = canAdd
    ? `${isToday ? '오늘' : '이날'} 끼니 기록 추가`
    : `${isToday ? '오늘' : '이날'} 기록 가능한 끼니 없음`;

  function handleAdd() {
    if (!canAdd) return;
    const slot = availableSlot(meals, preferred, null, viewedDate);
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

  const tabCls = (id) =>
    `flex flex-col items-center justify-center gap-1 w-full h-14 rounded-md font-semibold transition-colors ${
      activeTab === id
        ? 'bg-surface-strong text-green-dark shadow-float'
        : 'bg-transparent text-muted'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-surface-warm/[0.92] backdrop-blur-xl border-t border-line/80">
      <div className="grid grid-cols-[1fr_64px_1fr] w-full max-w-[432px] gap-2 items-center">

        {/* 홈 탭 */}
        <button className={tabCls('today')} onClick={() => setActiveTab('today')} aria-label="홈">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" />
          </svg>
          <span className="text-caption">홈</span>
        </button>

        {/* FAB */}
        <button
          className="justify-self-center flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-bg disabled:opacity-40"
          disabled={!canAdd}
          onClick={handleAdd}
          aria-label={addLabel}
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {/* 요약 탭 */}
        <button className={tabCls('flow')} onClick={() => setActiveTab('flow')} aria-label="요약">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-9" />
          </svg>
          <span className="text-caption">요약</span>
        </button>

      </div>
    </nav>
  );
}
