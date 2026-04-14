import { describe, expect, it } from 'vitest';
import { buildCarAssistantSystemPrompt, type AssistantContext } from './aiAssistant';

const baseContext: AssistantContext = {
  profile: {
    lifeStage: 'young family',
    primaryUseNeed: 'daily commute',
    drivingMix: 'city-heavy',
    budgetBand: '700-900m',
    financeIntent: 'loan',
  },
  currentVehicle: {
    id: 'v1',
    modelSlug: 'vinfast-vf8',
    name: 'VinFast VF 8',
    trim: 'Eco',
    bodyStyle: 'SUV',
    vehicleType: 'suv',
    size: 'mid-size',
    powertrain: 'ev',
    fuelType: 'electric',
    priceBand: '900m-1.1b',
    priceEntryMilVnd: 900,
    thesis: 'Strong value EV for family usage.',
    strengths: [],
    matchTags: [],
    compare: {
      budgetFit: 'good',
      range: '420km',
      cityDriving: 'smooth',
      highwayComfort: 'stable',
      cabinFlexibility: 'spacious',
      ownershipPath: 'low running cost',
      charging: 'home + fast charging',
    },
  },
  comparedVehicles: [],
  shortlistVehicles: [],
  merchantGuardrails: {
    discountMinPct: 1,
    discountMaxPct: 4,
    aprMinPct: 6,
    aprMaxPct: 9,
    minDepositPct: 10,
    maxDepositPct: 30,
    allowedPerks: ['insurance', 'service package'],
  },
};

describe('buildCarAssistantSystemPrompt', () => {
  it('renders English prompt with context placeholders replaced', () => {
    const prompt = buildCarAssistantSystemPrompt({
      ...baseContext,
      language: 'en',
      adminPromptInstructions: 'Prioritize this month stock clearance.',
    });

    expect(prompt).toContain('You are the official showroom salesperson for CarMatch.');
    expect(prompt).toContain('- life stage: young family');
    expect(prompt).toContain('VinFast VF 8 (Eco)');
    expect(prompt).toContain('discount range: 1% to 4%');
    expect(prompt).toContain('Prioritize this month stock clearance.');
    expect(prompt).not.toContain('{{CONTEXT_PROFILE_SUMMARY}}');
  });

  it('renders Vietnamese prompt with default merchant instruction fallback', () => {
    const prompt = buildCarAssistantSystemPrompt({
      ...baseContext,
      language: 'vi',
      adminPromptInstructions: undefined,
    });

    expect(prompt).toContain('Ban la nhan vien sales chinh thuc cua showroom CarMatch.');
    expect(prompt).toContain('- life stage: young family');
    expect(prompt).toContain('Khong co chi dan bo sung tu merchant.');
    expect(prompt).not.toContain('{{CONTEXT_MERCHANT_GUARDRAILS}}');
  });
});
