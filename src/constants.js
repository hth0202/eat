export const MEAL_SLOTS = ['아침', '점심', '저녁', '간식', '음료'];
export const REPEATABLE_SLOTS = ['간식', '음료'];
export const MEAL_SLOT_ORDER = { 아침: 0, 점심: 1, 저녁: 2, 간식: 3, 음료: 4 };

export const DEFAULT_TAGS = [
  { id: 'flour',       label: '밀가루',     group: 'watch', category: '줄이기',    hideInSlots: ['음료'] },
  { id: 'sweet',       label: '당(설탕)',    group: 'watch', category: '줄이기' },
  { id: 'caffeine',    label: '카페인',     group: 'watch', category: '줄이기',    onlySlots: ['음료'] },
  { id: 'carbonated',  label: '탄산',       group: 'watch', category: '줄이기',    onlySlots: ['음료'] },
  { id: 'fried',       label: '기름짐',     group: 'watch', category: '줄이기',    hideInSlots: ['음료'] },
  { id: 'spicy',       label: '매움',       group: 'watch', category: '줄이기',    hideInSlots: ['음료'] },
  { id: 'sodium',      label: '나트륨(염분)',group: 'watch', category: '줄이기',    hideInSlots: ['음료'] },
  { id: 'alcohol',     label: '술',          group: 'watch', category: '줄이기',    hideInSlots: ['음료'] },
  { id: 'late',        label: '야식',       group: 'watch', category: '식사 상황', onlySlots: ['저녁', '간식'] },
  { id: 'delivery',    label: '배달/외식',  group: 'watch', category: '식사 상황', hideInSlots: ['음료'], exclusiveGroup: 'source' },
  { id: 'veg',         label: '채소',       group: 'care',  category: '챙기기',    hideInSlots: ['음료'] },
  { id: 'protein',     label: '단백질',     group: 'care',  category: '챙기기',    hideInSlots: ['음료'] },
  { id: 'water',       label: '물',         group: 'care',  category: '챙기기',    onlySlots: ['음료'] },
  { id: 'home',        label: '집밥',       group: 'care',  category: '식사 상황', hideInSlots: ['음료'], exclusiveGroup: 'source' },
  { id: 'fruit',       label: '과일',       group: 'care',  category: '챙기기',    hideInSlots: ['음료'] },
  { id: 'comfortable', label: '속 편함',    group: 'care',  category: '먹고 나서', exclusiveGroup: 'stomach' },
  { id: 'sleepy',      label: '졸림',       group: 'watch', category: '먹고 나서' },
  { id: 'bloat',       label: '더부룩함',   group: 'watch', category: '먹고 나서', exclusiveGroup: 'stomach' },
  { id: 'heartburn',   label: '속쓰림',     group: 'watch', category: '먹고 나서' },
  { id: 'stomachache', label: '배아픔',     group: 'watch', category: '먹고 나서' },
];

export const DEFAULT_TRACKED_TAGS = ['flour', 'sweet', 'veg'];
export const TRACKED_TAG_LIMIT = 5;
export const FAVORITES_LIMIT = 8;
export const MAX_PHOTOS_PER_MEAL = 5;
export const MEAL_TITLE_LIMIT = 30;
export const MEAL_MEMO_LIMIT = 100;
export const CONDITION_NOTE_LIMIT = 30;
export const MAX_PHOTO_EDGE = 1280;
export const PHOTO_QUALITY = 0.82;
export const SETTINGS_VERSION = 7;

export const FULLNESS_OPTIONS = [
  '배고픔만 겨우 채움',
  '가볍게 먹음',
  '적당함',
  '적당에서 약간 배부름',
  '배 터질 것 같음',
];

export const CARB_OPTIONS = ['없음', '적게', '보통', '많이'];
export const SPEED_OPTIONS = ['모르겠음', '20분 이내', '30-50분 이내', '1시간 이상'];

export const CONDITION_MOODS = [
  { id: 'good', face: '😊', label: '좋음' },
  { id: 'ok',   face: '😐', label: '보통' },
  { id: 'bad',  face: '😞', label: '나쁨' },
];

export const STORAGE_KEY = 'kkinilog-state-v1-react';
