const mealSlots = ["아침", "점심", "저녁", "간식", "음료"];

const defaultTags = [
  { id: "flour", label: "밀가루", group: "watch", category: "줄이기", hideInSlots: ["음료"] },
  { id: "sweet", label: "당(설탕)", group: "watch", category: "줄이기" },
  { id: "caffeine", label: "카페인", group: "watch", category: "줄이기", onlySlots: ["음료"] },
  { id: "fried", label: "기름짐", group: "watch", category: "줄이기", hideInSlots: ["음료"] },
  { id: "spicy", label: "매움", group: "watch", category: "줄이기", hideInSlots: ["음료"] },
  { id: "sodium", label: "나트륨(염분)", group: "watch", category: "줄이기", hideInSlots: ["음료"] },
  { id: "late", label: "야식", group: "watch", category: "식사 상황", onlySlots: ["저녁", "간식"] },
  { id: "delivery", label: "배달/외식", group: "watch", category: "식사 상황", hideInSlots: ["음료"], exclusiveGroup: "source" },
  { id: "veg", label: "채소", group: "care", category: "챙기기", hideInSlots: ["음료"] },
  { id: "protein", label: "단백질", group: "care", category: "챙기기", hideInSlots: ["음료"] },
  { id: "water", label: "물", group: "care", category: "챙기기", onlySlots: ["음료"] },
  { id: "home", label: "집밥", group: "care", category: "식사 상황", hideInSlots: ["음료"], exclusiveGroup: "source" },
  { id: "fruit", label: "과일", group: "care", category: "챙기기", hideInSlots: ["음료"] },
  { id: "comfortable", label: "속 편함", group: "care", category: "먹고 나서", exclusiveGroup: "stomach" },
  { id: "sleepy", label: "졸림", group: "watch", category: "먹고 나서" },
  { id: "bloat", label: "더부룩함", group: "watch", category: "먹고 나서", exclusiveGroup: "stomach" }
];

const appParams = new URLSearchParams(window.location.search);
const appVersion = appParams.get("v") || "dev";
const storageKey = `kkinilog-state-v1-${appVersion}`;
const defaultTrackedTags = ["flour", "sweet", "veg"];
const trackedTagLimit = 5;
const favoritesLimit = 8;
const mealTitleLimit = 30;
const mealMemoLimit = 100;
const maxPhotoEdge = 1280;
const photoQuality = 0.82;
const repeatableMealSlots = ["간식", "음료"];

firebase.initializeApp({
  apiKey: "AIzaSyBY_c_z6l6uY8GY_ehbRDF9LJ4hXMIoH6s",
  authDomain: "kkinilog.firebaseapp.com",
  projectId: "kkinilog",
  storageBucket: "kkinilog.firebasestorage.app",
  messagingSenderId: "945942920504",
  appId: "1:945942920504:web:7f2ea690d1e95038ed15cd"
});
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
let cloudSaveTimer = null;

