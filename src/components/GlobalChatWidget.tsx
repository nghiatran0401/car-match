import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { askQwenAssistant, extractProfileUpdates, type AssistantMessage } from '../lib/aiAssistant';
import { vehicles } from '../data/vehicles';
import { useCompare } from '../context/CompareContext';
import { rankAndSort } from '../lib/recommendationScore';
import { trackEvent } from '../lib/analytics';
import { loadMerchantGuardrails } from '../lib/merchantGuardrails';
import { loadAdminConfig } from '../lib/adminConfig';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import type { UserProfile } from '../types';
import VoiceModeOverlay from './VoiceModeOverlay';
import { detectAssistantActions, executeAssistantAction, type AssistantAction } from '../lib/assistantActions';
import { buildUnifiedAssistantContextSummary, inferUnifiedJourneyStage } from '../lib/unifiedSalesAssistant';
import { evaluateActionPolicy } from '../lib/assistantPolicy';
import { buildNegotiationStrategy } from '../lib/negotiationStrategy';
import {
  loadJourneyState,
  persistJourneyState,
  updateJourneyForAction,
  updateJourneyForPath,
  updateJourneyForTurn,
} from '../lib/journeySession';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const starterPrompts = {
  vi: [
    'Tôi nên chốt xe nào với ngân sách hiện tại?',
    'Mẫu nào phù hợp đi gia đình và tiết kiệm chi phí?',
  ],
  en: [
    'Which model should I pick in my budget?',
    'Which one is best for family use and lower ownership cost?',
  ],
};
const VOICE_PANEL_OPEN_KEY = 'carmatch-voice-panel-open';

