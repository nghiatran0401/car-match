# CarMatch AI Sales Agent — Implementation Roadmap

This document provides the **complete phased implementation plan** for building the CarMatch AI sales agent according to the optimization plan (`ai-sales-agent-optimization-plan.md`) and aligned with the product PRD (`carmatch-prd.md`).

---

## Executive Summary

**Current State (Foundation Complete ✅):**
- Global chat widget implemented (`GlobalChatWidget.tsx`)
- AI assistant integration with Qwen (`aiAssistant.ts`)
- Bilingual system prompts (EN/VI) in `prompt/en/` and `prompt/vi/`
- Merchant guardrails system (`merchantGuardrails.ts`)
- Admin configuration panel (`adminConfig.ts`)
- Interactive spec items component (`InteractiveSpecItem.tsx`)
- Vehicle detail page with embedded AI chat (`VehicleDetailPage.tsx`)
- Analytics event tracking foundation (`analytics.ts`)

**Implementation Strategy:**
Follow the dual-track approach from the optimization plan:
1. **AI Excellence Track** — Metrics, prompts, retrieval, tools, evals
2. **Product Experience Track** — Spec Q&A, knowledge base, Tasco policy, UX, analytics

---

## Phase 0 — Success Metrics & Guardrails (Week 1)

### Objectives
Establish measurable KPIs and response policies before any feature development.

### Deliverables

#### 0.1 KPI Dictionary
Create `src/lib/aiMetrics.ts`:

```typescript
export interface AiKpiSnapshot {
  // Business KPIs
  quoteSubmissions: number;
  bookingSubmissions: number;
  showroomSelected: number;
  
  // Product KPIs
  stageProgressionRate: number; // intake → shortlist → compare → detail → quote
  compareToQuoteRate: number;
  
  // AI Quality KPIs
  hallucinationRate: number; // % of responses with factual errors
  policyViolationRate: number; // % of responses outside guardrails
  humanHelpfulnessScore?: number; // from user feedback
  
  // Operations KPIs
  p95LatencyMs: number;
  timeoutRate: number; // % of requests hitting 25s timeout
  fallbackRate: number; // % of responses using local fallback
}

export const KPITargets = {
  business: {
    quoteSubmissionRate: 0.15, // 15% of chatters submit quote
    bookingSubmissionRate: 0.08, // 8% of chatters submit booking
    showroomSelectionRate: 0.12, // 12% select showroom
  },
  product: {
    stageProgressionRate: 0.60, // 60% reach 5+ messages
    compareToQuoteRate: 0.25, // 25% CTA click rate
  },
  aiQuality: {
    hallucinationRate: 0.05, // <5% hallucination
    policyViolationRate: 0.02, // <2% policy violations
    humanHelpfulnessScore: 4.0, // >4.0/5 satisfaction
  },
  ops: {
    p95LatencyMs: 3000, // <3s p95
    timeoutRate: 0.05, // <5% timeouts
    fallbackRate: 0.10, // <10% fallback usage
  },
};
```

#### 0.2 Response Policy Document
Extend `prompt/en/carmatch-ai-assistant-system-prompt.txt` with explicit allowed/forbidden topics:

```
Allowed pricing statements:
- Discount ranges within guardrails ({{CONTEXT_MERCHANT_GUARDRAILS}})
- APR ranges within policy
- Deposit percentage ranges
- On-road fee estimates (clearly state if included/excluded)

Forbidden statements:
- Specific prices outside guardrail calculations
- Guaranteed approval claims
- Competitor pricing without source attribution
- fabricated urgency ("only 2 left!" without stock data)

Escalation rules:
- If customer asks for discount beyond max: "Let me connect you with a sales consultant who can review your specific situation."
- If customer asks about unlisted promotions: "I don't have information about that campaign. Let me arrange for someone to call you with current offers."
```

#### 0.3 Persona Outcomes
Document expected behaviors per PRD persona:

