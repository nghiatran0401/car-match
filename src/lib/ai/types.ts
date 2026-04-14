/**
 * AI Sales Agent Event Types
 * Aligns with CarMatch PRD Funnel: Intake -> Shortlist -> Compare -> Detail -> Quote -> Booking -> Showroom
 */

export type AIAgentEventType =
  // Conversation Lifecycle
  | 'ai_conversation_start'
  | 'ai_conversation_end'
  | 'ai_message_sent'
  | 'ai_message_received'
  
  // Intent & Entity Recognition
  | 'ai_intent_detected'
  | 'ai_entity_extracted'
  
  // RAG & Knowledge Retrieval
  | 'ai_rag_query'
  | 'ai_rag_results'
  | 'ai_knowledge_hit'
  | 'ai_knowledge_miss'
  
  // Tool Usage (CarSearch, PolicyCheck, etc.)
  | 'ai_tool_call'
  | 'ai_tool_result'
  | 'ai_tool_error'
  
  // Guardrails & Safety
  | 'ai_guardrail_triggered'
  | 'ai_policy_violation'
  | 'ai_fallback_to_human'
  
  // Business Outcomes (PRD KPIs)
  | 'ai_shortlist_generated'
  | 'ai_comparison_requested'
  | 'ai_quote_generated'
  | 'ai_booking_initiated'
  | 'ai_showroom_visit_booked';

export interface AIAgentEventPayload {
  // Context
  sessionId: string;
  userId?: string;
  conversationId: string;
  messageId?: string;
  
  // Agent State
  intent?: string;
  confidenceScore?: number;
  currentFunnelStage?: 'intake' | 'shortlist' | 'compare' | 'detail' | 'quote' | 'booking' | 'showroom';
  
  // RAG Specifics
  ragQuery?: string;
  ragDocumentIds?: string[];
  ragScore?: number;
  knowledgeSource?: 'tasco_policy' | 'inventory_db' | 'faq_kb' | 'spec_kb';
  
  // Tool Specifics
  toolName?: 'search_inventory' | 'check_policy' | 'calculate_finance' | 'book_appointment';
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  toolLatencyMs?: number;
  
  // Guardrails
  guardrailType?: 'profanity' | 'competitor_mention' | 'price_hallucination' | 'off_topic';
  violationDetails?: string;
  
  // Outcome Data
  carIds?: string[];
  comparisonCount?: number;
  quoteAmount?: number;
  appointmentSlot?: string;
  
  // Metadata
  timestamp: string;
  latencyMs?: number;
  modelUsed?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Helper to track AI interactions with detailed context
 */
export const trackAIAgentEvent = async (
  eventType: AIAgentEventType,
  payload: Omit<AIAgentEventPayload, 'timestamp'>
) => {
  if (typeof window === 'undefined') return;

  const fullPayload: AIAgentEventPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  // Send to analytics pipeline (e.g., PostHog, Mixpanel, or internal logger)
  try {
    // Example: window.posthog.capture(eventType, fullPayload);
    console.log(`[AI_ANALYTICS] ${eventType}`, fullPayload);
    
    // Fire beacon for reliability on page unload
    if (eventType === 'ai_conversation_end') {
      navigator.sendBeacon('/api/analytics/ai-event', JSON.stringify(fullPayload));
    }
  } catch (error) {
    console.error('Failed to track AI event:', error);
  }
};
