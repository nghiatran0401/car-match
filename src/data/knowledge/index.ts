/**
 * Knowledge Base for RAG-based AI Assistant
 * Contains structured data for: Tasco Policy, Vehicle Specs, FAQ, Inventory
 */

export interface KnowledgeDocument {
  id: string;
  type: 'tasco_policy' | 'inventory_db' | 'faq_kb' | 'spec_kb';
  title: string;
  content: string;
  metadata: {
    category: string;
    subcategory?: string;
    language: 'en' | 'vi';
    lastUpdated: string;
    priority?: number; // For reranking
  };
}

/**
 * Tasco Policy Knowledge Base
 * Based on PRD: discount ranges, APR, deposit, perks, guardrails
 */
export const tascoPolicyKB: KnowledgeDocument[] = [
  {
    id: 'policy_discount_001',
    type: 'tasco_policy',
    title: 'Discount Policy Framework',
    content: `Standard discount negotiation range is 2% to 5% of vehicle entry price. 
    Maximum authorized discount is 7% for end-of-quarter promotions or special stock clearance.
    Discounts must be approved by showroom manager for amounts above 5%.
    Never promise discounts outside the authorized range without manager approval.`,
    metadata: {
      category: 'pricing',
      subcategory: 'discounts',
      language: 'en',
      lastUpdated: '2024-01-15',
      priority: 10,
    },
  },
  {
    id: 'policy_apr_001',
    type: 'tasco_policy',
    title: 'Finance APR Guidelines',
    content: `Standard APR range: 6.5% to 9.5% depending on credit tier and loan term.
    Promotional APR as low as 4.9% available for qualified buyers on select models.
    Loan terms: 12, 24, 36, 48, 60, 72 months available.
    Minimum down payment: 20% for standard financing, 15% for promotional programs.`,
    metadata: {
      category: 'finance',
      subcategory: 'apr',
      language: 'en',
      lastUpdated: '2024-01-15',
      priority: 10,
    },
  },
  {
    id: 'policy_perks_001',
    type: 'tasco_policy',
    title: 'Allowed Perks and Add-ons',
    content: `Permitted customer perks within deal structure:
    - Free maintenance package (1-3 years)
    - Extended warranty (up to 5 years)
    - Premium accessories floor mats, cargo organizers
    - First-year insurance subsidy
    - Fuel credit up to 5 million VND
    Perks must be documented in final quote and cannot exceed 3% of vehicle value.`,
    metadata: {
      category: 'perks',
      subcategory: 'allowances',
      language: 'en',
      lastUpdated: '2024-01-15',
      priority: 8,
    },
  },
  {
    id: 'policy_vietnamese_001',
    type: 'tasco_policy',
    title: 'Chính sách Giảm giá',
    content: `Phạm vi giảm giá tiêu chuẩn: 2% đến 5% giá xe niêm yết.
    Giảm giá tối đa được phép: 7% cho chương trình cuối quý hoặc xả kho đặc biệt.
    Giảm giá trên 5% cần phê duyệt từ quản lý showroom.
    Không bao giờ hứa hẹn giảm giá ngoài phạm vi cho phép mà không có sự chấp thuận của quản lý.`,
    metadata: {
      category: 'pricing',
      subcategory: 'discounts',
      language: 'vi',
      lastUpdated: '2024-01-15',
      priority: 10,
    },
  },
];

/**
 * FAQ Knowledge Base
 * Common questions from car buyers across PRD funnel stages
 */
export const faqKB: KnowledgeDocument[] = [
  {
    id: 'faq_delivery_001',
    type: 'faq_kb',
    title: 'Vehicle Delivery Timeline',
    content: `Standard delivery timeline:
    - In-stock vehicles: 3-5 business days after deposit
    - Pre-order vehicles: 4-8 weeks depending on model and trim
    - Custom orders: 8-12 weeks with color/option selection
    Expedited delivery may be available for additional fee.
    Customer will receive VIN and tracking info once vehicle ships.`,
    metadata: {
      category: 'delivery',
      language: 'en',
      lastUpdated: '2024-01-10',
      priority: 7,
    },
  },
  {
    id: 'faq_warranty_001',
    type: 'faq_kb',
    title: 'Warranty Coverage Details',
    content: `Standard warranty package includes:
    - Basic warranty: 3 years / 60,000 km
    - Powertrain warranty: 5 years / 100,000 km
    - Corrosion warranty: 5 years unlimited km
    - Roadside assistance: 5 years
    Extended warranty options available up to 7 years / 150,000 km.
    Warranty is transferable to second owner with small fee.`,
    metadata: {
      category: 'warranty',
      language: 'en',
      lastUpdated: '2024-01-10',
      priority: 8,
    },
  },
  {
    id: 'faq_tradein_001',
    type: 'faq_kb',
    title: 'Trade-in Process',
    content: `Trade-in valuation process:
    1. Online preliminary estimate using vehicle year, make, model, mileage, condition
    2. In-person appraisal at showroom (15-20 minutes)
    3. Final offer valid for 7 days
    Trade-in value can be applied to down payment or reduce monthly payments.
    We accept most makes/models in running condition.
    Outstanding loans on trade-in can be rolled into new financing.`,
    metadata: {
      category: 'trade_in',
      language: 'en',
      lastUpdated: '2024-01-10',
      priority: 6,
    },
  },
  {
    id: 'faq_bao_hanh_001',
    type: 'faq_kb',
    title: 'Chi tiết Bảo hành',
    content: `Gói bảo hành tiêu chuẩn bao gồm:
    - Bảo hành cơ bản: 3 năm / 60.000 km
    - Bảo hành động lực truyền động: 5 năm / 100.000 km
    - Bảo hành chống gỉ: 5 năm không giới hạn km
    - Hỗ trợ bên đường: 5 năm
    Tùy chọn bảo hành mở rộng lên đến 7 năm / 150.000 km.
    Bảo hành có thể chuyển nhượng sang chủ thứ hai với phí nhỏ.`,
    metadata: {
      category: 'warranty',
      language: 'vi',
      lastUpdated: '2024-01-10',
      priority: 8,
    },
  },
];

