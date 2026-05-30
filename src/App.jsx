import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import { useAppStore } from './store/appStore';

import BottomNav from './components/layout/BottomNav';
import HomeTab from './components/home/HomeTab';
import FlowTab from './components/flow/FlowTab';
import SettingsTab from './components/settings/SettingsTab';
import MealEditor from './components/meal/MealEditor';
import MealDetail from './components/meal/MealDetail';
import ConditionSheet from './components/shared/ConditionSheet';
import PhotoViewer from './components/shared/PhotoViewer';
import Toast from './components/shared/Toast';
import SearchSheet from './components/search/SearchSheet';

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export default function App() {
  const {
    appState, initState, syncFromCloud,
    activeTab, settingsOpen, openSettings, closeSettings,
    editor, mealDetailId, conditionSheet, photoViewer,
    openConditionSheet, shouldShowConditionPrompt,
  } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);

  // Init
  useEffect(() => {
    initState();
  }, []);

  // Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncFromCloud(user);
      } else {
        try { await signInAnonymously(auth); } catch { /* offline */ }
      }
    });
    return unsub;
  }, []);

  // Condition prompt
  useEffect(() => {
    if (!appState) return;
    if (conditionSheet) return;
    if (shouldShowConditionPrompt()) {
      openConditionSheet(null);
    }
  }, [appState?.meals?.length]);

  // Visibility change → re-check condition
  useEffect(() => {
    function onVisible() {
      if (!useAppStore.getState().conditionSheet && useAppStore.getState().shouldShowConditionPrompt()) {
        useAppStore.getState().openConditionSheet(null);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!appState) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <img src="/assets/kkinilog-rabbit-icon-512.png" alt="" className="w-16 h-16 opacity-50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-ink font-sans text-body">
      {settingsOpen ? (
        /* Settings */
        <main className="w-full min-h-dvh px-4 pb-7">
          <header className="sticky top-0 z-10 bg-bg flex items-center justify-between gap-3 mb-3 safe-top pb-3">
            <button className="w-10 h-10 grid place-items-center text-muted" onClick={closeSettings} aria-label="뒤로">
              <BackIcon />
            </button>
            <h2 className="text-body font-bold text-ink">설정</h2>
            <div className="w-10" />
          </header>
          <SettingsTab />
        </main>
      ) : (
        /* Main */
        <main className="w-full min-h-dvh px-4 pb-nav">
          <header className="sticky top-0 z-10 bg-bg flex items-center justify-between gap-3 mb-3 safe-top pb-3">
            <h1 className="text-[22px] font-bold tracking-[-0.04em] text-ink leading-none">끼니록</h1>
            <div className="flex items-center gap-0.5">
              <button
                className="w-10 h-10 grid place-items-center rounded-full text-muted"
                onClick={() => setSearchOpen(true)}
                aria-label="검색"
              >
                <SearchIcon />
              </button>
              <button
                className={`w-10 h-10 grid place-items-center rounded-full ${settingsOpen ? 'text-primary' : 'text-muted'}`}
                onClick={openSettings}
                aria-label="설정"
              >
                <GearIcon />
              </button>
            </div>
          </header>

          {activeTab === 'today' && <HomeTab />}
          {activeTab === 'flow' && <FlowTab />}
        </main>
      )}

      {!settingsOpen && <BottomNav />}

      {/* Overlays */}
      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} />}
      {editor && <MealEditor />}
      {mealDetailId && <MealDetail />}
      {conditionSheet && <ConditionSheet />}
      {photoViewer && <PhotoViewer />}

      <Toast />
    </div>
  );
}