| Persona | Expected Outcome | AI Behavior |
|---------|-----------------|-------------|
| First-time buyer | Education → shortlist | Patient, explanatory, budget-conscious |
| Young professional | Style + value → compare | Efficient, tech-forward, finance-aware |
| Growing family | Safety + space → detail | Family-focused, practical comparisons |
| Executive owner | Premium → quote/booking | Concierge tone, time-efficient, premium features |
| Established family | Value + practicality → showroom | Balanced recommendations, cost-of-ownership focus |

### Implementation Tasks

- [ ] Create `src/lib/aiMetrics.ts` with KPI tracking functions
- [ ] Add `trackKpiEvent()` function to analytics
- [ ] Update system prompts with explicit allowed/forbidden lists
- [ ] Create admin UI section for viewing KPI dashboard (extend `AdminPage.tsx`)
- [ ] Add definition-of-done checklist to prompt template

---

## Phase 1 — Prompt Architecture (Week 1-2)

### Objectives
Implement layered prompt structure with intent recognition and state awareness.

### Deliverables

#### 1.1 Layered Prompt Structure
Refactor `buildCarAssistantSystemPrompt()` to use explicit layers:

```typescript
interface PromptLayer {
  name: string;
  content: string;
  variables: Record<string, string>;
}

const promptLayers: PromptLayer[] = [
  {
    name: 'persona',
    content: loadPersonaLayer(),
    variables: { tone: 'consultative', goal: 'conversion' }
  },
  {
    name: 'policy',
    content: loadPolicyLayer(),
    variables: { guardrails: serializedGuardrails }
  },
  {
    name: 'journey_state',
    content: loadJourneyStateLayer(),
    variables: { 
      currentStage: detectJourneyStage(messages, context),
      lastAction: getLastUserAction()
    }
  },
  {
    name: 'output_contract',
    content: loadOutputContractLayer(),
    variables: { maxSentences: 4, requireCta: true }
  }
];
```

#### 1.2 Intent Scaffolds
Create `src/lib/intentDetection.ts`:

```typescript
export type UserIntent =
  | 'price_inquiry'
  | 'discount_request'
  | 'comparison_question'
  | 'finance_estimate'
  | 'spec_education'
  | 'objection_handling'
  | 'booking_intent'
  | 'showroom_interest'
  | 'general_browsing';

export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  detectedEntities: {
    vehicleMentioned?: string;
    competitorMentioned?: string;
    priceRange?: string;
    urgencyLevel?: 'low' | 'medium' | 'high';
  };
  suggestedResponseTemplate: string;
}

export function detectIntent(message: string, context: AssistantContext): IntentResult {
  // Implementation with keyword matching + ML when volume allows
}
```

#### 1.3 EN/VI Parity Checklist
Create validation script to ensure prompt parity:

```bash
# scripts/validate-prompt-parity.sh
# Checks:
# - Same structural sections present
# - Same variable tokens used
# - Similar character count (within 20%)
# - Same behavioral rules encoded
```

#### 1.4 Anti-Hallucination Guards
Enhance system prompts with explicit unknown-handling:

```
If you don't know something:
1. Say "I don't have that information available" clearly
2. Offer to find it via tool lookup if available
3. Propose next best action (e.g., "Let me connect you with a consultant")
4. Never fabricate specs, prices, or availability
```

### Implementation Tasks

- [ ] Refactor `aiAssistant.ts` to use layered prompt builder
- [ ] Create `src/lib/intentDetection.ts` with intent classifiers
- [ ] Add journey stage detection based on user navigation + chat history
- [ ] Update both EN/VI prompts with anti-hallucination rules
- [ ] Create prompt parity validation script
- [ ] Add intent-based response templates for common scenarios

---

## Phase 2 — Retrieval & Context Quality (Week 2-3)

### Objectives
Build structured context packs and implement RAG for grounded responses.

### Deliverables

#### 2.1 Structured Context Pack
Extend `AssistantContext` in `aiAssistant.ts`:

