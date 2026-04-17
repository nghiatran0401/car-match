import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useCompare } from '../context/CompareContext';
import { vehicles } from '../data/vehicles';
import { rankAndSort } from '../lib/recommendationScore';
import { getVehicleImage, getVehicleImageSources } from '../lib/vehicleMedia';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import VehicleImage from '../components/VehicleImage';

export default function RecommendationsPage() {
  const { language, t } = useLanguage();
  const { profile, isHydrated, selections, aiRecommendationControls } = useProfile();
  const { toggleVehicle, isInCompare, count } = useCompare();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'best-match' | 'price-low' | 'price-high' | 'name-az'>('best-match');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback'>('all');
  const [powertrainFilter, setPowertrainFilter] = useState<'all' | 'ice' | 'hybrid' | 'phev' | 'ev'>('all');

  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const hasActiveFilters = query.trim().length > 0 || sortBy !== 'best-match' || vehicleTypeFilter !== 'all' || powertrainFilter !== 'all';

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
  const topPick = shortlist[0];

  useEffect(() => {
    if (isHydrated) trackEvent('shortlist_viewed');
  }, [isHydrated]);

  useEffect(() => {
    setShowUpdateIndicator(true);
    const timer = setTimeout(() => setShowUpdateIndicator(false), 3000);
    return () => clearTimeout(timer);
  }, [profile, selections]);

  useEffect(() => {
    if (!aiRecommendationControls || aiRecommendationControls.source !== 'ai-copilot') return;
    if (aiRecommendationControls.query !== undefined) setQuery(aiRecommendationControls.query);
    if (aiRecommendationControls.sortBy !== undefined) setSortBy(aiRecommendationControls.sortBy);
    if (aiRecommendationControls.vehicleTypeFilter !== undefined) setVehicleTypeFilter(aiRecommendationControls.vehicleTypeFilter);
    if (aiRecommendationControls.powertrainFilter !== undefined) setPowertrainFilter(aiRecommendationControls.powertrainFilter);
    setShowUpdateIndicator(true);
    const timer = setTimeout(() => setShowUpdateIndicator(false), 3000);
    return () => clearTimeout(timer);
  }, [aiRecommendationControls]);

  if (!isHydrated) {
    return (
      <div className="surface p-6 text-sm text-slate-600">
        {t({ vi: 'Đang chuẩn bị danh sách đề xuất...', en: 'Preparing recommendations...' })}
      </div>
    );
  }

  return (
    <div>
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
            <p className="mt-1 text-sm text-slate-500">
              {t({
                vi: 'Danh sách được cá nhân hóa theo hồ sơ, mục tiêu sử dụng, và mức ngân sách của bạn.',
                en: 'This list is personalized to your profile, use case, and budget range.',
              })}
            </p>
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

        {topPick ? (
          <section className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              {t({ vi: 'Lựa chọn nổi bật', en: 'Top recommendation' })}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-bold text-slate-900">{topPick.vehicle.name}</p>
                <p className="text-sm text-slate-600">
                  {t({ vi: 'Độ phù hợp', en: 'Match confidence' })}: {topPick.score}% · {topPick.vehicle.priceBand}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/vehicle/${topPick.vehicle.modelSlug}`} className="btn-primary btn-sm">
                  {t({ vi: 'Xem chi tiết ngay', en: 'View details now' })}
                </Link>
                <Link to={`/quote?model=${topPick.vehicle.modelSlug}`} className="btn-secondary btn-sm">
                  {t({ vi: 'Nhận báo giá nhanh', en: 'Get instant quote' })}
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
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
          <div className="flex items-end">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setQuery('');
                setSortBy('best-match');
                setVehicleTypeFilter('all');
                setPowertrainFilter('all');
              }}
              className="btn-secondary btn-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t({ vi: 'Đặt lại bộ lọc', en: 'Reset filters' })}
            </button>
          </div>
        </div>

        {shortlist.length === 0 ? (
          <div className="surface-muted p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">
              {t({ vi: 'Không tìm thấy lựa chọn phù hợp', en: 'No matches found for this setup' })}
            </p>
            <p className="mt-1">
              {t({
                vi: 'Hãy nới điều kiện tìm kiếm hoặc đặt lại bộ lọc để quay lại toàn bộ danh sách đề xuất.',
                en: 'Try broader criteria or reset filters to return to your full recommendation list.',
              })}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                <p className="mt-2 text-xs text-slate-500">
                  {t({
                    vi: 'Giá và ưu đãi thực tế có thể thay đổi theo khu vực và thời điểm.',
                    en: 'Final pricing and incentives may vary by location and timing.',
                  })}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to={`/vehicle/${vehicle.modelSlug}`}
                    onClick={() => trackEvent('recommendation_clicked', { vehicleModelSlug: vehicle.modelSlug })}
                    className="btn-primary btn-action"
                  >
                    {t({ vi: 'Chi tiết', en: 'Details' })}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleVehicle(vehicle.id)}
                    className={clsx(
                      'btn-secondary btn-action',
                      inCompare && 'btn-compare-active',
                    )}
                  >
                    {inCompare ? t({ vi: 'Đã chọn', en: 'Selected' }) : t({ vi: 'So sánh', en: 'Compare' })}
                  </button>
                  <Link
                    to={`/quote?model=${vehicle.modelSlug}`}
                    className="btn-secondary btn-action col-span-2 border-slate-900 text-slate-900"
                  >
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
          <Link to="/compare" className="btn-primary btn-md flex w-full items-center justify-center shadow-lg">
            {t({ vi: 'Mở so sánh', en: 'Open compare' })} ({count})
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function clsx(...args: Array<string | false | undefined>) {
  return args.filter(Boolean).join(' ');
}
