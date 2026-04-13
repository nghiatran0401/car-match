export interface SpecSection {
  title: string;
  rows: { label: string; value: string }[];
}

export interface Vehicle {
  id: string;
  modelSlug: string;
  name: string;
  trim: string;
  bodyStyle: string;
  vehicleType: 'sedan' | 'suv' | 'crossover' | 'hatchback';
  size: 'compact' | 'mid-size' | 'full-size';
  powertrain: 'ice' | 'hybrid' | 'phev' | 'ev';
  fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  priceBand: string;
  /** Entry list price in million VND (used for budget fit & finance estimates) */
  priceEntryMilVnd: number;
  thesis: string;
  strengths: string[];
  matchTags: string[];
  compare: {
    budgetFit: string;
    range: string;
    charging?: string;
    cityDriving: string;
    highwayComfort: string;
    cabinFlexibility: string;
    ownershipPath: string;
  };
  heroImage?: string;
}

export interface UserProfile {
  lifeStage?: string;
  primaryUseNeed?: string;
  drivingMix?: string;
  /** Shopping budget band from intake (Question 4) */
  budgetBand?: string;
  financeIntent?: string;
  vehicleTypes?: string[];
  sizes?: string[];
  powertrains?: string[];
  fuelTypes?: string[];
}

export interface PriorityWeights {
  safety: number;
  style: number;
  practicality: number;
  premium: number;
  value: number;
  comfort: number;
}

export interface LeadRecord {
  id: string;
  createdAt: string;
  type: 'quote' | 'booking';
  vehicleModelSlug?: string;
  showroomId?: string;
  contact: { name: string; email: string; phone: string };
  notes?: string;
  finance?: { downPct: number; termMonths: number; rateApr: number; monthlyEstimateVnd: number };
  profileSnapshot?: Partial<UserProfile>;
  commercialContext?: {
    insurancePlan?: 'none' | 'basic' | 'premium';
    policyApplied?: boolean;
    documentChecklistAccepted?: boolean;
    reservationIntent?: boolean;
  };
}

export interface RecommendationStage {
  key: string;
  title: string;
  prompt: string;
  helper: string;
  options: {
    id: string;
    label: string;
    hint: string;
    nextRecommendationIds: string[];
  }[];
}

export interface ComparisonCriterion {
  key: keyof Vehicle['compare'];
  label: string;
}

export interface SelectionHistory {
  stageTitle: string;
  label: string;
}

export interface MerchantDealGuardrails {
  discountMinPct: number;
  discountMaxPct: number;
  aprMinPct: number;
  aprMaxPct: number;
  minDepositPct: number;
  maxDepositPct: number;
  allowedPerks: string[];
}
