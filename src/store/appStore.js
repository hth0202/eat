import { create } from 'zustand';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, signOut as firebaseSignOut } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import {
  DEFAULT_TAGS, DEFAULT_TRACKED_TAGS, TRACKED_TAG_LIMIT,
  FULLNESS_OPTIONS, CARB_OPTIONS, SPEED_OPTIONS,
  MEAL_TITLE_LIMIT, MEAL_MEMO_LIMIT, CONDITION_NOTE_LIMIT,
  MAX_PHOTOS_PER_MEAL, SETTINGS_VERSION, STORAGE_KEY,
} from '../constants';
import { todayKey, effectiveDateKey } from '../utils/date';
import { applyTagToggle, normalizeTags, migrateSpeed } from '../utils/meal';
import { trimMealTitle, trimMealMemo } from '../utils/text';

const validIds = DEFAULT_TAGS.map((t) => t.id);
const removedIds = ['slow', 'overeat', 'sweet-drink'];

function normalizeState(raw) {
  const shouldRefresh = raw.settingsVersion !== SETTINGS_VERSION;
  const savedTags = Array.isArray(raw.selectedTags)
    ? raw.selectedTags.filter((id) => validIds.includes(id) && !removedIds.includes(id))
    : null;
  const selectedTags = shouldRefresh || !savedTags
    ? validIds
    : [...new Set([...savedTags, ...validIds.filter((id) => !raw.selectedTags.includes(id) && !removedIds.includes(id))])];
  const trackedTags = Array.isArray(raw.trackedTags)
    ? raw.trackedTags.filter((id) => validIds.includes(id))
    : DEFAULT_TRACKED_TAGS;

  return {
    meals: Array.isArray(raw.meals)
      ? raw.meals.map((meal) => {
          const ms = migrateSpeed(meal.speed);
          const rawPhotos = Array.isArray(meal.photos) ? meal.photos : meal.photo ? [meal.photo] : [];
          const { photo: _p, photos: _ph, ...rest } = meal;
          return {
            ...rest,
            title: trimMealTitle(meal.title || ''),
            memo: trimMealMemo(meal.memo || ''),
            createdAt: Number.isFinite(Number(meal.createdAt)) ? Number(meal.createdAt) : Date.now(),
            tags: normalizeTags((Array.isArray(meal.tags) ? meal.tags : []).filter((id) => validIds.includes(id) && !removedIds.includes(id))),
            fullness: FULLNESS_OPTIONS.includes(meal.fullness) ? meal.fullness : '적당함',
            carbs: CARB_OPTIONS.includes(meal.carbs) ? meal.carbs : '보통',
            speed: SPEED_OPTIONS.includes(ms) ? ms : '모르겠음',
            photos: rawPhotos.filter((p) => typeof p === 'string' && p).slice(0, MAX_PHOTOS_PER_MEAL),
          };
        })
      : [],
    selectedTags: selectedTags.length ? selectedTags : validIds,
    trackedTags: (trackedTags.length ? trackedTags : DEFAULT_TRACKED_TAGS).slice(0, TRACKED_TAG_LIMIT),
    favorites: Array.isArray(raw.favorites)
      ? raw.favorites.map((f) => ({
          id: typeof f.id === 'string' ? f.id : crypto.randomUUID(),
          fromMealId: typeof f.fromMealId === 'string' ? f.fromMealId : null,
          name: String(f.name || f.title || '').slice(0, 30).trim(),
          slot: ['아침', '점심', '저녁', '간식', '음료'].includes(f.slot) ? f.slot : '점심',
          title: trimMealTitle(f.title || ''),
          tags: normalizeTags((Array.isArray(f.tags) ? f.tags : []).filter((id) => validIds.includes(id) && !removedIds.includes(id))),
          fullness: FULLNESS_OPTIONS.includes(f.fullness) ? f.fullness : '적당함',
          carbs: CARB_OPTIONS.includes(f.carbs) ? f.carbs : '보통',
          speed: SPEED_OPTIONS.includes(migrateSpeed(f.speed)) ? migrateSpeed(f.speed) : '모르겠음',
          memo: trimMealMemo(f.memo || ''),
          lastUsedAt: Number.isFinite(Number(f.lastUsedAt)) ? Number(f.lastUsedAt) : Date.now(),
        }))
      : [],
    settingsVersion: SETTINGS_VERSION,
    dailyNotes: raw.dailyNotes && typeof raw.dailyNotes === 'object' && !Array.isArray(raw.dailyNotes)
      ? Object.fromEntries(
          Object.entries(raw.dailyNotes)
            .filter(([k, v]) => typeof k === 'string' && v && typeof v === 'object' && ['good', 'ok', 'bad'].includes(v.mood))
            .map(([k, v]) => [k, {
              mood: v.mood,
              memo: typeof v.memo === 'string' ? Array.from(v.memo).slice(0, CONDITION_NOTE_LIMIT).join('') : '',
            }])
        )
      : {},
    conditionPromptHour: Number.isInteger(raw.conditionPromptHour) && raw.conditionPromptHour >= 0 && raw.conditionPromptHour <= 23
      ? raw.conditionPromptHour : 6,
    lastConditionSkippedDate: typeof raw.lastConditionSkippedDate === 'string'
      ? raw.lastConditionSkippedDate : null,
  };
}

