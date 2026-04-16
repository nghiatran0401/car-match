import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWizardSteps, type WizardStep } from '../data/wizardSteps';
import type { UserProfile } from '../types';
import { useProfile } from '../context/ProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { trackEvent } from '../lib/analytics';
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

function hasCommitted(step: WizardStep, profile: UserProfile): boolean {
  if (step.field === 'powertrains') return profile.powertrains !== undefined;
  return Boolean(profile[step.field]);
}

export default function HomePage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { profile, updateProfile, onboarding, setOnboarding, answeredCount, isHydrated, clearWizardAnswers } =
    useProfile();
  const wizardSteps = useMemo(() => getWizardSteps(language), [language]);

  const stepIndex = onboarding.stepIndex;
  const isFinished = stepIndex >= wizardSteps.length;
  const step = isFinished ? wizardSteps[0] : wizardSteps[stepIndex];
  const selectedId = useMemo(() => selectedOptionId(step, profile), [step, profile]);

  const canBack = stepIndex > 0 && !isFinished;
  const canNext = hasCommitted(step, profile);

  const goNext = useCallback(() => {
    if (!canNext) return;
    trackEvent('question_answered', { questionIndex: stepIndex });
    if (stepIndex === wizardSteps.length - 1) {
      sessionStorage.setItem(AUTO_REDIRECT_AFTER_FINISH_KEY, '1');
    }
    setOnboarding(prev => {
      const flags = [...prev.answeredFlags] as [boolean, boolean, boolean, boolean, boolean];
      if (stepIndex >= 0 && stepIndex < 5) flags[stepIndex] = true;
      return { ...prev, answeredFlags: flags, stepIndex: Math.min(prev.stepIndex + 1, wizardSteps.length) };
    });
  }, [canNext, setOnboarding, stepIndex, wizardSteps.length]);

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

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      <section className="surface border-none bg-[#f5f7fa] p-5 shadow-none sm:p-6">
        <p className="kicker">Smart Showroom</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t({ vi: 'Showroom thông minh được cá nhân hóa cho bạn.', en: 'A smart dealership crafted for you.' })}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t({
            vi: 'Từng câu hỏi ngắn giúp bạn chốt nhanh hơn, không bị quá tải lựa chọn.',
            en: 'One guided question at a time, so the buyer can move forward without getting buried in options.',
          })}
        </p>

        {!isFinished ? (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="kicker">{step.questionLabel}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{step.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{step.helper}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                {answeredCount}/5 {t({ vi: 'đã trả lời', en: 'answered' })}
              </div>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{ width: `${(answeredCount / 5) * 100}%` }}
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {step.options.map(option => {
                const active = selectedId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateProfile(option.profilePatch)}
                    className={clsx(
                      'min-h-[64px] rounded-2xl border px-4 py-3 text-left transition shadow-sm',
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow',
                    )}
                  >
                    <p className="text-sm font-semibold">{option.title}</p>
                    <p className={clsx('mt-1 text-xs', active ? 'text-slate-200' : 'text-slate-500')}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={!canBack}
                  className="btn-secondary disabled:opacity-40"
                >
                  {t({ vi: 'Quay lại', en: 'Back' })}
                </button>
                <button
                  type="button"
                  onClick={goSkip}
                  className="btn-secondary border-transparent text-slate-500 hover:text-slate-900"
                >
                  {t({ vi: 'Bỏ qua', en: 'Skip' })}
                </button>
              </div>
              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className="btn-primary px-6 py-2.5 disabled:bg-slate-300"
              >
                {t({ vi: 'Câu tiếp theo', en: 'Next question' })}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 surface-muted p-4 sm:p-5">
            <p className="kicker">{t({ vi: 'Hoàn thành', en: 'Journey complete' })}</p>
            <h2 className="mt-1 text-xl font-bold">
              {t({ vi: 'Danh sách đề xuất của bạn đã sẵn sàng.', en: 'Your shortlist is ready.' })}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t({
                vi: 'Tiếp tục xem đề xuất, so sánh các lựa chọn và chuyển sang báo giá hoặc đặt lịch showroom.',
                en: 'Continue to recommendations, compare your top picks, and move into quote or showroom booking.',
              })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/recommendations" className="btn-primary">
                {t({ vi: 'Mở đề xuất', en: 'Open recommendations' })}
              </Link>
              <button
                type="button"
                onClick={clearWizardAnswers}
                className="btn-secondary"
              >
                {t({ vi: 'Sửa câu trả lời', en: 'Edit answers' })}
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="surface overflow-hidden rounded-[20px] border-none bg-[#101b2d] text-white shadow-lg">
        <div className="p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-brandSecondary-200">CarMatch featured pick</p>
          <h3 className="mt-2 text-2xl font-semibold">Volvo EC40</h3>
          <p className="mt-2 text-sm leading-relaxed text-brandSecondary-200">
            {t({
              vi: 'Crossover thuần điện êm ái, tạo ấn tượng cao cấp ngay lần xem đầu.',
              en: 'Calm electric crossover for a trust-led first impression.',
            })}
          </p>
          <Link
            to="/vehicle/ec40"
            className="btn-secondary mt-4 inline-flex border-white/20 bg-white text-slate-900"
          >
            {t({ vi: 'Xem chi tiết', en: 'View details' })}
          </Link>
        </div>
        <VehicleImage
          src={getVehicleImage('ec40')}
          fallbackSources={getVehicleImageSources('ec40').slice(1)}
          alt="Volvo EC40"
          className="h-64 w-full object-cover"
        />
      </aside>
    </div>
  );
}

function clsx(...args: Array<string | false | undefined>) {
  return args.filter(Boolean).join(' ');
}
