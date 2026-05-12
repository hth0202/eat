import { useAppStore } from '../../store/appStore';
import { CONDITION_MOODS } from '../../constants';

export default function ConditionBar({ dateKey }) {
  const appState = useAppStore((s) => s.appState);
  const openConditionSheet = useAppStore((s) => s.openConditionSheet);

  const note = appState?.dailyNotes?.[dateKey];
  const cfg = note?.mood ? CONDITION_MOODS.find((c) => c.id === note.mood) : null;

  const moodStyles = {
    good: 'bg-surface border border-green-soft text-primary-dark',
    ok: 'bg-accent-soft border-0 text-accent-dark',
    bad: 'bg-coral-soft border-0 text-coral-dark',
  };

  if (cfg) {
    return (
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-3 ${moodStyles[note.mood]}`}
        onClick={() => openConditionSheet(dateKey, note.mood)}
        aria-label="컨디션 수정"
      >
        <span className="text-xl leading-none">{cfg.face}</span>
        <span className="flex-1 flex flex-col items-start min-w-0">
          <span className="text-caption font-bold">{cfg.label}</span>
          {note.memo && (
            <span className="text-caption text-muted truncate max-w-full">{note.memo}</span>
          )}
        </span>
        <span className="text-caption font-semibold opacity-60 flex-shrink-0">수정</span>
      </button>
    );
  }

  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-3 bg-surface border border-dashed border-line text-soft"
      onClick={() => openConditionSheet(dateKey)}
      aria-label="컨디션 기록"
    >
      <span className="text-xl leading-none">🌅</span>
      <span className="text-caption font-semibold">컨디션을 기록해봐요</span>
    </button>
  );
}