function mergeStates(cloud, local) {
  const cloudMeals = Array.isArray(cloud?.meals) ? cloud.meals : [];
  const localMeals = Array.isArray(local?.meals) ? local.meals : [];
  const allMeals = [...cloudMeals];
  localMeals.forEach((lm) => {
    if (!allMeals.find((cm) => cm.id === lm.id)) allMeals.push(lm);
  });

  const cloudFavs = Array.isArray(cloud?.favorites) ? cloud.favorites : [];
  const localFavs = Array.isArray(local?.favorites) ? local.favorites : [];
  const allFavs = [...cloudFavs];
  localFavs.forEach((lf) => {
    if (!allFavs.find((cf) => cf.id === lf.id)) allFavs.push(lf);
  });

  const cloudNotes = cloud?.dailyNotes || {};
  const localNotes = local?.dailyNotes || {};
  const mergedNotes = { ...localNotes, ...cloudNotes };

  return normalizeState({
    ...local,
    ...cloud,
    meals: allMeals,
    favorites: allFavs,
    dailyNotes: mergedNotes,
  });
}

let cloudSaveTimer = null;

export const useAppStore = create((set, get) => ({
  // Persisted data
  appState: null,

  // UI state
  activeTab: 'today',
  viewedDate: todayKey(),
  datePickerOpen: false,
  pickerMonth: todayKey().slice(0, 7),
  editor: null,
  mealDetailId: null,
  settingsOpen: false,
  tagEditMode: false,
  conditionSheet: null, // { date, selectedMood }
  toast: null,
  currentUser: null,
  photoViewer: null, // { photos, index }

  // ── Init ──────────────────────────────────────────────
  initState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    let parsed = {};
    if (saved) {
      try { parsed = JSON.parse(saved); } catch { /* ignore */ }
    }
    const state = normalizeState(parsed);
    const hour = state.conditionPromptHour ?? 0;
    set({ appState: state, viewedDate: effectiveDateKey(hour) });
  },

  // ── Persistence ───────────────────────────────────────
  saveAppState(nextState) {
    const state = nextState ?? get().appState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    set({ appState: state });
    get()._cloudSave();
  },

  _cloudSave() {
    const { currentUser, appState } = get();
    if (!currentUser) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (json) {
          await setDoc(doc(db, 'users', currentUser.uid), {
            state: json,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error('Cloud save failed:', err);
      }
    }, 1500);
  },

  async syncFromCloud(user) {
    set({ currentUser: user });
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const cloudRaw = JSON.parse(snap.data().state || '{}');
        const localRaw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const merged = mergeStates(cloudRaw, localRaw);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        set({ appState: merged });
      }
    } catch (err) {
      console.error('Cloud sync failed:', err);
    }
  },

  // ── Meals ─────────────────────────────────────────────
  addMeal(meal) {
    const { appState, saveAppState } = get();
    const next = { ...appState, meals: [...appState.meals, meal] };
    saveAppState(next);
  },

  updateMeal(id, updates) {
    const { appState, saveAppState } = get();
    const next = {
      ...appState,
      meals: appState.meals.map((m) => m.id === id ? { ...m, ...updates } : m),
    };
    saveAppState(next);
  },

  deleteMeal(id) {
    const { appState, saveAppState } = get();
    const next = { ...appState, meals: appState.meals.filter((m) => m.id !== id) };
    saveAppState(next);
  },

  // ── Favorites ─────────────────────────────────────────
  addFavorite(fav) {
    const { appState, saveAppState } = get();
    const existing = appState.favorites.find((f) => f.fromMealId === fav.fromMealId);
    if (existing) return false;
    const next = { ...appState, favorites: [fav, ...appState.favorites] };
    saveAppState(next);
    return true;
  },

  removeFavorite(id) {
    const { appState, saveAppState } = get();
    const next = { ...appState, favorites: appState.favorites.filter((f) => f.id !== id) };
    saveAppState(next);
  },

  isFavorite(mealId) {
    return get().appState?.favorites?.some((f) => f.fromMealId === mealId) ?? false;
  },

  // ── Tags ──────────────────────────────────────────────
  toggleTrackedTag(id) {
    const { appState, saveAppState } = get();
    const current = appState.trackedTags;
    let next;
    if (current.includes(id)) {
      next = current.filter((tid) => tid !== id);
    } else if (current.length < TRACKED_TAG_LIMIT) {
      next = [...current, id];
    } else {
      return;
    }
    saveAppState({ ...appState, trackedTags: next });
  },

  // ── Daily Notes (Condition) ───────────────────────────
  saveCondition(dateKey, mood, memo) {
    const { appState, saveAppState } = get();
    const next = {
      ...appState,
      dailyNotes: { ...appState.dailyNotes, [dateKey]: { mood, memo } },
    };
    saveAppState(next);
  },

  skipCondition() {
    const { appState, saveAppState } = get();
    saveAppState({ ...appState, lastConditionSkippedDate: effectiveDateKey(appState?.conditionPromptHour ?? 0) });
    set({ conditionSheet: null });
  },

  setConditionPromptHour(hour) {
    const { appState, saveAppState } = get();
    saveAppState({ ...appState, conditionPromptHour: hour });
  },

  // ── UI Actions ────────────────────────────────────────
  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewedDate: (date) => set({ viewedDate: date }),
  setDatePickerOpen: (open) => set({ datePickerOpen: open }),
  setPickerMonth: (month) => set({ pickerMonth: month }),
  openEditor: (editor) => set({ editor }),
  closeEditor: () => set({ editor: null }),
  openMealDetail: (id) => set({ mealDetailId: id }),
  closeMealDetail: () => set({ mealDetailId: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setTagEditMode: (v) => set({ tagEditMode: v }),
  openPhotoViewer: (photos, index = 0) => set({ photoViewer: { photos, index } }),
  closePhotoViewer: () => set({ photoViewer: null }),

  openConditionSheet(date, selectedMood = null) {
    const hour = get().appState?.conditionPromptHour ?? 0;
    set({ conditionSheet: { date: date ?? effectiveDateKey(hour), selectedMood } });
  },
  closeConditionSheet: () => set({ conditionSheet: null }),
  setConditionSheetMood: (mood) =>
    set((s) => ({ conditionSheet: s.conditionSheet ? { ...s.conditionSheet, selectedMood: mood } : null })),

  showToast(message) {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), 3000);
  },

  async signInWithGoogle() {
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      if (isPwa || isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error('Google 로그인 실패:', err);
    }
  },

  async signOut() {
    try {
      await firebaseSignOut(auth);
      set({ currentUser: null });
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  },

  shouldShowConditionPrompt() {
    const { appState } = get();
    const hour = appState?.conditionPromptHour ?? 0;
    const today = effectiveDateKey(hour);
    if (appState?.dailyNotes?.[today]?.mood) return false;
    if (appState?.lastConditionSkippedDate === today) return false;
    const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return kst.getHours() >= (appState?.conditionPromptHour ?? 6);
  },
}));
