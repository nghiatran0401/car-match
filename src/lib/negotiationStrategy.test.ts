import { describe, expect, it } from 'vitest';
import { buildNegotiationStrategy } from './negotiationStrategy';

const guardrails = {
  discountMinPct: 3,
  discountMaxPct: 8,
  aprMinPct: 5.9,
  aprMaxPct: 9.9,
  minDepositPct: 10,
  maxDepositPct: 30,
  allowedPerks: ['Accessories package', 'Service package', 'Extended warranty'],
};

describe('buildNegotiationStrategy', () => {
  it('caps requested discount to guardrail max', () => {
    const result = buildNegotiationStrategy('Can I get 12% discount?', guardrails, 'en');
    expect(result).not.toBeNull();
    expect(result?.approvedDiscountPct).toBe(8);
  });

  it('returns null for non-negotiation messages', () => {
    const result = buildNegotiationStrategy('Show me SUV options', guardrails, 'en');
    expect(result).toBeNull();
  });
});