```typescript
export interface AssistantContext {
  language?: AppLanguage;
  currentVehicle?: Vehicle;
  profile?: UserProfile;
  comparedVehicles?: Vehicle[];
  shortlistVehicles?: Vehicle[];
  merchantGuardrails?: MerchantDealGuardrails;
  adminPromptInstructions?: string;
  
  // NEW: Journey state
  journeyStage: 'intake' | 'shortlist' | 'compare' | 'detail' | 'quote' | 'booking' | 'showroom';
  recentActions: Array<{ action: string; timestamp: number; vehicleSlug?: string }>;
  
  // NEW: Retrieved knowledge
  retrievedPolicies?: PolicyDocument[];
  retrievedSpecs?: SpecDocument[];
  retrievedPromos?: PromoDocument[];
  
  // NEW: Conversation memory
  longTermMemory?: ConversationSummary;
}

interface ConversationSummary {
  keyTopicsDiscussed: string[];
  vehiclesOfInterest: string[];
  objectionsRaised: string[];
  statedPreferences: Record<string, string>;
  budgetConstraints: string;
  timelineUrgency: 'immediate' | 'this_month' | 'exploring';
}
```

#### 2.2 Knowledge Retrieval System
Create `src/lib/knowledgeRetriever.ts`:

```typescript
interface KnowledgeDocument {
  id: string;
  type: 'policy' | 'spec' | 'promo' | 'faq';
  title: string;
  content: string;
  metadata: {
    vehicleSlugs?: string[];
    validFrom?: string;
    validUntil?: string;
    source: 'official' | 'crawled';
    qualityScore: number;
  };
}

class KnowledgeRetriever {
  private documents: KnowledgeDocument[];
  
  async search(query: string, filters: SearchFilters): Promise<KnowledgeDocument[]> {
    // 1. Keyword match
    // 2. Semantic similarity (when embedding model available)
    // 3. Re-ranking by quality + freshness
    // 4. Return top-k with TTL awareness
  }
  
  async getVehicleSpecs(vehicleSlug: string): Promise<SpecDocument[]> {
    // Return specs from vehicles.ts with freshness check
  }
  
  async getActivePromos(vehicleSlug?: string): Promise<PromoDocument[]> {
    // Return promos within validity window
  }
}
```

#### 2.3 Freshness & TTL
Implement staleness detection:

```typescript
interface TimestampedData<T> {
  data: T;
  fetchedAt: number;
  ttlMs: number;
  isStale(): boolean {
    return Date.now() - this.fetchedAt > this.ttlMs;
  }
}

// Usage in retrieval
const specs = await retriever.getVehicleSpecs(slug);
if (specs.isStale()) {
  // Trigger refresh or mark as potentially outdated in response
}
```

### Implementation Tasks

- [ ] Extend `AssistantContext` with journey state and memory fields
- [ ] Create `src/lib/knowledgeRetriever.ts` with search functionality
- [ ] Build document index from `vehicles.ts`, guardrails, and FAQs
- [ ] Implement TTL checking for time-sensitive data (promos, stock)
- [ ] Add conversation summarization for long-term memory
- [ ] Wire retrieval into `buildCarAssistantSystemPrompt()`

---

## Phase 3 — Tools & Structured State (Week 3-4)

### Objectives
Implement tool-backed calculations and state machine for journey progression.

### Deliverables

#### 3.1 Tool Definitions
Create `src/lib/assistantTools.ts`:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  data: unknown;
  errorMessage?: string;
  humanReadableSummary: string;
}

