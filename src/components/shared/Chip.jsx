export default function Chip({ tag, active = false, disabled = false, onClick }) {
  const base = 'inline-flex items-center justify-center min-h-[32px] px-3 rounded-full border font-semibold text-caption transition-colors';
  const watchActive = 'bg-coral-soft text-coral-dark border-coral-soft';
  const watchIdle  = 'bg-surface-strong text-muted border-line';
  const careActive = 'bg-primary-soft text-primary-dark border-primary-soft';
  const careIdle   = 'bg-surface-strong text-muted border-line';

  const colorCls = tag.group === 'watch'
    ? (active ? watchActive : watchIdle)
    : (active ? careActive : careIdle);

  if (disabled) {
    return <span className={`${base} ${colorCls} cursor-default pointer-events-none`}>{tag.label}</span>;
  }

  return (
    <button
      type="button"
      className={`${base} ${colorCls} cursor-pointer active:opacity-70`}
      onClick={onClick}
    >
      {tag.label}
    </button>
  );
}
