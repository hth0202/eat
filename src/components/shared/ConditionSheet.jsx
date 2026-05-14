import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CONDITION_MOODS, CONDITION_NOTE_LIMIT } from '../../constants';
import BottomSheet from './BottomSheet';

export default function ConditionSheet() {
  const conditionSheet = useAppStore((s) => s.conditionSheet);
  const closeConditionSheet = useAppStore((s) => s.closeConditionSheet);
  const setConditionSheetMood = useAppStore((s) => s.setConditionSheetMood);
  const saveCondition = useAppStore((s) => s.saveCondition);
  const skipCondition = useAppStore((s) => s.skipCondition);
  const appState = useAppStore((s) => s.appState);

  const dateKey = conditionSheet?.date;
  const selectedMood = conditionSheet?.selectedMood ?? null;
  const existing = appState?.dailyNotes?.[dateKey];
  const isEdit = !!existing?.mood;

  const [memo, setMemo] = useState(existing?.memo ?? '');

  if (!conditionSheet) return null;

  function handleSave() {
    if (!selectedMood) return;
    saveCondition(dateKey, selectedMood, memo);
    closeConditionSheet();
  }

  const moodColors = {
    good: 'bg-primary-soft text-primary-dark',
    ok: 'bg-accent-soft text-accent-dark',
    bad: 'bg-coral-soft text-coral-dark',
  };

  return (
    <BottomSheet onClose={isEdit ? closeConditionSheet : undefined}>
      <div className="px-4 pb-2">
        <p className="text-center font-bold text-body mb-5">오늘 컨디션은요?</p>

        <div className="flex justify-center gap-4 mb-5">
          {CONDITION_MOODS.map((cfg) => (
            <button
              key={cfg.id}
              type="button"
              onClick={() => setConditionSheetMood(cfg.id)}
              aria-label={cfg.label}
              className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all ${
                selectedMood === cfg.id
                  ? `${moodColors[cfg.id]} border-current scale-105`
                  : 'bg-surface-ui text-soft border-transparent'
              }`}
            >
              <span className="text-[28px] leading-none">{cfg.face}</span>
              <span className="text-caption font-semibold">{cfg.label}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <textarea
            className="w-full border border-line rounded-md px-4 py-3 text-caption resize-none bg-transparent text-ink outline-none focus:border-primary h-14 pb-5"
            maxLength={CONDITION_NOTE_LIMIT}
            placeholder="한 줄 메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <span className="absolute bottom-2 right-3 text-[11px] text-soft pointer-events-none">
            {Array.from(memo).length}/{CONDITION_NOTE_LIMIT}
          </span>
        </div>

        <div className="flex gap-3">
          {isEdit ? (
            <button
              type="button"
              onClick={closeConditionSheet}
              className="flex-1 min-h-tap rounded-md bg-surface-ui text-muted font-semibold text-caption"
            >
              취소
            </button>
          ) : (
            <button
              type="button"
              onClick={skipCondition}
              className="flex-1 min-h-tap rounded-md bg-surface-ui text-muted font-semibold text-caption"
            >
              건너뛰기
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedMood}
            className="flex-1 min-h-tap rounded-md bg-primary text-bg font-semibold text-caption disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