function cloudSave() {
  if (!currentUser) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    try {
      const stateJson = localStorage.getItem(storageKey);
      if (stateJson) {
        await db.collection("users").doc(currentUser.uid).set({
          state: stateJson,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Cloud save failed:", err);
    }
  }, 1500);
}

const photoDB = (() => {
  let db = null;
  const open = () => new Promise((resolve) => {
    const req = indexedDB.open("kkinilog-photos", 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore("photos");
    req.onsuccess = (e) => { db = e.target.result; resolve(); };
    req.onerror = () => resolve();
  });
  const put = (id, dataUrl) => new Promise((resolve) => {
    if (!db) { resolve(); return; }
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(dataUrl, id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  const get = (id) => new Promise((resolve) => {
    if (!db) { resolve(null); return; }
    const tx = db.transaction("photos", "readonly");
    const req = tx.objectStore("photos").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
  const del = (id) => new Promise((resolve) => {
    if (!db) { resolve(); return; }
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  return { open, put, get, del };
})();

const photoCache = new Map();
const mealSlotOrder = { 아침: 0, 점심: 1, 저녁: 2, 간식: 3, 음료: 4 };
const fullnessOptions = [
  "배고픔만 겨우 채움",
  "가볍게 먹음",
  "적당함",
  "적당에서 약간 배부름",
  "배 터질 것 같음"
];
const carbOptions = ["없음", "적게", "보통", "많이"];
const speedOptions = ["모르겠음", "10분 이내", "20-30분", "1시간 이상"];
const trashIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 15h10l1-15" />
    <path d="M10 10v7" />
    <path d="M14 10v7" />
  </svg>
`;

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const todayKey = () => formatDateKey(new Date());

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function addDays(dateKey, days) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function isToday(dateKey) {
  return dateKey === todayKey();
}

let state = null;
let activeTab = "today";
let viewedDate = todayKey();
let datePickerOpen = false;
let pickerMonth = todayKey().slice(0, 7);
let editor = null;
let mealDetailId = null;
let detailDraft = null;
let settingsOpen = false;
let tagEditMode = false;

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  return normalizeState({
    meals: [],
    selectedTags: defaultTags.map((tag) => tag.id),
    trackedTags: defaultTrackedTags
  });
}

function normalizeState(raw) {
  const validIds = defaultTags.map((tag) => tag.id);
  const removedIds = ["slow", "overeat", "sweet-drink"];
  const shouldRefreshTagDefaults = raw.settingsVersion !== 4;
  const selectedTags = shouldRefreshTagDefaults
    ? validIds
    : Array.isArray(raw.selectedTags)
    ? raw.selectedTags.filter((id) => validIds.includes(id) && !removedIds.includes(id))
    : validIds;
  const trackedTags = Array.isArray(raw.trackedTags)
    ? raw.trackedTags.filter((id) => validIds.includes(id))
    : defaultTrackedTags;

  return {
    meals: Array.isArray(raw.meals)
        ? raw.meals.map((meal) => ({
          ...meal,
          title: trimMealTitle(meal.title || ""),
          memo: trimMealMemo(meal.memo || ""),
          createdAt: Number.isFinite(Number(meal.createdAt)) ? Number(meal.createdAt) : Date.now(),
          tags: normalizeTags(Array.isArray(meal.tags) ? meal.tags.filter((id) => validIds.includes(id) && !removedIds.includes(id)) : []),
          fullness: fullnessOptions.includes(meal.fullness) ? meal.fullness : "적당함",
          carbs: carbOptions.includes(meal.carbs) ? meal.carbs : "보통",
          speed: speedOptions.includes(meal.speed) ? meal.speed : "모르겠음"
        }))
      : [],
    selectedTags: selectedTags.length ? selectedTags : validIds,
    trackedTags: (trackedTags.length ? trackedTags : defaultTrackedTags).slice(0, trackedTagLimit),
    favorites: Array.isArray(raw.favorites)
      ? raw.favorites.map((f) => ({
          id: typeof f.id === "string" ? f.id : crypto.randomUUID(),
          fromMealId: typeof f.fromMealId === "string" ? f.fromMealId : null,
          name: String(f.name || f.title || "").slice(0, 30).trim(),
          slot: mealSlots.includes(f.slot) ? f.slot : "점심",
          title: trimMealTitle(f.title || ""),
          tags: normalizeTags((Array.isArray(f.tags) ? f.tags : []).filter((id) => validIds.includes(id) && !removedIds.includes(id))),
          fullness: fullnessOptions.includes(f.fullness) ? f.fullness : "적당함",
          carbs: carbOptions.includes(f.carbs) ? f.carbs : "보통",
          speed: speedOptions.includes(f.speed) ? f.speed : "모르겠음",
          memo: trimMealMemo(f.memo || ""),
          lastUsedAt: Number.isFinite(Number(f.lastUsedAt)) ? Number(f.lastUsedAt) : Date.now()
        }))
      : [],
    settingsVersion: 4
  };
}

function normalizeTags(tags) {
  return tags.reduce((nextTags, id) => applyTagToggle(nextTags, id, true), []);
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    cloudSave();
    return true;
  } catch (error) {
    console.error(error);
    window.alert("저장 공간이 부족해요. 사진을 더 작은 파일로 바꾸거나 오래된 사진을 지워주세요.");
    return false;
  }
}

function trimMealTitle(value) {
  return String(value || "").trim().slice(0, mealTitleLimit);
}

function trimMealMemo(value) {
  return Array.from(String(value || "").trim()).slice(0, mealMemoLimit).join("");
}

function characterCount(value) {
  return Array.from(String(value || "")).length;
}

function tagById(id) {
  return defaultTags.find((tag) => tag.id === id);
}

function applyTagToggle(currentTags, id, forceAdd = false) {
  const tag = tagById(id);
  if (!tag) return currentTags;

  const exists = currentTags.includes(id);
  if (exists && !forceAdd) {
    return currentTags.filter((tagId) => tagId !== id);
  }

  let nextTags = currentTags;
  if (tag.exclusiveGroup) {
    nextTags = nextTags.filter((tagId) => tagById(tagId)?.exclusiveGroup !== tag.exclusiveGroup);
  }

  return nextTags.includes(id) ? nextTags : [...nextTags, id];
}

function visibleTagsForSlot(slot) {
  return defaultTags.filter((tag) => {
    if (!state.selectedTags.includes(tag.id)) return false;
    if (tag.onlySlots && !tag.onlySlots.includes(slot)) return false;
    if (tag.hideInSlots && tag.hideInSlots.includes(slot)) return false;
    return true;
  });
}

function mealsForDate(dateKey = viewedDate) {
  return sortMealsForDisplay(state.meals.filter((meal) => meal.date === dateKey));
}

function slotIsTaken(slot, exceptId = null, date = todayKey()) {
  if (isRepeatableMealSlot(slot)) return false;
  return state.meals.some((meal) => meal.date === date && meal.slot === slot && meal.id !== exceptId);
}

function availableSlot(preferredSlot = recommendedSlot(), exceptId = null, date = todayKey()) {
  if (preferredSlot && !slotIsTaken(preferredSlot, exceptId, date)) {
    return preferredSlot;
  }
  return mealSlots.find((slot) => !slotIsTaken(slot, exceptId, date)) || null;
}

function hasAvailableMealSlot(date = viewedDate) {
  return Boolean(availableSlot(recommendedSlot(), null, date));
}

function isRepeatableMealSlot(slot) {
  return repeatableMealSlots.includes(slot);
}

function sortMealsForDisplay(meals) {
  const mainMeals = meals.filter((meal) => !isRepeatableMealSlot(meal.slot));
  return [...meals].sort((a, b) => {
    const aOrder = displayOrderForMeal(a, mainMeals);
    const bOrder = displayOrderForMeal(b, mainMeals);
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aCreatedAt = Number(a.createdAt || 0);
    const bCreatedAt = Number(b.createdAt || 0);
    if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function displayOrderForMeal(meal, mainMeals) {
  if (!isRepeatableMealSlot(meal.slot)) {
    return (mealSlotOrder[meal.slot] ?? 10) * 1000;
  }

  const mealCreatedAt = Number(meal.createdAt || 0);
  const anchorOrder = mainMeals.reduce((latestOrder, mainMeal) => {
    const mainCreatedAt = Number(mainMeal.createdAt || 0);
    if (mainCreatedAt > mealCreatedAt) return latestOrder;
    return Math.max(latestOrder, mealSlotOrder[mainMeal.slot] ?? latestOrder);
  }, -1);

  return anchorOrder * 1000 + 500;
}

function monthKeyFor(dateKey) {
  return dateKey.slice(0, 7);
}

function addMonths(monthKey, months) {
  const date = dateFromKey(`${monthKey}-01`);
  date.setMonth(date.getMonth() + months);
  return formatDateKey(date).slice(0, 7);
}

function formatMonthLabel(monthKey) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long"
  }).format(dateFromKey(`${monthKey}-01`));
}

function daysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function groupedMealsByDate(meals) {
  const groups = meals.reduce((nextGroups, meal) => {
    nextGroups[meal.date] = nextGroups[meal.date] || [];
    nextGroups[meal.date].push(meal);
    return nextGroups;
  }, {});

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayMeals]) => ({ date, meals: sortMealsForDisplay(dayMeals) }));
}

function recentMeals(days) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return state.meals.filter((meal) => dateFromKey(meal.date) >= start);
}

function classForTag(tag) {
  return tag?.group === "watch" ? "watch" : "care";
}

function countTags(meals) {
  return meals.reduce((acc, meal) => {
    meal.tags.forEach((tagId) => {
      acc[tagId] = (acc[tagId] || 0) + 1;
    });
    return acc;
  }, {});
}

function appIcon() {
  return `
    <img src="./assets/kkinilog-rabbit-icon-512.png" alt="" />
  `;
}

function gearIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  `;
}

function homeIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  `;
}

function chartIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-9" />
    </svg>
  `;
}

function plusIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  `;
}

function closeIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  `;
}

function backIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  `;
}

function checkIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  `;
}

function editIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  `;
}

function starIcon(filled = false) {
  return filled
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="none" fill="currentColor"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
}

function cameraIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  `;
}

function galleryIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  `;
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast--visible"));
  setTimeout(() => {
    el.classList.remove("toast--visible");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }, 3000);
}

function getSettingsRoot() {
  let el = document.getElementById("settings-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "settings-root";
    document.body.appendChild(el);
  }
  return el;
}

function render() {
  if (!state) return;
  const root = document.querySelector("#app");

  if (settingsOpen) {
    root.innerHTML = `
      <main class="shell shell--settings">
        <header class="topbar">
          <button class="icon-button" data-close-settings aria-label="뒤로">${backIcon()}</button>
          <h2 class="topbar-title">설정</h2>
          <div style="width:40px"></div>
        </header>
        ${renderSettingsPage()}
      </main>
      ${editor ? renderEditor() : ""}
      ${mealDetailId ? renderMealDetail() : ""}
    `;
  } else {
    root.innerHTML = `
      <main class="shell">
        <header class="topbar">
          <h1 class="wordmark">끼니록</h1>
          <button class="setting-btn" data-toggle-settings aria-label="설정">${gearIcon()}</button>
        </header>
        ${activeTab === "today" ? renderToday() : ""}
        ${activeTab === "flow" ? renderFlow() : ""}
      </main>
      ${renderTabs()}
      ${editor ? renderEditor() : ""}
      ${mealDetailId ? renderMealDetail() : ""}
    `;
  }

  getSettingsRoot().innerHTML = "";
  bindEvents();
}

function renderToday() {
  const meals = mealsForDate(viewedDate);
  const counts = countTags(meals);
  const trackedTodayTags = state.trackedTags
    .map(tagById)
    .filter(Boolean);
  const viewedDateLabel = formatHomeDate(viewedDate);
  const previousDate = addDays(viewedDate, -1);
  const nextDate = addDays(viewedDate, 1);
  const canGoNext = nextDate <= todayKey();
  const dayCopy = isToday(viewedDate) ? "오늘" : "이날";

  return `
    <section class="date-nav" aria-label="홈 날짜 이동">
      <button class="date-nav-button" data-view-date="${previousDate}" aria-label="이전 날짜">‹</button>
      <button class="date-current" type="button" data-toggle-date-picker aria-expanded="${datePickerOpen}">
        <strong>${viewedDateLabel}</strong>
        <span>${isToday(viewedDate) ? "오늘" : "지난 기록"}</span>
      </button>
      <button class="date-nav-button" ${canGoNext ? `data-view-date="${nextDate}"` : "disabled"} aria-label="다음 날짜">›</button>
      ${datePickerOpen ? renderDatePicker() : ""}
    </section>

    <div class="insight-bar">${todayInsight(meals, counts, dayCopy)}</div>

    <section class="section">
      ${meals.length ? `<div class="meal-list">${meals.map(renderMealCard).join("")}</div>${renderAddMealCta()}` : renderEmptyTodayCta()}
    </section>

    ${trackedTodayTags.length ? `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">${dayCopy}의 기록</h2>
      </div>
      <div class="overview-grid">
        ${trackedTodayTags
          .map(
            (tag) => `
              <div class="metric">
                <strong>${counts[tag.id] || 0}</strong>
                <span>${tag.label}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>` : ""}

  `;
}

function renderEmptyTodayCta() {
  return `
    <button class="empty-today-cta" data-open-editor>
      <strong>오늘 첫 끼니를 기록해봐요</strong>
      <small>뭐 드셨어요? 간단하게 적어도 충분해요</small>
    </button>
  `;
}

function renderAddMealCta() {
  const canAddMeal = hasAvailableMealSlot(viewedDate);
  const dayCopy = isToday(viewedDate) ? "오늘" : "이날";
  return `
    <button class="empty-cta empty-cta-compact" ${canAddMeal ? "data-open-editor" : "disabled"}>
      <span class="empty-cta-icon">${canAddMeal ? plusIcon() : checkIcon()}</span>
      <span>
        <strong>${canAddMeal ? "이어서 기록하기" : `${dayCopy} 끼니는 다 기록했어요`}</strong>
        <small>${canAddMeal ? "다음 끼니를 이어서 기록해요" : "카드를 누르면 수정할 수 있어요"}</small>
      </span>
    </button>
  `;
}

function renderFavoriteChips() {
  return `
    <section class="favorites-section">
      <div class="favorites-scroll">
        ${state.favorites.map((fav) => `
          <button class="fav-chip" data-open-favorite="${fav.id}" aria-label="${escapeHtml(fav.name || fav.slot)} 기록하기">
            <span class="fav-chip-slot">${fav.slot}</span>
            <span class="fav-chip-name">${escapeHtml(fav.name || fav.title || fav.slot)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDatePicker() {
  const today = todayKey();
  const firstDay = dateFromKey(`${pickerMonth}-01`).getDay();
  const totalDays = daysInMonth(pickerMonth);
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push(`<span class="date-cell empty"></span>`);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${pickerMonth}-${String(day).padStart(2, "0")}`;
    const isFuture = dateKey > today;
    const isSelected = dateKey === viewedDate;
    cells.push(`
      <button
        type="button"
        class="date-cell ${isSelected ? "active" : ""} ${dateKey === today ? "today" : ""}"
        ${isFuture ? "disabled" : `data-select-date="${dateKey}"`}
      >${day}</button>
    `);
  }

  return `
    <div class="date-picker-popover" role="dialog" aria-label="날짜 선택">
      <div class="date-picker-head">
        <button type="button" data-picker-month="${addMonths(pickerMonth, -1)}" aria-label="이전 달">‹</button>
        <strong>${formatMonthLabel(pickerMonth)}</strong>
        <button type="button" ${pickerMonth >= monthKeyFor(today) ? "disabled" : `data-picker-month="${addMonths(pickerMonth, 1)}"`} aria-label="다음 달">›</button>
      </div>
      <div class="date-weekdays" aria-hidden="true">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>
      <div class="date-grid">
        ${cells.join("")}
      </div>
      <button class="date-today-button" type="button" data-select-date="${today}">오늘로 이동</button>
    </div>
  `;
}

function renderMealCard(meal) {
  const tags = meal.tags.map(tagById).filter(Boolean);
  const details = [meal.fullness];
  if (meal.slot !== "음료" && meal.carbs) {
    details.push(`탄수화물 ${meal.carbs}`);
  }
  if (meal.speed && meal.speed !== "모르겠음") {
    details.push(meal.speed);
  }

  return `
    <button class="meal-card" data-view-meal="${meal.id}">
      <div class="meal-card-head">
        <div>
          <p class="meal-slot-label">${meal.slot}</p>
          <h3 class="meal-card-title">${formatMealCardTitle(meal.title)}</h3>
          <p class="meal-summary">${details.join(" · ")}</p>
        </div>
        <span class="meal-add">›</span>
      </div>
      <div class="tagline">
        ${tags.slice(0, 4).map((tag) => `<span class="tag ${classForTag(tag)}">${tag.label}</span>`).join("")}
      </div>
    </button>
  `;
}

function formatMealCardTitle(title) {
  const items = mealTitleItems(title);
  if (!items.length) return "제목 없음";
  const extraCount = items.length - 1;
  const extraCopy = extraCount ? ` <span class="meal-card-extra">외 ${extraCount}가지</span>` : "";
  return `${escapeHtml(truncateText(items[0], 10))}${extraCopy}`;
}

function mealTitleItems(title) {
  return String(title || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function truncateText(value, limit) {
  const letters = Array.from(value);
  return letters.length > limit ? `${letters.slice(0, limit).join("")}...` : value;
}

function renderMealDetail() {
  const meal = state.meals.find((item) => item.id === mealDetailId);
  if (!meal) {
    mealDetailId = null;
    detailDraft = null;
    return "";
  }

  if (!detailDraft || detailDraft.id !== meal.id) {
    detailDraft = structuredClone(meal);
  }

  const detailTags = visibleTagsForSlot(detailDraft.slot);
  const detailCategories = [...new Set(detailTags.map((tag) => tag.category))];
  const detailMemoCount = characterCount(detailDraft.memo);

  const isFavorited = state.favorites.some((f) => f.fromMealId === detailDraft.id);

  return `
    <div class="modal detail-modal" role="dialog" aria-modal="true" aria-label="${meal.slot} 상세 보기">
      <form class="sheet detail-sheet" data-detail-form>
        <div class="sheet-head">
          <div>
            <h2 class="sheet-title">${detailDraft.slot} 기록</h2>
            <p class="section-note">내용을 바로 수정할 수 있어요</p>
          </div>
          <div class="sheet-head-actions">
            <button class="icon-button star-btn ${isFavorited ? "favorited" : ""}" type="button" data-toggle-favorite="${detailDraft.id}" aria-label="${isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}">${starIcon(isFavorited)}</button>
            <button class="icon-button" type="button" data-close-detail>${closeIcon()}</button>
          </div>
        </div>

        <div class="sheet-body detail-body">
          ${renderPhotoHero(detailDraft.photo, "detail")}

          <div class="detail-card">
            <label class="detail-label">끼니</label>
            <div class="segmented meal-segment" data-detail-segment="slot">
              ${mealSlots
                .map((value) => {
                  const isTaken = slotIsTaken(value, detailDraft.id, detailDraft.date);
                  return `<button type="button" class="${detailDraft.slot === value ? "active" : ""}" data-value="${value}" ${isTaken ? "disabled" : ""}>${value}</button>`;
                })
                .join("")}
            </div>
          </div>

          <div class="detail-card">
            <label class="detail-label" for="detail-title">먹은 것</label>
            <input class="input" id="detail-title" name="title" value="${escapeHtml(detailDraft.title)}" maxlength="${mealTitleLimit}" placeholder="예: 김밥, 계란국, 샐러드" />
          </div>

          <div class="detail-card check-card">
            <div class="tag-category-list">
              ${detailCategories
                .map(
                  (category) => `
                    <div class="tag-category">
                      <p>${category}</p>
                      <div class="chip-grid">
                        ${detailTags
                          .filter((tag) => tag.category === category)
                          .map(
                            (tag) => `
                              <button type="button" class="chip ${tag.group} ${detailDraft.tags.includes(tag.id) ? "active" : ""}" data-detail-tag="${tag.id}">
                                ${tag.label}
                              </button>
                            `
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>

          ${
            detailDraft.slot !== "음료"
              ? `<div class="detail-card">
                  <label class="detail-label">탄수화물 양</label>
                  <div class="segmented carbs" data-detail-segment="carbs">
                    ${carbOptions.map((value) => `<button type="button" class="${detailDraft.carbs === value ? "active" : ""}" data-value="${value}">${value}</button>`).join("")}
                  </div>
                </div>`
              : ""
          }

          <div class="detail-card">
            <label class="detail-label">포만감</label>
            <div class="segmented fullness" data-detail-segment="fullness">
              ${fullnessOptions.map((value) => `<button type="button" class="${detailDraft.fullness === value ? "active" : ""}" data-value="${value}">${value}</button>`).join("")}
            </div>
          </div>

          ${
            detailDraft.slot !== "음료"
              ? `<div class="detail-card">
                  <label class="detail-label">먹는 속도</label>
                  <div class="segmented speed" data-detail-segment="speed">
                    ${speedOptions.map((value) => `<button type="button" class="${detailDraft.speed === value ? "active" : ""}" data-value="${value}">${value}</button>`).join("")}
                  </div>
                </div>`
              : ""
          }

          <div class="detail-card">
            <label class="detail-label" for="detail-memo">메모</label>
            <textarea class="textarea" id="detail-memo" name="memo" maxlength="${mealMemoLimit}" data-memo-input placeholder="먹고 나서 어땠는지 남겨요">${escapeHtml(detailDraft.memo)}</textarea>
            <p class="field-counter"><span data-memo-count>${detailMemoCount}</span>/${mealMemoLimit}</p>
          </div>
        </div>

        <div class="actions sheet-actions">
          <button class="danger icon-danger" type="button" data-delete-detail-meal aria-label="삭제">${trashIcon}</button>
          <button class="secondary" type="button" data-close-detail>닫기</button>
          <button class="primary" type="submit">저장</button>
        </div>
      </form>
    </div>
  `;
}

function getStreakDays() {
  const mealDates = new Set(state.meals.map((m) => m.date));
  let streak = 0;
  let date = todayKey();
  while (mealDates.has(date)) {
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

function getWeekHighlights(weekMeals, weekCounts, streak) {
  const highlights = [];

  if (streak >= 7) {
    highlights.push({ type: "great", text: `${streak}일 연속 기록 중이에요` });
  } else if (streak >= 3) {
    highlights.push({ type: "good", text: `${streak}일 연속으로 기록하고 있어요` });
  }

  const vegCount = weekCounts.veg || 0;
  if (vegCount >= 4) {
    highlights.push({ type: "good", text: `채소를 이번 주 ${vegCount}번 챙겼어요` });
  }

  const homeCount = weekCounts.home || 0;
  if (homeCount >= 4) {
    highlights.push({ type: "good", text: `집밥을 이번 주 ${homeCount}번 먹었어요` });
  }

  const deliveryCount = weekCounts.delivery || 0;
  if (deliveryCount >= 4) {
    highlights.push({ type: "watch", text: `배달을 이번 주 ${deliveryCount}번 했어요` });
  }

  const fastCount = weekMeals.filter((m) => m.speed === "10분 이내").length;
  if (fastCount >= 4) {
    highlights.push({ type: "watch", text: `빠르게 먹은 끼니가 ${fastCount}번이에요` });
  }

  const balancedCount = weekMeals.filter((m) => m.fullness === "적당함").length;
  if (balancedCount >= 4) {
    highlights.push({ type: "good", text: `적당한 포만감으로 먹은 끼니가 ${balancedCount}번이에요` });
  }

  const lateCount = weekCounts.late || 0;
  if (lateCount >= 3) {
    highlights.push({ type: "watch", text: `야식이 이번 주 ${lateCount}번이에요` });
  }

  if (!highlights.length && weekMeals.length >= 7) {
    highlights.push({ type: "good", text: `이번 주 ${weekMeals.length}끼 모두 기록했어요` });
  }

  return highlights.slice(0, 3);
}

function todayInsightTitle(meals, dayCopy = "오늘") {
  if (!meals.length) return "기록을 시작해봐요";
  return `${meals.length}끼 기록했어요`;
}

function todayInsight(meals, counts, dayCopy = "오늘") {
  if (!meals.length) {
    return "오늘 첫 끼니를 남겨봐요";
  }

  const highCarbCount = meals.filter((meal) => meal.carbs === "많이").length;
  const highFullnessCount = meals.filter((meal) => ["적당에서 약간 배부름", "배 터질 것 같음"].includes(meal.fullness)).length;
  const fastMealCount = meals.filter((meal) => meal.speed === "10분 이내").length;
  const slowMealCount = meals.filter((meal) => meal.speed === "1시간 이상").length;
  const lightFullnessCount = meals.filter((meal) => meal.fullness === "가볍게 먹음").length;
  const balancedFullnessCount = meals.filter((meal) => meal.fullness === "적당함").length;
  const lowFullnessCount = meals.filter((meal) => meal.fullness === "배고픔만 겨우 채움").length;
  const bingeFullnessCount = meals.filter((meal) => meal.fullness === "배 터질 것 같음").length;
  const sweetCount = counts.sweet || 0;
  const vegCount = counts.veg || 0;
  const proteinCount = counts.protein || 0;
  const bloatCount = counts.bloat || 0;
  const sleepyCount = counts.sleepy || 0;

  if (bloatCount > 0 && sleepyCount > 0) {
    return "더부룩하고 졸리기도 했네요, 어떤 메뉴였는지 메모에 남겨봐요";
  }

  if (bloatCount > 0) {
    return "더부룩함이 있었어요, 어떤 메뉴였는지 살펴봐요";
  }

  if (sleepyCount > 0 && highCarbCount >= 1) {
    return "식후 졸림이 있었어요, 탄수화물 양이 영향을 줬을 수 있어요";
  }

  if ((counts.delivery || 0) >= 2) {
    return "배달을 자주 했어요, 다음 끼니는 집밥 어때요?";
  }

  if ((counts.sodium || 0) >= 2) {
    return "짠 게 좀 많았네요, 물을 조금 더 마셔봐요";
  }

  if (highCarbCount >= 2) {
    return "탄수화물이 좀 많았어요, 다음엔 채소나 단백질을 곁들여봐요";
  }

  if (bingeFullnessCount > 0) {
    return "많이 먹은 끼니가 있었어요, 다음엔 한 박자 느리게요";
  }

  if (highFullnessCount >= 2) {
    return "포만감이 높은 끼니가 여러 번이에요, 다음엔 한 단계 가볍게요";
  }

  if (fastMealCount >= 2) {
    return "빨리 먹은 끼니가 여러 번이에요, 다음엔 조금 천천히요";
  }

  if (lowFullnessCount > 0 && vegCount === 0 && proteinCount === 0) {
    return "식사량이 부족했을 수 있어요, 채소나 단백질을 더 챙겨봐요";
  }

  if (sweetCount > 0 && (counts.home || 0) === 0) {
    return "당이 조금 있었어요, 다음 끼니는 담백하게 골라봐요";
  }

  if (slowMealCount > 0 && balancedFullnessCount > 0) {
    return "천천히, 적당히 먹었어요";
  }

  if (slowMealCount > 0) {
    return "천천히 먹은 끼니가 있었어요, 좋은 습관이에요";
  }

  if (vegCount > 0 && proteinCount > 0) {
    return "채소와 단백질을 모두 챙겼어요";
  }

  if (vegCount > 0 || proteinCount > 0) {
    return "채소나 단백질을 챙겼어요";
  }

  if (balancedFullnessCount >= 2) {
    return "포만감을 잘 조절한 하루예요";
  }

  if (balancedFullnessCount > 0) {
    return "적당한 포만감으로 먹었어요";
  }

  if (lightFullnessCount > 0) {
    return "산뜻하게 먹었어요, 든든하기도 했는지 살펴봐요";
  }

  return "몸 상태도 메모에 남겨봐요";
}

function renderFlow() {
  const weekMeals = recentMeals(7);
  const monthMeals = recentMeals(30);
const weekCounts = countTags(weekMeals);
  const weekHighCarbCount = weekMeals.filter((meal) => meal.carbs === "많이").length;
  const weekFastMealCount = weekMeals.filter((meal) => meal.speed === "10분 이내").length;
  const weekBalancedFullnessCount = weekMeals.filter((meal) => meal.fullness === "적당함").length;
  const streak = getStreakDays();
  const highlights = getWeekHighlights(weekMeals, weekCounts, streak);
  const sortedTags = state.trackedTags
    .map(tagById)
    .filter(Boolean)
    .map((tag) => ({ ...tag, count: weekCounts[tag.id] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCount = Math.max(1, ...sortedTags.map((tag) => tag.count));

  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">이번 주 요약</h2>
          <p class="section-note">이번 주 식습관이에요</p>
        </div>
      </div>
      <div class="overview-grid">
        <div class="metric">
          <strong>${weekMeals.length}</strong>
          <span>이번 주 기록</span>
        </div>
        <div class="metric">
          <strong>${weekCounts.veg || 0}</strong>
          <span>채소를 챙긴 끼니</span>
        </div>
        <div class="metric">
          <strong>${weekHighCarbCount}</strong>
          <span>탄수화물 많음</span>
        </div>
        <div class="metric">
          <strong>${weekFastMealCount}</strong>
          <span>10분 이내 식사</span>
        </div>
        <div class="metric">
          <strong>${weekBalancedFullnessCount}</strong>
          <span>적당한 포만감</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">자주 나온 태그</h2>
      </div>
      ${
        sortedTags.length
          ? `<div class="trend-list">
              ${sortedTags
                .map(
                  (tag) => `
                    <div class="trend-item">
                      <div class="trend-top">
                        <span>${tag.label}</span>
                        <span>${tag.count}회</span>
                      </div>
                      <div class="bar"><div class="bar-fill" style="--value:${(tag.count / maxCount) * 100}%"></div></div>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="empty">기록이 쌓이면 패턴이 보여요.</div>`
      }
    </section>

    ${highlights.length ? `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">이번 주 하이라이트</h2>
      </div>
      <div class="highlight-list">
        ${highlights.map((h) => `
          <div class="highlight-item highlight-${h.type}">
            <span class="highlight-label">${h.text}</span>
          </div>
        `).join("")}
      </div>
    </section>` : ""}

    <section class="section">
      <div class="insight notice">
        <div class="notice-top">
          <span class="notice-badge">이번 주 패턴</span>
        </div>
        <h3>${weekMeals.length ? "이번 주 기록이에요" : "기록을 시작해봐요"}</h3>
        <p>${flowInsight(weekMeals, monthMeals, weekCounts, streak)}</p>
      </div>
    </section>

  `;
}

function renderHistoryGroup(group) {
  return `
    <div class="history-group">
      <button class="history-date" data-view-date="${group.date}">${formatHistoryDate(group.date)}</button>
      <div class="history-meals">
        ${group.meals.map(renderHistoryMeal).join("")}
      </div>
    </div>
  `;
}

function renderHistoryMeal(meal) {
  return `
    <div class="history-meal">
      <span>${meal.slot}</span>
      <strong>${formatMealCardTitle(meal.title)}</strong>
    </div>
  `;
}

function formatHomeDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(dateFromKey(date));
}

function formatHistoryDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${date}T00:00:00`));
}

function flowInsight(weekMeals, monthMeals, counts, streak = 0) {
  if (!weekMeals.length) {
    if (monthMeals.length > 0) return `지난달에 ${monthMeals.length}번 기록했어요, 이번 주도 시작해봐요`;
    return "첫 끼니를 기록하면 이번 주 패턴을 같이 살펴볼게요";
  }

  const weekFastCount = weekMeals.filter((m) => m.speed === "10분 이내").length;
  const weekDeliveryCount = counts.delivery || 0;
  const weekVegCount = counts.veg || 0;
  const weekProteinCount = counts.protein || 0;
  const weekLateCount = counts.late || 0;
  const weekSodiumCount = counts.sodium || 0;
  const weekBloatCount = counts.bloat || 0;
  const weekBalancedCount = weekMeals.filter((m) => m.fullness === "적당함").length;

  if (streak >= 14) {
    return `${streak}일 연속 기록이에요, 이 정도면 식습관 패턴이 꽤 보일 거예요`;
  }

  if (weekBloatCount >= 3) {
    return `더부룩함이 이번 주 ${weekBloatCount}번이에요, 어떤 끼니 후에 나타나는지 살펴봐요`;
  }

  if (weekDeliveryCount >= 4) {
    return `이번 주 배달이 ${weekDeliveryCount}번이에요, 집밥이나 간단한 요리로 한두 번 바꿔볼까요`;
  }

  if (weekSodiumCount >= 3) {
    return `짠 음식이 이번 주 ${weekSodiumCount}번이에요, 나트륨이 쌓이면 부기로 나타날 수 있어요`;
  }

  if (weekFastCount >= 4) {
    return `이번 주 ${weekFastCount}끼를 빠르게 먹었어요, 천천히 먹으면 포만감이 더 잘 느껴져요`;
  }

  if (weekLateCount >= 3) {
    return `야식이 이번 주 ${weekLateCount}번이에요, 저녁 식사 시간을 조금 앞당겨 볼까요`;
  }

  if (weekVegCount >= 4 && weekProteinCount >= 3) {
    return "채소와 단백질을 꾸준히 챙겼어요, 이번 주 균형이 좋아요";
  }

  if (weekVegCount >= 4) {
    return `채소를 이번 주 ${weekVegCount}번 챙겼어요, 단백질도 같이 챙기면 더 좋아요`;
  }

  if (weekBalancedCount >= 5) {
    return `포만감이 적당했던 끼니가 ${weekBalancedCount}번이에요, 식사 조절이 잘 되고 있어요`;
  }

  if (weekVegCount === 0 && weekMeals.length >= 5) {
    return "이번 주 채소 기록이 없어요, 다음 주엔 한 끼라도 채소를 곁들여봐요";
  }

  const watchTags = Object.entries(counts)
    .map(([id, count]) => ({ tag: tagById(id), count }))
    .filter((item) => item.tag?.group === "watch" && item.count >= 2)
    .sort((a, b) => b.count - a.count)[0];

  if (watchTags) {
    return `${watchTags.tag.label}이 이번 주에 ${watchTags.count}번 나왔어요, 다음 주엔 조금 줄여봐요`;
  }

  if (monthMeals.length >= 20) {
    return `최근 한 달 ${monthMeals.length}번 기록했어요, 패턴이 잘 보이고 있어요`;
  }

  return `이번 주 ${weekMeals.length}끼 기록했어요, 꾸준히 쌓아가고 있어요`;
}

function renderSettingsPage() {
  const categories = ["줄이기", "챙기기", "식사 상황", "먹고 나서"];
  const googleSvg = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;

  return `
    <div class="spage">

      <div class="spage-label-row">
        <p class="spage-label">요약에 표시 <span class="spage-label-badge">${state.trackedTags.length}/${trackedTagLimit}</span></p>
        <button class="spage-edit-btn" data-tag-edit-toggle>${tagEditMode ? "완료" : "편집"}</button>
      </div>
      ${tagEditMode ? `
        <p class="spage-sublabel">최대 ${trackedTagLimit}개, 탭해서 선택·해제해요</p>
        ${categories.map((cat) => {
          const tags = defaultTags.filter((t) => state.selectedTags.includes(t.id) && t.category === cat);
          if (!tags.length) return "";
          return `
            <p class="spage-chip-cat">${cat}</p>
            <div class="spage-chip-grid">
              ${tags.map((tag) => `
                <button class="chip ${tag.group} ${state.trackedTags.includes(tag.id) ? "active" : ""}" data-toggle-tracked="${tag.id}">
                  ${tag.label}
                </button>
              `).join("")}
            </div>
          `;
        }).join("")}
      ` : `
        <div class="spage-tracked-chips">
          ${state.trackedTags.length ? state.trackedTags.map((id) => {
            const tag = tagById(id);
            if (!tag) return "";
            return `<span class="chip ${tag.group} active" style="pointer-events:none">${tag.label}</span>`;
          }).join("") : `<span class="spage-sublabel" style="margin:0">아직 선택된 항목이 없어요</span>`}
        </div>
      `}

      <p class="spage-label">즐겨찾기 <span class="spage-label-badge">${state.favorites.length}개</span></p>
      <div class="spage-group">
        ${state.favorites.length ? state.favorites.map((fav) => `
          <div class="spage-row spage-row--fav">
            <span class="spage-row-slot">${fav.slot}</span>
            <span class="spage-row-label">${escapeHtml(fav.name || fav.title || fav.slot)}</span>
            <button class="icon-button spage-row-del" data-delete-favorite="${fav.id}" aria-label="삭제">${trashIcon}</button>
          </div>
        `).join("") : `
          <div class="spage-row spage-row--empty">기록 화면에서 ★를 눌러 저장해요</div>
        `}
      </div>

      <p class="spage-label">계정</p>
      <div class="spage-group">
        ${currentUser ? `
          <div class="spage-row">
            <span class="spage-row-label">${escapeHtml(currentUser.displayName || currentUser.email)}</span>
            <button class="spage-text-btn" data-sign-out>로그아웃</button>
          </div>
        ` : `
          <button class="spage-row spage-row--btn" data-sign-in-google>
            ${googleSvg}
            <span class="spage-row-label">Google로 로그인</span>
          </button>
        `}
      </div>

    </div>
  `;
}

function renderTabs() {
  const canAddMeal = hasAvailableMealSlot(viewedDate);
  const addMealLabel = canAddMeal
    ? `${isToday(viewedDate) ? "오늘" : "이날"} 끼니 기록 추가`
    : `${isToday(viewedDate) ? "오늘" : "이날"} 기록 가능한 끼니 없음`;
  return `
    <nav class="tabs" aria-label="앱 화면">
      <div class="tab-inner">
        <button class="tab ${activeTab === "today" ? "active" : ""}" data-tab="today">
          <span class="tab-icon">${homeIcon()}</span>
          <span class="tab-label">홈</span>
        </button>
        <button class="tab-fab" ${canAddMeal ? "data-open-editor" : "disabled"} aria-label="${addMealLabel}">${plusIcon()}</button>
        <button class="tab ${activeTab === "flow" ? "active" : ""}" data-tab="flow">
          <span class="tab-icon">${chartIcon()}</span>
          <span class="tab-label">요약</span>
        </button>
      </div>
    </nav>
  `;
}

function emptyDraft(slot = recommendedSlot()) {
  const nextSlot = availableSlot(slot, null, viewedDate) || mealSlots[0];
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    date: viewedDate,
    slot: nextSlot,
    title: "",
    tags: [],
    fullness: "적당함",
    carbs: "보통",
    speed: "모르겠음",
    memo: "",
    photo: ""
  };
}

function recommendedSlot() {
  const taken = new Set(mealsForDate(viewedDate).map((m) => m.slot));
  for (const slot of ["아침", "점심", "저녁"]) {
    if (!taken.has(slot)) return slot;
  }
  return "간식";
}

function renderEditor() {
  const editorTags = visibleTagsForSlot(editor.slot);
  const editorCategories = [...new Set(editorTags.map((tag) => tag.category))];
  const editorMemoCount = characterCount(editor.memo);
  const isExistingEditor = state.meals.some((meal) => meal.id === editor.id);

  return `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${editor.slot} 기록">
      <form class="sheet" data-editor-form>
        <div class="sheet-head">
          <div>
            <h2 class="sheet-title">${editor.slot} 기록</h2>
            <p class="section-note">생각나는 만큼만 적어 주세요</p>
          </div>
          <button class="icon-button" type="button" data-close-editor>${closeIcon()}</button>
        </div>

        <div class="sheet-body">
        ${state.favorites.length ? `
        <div class="editor-favorites">
          <p class="editor-favorites-label">즐겨찾기</p>
          <div class="editor-favorites-scroll-wrap">
            <div class="editor-favorites-scroll">
              ${[...state.favorites].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)).map((fav) => `
                <button type="button" class="fav-chip" data-load-favorite="${fav.id}">
                  <span class="fav-chip-slot">${fav.slot}</span>
                  <span class="fav-chip-name">${escapeHtml(fav.name || fav.title || fav.slot)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        </div>` : ""}

        ${renderPhotoHero(editor.photo, "editor")}

        <div class="field">
          <label>끼니</label>
          <div class="segmented meal-segment" data-segment="slot">
            ${mealSlots
              .map((value) => {
                const isTaken = slotIsTaken(value, isExistingEditor ? editor.id : null, editor.date);
                return `<button type="button" class="${editor.slot === value ? "active" : ""}" data-value="${value}" ${isTaken ? "disabled" : ""}>${value}</button>`;
              })
              .join("")}
          </div>
        </div>

        <div class="field">
          <label for="meal-title">먹은 것</label>
          <input class="input" id="meal-title" name="title" value="${escapeHtml(editor.title)}" maxlength="${mealTitleLimit}" placeholder="예: 김밥, 아이스라떼, 계란말이" />
          <p class="field-help">여러 개면 쉼표로 이어 적어도 좋아요</p>
        </div>

        <div class="field check-field">
          <div class="tag-category-list">
            ${editorCategories
              .map(
                (category) => `
                  <div class="tag-category">
                    <p>${category}</p>
                    <div class="chip-grid">
                      ${editorTags
                        .filter((tag) => tag.category === category)
                        .map(
                          (tag) => `
                            <button type="button" class="chip ${tag.group} ${editor.tags.includes(tag.id) ? "active" : ""}" data-editor-tag="${tag.id}">
                              ${tag.label}
                            </button>
                          `
                        )
                        .join("")}
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>

        ${
          editor.slot !== "음료"
            ? `<div class="field">
                <label>탄수화물 양 <span class="optional">(대략)</span></label>
                <div class="segmented carbs" data-segment="carbs">
                  ${carbOptions.map((value) => `<button type="button" class="${editor.carbs === value ? "active" : ""}" data-value="${value}">${value}</button>`).join("")}
                </div>
              </div>`
            : ""
        }

        <div class="field">
          <label>포만감</label>
          <div class="segmented fullness" data-segment="fullness">
            ${fullnessOptions.map((value) => `<button type="button" class="${editor.fullness === value ? "active" : ""}" data-value="${value}">${value}</button>`).join("")}
          </div>
        </div>

        ${
          editor.slot !== "음료"
            ? `<div class="field">
                <label>먹는 속도 <span class="optional">(선택)</span></label>
                <div class="segmented speed" data-segment="speed">
                  ${speedOptions.map((value) => `<button type="button" class="${editor.speed === value ? "active" : ""}" data-value="${value}">${value}</button>`).join("")}
                </div>
              </div>`
            : ""
        }

        <div class="field">
          <label for="meal-memo">메모</label>
          <textarea class="textarea" id="meal-memo" name="memo" maxlength="${mealMemoLimit}" data-memo-input placeholder="먹고 난 느낌을 남겨요">${escapeHtml(editor.memo)}</textarea>
          <p class="field-counter"><span data-memo-count>${editorMemoCount}</span>/${mealMemoLimit}</p>
        </div>
        </div>

        <div class="actions sheet-actions">
          ${state.meals.some((meal) => meal.id === editor.id) ? `<button class="danger icon-danger" type="button" data-delete-meal aria-label="삭제">${trashIcon}</button>` : ""}
          <button class="secondary" type="button" data-close-editor>닫기</button>
          <button class="primary" type="submit">저장</button>
        </div>
      </form>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      datePickerOpen = false;
      settingsOpen = false;
      render();
    });
  });

  document.querySelectorAll("[data-toggle-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsOpen = !settingsOpen;
      tagEditMode = false;
      render();
    });
  });

  document.querySelectorAll("[data-close-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsOpen = false;
      tagEditMode = false;
      render();
    });
  });


  document.querySelectorAll("[data-toggle-date-picker]").forEach((button) => {
    button.addEventListener("click", () => {
      datePickerOpen = !datePickerOpen;
      pickerMonth = monthKeyFor(viewedDate);
      render();
    });
  });

  document.querySelectorAll("[data-picker-month]").forEach((button) => {
    button.addEventListener("click", () => {
      pickerMonth = button.dataset.pickerMonth;
      render();
    });
  });

  document.querySelectorAll("[data-select-date]").forEach((button) => {
    button.addEventListener("click", () => {
      viewedDate = button.dataset.selectDate;
      pickerMonth = monthKeyFor(viewedDate);
      datePickerOpen = false;
      activeTab = "today";
      mealDetailId = null;
      detailDraft = null;
      editor = null;
      render();
      window.scrollTo({ top: 0, left: 0 });
    });
  });

  document.querySelectorAll("[data-view-date]").forEach((button) => {
    button.addEventListener("click", () => {
      viewedDate = button.dataset.viewDate;
      pickerMonth = monthKeyFor(viewedDate);
      datePickerOpen = false;
      activeTab = "today";
      mealDetailId = null;
      detailDraft = null;
      editor = null;
      render();
      window.scrollTo({ top: 0, left: 0 });
    });
  });

  document.querySelectorAll("[data-open-editor]").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = availableSlot(button.dataset.openEditor || undefined, null, viewedDate);
      if (!slot) return;
      editor = emptyDraft(slot);
      render();
    });
  });

  document.querySelectorAll("[data-view-meal]").forEach((button) => {
    button.addEventListener("click", () => {
      mealDetailId = button.dataset.viewMeal;
      const meal = state.meals.find((item) => item.id === mealDetailId);
      detailDraft = meal ? structuredClone(meal) : null;
      render();
    });
  });

  document.querySelectorAll("[data-close-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      mealDetailId = null;
      detailDraft = null;
      render();
    });
  });

  document.querySelectorAll("[data-detail-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      syncDetailFromForm();
      const id = button.dataset.detailTag;
      detailDraft.tags = applyTagToggle(detailDraft.tags, id);
      renderPreservingDetailScroll();
    });
  });

  document.querySelectorAll("[data-detail-segment] button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      syncDetailFromForm();
      const field = button.parentElement.dataset.detailSegment;
      detailDraft[field] = button.dataset.value;
      if (field === "slot") {
        detailDraft.tags = detailDraft.tags.filter((tagId) => visibleTagsForSlot(detailDraft.slot).some((tag) => tag.id === tagId));
      }
      renderPreservingDetailScroll();
    });
  });

  document.querySelectorAll("[data-toggle-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleTag;
      state.selectedTags = state.selectedTags.includes(id)
        ? state.selectedTags.filter((tagId) => tagId !== id)
        : [...state.selectedTags, id];
      state.trackedTags = state.trackedTags.filter((tagId) => state.selectedTags.includes(tagId));
      if (!state.trackedTags.length) {
        state.trackedTags = state.selectedTags.slice(0, 3);
      }
      state.trackedTags = state.trackedTags.slice(0, trackedTagLimit);
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-toggle-tracked]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleTracked;
      if (state.trackedTags.includes(id)) {
        state.trackedTags = state.trackedTags.filter((tagId) => tagId !== id);
      } else if (state.trackedTags.length < trackedTagLimit) {
        state.trackedTags = [...state.trackedTags, id];
      }
      if (!state.trackedTags.length) {
        state.trackedTags = [id];
      }
      saveState();
      renderPreservingSettingsScroll();
    });
  });

  document.querySelectorAll("[data-load-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.loadFavorite;
      const fav = state.favorites.find((f) => f.id === id);
      if (!fav || !editor) return;
      fav.lastUsedAt = Date.now();
      saveState();
      const slot = availableSlot(fav.slot, editor.id, editor.date) || editor.slot;
      editor = { ...editor, slot, title: fav.title, tags: [...fav.tags], fullness: fav.fullness, carbs: fav.carbs, speed: fav.speed, memo: fav.memo };
      renderPreservingSheetScroll();
    });
  });

  document.querySelectorAll("[data-close-editor]").forEach((button) => {
    button.addEventListener("click", () => {
      editor = null;
      render();
    });
  });

  document.querySelectorAll("[data-editor-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      syncEditorFromForm();
      const id = button.dataset.editorTag;
      editor.tags = applyTagToggle(editor.tags, id);
      renderPreservingSheetScroll();
    });
  });

  document.querySelectorAll("[data-segment] button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      syncEditorFromForm();
      const field = button.parentElement.dataset.segment;
      editor[field] = button.dataset.value;
      if (field === "slot") {
        editor.tags = editor.tags.filter((tagId) => visibleTagsForSlot(editor.slot).some((tag) => tag.id === tagId));
      }
      renderPreservingSheetScroll();
    });
  });

  document.querySelectorAll("[data-memo-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const trimmedMemo = Array.from(input.value).slice(0, mealMemoLimit).join("");
      if (input.value !== trimmedMemo) {
        input.value = trimmedMemo;
      }
      const counter = input.parentElement?.querySelector("[data-memo-count]");
      if (counter) {
        counter.textContent = characterCount(input.value);
      }
    });
  });

  document.querySelectorAll("[data-photo-pick]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ctx = btn.dataset.ctx;
      const menu = document.querySelector(`[data-photo-menu="${ctx}"]`);
      if (!menu) return;
      const opening = menu.hidden;
      menu.hidden = !opening;
      if (opening) {
        const close = (ev) => {
          if (!menu.contains(ev.target)) {
            menu.hidden = true;
            document.removeEventListener("click", close);
          }
        };
        setTimeout(() => document.addEventListener("click", close), 0);
      }
    });
  });

  document.querySelectorAll("[data-photo-camera]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ctx = btn.dataset.ctx;
      document.querySelector(`[data-photo-menu="${ctx}"]`)?.setAttribute("hidden", "");
      document.querySelector(`[data-camera-input][data-ctx="${ctx}"]`)?.click();
    });
  });

  document.querySelectorAll("[data-photo-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ctx = btn.dataset.ctx;
      document.querySelector(`[data-photo-menu="${ctx}"]`)?.setAttribute("hidden", "");
      document.querySelector(`[data-gallery-input][data-ctx="${ctx}"]`)?.click();
    });
  });

  document.querySelectorAll("[data-camera-input]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToPhotoDataUrl(file);
      savePhotoToDevice(dataUrl);
      const ref = await savePhotoToIndexedDB(dataUrl);
      if (input.dataset.ctx === "editor") {
        syncEditorFromForm();
        editor.photo = ref;
        render();
      } else {
        syncDetailFromForm();
        if (detailDraft) detailDraft.photo = ref;
        renderPreservingDetailScroll();
      }
    });
  });

  document.querySelectorAll("[data-gallery-input]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToPhotoDataUrl(file);
      const ref = await savePhotoToIndexedDB(dataUrl);
      if (input.dataset.ctx === "editor") {
        syncEditorFromForm();
        editor.photo = ref;
        render();
      } else {
        syncDetailFromForm();
        if (detailDraft) detailDraft.photo = ref;
        renderPreservingDetailScroll();
      }
    });
  });

  document.querySelectorAll("[data-photo-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.ctx === "editor") {
        syncEditorFromForm();
        await deletePhoto(editor.photo);
        editor.photo = "";
        render();
      } else {
        if (!detailDraft) return;
        syncDetailFromForm();
        await deletePhoto(detailDraft.photo);
        detailDraft.photo = "";
        renderPreservingDetailScroll();
      }
    });
  });

  const form = document.querySelector("[data-editor-form]");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      editor.title = trimMealTitle(data.get("title"));
      editor.memo = trimMealMemo(data.get("memo"));
      const nextSlot = availableSlot(editor.slot, editor.id, editor.date);
      if (!nextSlot) return;
      editor.slot = nextSlot;

      const exists = state.meals.some((meal) => meal.id === editor.id);
      state.meals = exists
        ? state.meals.map((meal) => (meal.id === editor.id ? editor : meal))
        : [...state.meals, editor];

      saveState();
      editor = null;
      render();
    });
  }

  const detailForm = document.querySelector("[data-detail-form]");
  if (detailForm) {
    detailForm.addEventListener("submit", (event) => {
      event.preventDefault();
      syncDetailFromForm();
      const nextSlot = availableSlot(detailDraft.slot, detailDraft.id, detailDraft.date);
      if (!nextSlot) return;
      detailDraft.slot = nextSlot;
      state.meals = state.meals.map((meal) => (meal.id === detailDraft.id ? detailDraft : meal));
      saveState();
      mealDetailId = null;
      detailDraft = null;
      render();
    });
  }

  const detailDeleteButton = document.querySelector("[data-delete-detail-meal]");
  if (detailDeleteButton) {
    detailDeleteButton.addEventListener("click", () => {
      if (!detailDraft) return;
      if (!window.confirm("이 기록을 삭제할까요? 삭제한 내용은 되돌릴 수 없어요")) return;
      state.meals = state.meals.filter((meal) => meal.id !== detailDraft.id);
      saveState();
      mealDetailId = null;
      detailDraft = null;
      render();
    });
  }

  const deleteButton = document.querySelector("[data-delete-meal]");
  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      if (!window.confirm("이 기록을 삭제할까요? 삭제한 내용은 되돌릴 수 없어요")) return;
      state.meals = state.meals.filter((meal) => meal.id !== editor.id);
      saveState();
      editor = null;
      render();
    });
  }

  document.querySelectorAll("[data-toggle-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mealId = btn.dataset.toggleFavorite;
      const existing = state.favorites.find((f) => f.fromMealId === mealId);
      if (existing) {
        state.favorites = state.favorites.filter((f) => f.fromMealId !== mealId);
      } else {
        if (!detailDraft) return;
        if (state.favorites.length >= favoritesLimit) {
          showToast(`즐겨찾기는 최대 ${favoritesLimit}개까지 저장할 수 있어요. 설정에서 불필요한 항목을 삭제해 주세요.`);
          return;
        }
        syncDetailFromForm();
        state.favorites = [...state.favorites, {
          id: crypto.randomUUID(),
          fromMealId: detailDraft.id,
          name: detailDraft.title || detailDraft.slot,
          slot: detailDraft.slot,
          title: detailDraft.title,
          tags: [...detailDraft.tags],
          fullness: detailDraft.fullness,
          carbs: detailDraft.carbs,
          speed: detailDraft.speed,
          memo: detailDraft.memo,
          lastUsedAt: Date.now()
        }];
      }
      saveState();
      renderPreservingDetailScroll();
    });
  });

  document.querySelectorAll("[data-open-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.openFavorite;
      const fav = state.favorites.find((f) => f.id === id);
      if (!fav) return;
      editor = draftFromFavorite(fav);
      settingsOpen = false;
      render();
    });
  });

  document.querySelectorAll("[data-delete-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.deleteFavorite;
      state.favorites = state.favorites.filter((f) => f.id !== id);
      saveState();
      render();
    });
  });

  document.querySelector("[data-tag-edit-toggle]")?.addEventListener("click", () => {
    tagEditMode = !tagEditMode;
    renderPreservingSettingsScroll();
  });

  document.querySelector("[data-sign-in-google]")?.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    const isPwa = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      if (isPwa || isMobile) {
        await auth.signInWithRedirect(provider);
      } else {
        await auth.signInWithPopup(provider);
      }
    } catch (err) {
      console.error("로그인 실패:", err);
    }
  });

  document.querySelector("[data-sign-out]")?.addEventListener("click", async () => {
    await auth.signOut();
  });
}

