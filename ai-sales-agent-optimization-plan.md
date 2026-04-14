# CarMatch AI Car Salesperson Assistant — Unified Optimization Plan

This document **combines** the product/feature roadmap (spec Q&A, knowledge base, Tasco policy, UX, analytics) with the **industry-standard AI quality track** (metrics, layered prompts, retrieval, tools, evals, continuous improvement). Together they define how to build the **best** AI car salesperson for CarMatch: helpful, grounded, compliant, and conversion-oriented across the PRD funnel: **intake → shortlist → compare → detail → quote / booking → showroom**.

---

## Executive Summary

CarMatch’s AI sales assistant should:

1. **Serve real buyers** — self-directed researchers, beginners, and pre-showroom planners — with a pressure-free, educational tone while still progressing deals.
2. **Ship product depth** — persistent chat, spec-level Q&A, optional market data (e.g. oto.com.vn), merchant/Tasco-aligned guardrails, Experience Center nudges, memory, proactive guidance, and rich analytics.
3. **Meet production AI standards** — explicit KPIs, layered prompts, retrieval-grounded facts, tool-backed numbers, offline eval gates, online A/B loops, and tiered fallbacks — not only clever heuristics.

**Foundation already in place**: `GlobalChatWidget`, `aiAssistant.ts`, Qwen integration, EN/VI prompts under `prompt/en` and `prompt/vi`, merchant guardrails, admin coaching instructions.

---

## Part A — Vision, Users, and Architecture

### A.1 Core vision

- Act as the **first point of contact** for car buyers (online consultation before showroom).
- **Educate without pressure**; support basic questions and comparisons without judgment.
- **Drive concrete next steps**: quote, test drive, Experience Center / showroom visit, booking.
- **Encode merchant policy** (discount/APR/deposit/perks, Tasco priorities where applicable) and allow **fair market context** when crawled or structured data exists.

### A.2 Primary user segments

| Segment | Needs |
|--------|--------|
| Self-directed researchers (e.g. Gen Z) | Online-first research, low-pressure Q&A |
| Automotive beginners | Fundamentals, comparisons (e.g. brand vs brand) |
| Pre-showroom researchers | Narrow options, prepare questions, efficient visits |

### A.3 Strategic goals (product + AI)

- Reduce buyer overwhelm; **increase** shortlist → compare → detail → **quote / booking / showroom** progression.
- Maintain **premium consultative** tone with **strict policy compliance** and high **factuality**.
- Measure **business KPIs**, **AI quality**, and **ops** (latency, timeouts, fallbacks).

