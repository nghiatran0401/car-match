import type { Vehicle } from '../types';

export const vehicles: Vehicle[] = [
  {
    id: "ex5-smart-ev",
    modelSlug: "ex5",
    name: "Vroom EX5",
    trim: "Long Range AWD",
    bodyStyle: "Smart electric crossover",
    vehicleType: "crossover",
    size: "mid-size",
    powertrain: "ev",
    fuelType: "electric",
    priceBand: "From 999m VND",
    thesis: "EX5 brings smart-EV value to the table, with a focus on urban usability, tech-forward features, and accessible pricing for first-time EV buyers.",
    strengths: [
      "Best value EV in shortlist",
      "Smart tech and connectivity",
      "Low running costs"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "financeIntent"],
    compare: {
      budgetFit: "Strong for sub-1b VND buyers",
      range: "400+ km WLTP",
      charging: "DC fast charge 10-80% in ~30 min",
      cityDriving: "Excellent",
      highwayComfort: "Good",
      cabinFlexibility: "Strong for compact five-seat use",
      ownershipPath: "Best for confident urban EV adopters"
    }
  },
  {
    id: "monjaro-executive-suv",
    modelSlug: "monjaro",
    name: "Vroom Monjaro",
    trim: "Executive AWD",
    bodyStyle: "Executive SUV",
    vehicleType: "suv",
    size: "mid-size",
    powertrain: "ice",
    fuelType: "petrol",
    priceBand: "From 1.599b VND",
    thesis: "Monjaro is the balanced executive SUV here, offering strong refinement, long-distance comfort, and a premium feel without moving into flagship pricing.",
    strengths: [
      "Refined ride quality",
      "Premium interior materials",
      "Strong highway presence"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "drivingMix"],
    compare: {
      budgetFit: "Sweet spot for 1.2–1.6b buyers",
      range: "2.0L turbo ICE",
      charging: "No charging required",
      cityDriving: "Very good",
      highwayComfort: "Excellent",
      cabinFlexibility: "Strong for family and business use",
      ownershipPath: "Best for traditional premium buyers"
    }
  },
  {
    id: "lynkco-09-premium-suv",
    modelSlug: "lynk-co-09",
    name: "Lynk & Co 09",
    trim: "Ultra AWD",
    bodyStyle: "Premium SUV",
    vehicleType: "suv",
    size: "full-size",
    powertrain: "phev",
    fuelType: "hybrid",
    priceBand: "From 2.199b VND",
    thesis: "The 09 is the three-row flagship for buyers who need maximum space, plug-in flexibility, and a more elevated ownership proposition.",
    strengths: [
      "Three-row seating",
      "PHEV flexibility",
      "Flagship equipment levels"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "financeIntent"],
    compare: {
      budgetFit: "Premium-plus buyer territory",
      range: "EV 80+ km, total 800+ km",
      charging: "Home overnight or public DC",
      cityDriving: "Excellent in EV mode",
      highwayComfort: "Best-in-class for long trips",
      cabinFlexibility: "Best for large families and VIP use",
      ownershipPath: "Best for status-conscious buyers"
    }
  },
  {
    id: "coolray-urban-value",
    modelSlug: "coolray",
    name: "Vroom Coolray",
    trim: "Sport AWD",
    bodyStyle: "Compact sporty SUV",
    vehicleType: "suv",
    size: "compact",
    powertrain: "ice",
    fuelType: "petrol",
    priceBand: "From 899m VND",
    thesis: "Coolray is the entry point into the Vroom ecosystem, targeting young urban buyers who want style, tech, and manageable running costs.",
    strengths: [
      "Most affordable option",
      "Youthful design",
      "Tech-packed for segment"
    ],
    matchTags: ["lifeStage", "primaryUseNeed"],
    compare: {
      budgetFit: "Best for sub-1b VND buyers",
      range: "1.5L turbo ICE",
      charging: "No charging required",
      cityDriving: "Excellent",
      highwayComfort: "Good",
      cabinFlexibility: "Good for couples and small families",
      ownershipPath: "Best for first-time new-car buyers"
    }
  },
  {
    id: "lynkco-06-urban-premium",
    modelSlug: "lynk-co-06",
    name: "Lynk & Co 06",
    trim: "Plus PHEV",
    bodyStyle: "Urban premium crossover",
    vehicleType: "crossover",
    size: "compact",
    powertrain: "phev",
    fuelType: "hybrid",
    priceBand: "From 1.199b VND",
    thesis: "The 06 sits between value and premium, offering PHEV efficiency in a compact package that's easy to live with in the city.",
    strengths: [
      "PHEV efficiency",
      "Compact yet premium",
      "Strong urban fit"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "drivingMix"],
    compare: {
      budgetFit: "Strong for 1–1.3b buyers",
      range: "EV 50+ km, total 600+ km",
      charging: "Home overnight charging ideal",
      cityDriving: "Excellent in EV mode",
      highwayComfort: "Very good",
      cabinFlexibility: "Good for urban professionals",
      ownershipPath: "Best for transition-to-EV buyers"
    }
  },
  {
    id: "lynkco-01-balanced-suv",
    modelSlug: "lynk-co-01",
    name: "Lynk & Co 01",
    trim: "Pro AWD",
    bodyStyle: "Balanced premium SUV",
    vehicleType: "suv",
    size: "mid-size",
    powertrain: "hybrid",
    fuelType: "hybrid",
    priceBand: "From 1.399b VND",
    thesis: "The 01 is the balanced choice in the lineup, blending hybrid efficiency, premium touches, and everyday practicality.",
    strengths: [
      "Hybrid efficiency",
      "Well-rounded package",
      "Strong resale potential"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "drivingMix"],
    compare: {
      budgetFit: "Sweet spot for 1.2–1.5b buyers",
      range: "Hybrid 700+ km",
      charging: "No charging required",
      cityDriving: "Very good",
      highwayComfort: "Very good",
      cabinFlexibility: "Strong for small families",
      ownershipPath: "Best for pragmatic premium buyers"
    }
  },
  {
    id: "lynkco-08-hybrid-flagship",
    modelSlug: "lynk-co-08",
    name: "Lynk & Co 08",
    trim: "Halo AWD",
    bodyStyle: "Hybrid flagship SUV",
    vehicleType: "suv",
    size: "mid-size",
    powertrain: "phev",
    fuelType: "hybrid",
    priceBand: "From 1.899b VND",
    thesis: "The 08 is the tech-forward flagship, combining cutting-edge infotainment, PHEV performance, and a futuristic design language.",
    strengths: [
      "Cutting-edge tech",
      "PHEV performance",
      "Futuristic design"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "financeIntent"],
    compare: {
      budgetFit: "Premium buyer territory",
      range: "EV 120+ km, total 900+ km",
      charging: "Home or public DC",
      cityDriving: "Excellent in EV mode",
      highwayComfort: "Excellent",
      cabinFlexibility: "Strong for tech-focused buyers",
      ownershipPath: "Best for early-adopter premium buyers"
    }
  },
  {
    id: "ec40-premium-ev",
    modelSlug: "ec40",
    name: "Volvo EC40",
    trim: "Twin Motor AWD",
    bodyStyle: "Electric crossover coupe",
    vehicleType: "crossover",
    size: "mid-size",
    powertrain: "ev",
    fuelType: "electric",
    priceBand: "From 1.779b VND",
    thesis: "EC40 is the premium EV flagship here, with the strongest acceleration, official Volvo Vietnam backing, and a more brand-led arrival experience.",
    strengths: [
      "Premium EV flagship",
      "408 hp performance",
      "Volvo brand presence"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "financeIntent"],
    compare: {
      budgetFit: "Best for 1.5b+ buyers",
      range: "510 km",
      charging: "DC 10-80% in about 28 minutes",
      cityDriving: "Very good",
      highwayComfort: "Excellent",
      cabinFlexibility: "Strong for premium five-seat use",
      ownershipPath: "Best for confident premium buyers"
    }
  },
  {
    id: "lynkco-03plus-performance",
    modelSlug: "lynk-co-03",
    name: "Lynk & Co 03+",
    trim: "Official Vietnam configuration",
    bodyStyle: "Performance sedan",
    vehicleType: "sedan",
    size: "mid-size",
    powertrain: "ice",
    fuelType: "petrol",
    priceBand: "From 1.899b VND",
    thesis: "The 03+ is the emotional-performance wildcard in the shortlist, giving buyers a true sports-sedan identity instead of another premium SUV.",
    strengths: [
      "Most driver-focused option",
      "AWD sports sedan",
      "Strong visual presence"
    ],
    matchTags: ["lifeStage", "primaryUseNeed", "drivingMix"],
    compare: {
      budgetFit: "Premium-plus buyer territory",
      range: "261 hp turbo ICE",
      charging: "No charging required",
      cityDriving: "Good",
      highwayComfort: "Very good",
      cabinFlexibility: "Best for buyers who prioritize driving over rear space",
      ownershipPath: "Best for buyers shopping with emotion and status in mind"
    }
  }
];

