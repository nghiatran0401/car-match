import type { UserProfile, Vehicle } from '../types';
import type { AppLanguage } from '../context/LanguageContext';
import { detectStageFromPath, type FunnelStage } from './ai/stateMachine';

export interface UnifiedAssistantContextInput {
  language: AppLanguage;
  pathname: string;
  profile?: UserProfile;
  currentVehicle?: Vehicle;
  comparedVehicles?: Vehicle[];
  shortlistVehicles?: Vehicle[];
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function safeJoin(values: Array<string | undefined>, fallback: string): string {
  const resolved = values.map(value => value?.trim()).filter(Boolean) as string[];
  return resolved.length > 0 ? resolved.join(', ') : fallback;
}

function summarizeProfile(profile?: UserProfile): string {
  if (!profile) return 'No profile captured yet.';
  return [
    `lifeStage=${profile.lifeStage ?? 'unknown'}`,
    `primaryUseNeed=${profile.primaryUseNeed ?? 'unknown'}`,
    `drivingMix=${profile.drivingMix ?? 'unknown'}`,
    `budgetBand=${profile.budgetBand ?? 'unknown'}`,
    `powertrains=${profile.powertrains?.join('|') ?? 'unknown'}`,
    `vehicleTypes=${profile.vehicleTypes?.join('|') ?? 'unknown'}`,
    `financeIntent=${profile.financeIntent ?? 'unknown'}`,
  ].join('; ');
}

function summarizeRecentTurns(
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTurns = 6,
): string {
  const compact = recentMessages
    .slice(-maxTurns)
    .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content.trim().slice(0, 180)}`);
  return compact.length > 0 ? compact.join('\n') : 'No prior turns.';
}

export function buildUnifiedAssistantContextSummary(input: UnifiedAssistantContextInput): string {
  const stage = detectStageFromPath(input.pathname);
  const locale = input.language === 'vi' ? 'Vietnamese' : 'English';
  const compared = safeJoin(input.comparedVehicles?.map(vehicle => vehicle.name) ?? [], 'none');
  const shortlist = safeJoin(input.shortlistVehicles?.map(vehicle => vehicle.name) ?? [], 'none');
  const currentVehicle = input.currentVehicle ? `${input.currentVehicle.name} (${input.currentVehicle.modelSlug})` : 'none';
  const profileSummary = summarizeProfile(input.profile);
  const turns = summarizeRecentTurns(input.recentMessages);

  return [
    'You are one unified CarMatch AI salesperson named Pulse.',
    'Keep a consultative, decisive sales tone and drive user to clear next actions.',
    `Current stage: ${stage}. Language preference: ${locale}.`,
    `Current vehicle: ${currentVehicle}.`,
    `Compared vehicles: ${compared}.`,
    `Shortlist vehicles: ${shortlist}.`,
    `Profile summary: ${profileSummary}`,
    'Recent transcript:',
    turns,
  ].join('\n');
}

export function inferUnifiedJourneyStage(pathname: string): FunnelStage {
  return detectStageFromPath(pathname);
}

