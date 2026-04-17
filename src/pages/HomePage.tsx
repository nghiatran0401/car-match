import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWizardSteps, type WizardStep } from '../data/wizardSteps';
import { vehicles } from '../data/vehicles';
import type { UserProfile } from '../types';
import { useProfile } from '../context/ProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { trackEvent } from '../lib/analytics';
import { rankAndSort } from '../lib/recommendationScore';
import { localizeVehicle } from '../lib/localizedVehicle';
import { getVehicleImage, getVehicleImageSources } from '../lib/vehicleMedia';
import VehicleImage from '../components/VehicleImage';

const AUTO_REDIRECT_AFTER_FINISH_KEY = 'carmatch-auto-open-recommendations';

function selectedOptionId(step: WizardStep, profile: UserProfile): string | null {
  if (step.field === 'powertrains') {
    const p = profile.powertrains;
    if (p === undefined) return null;
    if (p.length === 0) return 'open';
    const hit = step.options.find(o => {
      const patch = o.profilePatch.powertrains;
      return Array.isArray(patch) && patch.length === 1 && patch[0] === p[0];
    });
    return hit?.id ?? null;
  }
  const field = step.field;
  const value = profile[field] as string | undefined;
  if (!value) return null;
  return step.options.find(o => (o.profilePatch[field] as string | undefined) === value)?.id ?? null;
}

