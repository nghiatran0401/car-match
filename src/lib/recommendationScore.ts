import type { UserProfile, Vehicle, SelectionHistory } from '../types';
import type { AppLanguage } from '../context/LanguageContext';
import { derivePriorityWeights } from './profileNarrative';

function budgetBandRange(band: string | undefined): { min: number; max: number } | null {
  switch (band) {
    case 'under-1000':
      return { min: 0, max: 1050 };
    case '1000-1400':
      return { min: 850, max: 1450 };
    case '1400-1900':
      return { min: 1250, max: 1950 };
    case '1900-plus':
      return { min: 1750, max: 99999 };
    case 'flexible':
    default:
      return null;
  }
}

export interface RankedVehicle {
  vehicle: Vehicle;
  score: number;
  reasons: string[];
  budgetPenalty: boolean;
}

export function rankVehicle(
  vehicle: Vehicle,
  profile: UserProfile,
  selections: SelectionHistory[],
  language: AppLanguage = 'en',
): RankedVehicle {
  const weights = derivePriorityWeights(profile);
  const reasons: string[] = [];
  let score = 72;

  const band = budgetBandRange(profile.budgetBand);
  if (band) {
    if (vehicle.priceEntryMilVnd > band.max) {
      score -= 22;
      reasons.push(
        language === 'vi'
          ? 'Giá cao hơn khung ngân sách đã chọn - vẫn hiển thị để bạn tham khảo đầy đủ.'
          : 'Above your stated budget band — still shown for transparency.',
      );
    } else if (vehicle.priceEntryMilVnd < band.min - 200) {
      score -= 4;
      reasons.push(
        language === 'vi'
          ? 'Thấp hơn ngân sách khá nhiều, phù hợp nếu bạn muốn thêm phụ kiện hoặc nâng phiên bản.'
          : 'Comfortably under budget with room for accessories or trim step-ups.',
      );
    } else {
      score += 6;
      reasons.push(language === 'vi' ? 'Phù hợp khung ngân sách bạn đã chia sẻ.' : 'Fits the budget band you shared.');
    }
  } else {
    reasons.push(language === 'vi' ? 'Ngân sách linh hoạt - ưu tiên xếp hạng theo độ phù hợp nhu cầu.' : 'Budget flexible — ranked on lifestyle fit first.');
  }

  if (profile.powertrains !== undefined && profile.powertrains.length > 0) {
    if (profile.powertrains.includes(vehicle.powertrain)) {
      score += 10;
      reasons.push(
        language === 'vi'
          ? `Khớp ưu tiên hệ truyền động ${vehicle.powertrain.toUpperCase()} của bạn.`
          : `Matches your ${vehicle.powertrain.toUpperCase()} powertrain preference.`,
      );
    } else {
      score -= 8;
      reasons.push(
        language === 'vi'
          ? 'Chưa khớp bộ lọc hệ truyền động hiện tại - vẫn đáng xem nếu bạn linh hoạt.'
          : 'Outside your selected powertrain filter — worth a look if you are open.',
      );
    }
  }

  switch (profile.lifeStage) {
    case 'growing-family':
    case 'established-family':
      if (vehicle.size !== 'compact') {
        score += 5;
        reasons.push(language === 'vi' ? 'Kích thước phù hợp nhu cầu gia đình và độ thoải mái hàng ghế sau.' : 'Sized for family routines and rear-seat comfort.');
      }
      if (vehicle.vehicleType === 'suv' && vehicle.size === 'full-size') {
        score += 4;
        reasons.push(language === 'vi' ? 'Lựa chọn khoang rộng/3 hàng ghế cho gia đình đang mở rộng.' : 'Three-row or large-cabin option for growing crews.');
      }
      break;
    case 'young-professional':
      if (vehicle.vehicleType === 'crossover' || vehicle.vehicleType === 'suv') {
        score += 3;
        reasons.push(language === 'vi' ? 'Dáng Crossover/SUV phù hợp cả đi làm lẫn cuối tuần.' : 'Crossover/SUV stance that reads confident for work and weekends.');
      }
      break;
    case 'executive-owner':
      if (vehicle.priceEntryMilVnd >= 1500) {
        score += 5;
        reasons.push(language === 'vi' ? 'Mức giá cao cấp phù hợp kỳ vọng nhóm khách doanh nhân.' : 'Premium price tier aligned with executive expectations.');
      }
      break;
    default:
      break;
  }

  if (profile.primaryUseNeed === 'urban-commute' && vehicle.powertrain === 'ev') {
    score += 4;
    reasons.push(language === 'vi' ? 'Phù hợp đi lại đô thị nhờ ưu thế xe điện.' : 'EV-friendly for city-first commuting.');
  }
  if (profile.drivingMix === 'highway-heavy' && vehicle.compare.highwayComfort.toLowerCase().includes('excellent')) {
    score += 4;
    reasons.push(language === 'vi' ? 'Mẫu xe này nổi bật về độ êm ái khi đi đường dài.' : 'Highway comfort called out strongly on this model.');
  }

  score += Math.min(8, selections.length * 2);
  score += Math.round((weights.practicality + weights.comfort + weights.value) * 2);

  const hash = vehicle.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  score += (hash % 5) - 2;

  const budgetPenalty = Boolean(band && vehicle.priceEntryMilVnd > band.max);

  score = Math.max(58, Math.min(98, Math.round(score)));

  if (reasons.length > 3) reasons.splice(3, reasons.length - 3);

  return {
    vehicle,
    score,
    reasons,
    budgetPenalty,
  };
}

export function rankAndSort(
  vehicles: Vehicle[],
  profile: UserProfile,
  selections: SelectionHistory[],
  language: AppLanguage = 'en',
): RankedVehicle[] {
  return vehicles
    .map(v => rankVehicle(v, profile, selections, language))
    .sort((a, b) => b.score - a.score);
}
