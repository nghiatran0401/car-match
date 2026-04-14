import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface InteractiveSpecItemProps {
  label: string;
  value: string;
  specKey: string;
  vehicleId: string;
  category: string;
  onSpecClick?: (specContext: SpecContext) => void;
}

export interface SpecContext {
  specKey: string;
  category: string;
  label: string;
  value: string;
  vehicleId: string;
}

/**
 * InteractiveSpecItem - A clickable specification item that opens AI chat with context
 * 
 * Features:
 * - Hover state indicates interactivity
 * - Tooltip preview on hover
 * - Click to open chat with pre-populated context-aware question
 * - Visual feedback for interaction
 */
export default function InteractiveSpecItem({
  label,
  value,
  specKey,
  vehicleId,
  category,
  onSpecClick,
}: InteractiveSpecItemProps) {
  const { language } = useLanguage();

  const generateQuestion = (): string => {
    const isVi = language === 'vi';
    
    // Generate context-aware questions based on category
    const questionTemplates: Record<string, { vi: string[]; en: string[] }> = {
      powertrain: {
        vi: [
          `Giải thích về ${value} trên xe này?`,
          `${value} có ý nghĩa gì trong thực tế?`,
          `Công nghệ ${value} hoạt động như thế nào?`,
        ],
        en: [
          `Can you explain what ${value} means for this vehicle?`,
          `How does ${value} affect real-world performance?`,
          `Tell me more about the ${value} technology?`,
        ],
      },
      performance: {
        vi: [
          `${value} có đủ mạnh cho nhu cầu hàng ngày không?`,
          `So sánh ${value} với các xe cùng phân khúc?`,
          `${value} ảnh hưởng thế nào đến trải nghiệm lái?`,
        ],
        en: [
          `Is ${value} sufficient for daily driving needs?`,
          `How does ${value} compare to competitors in this segment?`,
          `How does ${value} impact the driving experience?`,
        ],
      },
      dimensions: {
        vi: [
          `${value} có nghĩa là gì về không gian thực tế?`,
          `Kích thước này có phù hợp cho gia đình không?`,
          `So sánh ${value} với các xe khác?`,
        ],
        en: [
          `What does ${value} mean in terms of actual space?`,
          `Is this size suitable for a family?`,
          `How does ${value} compare to other vehicles?`,
        ],
      },
      efficiency: {
        vi: [
          `${value} có tiết kiệm không trong thực tế?`,
          `Chi phí vận hành với ${value} là bao nhiêu?`,
          `So sánh hiệu suất nhiên liệu với xe khác?`,
        ],
        en: [
          `Is ${value} fuel-efficient in real-world conditions?`,
          `What are the operating costs with ${value}?`,
          `How does fuel efficiency compare to alternatives?`,
        ],
      },
      safety: {
        vi: [
          `${value} quan trọng như thế nào cho an toàn?`,
          `Công nghệ này hoạt động ra sao trong tình huống thực tế?`,
          `Xe này đạt chuẩn an toàn gì?`,
        ],
        en: [
          `How important is ${value} for safety?`,
          `How does this technology work in real situations?`,
          `What safety ratings does this vehicle have?`,
        ],
      },
      comfort: {
        vi: [
          `${value} mang lại trải nghiệm gì cho hành khách?`,
          `Tính năng này có đáng giá không?`,
          `So sánh với các xe cùng tầm giá?`,
        ],
        en: [
          `What experience does ${value} provide for passengers?`,
          `Is this feature worth the investment?`,
          `How does it compare to vehicles in the same price range?`,
        ],
      },
      ownership: {
        vi: [
          `${value} ảnh hưởng thế nào đến chi phí sở hữu?`,
          `Chính sách bảo hành cho phần này ra sao?`,
          `Chi phí bảo dưỡng dự kiến là bao nhiêu?`,
        ],
        en: [
          `How does ${value} affect total cost of ownership?`,
          `What's the warranty coverage for this?`,
          `What are the expected maintenance costs?`,
        ],
      },
    };

    const templates = questionTemplates[category] || questionTemplates.powertrain;
    const options = isVi ? templates.vi : templates.en;
    
    // Return first template as default, user can edit before sending
    return options[0];
  };

  const handleInteraction = () => {
    // Generate the question but let parent component handle chat opening
    generateQuestion();
    if (onSpecClick) {
      onSpecClick({
        specKey,
        category,
        label,
        value,
        vehicleId,
      });
    }
    // The parent component (VehicleDetailPage) will handle opening chat with the question
  };

  return (
    <div
      onClick={handleInteraction}
      className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-all hover:bg-slate-100"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInteraction();
        }
      }}
      title={language === 'vi' ? 'Nhấp để hỏi AI về thông số này' : 'Click to ask AI about this spec'}
    >
      <dt className="flex items-center gap-1.5 text-sm text-slate-500">
        <span className="relative">
          {label}
          <span className="absolute -right-4 top-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <MessageCircle className="h-3 w-3 text-amber-600" />
          </span>
        </span>
      </dt>
      <dd className="flex items-center gap-2 text-right font-semibold text-slate-900">
        <span className="border-b border-dashed border-slate-300 transition-colors group-hover:border-amber-500 group-hover:text-amber-700">
          {value}
        </span>
        <MessageCircle className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-amber-600" />
      </dd>
    </div>
  );
}