function syncEditorFromForm() {
  if (!editor) return;
  const form = document.querySelector("[data-editor-form]");
  if (!form) return;
  const data = new FormData(form);
  editor.title = trimMealTitle(data.get("title"));
  editor.memo = trimMealMemo(data.get("memo"));
}

function syncDetailFromForm() {
  if (!detailDraft) return;
  const form = document.querySelector("[data-detail-form]");
  if (!form) return;
  const data = new FormData(form);
  detailDraft.title = trimMealTitle(data.get("title"));
  detailDraft.memo = trimMealMemo(data.get("memo"));
}

function renderPhotoPreview(photo) {
  const url = resolvePhoto(photo);
  return url
    ? `<span class="photo-image" style="background-image: url('${escapeHtml(url)}')" aria-hidden="true"></span>`
    : `<span class="photo-placeholder">${plusIcon()}</span>`;
}

function renderPhotoHero(photo, ctx) {
  return `
    <div class="photo-hero">
      ${photo
        ? `${renderPhotoPreview(photo)}
           <button type="button" class="photo-edit-icon" data-photo-pick data-ctx="${ctx}" aria-label="사진 수정">${editIcon()}</button>`
        : `<button type="button" class="photo-add-btn" data-photo-pick data-ctx="${ctx}" aria-label="사진 추가">
             <span class="photo-placeholder">${cameraIcon()}</span>
           </button>`
      }
      <div class="photo-menu" data-photo-menu="${ctx}" hidden>
        <button type="button" class="photo-menu-item" data-photo-camera data-ctx="${ctx}">
          <span class="photo-menu-icon">${cameraIcon()}</span>카메라로 찍기
        </button>
        <button type="button" class="photo-menu-item" data-photo-gallery data-ctx="${ctx}">
          <span class="photo-menu-icon">${galleryIcon()}</span>앨범에서 선택
        </button>
        ${photo ? `<button type="button" class="photo-menu-item photo-menu-delete" data-photo-delete data-ctx="${ctx}">삭제</button>` : ""}
      </div>
      <input type="file" accept="image/*" capture="environment" data-camera-input data-ctx="${ctx}" style="display:none">
      <input type="file" accept="image/*" data-gallery-input data-ctx="${ctx}" style="display:none">
    </div>
  `;
}