export default function HomePage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { profile, selections, updateProfile, onboarding, setOnboarding, answeredCount, isHydrated, clearWizardAnswers } =
    useProfile();
  const wizardSteps = useMemo(() => getWizardSteps(language), [language]);

  const stepIndex = onboarding.stepIndex;
  const isFinished = stepIndex >= wizardSteps.length;
  const step = isFinished ? wizardSteps[0] : wizardSteps[stepIndex];
  const selectedId = useMemo(() => selectedOptionId(step, profile), [step, profile]);

  const canBack = stepIndex > 0 && !isFinished;
  const currentStepNumber = Math.min(stepIndex + 1, wizardSteps.length);
  const progressPercent = Math.round((answeredCount / wizardSteps.length) * 100);
  const featuredMatch = useMemo(
    () =>
      rankAndSort(vehicles, profile, selections, language)
        .slice(0, 1)
        .map(item => ({ ...item, vehicle: localizeVehicle(item.vehicle, language) }))[0],
    [language, profile, selections],
  );
  const [flippingToQuestionnaire, setFlippingToQuestionnaire] = useState(false);

  const goSkip = useCallback(() => {
    trackEvent('question_skipped', { questionIndex: stepIndex });
    setOnboarding(prev => ({ ...prev, stepIndex: Math.min(prev.stepIndex + 1, wizardSteps.length) }));
  }, [setOnboarding, stepIndex]);

  const goBack = useCallback(() => {
    setOnboarding(prev => ({ ...prev, stepIndex: Math.max(prev.stepIndex - 1, 0) }));
  }, [setOnboarding]);

  useEffect(() => {
    if (!isHydrated) return;
    if (sessionStorage.getItem('carmatch-qs-started')) return;
    sessionStorage.setItem('carmatch-qs-started', '1');
    trackEvent('questionnaire_started');
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !isFinished) return;
    if (sessionStorage.getItem(AUTO_REDIRECT_AFTER_FINISH_KEY) !== '1') return;
    sessionStorage.removeItem(AUTO_REDIRECT_AFTER_FINISH_KEY);
    navigate('/recommendations');
  }, [isFinished, isHydrated, navigate]);

  if (!isHydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="surface px-5 py-4 text-sm text-slate-600">
          {t({ vi: 'Đang chuẩn bị trải nghiệm tư vấn của bạn...', en: 'Preparing your guided experience...' })}
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="mx-auto w-full max-w-[560px]">
        <aside
          className={clsx(
            'overflow-hidden rounded-3xl border border-slate-200 bg-brandSecondary-900 text-white shadow-2xl',
            flippingToQuestionnaire && 'card-flip-to-questionnaire',
          )}
        >
          <div className="p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-brandSecondary-200">
              {t({ vi: 'Gợi ý nổi bật theo hồ sơ', en: 'Featured by your profile' })}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{featuredMatch?.vehicle.name ?? 'Volvo EC40'}</h3>
            <p className="mt-1 text-xs text-brandSecondary-100">{featuredMatch?.vehicle.trim}</p>
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {t({ vi: 'Độ phù hợp', en: 'Match confidence' })}: {featuredMatch?.score ?? 82}%
            </p>
            <p className="mt-3 text-xs leading-relaxed text-brandSecondary-200">
              {featuredMatch?.vehicle.thesis ??
                t({
                  vi: 'Crossover thuần điện êm ái, tạo ấn tượng cao cấp ngay lần xem đầu.',
                  en: 'Calm electric crossover for a trust-led first impression.',
                })}
            </p>
            {featuredMatch?.reasons?.length ? (
              <ul className="mt-3 space-y-1 text-[11px] text-brandSecondary-100">
                {featuredMatch.reasons.slice(0, 2).map(reason => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/vehicle/${featuredMatch?.vehicle.modelSlug ?? 'ec40'}`}
                className="btn-secondary btn-md inline-flex border-white/20 bg-white text-slate-900"
              >
                {t({ vi: 'Xem chi tiết', en: 'View details' })}
              </Link>
              <Link
                to={`/quote?model=${featuredMatch?.vehicle.modelSlug ?? 'ec40'}`}
                className="btn-secondary btn-md border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                {t({ vi: 'Nhận báo giá', en: 'Get quote' })}
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (flippingToQuestionnaire) return;
                  setFlippingToQuestionnaire(true);
                  window.setTimeout(() => {
                    clearWizardAnswers();
                    setFlippingToQuestionnaire(false);
                  }, 520);
                }}
                className="btn-secondary btn-md border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                {t({ vi: 'Sửa câu trả lời', en: 'Edit answers' })}
              </button>
            </div>
          </div>
          <VehicleImage
            src={getVehicleImage(featuredMatch?.vehicle.modelSlug ?? 'ec40')}
            fallbackSources={getVehicleImageSources(featuredMatch?.vehicle.modelSlug ?? 'ec40').slice(1)}
            alt={featuredMatch?.vehicle.name ?? 'Volvo EC40'}
            className="h-64 w-full object-cover"
          />
        </aside>
      </div>
    );
  }

  return (
    <div className="relative">
      <section className="surface p-5 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 sm:p-5">
          <p className="kicker">CarMatch</p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {t({ vi: 'Showroom thông minh được cá nhân hóa cho bạn.', en: 'A smart dealership crafted for you.' })}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {t({
              vi: 'Tư vấn ngắn gọn theo đúng nhu cầu để bạn ra quyết định tự tin hơn, nhanh hơn và ít rủi ro hơn.',
              en: 'Guided recommendations tailored to your goals so you can decide faster, with more confidence and less risk.',
            })}
          </p>
        </div>

        {!isFinished ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {t({ vi: 'Bước', en: 'Step' })} {currentStepNumber}/{wizardSteps.length}
                </p>
                <p className="kicker">{step.questionLabel}</p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{step.helper}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                {answeredCount}/{wizardSteps.length} {t({ vi: 'đã trả lời', en: 'answered' })}
              </div>
            </div>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              {t({
                vi: 'Trả lời nhanh để hệ thống đưa ra shortlist chính xác hơn theo nhu cầu của bạn.',
                en: 'Quick answers help the system deliver a more accurate shortlist.',
              })}
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {step.options.slice(0, 4).map(option => {
                const active = selectedId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      updateProfile(option.profilePatch);
                      // Auto-advance to next question after a short delay to show selection
                      setTimeout(() => {
                        setOnboarding(prev => {
                          const flags = [...prev.answeredFlags] as [boolean, boolean, boolean, boolean, boolean];
                          if (stepIndex >= 0 && stepIndex < 5) flags[stepIndex] = true;
                          return { ...prev, answeredFlags: flags, stepIndex: Math.min(prev.stepIndex + 1, wizardSteps.length) };
                        });
                        trackEvent('question_answered', { questionIndex: stepIndex });
                      }, 200);
                    }}
                    className={clsx(
                      'min-h-[70px] rounded-xl border px-3.5 py-2.5 text-left transition',
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-sm',
                    )}
                  >
                    <p className="text-[15px] font-semibold leading-tight">{option.title}</p>
                    <p className={clsx('mt-0.5 text-xs leading-snug', active ? 'text-slate-200' : 'text-slate-500')}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={!canBack}
                className="btn-secondary btn-xs disabled:opacity-40"
              >
                {t({ vi: 'Quay lại', en: 'Back' })}
              </button>
              <button
                type="button"
                onClick={goSkip}
                className="btn-secondary btn-xs border-transparent text-slate-500 hover:text-slate-900"
              >
                {t({ vi: 'Chưa chắc, để sau', en: 'Not sure yet' })}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {t({
                vi: 'Mọi lựa chọn đều có thể chỉnh sửa lại sau trong hồ sơ.',
                en: 'You can always edit these answers later in your profile.',
              })}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function clsx(...args: Array<string | false | undefined>) {
  return args.filter(Boolean).join(' ');
}
