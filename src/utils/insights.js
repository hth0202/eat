import { tagById } from './meal';
import { josa } from './text';

function computeTodaySignals(meals, counts) {
  return {
    mealCount: meals.length,
    highCarbCount: meals.filter((m) => m.carbs === '많이').length,
    lowCarbCount: meals.filter((m) => m.carbs === '없음' || m.carbs === '적게').length,
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
    // 범주 1 — 불편 신호 (500–699)
    { score: 680 + (s.heartburnCount + s.bloatCount) * 20,
      cond: s.heartburnCount > 0 && s.bloatCount > 0,
      msg: '속이 좀 불편했네요, 어떤 메뉴였는지 메모에 남겨봐요' },
    { score: 640 + s.heartburnCount * 20,
      cond: s.heartburnCount > 0,
      msg: '속쓰림이 있었어요, 자극적인 음식이 있었는지 살펴봐요' },
    { score: 620 + (s.bloatCount + s.sleepyCount) * 20,
      cond: s.bloatCount > 0 && s.sleepyCount > 0,
      msg: '더부룩하고 졸리기도 했네요, 어떤 메뉴였는지 메모에 남겨봐요' },
    { score: 600 + s.bloatCount * 20,
      cond: s.bloatCount >= 2,
      msg: '더부룩함이 여러 번이었어요, 어떤 끼니 후였는지 살펴봐요' },
    { score: 560,
      cond: s.bloatCount > 0,
      msg: '더부룩함이 한 번 있었어요, 어떤 메뉴였는지 살펴봐요' },
    { score: 540 + s.highCarbCount * 10,
      cond: s.sleepyCount > 0 && s.highCarbCount > 0,
      msg: '식후 졸림이 있었어요, 탄수화물 양이 영향을 줬을 수 있어요' },
    { score: 510,
      cond: s.sleepyCount > 0,
      msg: '식후에 졸리기도 했네요, 식사 속도나 양이 어땠는지 살펴봐요' },
    // 범주 2 — 행동 경고 (230–430)
    { score: 430 + s.bingeCount + s.fastCount,
      cond: s.bingeCount > 0 && s.fastCount > 0,
      msg: '빠르게 먹고 과식도 했네요, 천천히 먹으면 포만감이 더 잘 느껴져요' },
    { score: 400 + s.bingeCount * 20,
      cond: s.bingeCount > 0,
      msg: '많이 먹은 끼니가 있었어요, 다음엔 한 박자 느리게요' },
    { score: 370 + s.deliveryCount * 20,
      cond: s.deliveryCount > 0 && s.deliveryCount === s.mealCount,
      msg: '오늘 끼니를 모두 배달로 했어요, 내일은 집밥 어때요?' },
    { score: 350 + s.deliveryCount * 20,
      cond: s.deliveryCount >= 2,
      msg: '배달을 자주 했어요, 다음 끼니는 집밥 어때요?' },
    { score: 330 + s.sodiumCount * 20,
      cond: s.sodiumCount >= 2,
      msg: '짠 게 좀 많았네요, 물을 조금 더 마셔봐요' },
    { score: 310 + s.highCarbCount * 20,
      cond: s.highCarbCount >= 2 && s.vegCount === 0 && s.proteinCount === 0,
      msg: '탄수화물이 많은 편이었어요, 채소나 단백질을 곁들이면 더 좋아요' },
    { score: 295 + s.highCarbCount * 20,
      cond: s.highCarbCount >= 2 && s.vegCount > 0 && s.proteinCount > 0,
      msg: '탄수화물이 좀 많았어요, 다음엔 조금 줄여봐요' },
    { score: 290 + s.highCarbCount * 20,
      cond: s.highCarbCount >= 2 && s.proteinCount > 0 && s.vegCount === 0,
      msg: '탄수화물이 좀 많았어요, 채소를 곁들여봐요' },
    { score: 285 + s.highCarbCount * 20,
      cond: s.highCarbCount >= 2 && s.vegCount > 0 && s.proteinCount === 0,
      msg: '탄수화물이 좀 많았어요, 단백질을 곁들여봐요' },
    { score: 270 + s.fastCount + s.highCarbCount,
      cond: s.fastCount >= 1 && s.highCarbCount >= 1,
      msg: '빠르게 먹고 탄수화물도 많았어요, 천천히 먹으면 포만감이 더 잘 느껴져요' },
    { score: 260 + s.highFullnessCount * 15,
      cond: s.highFullnessCount >= 2,
      msg: '포만감이 높은 끼니가 여러 번이에요, 다음엔 조금 가볍게 먹어봐요' },
    { score: 250 + s.fastCount * 15,
      cond: s.fastCount >= 2,
      msg: '빨리 먹은 끼니가 여러 번이에요, 다음엔 조금 천천히 먹어봐요' },
    { score: 240,
      cond: s.lowCount > 0 && s.vegCount === 0 && s.proteinCount === 0,
      msg: '식사량이 부족했을 수 있어요, 채소나 단백질을 더 챙겨봐요' },
    { score: 230,
      cond: s.sweetCount > 0 && s.homeCount === 0,
      msg: '당이 조금 있었어요, 다음 끼니는 담백하게 골라봐요' },
    // 범주 3 — 긍정 신호 (80–200)
    { score: 200 + s.slowCount + s.balancedCount + s.vegCount + s.proteinCount,
      cond: s.slowCount > 0 && s.balancedCount > 0 && s.vegCount > 0 && s.proteinCount > 0,
      msg: '균형 있게 잘 먹었어요' },
    { score: 185 + s.slowCount + s.balancedCount,
      cond: s.slowCount > 0 && s.balancedCount > 0,
      msg: '천천히, 적당히 먹었어요' },
    { score: 170,
      cond: s.slowCount > 0,
      msg: '천천히 먹은 끼니가 있었어요, 좋은 습관이에요' },
    { score: 160 + s.vegCount + s.proteinCount,
      cond: s.vegCount > 0 && s.proteinCount > 0 && s.lowCarbCount > 0,
      msg: '채소, 단백질, 탄수화물까지 균형 있게 챙겼어요' },
    { score: 150 + s.vegCount + s.proteinCount,
      cond: s.vegCount > 0 && s.proteinCount > 0,
      msg: '채소와 단백질을 모두 챙겼어요' },
    { score: 140 + s.comfortableCount + s.balancedCount,
      cond: s.comfortableCount > 0 && s.balancedCount > 0,
      msg: '속도 편하고 포만감도 좋았어요, 이런 날이 계속되면 좋겠어요' },
    { score: 130 + s.comfortableCount * 15,
      cond: s.comfortableCount > 0,
      msg: '속이 편한 하루였네요' },
    { score: 120 + s.proteinCount * 5,
      cond: s.proteinCount > 0 && s.vegCount === 0,
      msg: '단백질을 챙겼어요, 채소도 곁들이면 더 좋아요' },
    { score: 120 + s.vegCount * 5,
      cond: s.vegCount > 0 && s.proteinCount === 0,
      msg: '채소를 챙겼어요, 단백질도 곁들이면 더 좋아요' },
    { score: 110 + s.balancedCount * 15,
      cond: s.balancedCount >= 2,
      msg: '포만감을 잘 조절한 하루예요' },
    { score: 100 + s.balancedCount * 15,
      cond: s.balancedCount >= 1,
      msg: '적당한 포만감으로 먹었어요' },
    { score: 90,
      cond: s.lightCount > 0 && s.lowCount === 0,
      msg: '산뜻하게 먹었어요' },
    { score: 80,
      cond: s.lightCount > 0,
      msg: '산뜻하게 먹었어요, 든든하기도 했는지 살펴봐요' },
  ];

  const best = candidates.filter((c) => c.cond).sort((a, b) => b.score - a.score)[0];
  return best?.msg ?? '먹고 나서 느낌을 메모에 남겨봐요';
}

