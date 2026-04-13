import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import type { SelectionHistory, Vehicle } from '../types';
import { vehicles, recommendationStages, comparisonCriteriaShort } from '../data/vehicles';

// Helper to get vehicle image
function getVehicleImage(modelSlug: string): string {
  const images: Record<string, string> = {
    ex5: 'https://images.unsplash.com/photo-1619767886432-60864512d327?w=800&h=600&fit=crop',
    monjaro: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop',
    'lynk-co-09': 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=600&fit=crop',
    coolray: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=600&fit=crop',
    'lynk-co-06': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
    'lynk-co-01': 'https://images.unsplash.com/photo-1552519507-cf0d5a6e5d0d?w=800&h=600&fit=crop',
    'lynk-co-08': 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=600&fit=crop',
    ec40: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=600&fit=crop',
    'lynk-co-03': 'https://images.unsplash.com/photo-1555215695-3004980adade?w=800&h=600&fit=crop',
  };
  return images[modelSlug] || images.ex5;
}

// Generate match score
function calculateMatchScore(vehicle: Vehicle, profile: any, selections: SelectionHistory[]): number {
  let score = 76;
  const matchedTags = vehicle.matchTags.filter(tag => profile[tag]).length;
  score += matchedTags * 5;
  score += selections.length * 2;
  
  // Add some variation based on vehicle ID
  const hash = vehicle.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  score += (hash % 7) - 3;
  
  // Boost certain vehicles
  if (vehicle.id === 'monjaro-executive-suv') score += 4;
  
  return Math.max(74, Math.min(98, score));
}

