import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Mic } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useCompare } from '../context/CompareContext';
import { vehicles } from '../data/vehicles';
import { rankAndSort } from '../lib/recommendationScore';
import { getVehicleImage, getVehicleImageSources } from '../lib/vehicleMedia';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import { askQwenAssistant, extractProfileUpdates, type AssistantMessage, type ProfileUpdateSuggestion } from '../lib/aiAssistant';
import { loadMerchantGuardrails } from '../lib/merchantGuardrails';
import { loadAdminConfig } from '../lib/adminConfig';
import VehicleImage from '../components/VehicleImage';
import VoiceModeOverlay from '../components/VoiceModeOverlay';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const starterPrompts = {
  vi: [
    'Mẫu nào phù hợp nhất với tôi?',
    'So sánh các xe đang xem giúp tôi',
    'Tôi nên chốt xe nào?',
  ],
  en: [
    'Which model fits me best?',
    'Compare the cars I am viewing',
    'Which one should I pick?',
  ],
};

export default function RecommendationsPage() {
  const { language, t } = useLanguage();
  const { profile, isHydrated, selections, updateProfile } = useProfile();
  const { toggleVehicle, isInCompare, count, vehicleIds } = useCompare();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'best-match' | 'price-low' | 'price-high' | 'name-az'>('best-match');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback'>('all');
  const [powertrainFilter, setPowertrainFilter] = useState<'all' | 'ice' | 'hybrid' | 'phev' | 'ev'>('all');

  // Chat state
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [profileUpdates, setProfileUpdates] = useState<ProfileUpdateSuggestion[]>([]);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

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

  const shortlist = useMemo(() => {
    let ranked = rankAndSort(vehicles, profile, selections, language).map(item => ({
      ...item,
      vehicle: localizeVehicle(item.vehicle, language),
    }));

    if (vehicleTypeFilter !== 'all') {
      ranked = ranked.filter(item => item.vehicle.vehicleType === vehicleTypeFilter);
    }
    if (powertrainFilter !== 'all') {
      ranked = ranked.filter(item => item.vehicle.powertrain === powertrainFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      ranked = ranked.filter(item => {
        const v = item.vehicle;
        return (
          v.name.toLowerCase().includes(q) ||
          v.trim.toLowerCase().includes(q) ||
          v.bodyStyle.toLowerCase().includes(q) ||
          v.thesis.toLowerCase().includes(q)
        );
      });
    }

    const sorted = [...ranked].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.vehicle.priceEntryMilVnd - b.vehicle.priceEntryMilVnd;
        case 'price-high':
          return b.vehicle.priceEntryMilVnd - a.vehicle.priceEntryMilVnd;
        case 'name-az':
          return a.vehicle.name.localeCompare(b.vehicle.name);
        case 'best-match':
        default:
          return b.score - a.score;
      }
    });

    return sorted.slice(0, 9);
  }, [profile, selections, powertrainFilter, query, sortBy, vehicleTypeFilter, language]);

  useEffect(() => {
    if (isHydrated) trackEvent('shortlist_viewed');
  }, [isHydrated]);

  useEffect(() => {
    if (!chatOpen) return;
    // Only scroll when there are messages or loading, not on initial mount
    if (messages.length === 0 && !chatLoading) return;
    
    // Always scroll to show latest message in chat
    // Use requestAnimationFrame to ensure DOM has updated
    const frameId = requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(frameId);
  }, [messages, chatLoading, chatOpen]);

  // Scroll to top of recommendations when profile changes
  useEffect(() => {
    if (profileUpdates.length > 0 && mainContentRef.current) {
      // Calculate position and scroll to top of main content
      const yOffset = -80; // Offset for header
      const element = mainContentRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      setShowUpdateIndicator(true);
      // Hide indicator after 3 seconds
      const timer = setTimeout(() => setShowUpdateIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [profileUpdates]);

  const sendChatMessage = async (text: string): Promise<void> => {
    if (!text.trim() || chatLoading) return;
    const user: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    setMessages(prev => [...prev, user]);
    setChatInput('');
    setChatLoading(true);
    setChatError('');
    setProfileUpdates([]);
    trackEvent('concierge_asked');
    try {
      const conversation: AssistantMessage[] = [...messages, user].map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      // Extract profile updates from user's message
      const updates = await extractProfileUpdates(conversation, {
        language,
        profile,
        comparedVehicles,
        shortlistVehicles,
      });
      
      if (updates.length > 0) {
        setProfileUpdates(updates);
        // Apply profile updates
        const profilePatch: Record<string, string | string[]> = {};
        updates.forEach(u => {
          profilePatch[u.field] = u.value;
        });
        updateProfile(profilePatch);
      }
      
      const reply = await askQwenAssistant(conversation, {
        language,
        profile,
        comparedVehicles,
        shortlistVehicles,
        merchantGuardrails: loadMerchantGuardrails(),
        adminPromptInstructions: loadAdminConfig().promptInstructions,
      });
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
      trackEvent('concierge_replied');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : t({ vi: 'Yêu cầu thất bại.', en: 'Request failed.' }));
    } finally {
      setChatLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="surface p-6 text-sm text-slate-600">
        {t({ vi: 'Đang chuẩn bị danh sách đề xuất...', en: 'Preparing recommendations...' })}
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* Chat Box Sidebar */}
      <aside className="surface flex h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 xl:sticky xl:top-24">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">{t({ vi: 'Trợ lý CarMatch', en: 'CarMatch Assistant' })}</p>
              <p className="text-xs text-slate-500">{t({ vi: 'Hỏi đáp về xe', en: 'Ask about vehicles' })}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChatOpen(!chatOpen)}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200"
          >
            {chatOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
          </button>
        </header>

        {chatOpen && (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
              {messages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">{t({ vi: 'Gợi ý nhanh:', en: 'Quick prompts:' })}</p>
                  {starterPrompts[language].map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendChatMessage(prompt)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
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
                        ? 'ml-6 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white'
                        : 'mr-6 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'
                    }
                  >
                    {message.content}
                  </div>
                ))
              )}
              {chatLoading && (
                <p className="text-xs text-slate-500">{t({ vi: 'Đang trả lời...', en: 'Thinking...' })}</p>
              )}
              {chatError && <p className="text-xs text-red-600">{chatError}</p>}
              
              {/* Profile Updates Notification */}
              {profileUpdates.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-semibold text-emerald-700">
                    {t({ vi: 'Đã cập nhật hồ sơ:', en: 'Profile updated:' })}
                  </p>
                  {profileUpdates.map((u, i) => (
                    <p key={i} className="text-xs text-emerald-600">
                      • {u.reason}
                    </p>
                  ))}
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                void sendChatMessage(chatInput);
              }}
              className="border-t border-slate-100 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={t({ vi: 'Đặt câu hỏi...', en: 'Ask anything...' })}
                  className="input-base mt-0 min-h-[40px] flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setVoiceOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label={t({ vi: 'Mo voice mode', en: 'Open voice mode' })}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="btn-primary flex h-10 w-10 items-center justify-center rounded-full p-0 disabled:bg-slate-300"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </aside>

      <main ref={mainContentRef} className="surface relative p-4 sm:p-5">
        {/* Update Indicator Banner */}
        {showUpdateIndicator && (
          <div className="absolute -top-2 left-0 right-0 z-10 mx-auto w-max animate-bounce rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>
              {t({ vi: 'Đề xuất đã được cập nhật!', en: 'Recommendations updated!' })}
            </span>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="kicker">{t({ vi: 'Phòng đề xuất', en: 'Recommendation studio' })}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {t({ vi: 'Các lựa chọn phù hợp nhất với hồ sơ của bạn', en: 'Top matches for your profile' })}
            </h1>
          </div>
          <div className="flex gap-2">
            <span className="surface-muted px-3 py-2 text-sm font-semibold text-slate-700">
              {shortlist.length} {t({ vi: 'mẫu phù hợp', en: 'matches' })}
            </span>
            {count > 0 ? (
              <Link to="/compare" className="btn-primary">
                {t({ vi: 'So sánh', en: 'Compare' })} ({count})
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Tìm kiếm', en: 'Search' })}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t({ vi: 'Tìm theo mẫu xe, phiên bản, kiểu dáng...', en: 'Search model, trim, body style...' })}
              className="input-base min-h-[42px] normal-case"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Sắp xếp', en: 'Sort by' })}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'best-match' | 'price-low' | 'price-high' | 'name-az')}
              className="input-base min-h-[42px] normal-case"
            >
              <option value="best-match">{t({ vi: 'Phù hợp nhất', en: 'Best match' })}</option>
              <option value="price-low">{t({ vi: 'Giá: thấp đến cao', en: 'Price: low to high' })}</option>
              <option value="price-high">{t({ vi: 'Giá: cao đến thấp', en: 'Price: high to low' })}</option>
              <option value="name-az">{t({ vi: 'Tên: A đến Z', en: 'Name: A to Z' })}</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Dòng xe', en: 'Vehicle type' })}
            <select
              value={vehicleTypeFilter}
              onChange={e =>
                setVehicleTypeFilter(e.target.value as 'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback')
              }
              className="input-base min-h-[42px] normal-case"
            >
              <option value="all">{t({ vi: 'Tất cả', en: 'All types' })}</option>
              <option value="sedan">{t({ vi: 'Sedan', en: 'Sedan' })}</option>
              <option value="suv">{t({ vi: 'SUV', en: 'SUV' })}</option>
              <option value="crossover">{t({ vi: 'Crossover', en: 'Crossover' })}</option>
              <option value="hatchback">{t({ vi: 'Hatchback', en: 'Hatchback' })}</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Hệ truyền động', en: 'Powertrain' })}
            <select
              value={powertrainFilter}
              onChange={e => setPowertrainFilter(e.target.value as 'all' | 'ice' | 'hybrid' | 'phev' | 'ev')}
              className="input-base min-h-[42px] normal-case"
            >
              <option value="all">{t({ vi: 'Tất cả', en: 'All powertrains' })}</option>
              <option value="ice">ICE</option>
              <option value="hybrid">{t({ vi: 'Hybrid', en: 'Hybrid' })}</option>
              <option value="phev">PHEV</option>
              <option value="ev">EV</option>
            </select>
          </label>
        </div>

        {shortlist.length === 0 ? (
          <div className="surface-muted p-5 text-sm text-slate-600">
            {t({
              vi: 'Không có mẫu xe phù hợp với tổ hợp tìm kiếm/sắp xếp/lọc hiện tại. Hãy đặt lại bộ lọc để xem lại toàn bộ.',
              en: 'No vehicles match your current search/sort/filter combination. Reset filters to reopen the full shortlist.',
            })}
          </div>
        ) : null}

        <div className={clsx('grid gap-3 md:grid-cols-2 xl:grid-cols-3', showUpdateIndicator && 'animate-pulse')}>
          {shortlist.map((item, index) => {
            const { vehicle, score, reasons } = item;
            const inCompare = isInCompare(vehicle.id);
            // Stagger animation delay based on index
            const animationDelay = showUpdateIndicator ? `${index * 100}ms` : '0ms';
            return (
              <article
                key={vehicle.id}
                className={clsx(
                  'defer-render card-hover rounded-2xl border border-slate-200 bg-white p-3 transition-all duration-500',
                  showUpdateIndicator && 'animate-fade-in-up',
                )}
                style={{ animationDelay }}
              >
                <VehicleImage
                  src={getVehicleImage(vehicle.modelSlug)}
                  fallbackSources={getVehicleImageSources(vehicle.modelSlug).slice(1)}
                  alt={vehicle.name}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="aspect-[1.35/1] w-full rounded-xl object-cover"
                />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{vehicle.name}</p>
                    <p className="text-xs text-slate-500">{vehicle.trim}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{score}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{vehicle.priceBand}</p>
                <p className="mt-2 text-sm text-slate-700">{vehicle.thesis}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {reasons.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Link
                    to={`/vehicle/${vehicle.modelSlug}`}
                    onClick={() => trackEvent('recommendation_clicked', { vehicleModelSlug: vehicle.modelSlug })}
                    className="btn-primary min-h-[40px] px-3 py-2 text-center text-xs"
                  >
                    {t({ vi: 'Chi tiết', en: 'Details' })}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleVehicle(vehicle.id)}
                    className={clsx(
                      'min-h-[40px] rounded-full border px-3 py-2 text-xs font-semibold',
                      inCompare ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700',
                    )}
                  >
                    {inCompare ? t({ vi: 'Đang so sánh', en: 'In compare' }) : t({ vi: 'So sánh', en: 'Compare' })}
                  </button>
                  <Link to={`/quote?model=${vehicle.modelSlug}`} className="btn-secondary col-span-2 min-h-[40px] border-slate-900 px-3 py-2 text-center text-xs text-slate-900 sm:col-span-1">
                    {t({ vi: 'Báo giá', en: 'Quote' })}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      {count > 0 ? (
        <div className="fixed inset-x-4 bottom-[calc(6.8rem+env(safe-area-inset-bottom))] z-30 md:hidden">
          <Link to="/compare" className="btn-primary flex min-h-[44px] w-full items-center justify-center shadow-lg">
            {t({ vi: 'Mở so sánh', en: 'Open compare' })} ({count})
          </Link>
        </div>
      ) : null}
      <VoiceModeOverlay open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}

function clsx(...args: Array<string | false | undefined>) {
  return args.filter(Boolean).join(' ');
}
