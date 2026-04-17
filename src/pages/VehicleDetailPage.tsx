import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { vehicles } from '../data/vehicles';
import { getVehicleGallery, getVehicleImageSources } from '../lib/vehicleMedia';
import { buildSpecSections } from '../lib/specSectionsForVehicle';
import { useCompare } from '../context/CompareContext';
import { trackEvent } from '../lib/analytics';
import { variantPriceMilVnd, variantsForVehicle } from '../lib/vehicleVariants';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import VehicleImage from '../components/VehicleImage';
import InteractiveSpecItem, { type SpecContext } from '../components/InteractiveSpecItem';

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
  const [imgIdx, setImgIdx] = useState(0);
  const [downPct, setDownPct] = useState(15);
  const [term, setTerm] = useState(60);
  const [apr, setApr] = useState(9.5);
  const [variantKey, setVariantKey] = useState('core');

  const vehicle = useMemo(
    () => localizeVehicle(vehicles.find(v => v.modelSlug === modelSlug) ?? vehicles[0], language),
    [language, modelSlug],
  );
  const gallery = useMemo(() => getVehicleGallery(vehicle.modelSlug), [vehicle.modelSlug]);
  const sections = useMemo(() => buildSpecSections(vehicle, language), [language, vehicle]);
  const variants = useMemo(() => variantsForVehicle(vehicles.find(v => v.modelSlug === modelSlug) ?? vehicles[0]), [modelSlug]);
  const effectivePriceMil = variantPriceMilVnd(vehicles.find(v => v.modelSlug === modelSlug) ?? vehicles[0], variantKey);
  const monthly = estimateMonthlyVnd(effectivePriceMil, downPct, term, apr);

  useEffect(() => {
    trackEvent('vehicle_detail_viewed', { vehicleModelSlug: vehicle.modelSlug });
  }, [vehicle.modelSlug]);

  useEffect(() => {
    setVariantKey(variants[0]?.key ?? 'core');
  }, [variants]);

  const handleSpecClick = useCallback(
    (ctx: SpecContext) => {
      void ctx;
    },
    [],
  );

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
              {t({ vi: 'Nhận báo giá ưu tiên', en: 'Get priority quote' })}
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
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
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
            <p className="mt-1 text-xs text-emerald-700">
              {t({
                vi: 'Tư vấn minh bạch chi phí lăn bánh và phương án vay trước khi chốt.',
                en: 'Transparent support for on-road costs and financing before you commit.',
              })}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{vehicle.thesis}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t({ vi: 'Dòng xe', en: 'Type' })}</p>
                <p className="text-xs font-semibold text-slate-900">{vehicle.vehicleType.toUpperCase()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t({ vi: 'Nhiên liệu', en: 'Powertrain' })}</p>
                <p className="text-xs font-semibold text-slate-900">{vehicle.powertrain.toUpperCase()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{t({ vi: 'Mức giá', en: 'Price band' })}</p>
                <p className="text-xs font-semibold text-slate-900">{vehicle.priceBand}</p>
              </div>
            </div>

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
              <p className="mt-1 text-xs text-slate-500">
                {t({
                  vi: 'Ước tính tham khảo, chưa bao gồm phí đăng ký, bảo hiểm và ưu đãi theo thời điểm.',
                  en: 'Reference estimate only; excludes registration fees, insurance, and time-based promotions.',
                })}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/quote?model=${vehicle.modelSlug}&variant=${variantKey}`} className="btn-primary px-4 py-2 text-sm">
                {t({ vi: 'Tiếp tục nhận báo giá', en: 'Continue to quote' })}
              </Link>
              <Link to="/showrooms" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                {t({ vi: 'Lên lịch ghé showroom', en: 'Plan showroom visit' })}
              </Link>
            </div>
            <div className="surface-muted mt-4 p-4">
              <p className="text-sm font-semibold text-slate-900">{t({ vi: 'AI Co-pilot', en: 'AI Co-pilot' })}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t({
                  vi: 'Khung chat đã được hợp nhất sang panel cố định bên phải. Bạn có thể hỏi về mẫu xe này bằng cả text và voice ngay tại đó.',
                  en: 'Chat has been unified into the fixed right-side panel. Ask about this car there using text or voice.',
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="specifications" className="surface scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{t({ vi: 'Thông số đầy đủ', en: 'Full specifications' })}</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {sections.map(section => (
            <div key={section.title} className="surface-muted p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</h3>
              <dl className="mt-2 space-y-2">
                {section.rows.map(row =>
                  row.isInteractive && row.specKey && row.category ? (
                    <InteractiveSpecItem
                      key={`${section.title}-${row.label}`}
                      label={row.label}
                      value={row.value}
                      specKey={row.specKey}
                      category={row.category}
                      vehicleId={vehicle.id}
                      onSpecClick={handleSpecClick}
                    />
                  ) : (
                    <div key={row.label} className="flex justify-between gap-3 text-sm">
                      <dt className="text-slate-500">{row.label}</dt>
                      <dd className="text-right font-semibold text-slate-900">{row.value}</dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
