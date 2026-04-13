import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { trackEvent } from '../lib/analytics';

const STORAGE_KEY = 'carmatch-compare-ids';
const MAX_MODELS = 4;

interface CompareContextValue {
  vehicleIds: string[];
  count: number;
  isInCompare: (vehicleId: string) => boolean;
  toggleVehicle: (vehicleId: string) => void;
  removeVehicle: (vehicleId: string) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setVehicleIds(parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_MODELS));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onReset = () => setVehicleIds([]);
    window.addEventListener('carmatch:compare-reset', onReset);
    return () => window.removeEventListener('carmatch:compare-reset', onReset);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicleIds));
    } catch {
      /* ignore */
    }
  }, [vehicleIds]);

  const isInCompare = useCallback((id: string) => vehicleIds.includes(id), [vehicleIds]);

  const toggleVehicle = useCallback((vehicleId: string) => {
    setVehicleIds(prev => {
      if (prev.includes(vehicleId)) {
        trackEvent('compare_model_removed', { vehicleModelSlug: vehicleId });
        return prev.filter(x => x !== vehicleId);
      }
      if (prev.length >= MAX_MODELS) {
        return prev;
      }
      trackEvent('compare_model_added', { vehicleModelSlug: vehicleId });
      if (prev.length === 0) {
        trackEvent('compare_started', { vehicleModelSlug: vehicleId });
      }
      return [...prev, vehicleId];
    });
  }, []);

  const removeVehicle = useCallback((vehicleId: string) => {
    setVehicleIds(prev => prev.filter(x => x !== vehicleId));
    trackEvent('compare_model_removed', { vehicleModelSlug: vehicleId });
  }, []);

  const clearCompare = useCallback(() => {
    setVehicleIds([]);
  }, []);

  const value = useMemo(
    () => ({
      vehicleIds,
      count: vehicleIds.length,
      isInCompare,
      toggleVehicle,
      removeVehicle,
      clearCompare,
    }),
    [vehicleIds, isInCompare, toggleVehicle, removeVehicle, clearCompare],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
