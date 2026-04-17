import {
  calculateNextBestAction,
  createConversationState,
  deserializeState,
  detectStageFromPath,
  recordBuyingSignal,
  recordComparison,
  recordVehicleView,
  serializeState,
  transitionToStage,
  type ConversationState,
} from './ai/stateMachine';
import type { AssistantAction } from './assistantActions';

const STORAGE_KEY = 'carmatch-ai-journey-state';

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

export function loadJourneyState(): ConversationState {
  if (typeof window === 'undefined') return createConversationState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createConversationState();
  const state = deserializeState(raw);
  return {
    ...state,
    recommendedNextAction: calculateNextBestAction(state),
  };
}

export function persistJourneyState(state: ConversationState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, serializeState(state));
}

export function updateJourneyForPath(state: ConversationState, pathname: string): ConversationState {
  const targetStage = detectStageFromPath(pathname);
  const transitioned = targetStage === state.currentStage ? state : transitionToStage(state, targetStage);
  return {
    ...transitioned,
    recommendedNextAction: calculateNextBestAction(transitioned),
  };
}

export function updateJourneyForTurn(state: ConversationState, userText: string): ConversationState {
  const text = userText.toLowerCase();
  let nextState = { ...state };
  if (hasKeyword(text, ['discount', 'giam', 'giảm', 'final price', 'best price'])) {
    nextState = recordBuyingSignal(nextState, 'asked_discount');
  }
  if (hasKeyword(text, ['finance', 'loan', 'monthly', 'tra gop', 'trả góp'])) {
    nextState = recordBuyingSignal(nextState, 'asked_finance');
  }
  if (hasKeyword(text, ['booking', 'appointment', 'dat lich', 'đặt lịch', 'showroom'])) {
    nextState = recordBuyingSignal(nextState, 'asked_appointment');
  }
  return {
    ...nextState,
    messageCount: nextState.messageCount + 1,
    recommendedNextAction: calculateNextBestAction(nextState),
  };
}

export function updateJourneyForAction(state: ConversationState, action: AssistantAction): ConversationState {
  let nextState = state;
  switch (action.kind) {
    case 'open_vehicle':
      nextState = recordVehicleView(nextState, action.modelSlug);
      break;
    case 'compare_add':
      nextState = recordComparison(nextState, [action.vehicleId]);
      break;
    case 'navigate':
      nextState = updateJourneyForPath(nextState, action.target);
      break;
    case 'set_controls':
    case 'update_profile':
    case 'none':
      break;
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
  return {
    ...nextState,
    recommendedNextAction: calculateNextBestAction(nextState),
  };
}

