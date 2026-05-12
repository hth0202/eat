import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { usePhotoDB } from '../../hooks/usePhotoDB';
import {
  MEAL_SLOTS, FULLNESS_OPTIONS, CARB_OPTIONS, SPEED_OPTIONS,
  MEAL_MEMO_LIMIT, MEAL_TITLE_LIMIT, FAVORITES_LIMIT,
  MAX_PHOTOS_PER_MEAL, MAX_PHOTO_EDGE, PHOTO_QUALITY,
} from '../../constants';
import { visibleTagsForSlot, slotIsTaken, applyTagToggle } from '../../utils/meal';
import { characterCount, trimMealMemo } from '../../utils/text';
import Chip from '../shared/Chip';
import TimePicker from '../shared/TimePicker';

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-caption font-semibold border transition-colors ${
            value === opt
              ? 'bg-primary-soft text-primary-dark border-primary-soft'
              : 'bg-surface-ui text-muted border-transparent'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
    };
    img.src = url;
  });
}

const EditIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
  </svg>
);
const GalleryIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
const TrashMenuIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
  </svg>
);

function PhotoMenuItem({ onClick, icon, label, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-4 py-3 text-left text-caption font-semibold active:bg-surface-ui ${danger ? 'text-coral border-t border-line' : 'text-ink'}`}
    >
      <span className="text-muted flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

export default function MealDetail() {
  const mealDetailId = useAppStore((s) => s.mealDetailId);
  const appState = useAppStore((s) => s.appState);
  const closeMealDetail = useAppStore((s) => s.closeMealDetail);
  const updateMeal = useAppStore((s) => s.updateMeal);
  const deleteMeal = useAppStore((s) => s.deleteMeal);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const removeFavorite = useAppStore((s) => s.removeFavorite);
  const isFavoriteFn = useAppStore((s) => s.isFavorite);
  const openPhotoViewer = useAppStore((s) => s.openPhotoViewer);
  const showToast = useAppStore((s) => s.showToast);
  const photoDB = usePhotoDB();

  const galleryRef = useRef(null);
  const replaceRef = useRef(null);

  const meal = appState?.meals?.find((m) => m.id === mealDetailId);
  const [draft, setDraft] = useState(null);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (meal) {
      setDraft(structuredClone(meal));
      loadPhotos(meal.photos);
    }
  }, [mealDetailId]);

  async function loadPhotos(photos) {
    const urls = await Promise.all(photos.map((id) => photoDB.get(id)));
    setPhotoUrls(urls.map((u, i) => u ?? photos[i]));
  }

  if (!meal || !draft) return null;

  const isFavorited = isFavoriteFn(meal.id);
  const visibleTags = visibleTagsForSlot(draft.slot, appState?.selectedTags ?? []);
  const categories = [...new Set(visibleTags.map((t) => t.category))];
  const canAddMore = draft.photos.length < MAX_PHOTOS_PER_MEAL;

  function update(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function toggleTag(id) {
    setDraft((d) => ({ ...d, tags: applyTagToggle(d.tags, id) }));
  }

  async function processFiles(files, replace = false) {
    const toProcess = replace ? files.slice(0, 1) : files.slice(0, MAX_PHOTOS_PER_MEAL - draft.photos.length);
    const newIds = [];
    const newUrls = [];
    for (const file of toProcess) {
      try {
        const dataUrl = await compressImage(file);
        const id = `photo-${crypto.randomUUID()}`;
        await photoDB.put(id, dataUrl);
        newIds.push(id);
        newUrls.push(dataUrl);
      } catch {
        showToast('저장 공간이 부족해요.');
        return;
      }
    }
    if (replace) {
      const oldId = draft.photos[photoIdx];
      if (oldId) await photoDB.del(oldId);
      setDraft((d) => ({ ...d, photos: d.photos.map((p, i) => i === photoIdx ? newIds[0] : p) }));
      setPhotoUrls((prev) => prev.map((u, i) => i === photoIdx ? newUrls[0] : u));
    } else {
      setDraft((d) => ({ ...d, photos: [...d.photos, ...newIds] }));
      setPhotoUrls((prev) => [...prev, ...newUrls]);
      setPhotoIdx(draft.photos.length);
    }
  }

  async function handlePhotoRemove() {
    if (!window.confirm('이 사진을 삭제할까요?')) return;
    const id = draft.photos[photoIdx];
    await photoDB.del(id);
    setDraft((d) => ({ ...d, photos: d.photos.filter((_, i) => i !== photoIdx) }));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== photoIdx));
    setPhotoIdx((i) => Math.max(0, i - 1));
    setMenuOpen(false);
  }

  function handleSave() {
    updateMeal(draft.id, { ...draft, memo: trimMealMemo(draft.memo) });
    closeMealDetail();
    showToast('저장했어요');
  }

  function handleDelete() {
    if (!window.confirm('이 기록을 삭제할까요? 삭제한 내용은 되돌릴 수 없어요')) return;
    deleteMeal(meal.id);
    closeMealDetail();
    showToast('삭제했어요');
  }

  function handleFavorite() {
    if (isFavorited) {
      const fav = appState.favorites.find((f) => f.fromMealId === meal.id);
      if (fav) { removeFavorite(fav.id); showToast('즐겨찾기에서 삭제했어요'); }
    } else {
      if (appState.favorites.length >= FAVORITES_LIMIT) { showToast(`즐겨찾기는 최대 ${FAVORITES_LIMIT}개까지 저장할 수 있어요`); return; }
      addFavorite({
        id: crypto.randomUUID(),
        fromMealId: meal.id,
        name: meal.title.split(',')[0].trim() || meal.slot,
        slot: meal.slot,
        title: meal.title,
        tags: [...meal.tags],
        fullness: meal.fullness,
        carbs: meal.carbs,
        speed: meal.speed,
        memo: meal.memo,
        lastUsedAt: Date.now(),
      });
      showToast('즐겨찾기에 저장했어요');
    }
  }

  const memoCount = characterCount(draft.memo);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-warm" onClick={() => menuOpen && setMenuOpen(false)}>
      {/* Header — star only, no X (닫기 is in footer) */}
      <div className="flex items-center justify-between px-4 safe-top pb-3 border-b border-line/90 bg-surface-warm/96 backdrop-blur sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-body">{draft.slot} 기록</h2>
          <p className="text-caption text-muted">내용을 바로 수정할 수 있어요</p>
        </div>
        <button
          type="button"
          onClick={handleFavorite}
          className={`w-10 h-10 grid place-items-center rounded-full ${isFavorited ? 'text-accent' : 'text-soft'}`}
          aria-label={isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Photo hero */}
        <div
          className={`relative w-full rounded-xl overflow-hidden flex-shrink-0 ${photoUrls.length ? '' : 'border border-dashed border-line bg-surface-strong'}`}
          style={{ height: 'clamp(132px, 24dvh, 188px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {photoUrls.length > 0 ? (
            <>
              <img
                src={photoUrls[photoIdx]}
                alt="식사 사진"
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => openPhotoViewer(photoUrls, photoIdx)}
              />
              {photoUrls.length > 1 && (
                <>
                  <span className="absolute top-3 right-3 text-[11px] font-bold text-white bg-black/[0.22] px-2 py-0.5 rounded-full tabular-nums pointer-events-none">
                    {photoIdx + 1}/{photoUrls.length}
                  </span>
                  <button type="button" disabled={photoIdx === 0}
                    onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full border border-white/[0.72] text-white/[0.92] disabled:opacity-25"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                    aria-label="이전 사진">‹</button>
                  <button type="button" disabled={photoIdx === photoUrls.length - 1}
                    onClick={() => setPhotoIdx((i) => Math.min(photoUrls.length - 1, i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full border border-white/[0.72] text-white/[0.92] disabled:opacity-25"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                    aria-label="다음 사진">›</button>
                </>
              )}
              <button type="button" onClick={() => setMenuOpen((v) => !v)}
                className="absolute right-3 bottom-3 w-8 h-8 grid place-items-center rounded-full bg-white/[0.88] text-[#3c3f45]"
                style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.22)' }}
                aria-label="사진 편집">
                <EditIcon />
              </button>
              {menuOpen && (
                <div className="absolute right-3 z-10 min-w-24 rounded-[14px] bg-surface overflow-hidden"
                  style={{ bottom: 'calc(12px + 32px + 6px)', boxShadow: '0 8px 24px rgba(25,31,40,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>
                  {canAddMore && (
                    <PhotoMenuItem onClick={() => { setMenuOpen(false); galleryRef.current?.click(); }} icon={<PlusIcon />} label="추가" />
                  )}
                  <PhotoMenuItem onClick={() => { setMenuOpen(false); replaceRef.current?.click(); }} icon={<GalleryIcon />} label="변경" />
                  <PhotoMenuItem onClick={handlePhotoRemove} icon={<TrashMenuIcon />} label="삭제" danger />
                </div>
              )}
            </>
          ) : (
            <button type="button" onClick={() => galleryRef.current?.click()}
              className="absolute inset-0 w-full grid place-items-center"
              aria-label="사진 추가">
              <span className="w-14 h-14 grid place-items-center rounded-[18px] bg-green-soft text-muted pointer-events-none">
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" />
                </svg>
              </span>
            </button>
          )}
          <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => processFiles(Array.from(e.target.files || []))} />
          <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={(e) => processFiles(Array.from(e.target.files || []), true)} />
        </div>

        {/* Slot */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2">끼니</label>
          <Segmented
            options={MEAL_SLOTS}
            value={draft.slot}
            onChange={(v) => {
              const taken = slotIsTaken(appState?.meals ?? [], v, draft.id, draft.date);
              if (!taken) update('slot', v);
            }}
          />
        </div>

        {/* Meal time */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2">먹은 시간</label>
          <TimePicker value={draft.mealTime} onChange={(v) => update('mealTime', v)} />
        </div>

        {/* Title */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2" htmlFor="detail-title">먹은 것</label>
          <input
            id="detail-title"
            className="w-full bg-transparent outline-none text-body text-ink placeholder:text-soft"
            maxLength={MEAL_TITLE_LIMIT}
            placeholder="예: 김밥, 계란국, 샐러드"
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>

        {/* Tags */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          {categories.map((cat) => (
            <div key={cat} className="mb-3 last:mb-0">
              <p className="text-[11px] font-bold text-soft mb-2">{cat}</p>
              <div className="flex flex-wrap gap-1.5">
                {visibleTags.filter((t) => t.category === cat).map((tag) => (
                  <Chip key={tag.id} tag={tag} active={draft.tags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Carbs */}
        {draft.slot !== '음료' && (
          <div className="bg-surface rounded-lg p-4 shadow-float">
            <label className="block text-caption font-bold text-muted mb-2">탄수화물 양</label>
            <Segmented options={CARB_OPTIONS} value={draft.carbs} onChange={(v) => update('carbs', v)} />
          </div>
        )}

        {/* Fullness */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2">포만감</label>
          <Segmented options={FULLNESS_OPTIONS} value={draft.fullness} onChange={(v) => update('fullness', v)} />
        </div>

        {/* Speed */}
        {draft.slot !== '음료' && (
          <div className="bg-surface rounded-lg p-4 shadow-float">
            <label className="block text-caption font-bold text-muted mb-2">먹는 속도</label>
            <Segmented options={SPEED_OPTIONS} value={draft.speed} onChange={(v) => update('speed', v)} />
          </div>
        )}

        {/* Memo */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2" htmlFor="detail-memo">메모</label>
          <textarea
            id="detail-memo"
            className="w-full bg-transparent outline-none text-body text-ink placeholder:text-soft resize-none min-h-[80px]"
            maxLength={MEAL_MEMO_LIMIT}
            placeholder="먹고 나서 어땠는지 남겨요"
            value={draft.memo}
            onChange={(e) => update('memo', e.target.value)}
          />
          <p className="text-[11px] text-soft text-right mt-1">{memoCount}/{MEAL_MEMO_LIMIT}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-4 py-3 border-t border-line pb-nav-safe bg-surface-warm/94 backdrop-blur">
        <button
          type="button"
          onClick={handleDelete}
          className="w-10 h-10 flex-shrink-0 grid place-items-center rounded-lg bg-coral-soft text-coral"
          aria-label="삭제"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7" />
          </svg>
        </button>
        <button type="button" onClick={closeMealDetail} className="flex-1 h-10 rounded-lg bg-surface-ui text-muted font-semibold text-caption">닫기</button>
        <button type="button" onClick={handleSave} className="flex-1 h-10 rounded-lg bg-primary text-bg font-semibold text-caption shadow-primary">저장</button>
      </div>
    </div>
  );
}
