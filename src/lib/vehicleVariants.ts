import type { Vehicle } from '../types';

export interface VehicleVariant {
  key: string;
  label: string;
  priceDeltaMilVnd: number;
}

const defaultVariants: VehicleVariant[] = [
  { key: 'core', label: 'Core', priceDeltaMilVnd: 0 },
  { key: 'plus', label: 'Plus', priceDeltaMilVnd: 90 },
  { key: 'signature', label: 'Signature', priceDeltaMilVnd: 180 },
];

const variantOverrides: Partial<Record<string, VehicleVariant[]>> = {
  ec40: [
    { key: 'core', label: 'Core', priceDeltaMilVnd: 0 },
    { key: 'ultra', label: 'Ultra', priceDeltaMilVnd: 140 },
    { key: 'performance', label: 'Performance', priceDeltaMilVnd: 260 },
  ],
  ex5: [
    { key: 'core', label: 'Core', priceDeltaMilVnd: 0 },
    { key: 'long-range', label: 'Long Range', priceDeltaMilVnd: 95 },
    { key: 'awd-pack', label: 'AWD Pack', priceDeltaMilVnd: 170 },
  ],
};

export function variantsForVehicle(vehicle: Vehicle): VehicleVariant[] {
  return variantOverrides[vehicle.modelSlug] ?? defaultVariants;
}

export function variantPriceMilVnd(vehicle: Vehicle, variantKey: string): number {
  const selected = variantsForVehicle(vehicle).find(v => v.key === variantKey);
  return vehicle.priceEntryMilVnd + (selected?.priceDeltaMilVnd ?? 0);
}