/**
 * Vehicle Specifications KB
 * Structured spec data for RAG-enhanced Q&A
 */
export const specKB: KnowledgeDocument[] = [
  {
    id: 'spec_engine_001',
    type: 'spec_kb',
    title: 'Engine and Performance Specifications',
    content: `Engine specifications include:
    - Displacement (cc/L): Total cylinder volume
    - Horsepower (hp/kW): Peak power output
    - Torque (Nm/lb-ft): Rotational force, important for acceleration
    - Aspiration: Naturally aspirated, turbocharged, or supercharged
    - Cylinder configuration: Inline-4, V6, V8, etc.
    Performance metrics:
    - 0-100 km/h acceleration time
    - Top speed (km/h or mph)
    - Fuel economy combined cycle (L/100km or mpg)`,
    metadata: {
      category: 'performance',
      subcategory: 'engine',
      language: 'en',
      lastUpdated: '2024-01-05',
      priority: 5,
    },
  },
  {
    id: 'spec_safety_001',
    type: 'spec_kb',
    title: 'Safety Features and Ratings',
    content: `Standard safety features across modern vehicles:
    - Airbags: Front, side, curtain, knee (count varies by model)
    - ABS (Anti-lock Braking System)
    - ESC (Electronic Stability Control)
    - Traction control
    Advanced driver assistance systems (ADAS):
    - Forward collision warning with automatic emergency braking
    - Lane departure warning and lane keeping assist
    - Blind spot monitoring
    - Rear cross-traffic alert
    - Adaptive cruise control
    Safety ratings: Look for 5-star ASEAN NCAP or equivalent ratings.`,
    metadata: {
      category: 'safety',
      language: 'en',
      lastUpdated: '2024-01-05',
      priority: 9,
    },
  },
  {
    id: 'spec_ev_001',
    type: 'spec_kb',
    title: 'Electric Vehicle Specifications',
    content: `EV-specific specifications:
    - Battery capacity (kWh): Energy storage size
    - Range (km/miles): EPA or WLTP estimated driving range
    - Charging speed: AC (kW) and DC fast charging (kW) max rates
    - Charging time: 0-80% on DC fast charger, full charge on AC
    - Motor output: kW/hp and torque Nm
    - Efficiency: kWh/100km consumption rate
    Battery warranty: Typically 8 years / 160,000 km with minimum capacity retention guarantee (70-80%).`,
    metadata: {
      category: 'powertrain',
      subcategory: 'electric',
      language: 'en',
      lastUpdated: '2024-01-05',
      priority: 7,
    },
  },
];

/**
 * Combined knowledge base for easy iteration
 */
export const allKnowledgeDocuments: KnowledgeDocument[] = [
  ...tascoPolicyKB,
  ...faqKB,
  ...specKB,
];

/**
 * Simple keyword-based retrieval (Phase 2 implementation)
 * Will be enhanced with vector embeddings in Phase 3
 */
export function retrieveKnowledge(
  query: string,
  filters?: {
    type?: KnowledgeDocument['type'];
    language?: 'en' | 'vi';
    categories?: string[];
  },
  topK: number = 3
): KnowledgeDocument[] {
  const queryLower = query.toLowerCase();
  
  let filtered = allKnowledgeDocuments.filter(doc => {
    if (filters?.type && doc.type !== filters.type) return false;
    if (filters?.language && doc.metadata.language !== filters.language) return false;
    if (filters?.categories && !filters.categories.includes(doc.metadata.category)) return false;
    return true;
  });

  // Simple keyword scoring
  const scored = filtered.map(doc => {
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();
    
    let score = 0;
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 5;
      if (contentLower.includes(word)) score += 2;
    });

    // Boost by priority
    score += (doc.metadata.priority || 0) * 0.1;

    return { doc, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top K results
  return scored.slice(0, topK).map(({ doc }) => doc);
}

/**
 * Get knowledge document by ID
 */
export function getKnowledgeById(id: string): KnowledgeDocument | undefined {
  return allKnowledgeDocuments.find(doc => doc.id === id);
}
