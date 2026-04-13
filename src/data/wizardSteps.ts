import type { UserProfile } from '../types';
import type { AppLanguage } from '../context/LanguageContext';

export type WizardField =
  | 'lifeStage'
  | 'primaryUseNeed'
  | 'drivingMix'
  | 'budgetBand'
  | 'powertrains';

export interface WizardOption {
  id: string;
  title: string;
  description: string;
  /** Maps into `UserProfile` for this step */
  profilePatch: Partial<UserProfile>;
}

export interface WizardStep {
  index: number;
  questionLabel: string;
  title: string;
  optional: boolean;
  helper: string;
  field: WizardField;
  options: WizardOption[];
}

export const wizardSteps: WizardStep[] = [
  {
    index: 0,
    questionLabel: 'Question 1',
    title: 'Where are you in life?',
    optional: true,
    helper: 'This helps us set the tone for the shortlist.',
    field: 'lifeStage',
    options: [
      {
        id: 'first-time-buyer',
        title: 'First-time buyer',
        description: 'Starting fresh and wanting clarity.',
        profilePatch: { lifeStage: 'first-time-buyer' },
      },
      {
        id: 'young-professional',
        title: 'Young professional',
        description: 'A car that looks sharp and works hard.',
        profilePatch: { lifeStage: 'young-professional' },
      },
      {
        id: 'growing-family',
        title: 'Growing family',
        description: 'Practical, safe, and easy to live with.',
        profilePatch: { lifeStage: 'growing-family' },
      },
      {
        id: 'established-family',
        title: 'Established family',
        description: 'Comfort, space, and long-term value.',
        profilePatch: { lifeStage: 'established-family' },
      },
      {
        id: 'executive-owner',
        title: 'Executive owner',
        description: 'Premium presence with a calm cabin.',
        profilePatch: { lifeStage: 'executive-owner' },
      },
    ],
  },
  {
    index: 1,
    questionLabel: 'Question 2',
    title: 'What does a typical week look like behind the wheel?',
    optional: true,
    helper: 'We will bias comfort, efficiency, or flexibility accordingly.',
    field: 'primaryUseNeed',
    options: [
      {
        id: 'urban-commute',
        title: 'City-first commuting',
        description: 'Short hops, parking matters, and predictable routines.',
        profilePatch: { primaryUseNeed: 'urban-commute' },
      },
      {
        id: 'family-shuttle',
        title: 'Family shuttle duty',
        description: 'School runs, cargo, and calm cabin time.',
        profilePatch: { primaryUseNeed: 'family-shuttle' },
      },
      {
        id: 'business-travel',
        title: 'Business and client miles',
        description: 'Presentable, quiet, and comfortable on longer drives.',
        profilePatch: { primaryUseNeed: 'business-travel' },
      },
      {
        id: 'mixed-adventure',
        title: 'Mixed and weekend adventure',
        description: 'Versatility for errands today and distance tomorrow.',
        profilePatch: { primaryUseNeed: 'mixed-adventure' },
      },
    ],
  },
  {
    index: 2,
    questionLabel: 'Question 3',
    title: 'How do you split city vs highway driving?',
    optional: true,
    helper: 'Helps us tune ride, range, and powertrain confidence.',
    field: 'drivingMix',
    options: [
      {
        id: 'city-heavy',
        title: 'Mostly city',
        description: 'Stop-start traffic and tight spaces dominate.',
        profilePatch: { drivingMix: 'city-heavy' },
      },
      {
        id: 'balanced',
        title: 'Balanced mix',
        description: 'A fairly even blend of urban and open road.',
        profilePatch: { drivingMix: 'balanced' },
      },
      {
        id: 'highway-heavy',
        title: 'Highway-led',
        description: 'Longer legs, cruising comfort, and stability matter most.',
        profilePatch: { drivingMix: 'highway-heavy' },
      },
    ],
  },
  {
    index: 3,
    questionLabel: 'Question 4',
    title: 'What budget band are you shopping in?',
    optional: true,
    helper: 'We rank matches against this band so you do not fall in love with the wrong price tier.',
    field: 'budgetBand',
    options: [
      {
        id: 'under-1000',
        title: 'Under about 1b VND',
        description: 'Entry and strong value picks — we will protect your ceiling.',
        profilePatch: { budgetBand: 'under-1000', financeIntent: 'value-conscious' },
      },
      {
        id: '1000-1400',
        title: 'Roughly 1.0–1.4b VND',
        description: 'The heart of the range — balanced kit and long-term comfort.',
        profilePatch: { budgetBand: '1000-1400', financeIntent: 'balanced' },
      },
      {
        id: '1400-1900',
        title: 'Roughly 1.4–1.9b VND',
        description: 'Premium cabins, bigger batteries, or flagship trims.',
        profilePatch: { budgetBand: '1400-1900', financeIntent: 'balanced' },
      },
      {
        id: '1900-plus',
        title: 'About 1.9b VND and above',
        description: 'Flagship space, performance, or three-row priority.',
        profilePatch: { budgetBand: '1900-plus', financeIntent: 'premium-ready' },
      },
      {
        id: 'flexible',
        title: 'Still flexible on budget',
        description: 'Show me the best fit first — we will calibrate price together.',
        profilePatch: { budgetBand: 'flexible', financeIntent: undefined },
      },
    ],
  },
  {
    index: 4,
    questionLabel: 'Question 5',
    title: 'Any powertrain preference?',
    optional: true,
    helper: 'Optional — we can keep the slate open if you are undecided.',
    field: 'powertrains',
    options: [
      {
        id: 'ice',
        title: 'Petrol or diesel (ICE)',
        description: 'Familiar refueling and long road-trip flexibility.',
        profilePatch: { powertrains: ['ice'] },
      },
      {
        id: 'hybrid',
        title: 'Hybrid (no plug-in)',
        description: 'Efficiency without thinking about charging.',
        profilePatch: { powertrains: ['hybrid'] },
      },
      {
        id: 'phev',
        title: 'Plug-in hybrid',
        description: 'EV commuting with fuel backup for longer trips.',
        profilePatch: { powertrains: ['phev'] },
      },
      {
        id: 'ev',
        title: 'Fully electric',
        description: 'Quiet torque, home charging, and simpler maintenance.',
        profilePatch: { powertrains: ['ev'] },
      },
      {
        id: 'open',
        title: 'Keep it open',
        description: 'Show me the best match regardless of powertrain.',
        /** Empty array means “no filter” while still recording an explicit choice */
        profilePatch: { powertrains: [] },
      },
    ],
  },
];

