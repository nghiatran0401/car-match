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
  lifeStage: string;
  primaryUseNeed: string;
  drivingMix: string;
  financeIntent: string;
  vehicleTypes?: string[];
  sizes?: string[];
  powertrains?: string[];
  fuelTypes?: string[];
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
