import { useEffect } from 'react';

export default function BottomSheet({ onClose, children, className = '' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/[0.28]"
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-surface shadow-sheet safe-bottom ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-line" />
        {children}
      </div>
    </>
  );
}
