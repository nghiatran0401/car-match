import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { vehicles } from '../data/vehicles';
import { getVehicleGallery, getVehicleImageSources } from '../lib/vehicleMedia';
import { buildSpecSections } from '../lib/specSectionsForVehicle';
import { useCompare } from '../context/CompareContext';
import { trackEvent } from '../lib/analytics';
import { variantPriceMilVnd, variantsForVehicle } from '../lib/vehicleVariants';
import { askQwenAssistant, type AssistantMessage } from '../lib/aiAssistant';
import { useProfile } from '../context/ProfileContext';
import { rankAndSort } from '../lib/recommendationScore';
import {
  defaultMerchantGuardrails,
  loadMerchantGuardrails,
  saveMerchantGuardrails,
} from '../lib/merchantGuardrails';
import { loadAdminConfig } from '../lib/adminConfig';
import type { MerchantDealGuardrails } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import VehicleImage from '../components/VehicleImage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function estimateMonthlyVnd(priceMil: number, downPct: number, term: number, apr: number): number {
  const principal = priceMil * 1_000_000 * (1 - downPct / 100);
  const r = apr / 100 / 12;
  if (r <= 0) return Math.round(principal / term);
  const pow = (1 + r) ** term;
  return Math.round((principal * r * pow) / (pow - 1));
}

