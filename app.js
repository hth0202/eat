const mealSlots = ["아침", "점심", "저녁", "간식", "음료"];

const defaultTags = [
  { id: "flour", label: "밀가루", group: "watch", category: "조절할 것", hideInSlots: ["음료"] },
  { id: "sweet", label: "당(설탕)", group: "watch", category: "조절할 것", hideInSlots: ["음료"] },
  { id: "sweet-drink", label: "액상과당", group: "watch", category: "조절할 것", onlySlots: ["음료"] },
  { id: "caffeine", label: "카페인", group: "watch", category: "조절할 것", onlySlots: ["음료"] },
  { id: "fried", label: "기름짐", group: "watch", category: "조절할 것", hideInSlots: ["음료"] },
  { id: "spicy", label: "매움", group: "watch", category: "조절할 것", hideInSlots: ["음료"] },
  { id: "sodium", label: "나트륨(염분)", group: "watch", category: "조절할 것", hideInSlots: ["음료"] },
  { id: "late", label: "야식", group: "watch", category: "식사 상황", onlySlots: ["저녁", "간식"] },
  { id: "delivery", label: "배달/외식", group: "watch", category: "식사 상황", hideInSlots: ["음료"], exclusiveGroup: "source" },
  { id: "veg", label: "채소", group: "care", category: "챙긴 것", hideInSlots: ["음료"] },
  { id: "protein", label: "단백질", group: "care", category: "챙긴 것", hideInSlots: ["음료"] },
  { id: "water", label: "물", group: "care", category: "챙긴 것", onlySlots: ["음료"] },
  { id: "home", label: "집밥", group: "care", category: "챙긴 것", hideInSlots: ["음료"], exclusiveGroup: "source" },
  { id: "fruit", label: "과일", group: "care", category: "챙긴 것", hideInSlots: ["음료"] },
  { id: "comfortable", label: "속 편함", group: "care", category: "먹고 난 느낌", exclusiveGroup: "stomach" },
  { id: "sleepy", label: "졸림", group: "watch", category: "먹고 난 느낌" },
  { id: "bloat", label: "더부룩함", group: "watch", category: "먹고 난 느낌", exclusiveGroup: "stomach" }
];

const appParams = new URLSearchParams(window.location.search);
const appVersion = appParams.get("v") || "dev";
const storageKey = `kkinilog-state-v1-${appVersion}`;
const defaultTrackedTags = ["flour", "sweet", "veg"];
const trackedTagLimit = 5;
const mealTitleLimit = 30;
const mealMemoLimit = 100;
const maxPhotoEdge = 1280;
const photoQuality = 0.82;
const repeatableMealSlots = ["간식", "음료"];
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

let state = loadState();
let activeTab = "today";
let viewedDate = todayKey();
let datePickerOpen = false;
let pickerMonth = todayKey().slice(0, 7);
let editor = null;
let mealDetailId = null;
let detailDraft = null;

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
  const removedIds = ["slow", "overeat"];
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
    settingsVersion: 4
  };
}

