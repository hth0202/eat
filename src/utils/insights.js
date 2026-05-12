import { tagById } from './meal';
import { josa } from './text';

function computeTodaySignals(meals, counts) {
  return {
    mealCount: meals.length,
    highCarbCount: meals.filter((m) => m.carbs === '많이').length,
    bingeCount: meals.filter((m) => m.fullness === '배 터질 것 같음').length,
    highFullnessCount: meals.filter((m) => ['적당에서 약간 배부름', '배 터질 것 같음'].includes(m.fullness)).length,
    balancedCount: meals.filter((m) => m.fullness === '적당함').length,
    lightCount: meals.filter((m) => m.fullness === '가볍게 먹음').length,
    lowCount: meals.filter((m) => m.fullness === '배고픔만 겨우 채움').length,
    fastCount: meals.filter((m) => m.speed === '20분 이내').length,
    slowCount: meals.filter((m) => m.speed === '1시간 이상').length,
    bloatCount: counts.bloat || 0,
    heartburnCount: counts.heartburn || 0,
    sleepyCount: counts.sleepy || 0,
    comfortableCount: counts.comfortable || 0,
    vegCount: counts.veg || 0,
    proteinCount: counts.protein || 0,
    sweetCount: counts.sweet || 0,
    sodiumCount: counts.sodium || 0,
    deliveryCount: counts.delivery || 0,
    homeCount: counts.home || 0,
    stomachacheCount: counts.stomachache || 0,
  };
}

function computeWeekSignals(meals, counts, streak) {
  return { ...computeTodaySignals(meals, counts), streak, lateCount: counts.late || 0 };
}

export function todayInsight(meals, counts) {
  if (!meals.length) return '오늘 첫 끼니를 남겨봐요';
  const s = computeTodaySignals(meals, counts);

  const candidates = [
    { score: 680 + (s.heartburnCount + s.bloatCount) * 20, cond: s.heartburnCount > 0 && s.bloatCount > 0,
      msg: '속이 좀 불편했네요, 어떤 메뉴였는지 메모에 남겨봐요' },
    { score: 640 + s.heartburnCount * 20, cond: s.heartburnCount > 0,
      msg: '속쓰림이 있었어요, 자극적인 음식이 있었는지 살펴봐요' },
    { score: 600 + s.bloatCount * 20, cond: s.bloatCount >= 2,
      msg: '더부룩함이 여러 번이었어요, 어떤 끼니 후였는지 살펴봐요' },
    { score: 560, cond: s.bloatCount > 0,
      msg: '더부룩함이 한 번 있었어요, 어떤 메뉴였는지 살펴봐요' },
    { score: 500 + s.highCarbCount * 10, cond: s.highCarbCount >= 3,
      msg: `탄수화물이 많은 끼니가 ${s.highCarbCount}번이에요, 내일은 조금 줄여볼까요` },
    { score: 470 + s.fastCount * 10, cond: s.fastCount >= 2,
      msg: '빠르게 먹은 끼니가 많았어요, 천천히 먹으면 소화에 도움이 돼요' },
    { score: 440 + s.deliveryCount * 10, cond: s.deliveryCount >= 2,
      msg: '배달을 여러 번 했어요, 내일은 집밥이나 간단한 요리도 생각해봐요' },
    { score: 300 + s.vegCount * 15 + s.proteinCount * 15, cond: s.vegCount >= 2 && s.proteinCount >= 2,
      msg: '채소와 단백질을 잘 챙겼어요, 균형 잡힌 하루예요' },
    { score: 280 + s.vegCount * 15, cond: s.vegCount >= 2,
      msg: `채소를 ${s.vegCount}번 챙겼어요, 잘 하고 있어요` },
    { score: 260 + s.proteinCount * 15, cond: s.proteinCount >= 2,
      msg: `단백질을 ${s.proteinCount}번 챙겼어요, 좋은 선택이에요` },
    { score: 240 + s.balancedCount * 15, cond: s.balancedCount >= 3,
      msg: '포만감 조절이 잘 됐어요, 이 패턴을 유지해봐요' },
    { score: 220 + s.comfortableCount * 15, cond: s.comfortableCount >= 2,
      msg: '속이 편한 끼니가 많았어요, 몸이 좋아하는 메뉴를 기억해두세요' },
    { score: 200 + s.homeCount * 10, cond: s.homeCount >= 2,
      msg: '집밥을 잘 챙겼어요, 건강한 선택이에요' },
    { score: 180, cond: s.mealCount >= 3,
      msg: `${s.mealCount}끼 모두 기록했어요, 잘 하고 있어요` },
  ];

  const best = candidates.filter((c) => c.cond).sort((a, b) => b.score - a.score)[0];
  return best?.msg ?? `오늘 ${s.mealCount}끼 기록했어요`;
}

