import { useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { usePhotoDB } from '../../hooks/usePhotoDB';
import {
  MEAL_SLOTS, FULLNESS_OPTIONS, CARB_OPTIONS, SPEED_OPTIONS,
  MEAL_TITLE_LIMIT, MEAL_MEMO_LIMIT, MAX_PHOTOS_PER_MEAL,
  MAX_PHOTO_EDGE, PHOTO_QUALITY,
} from '../../constants';
import { visibleTagsForSlot, slotIsTaken, applyTagToggle } from '../../utils/meal';
import { characterCount, trimMealMemo, trimMealTitle } from '../../utils/text';
import { todayKey } from '../../utils/date';
import Chip from '../shared/Chip';
import TimePicker from '../shared/TimePicker';

function Segmented({ options, value, onChange, disabledOptions = [] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabledOptions.includes(opt)}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-caption font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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

function PhotoMenu({ children }) {
  return (
    <div className="absolute right-3 z-10 min-w-24 rounded-[14px] bg-surface overflow-hidden"
      style={{ bottom: 'calc(12px + 32px + 6px)', boxShadow: '0 8px 24px rgba(25,31,40,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  );
}

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

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" />
  </svg>
);
const GalleryIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
  </svg>
);
const TrashMenuIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
  </svg>
);

export default function MealEditor() {
  const editor = useAppStore((s) => s.editor);
  const closeEditor = useAppStore((s) => s.closeEditor);
  const addMeal = useAppStore((s) => s.addMeal);
  const appState = useAppStore((s) => s.appState);
  const showToast = useAppStore((s) => s.showToast);
  const openPhotoViewer = useAppStore((s) => s.openPhotoViewer);
  const photoDB = usePhotoDB();

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const replaceRef = useRef(null);

  const [draft, setDraft] = useState(() => editor ? { ...editor } : null);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!editor || !draft) return null;

  const meals = appState?.meals ?? [];
  const selectedTags = appState?.selectedTags ?? [];
  const favorites = appState?.favorites ?? [];

  const visibleTags = visibleTagsForSlot(draft.slot, selectedTags);
  const categories = [...new Set(visibleTags.map((t) => t.category))];

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
        showToast('저장 공간이 부족해요. 사진을 더 작은 파일로 바꾸거나 오래된 사진을 지워주세요.');
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

  async function handleSave() {
    if (!draft.title.trim()) { showToast('먹은 것을 입력해주세요'); return; }
    setSaving(true);
    addMeal({
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: trimMealTitle(draft.title),
      memo: trimMealMemo(draft.memo),
      date: draft.date || todayKey(),
      createdAt: draft.createdAt || Date.now(),
    });
    closeEditor();
    showToast('기록했어요');
    setSaving(false);
  }

  function applyFavorite(fav) {
    setDraft((d) => ({
      ...d,
      title: fav.title,
      tags: [...fav.tags],
      fullness: fav.fullness,
      carbs: fav.carbs,
      speed: fav.speed,
      memo: fav.memo,
    }));
  }

  const takenSlots = MEAL_SLOTS.filter((s) => slotIsTaken(meals, s, draft.id, draft.date));
  const memoCount = characterCount(draft.memo);
  const canAddMore = draft.photos.length < MAX_PHOTOS_PER_MEAL;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-warm" onClick={() => menuOpen && setMenuOpen(false)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 safe-top pb-3 bg-surface-warm/94 backdrop-blur border-b border-line/90 sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-body">끼니 기록</h2>
          <p className="text-caption text-muted">생각나는 만큼만 적어 주세요</p>
        </div>
        <button type="button" onClick={closeEditor} className="w-10 h-10 grid place-items-center text-soft">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div>
            <p className="text-caption font-bold text-muted mb-2">즐겨찾기</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {[...favorites].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)).map((fav) => (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => applyFavorite(fav)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-surface shadow-float text-center min-w-[72px]"
                >
                  <span className="text-caption font-bold text-primary">{fav.slot}</span>
                  <span className="text-[11px] text-muted truncate max-w-[64px]">{fav.name || fav.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo hero */}
        <div
          className={`relative w-full rounded-xl overflow-hidden flex-shrink-0 ${photoUrls.length ? '' : 'border border-dashed border-line bg-surface-strong'}`}
          style={{ height: 'clamp(180px, 34dvh, 320px)' }}
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
              {/* Edit button */}
              <button type="button" onClick={() => setMenuOpen((v) => !v)}
                className="absolute right-3 bottom-3 w-8 h-8 grid place-items-center rounded-full bg-white/[0.88] text-[#3c3f45]"
                style={{ boxShadow: '0 1px 5px rgba(0,0,0,0.22)' }}
                aria-label="사진 편집">
                <EditIcon />
              </button>
              {menuOpen && (
                <PhotoMenu>
                  {canAddMore && (
                    <PhotoMenuItem onClick={() => { setMenuOpen(false); galleryRef.current?.click(); }} icon={<PlusIcon />} label="추가" />
                  )}
                  <PhotoMenuItem onClick={() => { setMenuOpen(false); replaceRef.current?.click(); }} icon={<GalleryIcon />} label="변경" />
                  <PhotoMenuItem onClick={handlePhotoRemove} icon={<TrashMenuIcon />} label="삭제" danger />
                </PhotoMenu>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setMenuOpen((v) => !v)}
                className="absolute inset-0 w-full grid place-items-center"
                aria-label="사진 추가">
                <span className="w-14 h-14 grid place-items-center rounded-[18px] bg-green-soft text-muted pointer-events-none">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" />
                  </svg>
                </span>
              </button>
              {menuOpen && (
                <PhotoMenu>
                  <PhotoMenuItem onClick={() => { setMenuOpen(false); cameraRef.current?.click(); }} icon={<CameraIcon />} label="카메라로 찍기" />
                  <PhotoMenuItem onClick={() => { setMenuOpen(false); galleryRef.current?.click(); }} icon={<GalleryIcon />} label="앨범에서 선택" />
                </PhotoMenu>
              )}
            </>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => processFiles(Array.from(e.target.files || []))} />
          <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => processFiles(Array.from(e.target.files || []))} />
          <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={(e) => processFiles(Array.from(e.target.files || []), true)} />
        </div>

        {/* Slot */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2">끼니</label>
          <Segmented
            options={MEAL_SLOTS}
            value={draft.slot}
            disabledOptions={takenSlots.filter((s) => s !== draft.slot)}
            onChange={(v) => update('slot', v)}
          />
        </div>

        {/* Meal time */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2">
            먹은 시간 <span className="font-normal text-soft">(선택)</span>
          </label>
          <TimePicker value={draft.mealTime} onChange={(v) => update('mealTime', v)} />
        </div>

        {/* Title */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2" htmlFor="editor-title">먹은 것</label>
          <input
            id="editor-title"
            className="w-full bg-transparent outline-none text-body text-ink placeholder:text-soft"
            maxLength={MEAL_TITLE_LIMIT}
            placeholder="예: 김밥, 계란국, 샐러드"
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            autoFocus
          />
          <p className="text-[11px] text-soft mt-1">여러 개면 쉼표로 이어 적어도 좋아요</p>
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
            <label className="block text-caption font-bold text-muted mb-2">탄수화물 양 <span className="font-normal text-soft">(대략)</span></label>
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
            <label className="block text-caption font-bold text-muted mb-2">먹는 속도 <span className="font-normal text-soft">(선택)</span></label>
            <Segmented options={SPEED_OPTIONS} value={draft.speed} onChange={(v) => update('speed', v)} />
          </div>
        )}

        {/* Memo */}
        <div className="bg-surface rounded-lg p-4 shadow-float">
          <label className="block text-caption font-bold text-muted mb-2" htmlFor="editor-memo">메모</label>
          <textarea
            id="editor-memo"
            className="w-full bg-transparent outline-none text-body text-ink placeholder:text-soft resize-none min-h-[80px]"
            maxLength={MEAL_MEMO_LIMIT}
            placeholder="먹고 난 느낌을 남겨요"
            value={draft.memo}
            onChange={(e) => update('memo', e.target.value)}
          />
          <p className="text-[11px] text-soft text-right mt-1">{memoCount}/{MEAL_MEMO_LIMIT}</p>
        </div>
      </div>

      {/* Save */}
      <div className="px-4 py-3 border-t border-line pb-nav-safe bg-surface-warm/94 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-bg font-bold text-body shadow-primary disabled:opacity-60"
        >
          저장
        </button>
      </div>
    </div>
  );
}
