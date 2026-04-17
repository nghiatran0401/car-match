import { describe, expect, it } from 'vitest';
import { evaluateActionPolicy } from './assistantPolicy';

describe('evaluateActionPolicy', () => {
  it('requires confirmation for quote navigation', () => {
    const decision = evaluateActionPolicy({ kind: 'navigate', target: '/quote' });
    expect(decision.requiresConfirmation).toBe(true);
    expect(decision.confidence).toBeGreaterThan(0.85);
  });

  it('allows compare actions without confirmation', () => {
    const decision = evaluateActionPolicy({ kind: 'compare_add', vehicleId: 'v1' });
    expect(decision.requiresConfirmation).toBe(false);
  });
});

