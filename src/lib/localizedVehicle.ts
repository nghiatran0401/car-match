import type { AppLanguage } from '../context/LanguageContext';
import type { Vehicle } from '../types';

const viBySlug: Record<string, { bodyStyle: string; thesis: string; priceBand: string }> = {
  ex5: {
    bodyStyle: 'Crossover điện thông minh',
    thesis:
      'EX5 mang lại giá trị EV dễ tiếp cận, tập trung vào trải nghiệm đô thị, công nghệ hiện đại và chi phí hợp lý cho người mua xe điện lần đầu.',
    priceBand: 'Từ 999 triệu VND',
  },
  monjaro: {
    bodyStyle: 'SUV hạng sang',
    thesis:
      'Monjaro là lựa chọn SUV cân bằng cho khách hàng cao cấp: êm ái, thoải mái đường dài và nội thất sang mà chưa cần lên mức flagship.',
    priceBand: 'Từ 1,599 tỷ VND',
  },
  'lynk-co-09': {
    bodyStyle: 'SUV cao cấp',
    thesis:
      'Lynk & Co 09 là lựa chọn flagship 3 hàng ghế cho người cần không gian lớn, linh hoạt PHEV và trải nghiệm sở hữu nâng tầm.',
    priceBand: 'Từ 2,199 tỷ VND',
  },
  coolray: {
    bodyStyle: 'SUV thể thao cỡ nhỏ',
    thesis:
      'Coolray là điểm vào dễ tiếp cận của hệ sinh thái CarMatch, phù hợp khách hàng trẻ cần kiểu dáng nổi bật, công nghệ tốt và chi phí vận hành hợp lý.',
    priceBand: 'Từ 899 triệu VND',
  },
  'lynk-co-06': {
    bodyStyle: 'Crossover đô thị cao cấp',
    thesis:
      'Lynk & Co 06 nằm giữa nhóm giá trị và cao cấp, mang lại hiệu quả PHEV trong thân xe nhỏ gọn, phù hợp sử dụng hằng ngày trong thành phố.',
    priceBand: 'Từ 1,199 tỷ VND',
  },
  'lynk-co-01': {
    bodyStyle: 'SUV cao cấp cân bằng',
    thesis:
      'Lynk & Co 01 là phương án cân bằng: tiết kiệm nhờ hybrid, hoàn thiện tốt và tính thực dụng cao cho nhu cầu hằng ngày.',
    priceBand: 'Từ 1,399 tỷ VND',
  },
  'lynk-co-08': {
    bodyStyle: 'SUV flagship hybrid',
    thesis:
      'Lynk & Co 08 là mẫu flagship thiên công nghệ, kết hợp hiệu năng PHEV, tiện nghi cao và ngôn ngữ thiết kế hiện đại.',
    priceBand: 'Từ 1,899 tỷ VND',
  },
  ec40: {
    bodyStyle: 'Crossover coupe thuần điện',
    thesis:
      'EC40 là mẫu EV cao cấp nổi bật với tăng tốc mạnh, hậu thuẫn chính hãng Volvo tại Việt Nam và trải nghiệm thương hiệu rõ nét.',
    priceBand: 'Từ 1,779 tỷ VND',
  },
  'lynk-co-03': {
    bodyStyle: 'Sedan hiệu năng cao',
    thesis:
      'Lynk & Co 03+ là lựa chọn thiên cảm xúc cho người thích sedan thể thao, khác biệt so với nhóm SUV cao cấp phổ biến.',
    priceBand: 'Từ 1,899 tỷ VND',
  },
};

export function localizeVehicle(vehicle: Vehicle, language: AppLanguage): Vehicle {
  if (language !== 'vi') return vehicle;
  const mapped = viBySlug[vehicle.modelSlug];
  if (!mapped) return vehicle;
  return {
    ...vehicle,
    bodyStyle: mapped.bodyStyle,
    thesis: mapped.thesis,
    priceBand: mapped.priceBand,
  };
}