const wizardStepsVi: WizardStep[] = [
  {
    index: 0,
    questionLabel: 'Câu 1',
    title: 'Bạn đang ở giai đoạn nào trong cuộc sống?',
    optional: true,
    helper: 'Giúp hệ thống định hướng bộ đề xuất phù hợp hơn.',
    field: 'lifeStage',
    options: [
      { id: 'first-time-buyer', title: 'Mua xe lần đầu', description: 'Bắt đầu mới và cần định hướng rõ ràng.', profilePatch: { lifeStage: 'first-time-buyer' } },
      { id: 'young-professional', title: 'Người đi làm trẻ', description: 'Ưu tiên mẫu xe đẹp, thực dụng, linh hoạt.', profilePatch: { lifeStage: 'young-professional' } },
      { id: 'growing-family', title: 'Gia đình đang lớn', description: 'Cần thực dụng, an toàn và dễ sử dụng hằng ngày.', profilePatch: { lifeStage: 'growing-family' } },
      { id: 'established-family', title: 'Gia đình ổn định', description: 'Ưu tiên êm ái, rộng rãi và giá trị lâu dài.', profilePatch: { lifeStage: 'established-family' } },
      { id: 'executive-owner', title: 'Khách hàng doanh nhân', description: 'Ưu tiên hình ảnh cao cấp và khoang cabin yên tĩnh.', profilePatch: { lifeStage: 'executive-owner' } },
    ],
  },
  {
    index: 1,
    questionLabel: 'Câu 2',
    title: 'Một tuần lái xe điển hình của bạn như thế nào?',
    optional: true,
    helper: 'Chúng tôi sẽ ưu tiên êm ái, tiết kiệm hoặc linh hoạt theo nhu cầu.',
    field: 'primaryUseNeed',
    options: [
      { id: 'urban-commute', title: 'Di chuyển chủ yếu trong đô thị', description: 'Quãng ngắn, cần dễ đỗ và tiện di chuyển.', profilePatch: { primaryUseNeed: 'urban-commute' } },
      { id: 'family-shuttle', title: 'Đưa đón gia đình', description: 'Tập trung không gian, tiện ích và sự thoải mái.', profilePatch: { primaryUseNeed: 'family-shuttle' } },
      { id: 'business-travel', title: 'Đi công việc/gặp khách', description: 'Cần chỉn chu, yên tĩnh và thoải mái đường dài.', profilePatch: { primaryUseNeed: 'business-travel' } },
      { id: 'mixed-adventure', title: 'Kết hợp đa nhu cầu', description: 'Đi làm hằng ngày và đi xa cuối tuần.', profilePatch: { primaryUseNeed: 'mixed-adventure' } },
    ],
  },
  {
    index: 2,
    questionLabel: 'Câu 3',
    title: 'Tỷ lệ lái phố và cao tốc của bạn ra sao?',
    optional: true,
    helper: 'Giúp tinh chỉnh êm ái, tầm hoạt động và lựa chọn hệ truyền động.',
    field: 'drivingMix',
    options: [
      { id: 'city-heavy', title: 'Chủ yếu đi phố', description: 'Kẹt xe và không gian hẹp xuất hiện thường xuyên.', profilePatch: { drivingMix: 'city-heavy' } },
      { id: 'balanced', title: 'Cân bằng', description: 'Kết hợp tương đối đều giữa đô thị và đường dài.', profilePatch: { drivingMix: 'balanced' } },
      { id: 'highway-heavy', title: 'Thiên về cao tốc', description: 'Ưu tiên sự ổn định và thoải mái khi đi xa.', profilePatch: { drivingMix: 'highway-heavy' } },
    ],
  },
  {
    index: 3,
    questionLabel: 'Câu 4',
    title: 'Ngân sách bạn đang nhắm đến là bao nhiêu?',
    optional: true,
    helper: 'Chúng tôi xếp hạng theo khung ngân sách để tránh lệch tầm giá.',
    field: 'budgetBand',
    options: [
      { id: 'under-1000', title: 'Dưới khoảng 1 tỷ', description: 'Tập trung lựa chọn giá trị, giữ trần ngân sách rõ ràng.', profilePatch: { budgetBand: 'under-1000', financeIntent: 'value-conscious' } },
      { id: '1000-1400', title: 'Khoảng 1,0–1,4 tỷ', description: 'Phân khúc cân bằng giữa trang bị và trải nghiệm.', profilePatch: { budgetBand: '1000-1400', financeIntent: 'balanced' } },
      { id: '1400-1900', title: 'Khoảng 1,4–1,9 tỷ', description: 'Ưu tiên khoang nội thất cao cấp hoặc phiên bản cao.', profilePatch: { budgetBand: '1400-1900', financeIntent: 'balanced' } },
      { id: '1900-plus', title: 'Từ khoảng 1,9 tỷ trở lên', description: 'Ưu tiên flagship, hiệu năng hoặc xe 3 hàng ghế.', profilePatch: { budgetBand: '1900-plus', financeIntent: 'premium-ready' } },
      { id: 'flexible', title: 'Ngân sách linh hoạt', description: 'Ưu tiên độ phù hợp trước, tối ưu giá sau.', profilePatch: { budgetBand: 'flexible', financeIntent: undefined } },
    ],
  },
  {
    index: 4,
    questionLabel: 'Câu 5',
    title: 'Bạn có ưu tiên hệ truyền động nào không?',
    optional: true,
    helper: 'Không bắt buộc - nếu chưa chắc, có thể để mở.',
    field: 'powertrains',
    options: [
      { id: 'ice', title: 'Xăng/dầu (ICE)', description: 'Tiếp nhiên liệu quen thuộc, linh hoạt đi đường dài.', profilePatch: { powertrains: ['ice'] } },
      { id: 'hybrid', title: 'Hybrid (không cắm sạc)', description: 'Tiết kiệm nhiên liệu mà không cần thay đổi thói quen sạc.', profilePatch: { powertrains: ['hybrid'] } },
      { id: 'phev', title: 'Plug-in hybrid', description: 'Đi điện hằng ngày, vẫn có xăng cho hành trình dài.', profilePatch: { powertrains: ['phev'] } },
      { id: 'ev', title: 'Thuần điện', description: 'Êm ái, tăng tốc tốt, chi phí bảo dưỡng thường thấp hơn.', profilePatch: { powertrains: ['ev'] } },
      { id: 'open', title: 'Để hệ thống tự đề xuất', description: 'Hiển thị lựa chọn tốt nhất không giới hạn hệ truyền động.', profilePatch: { powertrains: [] } },
    ],
  },
];

export function getWizardSteps(language: AppLanguage): WizardStep[] {
  return language === 'vi' ? wizardStepsVi : wizardSteps;
}
