import { beforeEach, describe, expect, it } from 'vitest';
import { detectAssistantActions } from './assistantActions';
import { evaluateActionPolicy } from './assistantPolicy';
import { loadJourneyState, updateJourneyForAction, updateJourneyForTurn } from './journeySession';
import { vehicles } from '../data/vehicles';

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
  const sessionStorageMock = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorageMock,
    configurable: true,
  });
});

describe('sales assistant end-to-end flow', () => {
  it('handles voice transcript to quote confirmation and journey transition', () => {
    const userVoiceTranscript = 'Cho tôi báo giá và điều hướng tới trang quote';
    const assistantTranscript = 'Mình sẽ mở trang báo giá cho bạn ngay.';

    const detected = detectAssistantActions({
      userText: userVoiceTranscript,
      assistantText: assistantTranscript,
      vehicles,
    });
    const quoteNavigate = detected.find(
      action => action.kind === 'navigate' && action.target === '/quote',
    );
    expect(quoteNavigate).toBeDefined();
    if (!quoteNavigate || quoteNavigate.kind !== 'navigate') {
      throw new Error('Expected navigation action to quote.');
    }

    const policy = evaluateActionPolicy(quoteNavigate);
    expect(policy.requiresConfirmation).toBe(true);

    const afterTurn = updateJourneyForTurn(loadJourneyState(), userVoiceTranscript);
    const afterConfirmedAction = updateJourneyForAction(afterTurn, quoteNavigate);
    expect(afterConfirmedAction.currentStage).toBe('quote');
  });
});

