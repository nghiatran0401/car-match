import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vehicles } from '../data/vehicles';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';

export default function ConciergePage() {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();

  const selectedVehicle = useMemo(() => {
    const model = searchParams.get('model');
    if (!model) return undefined;
    const hit = vehicles.find(v => v.modelSlug === model);
    return hit ? localizeVehicle(hit, language) : undefined;
  }, [searchParams, language]);

  return (
    <section className="surface min-h-[70vh] p-4 sm:p-5">
      <div className="mb-4">
        <p className="kicker">CarMatch AI concierge</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {t({ vi: 'Trợ lý mua xe cá nhân cho từng quyết định', en: 'Personal buying assistant for every decision' })}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t({
            vi: 'Một trải nghiệm hội thoại duy nhất, luôn theo sát bối cảnh của bạn từ khám phá nhu cầu đến báo giá và chốt lịch xem xe.',
            en: 'One continuous conversation that follows your context from discovery to quote and showroom scheduling.',
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
      <div className="grid gap-3 md:grid-cols-3">
        <article className="surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Bước 1', en: 'Step 1' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {t({ vi: 'Làm rõ nhu cầu', en: 'Clarify your needs' })}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {t({
              vi: 'Mô tả mục tiêu sử dụng, ngân sách và ưu tiên để AI dựng khung lựa chọn phù hợp.',
              en: 'Describe use case, budget, and priorities so AI can shape the right option set.',
            })}
          </p>
        </article>
        <article className="surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Bước 2', en: 'Step 2' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {t({ vi: 'Rút gọn shortlist', en: 'Narrow your shortlist' })}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {t({
              vi: 'Yêu cầu so sánh theo tiêu chí cụ thể: chi phí nuôi xe, không gian, an toàn, và vận hành.',
              en: 'Ask for focused comparisons by ownership cost, space, safety, and driving character.',
            })}
          </p>
        </article>
        <article className="surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Bước 3', en: 'Step 3' })}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {t({ vi: 'Đi tới hành động', en: 'Move to action' })}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {t({
              vi: 'Để AI điều hướng bạn sang báo giá và lịch showroom khi đã có lựa chọn phù hợp nhất.',
              en: 'Let AI move you into quote and showroom booking once your best match is clear.',
            })}
          </p>
        </article>
      </div>
    </section>
  );
}