function savePhotoToDevice(dataUrl) {
  try {
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    a.href = dataUrl;
    a.download = `끼니록_${ts}.jpg`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  } catch {}
}

function renderPreservingSettingsScroll() {
  const scrollY = window.scrollY;
  render();
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

function renderPreservingSheetScroll() {
  const sheetBody = document.querySelector(".sheet-body");
  const scrollTop = sheetBody?.scrollTop || 0;
  render();
  const nextSheetBody = document.querySelector(".sheet-body");
  if (nextSheetBody) {
    nextSheetBody.scrollTop = scrollTop;
  }
}

function renderPreservingDetailScroll() {
  const sheetBody = document.querySelector(".detail-sheet .sheet-body");
  const scrollTop = sheetBody?.scrollTop || 0;
  render();
  const nextSheetBody = document.querySelector(".detail-sheet .sheet-body");
  if (nextSheetBody) {
    nextSheetBody.scrollTop = scrollTop;
  }
}

async function fileToPhotoDataUrl(file) {
  const dataUrl = await fileToDataUrl(file);
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return dataUrl;
  }
  return resizePhotoDataUrl(dataUrl);
}

function resizePhotoDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const scale = Math.min(1, maxPhotoEdge / Math.max(width, height));

      if (!width || !height) {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", photoQuality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolvePhoto(ref) {
  if (!ref) return "";
  if (ref.startsWith("idb:")) return photoCache.get(ref) || "";
  return ref;
}