### A.4 System architecture (conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CarMatch AI Sales Agent                       │
├─────────────────────────────────────────────────────────────────┤
│  Global Chat Widget ◄──► Context-aware conversation engine       │
│         ▲                        │                               │
│  Spec-level Q&A hooks            ▼                               │
│                            Knowledge + vehicle data               │
│                                   │                               │
│                    Merchant policy / guardrails │ Market (RAG)   │
└─────────────────────────────────────────────────────────────────┘
```

**Stack (current direction)**: React + TypeScript + Vite; Context for profile/compare/language; Qwen (DashScope); internal `src/data/vehicles.ts`; optional crawled market data; bilingual EN/VI.

---

## Part B — Two Tracks, One Timeline

Progress **product features** and **AI excellence** in parallel. Industry best practice: **do not** rely on prompt tweaks alone — pair them with **evals**, **retrieval**, **tools**, and **telemetry**.

| AI excellence (industry track) | Product / experience track | Why together |
|-------------------------------|----------------------------|----------------|
| **Phase 0** Metrics & guardrails | Foundation (chat + context) ✅ | You can’t improve what you don’t measure |
| **Phase 1** Layered prompts + intents | Spec Q&A + prompt hooks | Same surface: what the model sees and does |
| **Phase 2** Context pack + RAG | Market KB + oto.com.vn-style data | Grounding for comparisons and specs |
| **Phase 3** Tools + journey state | Tasco policy + quote/booking/showroom | Numbers and CTAs must be correct and state-aware |
| **Phase 4** Model routing / tuning | Advanced convo + proactive nudges | High-stakes turns get stronger models |
| **Phase 5** Offline eval harness | Regression before each release | Prevents quality drift |
| **Phase 6** Online A/B + analytics | Analytics dashboard + feedback UI | Closes the learning loop |

---

## Part C — AI excellence track (checklists)

*Aligned to PRD funnel and conversion goals.*

### C.0 Phase 0 — Success metrics and guardrails (Week 1)

- [ ] **KPI tree**
  - [ ] Business: quote submit, booking submit, showroom selected
  - [ ] Product: stage progression, compare → quote
  - [ ] AI quality: hallucination rate, policy violations, human score
  - [ ] Ops: p95 latency, timeout rate, fallback rate
- [ ] **Response policy**: allowed/forbidden pricing, APR, perks; escalation rules
- [ ] **Persona outcomes** (young professional, family, executive, …)
- [ ] **Definition of done** for replies: direct answer first → concise → **one** clear next action

### C.1 Phase 1 — Prompt architecture (Week 1–2)

- [ ] Layered prompts: **persona** | **policy** | **journey state** | **output contract**
- [ ] Intent scaffolds: price/discount, objection, compare, finance estimate, booking/visit close
- [ ] EN/VI parity checklist
- [ ] Anti-hallucination: unknown facts → say so + tool or next step

### C.2 Phase 2 — Retrieval and context quality (Week 2–3)

- [ ] **Structured context pack** per turn: profile, current vehicle, compare deltas, shortlist rationale, guardrails, showroom options
- [ ] Retrieval: policy KB | vehicle/spec KB | commercial/promo KB
- [ ] Reranking (not raw top-k)
- [ ] Freshness: TTL + timestamps for stock/promo-sensitive fields

### C.3 Phase 3 — Tools and structured state (Week 3–4)

- [ ] Tools: `price_estimator`, `discount_calculator`, `finance_estimator`, `showroom_lookup`, `booking_slot_helper` (names illustrative)
- [ ] **State machine** matching PRD: intake → shortlist → compare → detail → quote → booking → showroom
- [ ] State-aware **next best action** every turn
- [ ] Uncertainty + human handoff paths

### C.4 Phase 4 — Model strategy and tuning (Week 4–5)

- [ ] Route: cheaper model for low-risk; stronger for commercial/objection closes
- [ ] Decode params by intent class
- [ ] Anonymized preference / SFT dataset from production chats (when volume allows)

### C.5 Phase 5 — Offline evaluation (mandatory)

- [ ] Eval set: **200–500** dialogues across funnel stages
- [ ] Scorecards: factuality, policy, brevity, actionability, tone
- [ ] **Regression gates** on prompt/model changes
- [ ] Adversarial: out-of-policy asks, missing context, contradictions, fake urgency

### C.6 Phase 6 — Online optimization

- [ ] Events: `assistant_reply_generated`, `tool_used`, `fallback_triggered`, `policy_blocked`, `next_action_type`
- [ ] A/B: close-first vs consultative-first vs hybrid
- [ ] Weekly failure review → prompts / tools / state updates

### C.7 Reliability and safety (parallel)

- [ ] **Tiered fallback**: tool-grounded → constrained template → handoff guidance
- [ ] Timeout budgets; red-team for abuse; internal audit metadata

**Prioritized order**: Phase 0 + 5 foundation → 1 → 2 → 3 → 6 → 4 (tuning once data exists).

**30 / 60 / 90 days**

- **0–30**: KPIs, eval v1, layered prompts, first A/B
- **31–60**: RAG + context pack, tool-backed calculations
- **61–90**: State machine in production, model routing, weekly optimization cadence

**Next sprint starters**

- [ ] KPI dictionary + event schema
- [ ] 50 seed eval conversations from live flows
- [ ] Layered prompt spec (EN + VI)
- [ ] First three tools: discount calc, finance estimate, showroom lookup
- [ ] Release gate: no ship if offline eval regresses

**Note**: Rule-based local fallback is **resilience**, not the main lever for intelligence; pair it with the above.

---

## Part D — Product / experience track (feature phases)

### D.1 Phase 1 — Foundation ✅ (current codebase)

**Done (typical)**:

- `GlobalChatWidget`, app shell persistence
- Context: profile, current vehicle, compare, shortlist, guardrails, admin instructions
- Qwen + client-side fallback
- EN/VI system prompts: `prompt/en/carmatch-ai-assistant-system-prompt.txt`, `prompt/vi/...`

**Enhancement backlog**

- [ ] Conversation persistence (`localStorage` / future server)
- [ ] Transcript export / share
- [ ] Quick actions: Get Quote, Book test drive, Compare

### D.2 Phase 2 — Spec-level interactive Q&A (HIGH priority)

**Goal**: Click any spec on vehicle detail → chat opens with **spec-aware** context (education + sales progression).

**Build**

- [ ] `InteractiveSpecItem` (or equivalent): label, value, `specKey`, `vehicleId`, category
- [ ] Wire `specSectionsForVehicle.ts` + `VehicleDetailPage.tsx`
- [ ] Extend `aiAssistant.ts` / prompts for spec injection

**Spec categories** (non-exhaustive): powertrain, performance, dimensions, capacity, efficiency, safety, comfort, ownership.

**Educational depth modes**

- Beginner: analogies, simple language
- Intermediate: trade-offs vs benchmarks
- Advanced: precise specs, engineering context

**Example flows**

| Action | Chat seed |
|--------|-------------|
| Click “2.0L Turbo” | “What should I know about the 2.0L Turbo on this model?” |
| Click “400+ km WLTP” | Range + charging implications |
| Click “Three-row seating” | Third-row practicality |

### D.3 Phase 3 — Knowledge base + market data

**Goal**: Cross-brand answers (e.g. VinFast vs BYD) with **fair** framing + Tasco value props where relevant.

**Data**

- Primary: `src/data/vehicles.ts`
- Secondary: crawled market (e.g. oto.com.vn) — normalize schema, quality score, `lastUpdated`

**Response pattern**

1. Acknowledge both sides fairly  
2. Objective comparison dimensions  
3. Tasco advantages (warranty, service, financing) where applicable  
4. Clear CTA (test drive, quote, visit)

**Quality**

- Cross-check prices; flag stale specs (>6 months); prefer official sources; confidence for crawled fields.

### D.4 Phase 4 — Merchant / Tasco sales policy integration

**Goal**: Promotions, priority models, Experience Center push, human handoff rules — all **data-driven** where possible.

**Extend guardrails** (conceptually): priority models, `experienceCenterPush`, campaigns with validity windows, competitive advantages copy, `humanHandoffTriggers`.

**Behaviors**

- After 2–3 substantive turns, soft nudge to Experience Center / showroom when appropriate  
- Map intents: price negotiation → quote; comparison → educate then soft close; test drive → book; timeline → high priority

**Progressive CTAs**

1. Early → education  
2. Mid → compare / specs  
3. Late → quote / test drive  
4. Decision → appointment / deposit (within policy)

### D.5 Phase 5 — Advanced conversation features

- [ ] Multi-turn memory (localStorage MVP → server later)
- [ ] Proactive nudges by profile (first-time buyer, family, budget, EV-curious)
- [ ] Future: comparison tables in chat, galleries, in-chat shortlists

### D.6 Phase 6 — Analytics and continuous improvement

**Metrics**

- Completion rate, messages per session, topic categories, drop-off points, **chat → quote / test drive / showroom**

**Events** (extend PRD list + AI track in Part C.6)

**Feedback**

- Thumbs, end-of-chat helpfulness, flag incorrect, free-text suggestions  
- Weekly flagged review; monthly prompt KB tune; quarterly KB refresh

**A/B ideas**

- Tone, CTA timing, density, question style → tie to Part C.6

---

## Part E — UI/UX (high level)

### E.1 Global chat widget

- Desktop: bottom-right; mobile: consider bottom-center above nav; optional show/hide on scroll
- States: idle, unread badge, active panel, typing indicator
- **Quick actions bar**: Recommendations | Compare | Get quote | Book test drive

### E.2 Interactive specs

- Clear affordance (hover, dashed underline, optional “?” hint)
- Flow: hover tooltip → click → open/focus chat → pre-filled prompt → user may edit → send

### E.3 Mobile

- Panel ~95vw / ~70vh; keyboard-safe scroll; ≥44px touch targets

---

## Part F — Data model extensions (sketches)

### F.1 Conversation history

```typescript
interface ConversationHistory {
  id: string;
  userId?: string;
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  messages: ConversationMessage[];
  context: {
    profileSnapshot?: unknown;
    viewedVehicle?: string;
    comparedVehicles?: string[];
    shortlistVehicles?: string[];
  };
  outcome?: { ctaClicked?: string; converted?: boolean; rating?: number };
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    specContext?: { specKey: string; category: string; value: string };
    suggestedActions?: string[];
  };
}
```

### F.2 Market vehicle (optional extension)

```typescript
interface MarketVehicle {
  source: 'inventory' | 'crawled';
  brand: string;
  competitorModels?: string[];
  marketSegment: string;
  priceRangeVnd: { min: number; max: number };
  lastUpdated: string;
  dataQualityScore: number;
}
```

### F.3 Analytics payload (illustrative)

```typescript
interface ConversationAnalytics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
  topicsDiscussed: string[];
  vehiclesMentioned: string[];
  intentLevelReached: 'browsing' | 'considering' | 'ready';
  ctaClicked?: 'quote' | 'test_drive' | 'showroom' | 'compare';
  userSatisfaction?: 1 | 2 | 3 | 4 | 5;
}
```

---

## Part G — Implementation roadmap (merged sprints)

### G.1 Product-oriented sprints (from original plan)

| Sprint window | Focus |
|----------------|--------|
| 1–2 | Spec-level Q&A: components, spec metadata, detail page, prompts |
| 3–4 | Market KB: crawler/pipeline, schema, comparisons, quality scores |
| 5–6 | Tasco policy: extended guardrails, campaigns, Experience Center logic, handoff |
| 7–8 | Memory, proactive guidance, analytics hooks, mobile polish |
| 9+ | A/B infra, rich media, backend storage, CRM/DMS, voice (optional) |

### G.2 AI excellence injections (do continuously)

- Every sprint: **eval regression** on changed prompts/tools  
- Before major releases: **offline gate** (Part C.5)  
- After launch: **online** experiments (Part C.6)

---

## Part H — Success metrics (merged)

### H.1 Product / engagement (targets illustrative — calibrate with data)

| Metric | Example target | How |
|--------|----------------|-----|
| Chat engagement | >40% visitors | Events |
| Deep conversation | >60% reach 5+ messages | Session |
| CTA CTR | >25% any CTA | Events |
| Showroom / visit intent | >15% of chatters | CRM / booking |
| Satisfaction | >4.0 / 5 | Survey |

### H.2 AI and funnel (from excellence track)

- Quote started / submitted, booking submitted, showroom selected  
- Compare → quote rate, hallucination / policy violation rates, p95 latency, fallback rate

### H.3 Business impact (why it matters)

Higher lead quality, shorter cycles, consistent compliant messaging, scalable consultation, insight into real questions.

---

## Part I — Risk mitigation

| Area | Risk | Mitigation |
|------|------|------------|
| Technical | API downtime / slowness | Tiered fallback, streaming, trim context |
| Technical | Wrong specs/prices | Tools + RAG + audits + user flags |
| Business | Over-reliance on AI | Clear human escalation |
| Ethical | Transparency / bias / pressure | Disclose AI, fair framing, no fabricated urgency |

---

## Part J — Appendix

### J.1 Sample flows (abbreviated)

- **Beginner**: “What is a V8?” → simple explanation → bridge to in-stock model → CTA spec/compare  
- **Comparison**: two models → fair table → Tasco benefits → Experience Center / test drive  
- **Spec click**: pre-seeded question → concrete numbers + one follow-up max

### J.2 Prompt files (repo)

- `prompt/en/carmatch-ai-assistant-system-prompt.txt`
- `prompt/vi/carmatch-ai-assistant-system-prompt.txt`

### J.3 Related docs

- `carmatch-prd.md`
- `CarMatch.drawio.png`
- `src/lib/aiAssistant.ts`, `src/components/GlobalChatWidget.tsx` (paths may vary)

---

## Part K — Conclusion and next steps

**Best** AI car salesperson = **great product surface** (spec Q&A, chat, CTAs, market + merchant context) **plus** **disciplined AI engineering** (metrics, prompts, RAG, tools, state, evals, online learning).

**Immediate priorities**

1. Approve this unified plan with stakeholders.  
2. Run **Phase 0 + C.5 seed** in parallel with **D.2 Spec Q&A**.  
3. Schedule weekly review: funnel metrics + eval regressions + flagged chats.

---

*Unified plan: merges the detailed CarMatch AI Sales Agent roadmap with the PRD-aligned AI quality roadmap.*  
*Version: 2.0 (combined)*
