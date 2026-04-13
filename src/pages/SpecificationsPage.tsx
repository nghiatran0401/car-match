import { useSearchParams, Link } from 'react-router-dom';
import { vehicles } from '../data/vehicles';

export default function SpecificationsPage() {
  const [searchParams] = useSearchParams();
  const modelSlug = searchParams.get('model');
  
  const vehicle = vehicles.find(v => v.modelSlug === modelSlug) || vehicles[0];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4efe7_0%,#ebf0f4_48%,#d6dee6_100%)]">
      {/* Header */}
      <header className="border-b border-brandSecondary-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/recommendations"
            className="inline-flex items-center gap-2 text-sm font-medium text-brandSecondary-600 hover:text-brandHighlight-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Showroom
          </Link>
          <Link
            to="/quote"
            className="rounded-full bg-brandHighlight-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brandHighlight-600"
          >
            Request Quote
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Section */}
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl">
            <img
              src={`https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&h=800&fit=crop`}
              alt={vehicle.name}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brandSecondary-400">
                {vehicle.bodyStyle}
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-brandSecondary-900">
                {vehicle.name}
              </h1>
              <p className="mt-2 text-lg text-brandSecondary-600">{vehicle.trim}</p>
              <p className="mt-4 text-2xl font-bold text-brandHighlight-600">{vehicle.priceBand}</p>
            </div>

            {/* Strengths */}
            <div className="rounded-2xl border border-brandSecondary-100 bg-white/60 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-brandSecondary-900">Key Strengths</h2>
              <ul className="mt-4 space-y-3">
                {vehicle.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-brandSecondary-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Comparison Specs */}
            <div className="rounded-2xl border border-brandSecondary-100 bg-white/60 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-brandSecondary-900">Specifications</h2>
              <dl className="mt-4 space-y-4">
                {Object.entries(vehicle.compare).map(([key, value]) => (
                  <div key={key} className="border-b border-brandSecondary-50 pb-4 last:border-b-0 last:pb-0">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-brandSecondary-400">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-brandSecondary-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Thesis */}
            <div className="rounded-2xl bg-brandSecondary-800 p-6 text-white">
              <h2 className="text-lg font-semibold">Why This Vehicle</h2>
              <p className="mt-3 leading-relaxed text-brandSecondary-100">{vehicle.thesis}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                to="/quote"
                className="flex-1 rounded-full bg-brandHighlight-500 py-4 text-center text-base font-semibold text-white shadow-md transition-all hover:bg-brandHighlight-600 hover:shadow-lg"
              >
                Get a Quote
              </Link>
              <button className="flex-1 rounded-full border-2 border-brandSecondary-200 bg-white py-4 text-center text-base font-semibold text-brandSecondary-700 transition-all hover:border-brandHighlight-300 hover:bg-brandHighlight-50">
                Schedule Test Drive
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