// Tool implementations
const tools: ToolDefinition[] = [
  {
    name: 'price_estimator',
    description: 'Calculate on-road price including fees',
    parameters: {
      vehicleSlug: { type: 'string', required: true },
      variant: { type: 'string', required: false },
      includeOnRoad: { type: 'boolean', default: true }
    },
    execute: async (params) => {
      // Calculate from base price + registration + insurance + fees
    }
  },
  {
    name: 'discount_calculator',
    description: 'Calculate discounted price within guardrails',
    parameters: {
      vehicleSlug: { type: 'string', required: true },
      discountPct: { type: 'number', required: true },
      guardrails: { type: 'object', required: true }
    },
    execute: async (params) => {
      // Validate against guardrails, return final price
    }
  },
  {
    name: 'finance_estimator',
    description: 'Calculate monthly payment estimate',
    parameters: {
      priceMilVnd: { type: 'number', required: true },
      downPct: { type: 'number', required: true },
      termMonths: { type: 'number', required: true },
      apr: { type: 'number', required: true }
    },
    execute: async (params) => {
      // Use existing estimateMonthlyVnd logic
    }
  },
  {
    name: 'showroom_lookup',
    description: 'Find nearest showrooms with availability',
    parameters: {
      location: { type: 'string', required: false },
      vehicleSlug: { type: 'string', required: false }
    },
    execute: async (params) => {
      // Query showrooms.ts with optional filtering
    }
  },
  {
    name: 'booking_slot_helper',
    description: 'Check available test drive slots',
    parameters: {
      showroomId: { type: 'string', required: true },
      vehicleSlug: { type: 'string', required: true },
      preferredDate: { type: 'string', required: false }
    },
    execute: async (params) => {
      // Return available slots (mock for MVP)
    }
  }
];
```

#### 3.2 State Machine
Create `src/lib/journeyStateMachine.ts`:

```typescript
type JourneyStage = 
  | 'intake' 
  | 'shortlist' 
  | 'compare' 
  | 'detail' 
  | 'quote' 
  | 'booking' 
  | 'showroom';

interface StageTransition {
  from: JourneyStage;
  to: JourneyStage;
  trigger: string; // user action or intent
  conditions?: () => boolean;
  actions?: () => void; // side effects (analytics, etc.)
}

const transitions: StageTransition[] = [
  {
    from: 'intake',
    to: 'shortlist',
    trigger: 'questionnaire_completed',
    actions: () => trackEvent('shortlist_viewed')
  },
  {
    from: 'shortlist',
    to: 'compare',
    trigger: 'compare_requested',
    conditions: () => compareContext.vehicleIds.length >= 2,
    actions: () => trackEvent('compare_started')
  },
  {
    from: 'detail',
    to: 'quote',
    trigger: 'quote_requested',
    actions: () => trackEvent('quote_started')
  },
  // ... more transitions
];

export function getNextBestAction(
  currentStage: JourneyStage,
  context: AssistantContext
): NextAction {
  // Determine optimal CTA based on stage + intent + history
  return {
    type: 'cta',
    label: 'Get Quote',
    route: `/quote?model=${context.currentVehicle?.modelSlug}`,
    priority: 'high'
  };
}
```

#### 3.3 State-Aware Responses
Update prompt builder to inject journey state:

```typescript
function buildJourneyStateContext(context: AssistantContext): string {
  const stageLabels = {
    intake: 'Gathering your preferences',
    shortlist: 'Reviewing recommended matches',
    compare: 'Comparing options side-by-side',
    detail: 'Examining vehicle details',
    quote: 'Preparing personalized quote',
    booking: 'Finalizing reservation',
    showroom: 'Planning showroom visit'
  };
  
  const nextAction = getNextBestAction(context.journeyStage, context);
  
  return `
Current journey stage: ${stageLabels[context.journeyStage]}
Recommended next action: ${nextAction.label} → ${nextAction.route}
User readiness signals: ${detectReadinessSignals(context)}
  `.trim();
}
```

### Implementation Tasks

- [ ] Create `src/lib/assistantTools.ts` with 5 core tools
- [ ] Integrate tool execution into `askQwenAssistant()` flow
- [ ] Create `src/lib/journeyStateMachine.ts` with stage transitions
- [ ] Add journey stage tracking to all page components
- [ ] Implement `getNextBestAction()` for state-aware CTAs
- [ ] Update chat widget to show contextual quick actions
- [ ] Add uncertainty detection + handoff paths

---

## Phase 4 — Model Strategy & Tuning (Week 4-5)

### Objectives
Implement model routing and prepare for fine-tuning with production data.

### Deliverables

#### 4.1 Model Routing
Extend `askQwenAssistant()` with intent-based routing:

```typescript
interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

