import type { SpecSection, Vehicle } from '../types';
import type { AppLanguage } from '../context/LanguageContext';
import { localizeCompareValue } from './localizedVehicle';

export function buildSpecSections(vehicle: Vehicle, language: AppLanguage = 'en'): SpecSection[] {
  const isVi = language === 'vi';
  const c = {
    ...vehicle.compare,
    budgetFit: localizeCompareValue(vehicle.compare.budgetFit, language),
    range: localizeCompareValue(vehicle.compare.range, language),
    charging: vehicle.compare.charging ? localizeCompareValue(vehicle.compare.charging, language) : vehicle.compare.charging,
    cityDriving: localizeCompareValue(vehicle.compare.cityDriving, language),
    highwayComfort: localizeCompareValue(vehicle.compare.highwayComfort, language),
    cabinFlexibility: localizeCompareValue(vehicle.compare.cabinFlexibility, language),
    ownershipPath: localizeCompareValue(vehicle.compare.ownershipPath, language),
  };
  return [
    {
      title: isVi ? 'Hệ truyền động & tầm hoạt động' : 'Powertrain & range',
      rows: [
        { label: isVi ? 'Truyền động' : 'Powertrain', value: vehicle.powertrain.toUpperCase() },
        { label: isVi ? 'Nhiên liệu' : 'Fuel type', value: vehicle.fuelType },
        { label: isVi ? 'Tầm hoạt động / động cơ' : 'Range / engine', value: c.range },
        { label: isVi ? 'Sạc' : 'Charging', value: c.charging ?? '—' },
      ],
    },
    {
      title: isVi ? 'Kích thước & không gian' : 'Dimensions & packaging',
      rows: [
        { label: isVi ? 'Kiểu dáng' : 'Body style', value: vehicle.bodyStyle },
        { label: isVi ? 'Phân khúc kích thước' : 'Segment size', value: vehicle.size },
        { label: isVi ? 'Linh hoạt khoang cabin' : 'Cabin flexibility', value: c.cabinFlexibility },
      ],
    },
    {
      title: isVi ? 'Vận hành & êm ái' : 'Driving & comfort',
      rows: [
        { label: isVi ? 'Đi đô thị' : 'City driving', value: c.cityDriving },
        { label: isVi ? 'Êm ái đường dài' : 'Highway comfort', value: c.highwayComfort },
      ],
    },
    {
      title: isVi ? 'Ngân sách & sở hữu' : 'Budget & ownership',
      rows: [
        { label: isVi ? 'Giá' : 'Price', value: vehicle.priceBand },
        { label: isVi ? 'Phù hợp ngân sách' : 'Budget fit', value: c.budgetFit },
        { label: isVi ? 'Định hướng sở hữu' : 'Ownership path', value: c.ownershipPath },
      ],
    },
    {
      title: isVi ? 'An toàn & hỗ trợ lái (tóm tắt)' : 'Safety & assistance (summary)',
      rows: [
        {
          label: isVi ? 'Điểm chính' : 'Highlights',
          value:
            isVi
              ? 'Thông tin tóm tắt tham khảo — vui lòng xác nhận gói an toàn chủ động và chuẩn NCAP với tư vấn viên.'
              : 'Representative summary only — confirm active safety pack and NCAP context with your consultant.',
        },
      ],
    },
    {
      title: isVi ? 'Tiện nghi & giải trí (tóm tắt)' : 'Comfort & infotainment (summary)',
      rows: [
        {
          label: isVi ? 'Điểm chính' : 'Highlights',
          value:
            isVi
              ? 'Ghế, điều hòa và giải trí khác nhau theo phiên bản — dùng trang So sánh hoặc ghé showroom để chốt cấu hình.'
              : 'Premium seating, climate, and infotainment vary by trim — use Compare or a showroom visit to lock equipment.',
        },
      ],
    },
  ];
}
