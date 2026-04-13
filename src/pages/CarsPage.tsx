import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehicles } from '../data/vehicles';
import { getVehicleImage, getVehicleImageSources } from '../lib/vehicleMedia';
import VehicleImage from '../components/VehicleImage';
import { useLanguage } from '../context/LanguageContext';
import { localizeVehicle } from '../lib/localizedVehicle';
import { useCompare } from '../context/CompareContext';

type SortBy = 'name-az' | 'price-low' | 'price-high';
type VehicleTypeFilter = 'all' | 'sedan' | 'suv' | 'crossover' | 'hatchback';
type PowertrainFilter = 'all' | 'ice' | 'hybrid' | 'phev' | 'ev';

export default function CarsPage() {
  const { language, t } = useLanguage();
  const { isInCompare, toggleVehicle, count } = useCompare();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name-az');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>('all');
  const [powertrainFilter, setPowertrainFilter] = useState<PowertrainFilter>('all');

  const allCars = useMemo(
    () =>
      vehicles.map(vehicle => ({
        ...vehicle,
        localized: localizeVehicle(vehicle, language),
      })),
    [language],
  );

  const filteredCars = useMemo(() => {
    let list = [...allCars];
    if (vehicleTypeFilter !== 'all') {
      list = list.filter(item => item.localized.vehicleType === vehicleTypeFilter);
    }
    if (powertrainFilter !== 'all') {
      list = list.filter(item => item.localized.powertrain === powertrainFilter);
    }
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      list = list.filter(item => {
        const vehicle = item.localized;
        return (
          vehicle.name.toLowerCase().includes(normalizedQuery) ||
          vehicle.trim.toLowerCase().includes(normalizedQuery) ||
          vehicle.bodyStyle.toLowerCase().includes(normalizedQuery) ||
          vehicle.thesis.toLowerCase().includes(normalizedQuery)
        );
      });
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.localized.priceEntryMilVnd - b.localized.priceEntryMilVnd;
        case 'price-high':
          return b.localized.priceEntryMilVnd - a.localized.priceEntryMilVnd;
        case 'name-az':
        default:
          return a.localized.name.localeCompare(b.localized.name);
      }
    });
    return list;
  }, [allCars, powertrainFilter, query, sortBy, vehicleTypeFilter]);

  return (
    <div className="space-y-5">
      <section className="surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">{t({ vi: 'Danh mục xe', en: 'Vehicle catalog' })}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t({ vi: 'Xem toàn bộ mẫu xe đang có', en: 'Browse all available cars' })}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {t({
                vi: 'Tìm kiếm, lọc và sắp xếp để chọn xe phù hợp trước khi xem chi tiết hoặc báo giá.',
                en: 'Search, filter, and sort to shortlist cars before opening details or quote.',
              })}
            </p>
          </div>
          <div className="surface-muted px-3 py-2 text-sm font-semibold text-slate-700">
            {filteredCars.length} {t({ vi: 'mẫu xe', en: 'cars' })}
            {count > 0 ? ` · ${count} ${t({ vi: 'đang so sánh', en: 'in compare' })}` : ''}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Tìm kiếm', en: 'Search' })}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t({
                vi: 'Tìm theo mẫu xe, phiên bản, kiểu dáng...',
                en: 'Search model, trim, body style...',
              })}
              className="input-base min-h-[42px] normal-case"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Sắp xếp', en: 'Sort by' })}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="input-base min-h-[42px] normal-case"
            >
              <option value="name-az">{t({ vi: 'Tên: A đến Z', en: 'Name: A to Z' })}</option>
              <option value="price-low">{t({ vi: 'Giá: thấp đến cao', en: 'Price: low to high' })}</option>
              <option value="price-high">{t({ vi: 'Giá: cao đến thấp', en: 'Price: high to low' })}</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Dòng xe', en: 'Vehicle type' })}
            <select
              value={vehicleTypeFilter}
              onChange={e => setVehicleTypeFilter(e.target.value as VehicleTypeFilter)}
              className="input-base min-h-[42px] normal-case"
            >
              <option value="all">{t({ vi: 'Tất cả', en: 'All types' })}</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="crossover">Crossover</option>
              <option value="hatchback">Hatchback</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t({ vi: 'Hệ truyền động', en: 'Powertrain' })}
            <select
              value={powertrainFilter}
              onChange={e => setPowertrainFilter(e.target.value as PowertrainFilter)}
              className="input-base min-h-[42px] normal-case"
            >
              <option value="all">{t({ vi: 'Tất cả', en: 'All powertrains' })}</option>
              <option value="ice">ICE</option>
              <option value="hybrid">Hybrid</option>
              <option value="phev">PHEV</option>
              <option value="ev">EV</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredCars.map(item => {
          const vehicle = item.localized;
          const inCompare = isInCompare(vehicle.id);
          return (
            <article key={vehicle.id} className="card-hover rounded-2xl border border-slate-200 bg-white p-3">
              <VehicleImage
                src={getVehicleImage(vehicle.modelSlug)}
                fallbackSources={getVehicleImageSources(vehicle.modelSlug).slice(1)}
                alt={vehicle.name}
                className="aspect-[1.35/1] w-full rounded-xl object-cover"
              />
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-900">{vehicle.name}</p>
                <p className="text-xs text-slate-500">{vehicle.trim}</p>
              </div>
              <p className="mt-2 text-xs text-slate-600">{vehicle.priceBand}</p>
              <p className="mt-2 text-sm text-slate-700">{vehicle.thesis}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Link to={`/vehicle/${vehicle.modelSlug}`} className="btn-primary px-3 py-2 text-center text-xs">
                  {t({ vi: 'Chi tiết', en: 'Details' })}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleVehicle(vehicle.id)}
                  className={cx(
                    'rounded-full border px-3 py-2 text-xs font-semibold',
                    inCompare ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700',
                  )}
                >
                  {inCompare ? t({ vi: 'Đang so sánh', en: 'In compare' }) : t({ vi: 'So sánh', en: 'Compare' })}
                </button>
                <Link
                  to={`/quote?model=${vehicle.modelSlug}`}
                  className="btn-secondary border-slate-900 px-3 py-2 text-center text-xs text-slate-900"
                >
                  {t({ vi: 'Báo giá', en: 'Quote' })}
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function cx(...items: Array<string | false>) {
  return items.filter(Boolean).join(' ');
}

