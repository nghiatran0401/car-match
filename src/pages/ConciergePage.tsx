import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

const prompts = [
  'Which model best suits a growing family in city traffic?',
  'How should I compare EV and hybrid ownership for apartment living?',
  'What can I prioritize under about 1.8b VND with a premium cabin feel?',
];
const promptsVi = [
  'Mẫu xe nào phù hợp nhất cho gia đình đang lớn khi đi lại trong đô thị?',
  'Nếu ở chung cư, tôi nên so sánh chi phí sở hữu EV và hybrid như thế nào?',
  'Trong tầm khoảng 1,8 tỷ, nên ưu tiên tiêu chí nào để cabin đủ cao cấp?',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ConciergePage() {
  const { language, t } = useLanguage();
  const { profile, selections } = useProfile();
  const { vehicleIds } = useCompare();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const seededMessageRef = useRef<string | null>(null);

  const selectedVehicle = useMemo(() => {
    const model = searchParams.get('model');
    if (!model) return undefined;
    const hit = vehicles.find(v => v.modelSlug === model);
    return hit ? localizeVehicle(hit, language) : undefined;
  }, [searchParams, language]);

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

  useEffect(() => {
    const seededPrompt = searchParams.get('q');
    if (!seededPrompt) return;
    if (seededMessageRef.current === seededPrompt) return;
    if (messages.length > 0) return;
    seededMessageRef.current = seededPrompt;
    void send(seededPrompt);
  }, [messages.length, searchParams]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const user: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, user]);
    setInput('');
    setLoading(true);
    setError('');
    trackEvent('concierge_asked', { vehicleModelSlug: selectedVehicle?.modelSlug });

    try {
      const conversation: AssistantMessage[] = [...messages, user].map(m => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await askQwenAssistant(conversation, {
        language,
        profile,
        currentVehicle: selectedVehicle,
        comparedVehicles,
        shortlistVehicles,
        merchantGuardrails: loadMerchantGuardrails(),
        adminPromptInstructions: loadAdminConfig().promptInstructions,
      });

      const assistant: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistant]);
      trackEvent('concierge_replied', { vehicleModelSlug: selectedVehicle?.modelSlug });
    } catch (err) {
      const fallback =
        t({
          vi: 'Hiện chưa kết nối được trợ lý trực tuyến. Vui lòng kiểm tra API key và thử lại. Tôi vẫn có thể hỗ trợ theo hướng báo giá, so sánh và showroom từ hồ sơ hiện tại.',
          en: 'I could not reach the live assistant. Please check API key configuration and try again. I can still help with quote, compare, and showroom guidance from your current profile.',
        });
      const assistant: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: fallback,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistant]);
      setError(err instanceof Error ? err.message : t({ vi: 'Yêu cầu trợ lý thất bại.', en: 'Assistant request failed.' }));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <section className="surface flex min-h-[70vh] flex-col p-4 sm:p-5">
      <div className="mb-4">
        <p className="kicker">CarMatch AI concierge</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {t({ vi: 'Hỏi bằng ngôn ngữ tự nhiên', en: 'Ask in plain language' })}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t({
            vi: 'Nhận tư vấn nên mua hay chờ, gợi ý so sánh và kịch bản đàm phán trong cùng một luồng chat.',
            en: 'Get close-or-not buying advice, compare guidance, and negotiation scripts in one thread.',
          })}
        </p>
        {selectedVehicle ? (
          <div className="surface-muted mt-3 p-3">
            <p className="text-sm font-semibold text-slate-900">
              {t({ vi: 'Đang tư vấn về: ', en: 'Talking about: ' })}
              {selectedVehicle.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">{selectedVehicle.trim} · {selectedVehicle.priceBand}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to={`/vehicle/${selectedVehicle.modelSlug}`} className="btn-secondary px-3 py-1.5 text-xs">
                {t({ vi: 'Quay lại xe', en: 'Back to vehicle' })}
              </Link>
              <Link to={`/quote?model=${selectedVehicle.modelSlug}`} className="btn-secondary px-3 py-1.5 text-xs">
                {t({ vi: 'Mở báo giá', en: 'Open quote' })}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                {t({ vi: 'Hôm nay tôi có thể hỗ trợ gì cho bạn?', en: 'How can I help today?' })}
              </h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">{t({ vi: 'Bạn có thể bắt đầu với các gợi ý sau:', en: 'Try one of these prompts:' })}</p>
              <div className="mt-4 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {(selectedVehicle
                  ? [
                      language === 'vi'
                        ? `Tôi nên mua ${selectedVehicle.name} bây giờ hay chờ thêm 3-6 tháng?`
                        : `Should I buy ${selectedVehicle.name} now or wait 3-6 months?`,
                      language === 'vi'
                        ? `Cho tôi các luận điểm đàm phán cho ${selectedVehicle.name} theo ngân sách của tôi.`
                        : `Give me negotiation talking points for ${selectedVehicle.name} in my budget.`,
                      ...(language === 'vi' ? promptsVi : prompts),
                    ]
                  : language === 'vi'
                    ? promptsVi
                    : prompts
                ).map((p, i) => (
                  <button key={i} type="button" onClick={() => send(p)} className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-700 hover:bg-slate-50">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={m.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm text-white' : 'max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-800 shadow-sm'}>
                    <p>{m.content}</p>
                    <p className={m.role === 'user' ? 'mt-1 text-[11px] text-slate-300' : 'mt-1 text-[11px] text-slate-400'}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {loading ? <p className="text-sm text-slate-500">{t({ vi: 'Trợ lý đang phân tích...', en: 'Assistant is thinking...' })}</p> : null}
              {error ? <p className="text-xs text-amber-700">{error}</p> : null}
              <div ref={endRef} />
            </>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-3">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2.5">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              rows={1}
              placeholder={t({
                vi: 'Hỏi về đề xuất, mức ngân sách, sạc, báo giá hoặc showroom...',
                en: 'Ask about shortlist, budget fit, charging, quote, or showrooms...',
              })}
              className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none"
            />
            <button type="submit" disabled={!input.trim() || loading} className="btn-primary h-11 px-4 disabled:bg-slate-300">
              {t({ vi: 'Gửi', en: 'Send' })}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
