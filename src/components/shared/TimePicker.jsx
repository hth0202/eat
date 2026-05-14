import { useRef, useEffect } from 'react';

const ITEM_H = 44;
const VISIBLE = 3;
const COL_H = ITEM_H * VISIBLE; // 132px
const PAD = Math.floor(VISIBLE / 2); // items above/below center

function WheelColumn({ items, value, getLabel, onChange, width }) {
  const scrollRef = useRef(null);
  const isUserScrolling = useRef(false);
  const debounceRef = useRef(null);

  const idx = Math.max(0, items.indexOf(value));

  // Mount: instant jump
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = idx * ITEM_H;
  }, []);

  // External value change: smooth scroll
  useEffect(() => {
    if (!isUserScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    }
  }, [value]);

  function onScroll() {
    isUserScrolling.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const i = Math.max(0, Math.min(
        Math.round(scrollRef.current.scrollTop / ITEM_H),
        items.length - 1
      ));
      scrollRef.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
      onChange(items[i]);
      setTimeout(() => { isUserScrolling.current = false; }, 250);
    }, 100);
  }

  return (
    // Wrapper: clips everything to fixed size
    <div style={{ position: 'relative', width, height: COL_H, overflow: 'hidden', flexShrink: 0 }}>

      {/* Center highlight — behind scroll content */}
      <div style={{
        position: 'absolute', left: 4, right: 4,
        top: ITEM_H * PAD, height: ITEM_H,
        background: '#f2f4f0', borderRadius: 8,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Scroll container — fills wrapper exactly */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          position: 'absolute', inset: 0,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          zIndex: 2,
        }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: ITEM_H * PAD }} />
        {items.map((item) => (
          <div
            key={item}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className="flex items-center justify-center text-body font-semibold text-ink tabular-nums whitespace-nowrap"
          >
            {getLabel ? getLabel(item) : item}
          </div>
        ))}
        <div style={{ height: ITEM_H * PAD }} />
      </div>

      {/* Top fade — over scroll content */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: ITEM_H * PAD,
        background: 'linear-gradient(to bottom, #fff 20%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: ITEM_H * PAD,
        background: 'linear-gradient(to top, #fff 20%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />
    </div>
  );
}

const PERIODS = ['오전', '오후'];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 30];

function parseTime(t) {
  const [h, m] = (t || '12:00').split(':').map(Number);
  return { period: h < 12 ? '오전' : '오후', hour: h % 12 || 12, minute: m === 30 ? 30 : 0 };
}

function toValue({ period, hour, minute }) {
  const h24 = period === '오전' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function TimePicker({ value, onChange }) {
  if (!value) {
    return (
      <button
        type="button"
        onClick={() => {
          const now = new Date();
          const min = now.getMinutes();
          const m = min >= 15 && min < 45 ? 30 : 0;
          const h = m === 0 && min >= 45 ? (now.getHours() + 1) % 24 : now.getHours();
          onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }}
        className="text-caption font-semibold text-primary"
      >
        입력
      </button>
    );
  }

  const { period, hour, minute } = parseTime(value);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: COL_H }}>
        <WheelColumn
          items={PERIODS} value={period} width={52}
          onChange={(p) => onChange(toValue({ period: p, hour, minute }))}
        />
        <WheelColumn
          items={HOURS} value={hour} width={40}
          onChange={(h) => onChange(toValue({ period, hour: h, minute }))}
        />
        <span style={{ fontSize: 18, fontWeight: 700, color: '#8a9984', flexShrink: 0, alignSelf: 'center' }}>:</span>
        <WheelColumn
          items={MINUTES} value={minute} width={44}
          getLabel={(m) => String(m).padStart(2, '0')}
          onChange={(m) => onChange(toValue({ period, hour, minute: m }))}
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        style={{ fontSize: 20, color: '#8a9984', lineHeight: 1, alignSelf: 'center', marginLeft: 4, flexShrink: 0 }}
        aria-label="시간 삭제"
      >×</button>
    </div>
  );
}