async function savePhotoToIndexedDB(dataUrl) {
  const id = crypto.randomUUID();
  const ref = `idb:${id}`;
  await photoDB.put(id, dataUrl);
  photoCache.set(ref, dataUrl);
  return ref;
}

async function deletePhoto(ref) {
  if (!ref || !ref.startsWith("idb:")) return;
  const id = ref.slice(4);
  await photoDB.del(id);
  photoCache.delete(ref);
}

async function migratePhotosToIndexedDB() {
  let changed = false;
  for (const meal of state.meals) {
    if (meal.photo && meal.photo.startsWith("data:")) {
      const id = crypto.randomUUID();
      const ref = `idb:${id}`;
      await photoDB.put(id, meal.photo);
      photoCache.set(ref, meal.photo);
      meal.photo = ref;
      changed = true;
    }
  }
  if (changed) saveState();
}

async function loadPhotoCache() {
  for (const meal of state.meals) {
    if (meal.photo && meal.photo.startsWith("idb:") && !photoCache.has(meal.photo)) {
      const id = meal.photo.slice(4);
      const dataUrl = await photoDB.get(id);
      if (dataUrl) photoCache.set(meal.photo, dataUrl);
    }
  }
}

function draftFromFavorite(fav) {
  const slot = availableSlot(fav.slot, null, viewedDate) || mealSlots[0];
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    date: viewedDate,
    slot,
    title: fav.title,
    tags: [...fav.tags],
    fullness: fav.fullness,
    carbs: fav.carbs,
    speed: fav.speed,
    memo: fav.memo,
    photo: ""
  };
}

