/**
 * Conversation State Machine for AI Assistant
 * Tracks user journey through PRD funnel: intake → shortlist → compare → detail → quote → booking → showroom
 * Enables state-aware next best action recommendations (Optimization Plan Phase 3)
 */

export type FunnelStage = 
  | 'intake'
  | 'shortlist'
  | 'compare'
  | 'detail'
  | 'quote'
  | 'booking'
  | 'showroom';

export interface ConversationState {
  // Journey tracking
  currentStage: FunnelStage;
  stageHistory: Array<{
    stage: FunnelStage;
    enteredAt: string;
    exitedAt?: string;
  }>;
  
  // Context accumulation
  viewedVehicles: string[]; // vehicle IDs
  comparedVehicles: string[]; // vehicle IDs
  shortlistedVehicles: string[]; // vehicle IDs
  
  // Intent signals
  lastIntent?: string;
  intentConfidence?: number;
  buyingSignals: string[]; // e.g., 'asked_discount', 'asked_finance', 'asked_appointment'
  
  // Tool usage tracking
  toolsUsed: Array<{
    toolName: string;
    timestamp: string;
    success: boolean;
  }>;
  
  // Guardrail events
  policyChecks: Array<{
    requestType: string;
    requestedValue: string | number;
    isAllowed: boolean;
    timestamp: string;
  }>;
  
  // Conversation metadata
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
  
  // Next best action recommendation
  recommendedNextAction?: {
    action: string;
    reason: string;
    confidence: number;
  };
}

/**
 * Stage transition rules based on PRD funnel
 */
const stageTransitions: Record<FunnelStage, FunnelStage[]> = {
  intake: ['shortlist', 'compare'],
  shortlist: ['compare', 'detail', 'intake'],
  compare: ['detail', 'shortlist', 'quote'],
  detail: ['quote', 'compare', 'shortlist'],
  quote: ['booking', 'showroom', 'detail'],
  booking: ['showroom', 'quote'],
  showroom: [], // Terminal stage
};

/**
 * Initialize a new conversation state
 */
export function createConversationState(): ConversationState {
  const now = new Date().toISOString();
  return {
    currentStage: 'intake',
    stageHistory: [{ stage: 'intake', enteredAt: now }],
    viewedVehicles: [],
    comparedVehicles: [],
    shortlistedVehicles: [],
    buyingSignals: [],
    toolsUsed: [],
    policyChecks: [],
    messageCount: 0,
    startedAt: now,
    lastActivityAt: now,
    recommendedNextAction: undefined,
  };
}

/**
 * Transition to a new funnel stage
 */
export function transitionToStage(
  state: ConversationState,
  newStage: FunnelStage
): ConversationState {
  const allowedTransitions = stageTransitions[state.currentStage];
  
  if (!allowedTransitions.includes(newStage) && newStage !== state.currentStage) {
    // Log warning but allow (user behavior may be non-linear)
    console.warn(`Non-standard transition: ${state.currentStage} -> ${newStage}`);
  }
  
  const now = new Date().toISOString();
  const updatedHistory = state.stageHistory.map((entry, idx) => {
    if (idx === state.stageHistory.length - 1 && !entry.exitedAt) {
      return { ...entry, exitedAt: now };
    }
    return entry;
  });
  
  return {
    ...state,
    currentStage: newStage,
    stageHistory: [...updatedHistory, { stage: newStage, enteredAt: now }],
    lastActivityAt: now,
  };
}

/**
 * Record a vehicle view
 */
export function recordVehicleView(
  state: ConversationState,
  vehicleId: string
): ConversationState {
  if (state.viewedVehicles.includes(vehicleId)) {
    return state;
  }
  
  let newState = {
    ...state,
    viewedVehicles: [...state.viewedVehicles, vehicleId],
    lastActivityAt: new Date().toISOString(),
    messageCount: state.messageCount + 1,
  };
  
  // Auto-transition to 'detail' if viewing a specific vehicle
  if (state.currentStage === 'intake' || state.currentStage === 'shortlist') {
    newState = transitionToStage(newState, 'detail');
  }
  
  return newState;
}

/**
 * Record vehicles added to comparison
 */
export function recordComparison(
  state: ConversationState,
  vehicleIds: string[]
): ConversationState {
  const newComparisons = vehicleIds.filter(id => !state.comparedVehicles.includes(id));
  if (newComparisons.length === 0) {
    return state;
  }
  
  let newState = {
    ...state,
    comparedVehicles: [...state.comparedVehicles, ...newComparisons],
    lastActivityAt: new Date().toISOString(),
    messageCount: state.messageCount + 1,
  };
  
  // Transition to 'compare' stage
  newState = transitionToStage(newState, 'compare');
  
  return newState;
}

/**
 * Record a buying signal
 */
export function recordBuyingSignal(
  state: ConversationState,
  signal: string
): ConversationState {
  if (state.buyingSignals.includes(signal)) {
    return state;
  }
  
  return {
    ...state,
    buyingSignals: [...state.buyingSignals, signal],
    lastActivityAt: new Date().toISOString(),
  };
}

/**
 * Record tool usage
 */
export function recordToolUsage(
  state: ConversationState,
  toolName: string,
  success: boolean
): ConversationState {
  return {
    ...state,
    toolsUsed: [
      ...state.toolsUsed,
      {
        toolName,
        timestamp: new Date().toISOString(),
        success,
      },
    ],
    lastActivityAt: new Date().toISOString(),
  };
}