export default function VehicleDetailPage() {
  const { language, t } = useLanguage();
  const { modelSlug } = useParams();
  const { isInCompare, toggleVehicle } = useCompare();
  const { profile, selections } = useProfile();
  const [imgIdx, setImgIdx] = useState(0);
  const [downPct, setDownPct] = useState(15);
  const [term, setTerm] = useState(60);
  const [apr, setApr] = useState(9.5);
  const [variantKey, setVariantKey] = useState('core');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);
  const [guardrails, setGuardrails] = useState<MerchantDealGuardrails>(defaultMerchantGuardrails);

  const vehicle = useMemo(
    () => localizeVehicle(vehicles.find(v => v.modelSlug === modelSlug) ?? vehicles[0], language),
    [language, modelSlug],
  );
  const gallery = useMemo(() => getVehicleGallery(vehicle.modelSlug), [vehicle.modelSlug]);
  const sections = useMemo(() => buildSpecSections(vehicle, language), [language, vehicle]);
  const variants = useMemo(() => variantsForVehicle(vehicles.find(v => v.modelSlug === modelSlug) ?? vehicles[0]), [modelSlug]);
  const shortlistVehicles = useMemo(
    () =>
      rankAndSort(vehicles, profile, selections, language)
        .slice(0, 3)
        .map(entry => localizeVehicle(entry.vehicle, language)),
    [profile, selections, language],
  );
  const effectivePriceMil = variantPriceMilVnd(vehicles.find(v => v.modelSlug === modelSlug) ?? vehicles[0], variantKey);
  const monthly = estimateMonthlyVnd(effectivePriceMil, downPct, term, apr);

  useEffect(() => {
    trackEvent('vehicle_detail_viewed', { vehicleModelSlug: vehicle.modelSlug });
  }, [vehicle.modelSlug]);

  useEffect(() => {
    setVariantKey(variants[0]?.key ?? 'core');
  }, [variants]);

  useEffect(() => {
    setChatMessages([]);
    setChatInput('');
    setChatError('');
  }, [vehicle.modelSlug]);

  useEffect(() => {
    setGuardrails(loadMerchantGuardrails());
  }, []);

  const vehiclePrompts = useMemo(
    () =>
      language === 'vi'
        ? [
            `Tôi nên mua ${vehicle.name} ngay hay chờ thêm 3-6 tháng?`,
            `Hãy cho tôi kế hoạch đàm phán cho ${vehicle.name} theo ngân sách hiện tại.`,
            `Điểm mạnh lớn nhất và điểm đánh đổi của ${vehicle.name} với hồ sơ của tôi là gì?`,
          ]
        : [
            `Should I buy ${vehicle.name} now or wait 3-6 months?`,
            `Give me a negotiation plan for ${vehicle.name} in my budget.`,
            `What are the biggest pros and trade-offs of ${vehicle.name} for my profile?`,
          ],
    [language, vehicle.name],
  );

  const sendVehicleChat = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const user: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };
    setChatMessages(prev => [...prev, user]);
    setChatInput('');
    setChatLoading(true);
    setChatError('');
    trackEvent('concierge_asked', { vehicleModelSlug: vehicle.modelSlug });
    try {
      const conversation: AssistantMessage[] = [...chatMessages, user].map(m => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await askQwenAssistant(conversation, {
        language,
        profile,
        currentVehicle: vehicle,
        shortlistVehicles,
        merchantGuardrails: guardrails,
        adminPromptInstructions: loadAdminConfig().promptInstructions,
      });
      setChatMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
      trackEvent('concierge_replied', { vehicleModelSlug: vehicle.modelSlug });
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content:
            t({
              vi: 'Hiện chưa kết nối được trợ lý trực tuyến. Vui lòng kiểm tra cấu hình API rồi thử lại. Bạn vẫn có thể tiếp tục qua báo giá/thông số/showroom.',
              en: 'I could not reach the live assistant right now. Please verify API configuration and retry. I can still help via quote/specs/showroom actions.',
            }),
        },
      ]);
      setChatError(err instanceof Error ? err.message : t({ vi: 'Yêu cầu trợ lý thất bại.', en: 'Assistant request failed.' }));
    } finally {
      setChatLoading(false);
    }
  };

  const askAboutSpec = (sectionTitle: string, specLabel: string, specValue: string) => {
    const question =
      language === 'vi'
        ? `Giải thích chi tiết mục "${specLabel}: ${specValue}" trong phần ${sectionTitle} của ${vehicle.name}, và điều này ảnh hưởng trải nghiệm sử dụng thực tế như thế nào?`
        : `Explain "${specLabel}: ${specValue}" from the ${sectionTitle} specs of ${vehicle.name}, and how it affects real-world ownership experience.`;
    void sendVehicleChat(question);
  };

  return (
    <div className="space-y-5">
      <section className="surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <Link to="/recommendations" className="font-semibold text-slate-600 hover:text-slate-900">
              ← {t({ vi: 'Đề xuất', en: 'Shortlist' })}
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{vehicle.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/quote?model=${vehicle.modelSlug}&variant=${variantKey}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              {t({ vi: 'Nhận báo giá', en: 'Get quote' })}
            </Link>
            <button
              type="button"
              onClick={() => toggleVehicle(vehicle.id)}
              className={isInCompare(vehicle.id)
                ? 'rounded-full border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700'
                : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700'}
            >
              {isInCompare(vehicle.id) ? t({ vi: 'Bỏ so sánh', en: 'Remove compare' }) : t({ vi: 'Thêm so sánh', en: 'Add compare' })}
            </button>
          </div>
        </div>
      </section>

      <section className="surface p-4 sm:p-5">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr_0.85fr]">
          <div>
            <VehicleImage
              src={gallery[imgIdx]}
              fallbackSources={imgIdx === 0 ? getVehicleImageSources(vehicle.modelSlug).slice(1) : []}
              alt={vehicle.name}
              loading={imgIdx === 0 ? 'eager' : 'lazy'}
              fetchPriority={imgIdx === 0 ? 'high' : 'auto'}
              sizes="(max-width: 1280px) 100vw, 42vw"
              className="aspect-[16/10] w-full rounded-2xl object-cover"
            />
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  className={i === imgIdx ? 'h-16 w-24 rounded-xl border-2 border-slate-900 overflow-hidden' : 'h-16 w-24 rounded-xl border-2 border-transparent overflow-hidden opacity-80'}
                >
                  <VehicleImage
                    src={src}
                    alt={`${vehicle.name} view ${i + 1}`}
                    loading="lazy"
                    fetchPriority="low"
                    sizes="96px"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="kicker">{vehicle.bodyStyle}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{vehicle.name}</h1>
            <p className="mt-1 text-slate-600">{vehicle.trim}</p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t({ vi: 'Phiên bản', en: 'Variant' })}
              <select
                value={variantKey}
                onChange={e => setVariantKey(e.target.value)}
                className="input-base mt-1 min-h-[40px] rounded-lg px-2 py-2 text-sm normal-case"
              >
                {variants.map(v => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              {t({ vi: 'Từ', en: 'From' })} {effectivePriceMil.toLocaleString('vi-VN')}m VND
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{vehicle.thesis}</p>

            <div className="surface-muted mt-4 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t({ vi: 'Ước tính trả góp', en: 'Payment snapshot (estimate)' })}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-600">{t({ vi: 'Trả trước %', en: 'Down %' })}
                  <input type="number" min={0} max={90} value={downPct} onChange={e => setDownPct(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-900" />
                </label>
                <label className="text-xs text-slate-600">{t({ vi: 'Kỳ hạn', en: 'Term' })}
                  <select value={term} onChange={e => setTerm(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-900">
                    {[36, 48, 60, 72].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="text-xs text-slate-600">{t({ vi: 'Lãi suất APR %', en: 'APR %' })}
                  <input type="number" min={0} max={30} step={0.1} value={apr} onChange={e => setApr(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-900" />
                </label>
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900">
                ≈ {monthly.toLocaleString('vi-VN')} VND {t({ vi: '/ tháng', en: '/ month' })}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/showrooms" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                {t({ vi: 'Lên lịch ghé showroom', en: 'Plan showroom visit' })}
              </Link>
            </div>
          </div>

          <aside className="surface-muted flex h-[520px] min-h-[520px] flex-col overflow-hidden p-3 sm:p-4">
            <div className="mb-2">
              <p className="kicker">{t({ vi: 'AI đồng hành', en: 'AI copilot' })}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {t({ vi: 'Tư vấn trực tiếp khi bạn đang xem xe', en: 'Live advice while you review this car' })}
              </p>
              <button
                type="button"
                onClick={() => setGuardrailsOpen(v => !v)}
                className="mt-2 text-xs font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                {guardrailsOpen
                  ? t({ vi: 'Ẩn giới hạn chính sách', en: 'Hide merchant guardrails' })
                  : t({ vi: 'Thiết lập giới hạn chính sách', en: 'Set merchant guardrails' })}
              </button>
              {guardrailsOpen ? (
                <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t({ vi: 'Giảm giá tối thiểu %', en: 'Discount min %' })}
                      <input
                        type="number"
                        value={guardrails.discountMinPct}
                        min={0}
                        max={40}
                        onChange={e =>
                          setGuardrails(prev => ({ ...prev, discountMinPct: Number(e.target.value) || 0 }))
                        }
                        className="input-base mt-1 min-h-[34px] px-2 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t({ vi: 'Giảm giá tối đa %', en: 'Discount max %' })}
                      <input
                        type="number"
                        value={guardrails.discountMaxPct}
                        min={0}
                        max={40}
                        onChange={e =>
                          setGuardrails(prev => ({ ...prev, discountMaxPct: Number(e.target.value) || 0 }))
                        }
                        className="input-base mt-1 min-h-[34px] px-2 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t({ vi: 'APR tối thiểu %', en: 'APR min %' })}
                      <input
                        type="number"
                        step={0.1}
                        value={guardrails.aprMinPct}
                        min={0}
                        max={30}
                        onChange={e => setGuardrails(prev => ({ ...prev, aprMinPct: Number(e.target.value) || 0 }))}
                        className="input-base mt-1 min-h-[34px] px-2 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t({ vi: 'APR tối đa %', en: 'APR max %' })}
                      <input
                        type="number"
                        step={0.1}
                        value={guardrails.aprMaxPct}
                        min={0}
                        max={30}
                        onChange={e => setGuardrails(prev => ({ ...prev, aprMaxPct: Number(e.target.value) || 0 }))}
                        className="input-base mt-1 min-h-[34px] px-2 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t({ vi: 'Đặt cọc tối thiểu %', en: 'Deposit min %' })}
                      <input
                        type="number"
                        value={guardrails.minDepositPct}
                        min={0}
                        max={80}
                        onChange={e =>
                          setGuardrails(prev => ({ ...prev, minDepositPct: Number(e.target.value) || 0 }))
                        }
                        className="input-base mt-1 min-h-[34px] px-2 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t({ vi: 'Đặt cọc tối đa %', en: 'Deposit max %' })}
                      <input
                        type="number"
                        value={guardrails.maxDepositPct}
                        min={0}
                        max={80}
                        onChange={e =>
                          setGuardrails(prev => ({ ...prev, maxDepositPct: Number(e.target.value) || 0 }))
                        }
                        className="input-base mt-1 min-h-[34px] px-2 text-xs"
                      />
                    </label>
                  </div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    {t({ vi: 'Ưu đãi cho phép (phân tách bằng dấu phẩy)', en: 'Allowed perks (comma separated)' })}
                    <input
                      type="text"
                      value={guardrails.allowedPerks.join(', ')}
                      onChange={e =>
                        setGuardrails(prev => ({
                          ...prev,
                          allowedPerks: e.target.value
                            .split(',')
                            .map(x => x.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="input-base mt-1 min-h-[34px] px-2 text-xs"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => saveMerchantGuardrails(guardrails)}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    {t({ vi: 'Lưu giới hạn chính sách', en: 'Save guardrails' })}
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5">
              {chatMessages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">{t({ vi: 'Thử một câu hỏi:', en: 'Try one:' })}</p>
                  {vehiclePrompts.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendVehicleChat(prompt)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : (
                chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={message.role === 'user'
                      ? 'ml-8 rounded-xl bg-slate-900 px-3 py-2 text-sm leading-5 text-white whitespace-pre-wrap break-words'
                      : 'mr-8 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700 whitespace-pre-wrap break-words'}
                  >
                    {message.content}
                  </div>
                ))
              )}
              {chatLoading ? <p className="text-xs text-slate-500">{t({ vi: 'AI đang phân tích...', en: 'AI is thinking...' })}</p> : null}
              {chatError ? <p className="text-xs text-amber-700">{chatError}</p> : null}
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                void sendVehicleChat(chatInput);
              }}
              className="mt-2 flex gap-2"
            >
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={t({ vi: `Hỏi về ${vehicle.name}...`, en: `Ask about ${vehicle.name}...` })}
                className="input-base mt-0 min-h-[40px] text-sm"
              />
              <button type="submit" disabled={!chatInput.trim() || chatLoading} className="btn-primary px-3 py-2 disabled:bg-slate-300">
                {t({ vi: 'Gửi', en: 'Send' })}
              </button>
            </form>
          </aside>
        </div>
      </section>

      <section id="specifications" className="surface scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Thông số đầy đủ', en: 'Full specifications' })}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t({
            vi: 'Chạm vào từng dòng thông số để hỏi AI giải thích theo nhu cầu sử dụng của bạn.',
            en: 'Tap any spec row to ask AI for a practical explanation.',
          })}
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {sections.map(section => (
            <div key={section.title} className="surface-muted p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</h3>
              <div className="mt-2 space-y-2">
                {section.rows.map(row => (
                  <div key={row.label}>
                    <button
                      type="button"
                      onClick={() => askAboutSpec(section.title, row.label, row.value)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-white/80"
                    >
                      <p className="text-slate-500">{row.label}</p>
                      <p className="text-right font-semibold text-slate-900">{row.value}</p>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
