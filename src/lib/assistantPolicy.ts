import type { AssistantAction } from './assistantActions';

export interface ActionPolicyDecision {
  confidence: number;
  requiresConfirmation: boolean;
  reason: string;
}

export function evaluateActionPolicy(action: AssistantAction): ActionPolicyDecision {
  switch (action.kind) {
    case 'navigate':
      if (action.target === '/quote' || action.target === '/booking') {
        return {
          confidence: 0.9,
          requiresConfirmation: true,
          reason: 'This navigation moves the user into high-intent sales flow.',
        };
      }
      return {
        confidence: 0.8,
        requiresConfirmation: false,
        reason: 'Navigation is reversible and safe.',
      };
    case 'open_vehicle':
      return {
        confidence: 0.85,
        requiresConfirmation: false,
        reason: 'Opening vehicle details is safe and reversible.',
      };
    case 'set_controls':
      return {
        confidence: 0.78,
        requiresConfirmation: false,
        reason: 'Filter adjustments can be changed instantly.',
      };
    case 'update_profile':
      return {
        confidence: 0.72,
        requiresConfirmation: false,
        reason: 'Profile updates improve personalization and remain user-editable.',
      };
    case 'compare_add':
      return {
        confidence: 0.8,
        requiresConfirmation: false,
        reason: 'Adding to compare is low risk and reversible.',
      };
    case 'none':
      return {
        confidence: 0.4,
        requiresConfirmation: false,
        reason: action.reason,
      };
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}

