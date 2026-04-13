import { useMemo, useState } from 'react';
import { listLeads } from '../lib/leads';
import {
  defaultMerchantGuardrails,
  loadMerchantGuardrails,
  saveMerchantGuardrails,
} from '../lib/merchantGuardrails';
import { loadAdminConfig, saveAdminConfig } from '../lib/adminConfig';
import type { MerchantDealGuardrails } from '../types';
import { useLanguage } from '../context/LanguageContext';

type TabKey = 'dashboard' | 'analytics' | 'deals' | 'prompt' | 'stakeholders';

interface AnalyticsRow {
  t: string;
  name: string;
  payload?: { sessionId?: string };
}

const funnelEvents = [
  'questionnaire_started',
  'shortlist_viewed',
  'vehicle_detail_viewed',
  'quote_started',
  'quote_submitted',
  'booking_submitted',
] as const;

export default function AdminPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [guardrails, setGuardrails] = useState<MerchantDealGuardrails>(() => loadMerchantGuardrails());
  const [adminConfig, setAdminConfig] = useState(() => loadAdminConfig());

  const leads = useMemo(() => listLeads().slice().reverse(), []);
  const analytics = useMemo<AnalyticsRow[]>(() => {
    try {
      const raw = localStorage.getItem('carmatch-analytics-events');
      const parsed = raw ? (JSON.parse(raw) as AnalyticsRow[]) : [];
      return Array.isArray(parsed) ? parsed.slice().reverse() : [];
    } catch {
      return [];
    }
  }, []);

  const kpis = useMemo(() => {
    const sessions = new Set(analytics.map(row => row.payload?.sessionId).filter(Boolean)).size;
    const quotes = leads.filter(x => x.type === 'quote').length;
    const bookings = leads.filter(x => x.type === 'booking').length;
    const quoteToBooking = quotes > 0 ? Math.round((bookings / quotes) * 100) : 0;
    return { sessions, quotes, bookings, quoteToBooking };
  }, [analytics, leads]);

  const funnelCounts = useMemo(
    () =>
      funnelEvents.map(name => ({
        name,
        count: analytics.filter(row => row.name === name).length,
      })),
    [analytics],
  );
  const funnelMax = Math.max(...funnelCounts.map(x => x.count), 1);

  const byLeadType = useMemo(
    () => ({
      quote: leads.filter(x => x.type === 'quote').length,
      booking: leads.filter(x => x.type === 'booking').length,
    }),
    [leads],
  );

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'dashboard', label: t({ vi: 'Tổng quan', en: 'Dashboard' }) },
    { key: 'analytics', label: t({ vi: 'Phân tích', en: 'Analytics' }) },
    { key: 'deals', label: t({ vi: 'Chính sách deal', en: 'Deals' }) },
    { key: 'prompt', label: t({ vi: 'Prompt', en: 'Prompt' }) },
    { key: 'stakeholders', label: t({ vi: 'Bên liên quan', en: 'Stakeholders' }) },
  ];

  return (
    <div className="space-y-5">
      <section className="surface p-5 sm:p-6">
        <p className="kicker">{t({ vi: 'Quản trị', en: 'Admin' })}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t({ vi: 'Trung tâm điều khiển CarMatch', en: 'CarMatch control center' })}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t({
            vi: 'Quản lý giới hạn deal, hành vi prompt và quy trình bàn giao giữa các bộ phận tại một nơi.',
            en: 'Manage deal guardrails, prompt behavior, and stakeholder handoff from one place.',
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'dashboard' ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t({ vi: 'Phiên hoạt động', en: 'Active sessions' })}
            value={String(kpis.sessions)}
            hint={t({ vi: 'Số phiên được theo dõi', en: 'Unique tracked sessions' })}
          />
          <StatCard
            label={t({ vi: 'Lead báo giá', en: 'Quote leads' })}
            value={String(kpis.quotes)}
            hint={t({ vi: 'Số bản ghi báo giá', en: 'Captured quote records' })}
          />
          <StatCard
            label={t({ vi: 'Lead đặt lịch', en: 'Booking leads' })}
            value={String(kpis.bookings)}
            hint={t({ vi: 'Số lead có ý định cao', en: 'High-intent booking records' })}
          />
          <StatCard
            label="Quote→Booking"
            value={`${kpis.quoteToBooking}%`}
            hint={t({ vi: 'Chất lượng chuyển đổi lead', en: 'Lead progression quality' })}
          />
        </section>
      ) : null}

      {activeTab === 'analytics' ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="surface p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Biểu đồ funnel', en: 'Funnel chart' })}</h2>
            <div className="mt-4 space-y-3">
              {funnelCounts.map(row => (
                <div key={row.name}>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{row.name}</span>
                    <span>{row.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{ width: `${Math.max(8, (row.count / funnelMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Luồng sự kiện', en: 'Event stream' })}</h2>
            <div className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">{t({ vi: 'Thời gian', en: 'Time' })}</th>
                    <th className="px-3 py-2">{t({ vi: 'Sự kiện', en: 'Event' })}</th>
                    <th className="px-3 py-2">{t({ vi: 'Phiên', en: 'Session' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.slice(0, 80).map((row, idx) => (
                    <tr key={`${row.t}-${idx}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-500">{new Date(row.t).toLocaleString()}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-3 py-2 text-slate-500">{row.payload?.sessionId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'deals' ? (
        <section className="surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Giới hạn deal', en: 'Deal guardrails' })}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t({
              vi: 'AI phải luôn tư vấn trong các biên độ thương mại này.',
              en: 'AI must stay within these commercial ranges when advising customers.',
            })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MiniNumber label={t({ vi: 'Giảm giá tối thiểu %', en: 'Discount min %' })} value={guardrails.discountMinPct} onChange={v => setGuardrails(prev => ({ ...prev, discountMinPct: v }))} />
            <MiniNumber label={t({ vi: 'Giảm giá tối đa %', en: 'Discount max %' })} value={guardrails.discountMaxPct} onChange={v => setGuardrails(prev => ({ ...prev, discountMaxPct: v }))} />
            <MiniNumber label={t({ vi: 'APR tối thiểu %', en: 'APR min %' })} value={guardrails.aprMinPct} step={0.1} onChange={v => setGuardrails(prev => ({ ...prev, aprMinPct: v }))} />
            <MiniNumber label={t({ vi: 'APR tối đa %', en: 'APR max %' })} value={guardrails.aprMaxPct} step={0.1} onChange={v => setGuardrails(prev => ({ ...prev, aprMaxPct: v }))} />
            <MiniNumber label={t({ vi: 'Đặt cọc tối thiểu %', en: 'Deposit min %' })} value={guardrails.minDepositPct} onChange={v => setGuardrails(prev => ({ ...prev, minDepositPct: v }))} />
            <MiniNumber label={t({ vi: 'Đặt cọc tối đa %', en: 'Deposit max %' })} value={guardrails.maxDepositPct} onChange={v => setGuardrails(prev => ({ ...prev, maxDepositPct: v }))} />
          </div>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Ưu đãi cho phép (cách nhau dấu phẩy)', en: 'Allowed perks (comma separated)' })}
            <input
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
              className="input-base min-h-[42px] normal-case"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => saveMerchantGuardrails(guardrails)} className="btn-primary">
              {t({ vi: 'Lưu biên độ deal', en: 'Save deal ranges' })}
            </button>
            <button type="button" onClick={() => setGuardrails(defaultMerchantGuardrails)} className="btn-secondary">
              {t({ vi: 'Khôi phục mặc định', en: 'Reset defaults' })}
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === 'prompt' ? (
        <section className="surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Điều khiển prompt', en: 'Prompt control' })}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t({
              vi: 'Thêm chỉ dẫn nghiệp vụ để AI luôn tuân thủ trong mọi cuộc hội thoại với khách hàng.',
              en: 'Add business-specific coaching instructions that the AI must follow in every customer interaction.',
            })}
          </p>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Hướng dẫn prompt theo chính sách đại lý', en: 'Merchant prompt instructions' })}
            <textarea
              rows={8}
              value={adminConfig.promptInstructions}
              onChange={e => setAdminConfig(prev => ({ ...prev, promptInstructions: e.target.value }))}
              className="input-base py-2.5 normal-case"
            />
          </label>
          <div className="mt-3">
            <button type="button" onClick={() => saveAdminConfig(adminConfig)} className="btn-primary">
              {t({ vi: 'Lưu chính sách prompt', en: 'Save prompt policy' })}
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === 'stakeholders' ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Bảng lead', en: 'Lead desk' })}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t({ vi: 'Danh sách vận hành chung cho sales, tài chính và showroom.', en: 'Shared operational list for sales, finance, and showroom teams.' })}
            </p>
            <div className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">{t({ vi: 'Tạo lúc', en: 'Created' })}</th>
                    <th className="px-3 py-2">{t({ vi: 'Loại', en: 'Type' })}</th>
                    <th className="px-3 py-2">{t({ vi: 'Mẫu xe', en: 'Vehicle' })}</th>
                    <th className="px-3 py-2">{t({ vi: 'Liên hệ', en: 'Contact' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-500">{new Date(lead.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{lead.type}</td>
                      <td className="px-3 py-2 text-slate-700">{lead.vehicleModelSlug ?? t({ vi: 'chung', en: 'general' })}</td>
                      <td className="px-3 py-2 text-slate-700">{lead.contact.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Sổ tay phối hợp', en: 'Stakeholder playbook' })}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t({ vi: 'Ghi chú phối hợp cho quản lý sales, chuyên viên tài chính và nhân sự showroom.', en: 'Shared notes for sales manager, finance specialist, and showroom staff.' })}
            </p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t({ vi: 'Ghi chú vận hành', en: 'Operational notes' })}
              <textarea
                rows={10}
                value={adminConfig.stakeholderNotes}
                onChange={e => setAdminConfig(prev => ({ ...prev, stakeholderNotes: e.target.value }))}
                className="input-base py-2.5 normal-case"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => saveAdminConfig(adminConfig)} className="btn-primary">
                {t({ vi: 'Lưu ghi chú phối hợp', en: 'Save stakeholder notes' })}
              </button>
              <span className="surface-muted px-3 py-2 text-xs text-slate-600">
                {t({ vi: 'Cơ cấu lead:', en: 'Lead mix:' })} {byLeadType.quote} {t({ vi: 'báo giá', en: 'quote' })} / {byLeadType.booking} {t({ vi: 'đặt lịch', en: 'booking' })}
              </span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function MiniNumber({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="input-base min-h-[42px] normal-case"
      />
    </label>
  );
}

