import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vehicles } from '../data/vehicles';
import { saveLead } from '../lib/leads';
import { trackEvent } from '../lib/analytics';
import { useProfile } from '../context/ProfileContext';
import { variantPriceMilVnd, variantsForVehicle } from '../lib/vehicleVariants';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';

function monthlyPaymentVnd(priceMil: number, downPct: number, term: number, apr: number): number {
  const principal = priceMil * 1_000_000 * (1 - downPct / 100);
  const r = apr / 100 / 12;
  if (r <= 0) return Math.round(principal / term);
  const pow = (1 + r) ** term;
  return Math.round((principal * r * pow) / (pow - 1));
}

function vnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} VND`;
}

export default function QuotePage() {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useProfile();
  const [modelSlug, setModelSlug] = useState(searchParams.get('model') ?? '');
  const [variantKey, setVariantKey] = useState(searchParams.get('variant') ?? 'core');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [downPct, setDownPct] = useState(15);
  const [term, setTerm] = useState(60);
  const [apr, setApr] = useState(9.5);
  const [insurancePlan, setInsurancePlan] = useState<'none' | 'basic' | 'premium'>('none');
  const [policyApplied, setPolicyApplied] = useState(false);
  const [documentChecklistAccepted, setDocumentChecklistAccepted] = useState(false);
  const [reservationIntent, setReservationIntent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const vehicle = useMemo(
    () => {
      const hit = vehicles.find(v => v.modelSlug === modelSlug);
      return hit ? localizeVehicle(hit, language) : null;
    },
    [modelSlug, language],
  );
  const variants = useMemo(() => (vehicle ? variantsForVehicle(vehicle) : []), [vehicle]);
  const effectivePriceMil = vehicle ? variantPriceMilVnd(vehicle, variantKey) : null;
  const monthly = effectivePriceMil ? monthlyPaymentVnd(effectivePriceMil, downPct, term, apr) : null;

  useEffect(() => {
    trackEvent('quote_started', { vehicleModelSlug: modelSlug || undefined });
  }, []);

  useEffect(() => {
    const q = searchParams.get('model');
    if (q) setModelSlug(q);
    const variant = searchParams.get('variant');
    if (variant) setVariantKey(variant);
  }, [searchParams]);

  useEffect(() => {
    if (!variants.length) return;
    if (!variants.some(v => v.key === variantKey)) {
      setVariantKey(variants[0].key);
    }
  }, [variantKey, variants]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!name.trim() || !email.trim() || !phone.trim()) return;

    saveLead({
      type: 'quote',
      vehicleModelSlug: vehicle.modelSlug,
      contact: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      notes:
        JSON.stringify({
          freeText: notes.trim() || undefined,
          selectedVariant: variantKey,
        }) || undefined,
      finance: {
        downPct,
        termMonths: term,
        rateApr: apr,
        monthlyEstimateVnd: monthly ?? 0,
      },
      profileSnapshot: profile,
      commercialContext: {
        insurancePlan,
        policyApplied,
        documentChecklistAccepted,
        reservationIntent,
      },
    });

    trackEvent('quote_submitted', { vehicleModelSlug: vehicle.modelSlug });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="surface mx-auto w-full max-w-3xl p-6 sm:p-8">
        <p className="kicker">{t({ vi: 'Đã gửi yêu cầu báo giá', en: 'Quote submitted' })}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t({ vi: 'Yêu cầu của bạn đã được lưu', en: 'Your request is saved' })}</h1>
        <p className="mt-2 text-sm text-slate-600">{t({ vi: 'Tư vấn viên có thể tiếp tục sang bước đặt lịch và bàn giao showroom.', en: 'A consultant can now continue with booking intent and showroom handoff.' })}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={vehicle ? `/booking?model=${vehicle.modelSlug}` : '/booking'} className="btn-primary">{t({ vi: 'Tiếp tục đặt lịch', en: 'Continue to booking' })}</Link>
          <Link to="/showrooms" className="btn-secondary">{t({ vi: 'Xem showroom', en: 'View showrooms' })}</Link>
        </div>
      </section>
    );
  }

  const vehiclePriceVnd = (effectivePriceMil ?? 0) * 1_000_000;
  const selectedVariant = variants.find(v => v.key === variantKey);
  const selectedVariantDeltaVnd = (selectedVariant?.priceDeltaMilVnd ?? 0) * 1_000_000;
  const registrationFee = vehiclePriceVnd * 0.1;
  const registrationPlateFee = 20_000_000;
  const inspectionFee = -340_000;
  const roadMaintenancePerYear = 1_560_000;
  const liabilityInsurance = 794_000;
  const documentationTransport = 2_500_000;
  const policyDiscount = policyApplied ? vehiclePriceVnd * 0.05 : 0;
  const insuranceAddOn =
    insurancePlan === 'none' ? 0 : insurancePlan === 'basic' ? 9_000_000 : 16_500_000;
  const showroomPackage = 0;
  const subtotalBeforeDiscount =
    vehiclePriceVnd +
    selectedVariantDeltaVnd +
    registrationFee +
    registrationPlateFee +
    inspectionFee +
    roadMaintenancePerYear +
    liabilityInsurance +
    documentationTransport +
    insuranceAddOn +
    showroomPackage;
  const currentEstimate = subtotalBeforeDiscount - policyDiscount;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={submit} className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="kicker">{t({ vi: 'Showroom', en: 'Showroom' })}</p>
            <h1 className="text-xl font-bold text-slate-900">
              {vehicle
                ? `${vehicle.name} - ${t({ vi: 'Báo giá', en: 'QUOTE' })}`
                : t({ vi: 'Báo giá xe', en: 'Vehicle Quote' })}
            </h1>
          </div>
          <button type="submit" disabled={!vehicle} className="btn-primary px-4 py-2 text-sm disabled:bg-slate-300">
            {t({ vi: 'Tiếp tục', en: 'Move Forward' })}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            {t({ vi: 'Mẫu xe', en: 'Vehicle' })}
            <select
              required
              value={modelSlug}
              onChange={e => {
                const v = e.target.value;
                setModelSlug(v);
                setSearchParams(v ? { model: v, variant: 'core' } : {});
              }}
              className="input-base min-h-[44px]"
            >
              <option value="">{t({ vi: 'Chọn mẫu xe…', en: 'Choose a model…' })}</option>
              {vehicles.map(v => {
                const vv = localizeVehicle(v, language);
                return (
                  <option key={v.id} value={v.modelSlug}>
                    {vv.name}
                  </option>
                );
              })}
            </select>
          </label>
          {vehicle ? (
            <label className="text-sm font-semibold text-slate-700">
              {t({ vi: 'Phiên bản', en: 'Configuration' })}
              <select
                value={variantKey}
                onChange={e => {
                  const next = e.target.value;
                  setVariantKey(next);
                  setSearchParams({ model: vehicle.modelSlug, variant: next });
                }}
                className="input-base min-h-[44px]"
              >
                {variants.map(v => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <section className="mt-4 rounded-xl border border-slate-200 p-3">
          <h2 className="mb-2 text-sm font-bold text-slate-900">
            {t({ vi: 'Trang bị tiêu chuẩn', en: 'Standard Equipment' })}
          </h2>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t({ vi: 'Ngoại thất', en: 'Exterior' })}
              </p>
              <p>{t({ vi: 'Mâm 18 inch, đèn LED, cảm biến đỗ xe trước/sau', en: '18-inch wheels, LED lights, front/rear parking sensors' })}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t({ vi: 'Nội thất & Công nghệ', en: 'Cabin Tech' })}
              </p>
              <p>{t({ vi: 'Màn hình trung tâm 10.25 inch, Apple CarPlay/Android Auto, điều hòa tự động', en: '10.25-inch center display, Apple CarPlay/Android Auto, automatic climate control' })}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t({ vi: 'An toàn', en: 'Safety' })}
              </p>
              <p>{t({ vi: 'Phanh ABS/EBD, cân bằng điện tử, camera 360, bảo hành 5 năm', en: 'ABS/EBD brakes, stability control, 360 camera, 5-year warranty' })}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 p-3">
          <h2 className="mb-2 text-sm font-bold text-slate-900">
            {t({ vi: 'Xe & Hệ truyền động', en: 'Vehicle & Powertrain' })}
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">{t({ vi: 'Danh mục', en: 'Category' })}</th>
                <th className="px-2 py-2 text-left">{t({ vi: 'Mô tả', en: 'Description' })}</th>
                <th className="px-2 py-2 text-right">{t({ vi: 'Giá', en: 'Price' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Xe', en: 'Vehicle' })}</td>
                <td className="px-2 py-2">{vehicle?.name ?? '—'}</td>
                <td className="px-2 py-2 text-right">{vnd(vehiclePriceVnd)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 p-3">
          <h2 className="mb-2 text-sm font-bold text-slate-900">
            {t({ vi: 'Tùy chọn đã chọn', en: 'Selected Options' })}
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">{t({ vi: 'Danh mục', en: 'Category' })}</th>
                <th className="px-2 py-2 text-left">{t({ vi: 'Mô tả', en: 'Description' })}</th>
                <th className="px-2 py-2 text-right">{t({ vi: 'Giá', en: 'Price' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Cấu hình', en: 'Configuration' })}</td>
                <td className="px-2 py-2">{selectedVariant?.label ?? '-'}</td>
                <td className="px-2 py-2 text-right">{vnd(selectedVariantDeltaVnd)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 p-3">
          <h2 className="mb-2 text-sm font-bold text-slate-900">
            {t({ vi: 'Thuế, phí & chi phí bàn giao', en: 'Taxes, Fees & Delivery Extras' })}
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">{t({ vi: 'Danh mục', en: 'Category' })}</th>
                <th className="px-2 py-2 text-left">{t({ vi: 'Mô tả', en: 'Description' })}</th>
                <th className="px-2 py-2 text-right">{t({ vi: 'Giá', en: 'Price' })}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Lệ phí trước bạ', en: 'Registration fee' })}</td>
                <td className="px-2 py-2">{t({ vi: '10% giá trị xe', en: '10% of vehicle value' })}</td>
                <td className="px-2 py-2 text-right">{vnd(registrationFee)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Biển số', en: 'Plate fee' })}</td>
                <td className="px-2 py-2">{t({ vi: 'Hà Nội/TP.HCM', en: 'Hanoi/HCMC' })}</td>
                <td className="px-2 py-2 text-right">{vnd(registrationPlateFee)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Phí đăng kiểm', en: 'Inspection fee' })}</td>
                <td className="px-2 py-2">{t({ vi: 'Theo biểu phí hiện hành', en: 'Per current regulation' })}</td>
                <td className="px-2 py-2 text-right">{vnd(inspectionFee)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Phí đường bộ', en: 'Road maintenance' })}</td>
                <td className="px-2 py-2">{t({ vi: 'Dự kiến mỗi năm', en: 'Estimated per year' })}</td>
                <td className="px-2 py-2 text-right">{vnd(roadMaintenancePerYear)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Bảo hiểm TNDS', en: 'Liability insurance' })}</td>
                <td className="px-2 py-2">{t({ vi: 'Bắt buộc', en: 'Mandatory' })}</td>
                <td className="px-2 py-2 text-right">{vnd(liabilityInsurance)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2">{t({ vi: 'Phí hồ sơ & vận chuyển', en: 'Documentation & transport' })}</td>
                <td className="px-2 py-2">{t({ vi: 'Ước tính', en: 'Estimated' })}</td>
                <td className="px-2 py-2 text-right">{vnd(documentationTransport)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 p-3">
          <h2 className="mb-2 text-sm font-bold text-slate-900">
            {t({ vi: 'Liên hệ nhận báo giá', en: 'Contact for final quote' })}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              {t({ vi: 'Họ và tên', en: 'Full name' })}
              <input required value={name} onChange={e => setName(e.target.value)} className="input-base min-h-[42px]" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t({ vi: 'Số điện thoại', en: 'Phone' })}
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-base min-h-[42px]" />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Email
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base min-h-[42px]" />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              {t({ vi: 'Ghi chú', en: 'Notes' })}
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input-base py-2.5" />
            </label>
          </div>
        </section>
      </form>

      <aside className="surface h-fit p-4 sm:p-5 xl:sticky xl:top-24">
        <p className="text-sm text-slate-500">{t({ vi: 'Giá hiện tại / ước tính', en: 'Current estimate' })}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{vehicle?.name ?? t({ vi: 'Chưa chọn xe', en: 'No vehicle selected' })}</h2>
        <p className="text-sm text-slate-600">{vehicle?.trim ?? '-'}</p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Tổng ước tính hiện tại', en: 'Current estimate total' })}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{vnd(currentEstimate)}</p>
        </div>

        <div className="mt-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Trả trước %', en: 'Down %' })}
            <input
              type="number"
              min={0}
              max={90}
              value={downPct}
              onChange={e => setDownPct(Number(e.target.value) || 0)}
              className="input-base mt-1 min-h-[40px]"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Kỳ hạn', en: 'Term' })}
            <select value={term} onChange={e => setTerm(Number(e.target.value))} className="input-base mt-1 min-h-[40px]">
              {[36, 48, 60, 72].map(m => (
                <option key={m} value={m}>
                  {m} {t({ vi: 'tháng', en: 'months' })}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'APR %', en: 'APR %' })}
            <input
              type="number"
              step={0.1}
              value={apr}
              onChange={e => setApr(Number(e.target.value) || 0)}
              className="input-base mt-1 min-h-[40px]"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Bảo hiểm', en: 'Insurance' })}
            <select
              value={insurancePlan}
              onChange={e => setInsurancePlan(e.target.value as 'none' | 'basic' | 'premium')}
              className="input-base mt-1 min-h-[40px]"
            >
              <option value="none">{t({ vi: 'Không mua thêm', en: 'No add-on' })}</option>
              <option value="basic">{t({ vi: 'Gói cơ bản', en: 'Basic package' })}</option>
              <option value="premium">{t({ vi: 'Gói cao cấp', en: 'Premium package' })}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={policyApplied} onChange={e => setPolicyApplied(e.target.checked)} />
            {t({ vi: 'Áp dụng ưu đãi showroom (5%)', en: 'Apply showroom promo (5%)' })}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={documentChecklistAccepted}
              onChange={e => setDocumentChecklistAccepted(e.target.checked)}
            />
            {t({ vi: 'Đã sẵn sàng hồ sơ hợp đồng', en: 'Contract documents ready' })}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={reservationIntent} onChange={e => setReservationIntent(e.target.checked)} />
            {t({ vi: 'Muốn giữ chỗ xe sớm', en: 'Ready to reserve soon' })}
          </label>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-900">
          {t({ vi: 'Ước tính trả góp mỗi tháng', en: 'Estimated monthly payment' })}:{' '}
          <span className="font-bold">{vnd(monthly ?? 0)}</span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {t({
            vi: 'Đây là ước tính tham khảo tại thời điểm hiện tại. Giá cuối cùng phụ thuộc cấu hình, khuyến mãi, địa phương đăng ký và hồ sơ tín dụng.',
            en: 'This is an illustrative estimate. Final pricing depends on selected configuration, active campaigns, registration locality, and credit approval.',
          })}
        </p>
      </aside>
    </div>
  );
}