export default function GlobalChatWidget() {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, selections, updateProfile, aiRecommendationControls, setAIRecommendationControls } = useProfile();
  const { vehicleIds, toggleVehicle, isInCompare } = useCompare();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voiceOpen, setVoiceOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(VOICE_PANEL_OPEN_KEY) === '1';
  });
  const [pendingAction, setPendingAction] = useState<AssistantAction | null>(null);
  const [journeyState, setJourneyState] = useState(() => loadJourneyState());
  const lastVoiceUserTranscriptRef = useRef('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentVehicle = useMemo(() => {
    const hit = location.pathname.match(/^\/vehicle\/([^/]+)$/);
    if (!hit?.[1]) return undefined;
    const found = vehicles.find(v => v.modelSlug === hit[1]);
    return found ? localizeVehicle(found, language) : undefined;
  }, [language, location.pathname]);

  const comparedVehicles = useMemo(
    () =>
      vehicleIds
        .map(id => vehicles.find(v => v.id === id))
        .filter((v): v is NonNullable<typeof v> => Boolean(v))
        .map(v => localizeVehicle(v, language)),
    [vehicleIds, language],
  );

  const shortlistVehicles = useMemo(
    () =>
      rankAndSort(vehicles, profile, selections, language)
        .slice(0, 3)
        .map(entry => localizeVehicle(entry.vehicle, language)),
    [profile, selections, language],
  );
  const unifiedJourneyStage = useMemo(() => inferUnifiedJourneyStage(location.pathname), [location.pathname]);
  const unifiedContextSummary = useMemo(
    () =>
      buildUnifiedAssistantContextSummary({
        language,
        pathname: location.pathname,
        profile,
        currentVehicle,
        comparedVehicles,
        shortlistVehicles,
        recentMessages: messages.map(message => ({ role: message.role, content: message.content })),
      }),
    [comparedVehicles, currentVehicle, language, location.pathname, messages, profile, shortlistVehicles],
  );
  useEffect(() => {
    setJourneyState(previous => updateJourneyForPath(previous, location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    persistJourneyState(journeyState);
  }, [journeyState]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VOICE_PANEL_OPEN_KEY, voiceOpen ? '1' : '0');
  }, [voiceOpen]);

  function normalizePlain(inputText: string) {
    return inputText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function inferBudgetBand(text: string): UserProfile['budgetBand'] | undefined {
    const plain = normalizePlain(text).replace(/,/g, '.');
    const tyMatch = plain.match(/(\d+(?:\.\d+)?)\s*(ty|ti|billion|bil|bn|b)\b/);
    if (tyMatch) {
      const billion = Number(tyMatch[1]);
      if (Number.isFinite(billion)) {
        const mil = billion * 1000;
        if (mil < 1000) return 'under-1000';
        if (mil <= 1400) return '1000-1400';
        if (mil <= 1900) return '1400-1900';
        return '1900-plus';
      }
    }

    const milMatch = plain.match(/(\d{3,4})\s*(tr|trieu|m|million)\b/);
    if (milMatch) {
      const mil = Number(milMatch[1]);
      if (Number.isFinite(mil)) {
        if (mil < 1000) return 'under-1000';
        if (mil <= 1400) return '1000-1400';
        if (mil <= 1900) return '1400-1900';
        return '1900-plus';
      }
    }

    return undefined;
  }

  function labelVehicleType(value: 'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback') {
    if (value === 'all') return t({ vi: 'Tất cả dòng xe', en: 'All vehicle types' });
    const map = {
      sedan: 'Sedan',
      suv: 'SUV',
      crossover: 'Crossover',
      hatchback: 'Hatchback',
    } as const;
    return map[value];
  }

  function labelPowertrain(value: 'all' | 'ice' | 'hybrid' | 'phev' | 'ev') {
    if (value === 'all') return t({ vi: 'Tất cả hệ truyền động', en: 'All powertrains' });
    const map = {
      ice: 'ICE',
      hybrid: 'Hybrid',
      phev: 'PHEV',
      ev: 'EV',
    } as const;
    return map[value];
  }

  function labelSortBy(value: 'best-match' | 'price-low' | 'price-high' | 'name-az') {
    const map = {
      'best-match': t({ vi: 'Phù hợp nhất', en: 'Best match' }),
      'price-low': t({ vi: 'Giá tăng dần', en: 'Price low-high' }),
      'price-high': t({ vi: 'Giá giảm dần', en: 'Price high-low' }),
      'name-az': t({ vi: 'Tên A-Z', en: 'Name A-Z' }),
    } as const;
    return map[value];
  }

  function labelBudgetBand(value: NonNullable<UserProfile['budgetBand']>) {
    switch (value) {
      case 'under-1000':
        return '< 1 ty';
      case '1000-1400':
        return '1.0 - 1.4 ty';
      case '1400-1900':
        return '1.4 - 1.9 ty';
      case '1900-plus':
        return '> 1.9 ty';
      case 'flexible':
      default:
        return t({ vi: 'Linh hoạt', en: 'Flexible' });
    }
  }

  function inferAIControlsFromPrompt(text: string): {
    shouldApply: boolean;
    controls: {
      query: string;
      sortBy: 'best-match' | 'price-low' | 'price-high' | 'name-az';
      vehicleTypeFilter: 'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback';
      powertrainFilter: 'all' | 'ice' | 'hybrid' | 'phev' | 'ev';
    };
    profilePatch: Partial<UserProfile>;
  } {
    const plain = normalizePlain(text);
    const controls: {
      query: string;
      sortBy: 'best-match' | 'price-low' | 'price-high' | 'name-az';
      vehicleTypeFilter: 'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback';
      powertrainFilter: 'all' | 'ice' | 'hybrid' | 'phev' | 'ev';
    } = {
      query: '',
      sortBy: 'best-match',
      vehicleTypeFilter: 'all',
      powertrainFilter: 'all',
    };
    const profilePatch: Partial<UserProfile> = {};
    let signalCount = 0;

    if (plain.includes('phev')) {
      controls.powertrainFilter = 'phev';
      profilePatch.powertrains = ['phev'];
      signalCount += 1;
    } else if (plain.includes('hybrid')) {
      controls.powertrainFilter = 'hybrid';
      profilePatch.powertrains = ['hybrid'];
      signalCount += 1;
    } else if (plain.includes('xe dien') || plain.includes('dien') || plain.includes('ev') || plain.includes('electric')) {
      controls.powertrainFilter = 'ev';
      profilePatch.powertrains = ['ev'];
      signalCount += 1;
    } else if (plain.includes('xang') || plain.includes('petrol') || plain.includes('gasoline') || plain.includes('ice')) {
      controls.powertrainFilter = 'ice';
      profilePatch.powertrains = ['ice'];
      signalCount += 1;
    }

    if (plain.includes('suv')) {
      controls.vehicleTypeFilter = 'suv';
      profilePatch.vehicleTypes = ['suv'];
      signalCount += 1;
    } else if (plain.includes('sedan')) {
      controls.vehicleTypeFilter = 'sedan';
      profilePatch.vehicleTypes = ['sedan'];
      signalCount += 1;
    } else if (plain.includes('crossover')) {
      controls.vehicleTypeFilter = 'crossover';
      profilePatch.vehicleTypes = ['crossover'];
      signalCount += 1;
    } else if (plain.includes('hatchback')) {
      controls.vehicleTypeFilter = 'hatchback';
      profilePatch.vehicleTypes = ['hatchback'];
      signalCount += 1;
    } else if (plain.includes('the thao') || plain.includes('sport')) {
      controls.vehicleTypeFilter = 'sedan';
      controls.powertrainFilter = 'all';
      controls.sortBy = 'price-high';
      profilePatch.vehicleTypes = ['sedan'];
      signalCount += 1;
    }

    if (
      plain.includes('re nhat') ||
      plain.includes('gia thap') ||
      plain.includes('cheapest') ||
      plain.includes('lowest price') ||
      plain.includes('budget')
    ) {
      controls.sortBy = 'price-low';
      signalCount += 1;
    } else if (plain.includes('cao cap') || plain.includes('premium') || plain.includes('luxury')) {
      controls.sortBy = 'price-high';
      signalCount += 1;
    }

    const budgetBand = inferBudgetBand(text);
    if (budgetBand) {
      profilePatch.budgetBand = budgetBand;
      signalCount += 1;
    }

    const intentSignals = ['xe', 'car', 'recommend', 'de xuat', 'goi y', 'shortlist', 'chon', 'mua', 'tim xe'];
    const hasIntentSignal = intentSignals.some(signal => plain.includes(signal));
    return {
      shouldApply: signalCount > 0 || hasIntentSignal,
      controls,
      profilePatch,
    };
  }

  const send = async (text: string): Promise<void> => {
    if (!text.trim() || loading) return;
    const user: Message = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    setMessages(prev => [...prev, user]);
    setInput('');
    setLoading(true);
    setError('');
    trackEvent('concierge_asked', { vehicleModelSlug: currentVehicle?.modelSlug });
    try {
      const guardrails = loadMerchantGuardrails();
      const conversation: AssistantMessage[] = [...messages, user].map(m => ({
        role: m.role,
        content: m.content,
      }));
      const nextJourneyState = updateJourneyForTurn(journeyState, text);
      setJourneyState(nextJourneyState);

      const updates = await extractProfileUpdates(conversation, {
        language,
        profile,
        currentVehicle,
        comparedVehicles,
        shortlistVehicles,
      });

      const inferred = inferAIControlsFromPrompt(text);
      const mergedProfilePatch: Partial<UserProfile> = { ...inferred.profilePatch };

      updates.forEach(update => {
        mergedProfilePatch[update.field] = update.value as never;
      });
      if (Object.keys(mergedProfilePatch).length > 0) {
        updateProfile(mergedProfilePatch);
      }

      if (inferred.shouldApply) {
        const maybeBudgetBand = mergedProfilePatch.budgetBand;
        const budgetBand =
          maybeBudgetBand === 'under-1000' ||
          maybeBudgetBand === '1000-1400' ||
          maybeBudgetBand === '1400-1900' ||
          maybeBudgetBand === '1900-plus' ||
          maybeBudgetBand === 'flexible'
            ? maybeBudgetBand
            : undefined;
        setAIRecommendationControls({
          ...inferred.controls,
          budgetBand,
          source: 'ai-copilot',
          updatedAt: Date.now(),
        });
      }

      const reply = await askQwenAssistant(conversation, {
        language,
        profile,
        currentVehicle,
        comparedVehicles,
        shortlistVehicles,
        merchantGuardrails: guardrails,
        adminPromptInstructions: [
          loadAdminConfig().promptInstructions ?? '',
          unifiedContextSummary,
          `Current funnel stage: ${unifiedJourneyStage}`,
          nextJourneyState.recommendedNextAction
            ? `Next best action: ${nextJourneyState.recommendedNextAction.action} (${nextJourneyState.recommendedNextAction.reason})`
            : '',
          buildNegotiationStrategy(text, guardrails, language)?.message ?? '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        funnelStage: unifiedJourneyStage,
      });
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
      const actions = detectAssistantActions({
        userText: text,
        assistantText: reply,
        vehicles,
      });
      actions.forEach(action => applyActionWithGuards(action));
      trackEvent('concierge_replied', { vehicleModelSlug: currentVehicle?.modelSlug });
    } catch (err) {
      setError(err instanceof Error ? err.message : t({ vi: 'Yêu cầu thất bại.', en: 'Request failed.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceUserTranscript = (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    lastVoiceUserTranscriptRef.current = text;
    setMessages(prev => [...prev, { id: `vu-${Date.now()}`, role: 'user', content: text }]);
  };

  const handleVoiceAssistantTranscript = (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    setMessages(prev => [...prev, { id: `va-${Date.now()}`, role: 'assistant', content: text }]);
    const actions = detectAssistantActions({
      userText: lastVoiceUserTranscriptRef.current,
      assistantText: text,
      vehicles,
    });
    actions.forEach(action => applyActionWithGuards(action));
  };

  const applyActionWithGuards = (action: AssistantAction) => {
    const policy = evaluateActionPolicy(action);
    if (policy.requiresConfirmation) {
      setPendingAction(action);
      trackEvent('assistant_action_detected', {
        intent: `confirmation_required:${action.kind}`,
        confidenceScore: policy.confidence,
      });
      return;
    }
    executeAssistantAction(action, {
      navigate,
      updateProfile,
      setAIRecommendationControls,
      toggleCompare: toggleVehicle,
      isInCompare,
    });
    setJourneyState(previous => updateJourneyForAction(previous, action));
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    trackEvent('assistant_action_confirmed', { intent: pendingAction.kind });
    executeAssistantAction(pendingAction, {
      navigate,
      updateProfile,
      setAIRecommendationControls,
      toggleCompare: toggleVehicle,
      isInCompare,
    });
    setJourneyState(previous => updateJourneyForAction(previous, pendingAction));
    setPendingAction(null);
  };

  const rejectPendingAction = () => {
    if (!pendingAction) return;
    trackEvent('assistant_action_rejected', { intent: pendingAction.kind });
    trackEvent('assistant_action_declined', { intent: pendingAction.kind });
    setPendingAction(null);
  };

  return (
    <section className="flex h-[calc(100dvh-7.4rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t({ vi: 'AI Co-pilot', en: 'AI Co-pilot' })}</p>
          <p className="text-xs text-slate-500">{t({ vi: 'Từ bước làm hồ sơ đến đặt lịch showroom', en: 'From onboarding to showroom booking' })}</p>
          {currentVehicle ? <p className="mt-1 text-xs text-slate-500">{currentVehicle.name}</p> : null}
        </div>
      </header>
      {journeyState.recommendedNextAction ? (
        <div className="border-b border-slate-100 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900">
          <span className="font-semibold">{t({ vi: 'Bước gợi ý tiếp theo', en: 'Next best step' })}: </span>
          {journeyState.recommendedNextAction.reason}
        </div>
      ) : null}
      {aiRecommendationControls?.source === 'ai-copilot' ? (
        <div className="border-b border-slate-100 bg-cyan-50/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'AI đã áp dụng', en: 'AI applied' })}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-700">
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
              {t({ vi: 'Dòng xe', en: 'Type' })}: {labelVehicleType(aiRecommendationControls.vehicleTypeFilter ?? 'all')}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
              {t({ vi: 'Truyền động', en: 'Powertrain' })}: {labelPowertrain(aiRecommendationControls.powertrainFilter ?? 'all')}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
              {t({ vi: 'Sắp xếp', en: 'Sort' })}: {labelSortBy(aiRecommendationControls.sortBy ?? 'best-match')}
            </span>
            {aiRecommendationControls.budgetBand ? (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                {t({ vi: 'Ngân sách', en: 'Budget' })}: {labelBudgetBand(aiRecommendationControls.budgetBand)}
              </span>
            ) : null}
            {aiRecommendationControls.query ? (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                {t({ vi: 'Từ khóa', en: 'Query' })}: {aiRecommendationControls.query}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div ref={messagesContainerRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
        {messages.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t({ vi: 'Gợi ý mở đầu', en: 'Starter prompts' })}
            </p>
            <p className="text-xs text-slate-600">
              {t({
                vi: 'Nêu mục tiêu của bạn để nhận tư vấn rõ ràng theo ngân sách, nhu cầu và chi phí sở hữu.',
                en: 'Share your goal to get advice tailored to budget, use case, and ownership cost.',
              })}
            </p>
            {starterPrompts[language].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'ml-8 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm leading-relaxed text-white'
                  : 'mr-8 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-700'
              }
            >
              <p
                className={
                  message.role === 'user'
                    ? 'mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300'
                    : 'mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400'
                }
              >
                {message.role === 'user' ? t({ vi: 'Bạn', en: 'You' }) : t({ vi: 'AI Co-pilot', en: 'AI Co-pilot' })}
              </p>
              {message.content}
            </div>
          ))
        )}
        {loading ? <p className="text-xs text-slate-500">{t({ vi: 'Đang trả lời...', en: 'Thinking...' })}</p> : null}
        {error ? <p className="text-xs text-amber-700">{error}</p> : null}
        {pendingAction?.kind === 'navigate' ? (
          <div className="mr-8 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs text-cyan-900">
            <p className="font-semibold">{t({ vi: 'Xác nhận điều hướng', en: 'Confirm navigation' })}</p>
            <p className="mt-1">
              {pendingAction.target === '/quote'
                ? t({ vi: 'Đi tới trang báo giá ngay?', en: 'Go to quote page now?' })
                : pendingAction.target === '/booking'
                  ? t({ vi: 'Đi tới trang đặt lịch ngay?', en: 'Go to booking page now?' })
                  : t({ vi: 'Thực hiện điều hướng này ngay?', en: 'Proceed with this navigation now?' })}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmPendingAction}
                className="rounded-full bg-cyan-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-cyan-700"
              >
                {t({ vi: 'Đồng ý', en: 'Confirm' })}
              </button>
              <button
                type="button"
                onClick={rejectPendingAction}
                className="rounded-full border border-cyan-300 bg-white px-3 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                {t({ vi: 'Hủy', en: 'Cancel' })}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-slate-100 bg-white p-2.5"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t({ vi: 'Đặt câu hỏi...', en: 'Ask anything...' })}
            className="input-base mt-0 min-h-[40px] rounded-full text-sm"
            maxLength={350}
          />
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={t({ vi: 'Mở chế độ giọng nói', en: 'Open voice mode' })}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button type="submit" disabled={!input.trim() || loading} className="btn-primary shrink-0 px-3 py-2 text-xs disabled:bg-slate-300">
            {t({ vi: 'Gửi', en: 'Send' })}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {input.length}/350 {t({ vi: 'ký tự', en: 'chars' })}
        </p>
      </form>
      <VoiceModeOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onUserTranscript={handleVoiceUserTranscript}
        onAssistantTranscript={handleVoiceAssistantTranscript}
        contextSummary={unifiedContextSummary}
      />
    </section>
  );
}

