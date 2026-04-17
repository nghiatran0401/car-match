import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Car, LayoutGrid, SlidersHorizontal, Receipt, Sparkles } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { useLanguage } from '../context/LanguageContext';
import GlobalChatWidget from './GlobalChatWidget';

const linkBase =
  'inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium transition';

function navClass(active: boolean) {
  return clsx(
    linkBase,
    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );
}

function mobileClass(active: boolean) {
  return clsx(
    'flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 px-1.5 text-[10px] font-semibold',
    active ? 'text-amber-600' : 'text-slate-500',
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { count } = useCompare();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f6f7f9] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
      >
        {t({ vi: 'Bỏ qua đến nội dung', en: 'Skip to content' })}
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0">
            <p className="kicker truncate">CarMatch</p>
            <p className="truncate text-sm font-bold sm:text-base">Find Your Best-Fit Car, Faster</p>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <NavLink to="/profile" className={({ isActive }) => navClass(isActive)}>
              {t({ vi: 'Hồ sơ', en: 'Profile' })}
            </NavLink>
            <NavLink to="/cars" className={({ isActive }) => navClass(isActive)}>
              {t({ vi: 'Tất cả xe', en: 'All cars' })}
            </NavLink>
            <NavLink to="/compare" className={({ isActive }) => navClass(isActive)}>
              {t({ vi: 'So sánh', en: 'Compare' })} {count > 0 ? <span className="ml-1 text-xs">({count})</span> : null}
            </NavLink>
            <NavLink to="/showrooms" className={({ isActive }) => navClass(isActive)}>
              {t({ vi: 'Showroom', en: 'Showrooms' })}
            </NavLink>
            <NavLink to="/quote" className={({ isActive }) => navClass(isActive)}>
              {t({ vi: 'Báo giá', en: 'Quote' })}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            {count > 0 ? (
              <Link
                to="/compare"
                className="btn-secondary btn-sm hidden items-center gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 lg:inline-flex"
              >
                <Sparkles className="icon-sm" />
                {t({ vi: 'Đang so sánh', en: 'Comparing' })} ({count})
              </Link>
            ) : null}
            <button
              type="button"
              onClick={toggleLanguage}
              className="btn-secondary btn-sm"
              aria-label={t({ vi: 'Đổi ngôn ngữ', en: 'Toggle language' })}
            >
              {language === 'vi' ? 'VI' : 'EN'}
            </button>
            <Link
              to="/recommendations"
              className="btn-primary btn-md hidden sm:inline-flex"
            >
              {t({ vi: 'Xem đề xuất', en: 'View matches' })}
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={clsx(
          'mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6',
          'max-w-[1200px]',
          location.pathname === '/'
            ? 'pb-[calc(7.2rem+env(safe-area-inset-bottom))] md:pb-6'
            : 'pb-[calc(6.4rem+env(safe-area-inset-bottom))] md:pb-6',
        )}
      >
        {location.pathname !== '/' ? (
          <section className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {t({
                  vi: 'Hành trình mua xe có hướng dẫn, minh bạch và cá nhân hóa',
                  en: 'Guided, transparent, and personalized buying journey',
                })}
              </p>
              <p className="text-xs text-slate-500">
                {t({
                  vi: 'Hồ sơ → Đề xuất → So sánh → Báo giá. Mọi bước đều có AI đồng hành.',
                  en: 'Profile → Matches → Compare → Quote. AI supports every step.',
                })}
              </p>
            </div>
            <Link to="/profile" className="btn-secondary btn-sm justify-self-start sm:justify-self-end">
              {t({ vi: 'Cập nhật hồ sơ', en: 'Refine profile' })}
            </Link>
          </section>
        ) : null}
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-5">
          <section className="min-w-0">{children}</section>
          <aside className="hidden lg:block">
            <div className="sticky top-[84px]">
              <GlobalChatWidget />
            </div>
          </aside>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg">
          <NavLink to="/profile" className={({ isActive }) => mobileClass(isActive)}>
            <SlidersHorizontal className="icon-md" />
            <span>{t({ vi: 'Hồ sơ', en: 'Profile' })}</span>
          </NavLink>
          <NavLink to="/recommendations" className={({ isActive }) => mobileClass(isActive)}>
            <LayoutGrid className="icon-md" />
            <span>{t({ vi: 'Đề xuất', en: 'Matches' })}</span>
          </NavLink>
          <NavLink to="/cars" className={({ isActive }) => mobileClass(isActive)}>
            <Car className="icon-md" />
            <span>{t({ vi: 'Tất cả xe', en: 'All cars' })}</span>
          </NavLink>
          <NavLink to="/quote" className={({ isActive }) => mobileClass(isActive)}>
            <Receipt className="icon-md" />
            <span>{t({ vi: 'Báo giá', en: 'Quote' })}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