function normalizeTags(tags) {
  return tags.reduce((nextTags, id) => applyTagToggle(nextTags, id, true), []);
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
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
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21.3a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 0 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.65-1.1H1.9a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 3.6 8.6a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.1 2.1 0 0 1 6.17 3.6l.04.04a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.1-1.65V2.3a2.1 2.1 0 0 1 4.2 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1h.06a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" />
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

function editIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  `;
}

function render() {
  const root = document.querySelector("#app");
  root.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">${appIcon()}</div>
          <h1>끼니록</h1>
        </div>
        <button class="header-icon ${activeTab === "settings" ? "active" : ""}" data-tab="settings" aria-label="설정">${gearIcon()}</button>
      </header>
      ${activeTab === "today" ? renderToday() : ""}
      ${activeTab === "flow" ? renderFlow() : ""}
      ${activeTab === "settings" ? renderSettings() : ""}
    </main>
    ${renderTabs()}
    ${editor ? renderEditor() : ""}
    ${mealDetailId ? renderMealDetail() : ""}
  `;

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

    <section class="section">
      <div class="insight notice">
        <span class="notice-badge">${dayCopy}의 살핌</span>
        <h3>${dayCopy} 기록을 살펴봤어요</h3>
        <p>${todayInsight(meals, counts, dayCopy)}</p>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">기록한 끼니</h2>
          <p class="section-note">${meals.length ? `${meals.length}개를 남겼어요.` : "아직 남긴 끼니가 없어요."}</p>
        </div>
      </div>
      ${meals.length ? `<div class="meal-list">${meals.map(renderMealCard).join("")}</div>${renderAddMealCta()}` : renderEmptyTodayCta()}
    </section>

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
    </section>

  `;
}

function renderEmptyTodayCta() {
  return `
    <button class="empty-cta" data-open-editor>
      <span class="empty-cta-icon mascot-thumb" aria-hidden="true">
        <img src="./assets/kkinilog-rabbit-mascot.png" alt="" />
      </span>
      <span>
        <strong>첫 끼니 기록하기</strong>
        <small>먹은 것만 가볍게 남겨도 충분해요.</small>
      </span>
    </button>
  `;
}

function renderAddMealCta() {
  const canAddMeal = hasAvailableMealSlot(viewedDate);
  const dayCopy = isToday(viewedDate) ? "오늘" : "이날";
  return `
    <button class="empty-cta empty-cta-compact" ${canAddMeal ? "data-open-editor" : "disabled"}>
      <span class="empty-cta-icon">${canAddMeal ? "+" : "✓"}</span>
      <span>
        <strong>${canAddMeal ? "끼니 추가하기" : `${dayCopy} 끼니는 모두 기록했어요`}</strong>
        <small>${canAddMeal ? "먹은 끼니를 이어서 남겨보세요." : "작성한 끼니는 다시 선택할 수 없어요."}</small>
      </span>
    </button>
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
  if (!items.length) return "이름 없이 남긴 끼니";
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

  return `
    <div class="modal detail-modal" role="dialog" aria-modal="true" aria-label="${meal.slot} 상세 보기">
      <form class="sheet detail-sheet" data-detail-form>
        <div class="sheet-head">
          <div>
            <h2 class="sheet-title">${detailDraft.slot} 기록</h2>
            <p class="section-note">내용을 바로 고치고 저장할 수 있어요.</p>
          </div>
          <button class="icon-button" type="button" data-close-detail>×</button>
        </div>

        <div class="sheet-body detail-body">
          <label class="photo-hero" aria-label="사진 추가 또는 변경">
            ${renderPhotoPreview(detailDraft.photo)}
            <span class="photo-edit-icon">${editIcon()}</span>
            <input type="file" accept="image/*" data-detail-photo-input>
          </label>

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
            <textarea class="textarea" id="detail-memo" name="memo" maxlength="${mealMemoLimit}" data-memo-input placeholder="먹고 나서 어땠는지 남겨요.">${escapeHtml(detailDraft.memo)}</textarea>
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

function todayInsight(meals, counts, dayCopy = "오늘") {
  if (!meals.length) {
    return "완벽하게 적지 않아도 괜찮아요. 하루 한 끼만 남겨 보세요.";
  }

  const highCarbCount = meals.filter((meal) => meal.carbs === "많이").length;
  const highFullnessCount = meals.filter((meal) => ["적당에서 약간 배부름", "배 터질 것 같음"].includes(meal.fullness)).length;
  const fastMealCount = meals.filter((meal) => meal.speed === "10분 이내").length;
  const slowMealCount = meals.filter((meal) => meal.speed === "1시간 이상").length;
  const lightFullnessCount = meals.filter((meal) => meal.fullness === "가볍게 먹음").length;
  const balancedFullnessCount = meals.filter((meal) => meal.fullness === "적당함").length;
  const lowFullnessCount = meals.filter((meal) => meal.fullness === "배고픔만 겨우 채움").length;
  const bingeFullnessCount = meals.filter((meal) => meal.fullness === "배 터질 것 같음").length;
  const sweetCount = (counts.sweet || 0) + (counts["sweet-drink"] || 0);

  if ((counts.delivery || 0) >= 2) {
    return `${dayCopy}은 배달/외식을 자주 했어요. 다음 끼니는 집밥이나 간단한 조합으로 맞춰볼까요?`;
  }

  if ((counts.sodium || 0) >= 2) {
    return `${dayCopy}은 조금 짜게 먹었어요. 물이나 담백한 메뉴로 균형을 맞춰봐도 좋아요.`;
  }

  if ((counts.bloat || 0) > 0) {
    return "먹고 난 뒤 더부룩함이 남아 있어요. 어떤 메뉴에서 그랬는지 메모해두면 다음 선택에 도움이 돼요.";
  }

  if (highCarbCount >= 2) {
    return `${dayCopy}은 탄수화물 섭취가 조금 많았어요. 다음 끼니에서는 채소나 단백질을 곁들여봐도 좋아요.`;
  }

  if (bingeFullnessCount > 0) {
    return "배가 많이 부를 만큼 먹은 끼니가 있었어요. 다음엔 배부르기 전에 한 번 멈춰봐도 좋아요.";
  }

  if (highFullnessCount >= 2) {
    return `${dayCopy}은 포만감이 높은 끼니가 여러 번 있었어요. 다음엔 한 단계만 가볍게 맞춰볼까요?`;
  }

  if (fastMealCount >= 2) {
    return "10분 안에 먹은 끼니가 여러 번 있었어요. 다음 끼니는 몇 입만 천천히 먹어봐도 좋아요.";
  }

  if (lowFullnessCount > 0) {
    return "가볍게 지나간 끼니가 있어요. 채소, 단백질, 탄수화물이 골고루 있었는지 한 번만 살펴봐요.";
  }

  if (sweetCount > 0) {
    return `${dayCopy}은 당이나 액상과당이 조금 많았어요. 다음 끼니에서는 물이나 담백한 메뉴를 골라봐요.`;
  }

  if (slowMealCount > 0) {
    return "천천히 먹은 끼니가 있었어요. 여유 있게 먹는 습관은 오래 가져가도 좋아요.";
  }

  if (balancedFullnessCount > 0) {
    return `포만감이 적당했던 끼니가 있었어요. ${dayCopy} 기록, 괜찮은 패턴이에요.`;
  }

  if (lightFullnessCount > 0) {
    return "산뜻하게 먹은 끼니가 있었어요. 가볍지만 든든했는지도 같이 살펴봐요.";
  }

  if (counts.veg > 0 || counts.protein > 0) {
    return "건강에 좋은 기록이 쌓였어요. 이런 작은 기록이 건강한 식습관을 만들어요.";
  }

  return `기록이 쌓이기 시작했어요. ${dayCopy} 몸 상태도 메모에 남겨두면 나중에 도움이 돼요.`;
}

function renderFlow() {
  const weekMeals = recentMeals(7);
  const monthMeals = recentMeals(30);
  const historyGroups = groupedMealsByDate(state.meals).slice(0, 7);
  const weekCounts = countTags(weekMeals);
  const weekHighCarbCount = weekMeals.filter((meal) => meal.carbs === "많이").length;
  const weekFastMealCount = weekMeals.filter((meal) => meal.speed === "10분 이내").length;
  const weekBalancedFullnessCount = weekMeals.filter((meal) => meal.fullness === "적당함").length;
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
          <p class="section-note">이번 주에 자주 보인 식습관을 모았어요.</p>
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
        <h2 class="section-title">자주 보인 것</h2>
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
          : `<div class="empty">아직 볼 기준이 없어요. 한 끼씩 기록하다 보면 이번 주 패턴이 여기 모여요.</div>`
      }
    </section>

    <section class="section">
      <div class="insight">
        <h3>이번 주 발견</h3>
        <p>${flowInsight(weekMeals, monthMeals, weekCounts)}</p>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">지난 끼니록</h2>
          <p class="section-note">날짜를 누르면 홈에서 볼 수 있어요.</p>
        </div>
      </div>
      ${
        historyGroups.length
          ? `<div class="history-list">
              ${historyGroups.map(renderHistoryGroup).join("")}
            </div>`
          : `<div class="empty">아직 다시 볼 기록이 없어요. 오늘 한 끼를 남기면 여기에 쌓여요.</div>`
      }
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

function flowInsight(weekMeals, monthMeals, counts) {
  if (!weekMeals.length) {
    return "첫 기록을 남기면 이곳에서 이번 주 식습관을 같이 살펴볼게요.";
  }

  const top = Object.entries(counts)
    .map(([id, count]) => ({ tag: tagById(id), count }))
    .filter((item) => item.tag)
    .sort((a, b) => b.count - a.count)[0];

  if (top) {
    return `${top.tag.label}이 이번 주에 ${top.count}번 보였어요. 줄일지, 더 챙길지 가볍게 정해봐요.`;
  }

  return `최근 30일 동안 ${monthMeals.length}번의 기록이 쌓였어요. 작은 기록들이 쌓여 건강한 식습관을 만들어요.`;
}

function renderSettings() {
  const groups = [
    { title: "조금 줄여볼 것", category: "조절할 것", note: "많이 보이면 다음 끼니에서 살짝 조절해요." },
    { title: "더 챙길 것", category: "챙긴 것", note: "자주 보이면 좋은 신호예요." },
    { title: "먹은 방식", category: "식사 상황", note: "배달, 외식, 야식처럼 식사 상황을 남겨요." },
    { title: "먹고 난 상태", category: "먹고 난 느낌", note: "속이 편했는지, 졸렸는지도 같이 볼 수 있어요." }
  ];

  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="section-title">내 식습관 기준</h2>
          <p class="section-note">자주 보고 싶은 것만 골라두세요.</p>
        </div>
      </div>
      <div class="settings-group">
        <div class="setting-card">
          <div class="setting-card-head">
            <h3>홈에서 바로 볼 것</h3>
            <span>${state.trackedTags.length}/${trackedTagLimit}</span>
          </div>
          <p class="section-note">오늘 화면에 크게 보여줄 태그예요. 최대 ${trackedTagLimit}개까지 고를 수 있어요.</p>
          <div class="tracked-group-list">
            ${groups
              .map(
                (group) => `
                  <div class="tracked-group">
                    <p>${group.title}</p>
                    <div class="chip-grid">
                      ${defaultTags
                        .filter((tag) => state.selectedTags.includes(tag.id) && tag.category === group.category)
                        .map(
                          (tag) => `
                            <button class="chip ${tag.group} ${state.trackedTags.includes(tag.id) ? "active" : ""}" data-toggle-tracked="${tag.id}">
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

      </div>
    </section>
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
  const hour = new Date().getHours();
  if (hour < 11) return "아침";
  if (hour < 16) return "점심";
  if (hour < 21) return "저녁";
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
            <p class="section-note">생각나는 만큼만 남겨도 괜찮아요.</p>
          </div>
          <button class="icon-button" type="button" data-close-editor>×</button>
        </div>

        <div class="sheet-body">
        <label class="photo-hero" aria-label="사진 추가 또는 변경">
          ${renderPhotoPreview(editor.photo)}
          <span class="photo-edit-icon">${editIcon()}</span>
          <input type="file" accept="image/*" data-photo-input>
        </label>

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
          <p class="field-help">여러 개면 쉼표로 이어 적어도 좋아요. 최대 ${mealTitleLimit}자까지 남길 수 있어요.</p>
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
          <textarea class="textarea" id="meal-memo" name="memo" maxlength="${mealMemoLimit}" data-memo-input placeholder="먹고 나서 어땠는지, 다음엔 바꾸고 싶은 점이 있다면 남겨요.">${escapeHtml(editor.memo)}</textarea>
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
      render();
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

  const photoInput = document.querySelector("[data-photo-input]");
  if (photoInput) {
    photoInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      syncEditorFromForm();
      editor.photo = await fileToPhotoDataUrl(file);
      render();
    });
  }

  const detailPhotoInput = document.querySelector("[data-detail-photo-input]");
  if (detailPhotoInput) {
    detailPhotoInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file || !detailDraft) return;
      syncDetailFromForm();
      detailDraft.photo = await fileToPhotoDataUrl(file);
      renderPreservingDetailScroll();
    });
  }

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
      if (!window.confirm("이 기록을 삭제할까요? 삭제한 내용은 되돌릴 수 없어요.")) return;
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
      if (!window.confirm("이 기록을 삭제할까요? 삭제한 내용은 되돌릴 수 없어요.")) return;
      state.meals = state.meals.filter((meal) => meal.id !== editor.id);
      saveState();
      editor = null;
      render();
    });
  }
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
  return photo
    ? `<span class="photo-image" style="background-image: url('${escapeHtml(photo)}')" aria-hidden="true"></span>`
    : `<span class="photo-placeholder">${plusIcon()}</span>`;
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations?.().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

render();