export function flowInsight(weekMeals, monthMeals, counts, streak = 0) {
  if (!weekMeals.length) {
    if (monthMeals.length > 0) return '이번 주 기록을 시작해봐요, 작은 기록이 쌓이면 패턴이 보여요';
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
    // 불편 신호 (500–699)
    { score: 680 + s.heartburnCount * 20,
      cond: s.heartburnCount >= 3,
      msg: `속쓰림이 이번 주 ${s.heartburnCount}번이에요, 자극적인 음식이나 식사 속도를 살펴봐요` },
    { score: 640 + s.heartburnCount * 20,
      cond: s.heartburnCount === 2,
      msg: '속쓰림이 두 번 있었어요, 어떤 메뉴 후에 나타나는지 살펴봐요' },
    { score: 620 + s.bloatCount + s.fastCount,
      cond: s.bloatCount >= 3 && s.fastCount >= 3,
      msg: '이번 주 더부룩함과 빠른 식사가 함께 나타났어요, 천천히 먹으면 속이 나아질 수 있어요' },
    { score: 600 + s.bloatCount * 15,
      cond: s.bloatCount >= 3,
      msg: `더부룩함이 이번 주 ${s.bloatCount}번이에요, 어떤 끼니 후에 나타나는지 살펴봐요` },
    { score: 560,
      cond: s.bloatCount === 2,
      msg: '더부룩함이 두 번 있었어요, 어떤 메뉴였는지 메모와 비교해봐요' },
    // 행동 경고 (300–500)
    { score: 500 + s.deliveryCount * 15,
      cond: s.deliveryCount >= 5,
      msg: '이번 주 끼니 대부분이 배달이었어요, 집밥 한두 번만 챙겨봐요' },
    { score: 470 + s.deliveryCount * 15,
      cond: s.deliveryCount >= 3,
      msg: `이번 주 배달이 ${s.deliveryCount}번이에요, 집밥이나 간단한 요리로 한두 번 바꿔볼까요` },
    { score: 450 + s.sodiumCount * 15,
      cond: s.sodiumCount >= 4,
      msg: `짠 음식이 이번 주 ${s.sodiumCount}번이에요, 나트륨이 쌓이면 부기로 나타날 수 있어요` },
    { score: 420,
      cond: s.sodiumCount >= 2 && s.sodiumCount <= 3,
      msg: '짠 음식이 이번 주 두세 번 있었어요, 물을 조금 더 챙겨봐요' },
    { score: 400 + s.fastCount * 15,
      cond: s.fastCount >= 5,
      msg: '이번 주 거의 매 끼니를 빠르게 먹었어요, 한 끼라도 천천히 먹어봐요' },
    { score: 370 + s.fastCount * 15,
      cond: s.fastCount >= 3,
      msg: `이번 주 ${s.fastCount}끼를 빠르게 먹었어요, 천천히 먹으면 포만감이 더 잘 느껴져요` },
    { score: 350 + s.lateCount * 15,
      cond: s.lateCount >= 4,
      msg: `야식이 이번 주 ${s.lateCount}번이에요, 저녁 식사 시간을 앞당기면 달라질 수 있어요` },
    { score: 320 + s.lateCount * 15,
      cond: s.lateCount >= 2,
      msg: `야식이 이번 주 ${s.lateCount}번 있었어요, 저녁 식사 시간을 조금 앞당겨 볼까요` },
    // 긍정 신호 (190–300)
    { score: 300 + s.vegCount + s.proteinCount,
      cond: s.vegCount >= 5 && s.proteinCount >= 4,
      msg: '채소와 단백질을 이번 주 내내 꾸준히 챙겼어요' },
    { score: 280 + s.vegCount + s.proteinCount,
      cond: s.vegCount >= 4 && s.proteinCount >= 3,
      msg: '채소와 단백질을 꾸준히 챙겼어요, 이번 주 균형이 좋아요' },
    { score: 260 + s.vegCount * 10,
      cond: s.vegCount >= 4,
      msg: `채소를 이번 주 ${s.vegCount}번 챙겼어요, 단백질도 같이 챙기면 더 좋아요` },
    { score: 240 + s.proteinCount * 10,
      cond: s.proteinCount >= 4,
      msg: `단백질을 이번 주 ${s.proteinCount}번 챙겼어요, 채소도 한 끼라도 곁들여봐요` },
    { score: 230 + s.balancedCount * 10,
      cond: s.balancedCount >= 6,
      msg: '포만감 조절이 아주 잘 됐어요, 다음 주에도 이 패턴 그대로 가봐요' },
    { score: 210 + s.balancedCount * 10,
      cond: s.balancedCount >= 4,
      msg: `포만감이 적당했던 끼니가 ${s.balancedCount}번이에요, 식사 조절이 잘 되고 있어요` },
    { score: 190 + s.comfortableCount * 10,
      cond: s.comfortableCount >= 3,
      msg: `속이 편한 끼니가 이번 주 ${s.comfortableCount}번이에요, 어떤 끼니였는지 메모를 돌아봐요` },
    // 기타 / 폴백 (130–180)
    { score: 170,
      cond: s.vegCount === 0 && s.mealCount >= 5,
      msg: '이번 주 채소 기록이 없어요, 다음 주엔 한 끼라도 채소를 곁들여봐요' },
    ...watchTagCandidates,
    { score: 150,
      cond: monthMeals.length >= 25,
      msg: `최근 한 달 ${monthMeals.length}번 기록했어요, 패턴이 아주 잘 보이고 있어요` },
    { score: 130,
      cond: monthMeals.length >= 15,
      msg: `최근 한 달 ${monthMeals.length}번 기록했어요, 패턴이 잘 보이고 있어요` },
  ];

  const best = candidates.filter((c) => c.cond).sort((a, b) => b.score - a.score)[0];
  return best?.msg ?? `이번 주 ${weekMeals.length}끼 기록했어요, 꾸준히 쌓아가고 있어요`;
}

export function getWeekHighlights(weekMeals, counts, streak) {
  const highlights = [];
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

  if ((counts.late || 0) >= 3) highlights.push({ type: 'watch', text: `야식이 이번 주 ${counts.late}번이에요` });

  if (!highlights.length && weekMeals.length >= 7) {
    highlights.push({ type: 'good', text: `이번 주 ${weekMeals.length}끼 모두 기록했어요` });
  }
  return highlights.slice(0, 4);
}
