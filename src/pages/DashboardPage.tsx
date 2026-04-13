export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4efe7_0%,#ebf0f4_48%,#d6dee6_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-brandSecondary-900">Dashboard</h1>
        <p className="mt-4 text-lg text-brandSecondary-600">
          Your saved vehicles, quotes, and preferences will appear here.
        </p>
        
        {/* Quick Stats */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Saved Vehicles', value: '0', icon: '🚗' },
            { label: 'Active Quotes', value: '0', icon: '📋' },
            { label: 'Test Drives', value: '0', icon: '🎯' },
            { label: 'Messages', value: '0', icon: '💬' }
          ].map((stat, idx) => (
            <div key={idx} className="rounded-2xl border border-brandSecondary-100 bg-white/60 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brandSecondary-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-brandSecondary-900">{stat.value}</p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
