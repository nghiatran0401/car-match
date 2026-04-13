import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4efe7_0%,#ebf0f4_48%,#d6dee6_100%)]">
      {/* Header */}
      <header className="border-b border-brandSecondary/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brandHighlight-500 text-white shadow-lg">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-brandSecondary-900">Vroom</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/recommendations" className="text-sm font-medium text-brandSecondary-700 hover:text-brandHighlight-500">
              Showroom
            </Link>
            <Link to="/concierge" className="text-sm font-medium text-brandSecondary-700 hover:text-brandHighlight-500">
              Concierge
            </Link>
            <Link to="/dashboard" className="text-sm font-medium text-brandSecondary-700 hover:text-brandHighlight-500">
              Dashboard
            </Link>
          </nav>
          <Link
            to="/recommendations"
            className="rounded-full bg-brandHighlight-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brandHighlight-600 hover:shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brandSecondary-500">
              Smart Dealership Experience
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-brandSecondary-900 sm:text-5xl lg:text-6xl">
              Find Your Perfect{' '}
              <span className="bg-gradient-to-r from-brandHighlight-400 to-brandHighlight-600 bg-clip-text text-transparent">
                Drive
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-brandSecondary-600">
              AI-powered vehicle recommendations tailored to your lifestyle, budget, and driving needs. 
              Compare, configure, and connect with dealers seamlessly.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/recommendations"
                className="inline-flex items-center justify-center rounded-full bg-brandHighlight-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-brandHighlight-600 hover:shadow-xl"
              >
                Start Recommendation
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/concierge"
                className="inline-flex items-center justify-center rounded-full border-2 border-brandSecondary-200 bg-white px-8 py-3.5 text-base font-semibold text-brandSecondary-700 transition-all hover:border-brandHighlight-300 hover:bg-brandHighlight-50"
              >
                Talk to AI Concierge
              </Link>
            </div>
            
            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-brandSecondary-100 pt-8">
              <div>
                <p className="text-3xl font-bold text-brandSecondary-900">9</p>
                <p className="mt-1 text-sm text-brandSecondary-500">Premium Models</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brandSecondary-900">4</p>
                <p className="mt-1 text-sm text-brandSecondary-500">Powertrain Options</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brandSecondary-900">24/7</p>
                <p className="mt-1 text-sm text-brandSecondary-500">AI Support</p>
              </div>
            </div>
          </div>
          
          {/* Hero Image Placeholder */}
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-brandHighlight-100 to-brandSecondary-100 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=600&fit=crop"
                alt="Luxury car showcase"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-brandHighlight-200/50 blur-3xl"></div>
            <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-brandSecondary-200/30 blur-3xl"></div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brandSecondary-500">
              Why Choose Vroom
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-brandSecondary-900 sm:text-4xl">
              Everything You Need in One Place
            </h2>
          </div>
          
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
                title: 'Smart Recommendations',
                description: 'AI-driven matching based on your lifestyle, budget, and preferences.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Side-by-Side Comparison',
                description: 'Compare specs, pricing, and features across multiple models instantly.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: 'AI Concierge Chat',
                description: 'Get instant answers about vehicles, financing, and charging options.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Finance Calculator',
                description: 'Estimate monthly payments with customizable terms and down payments.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Instant Quotes',
                description: 'Request personalized quotes from authorized dealers in your area.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Trusted Dealers',
                description: 'Connect with verified dealerships for test drives and purchases.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group rounded-2xl border border-brandSecondary-100 bg-white/60 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-brandHighlight-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brandHighlight-100 text-brandHighlight-600 transition-colors group-hover:bg-brandHighlight-500 group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-brandSecondary-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brandSecondary-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-brandSecondary-100 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brandHighlight-500 text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-brandSecondary-700">Vroom Drive Studio</span>
            </div>
            <p className="text-sm text-brandSecondary-500">
              © 2024 Vroom. All rights reserved. Built for the future of car buying.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
