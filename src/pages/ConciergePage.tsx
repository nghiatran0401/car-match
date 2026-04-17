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
          {t({ vi: 'AI Co-pilot luôn ở khung bên phải', en: 'AI Co-pilot is always on the right panel' })}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t({
            vi: 'Đã hợp nhất thành 1 giao diện chat duy nhất để bạn tương tác liên tục bằng text hoặc voice trong suốt hành trình.',
            en: 'Chat is unified into one interface so you can engage continuously with text or voice across the full journey.',
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
      <div className="surface-muted p-4">
        <p className="text-sm font-semibold text-slate-900">
          {t({ vi: 'Mẹo sử dụng nhanh', en: 'Quick usage tips' })}
        </p>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          <li>• {t({ vi: 'Mở hồ sơ và nêu nhu cầu để AI hiểu bối cảnh ban đầu.', en: 'Start at profile and describe your needs so AI can set context.' })}</li>
          <li>• {t({ vi: 'Trong lúc xem xe, yêu cầu AI so sánh và chọn shortlist.', en: 'While browsing cars, ask AI to compare and produce a shortlist.' })}</li>
          <li>• {t({ vi: 'Khi sẵn sàng, nhờ AI dẫn tới báo giá và đặt lịch showroom.', en: 'When ready, ask AI to guide you to quote and showroom booking.' })}</li>
        </ul>
      </div>
    </section>
  );
}