function mergeStates(cloudState, localState) {
  const mealMap = new Map();
  for (const m of [...cloudState.meals, ...localState.meals]) {
    const existing = mealMap.get(m.id);
    if (!existing || (m.createdAt || 0) > (existing.createdAt || 0)) {
      mealMap.set(m.id, m);
    }
  }
  const favMap = new Map();
  for (const f of [...cloudState.favorites, ...localState.favorites]) {
    if (!favMap.has(f.id)) favMap.set(f.id, f);
  }
  return normalizeState({
    ...cloudState,
    meals: [...mealMap.values()],
    favorites: [...favMap.values()]
  });
}

async function init() {
  try {
    await photoDB.open();
  } catch {}
  state = loadState();
  await migratePhotosToIndexedDB();
  await loadPhotoCache();
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update();
      });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) window.location.reload();
    });
  }
  render();

  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      try {
        const doc = await db.collection("users").doc(user.uid).get();
        const localState = loadState();
        if (doc.exists && doc.data().state) {
          const cloudState = normalizeState(JSON.parse(doc.data().state));
          state = mergeStates(cloudState, localState);
        } else {
          state = localState;
        }
        localStorage.setItem(storageKey, JSON.stringify(state));
        await db.collection("users").doc(user.uid).set({
          state: JSON.stringify(state),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadPhotoCache();
      } catch (err) {
        console.error("Cloud load failed:", err);
      }
    }
    render();
  });
}

init();
