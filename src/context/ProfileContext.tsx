import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserProfile, SelectionHistory, Vehicle } from '../types';
import { vehicles } from '../data/vehicles';

const STORAGE_KEY = 'carmatch-profile-bundle';

export interface OnboardingState {
  stepIndex: number;
  answeredFlags: [boolean, boolean, boolean, boolean, boolean];
}

export interface AIRecommendationControls {
  query?: string;
  sortBy?: 'best-match' | 'price-low' | 'price-high' | 'name-az';
  vehicleTypeFilter?: 'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback';
  powertrainFilter?: 'all' | 'ice' | 'hybrid' | 'phev' | 'ev';
  budgetBand?: 'under-1000' | '1000-1400' | '1400-1900' | '1900-plus' | 'flexible';
  source?: 'ai-copilot';
  updatedAt: number;
}

interface ProfileBundle {
  profile: UserProfile;
  onboarding: OnboardingState;
}

interface ProfileContextType {
  profile: UserProfile;
  onboarding: OnboardingState;
  isHydrated: boolean;
  answeredCount: number;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
  setSelections: React.Dispatch<React.SetStateAction<SelectionHistory[]>>;
  selections: SelectionHistory[];
  activeFilters: Partial<UserProfile> | null;
  setActiveFilters: React.Dispatch<React.SetStateAction<Partial<UserProfile> | null>>;
  aiRecommendationControls: AIRecommendationControls | null;
  setAIRecommendationControls: React.Dispatch<React.SetStateAction<AIRecommendationControls | null>>;
  setOnboarding: React.Dispatch<React.SetStateAction<OnboardingState>>;
  clearWizardAnswers: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const defaultProfile: UserProfile = {};

const defaultOnboarding: OnboardingState = {
  stepIndex: 0,
  answeredFlags: [false, false, false, false, false],
};

function loadBundle(): ProfileBundle {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ProfileBundle>;
      if (parsed && typeof parsed === 'object' && parsed.profile) {
        return {
          profile: { ...defaultProfile, ...parsed.profile },
          onboarding: {
            stepIndex: Math.min(
              5,
              Math.max(0, Number(parsed.onboarding?.stepIndex) || 0),
            ),
            answeredFlags: normalizeFlags(parsed.onboarding?.answeredFlags),
          },
        };
      }
    } catch (e) {
      console.error('Failed to parse saved profile bundle', e);
    }
  }

  const legacy = localStorage.getItem('vroom-profile');
  if (legacy) {
    try {
      const profile = JSON.parse(legacy) as UserProfile;
      return { profile: { ...defaultProfile, ...profile }, onboarding: defaultOnboarding };
    } catch {
      /* ignore */
    }
  }

  return { profile: defaultProfile, onboarding: defaultOnboarding };
}

function normalizeFlags(flags: unknown): [boolean, boolean, boolean, boolean, boolean] {
  if (!Array.isArray(flags) || flags.length < 5) {
    return [false, false, false, false, false];
  }
  return [
    Boolean(flags[0]),
    Boolean(flags[1]),
    Boolean(flags[2]),
    Boolean(flags[3]),
    Boolean(flags[4]),
  ];
}

function saveBundle(profile: UserProfile, onboarding: OnboardingState) {
  const payload: ProfileBundle = { profile, onboarding };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [onboarding, setOnboarding] = useState<OnboardingState>(defaultOnboarding);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selections, setSelections] = useState<SelectionHistory[]>([]);
  const [activeFilters, setActiveFilters] = useState<Partial<UserProfile> | null>(null);
  const [aiRecommendationControls, setAIRecommendationControls] = useState<AIRecommendationControls | null>(null);

  useEffect(() => {
    const bundle = loadBundle();
    setProfile(bundle.profile);
    setOnboarding(bundle.onboarding);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveBundle(profile, onboarding);
  }, [profile, onboarding, isHydrated]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(defaultProfile);
    setOnboarding(defaultOnboarding);
    setSelections([]);
    setActiveFilters(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('vroom-profile');
    localStorage.removeItem('carmatch-compare-ids');
    window.dispatchEvent(new Event('carmatch:compare-reset'));
  }, []);

  const clearWizardAnswers = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      lifeStage: undefined,
      primaryUseNeed: undefined,
      drivingMix: undefined,
      financeIntent: undefined,
      budgetBand: undefined,
      powertrains: undefined,
    }));
    setOnboarding(defaultOnboarding);
  }, []);

  const answeredCount = onboarding.answeredFlags.filter(Boolean).length;

  return (
    <ProfileContext.Provider
      value={{
        profile,
        onboarding,
        isHydrated,
        answeredCount,
        updateProfile,
        resetProfile,
        selections,
        setSelections,
        activeFilters,
        setActiveFilters,
        aiRecommendationControls,
        setAIRecommendationControls,
        setOnboarding,
        clearWizardAnswers,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

export function filterVehicles(filters: Partial<UserProfile>): Vehicle[] {
  return vehicles.filter(vehicle => {
    if (filters.vehicleTypes && filters.vehicleTypes.length > 0) {
      if (!filters.vehicleTypes.includes(vehicle.vehicleType)) return false;
    }
    if (filters.sizes && filters.sizes.length > 0) {
      if (!filters.sizes.includes(vehicle.size)) return false;
    }
    if (filters.powertrains !== undefined && filters.powertrains.length > 0) {
      if (!filters.powertrains.includes(vehicle.powertrain)) return false;
    }
    if (filters.fuelTypes && filters.fuelTypes.length > 0) {
      if (!filters.fuelTypes.includes(vehicle.fuelType)) return false;
    }
    return true;
  });
}
