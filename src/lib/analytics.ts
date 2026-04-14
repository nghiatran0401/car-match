import type { UserProfile } from '../types';
import type { FunnelStage } from './ai/stateMachine';

const STORAGE_KEY = 'carmatch-analytics-events';
const MAX_EVENTS = 200;

export type AnalyticsEventName =
  // Original funnel events
  | 'questionnaire_started'
  | 'question_answered'
  | 'question_skipped'
  | 'shortlist_viewed'
  | 'recommendation_clicked'
  | 'vehicle_detail_viewed'
  | 'compare_started'
  | 'compare_model_added'
  | 'compare_model_removed'
  | 'quote_started'
  | 'quote_submitted'
  | 'booking_started'
  | 'booking_submitted'
  | 'showroom_viewed'
  | 'showroom_selected'
  | 'showroom_marker_clicked'
  | 'directions_clicked'
  | 'call_clicked'
  | 'concierge_asked'
  | 'concierge_replied'
  | 'assistant_reply_generated'
  | 'tool_used'
  | 'fallback_triggered'
  | 'policy_blocked'
  | 'next_action_type'
  | 'chat_cta_clicked'
  | 'spec_interaction'
  | 'chat_session_started'
  | 'chat_session_ended'
  
  // AI Agent Events (Phase 0 - Optimization Plan)
  | 'ai_conversation_start'
  | 'ai_conversation_end'
  | 'ai_message_sent'
  | 'ai_message_received'
  | 'ai_intent_detected'
  | 'ai_entity_extracted'
  | 'ai_rag_query'
  | 'ai_rag_results'
  | 'ai_knowledge_hit'
  | 'ai_knowledge_miss'
  | 'ai_tool_call'
  | 'ai_tool_result'
  | 'ai_tool_error'
  | 'ai_guardrail_triggered'
  | 'ai_policy_violation'
  | 'ai_fallback_to_human'
  | 'ai_shortlist_generated'
  | 'ai_comparison_requested'
  | 'ai_quote_generated'
  | 'ai_booking_initiated'
  | 'ai_showroom_visit_booked';

export interface AnalyticsPayload {
  sessionId: string;
  vehicleModelSlug?: string;
  questionIndex?: number;
  path?: string;
  profileSnapshot?: Partial<UserProfile>;
  specContext?: { specKey: string; category: string; value: string };
  ctaType?: 'quote' | 'test_drive' | 'showroom' | 'compare';
  assistantMetrics?: { latencyMs?: number; fallbackUsed?: boolean; toolName?: string };
  
  // AI Agent specific fields (Phase 0)
  conversationId?: string;
  messageId?: string;
  funnelStage?: FunnelStage;
  intent?: string;
  confidenceScore?: number;
  ragQuery?: string;
  ragDocumentIds?: string[];
  knowledgeSource?: 'tasco_policy' | 'inventory_db' | 'faq_kb' | 'spec_kb';
  toolName?: 'price_estimator' | 'finance_estimator' | 'showroom_lookup' | 'policy_check' | 'appointment_booking';
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  guardrailType?: 'profanity' | 'competitor_mention' | 'price_hallucination' | 'off_topic';
  policyViolationDetails?: string;
  modelUsed?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

function getSessionId(): string {
  const k = 'carmatch-session-id';
  let id = sessionStorage.getItem(k);
  if (!id) {
    id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(k, id);
  }
  return id;
}

function readBuffer(): { t: string; name: string; payload: AnalyticsPayload }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackEvent(name: AnalyticsEventName, extra: Partial<AnalyticsPayload> = {}): void {
  const payload: AnalyticsPayload = {
    sessionId: getSessionId(),
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    ...extra,
  };
  const row = { t: new Date().toISOString(), name, payload };
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[CarMatch analytics]', row);
  }
  try {
    const buf = readBuffer();
    buf.push(row);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buf.slice(-MAX_EVENTS)));
  } catch {
    /* ignore quota */
  }
}

/**
 * Track AI-specific events with conversation context
 */
export function trackAIEvent(
  name: AnalyticsEventName,
  conversationId: string,
  extra: Partial<AnalyticsPayload> = {}
): void {
  // Only allow ai_ prefixed events
  if (!name.startsWith('ai_')) {
    console.warn('trackAIEvent should only be used with ai_ prefixed events');
    return;
  }
  
  trackEvent(name as Extract<AnalyticsEventName, `ai_${string}`>, {
    conversationId,
    ...extra,
  });
}

/**
 * Generate a unique conversation ID for tracking chat sessions
 */
export function generateConversationId(): string {
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
