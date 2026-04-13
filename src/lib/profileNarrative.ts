import type { PriorityWeights, UserProfile } from '../types';
import type { AppLanguage } from '../context/LanguageContext';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Derive priority weights (0–1) from intake for PRD “priority weights” */
export function derivePriorityWeights(profile: UserProfile): PriorityWeights {
  const w: PriorityWeights = {
    safety: 0.55,
    style: 0.5,
    practicality: 0.55,
    premium: 0.45,
    value: 0.5,
    comfort: 0.55,
  };

  switch (profile.lifeStage) {
    case 'first-time-buyer':
      w.value += 0.2;
      w.safety += 0.1;
      w.premium -= 0.05;
      break;
    case 'young-professional':
      w.style += 0.15;
      w.practicality += 0.1;
      break;
    case 'growing-family':
      w.safety += 0.2;
      w.practicality += 0.15;
      w.comfort += 0.1;
      break;
    case 'established-family':
      w.comfort += 0.15;
      w.practicality += 0.15;
      w.value += 0.1;
      break;
    case 'executive-owner':
      w.premium += 0.2;
      w.comfort += 0.15;
      w.style += 0.1;
      break;
    default:
      break;
  }

  switch (profile.primaryUseNeed) {
    case 'urban-commute':
      w.practicality += 0.1;
      w.value += 0.05;
      break;
    case 'family-shuttle':
      w.safety += 0.15;
      w.practicality += 0.15;
      break;
    case 'business-travel':
      w.comfort += 0.15;
      w.premium += 0.1;
      break;
    case 'mixed-adventure':
      w.practicality += 0.1;
      w.style += 0.05;
      break;
    default:
      break;
  }

  switch (profile.drivingMix) {
    case 'city-heavy':
      w.practicality += 0.1;
      break;
    case 'highway-heavy':
      w.comfort += 0.15;
      break;
    default:
      break;
  }

  switch (profile.financeIntent) {
    case 'value-conscious':
      w.value += 0.2;
      w.premium -= 0.1;
      break;
    case 'premium-ready':
      w.premium += 0.2;
      w.comfort += 0.05;
      break;
    default:
      break;
  }

  (Object.keys(w) as (keyof PriorityWeights)[]).forEach(k => {
    w[k] = clamp(w[k], 0.2, 0.95);
  });

  return w;
}

export function personaLabel(profile: UserProfile, language: AppLanguage = 'en'): string {
  const stage = profile.lifeStage?.replace(/-/g, ' ') ?? 'Explorer';
  const stageLabel = `${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
  return language === 'vi' ? `Nhóm ${stageLabel}` : `${stageLabel} buyer`;
}

export function leadIntentLabel(profile: UserProfile, answeredCount: number, language: AppLanguage = 'en'): string {
  if (answeredCount >= 4 && profile.budgetBand && profile.budgetBand !== 'flexible') return language === 'vi' ? 'Nóng' : 'Warm';
  if (answeredCount >= 2) return language === 'vi' ? 'Quan tâm' : 'Engaged';
  return language === 'vi' ? 'Đang khám phá' : 'Exploring';
}

export function profileSummaryNarrative(profile: UserProfile, weights: PriorityWeights, language: AppLanguage = 'en'): string {
  const parts: string[] = [];
  if (profile.lifeStage) {
    parts.push(
      language === 'vi'
        ? `Giai đoạn cuộc sống: ${profile.lifeStage.replace(/-/g, ' ')} — hệ thống ưu tiên đề xuất theo nhu cầu thực tế của bạn.`
        : `Life stage: ${profile.lifeStage.replace(/-/g, ' ')} — we bias recommendations toward how you actually live.`,
    );
  }
  if (profile.primaryUseNeed) {
    parts.push(
      language === 'vi'
        ? `Nhu cầu sử dụng chính: ${profile.primaryUseNeed.replace(/-/g, ' ')}.`
        : `Typical use: ${profile.primaryUseNeed.replace(/-/g, ' ')}.`,
    );
  }
  if (profile.budgetBand && profile.budgetBand !== 'flexible') {
    parts.push(
      language === 'vi'
        ? `Khung ngân sách ${profile.budgetBand.replace(/-/g, ' ')} giúp danh sách đề xuất bám sát khả năng chi trả.`
        : `Budget band ${profile.budgetBand.replace(/-/g, ' ')} keeps the shortlist honest.`,
    );
  } else if (profile.budgetBand === 'flexible') {
    parts.push(language === 'vi' ? 'Ngân sách linh hoạt — ưu tiên độ phù hợp trước, tối ưu giá sau.' : 'Budget is flexible — we lead with fit, then align price.');
  }
  const top = (Object.entries(weights) as [keyof PriorityWeights, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  parts.push(language === 'vi' ? `Ưu tiên hàng đầu: ${top.join(', ')}.` : `Top priorities: ${top.join(', ')}.`);
  return parts.join(' ');
}