export function flowInsight(weekMeals, monthMeals, counts, streak = 0) {
  if (!weekMeals.length) {
    if (monthMeals.length > 0) return `지난달에 ${monthMeals.length}번 기록했어요, 이번 주도 시작해봐요`;
    return '첫 끼니를 기록하면 이번 주 패턴을 같이 살펴볼게요';
  }

  const s = computeWeekSignals(weekMeals, counts, streak);

  const watchTagCandidates = Object.entries(counts)
    .map(([id, count]) => ({ tag: tagById(id), count }))
    .filter((item) => item.tag?.group === 'watch' && item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      score: 180 + item.count * 10, cond: true,
      msg: `${item.tag.label}${josa(item.tag.label, '이/가')} 이번 주에 ${item.count}번 나왔어요, 다음 주엔 조금 줄여봐요`,
    }));

  const candidates = [
    { score: 870 + s.streak, cond: s.streak >= 21,
      msg: `${s.streak}일 연속이에요, 이 정도면 식습관 흐름이 눈에 보일 거예요` },
    { score: 820 + s.streak, cond: s.streak >= 14,
      msg: `${s.streak}일 연속 기록이에요, 이 정도면 패턴이 꽤 보일 거예요` },
    { score: 680 + s.heartburnCount * 20, cond: s.heartburnCount >= 3,
      msg: `속쓰림이 이번 주 ${s.heartburnCount}번이에요, 자극적인 음식이나 식사 속도를 살펴봐요` },
    { score: 600 + s.bloatCount * 15, cond: s.bloatCount >= 3,
      msg: `더부룩함이 이번 주 ${s.bloatCount}번이에요, 어떤 끼니 후에 나타나는지 살펴봐요` },
    { score: 500 + s.deliveryCount * 15, cond: s.deliveryCount >= 5,
      msg: '이번 주 끼니 대부분이 배달이었어요, 집밥 한두 번만 챙겨봐요' },
    { score: 470 + s.deliveryCount * 15, cond: s.deliveryCount >= 3,
      msg: `이번 주 배달이 ${s.deliveryCount}번이에요, 집밥이나 간단한 요리로 한두 번 바꿔볼까요` },
    { score: 400 + s.fastCount * 15, cond: s.fastCount >= 5,
      msg: '이번 주 거의 매 끼니를 빠르게 먹었어요, 한 끼라도 천천히 먹어봐요' },
    { score: 350 + s.lateCount * 15, cond: s.lateCount >= 3,
      msg: `야식이 이번 주 ${s.lateCount}번이에요, 저녁 식사 시간을 앞당기면 달라질 수 있어요` },
    { score: 300 + s.vegCount * 10 + s.proteinCount * 10, cond: s.vegCount >= 5 && s.proteinCount >= 4,
      msg: '채소와 단백질을 이번 주 내내 꾸준히 챙겼어요' },
    { score: 280 + s.vegCount * 10 + s.proteinCount * 10, cond: s.vegCount >= 4 && s.proteinCount >= 3,
      msg: '채소와 단백질을 꾸준히 챙겼어요, 이번 주 균형이 좋아요' },
    { score: 230 + s.balancedCount * 10, cond: s.balancedCount >= 6,
      msg: '포만감 조절이 아주 잘 됐어요, 다음 주에도 이 패턴 그대로 가봐요' },
    { score: 170, cond: s.vegCount === 0 && s.mealCount >= 5,
      msg: '이번 주 채소 기록이 없어요, 다음 주엔 한 끼라도 채소를 곁들여봐요' },
    ...watchTagCandidates,
    { score: 150, cond: monthMeals.length >= 25,
      msg: `최근 한 달 ${monthMeals.length}번 기록했어요, 패턴이 아주 잘 보이고 있어요` },
  ];

  const best = candidates.filter((c) => c.cond).sort((a, b) => b.score - a.score)[0];
  return best?.msg ?? `이번 주 ${weekMeals.length}끼 기록했어요, 꾸준히 쌓아가고 있어요`;
}

export function getWeekHighlights(weekMeals, counts, streak) {
  const highlights = [];
  if (streak >= 7) highlights.push({ type: 'great', text: `${streak}일 연속 기록 중이에요` });
  else if (streak >= 3) highlights.push({ type: 'good', text: `${streak}일 연속으로 기록하고 있어요` });

  if ((counts.comfortable || 0) >= 4) highlights.push({ type: 'good', text: `속이 편한 끼니가 이번 주 ${counts.comfortable}번이에요` });
  if ((counts.protein || 0) >= 4) highlights.push({ type: 'good', text: `단백질을 이번 주 ${counts.protein}번 챙겼어요` });
  if ((counts.veg || 0) >= 4) highlights.push({ type: 'good', text: `채소를 이번 주 ${counts.veg}번 챙겼어요` });
  if ((counts.home || 0) >= 4) highlights.push({ type: 'good', text: `집밥을 이번 주 ${counts.home}번 먹었어요` });

  const balanced = weekMeals.filter((m) => m.fullness === '적당함').length;
  if (balanced >= 5) highlights.push({ type: 'good', text: `포만감을 잘 조절한 끼니가 ${balanced}번이에요` });

  if ((counts.heartburn || 0) >= 3) highlights.push({ type: 'watch', text: `속쓰림이 이번 주 ${counts.heartburn}번이에요` });
  if ((counts.delivery || 0) >= 4) highlights.push({ type: 'watch', text: `배달을 이번 주 ${counts.delivery}번 했어요` });

  const fast = weekMeals.filter((m) => m.speed === '20분 이내').length;
  if (fast >= 4) highlights.push({ type: 'watch', text: `빠르게 먹은 끼니가 ${fast}번이에요` });

  if (!highlights.length && weekMeals.length >= 7) {
    highlights.push({ type: 'good', text: `이번 주 ${weekMeals.length}끼 모두 기록했어요` });
  }
  return highlights.slice(0, 4);
}
