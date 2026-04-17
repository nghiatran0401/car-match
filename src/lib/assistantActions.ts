import type { NavigateFunction } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import type { AIRecommendationControls } from '../context/ProfileContext';
import type { UserProfile, Vehicle } from '../types';
import { trackEvent } from './analytics';

type SortBy = NonNullable<AIRecommendationControls['sortBy']>;
type VehicleTypeFilter = NonNullable<AIRecommendationControls['vehicleTypeFilter']>;
type PowertrainFilter = NonNullable<AIRecommendationControls['powertrainFilter']>;
type BudgetBand = NonNullable<AIRecommendationControls['budgetBand']>;

export type AssistantAction =
  | { kind: 'navigate'; target: '/' | '/profile' | '/recommendations' | '/cars' | '/compare' | '/quote' | '/booking' | '/showrooms' | '/concierge' }
  | { kind: 'open_vehicle'; modelSlug: string }
  | { kind: 'set_controls'; controls: Partial<Pick<AIRecommendationControls, 'query' | 'sortBy' | 'vehicleTypeFilter' | 'powertrainFilter' | 'budgetBand'>> }
  | { kind: 'update_profile'; updates: Partial<UserProfile> }
  | { kind: 'compare_add'; vehicleId: string }
  | { kind: 'none'; reason: string };

export interface AssistantActionContext {
  userText: string;
  assistantText: string;
  vehicles: Vehicle[];
}

export interface AssistantActionDispatchContext {
  navigate: NavigateFunction;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setAIRecommendationControls: Dispatch<SetStateAction<AIRecommendationControls | null>>;
  toggleCompare: (vehicleId: string) => void;
  isInCompare: (vehicleId: string) => boolean;
}

function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findVehicleByText(vehicles: Vehicle[], text: string): Vehicle | undefined {
  const normalized = normalizeText(text);
  return vehicles.find(vehicle => normalized.includes(normalizeText(vehicle.modelSlug)) || normalized.includes(normalizeText(vehicle.name)));
}

function inferSortBy(text: string): SortBy | undefined {
  if (text.includes('re nhat') || text.includes('gia thap') || text.includes('cheapest') || text.includes('lowest price')) {
    return 'price-low';
  }
  if (text.includes('cao cap') || text.includes('premium') || text.includes('luxury')) {
    return 'price-high';
  }
  if (text.includes('a-z') || text.includes('alphabet')) return 'name-az';
  return undefined;
}

function inferVehicleType(text: string): VehicleTypeFilter | undefined {
  if (text.includes('suv')) return 'suv';
  if (text.includes('sedan')) return 'sedan';
  if (text.includes('crossover')) return 'crossover';
  if (text.includes('hatchback')) return 'hatchback';
  return undefined;
}

function inferPowertrain(text: string): PowertrainFilter | undefined {
  if (text.includes('phev')) return 'phev';
  if (text.includes('hybrid')) return 'hybrid';
  if (text.includes('xe dien') || text.includes('dien') || text.includes('ev') || text.includes('electric')) return 'ev';
  if (text.includes('xang') || text.includes('petrol') || text.includes('gasoline') || text.includes('ice')) return 'ice';
  return undefined;
}

function inferBudgetBand(text: string): BudgetBand | undefined {
  const normalized = text.replace(/,/g, '.');
  const tyMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(ty|ti|billion|bil|bn|b)\b/);
  if (tyMatch) {
    const billion = Number(tyMatch[1]);
    if (Number.isFinite(billion)) {
      const million = billion * 1000;
      if (million < 1000) return 'under-1000';
      if (million <= 1400) return '1000-1400';
      if (million <= 1900) return '1400-1900';
      return '1900-plus';
    }
  }

  const milMatch = normalized.match(/(\d{3,4})\s*(tr|trieu|m|million)\b/);
  if (milMatch) {
    const million = Number(milMatch[1]);
    if (Number.isFinite(million)) {
      if (million < 1000) return 'under-1000';
      if (million <= 1400) return '1000-1400';
      if (million <= 1900) return '1400-1900';
      return '1900-plus';
    }
  }
  return undefined;
}

function inferNavigation(text: string): AssistantAction['target'] | undefined {
  if (text.includes('so sanh') || text.includes('compare')) return '/compare';
  if (text.includes('bao gia') || text.includes('quote')) return '/quote';
  if (text.includes('dat lich') || text.includes('booking') || text.includes('test drive')) return '/booking';
  if (text.includes('showroom') || text.includes('dai ly') || text.includes('dealer')) return '/showrooms';
  if (text.includes('goi y') || text.includes('recommend')) return '/recommendations';
  if (text.includes('danh sach xe') || text.includes('all cars') || text.includes('catalog')) return '/cars';
  if (text.includes('ho so') || text.includes('profile')) return '/profile';
  if (text.includes('trang chu') || text.includes('home page')) return '/';
  return undefined;
}