const modelConfigs: Record<UserIntent, ModelConfig> = {
  'general_browsing': {
    model: 'qwen-turbo',
    temperature: 0.7,
    maxTokens: 300,
    timeoutMs: 15000
  },
  'price_inquiry': {
    model: 'qwen-plus',
    temperature: 0.3,
    maxTokens: 400,
    timeoutMs: 25000
  },
  'objection_handling': {
    model: 'qwen-max',
    temperature: 0.5,
    maxTokens: 500,
    timeoutMs: 30000
  },
  'booking_intent': {
    model: 'qwen-max',
    temperature: 0.2,
    maxTokens: 400,
    timeoutMs: 25000
  }
};

export async function askQwenAssistant(
  messages: AssistantMessage[], 
  context: AssistantContext
): Promise<string> {
  const intent = detectIntent(messages[messages.length - 1].content, context);
  const config = modelConfigs[intent.intent] ?? modelConfigs['general_browsing'];
  
  // Use config for API call
}
```

#### 4.2 Data Collection for Fine-Tuning
Create anonymized conversation logger:

```typescript
interface TrainingExample {
  id: string;
  conversation: Array<{ role: string; content: string }>;
  context: {
    journeyStage: string;
    vehicleSlug?: string;
    intent: string;
  };
  assistantResponse: string;
  qualityLabel?: 'good' | 'needs_improvement' | 'bad';
  humanFeedback?: string;
}

function shouldLogForTraining(conversation: AssistantMessage[]): boolean {
  // Log conversations with:
  // - High engagement (5+ turns)
  // - Conversion events (quote/booking)
  // - Flagged issues (thumbs down)
  // - Edge cases (long/complex queries)
}
```

### Implementation Tasks

- [ ] Implement model routing in `askQwenAssistant()`
- [ ] Create model configuration per intent class
- [ ] Add conversation logging for training data collection
- [ ] Build admin UI for reviewing/labeling training examples
- [ ] Prepare dataset export format for future SFT

---

## Phase 5 — Offline Evaluation Harness (Mandatory)

### Objectives
Build evaluation framework to prevent quality regression.

### Deliverables

#### 5.1 Eval Dataset
Create `tests/eval-dataset.json`:

```json
{
  "conversations": [
    {
      "id": "eval_001",
      "category": "price_inquiry",
      "journeyStage": "detail",
      "messages": [
        {"role": "user", "content": "What's the best price for the EX5?"}
      ],
      "expectedBehavior": {
        "mustInclude": ["discount range", "guardrail mention"],
        "mustNotInclude": ["specific price outside calculation"],
        "requiredCta": "quote"
      },
      "scoringCriteria": {
        "factuality": 5,
        "policyCompliance": 5,
        "brevity": 4,
        "actionability": 5,
        "tone": 4
      }
    }
  ]
}
```

#### 5.2 Scoring Functions
Create `tests/aiEvaluator.ts`:

```typescript
interface EvalScore {
  conversationId: string;
  scores: {
    factuality: number; // 1-5
    policyCompliance: number; // 1-5
    brevity: number; // 1-5
    actionability: number; // 1-5
    tone: number; // 1-5
  };
  overall: number;
  flaggedIssues: string[];
}

function evaluateResponse(
  conversation: TestConversation,
  actualResponse: string
): EvalScore {
  // Automated checks:
  // - Policy violation detection (regex + semantic)
  // - Hallucination check (against known facts)
  // - Length/brevity check
  // - CTA presence check
  
  // Human review queue for edge cases
}
```

#### 5.3 Regression Gates
Add pre-deployment check:

```bash
# scripts/run-ai-evals.sh
npm run test:ai-evals

# Fail CI if:
# - Overall score drops >5% from baseline
# - Any policy violation in test set
# - Factuality score <4.0 average
```

### Implementation Tasks

- [ ] Create initial eval dataset with 50-100 conversations
- [ ] Build automated scoring functions
- [ ] Set up manual review workflow for ambiguous cases
- [ ] Integrate eval runner into CI/CD pipeline
- [ ] Establish baseline scores for regression tracking
- [ ] Create adversarial test cases (out-of-policy asks, contradictions)

---

## Phase 6 — Online Optimization (Week 6+)

### Objectives
Implement A/B testing and continuous improvement loop.

### Deliverables

#### 6.1 Event Schema Extension
Already added to `analytics.ts`:
- `assistant_reply_generated`
- `tool_used`
- `fallback_triggered`
- `policy_blocked`
- `next_action_type`
- `chat_cta_clicked`

#### 6.2 A/B Test Framework
Create `src/lib/abTesting.ts`:

```typescript
interface Experiment {
  id: string;
  name: string;
  variants: Array<{
    id: string;
    weight: number; // 0-1
    config: Record<string, unknown>;
  }>;
  metricToOptimize: 'quote_rate' | 'helpfulness_score' | 'engagement';
  status: 'running' | 'paused' | 'completed';
}

