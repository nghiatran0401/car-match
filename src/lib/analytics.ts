import type { UserProfile } from '../types';

const STORAGE_KEY = 'carmatch-analytics-events';
const MAX_EVENTS = 200;

export type AnalyticsEventName =
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
  | 'chat_session_ended';

export interface AnalyticsPayload {
  sessionId: string;
  vehicleModelSlug?: string;
  questionIndex?: number;
  path?: string;
  profileSnapshot?: Partial<UserProfile>;
  specContext?: { specKey: string; category: string; value: string };
  ctaType?: 'quote' | 'test_drive' | 'showroom' | 'compare';
  assistantMetrics?: { latencyMs?: number; fallbackUsed?: boolean; toolName?: string };
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
