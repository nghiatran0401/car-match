import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { getWizardSteps } from '../data/wizardSteps';
import { useLanguage } from '../context/LanguageContext';
import {
  derivePriorityWeights,
  leadIntentLabel,
  personaLabel,
  profileSummaryNarrative,
} from '../lib/profileNarrative';

function formatLabel(value: string | undefined) {
  if (!value) return '—';
  return value.replace(/-/g, ' ');
}

export default function ProfilePage() {
  const { language, t } = useLanguage();
  const { profile, answeredCount, resetProfile, isHydrated } = useProfile();
  const wizardSteps = getWizardSteps(language);
  const weights = derivePriorityWeights(profile);
  const narrative = profileSummaryNarrative(profile, weights, language);
  const persona = personaLabel(profile, language);
  const intent = leadIntentLabel(profile, answeredCount, language);

  if (!isHydrated) {
    return <div className="surface p-5 text-sm text-slate-600">{t({ vi: 'Đang tải hồ sơ...', en: 'Loading profile...' })}</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="surface p-5 sm:p-6">
        <p className="kicker">{t({ vi: 'Hồ sơ người mua', en: 'Buyer profile' })}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t({ vi: 'Chân dung và mức độ sẵn sàng quyết định', en: 'Persona and decision intent' })}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{narrative}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t({ vi: 'Chân dung', en: 'Persona' })}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{persona}</p>
          </div>
          <div className="surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t({ vi: 'Mức độ lead', en: 'Lead warmth' })}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{intent}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {(Object.entries(weights) as [keyof typeof weights, number][]).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="font-semibold capitalize text-slate-900">{k}</p>
              <p className="text-slate-500">{Math.round(v * 100)}%</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/" className="btn-primary btn-md">
            {t({ vi: 'Tiếp tục trả lời', en: 'Continue questionnaire' })}
          </Link>
          <Link to="/recommendations" className="btn-secondary btn-md">
            {t({ vi: 'Xem đề xuất', en: 'View matches' })}
          </Link>
          <Link to="/concierge" className="btn-secondary btn-md">
            {t({ vi: 'Hỏi trợ lý AI', en: 'Ask AI assistant' })}
          </Link>
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="kicker">{t({ vi: 'Thu thập 5 bước', en: '5-step intake' })}</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {answeredCount}/5 {t({ vi: 'đã trả lời', en: 'answered' })}
          </span>
        </div>

        <dl className="space-y-2.5">
          {wizardSteps.map(step => {
            let value: string;
            if (step.field === 'powertrains') {
              const p = profile.powertrains;
              if (p === undefined) value = t({ vi: 'Chưa thiết lập', en: 'Not set yet' });
              else if (p.length === 0) value = t({ vi: 'Mở — mọi hệ truyền động', en: 'Open — any powertrain' });
              else value = p.join(', ').toUpperCase();
            } else if (step.field === 'budgetBand') {
              value = formatLabel(profile.budgetBand);
            } else {
              value = formatLabel(profile[step.field] as string | undefined);
            }

            return (
              <div key={step.index} className="surface-muted p-3.5">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{step.title}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-slate-900">{value}</dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={resetProfile}
            className="btn-danger btn-md"
          >
            {t({ vi: 'Đặt lại hồ sơ và lộ trình', en: 'Reset profile and onboarding' })}
          </button>
        </div>
      </section>
    </div>
  );
}