const experiments: Experiment[] = [
  {
    id: 'exp_close_timing_001',
    name: 'CTA Timing: Early vs Late',
    variants: [
      {
        id: 'early_close',
        weight: 0.5,
        config: { ctaAfterMessages: 2 }
      },
      {
        id: 'late_close',
        weight: 0.5,
        config: { ctaAfterMessages: 4 }
      }
    ],
    metricToOptimize: 'quote_rate',
    status: 'running'
  }
];

function getVariant(experimentId: string): string {
  // Consistent hashing by session ID
}
```

#### 6.3 Weekly Review Cadence
Create review template:

```markdown
## AI Assistant Weekly Review — Week [N]

### Metrics Overview
- Total conversations: X
- Avg helpfulness score: Y/5
- Fallback rate: Z%
- Policy violations: N (target: 0)

### Top Failure Modes
1. [Issue description] — [% of failures]
   - Root cause: ...
   - Fix: ...

### Wins
- [Improvement made] → [metric impact]

### Action Items
- [ ] Prompt tweak for [scenario]
- [ ] Tool enhancement for [use case]
- [ ] New eval test for [edge case]
```

### Implementation Tasks

- [ ] Instrument all AI-related events with metrics payload
- [ ] Build A/B test assignment framework
- [ ] Create first A/B experiment (CTA timing or tone)
- [ ] Set up weekly review meeting + template
- [ ] Build feedback collection UI (thumbs up/down in chat)
- [ ] Create dashboard for real-time metric monitoring

---

## Product Experience Track (Parallel Implementation)

### D.1 Phase 1 — Foundation Enhancements

**Status**: Core foundation complete. Enhancement backlog:

- [ ] Conversation persistence in localStorage
  ```typescript
  interface PersistedConversation {
    sessionId: string;
    messages: Message[];
    context: {
      vehicleSlug?: string;
      journeyStage: string;
    };
    lastActivity: number;
  }
  ```

- [ ] Transcript export/share functionality
- [ ] Quick action buttons in chat widget:
  - "Get Quote"
  - "Book Test Drive"
  - "Compare Models"
  - "View Showrooms"

### D.2 Phase 2 — Spec-Level Interactive Q&A ✅

**Status**: Implemented via `InteractiveSpecItem.tsx`

**Enhancement opportunities**:
- [ ] Add educational depth modes (beginner/intermediate/advanced)
- [ ] Include comparison benchmarks in AI responses
- [ ] Add visual aids (diagrams, charts) for complex specs
- [ ] Track spec interaction analytics

### D.3 Phase 3 — Knowledge Base + Market Data

**Implementation plan**:

1. **Market data schema** (`src/types/market.ts`):
```typescript
interface MarketVehicle {
  source: 'inventory' | 'crawled';
  brand: string;
  model: string;
  competitorModels?: string[];
  marketSegment: string;
  priceRangeVnd: { min: number; max: number };
  lastUpdated: string;
  dataQualityScore: number;
  sourceUrl?: string;
}
```

2. **Crawler pipeline** (separate service):
- Source: oto.com.vn, manufacturer sites
- Normalize to MarketVehicle schema
- Quality scoring (completeness, recency, source authority)
- Store in JSON for client-side consumption

3. **Comparison response pattern**:
```
1. Acknowledge both sides fairly
2. Objective comparison dimensions (table format)
3. Tasco advantages where applicable
4. Clear CTA (test drive / quote / visit)
```

### D.4 Phase 4 — Merchant / Tasco Policy Integration

**Implementation**:

1. **Extended guardrails** (`MerchantDealGuardrails`):
```typescript
interface ExtendedGuardrails extends MerchantDealGuardrails {
  priorityModels: string[]; // model slugs to prioritize
  experienceCenterPush: boolean;
  campaigns: Array<{
    id: string;
    title: string;
    description: string;
    applicableModels: string[];
    validFrom: string;
    validUntil: string;
    discountOverride?: { min: number; max: number };
  }>;
  competitiveAdvantages: Array<{
    category: string;
    message: string;
    evidence: string;
  }>;
  humanHandoffTriggers: string[]; // keywords/phrases
}
```

2. **Progressive CTA logic**:
```typescript
function getProgressiveCta(turnCount: number, intent: UserIntent): Cta {
  if (turnCount <= 2) {
    return { type: 'education', label: 'Learn More' };
  } else if (turnCount <= 4) {
    return { type: 'compare', label: 'Compare Models' };
  } else if (intent === 'booking_intent') {
    return { type: 'booking', label: 'Book Test Drive' };
  } else {
    return { type: 'quote', label: 'Get Quote' };
  }
}
```

### D.5 Phase 5 — Advanced Conversation Features

**Multi-turn memory**:
```typescript
interface ConversationMemory {
  sessionId: string;
  summary: {
    vehiclesDiscussed: string[];
    concernsRaised: string[];
    preferencesStated: Record<string, string>;
    budgetMentioned?: string;
    timelineMentioned?: string;
  };
  lastInteraction: number;
}

