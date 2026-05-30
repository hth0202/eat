import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useHistoryBack } from '../../hooks/useHistoryBack';
import { DEFAULT_TAGS, TRACKED_TAG_LIMIT } from '../../constants';
import Chip from '../shared/Chip';
import { tagById } from '../../utils/meal';

const CATEGORIES = ['줄이기', '챙기기', '식사 상황', '먹고 나서'];

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </svg>
  );
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function SettingsTab() {
  const appState = useAppStore((s) => s.appState);
  const closeSettings = useAppStore((s) => s.closeSettings);
  const toggleTrackedTag = useAppStore((s) => s.toggleTrackedTag);

  useHistoryBack(closeSettings);
  const removeFavorite = useAppStore((s) => s.removeFavorite);
  const setConditionPromptHour = useAppStore((s) => s.setConditionPromptHour);
  const showToast = useAppStore((s) => s.showToast);
  const currentUser = useAppStore((s) => s.currentUser);
  const signInWithGoogle = useAppStore((s) => s.signInWithGoogle);
  const signOut = useAppStore((s) => s.signOut);
  const [tagEditMode, setTagEditMode] = useState(false);

  const trackedTags = appState?.trackedTags ?? [];
  const selectedTags = appState?.selectedTags ?? [];
  const favorites = appState?.favorites ?? [];

  function handleHourChange(e) {
    const [h] = e.target.value.split(':').map(Number);
    if (Number.isInteger(h) && h >= 0 && h <= 23) {
      setConditionPromptHour(h);
    }
  }

  const hourStr = `${String(appState?.conditionPromptHour ?? 6).padStart(2, '0')}:00`;

  return (
    <div className="py-2">

      {/* Tracked tags */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-caption font-bold text-muted">
            요약에 표시{' '}
            <span className="text-soft font-normal">{trackedTags.length}/{TRACKED_TAG_LIMIT}</span>
          </p>
          <button
            className="text-caption font-semibold text-primary"
            onClick={() => setTagEditMode((v) => !v)}
          >
            {tagEditMode ? '완료' : '편집'}
          </button>
        </div>

        {tagEditMode ? (
          <>
            <p className="text-caption text-muted mb-3">최대 {TRACKED_TAG_LIMIT}개, 탭해서 선택·해제해요</p>
            {CATEGORIES.map((cat) => {
              const tags = DEFAULT_TAGS.filter((t) => selectedTags.includes(t.id) && t.category === cat);
              if (!tags.length) return null;
              return (
                <div key={cat} className="mb-3">
                  <p className="text-[11px] font-bold text-soft mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        tag={tag}
                        active={trackedTags.includes(tag.id)}
                        onClick={() => toggleTrackedTag(tag.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-wrap gap-2 mb-1">
            {trackedTags.length ? (
              trackedTags.map((id) => {
                const tag = tagById(id);
                return tag ? <Chip key={id} tag={tag} active disabled /> : null;
              })
            ) : (
              <span className="text-caption text-muted">아직 선택된 항목이 없어요</span>
            )}
          </div>
        )}
      </div>

      {/* Favorites */}
      <div className="mt-6">
        <p className="text-caption font-bold text-muted mb-2">
          즐겨찾기 <span className="text-soft font-normal">{favorites.length}개</span>
        </p>
        <div className="rounded-lg overflow-hidden border border-line">
          {favorites.length ? (
            favorites.map((fav, i) => (
              <div
                key={fav.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < favorites.length - 1 ? 'border-b border-line' : ''}`}
              >
                <span className="text-caption text-muted font-semibold w-8 flex-shrink-0">{fav.slot}</span>
                <span className="flex-1 text-body text-ink truncate">{fav.name || fav.title || fav.slot}</span>
                <button
                  className="text-coral opacity-70 active:opacity-100"
                  onClick={() => { removeFavorite(fav.id); showToast('즐겨찾기에서 삭제했어요'); }}
                  aria-label="삭제"
                >
                  <TrashIcon />
                </button>
              </div>
            ))
          ) : (
            <div className="px-4 py-4 text-caption text-muted">기록 화면에서 ★를 눌러 저장해요</div>
          )}
        </div>
      </div>

      {/* Condition settings */}
      <div className="mt-6">
        <p className="text-caption font-bold text-muted mb-2">컨디션 기록</p>
        <div className="rounded-lg overflow-hidden border border-line">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-body">하루 시작 시간</span>
            <input
              type="time"
              step="3600"
              value={hourStr}
              onChange={handleHourChange}
              className="text-caption font-semibold text-primary bg-transparent outline-none"
              aria-label="컨디션 알림 시작 시간"
            />
          </div>
          <div className="px-4 py-3 text-caption text-muted">
            이 시간부터 새 하루가 시작돼요. 컨디션도 이 시간 이후 처음 열 때 물어봐요
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="mt-6">
        <p className="text-caption font-bold text-muted mb-2">계정</p>
        <div className="rounded-lg overflow-hidden border border-line">
          {currentUser && !currentUser.isAnonymous ? (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-body text-ink truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                className="text-caption font-semibold text-muted ml-3 flex-shrink-0"
                onClick={signOut}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={signInWithGoogle}
            >
              <GoogleIcon />
              <span className="text-body">Google로 로그인</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
