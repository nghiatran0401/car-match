import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { askQwenAssistant, type AssistantMessage } from '../lib/aiAssistant';
import { vehicles } from '../data/vehicles';
import { useCompare } from '../context/CompareContext';
import { rankAndSort } from '../lib/recommendationScore';
import { trackEvent } from '../lib/analytics';
import { loadMerchantGuardrails } from '../lib/merchantGuardrails';
import { loadAdminConfig } from '../lib/adminConfig';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import VoiceModeOverlay from './VoiceModeOverlay';

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

export default function GlobalChatWidget() {
  const { language, t } = useLanguage();
  const location = useLocation();
  const { profile, selections } = useProfile();
  const { vehicleIds } = useCompare();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string): Promise<void> => {
    if (!text.trim() || loading) return;
    const user: Message = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    setMessages(prev => [...prev, user]);
    setInput('');
    setLoading(true);
    setError('');
    trackEvent('concierge_asked', { vehicleModelSlug: currentVehicle?.modelSlug });
    try {
      const conversation: AssistantMessage[] = [...messages, user].map(m => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await askQwenAssistant(conversation, {
        language,
        profile,
        currentVehicle,
        comparedVehicles,
        shortlistVehicles,
        merchantGuardrails: loadMerchantGuardrails(),
        adminPromptInstructions: loadAdminConfig().promptInstructions,
      });
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
      trackEvent('concierge_replied', { vehicleModelSlug: currentVehicle?.modelSlug });
    } catch (err) {
      setError(err instanceof Error ? err.message : t({ vi: 'Yeu cau that bai.', en: 'Request failed.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex h-[calc(100dvh-7.4rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t({ vi: 'AI Co-pilot', en: 'AI Co-pilot' })}</p>
          <p className="text-xs text-slate-500">{t({ vi: 'Tu onboarding den dat lich showroom', en: 'From onboarding to showroom booking' })}</p>
          {currentVehicle ? <p className="mt-1 text-xs text-slate-500">{currentVehicle.name}</p> : null}
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-2.5">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">{t({ vi: 'Goi y nhanh:', en: 'Quick prompts:' })}</p>
            {starterPrompts[language].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-left text-xs text-slate-700"
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
                  ? 'ml-8 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white'
                  : 'mr-8 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'
              }
            >
              {message.content}
            </div>
          ))
        )}
        {loading ? <p className="text-xs text-slate-500">{t({ vi: 'Dang tra loi...', en: 'Thinking...' })}</p> : null}
        {error ? <p className="text-xs text-amber-700">{error}</p> : null}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-slate-100 p-2"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t({ vi: 'Dat cau hoi...', en: 'Ask anything...' })}
            className="input-base mt-0 min-h-[38px] text-sm"
          />
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={t({ vi: 'Mo voice mode', en: 'Open voice mode' })}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button type="submit" disabled={!input.trim() || loading} className="btn-primary shrink-0 px-3 py-2 text-xs disabled:bg-slate-300">
            {t({ vi: 'Gui', en: 'Send' })}
          </button>
        </div>
      </form>
      <VoiceModeOverlay open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </section>
  );
}