// Persist to localStorage for MVP
// Migrate to server storage when backend available
```

**Proactive nudges**:
```typescript
function generateProactiveNudge(
  profile: UserProfile,
  journeyStage: string,
  history: Message[]
): string | null {
  if (profile.lifeStage === 'Growing family' && !history.some(m => m.content.includes('safety'))) {
    return 'Would you like me to highlight safety features for family use?';
  }
  if (journeyStage === 'detail' && history.length > 3) {
    return 'Ready to see how this compares to your other options?';
  }
  return null;
}
```

### D.6 Phase 6 — Analytics Dashboard

**Dashboard components** (`AdminPage.tsx` extension):

1. **Conversation funnel visualization**:
   - Intake → Shortlist → Compare → Detail → Quote → Booking
   - Drop-off rates at each stage

2. **AI performance metrics**:
   - Response latency distribution
   - Fallback usage over time
   - Policy violation incidents

3. **User feedback aggregation**:
   - Thumbs up/down ratio
   - Common flagged issues
   - Free-text suggestions word cloud

4. **Export capabilities**:
   - CSV export for further analysis
   - Conversation transcript download
   - Lead list export (quote/booking submissions)

---

## Risk Mitigation Strategies

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| API downtime | High | Tiered fallback already implemented; add retry logic with exponential backoff |
| Slow responses | Medium | Streaming responses; progressive disclosure (show partial while thinking) |
| Wrong specs/prices | High | Tool-backed calculations; user flagging mechanism; audit log |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-reliance on AI | Medium | Clear human escalation paths; "talk to human" button |
| Policy violations | High | Pre-response validation; post-response auditing; immediate alerting |
| Poor user experience | Medium | Continuous feedback collection; rapid iteration on prompts |

### Ethical Considerations

- **Transparency**: Clearly disclose AI assistant nature
- **Fair framing**: Present competitor info objectively
- **No fabricated urgency**: Only mention stock/promo urgency with verified data
- **Privacy**: Anonymize training data; comply with data protection regulations

---

## Success Metrics Calibration

### Initial Targets (First 30 Days)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Chat engagement rate | >30% | Events / page views |
| Deep conversation rate | >50% | Sessions with 5+ messages |
| CTA click-through | >20% | CTA clicks / sessions |
| Quote submission rate | >10% | Quote submits / chat sessions |
| Helpfulness score | >3.8/5 | End-of-chat survey |
| P95 latency | <4000ms | Performance monitoring |
| Fallback rate | <15% | Fallback events / total responses |

### Stretch Goals (90 Days)

| Metric | Target |
|--------|--------|
| Chat engagement rate | >45% |
| Deep conversation rate | >65% |
| CTA click-through | >30% |
| Quote submission rate | >18% |
| Helpfulness score | >4.2/5 |
| P95 latency | <2500ms |
| Fallback rate | <8% |

---

## Implementation Timeline

### Sprint 1-2 (Weeks 1-2): Foundation + Prompts
- [x] Analytics extension (Phase 0)
- [ ] KPI dictionary + tracking
- [ ] Layered prompt architecture
- [ ] Intent detection system
- [ ] Prompt parity validation

### Sprint 3-4 (Weeks 3-4): Retrieval + Tools
- [ ] Knowledge retriever implementation
- [ ] Tool system (5 core tools)
- [ ] Journey state machine
- [ ] State-aware CTAs

### Sprint 5-6 (Weeks 5-6): Evaluation + Optimization
- [ ] Offline eval harness
- [ ] Eval dataset creation (50-100 conversations)
- [ ] A/B testing framework
- [ ] First A/B experiment launch

### Sprint 7-8 (Weeks 7-8): Advanced Features
- [ ] Conversation persistence
- [ ] Multi-turn memory
- [ ] Proactive nudges
- [ ] Analytics dashboard v1

### Sprint 9+ (Ongoing): Iteration + Scale
- [ ] Model fine-tuning (when data volume allows)
- [ ] Rich media in chat (comparison tables, galleries)
- [ ] Backend storage migration
- [ ] CRM/DMS integration
- [ ] Voice interface (optional exploration)

---

## Definition of Done

Each phase is considered complete when:

1. **Code complete**: All planned features implemented
2. **Tests passing**: Unit tests + integration tests green
3. **Eval gate passed**: No regression in offline eval scores
4. **Documentation updated**: README, inline comments, API docs
5. **Monitoring in place**: Relevant metrics instrumented
6. **Rollback plan ready**: Can revert safely if issues arise

---

## Appendix: File Creation Checklist

### New Files to Create

- [ ] `src/lib/aiMetrics.ts` — KPI tracking
- [ ] `src/lib/intentDetection.ts` — Intent classification
- [ ] `src/lib/knowledgeRetriever.ts` — RAG system
- [ ] `src/lib/assistantTools.ts` — Tool definitions
- [ ] `src/lib/journeyStateMachine.ts` — State machine
- [ ] `src/lib/abTesting.ts` — A/B testing framework
- [ ] `src/types/market.ts` — Market data types
- [ ] `tests/eval-dataset.json` — Eval conversations
- [ ] `tests/aiEvaluator.ts` — Evaluation logic
- [ ] `scripts/validate-prompt-parity.sh` — Validation script
- [ ] `scripts/run-ai-evals.sh` — CI integration

### Files to Modify

- [x] `src/lib/analytics.ts` — Extended event types ✅
- [ ] `src/lib/aiAssistant.ts` — Layered prompts, tools, routing
- [ ] `src/components/GlobalChatWidget.tsx` — Persistence, quick actions
- [ ] `src/pages/VehicleDetailPage.tsx` — Journey tracking
- [ ] `src/pages/AdminPage.tsx` — KPI dashboard, training data review
- [ ] `prompt/en/carmatch-ai-assistant-system-prompt.txt` — Enhanced rules
- [ ] `prompt/vi/carmatch-ai-assistant-system-prompt.txt` — Enhanced rules

---

## Conclusion

This implementation roadmap provides a **systematic, measurable approach** to building the CarMatch AI sales agent. By following the dual-track strategy (AI excellence + product experience), the team will deliver:

1. **High-quality AI interactions** grounded in retrieval, validated by evals
2. **Conversion-oriented UX** that guides users through the PRD funnel
3. **Continuous improvement** via online optimization and feedback loops
4. **Production reliability** with proper monitoring, fallbacks, and governance

**Next Steps**:
1. Review and approve this roadmap
2. Prioritize Phase 0-1 tasks for immediate sprint planning
3. Set up project tracking (Jira/GitHub Projects)
4. Begin implementation with KPI dictionary and layered prompts