const compareValueViMap: Record<string, string> = {
  'Strong for sub-1b VND buyers': 'Phù hợp tốt cho ngân sách dưới 1 tỷ',
  '400+ km WLTP': 'Hơn 400 km (chuẩn WLTP)',
  'DC fast charge 10-80% in ~30 min': 'Sạc nhanh DC 10-80% khoảng 30 phút',
  Excellent: 'Rất tốt',
  Good: 'Tốt',
  'Strong for compact five-seat use': 'Phù hợp tốt cho nhu cầu 5 chỗ gọn gàng',
  'Best for confident urban EV adopters': 'Phù hợp người dùng EV đô thị đã sẵn sàng chuyển đổi',
  'Sweet spot for 1.2–1.6b buyers': 'Tối ưu cho nhóm ngân sách 1,2-1,6 tỷ',
  '2.0L turbo ICE': 'Động cơ xăng 2.0L tăng áp',
  'No charging required': 'Không cần sạc',
  'Very good': 'Rất tốt',
  'Strong for family and business use': 'Phù hợp cho cả gia đình và công việc',
  'Best for traditional premium buyers': 'Phù hợp khách hàng cao cấp theo hướng truyền thống',
  'Premium-plus buyer territory': 'Phân khúc khách hàng cao cấp mở rộng',
  'EV 80+ km, total 800+ km': 'Điện 80+ km, tổng tầm hoạt động 800+ km',
  'Home overnight or public DC': 'Sạc qua đêm tại nhà hoặc sạc nhanh công cộng',
  'Excellent in EV mode': 'Rất tốt khi chạy chế độ điện',
  'Best-in-class for long trips': 'Hàng đầu phân khúc cho hành trình dài',
  'Best for large families and VIP use': 'Phù hợp gia đình đông người và nhu cầu đón tiếp',
  'Best for status-conscious buyers': 'Phù hợp khách hàng ưu tiên hình ảnh và vị thế',
  'Best for sub-1b VND buyers': 'Phù hợp nhất cho ngân sách dưới 1 tỷ',
  '1.5L turbo ICE': 'Động cơ xăng 1.5L tăng áp',
  'Good for couples and small families': 'Phù hợp cặp đôi và gia đình nhỏ',
  'Best for first-time new-car buyers': 'Phù hợp người mua xe mới lần đầu',
  'Strong for 1–1.3b buyers': 'Phù hợp tốt cho ngân sách 1-1,3 tỷ',
  'EV 50+ km, total 600+ km': 'Điện 50+ km, tổng tầm hoạt động 600+ km',
  'Home overnight charging ideal': 'Phù hợp sạc qua đêm tại nhà',
  'Good for urban professionals': 'Phù hợp người dùng đô thị chuyên nghiệp',
  'Best for transition-to-EV buyers': 'Phù hợp người đang chuyển dần sang xe điện',
  'Sweet spot for 1.2–1.5b buyers': 'Tối ưu cho nhóm ngân sách 1,2-1,5 tỷ',
  'Hybrid 700+ km': 'Hybrid 700+ km',
  'Strong for small families': 'Phù hợp tốt cho gia đình nhỏ',
  'Best for pragmatic premium buyers': 'Phù hợp khách hàng cao cấp thiên thực dụng',
  'Premium buyer territory': 'Phân khúc khách hàng cao cấp',
  'EV 120+ km, total 900+ km': 'Điện 120+ km, tổng tầm hoạt động 900+ km',
  'Home or public DC': 'Sạc tại nhà hoặc sạc nhanh công cộng',
  'Strong for tech-focused buyers': 'Phù hợp khách hàng ưu tiên công nghệ',
  'Best for early-adopter premium buyers': 'Phù hợp khách hàng cao cấp tiên phong',
  'Best for 1.5b+ buyers': 'Phù hợp nhất cho ngân sách từ 1,5 tỷ',
  '510 km': '510 km',
  'DC 10-80% in about 28 minutes': 'Sạc DC 10-80% khoảng 28 phút',
  'Strong for premium five-seat use': 'Phù hợp cao cấp cho nhu cầu 5 chỗ',
  'Best for confident premium buyers': 'Phù hợp khách hàng cao cấp sẵn sàng xuống tiền',
  '261 hp turbo ICE': 'Động cơ xăng tăng áp 261 mã lực',
  'Best for buyers who prioritize driving over rear space': 'Phù hợp người ưu tiên cảm giác lái hơn không gian hàng ghế sau',
  'Best for buyers shopping with emotion and status in mind': 'Phù hợp người mua theo cảm xúc và hình ảnh cá nhân',
};

export function localizeCompareValue(value: string, language: AppLanguage): string {
  if (language !== 'vi') return value;
  return compareValueViMap[value] ?? value;
}

