import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { getComparisonCriteriaFull, vehicles } from '../data/vehicles';
import { getVehicleImage, getVehicleImageSources } from '../lib/vehicleMedia';
import { useLanguage } from '../context/LanguageContext';
import { localizeCompareValue, localizeVehicle } from '../lib/localizedVehicle';
import VehicleImage from '../components/VehicleImage';

type RowDef = { key: string; label: string; section: string; get: (vehicleId: string) => string };

export default function ComparePage() {
  const { language, t } = useLanguage();
  const { vehicleIds, removeVehicle, clearCompare } = useCompare();

  const compared = useMemo(
    () =>
      vehicleIds
        .map(id => vehicles.find(v => v.id === id))
        .filter(Boolean)
        .map(v => localizeVehicle(v as (typeof vehicles)[number], language)),
    [vehicleIds, language],
  );

  const rows: RowDef[] = useMemo(
    () => [
      {
        key: 'name',
        label: t({ vi: 'Mẫu xe', en: 'Model' }),
        section: t({ vi: 'Tổng quan', en: 'Overview' }),
        get: id => compared.find(v => v.id === id)?.name ?? '—',
      },
      {
        key: 'trim',
        label: t({ vi: 'Phiên bản', en: 'Trim' }),
        section: t({ vi: 'Tổng quan', en: 'Overview' }),
        get: id => compared.find(v => v.id === id)?.trim ?? '—',
      },
      {
        key: 'priceBand',
        label: t({ vi: 'Khoảng giá', en: 'Price band' }),
        section: t({ vi: 'Giá', en: 'Price' }),
        get: id => compared.find(v => v.id === id)?.priceBand ?? '—',
      },
      {
        key: 'powertrain',
        label: t({ vi: 'Hệ truyền động', en: 'Powertrain' }),
        section: t({ vi: 'Vận hành', en: 'Performance' }),
        get: id => compared.find(v => v.id === id)?.powertrain ?? '—',
      },
      {
        key: 'size',
        label: t({ vi: 'Kích thước', en: 'Size class' }),
        section: t({ vi: 'Kích thước', en: 'Dimensions' }),
        get: id => compared.find(v => v.id === id)?.size ?? '—',
      },
      ...getComparisonCriteriaFull(language).map(c => ({
        key: c.key,
        label: c.label,
        section:
          c.key === 'budgetFit'
            ? t({ vi: 'Giá', en: 'Price' })
            : c.key === 'range'
              ? t({ vi: 'Vận hành', en: 'Performance' })
              : c.key === 'cityDriving' || c.key === 'highwayComfort'
                ? t({ vi: 'Độ êm & tiện nghi', en: 'Comfort' })
                : c.key === 'cabinFlexibility'
                  ? t({ vi: 'Kích thước', en: 'Dimensions' })
                  : c.key === 'charging'
                    ? t({ vi: 'Sở hữu', en: 'Ownership' })
                    : t({ vi: 'Sở hữu', en: 'Ownership' }),
        get: (id: string) => {
          const v = compared.find(x => x.id === id);
          const value = v?.compare[c.key as keyof typeof v.compare] ?? '—';
          return localizeCompareValue(value, language);
        },
      })),
    ],
    [language, t, compared],
  );

  return (
    <div className="space-y-5">
      <section className="surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">{t({ vi: 'So sánh', en: 'Compare' })}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t({ vi: 'So sánh trực diện để ra quyết định', en: 'Side-by-side decision view' })}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t({
                vi: 'Tập trung vào khác biệt chính về giá, chi phí sở hữu, độ êm ái và tính thực dụng.',
                en: 'Focus on key differences in pricing, ownership, comfort, and usability.',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/recommendations" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              {t({ vi: 'Về danh sách đề xuất', en: 'Back to shortlist' })}
            </Link>
            {compared.length > 0 ? (
              <button type="button" onClick={clearCompare} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                {t({ vi: 'Xóa tất cả', en: 'Clear all' })}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {compared.length < 2 ? (
        <section className="surface p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">{t({ vi: 'Hãy chọn ít nhất 2 mẫu xe để so sánh', en: 'Select at least two vehicles to compare' })}</p>
          <p className="mt-2 text-sm text-slate-600">
            {t({ vi: 'Dùng nút “Thêm so sánh” trong trang Đề xuất hoặc Chi tiết xe.', en: 'Use “Add compare” in Recommendations or Vehicle Detail.' })}
          </p>
          <Link to="/recommendations" className="mt-5 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            {t({ vi: 'Đi tới đề xuất', en: 'Go to recommendations' })}
          </Link>
        </section>
      ) : (
        <section className="surface overflow-x-auto p-0">
          <table className="min-w-[780px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky left-0 z-10 min-w-[160px] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t({ vi: 'Thuộc tính', en: 'Attribute' })}
                </th>
                {compared.map(v => (
                  <th key={v.id} className="min-w-[220px] border-l border-slate-100 px-3 py-3 align-bottom">
                    <VehicleImage
                      src={getVehicleImage(v.modelSlug)}
                      fallbackSources={getVehicleImageSources(v.modelSlug).slice(1)}
                      alt={v.name}
                      className="aspect-[16/10] w-full rounded-xl object-cover"
                    />
                    <p className="mt-2 text-sm font-bold text-slate-900">{v.name}</p>
                    <button type="button" onClick={() => removeVehicle(v.id)} className="mt-1 text-xs font-semibold text-red-600">
                      {t({ vi: 'Bỏ', en: 'Remove' })}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const values = compared.map(v => row.get(v.id));
                const isDiff = new Set(values.map(v => v.toLowerCase())).size > 1;
                const previous = rows[rows.findIndex(r => r.key === row.key) - 1];
                const shouldShowSection = !previous || previous.section !== row.section;
                return (
                  <Fragment key={row.key}>
                    {shouldShowSection ? (
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {row.section}
                        </th>
                        {compared.map(v => (
                          <td key={`${row.section}-${v.id}`} className="border-l border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {v.name}
                          </td>
                        ))}
                      </tr>
                    ) : null}
                    <tr className="border-b border-slate-100">
                      <th className="sticky left-0 z-10 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</th>
                      {values.map((val, i) => (
                        <td key={`${row.key}-${i}`} className={isDiff ? 'border-l border-slate-100 bg-amber-50 px-3 py-3 text-slate-800' : 'border-l border-slate-100 px-3 py-3 text-slate-800'}>{val}</td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