export default function RecommendationsPage() {
  const { profile, isHydrated, resetProfile, selections, setSelections, activeFilters, setActiveFilters } = useProfile();
  const [currentStageKey, setCurrentStageKey] = useState<string>('focus');
  const [pendingPrompt, setPendingPrompt] = useState<{ id: string; text: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentStage = useMemo(() => 
    recommendationStages.find(s => s.key === currentStageKey) || null,
    [currentStageKey]
  );

  // Filter vehicles based on active filters or stage selection
  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    
    if (activeFilters) {
      if (activeFilters.vehicleTypes?.length) {
        result = result.filter(v => activeFilters.vehicleTypes!.includes(v.vehicleType));
      }
      if (activeFilters.powertrains?.length) {
        result = result.filter(v => activeFilters.powertrains!.includes(v.powertrain));
      }
    }
    
    return result;
  }, [activeFilters]);

  const isComparisonMode = filteredVehicles.length <= 3;

  const handleOptionSelect = (optionId: string) => {
    if (!currentStage) return;
    
    const option = currentStage.options.find(o => o.id === optionId);
    if (!option) return;

    setSelections(prev => [...prev, {
      stageTitle: currentStage.title,
      label: option.label
    }]);

    // Apply filters based on selected option
    const selectedVehicles = vehicles.filter(v => option.nextRecommendationIds.includes(v.id));
    const powertrains = [...new Set(selectedVehicles.map(v => v.powertrain))];
    const vehicleTypes = [...new Set(selectedVehicles.map(v => v.vehicleType))];
    
    setActiveFilters({
      powertrains,
      vehicleTypes
    });

    // Move to next stage or stay
    if (filteredVehicles.length <= 3) {
      setCurrentStageKey('focus');
    }

    // Add a message to the chat
    setPendingPrompt({
      id: `msg-${Date.now()}`,
      text: `${selectedVehicles[0]?.name} is a strong match for your ${profile.lifeStage.replace(/-/g, ' ')} profile focused on ${option.label.toLowerCase()}.`
    });
  };

  const handleReset = () => {
    resetProfile();
    setCurrentStageKey('focus');
    setActiveFilters(null);
    setPendingPrompt({
      id: `reset-${Date.now()}`,
      text: "Let's restart from the full recommendation slate."
    });
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f4efe7_0%,#ebf0f4_48%,#d6dee6_100%)]">
        <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-5 py-3 text-sm text-brandSecondary-900 shadow-lg">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brandSecondary-300 border-t-brandHighlight-500"></div>
          <span>Preparing your recommendation studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f3eee6_0%,#edf2f6_42%,#d8e1ea_100%)] text-brandSecondary-900">
      {/* Header */}
      <header className="mx-auto mb-4 flex max-w-[1600px] items-center justify-between rounded-[28px] border border-white/70 bg-white/72 px-5 py-5 shadow-lg backdrop-blur md:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brandSecondary-400">
            Recommendation Studio
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-[2rem]">
            Start broad, then narrow with confidence.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-brandSecondary-100 bg-brandSecondary-50 px-4 py-2 text-sm text-brandSecondary-600">
            {filteredVehicles.length} options live
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-full border border-brandSecondary-150 bg-white px-5 py-2.5 text-sm font-medium text-brandSecondary-700 transition-colors hover:bg-brandSecondary-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
          <Link
            to="/"
            className="rounded-full border border-brandSecondary-150 bg-white px-5 py-2.5 text-sm font-medium text-brandSecondary-700 transition-colors hover:bg-brandSecondary-50"
          >
            Edit Profile
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 pb-5 md:px-6 lg:px-8 xl:grid-cols-[460px_minmax(0,1fr)]">
        {/* Sidebar Chat */}
        <aside className="self-start xl:sticky xl:top-4">
          <div 
            ref={chatEndRef}
            className="flex flex-col gap-4 rounded-[24px] p-5 shadow-xl"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)' }}
          >
            {/* Persona Summary */}
            <div className="rounded-2xl bg-brandSecondary-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brandSecondary-400">
                Your Profile
              </p>
              <p className="mt-2 text-sm leading-relaxed text-brandSecondary-700">
                {profile.lifeStage.replace(/-/g, ' ')}, {profile.drivingMix.replace(/-/g, ' ')}, 
                and a focus on {profile.financeIntent.replace(/-/g, ' ')}.
              </p>
            </div>

            {/* Current Stage Prompt */}
            {currentStage && !isComparisonMode && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brandSecondary-400">
                    {currentStage.title}
                  </p>
                  <p className="mt-2 text-sm font-medium text-brandSecondary-800">
                    {currentStage.prompt}
                  </p>
                </div>
                <div className="space-y-2">
                  {currentStage.options.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className="w-full rounded-xl border border-brandSecondary-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brandHighlight-300 hover:shadow-md"
                    >
                      <p className="text-sm font-semibold text-brandSecondary-800">{option.label}</p>
                      <p className="mt-1 text-xs text-brandSecondary-500">{option.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {selections.length > 0 && (
              <div className="space-y-3">
                {selections.map((selection, idx) => (
                  <div key={idx} className="rounded-xl bg-brandHighlight-50 p-3">
                    <p className="text-xs text-brandSecondary-600">
                      ✓ Selected: <span className="font-medium">{selection.label}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {pendingPrompt && (
              <div className="rounded-xl bg-brandSecondary-800 p-4 text-white">
                <p className="text-sm leading-relaxed">{pendingPrompt.text}</p>
              </div>
            )}

            {/* Quick Actions */}
            {!isComparisonMode && (
              <div className="rounded-xl border border-dashed border-brandSecondary-200 p-4 text-center">
                <p className="text-xs text-brandSecondary-500">
                  Select an option above to narrow your recommendations
                </p>
              </div>
            )}

            {isComparisonMode && (
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-sm font-medium text-emerald-700">
                  ✓ Ready to compare! Review your shortlist below.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Vehicle Grid */}
        <main className="min-w-0 rounded-[32px] border border-white/70 bg-white/76 p-4 shadow-xl backdrop-blur md:p-5">
          <div className="mb-4 border-b border-brandSecondary-100 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-brandSecondary-400">
              {isComparisonMode ? 'Final Shortlist' : 'Live Recommendation Slate'}
            </p>
            <h2 className="mt-2 text-[1.9rem] font-semibold leading-tight tracking-tight md:text-[2.4rem]">
              {isComparisonMode 
                ? 'Choose from your final shortlist' 
                : 'Keep the chat in focus while the shortlist narrows.'}
            </h2>
          </div>

          {/* Vehicle Cards */}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredVehicles.map(vehicle => {
              const matchScore = calculateMatchScore(vehicle, profile, selections);
              
              return (
                <article
                  key={vehicle.id}
                  className="group overflow-hidden rounded-[28px] border border-brandSecondary-100 bg-gradient-to-b from-white to-brandSecondary-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between px-5 pt-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brandSecondary-400">
                        {vehicle.bodyStyle}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-brandSecondary-900">
                        {vehicle.name}
                      </h3>
                      <p className="mt-1 text-sm text-brandSecondary-500">{vehicle.trim}</p>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      {matchScore}% match
                    </div>
                  </div>

                  {/* Image */}
                  <div className="px-4 pt-4">
                    <img
                      src={getVehicleImage(vehicle.modelSlug)}
                      alt={`${vehicle.name} official image`}
                      className="aspect-[1.35/1] w-full rounded-[24px] object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="px-5 pb-5 pt-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-brandHighlight-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brandHighlight-700">
                        {vehicle.priceBand}
                      </span>
                      {vehicle.strengths.slice(0, 2).map(strength => (
                        <span
                          key={strength}
                          className="rounded-full border border-brandSecondary-100 bg-white px-3 py-1.5 text-xs text-brandSecondary-600"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>

                    {/* Thesis */}
                    <p className="mt-4 text-sm leading-relaxed text-brandSecondary-700">
                      {vehicle.thesis}
                    </p>

                    {/* Comparison Criteria (Short) */}
                    <div className="mt-4 rounded-[20px] border border-brandSecondary-100 bg-white/70 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-brandSecondary-400">
                        Key Highlights
                      </p>
                      <div className="mt-3 space-y-3">
                        {comparisonCriteriaShort.map(criterion => (
                          <div key={criterion.key} className="border-b border-brandSecondary-50 pb-3 last:border-b-0 last:pb-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brandSecondary-400">
                              {criterion.label}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-brandSecondary-700">
                              {vehicle.compare[criterion.key as keyof typeof vehicle.compare]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Why It Stays */}
                    <div className="mt-4 rounded-[20px] bg-brandSecondary-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-brandSecondary-800">
                        <svg className="h-4 w-4 text-brandHighlight-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Why it's on the list
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-brandSecondary-600">
                        {vehicle.thesis}
                      </p>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/specifications?model=${encodeURIComponent(vehicle.modelSlug)}`}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brandHighlight-500 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-brandHighlight-600 hover:shadow-lg"
                    >
                      View Specifications
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