export function detectAssistantActions(context: AssistantActionContext): AssistantAction[] {
  const text = normalizeText(`${context.userText} ${context.assistantText}`);
  const actions: AssistantAction[] = [];

  const navTarget = inferNavigation(text);
  if (navTarget) actions.push({ kind: 'navigate', target: navTarget });

  const vehicle = findVehicleByText(context.vehicles, text);
  if (vehicle && (text.includes('chi tiet') || text.includes('detail') || text.includes('model') || text.includes('xe'))) {
    actions.push({ kind: 'open_vehicle', modelSlug: vehicle.modelSlug });
  }
  if (vehicle && (text.includes('compare') || text.includes('so sanh'))) {
    actions.push({ kind: 'compare_add', vehicleId: vehicle.id });
  }

  const sortBy = inferSortBy(text);
  const vehicleTypeFilter = inferVehicleType(text);
  const powertrainFilter = inferPowertrain(text);
  const budgetBand = inferBudgetBand(text);
  if (sortBy || vehicleTypeFilter || powertrainFilter || budgetBand) {
    actions.push({
      kind: 'set_controls',
      controls: {
        sortBy,
        vehicleTypeFilter,
        powertrainFilter,
        budgetBand,
      },
    });
  }

  if (powertrainFilter) {
    actions.push({
      kind: 'update_profile',
      updates: { powertrains: [powertrainFilter] },
    });
  }
  if (vehicleTypeFilter) {
    actions.push({
      kind: 'update_profile',
      updates: { vehicleTypes: [vehicleTypeFilter] },
    });
  }
  if (budgetBand) {
    actions.push({
      kind: 'update_profile',
      updates: { budgetBand },
    });
  }

  const detected = actions.length === 0
    ? [{ kind: 'none', reason: 'No deterministic action detected from turn.' } satisfies AssistantAction]
    : actions;
  trackEvent('assistant_action_detected', {
    intent: detected.map(action => action.kind).join(','),
  });
  return detected;
}

export function executeAssistantAction(action: AssistantAction, context: AssistantActionDispatchContext): void {
  try {
    switch (action.kind) {
      case 'navigate':
        context.navigate(action.target);
        trackEvent('next_action_type', { intent: `navigate:${action.target}` });
        trackEvent('assistant_action_executed', { intent: `navigate:${action.target}` });
        return;
      case 'open_vehicle':
        context.navigate(`/vehicle/${action.modelSlug}`);
        trackEvent('next_action_type', { intent: `open_vehicle:${action.modelSlug}` });
        trackEvent('assistant_action_executed', { intent: `open_vehicle:${action.modelSlug}` });
        return;
      case 'set_controls':
        context.setAIRecommendationControls(prev => ({
          query: action.controls.query ?? prev?.query ?? '',
          sortBy: action.controls.sortBy ?? prev?.sortBy ?? 'best-match',
          vehicleTypeFilter: action.controls.vehicleTypeFilter ?? prev?.vehicleTypeFilter ?? 'all',
          powertrainFilter: action.controls.powertrainFilter ?? prev?.powertrainFilter ?? 'all',
          budgetBand: action.controls.budgetBand ?? prev?.budgetBand,
          source: 'ai-copilot',
          updatedAt: Date.now(),
        }));
        trackEvent('next_action_type', { intent: 'set_controls' });
        trackEvent('assistant_action_executed', { intent: 'set_controls' });
        return;
      case 'update_profile':
        context.updateProfile(action.updates);
        trackEvent('next_action_type', { intent: 'update_profile' });
        trackEvent('assistant_action_executed', { intent: 'update_profile' });
        return;
      case 'compare_add':
        if (!context.isInCompare(action.vehicleId)) {
          context.toggleCompare(action.vehicleId);
        }
        trackEvent('next_action_type', { intent: `compare_add:${action.vehicleId}` });
        trackEvent('assistant_action_executed', { intent: `compare_add:${action.vehicleId}` });
        return;
      case 'none':
        return;
      default: {
        const exhaustiveCheck: never = action;
        return exhaustiveCheck;
      }
    }
  } catch (error) {
    trackEvent('assistant_action_failed', {
      intent: action.kind,
      policyViolationDetails: error instanceof Error ? error.message : 'Unknown action execution error',
    });
  }
}
