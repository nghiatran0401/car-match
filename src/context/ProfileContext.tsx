import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserProfile, SelectionHistory, Vehicle } from '../types';
import { vehicles } from '../data/vehicles';

interface ProfileContextType {
  profile: UserProfile;
  isHydrated: boolean;
  isComplete: boolean;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
  setSelections: React.Dispatch<React.SetStateAction<SelectionHistory[]>>;
  selections: SelectionHistory[];
  activeFilters: Partial<UserProfile> | null;
  setActiveFilters: React.Dispatch<React.SetStateAction<Partial<UserProfile> | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const defaultProfile: UserProfile = {
  lifeStage: 'young-professional',
  primaryUseNeed: 'urban-commute',
  drivingMix: 'city-heavy',
  financeIntent: 'value-conscious',
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selections, setSelections] = useState<SelectionHistory[]>([]);
  const [activeFilters, setActiveFilters] = useState<Partial<UserProfile> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vroom-profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved profile', e);
      }
    }
    setIsHydrated(true);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('vroom-profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(defaultProfile);
    localStorage.removeItem('vroom-profile');
    setSelections([]);
    setActiveFilters(null);
  }, []);

  const isComplete = true;

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isHydrated,
        isComplete,
        updateProfile,
        resetProfile,
        selections,
        setSelections,
        activeFilters,
        setActiveFilters,
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
    if (filters.powertrains && filters.powertrains.length > 0) {
      if (!filters.powertrains.includes(vehicle.powertrain)) return false;
    }
    if (filters.fuelTypes && filters.fuelTypes.length > 0) {
      if (!filters.fuelTypes.includes(vehicle.fuelType)) return false;
    }
    return true;
  });
}
