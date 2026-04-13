export default function QuotePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4efe7_0%,#ebf0f4_48%,#d6dee6_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-brandSecondary-900">Request a Quote</h1>
        <p className="mt-4 text-lg text-brandSecondary-600">
          Get personalized pricing from authorized dealers in your area.
        </p>
        
        {/* Quote Form Placeholder */}
        <div className="mt-8 rounded-2xl border border-brandSecondary-100 bg-white/60 p-8 backdrop-blur-sm">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-brandSecondary-700">
                Select Vehicle
              </label>
              <select className="mt-2 w-full rounded-xl border border-brandSecondary-200 bg-white px-4 py-3 text-brandSecondary-900 focus:border-brandHighlight-500 focus:outline-none focus:ring-2 focus:ring-brandHighlight-200">
                <option>Choose a model...</option>
                <option>Vroom EX5</option>
                <option>Vroom Monjaro</option>
                <option>Lynk & Co 09</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brandSecondary-700">
                Full Name
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-brandSecondary-200 px-4 py-3 text-brandSecondary-900 focus:border-brandHighlight-500 focus:outline-none focus:ring-2 focus:ring-brandHighlight-200"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brandSecondary-700">
                Email
              </label>
              <input
                type="email"
                className="mt-2 w-full rounded-xl border border-brandSecondary-200 px-4 py-3 text-brandSecondary-900 focus:border-brandHighlight-500 focus:outline-none focus:ring-2 focus:ring-brandHighlight-200"
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brandSecondary-700">
                Phone
              </label>
              <input
                type="tel"
                className="mt-2 w-full rounded-xl border border-brandSecondary-200 px-4 py-3 text-brandSecondary-900 focus:border-brandHighlight-500 focus:outline-none focus:ring-2 focus:ring-brandHighlight-200"
                placeholder="+84 123 456 789"
              />
            </div>
            
            <button
              type="submit"
              className="w-full rounded-full bg-brandHighlight-500 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-brandHighlight-600 hover:shadow-lg"
            >
              Request Quote
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