/**
 * Record policy check
 */
export function recordPolicyCheck(
  state: ConversationState,
  requestType: string,
  requestedValue: string | number,
  isAllowed: boolean
): ConversationState {
  return {
    ...state,
    policyChecks: [
      ...state.policyChecks,
      {
        requestType,
        requestedValue,
        isAllowed,
        timestamp: new Date().toISOString(),
      },
    ],
    lastActivityAt: new Date().toISOString(),
  };
}

/**
 * Calculate next best action based on conversation state
 * Aligned with PRD conversion goals
 */
export function calculateNextBestAction(
  state: ConversationState
): ConversationState['recommendedNextAction'] {
  const { currentStage, viewedVehicles, comparedVehicles, buyingSignals, policyChecks } = state;
  
  // High-intent signals: push toward booking/showroom
  if (buyingSignals.includes('asked_appointment') || buyingSignals.includes('asked_booking')) {
    return {
      action: 'propose_showroom_visit',
      reason: 'User has shown appointment/booking interest',
      confidence: 0.9,
    };
  }
  
  if (buyingSignals.includes('asked_discount') || buyingSignals.includes('asked_final_price')) {
    return {
      action: 'generate_quote',
      reason: 'User is asking about pricing/discounts - ready for quote',
      confidence: 0.85,
    };
  }
  
  if (buyingSignals.includes('asked_finance')) {
    return {
      action: 'calculate_finance_estimate',
      reason: 'User interested in financing options',
      confidence: 0.8,
    };
  }
  
  // Stage-based recommendations
  switch (currentStage) {
    case 'intake':
      if (viewedVehicles.length === 0) {
        return {
          action: 'complete_profile_intake',
          reason: 'User hasn\'t viewed any vehicles yet - complete intake first',
          confidence: 0.7,
        };
      }
      return {
        action: 'view_shortlist',
        reason: 'Profile complete - show personalized shortlist',
        confidence: 0.75,
      };
    
    case 'shortlist':
      if (comparedVehicles.length < 2) {
        return {
          action: 'compare_vehicles',
          reason: 'Compare 2-3 vehicles to make informed decision',
          confidence: 0.7,
        };
      }
      return {
        action: 'select_top_choice',
        reason: 'Comparison complete - select preferred model',
        confidence: 0.75,
      };
    
    case 'compare':
      return {
        action: 'view_detail_specs',
        reason: 'Review detailed specifications of top choice',
        confidence: 0.7,
      };
    
    case 'detail':
      const recentPolicyCheck = policyChecks[policyChecks.length - 1];
      if (recentPolicyCheck?.isAllowed) {
        return {
          action: 'proceed_to_quote',
          reason: 'Policy-compliant discount discussed - ready for formal quote',
          confidence: 0.8,
        };
      }
      return {
        action: 'discuss_pricing_options',
        reason: 'Help user understand pricing and available discounts',
        confidence: 0.65,
      };
    
    case 'quote':
      return {
        action: 'schedule_test_drive',
        reason: 'Quote reviewed - schedule test drive or showroom visit',
        confidence: 0.85,
      };
    
    case 'booking':
      return {
        action: 'confirm_showroom_appointment',
        reason: 'Booking initiated - finalize appointment details',
        confidence: 0.9,
      };
    
    case 'showroom':
      return {
        action: 'prepare_for_visit',
        reason: 'Appointment confirmed - provide visit preparation info',
        confidence: 0.95,
      };
    
    default:
      return {
        action: 'continue_conversation',
        reason: 'No specific next action identified',
        confidence: 0.5,
      };
  }
}

/**
 * Detect funnel stage from URL path
 */
export function detectStageFromPath(pathname: string): FunnelStage {
  if (pathname.includes('/compare')) return 'compare';
  if (pathname.includes('/vehicle/')) return 'detail';
  if (pathname.includes('/quote')) return 'quote';
  if (pathname.includes('/booking')) return 'booking';
  if (pathname.includes('/showroom')) return 'showroom';
  if (pathname.includes('/recommendations') || pathname.includes('/shortlist')) return 'shortlist';
  return 'intake';
}

/**
 * Serialize conversation state for persistence
 */
export function serializeState(state: ConversationState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize conversation state from storage
 */
export function deserializeState(serialized: string): ConversationState {
  try {
    return JSON.parse(serialized) as ConversationState;
  } catch {
    return createConversationState();
  }
}

/**
 * Get conversation summary for analytics
 */
export function getConversationSummary(state: ConversationState): {
  durationMinutes: number;
  totalMessages: number;
  stagesVisited: FunnelStage[];
  vehiclesEngaged: number;
  toolsUsedCount: number;
  policyViolations: number;
  finalStage: FunnelStage;
} {
  const start = new Date(state.startedAt).getTime();
  const end = new Date(state.lastActivityAt).getTime();
  const durationMinutes = Math.round((end - start) / 60000);
  
  const policyViolations = state.policyChecks.filter(p => !p.isAllowed).length;
  
  return {
    durationMinutes,
    totalMessages: state.messageCount,
    stagesVisited: [...new Set(state.stageHistory.map(h => h.stage))],
    vehiclesEngaged: state.viewedVehicles.length,
    toolsUsedCount: state.toolsUsed.length,
    policyViolations,
    finalStage: state.currentStage,
  };
}
