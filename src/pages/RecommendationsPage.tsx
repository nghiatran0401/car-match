import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useCompare } from '../context/CompareContext';
import { getRecommendationStages, vehicles } from '../data/vehicles';
import { rankAndSort } from '../lib/recommendationScore';
import { getVehicleImage, getVehicleImageSources } from '../lib/vehicleMedia';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import VehicleImage from '../components/VehicleImage';

export default function RecommendationsPage() {
  const { language, t } = useLanguage();
  const { profile, isHydrated, selections, setSelections, activeFilters, setActiveFilters } = useProfile();
  const { toggleVehicle, isInCompare, count } = useCompare();
  const [currentStageKey] = useState('focus');
  const [activeFocusId, setActiveFocusId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'best-match' | 'price-low' | 'price-high' | 'name-az'>('best-match');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback'>('all');
  const [powertrainFilter, setPowertrainFilter] = useState<'all' | 'ice' | 'hybrid' | 'phev' | 'ev'>('all');

  const recommendationStages = useMemo(() => getRecommendationStages(language), [language]);
  const currentStage = recommendationStages.find(s => s.key === currentStageKey) ?? recommendationStages[0];

  const baseFiltered = useMemo(() => {
    let list = vehicles;
    if (activeFilters?.vehicleTypes?.length) {
      list = list.filter(v => activeFilters.vehicleTypes?.includes(v.vehicleType));
    }
    if (activeFilters?.powertrains?.length) {
      list = list.filter(v => activeFilters.powertrains?.includes(v.powertrain));
    }
    return list;
  }, [activeFilters]);

  const shortlist = useMemo(() => {
    let ranked = rankAndSort(baseFiltered, profile, selections, language).map(item => ({
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
  }, [baseFiltered, profile, selections, powertrainFilter, query, sortBy, vehicleTypeFilter, language]);

  useEffect(() => {
    if (isHydrated) trackEvent('shortlist_viewed');
  }, [isHydrated]);

  if (!isHydrated) {
    return (
      <div className="surface p-6 text-sm text-slate-600">
        {t({ vi: 'Đang chuẩn bị danh sách đề xuất...', en: 'Preparing recommendations...' })}
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="surface h-fit border-none bg-[#f5f7fa] p-4 shadow-none sm:p-5 xl:sticky xl:top-24">
        <p className="kicker">{t({ vi: 'Tập trung đề xuất', en: 'Shortlist focus' })}</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          {t({ vi: 'Giữ danh sách đề xuất gọn và đúng nhu cầu', en: 'Keep your shortlist focused' })}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{currentStage.prompt}</p>

        <div className="mt-4 space-y-2">
          {currentStage.options.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (activeFocusId === option.id) {
                  setActiveFocusId(null);
                  setSelections([]);
                  setActiveFilters(null);
                  return;
                }
                const picks = vehicles.filter(v => option.nextRecommendationIds.includes(v.id));
                setSelections(prev => [...prev, { stageTitle: currentStage.title, label: option.label }]);
                setActiveFilters({
                  vehicleTypes: [...new Set(picks.map(v => v.vehicleType))],
                  powertrains: [...new Set(picks.map(v => v.powertrain))],
                });
                setActiveFocusId(option.id);
              }}
              className={clsx(
                'w-full rounded-xl border px-3 py-3 text-left transition shadow-sm',
                activeFocusId === option.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:shadow',
              )}
            >
              <p className={clsx('text-sm font-semibold', activeFocusId === option.id ? 'text-white' : 'text-slate-900')}>
                {option.label}
              </p>
              <p className={clsx('mt-1 text-xs', activeFocusId === option.id ? 'text-slate-200' : 'text-slate-500')}>
                {option.hint}
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setSelections([]);
            setActiveFilters(null);
            setActiveFocusId(null);
            setQuery('');
            setSortBy('best-match');
            setVehicleTypeFilter('all');
            setPowertrainFilter('all');
          }}
          className="btn-secondary mt-4 w-full"
        >
          {t({ vi: 'Đặt lại bộ lọc', en: 'Reset filters' })}
        </button>
      </aside>

      <main className="surface border-none bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="kicker">{t({ vi: 'Phòng đề xuất', en: 'Recommendation studio' })}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {t({ vi: 'Các lựa chọn phù hợp nhất với hồ sơ của bạn', en: 'Top matches for your profile' })}
            </h1>
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

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
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
        </div>

        {shortlist.length === 0 ? (
          <div className="surface-muted p-5 text-sm text-slate-600">
            {t({
              vi: 'Không có mẫu xe phù hợp với tổ hợp tìm kiếm/sắp xếp/lọc hiện tại. Hãy đặt lại bộ lọc để xem lại toàn bộ.',
              en: 'No vehicles match your current search/sort/filter combination. Reset filters to reopen the full shortlist.',
            })}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortlist.map(item => {
            const { vehicle, score, reasons, budgetPenalty } = item;
            const inCompare = isInCompare(vehicle.id);
            return (
              <article
                key={vehicle.id}
                className={clsx(
                  'defer-render card-hover rounded-2xl border bg-[#fbfcfe] p-3 shadow-sm',
                  budgetPenalty ? 'border-amber-300' : 'border-slate-200',
                )}
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
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Link
                    to={`/vehicle/${vehicle.modelSlug}`}
                    onClick={() => trackEvent('recommendation_clicked', { vehicleModelSlug: vehicle.modelSlug })}
                    className="btn-primary min-h-[40px] px-3 py-2 text-center text-xs"
                  >
                    {t({ vi: 'Chi tiết', en: 'Details' })}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleVehicle(vehicle.id)}
                    className={clsx(
                      'min-h-[40px] rounded-full border px-3 py-2 text-xs font-semibold',
                      inCompare ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700',
                    )}
                  >
                    {inCompare ? t({ vi: 'Đang so sánh', en: 'In compare' }) : t({ vi: 'So sánh', en: 'Compare' })}
                  </button>
                  <Link to={`/quote?model=${vehicle.modelSlug}`} className="btn-secondary col-span-2 min-h-[40px] border-slate-900 px-3 py-2 text-center text-xs text-slate-900 sm:col-span-1">
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
          <Link to="/compare" className="btn-primary flex min-h-[44px] w-full items-center justify-center shadow-lg">
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
