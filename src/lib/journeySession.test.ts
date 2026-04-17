import { beforeEach, describe, expect, it } from 'vitest';
import { loadJourneyState, updateJourneyForAction, updateJourneyForTurn } from './journeySession';

beforeEach(() => {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
});

describe('journeySession', () => {
  it('records booking intent from turn text', () => {
    const base = loadJourneyState();
    const next = updateJourneyForTurn(base, 'Can I book a showroom appointment?');
    expect(next.buyingSignals).toContain('asked_appointment');
  });

  it('transitions stage when navigating to quote', () => {
    const base = loadJourneyState();
    const next = updateJourneyForAction(base, { kind: 'navigate', target: '/quote' });
    expect(next.currentStage).toBe('quote');
  });
});

