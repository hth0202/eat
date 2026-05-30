import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useHistoryBack } from '../../hooks/useHistoryBack';

export default function PhotoViewer() {
  const photoViewer = useAppStore((s) => s.photoViewer);
  const closePhotoViewer = useAppStore((s) => s.closePhotoViewer);
  const [idx, setIdx] = useState(photoViewer?.index ?? 0);

  useEffect(() => {
    if (photoViewer) setIdx(photoViewer.index ?? 0);
  }, [photoViewer]);

  useHistoryBack(closePhotoViewer);

  if (!photoViewer) return null;
  const { photos } = photoViewer;

  return (
    <div className="fixed inset-0 z-[100] bg-ink flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button
          onClick={closePhotoViewer}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white"
          aria-label="닫기"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        {photos.length > 1 && (
          <span className="text-white/80 text-caption font-semibold">
            {idx + 1} / {photos.length}
          </span>
        )}
        <div className="w-10" />
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center px-2 overflow-hidden">
        <img
          src={photos[idx]}
          alt={`사진 ${idx + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Nav */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-4 py-4 safe-bottom">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(photos.length - 1, i + 1))}
            disabled={idx === photos.length - 1}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
