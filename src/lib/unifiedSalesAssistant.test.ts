import { describe, expect, it } from 'vitest';
import { buildUnifiedAssistantContextSummary, inferUnifiedJourneyStage } from './unifiedSalesAssistant';

describe('unifiedSalesAssistant', () => {
  it('builds a shared context summary with stage and transcript', () => {
    const summary = buildUnifiedAssistantContextSummary({
      language: 'en',
      pathname: '/vehicle/byd-sealion-6',
      profile: {
        budgetBand: '1000-1400',
        powertrains: ['phev'],
        primaryUseNeed: 'family-shuttle',
      },
      currentVehicle: {
        id: '1',
        modelSlug: 'byd-sealion-6',
        name: 'BYD Sealion 6',
        trim: 'Premium',
        bodyStyle: 'SUV',
        vehicleType: 'suv',
        size: 'mid-size',
        powertrain: 'phev',
        fuelType: 'hybrid',
        priceBand: '1.0-1.2b',
        priceEntryMilVnd: 1020,
        thesis: 'Value PHEV family SUV',
        strengths: [],
        matchTags: [],
        compare: {
          budgetFit: 'strong',
          range: 'great',
          cityDriving: 'strong',
          highwayComfort: 'good',
          cabinFlexibility: 'good',
          ownershipPath: 'balanced',
          charging: 'home',
        },
      },
      comparedVehicles: [],
      shortlistVehicles: [],
      recentMessages: [
        { role: 'user', content: 'Need a family SUV near 1.2b' },
        { role: 'assistant', content: 'I recommend Sealion 6 and can show quote options.' },
      ],
    });

    expect(summary).toContain('one unified CarMatch AI salesperson');
    expect(summary).toContain('Current stage: detail');
    expect(summary).toContain('Current vehicle: BYD Sealion 6 (byd-sealion-6).');
    expect(summary).toContain('User: Need a family SUV near 1.2b');
  });

  it('detects journey stage from pathname', () => {
    expect(inferUnifiedJourneyStage('/compare')).toBe('compare');
    expect(inferUnifiedJourneyStage('/booking')).toBe('booking');
    expect(inferUnifiedJourneyStage('/')).toBe('intake');
  });
});