export const recommendationStages = [
  {
    key: "focus",
    title: "Shortlist focus",
    prompt: "To narrow the shortlist, should I bias toward value and city use, EV-first efficiency, executive SUV comfort, or flagship premium presence?",
    helper: "I will keep the original comparison layout and narrow this to the three strongest fits.",
    options: [
      {
        id: "value-city",
        label: "Value and city use",
        hint: "Keep the lower-cost and urban-friendly mix.",
        nextRecommendationIds: ["lynkco-06-urban-premium", "coolray-urban-value", "lynkco-01-balanced-suv"]
      },
      {
        id: "ev-first",
        label: "EV-first efficiency",
        hint: "Bias toward electric ownership and charging convenience.",
        nextRecommendationIds: ["ex5-smart-ev", "lynkco-08-hybrid-flagship", "ec40-premium-ev"]
      },
      {
        id: "executive-suv",
        label: "Executive SUV comfort",
        hint: "Keep the stronger long-distance and rear-cabin options.",
        nextRecommendationIds: ["monjaro-executive-suv", "lynkco-09-premium-suv", "lynkco-08-hybrid-flagship"]
      },
      {
        id: "premium-flagship",
        label: "Premium flagship presence",
        hint: "Keep the most elevated and premium-feeling finalists.",
        nextRecommendationIds: ["ec40-premium-ev", "lynkco-03plus-performance", "lynkco-09-premium-suv"]
      }
    ]
  }
];

export const comparisonCriteriaFull = [
  { key: "budgetFit", label: "Budget fit" },
  { key: "range", label: "Range / powertrain" },
  { key: "charging", label: "Charging routine" },
  { key: "cityDriving", label: "City driving" },
  { key: "highwayComfort", label: "Highway comfort" },
  { key: "cabinFlexibility", label: "Cabin flexibility" },
  { key: "ownershipPath", label: "Ownership path" }
];

export const comparisonCriteriaShort = [
  { key: "budgetFit", label: "Budget fit" },
  { key: "range", label: "Range / powertrain" },
  { key: "ownershipPath", label: "Ownership path" }
];
