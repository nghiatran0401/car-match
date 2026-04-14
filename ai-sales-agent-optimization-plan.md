# AI Sales Agent Optimization Plan

## Executive Summary

This document outlines the comprehensive plan to build CarMatch's AI Sales Agent system - an AI-powered consultation system that replaces the initial sales consultation step, guiding users through their car buying journey via an integrated chatbot interface. The system serves users who prefer self-directed online research before visiting showrooms, providing educational content, personalized recommendations, and seamless progression to offline dealership experiences.

---

## 1. Product Vision & Context

### 1.1 Core Vision
Build an **AI-driven showroom sales assistant** that:
- Acts as the first point of contact for car buyers, replacing initial human sales consultation
- Provides a pressure-free environment for users to ask questions and learn about vehicles
- Guides users from initial curiosity through informed decision-making to showroom visit intent
- Serves both knowledgeable buyers and beginners who need fundamental automotive education

### 1.2 User Insights (from Product Team)

#### Primary User Segments:
1. **Self-directed researchers** (Young adults/Gen Z)
   - Prefer researching online before visiting showrooms
   - Want to ask "basic" questions without judgment
   - Value comfort of learning at their own pace without sales pressure

2. **Automotive beginners** 
   - Need fundamental education (e.g., "What is a V8 engine?")
   - Want comparisons (e.g., "VinFast vs BYD")
   - Lack access to patient, knowledgeable advisors

3. **Pre-showroom researchers**
   - Will eventually visit showrooms for test drives
   - Use online research to narrow options and prepare questions
   - Want to maximize efficiency of in-person visits

### 1.3 Strategic Goals
- **Reduce buyer overwhelm** through guided, conversational discovery
- **Educate without pressure** - create safe space for all knowledge levels
- **Drive showroom traffic** - AI consultation ends with concrete next steps (visit, test drive, quote)
- **Encode Tasco sales policies** - ensure AI promotes Tasco Experience Center and follows merchant guidelines
- **Expand beyond Tasco inventory** - allow comparative discussions with market alternatives using crawled data

---

## 2. System Architecture Overview

### 2.1 Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    CarMatch AI Sales Agent                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ Global Chat      │    │ Context-Aware    │                  │
│  │ Widget           │◄──►│ Conversation     │                  │
│  │ (Persistent)     │    │ Engine           │                  │
│  └──────────────────┘    └──────────────────┘                  │
│           ▲                       │                              │
│           │                       ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │ Spec-Level       │    │ Knowledge Base   │                  │
│  │ Q&A Hooks        │    │ + Vehicle Data   │                  │
│  └──────────────────┘    └──────────────────┘                  │
│                                   │                              │
│                          ┌────────┴────────┐                    │
│                          ▼                 ▼                    │
│                   ┌────────────┐   ┌────────────┐              │
│                   │ Tasco      │   │ Market     │              │
│                   │ Policies   │   │ Data       │              │
│                   │ & Guardrails│  │ (Crawled)  │              │
│                   └────────────┘   └────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technical Stack
- **Frontend**: React + TypeScript + Vite
- **State Management**: React Context (ProfileContext, CompareContext, LanguageContext)
- **AI Backend**: Qwen API (Aliyun DashScope)
- **Data Sources**: 
  - Internal vehicle database (`src/data/vehicles.ts`)
  - Crawled market data (oto.com.vn integration planned)
- **Localization**: Vietnamese/English bilingual support

---

## 3. Implementation Phases

### Phase 1: Foundation - Persistent Chat Interface ✅ (COMPLETED)

**Status**: Already implemented in current codebase

**Deliverables**:
- ✅ `GlobalChatWidget` component (floating button bottom-right)
- ✅ Persistent across all pages via `AppShell` layout
- ✅ Context-aware conversations (profile, current vehicle, compare list, shortlist)
- ✅ Bilingual support (VI/EN)
- ✅ Integration with Qwen AI API with fallback logic
- ✅ Merchant guardrails system
- ✅ Admin configuration for prompt instructions

**Key Files**:
- `/workspace/src/components/GlobalChatWidget.tsx`
- `/workspace/src/lib/aiAssistant.ts`
- `/workspace/prompt/en/carmatch-ai-assistant-system-prompt.txt`
- `/workspace/prompt/vi/carmatch-ai-assistant-system-prompt.txt`

**Enhancement Opportunities**:
1. Add conversation history persistence (localStorage)
2. Implement chat transcript sharing/export
3. Add quick action buttons in chat (e.g., "Get Quote", "Book Test Drive")

---

### Phase 2: Spec-Level Interactive Q&A (PRIORITY: HIGH)

**Objective**: Enable users to click on any specification item in vehicle detail pages and instantly get AI explanations tailored to their question.

#### 2.1 Feature Specification

**User Story**: 
> As a user viewing vehicle specifications, I want to click on any spec field (e.g., "2.0L Turbo", "AWD", "400km range") and ask questions directly about that specific feature, so I can understand technical details without leaving the page.

**Implementation Requirements**:

1. **Clickable Spec Components**
   - Transform static spec labels into interactive elements
   - Add hover states indicating clickability
   - Show tooltip preview on hover ("Click to ask about this")

2. **Context Injection**
   - When clicked, auto-populate chat with context-aware query
   - Example: Clicking "V8 Engine" → Chat opens with "Tell me about the V8 engine in this vehicle"
   - Maintain full conversation context (user profile, current vehicle, comparison set)

3. **Spec Categories for Interaction**:
   - **Powertrain**: Engine type, displacement, cylinders, power, torque
   - **Performance**: 0-100 km/h, top speed, acceleration
   - **Dimensions**: Length, width, height, wheelbase, ground clearance
   - **Capacity**: Seating, cargo volume, fuel tank
   - **Efficiency**: Fuel consumption, electric range, CO2 emissions
   - **Safety**: Airbags, ADAS features, crash ratings
   - **Comfort**: Suspension type, climate control, infotainment
   - **Ownership**: Warranty, service intervals, maintenance costs

#### 2.2 Technical Implementation

**New Component**: `InteractiveSpecItem.tsx`

```typescript
interface InteractiveSpecItemProps {
  label: string;
  value: string;
  specKey: string;
  vehicleId: string;
  category: string;
}
```

**Integration Points**:
- Modify `/workspace/src/lib/specSectionsForVehicle.ts` to return interactive metadata
- Update `/workspace/src/pages/VehicleDetailPage.tsx` to use interactive spec components
- Enhance `aiAssistant.ts` to handle spec-specific context injection

**Example User Flows**:

| User Action | System Response |
|-------------|-----------------|
| Clicks "2.0L Turbo" on Monjaro | Chat opens: "What should I know about the 2.0L Turbo engine in the Monjaro?" |
| Clicks "400+ km WLTP" on EX5 | Chat opens: "Is 400km range enough for long trips? How does charging work?" |
| Clicks "Three-row seating" on Lynk & Co 09 | Chat opens: "How spacious is the third row? Can adults sit comfortably?" |

#### 2.3 Educational Content Modes

The AI should adapt responses based on detected knowledge level:

**Beginner Mode** (triggered by basic questions):
- Use analogies and simple language
- Explain fundamentals before specifics
- Provide real-world examples

**Intermediate Mode** (technical comparisons):
- Focus on practical implications
- Compare against common benchmarks
- Highlight trade-offs

**Advanced Mode** (detailed technical queries):
- Provide precise specifications
- Discuss engineering considerations
- Reference industry standards

---

### Phase 3: Knowledge Base Expansion with Market Data

**Objective**: Integrate crawled data from oto.com.vn to enable cross-brand comparisons and broader market context.

#### 3.1 Data Integration Strategy

**Data Sources**:
1. **Primary**: Existing `vehicles.ts` (Tasco core inventory)
2. **Secondary**: Crawled data from oto.com.vn (market competitors)
3. **Tertiary**: User-generated questions (continuous learning)

**Data Schema Extension**:

```typescript
interface MarketVehicle extends Vehicle {
  source: 'tasco' | 'crawled';
  brand: string;
  competitorModels?: string[];
  marketSegment: string;
  priceRangeVnd: { min: number; max: number };
  lastUpdated: string;
  dataQualityScore: number;
}
```

#### 3.2 Comparison Capabilities

Enable AI to answer questions like:
- "So sánh VinFast VF8 với BYD Atto 3" (Compare VinFast VF8 vs BYD Atto 3)
- "Xe hybrid nào tiết kiệm nhiên liệu nhất trong tầm giá 1 tỷ?" (Most fuel-efficient hybrid under 1 billion VND)
- "Tại sao nên mua xe Tasco phân phối thay vì xe nhập khẩu tư nhân?" (Why buy Tasco-distributed vs privately imported?)

**Response Framework**:
1. Acknowledge both options fairly
2. Present objective comparison criteria
3. Highlight Tasco advantages (warranty, service network, financing)
4. Guide toward test drive recommendation

#### 3.3 Data Quality & Maintenance

**Validation Rules**:
- Cross-reference prices across multiple sources
- Flag outdated specifications (>6 months old)
- Prioritize official manufacturer data over third-party
- Display confidence scores for crawled data in AI responses

**Update Cadence**:
- Daily: Price checks
- Weekly: Spec updates
- Monthly: Full data refresh

---

### Phase 4: Tasco Sales Policy Integration

**Objective**: Encode Tasco's sales strategy and promotional priorities into AI guidance.

#### 4.1 Merchant Guardrails Enhancement

Current implementation (`merchantGuardrails.ts`) covers:
- Discount ranges
- APR ranges
- Deposit requirements
- Allowed perks

**Enhanced Guardrails**:

```typescript
interface EnhancedMerchantGuardrails extends MerchantDealGuardrails {
  // Strategic priorities
  priorityModels: string[];  // Models to actively promote
  experienceCenterPush: boolean;  // Prioritize Tasco Experience Center visits
  promotionalCampaigns: Array<{
    name: string;
    models: string[];
    validFrom: string;
    validTo: string;
    benefits: string[];
    talkingPoints: string[];
  }>;
  
  // Competitive positioning
  competitiveAdvantages: {
    warranty: string;
    serviceNetwork: string;
    financingPartners: string[];
    deliveryTime: string;
  };
  
  // Escalation rules
  humanHandoffTriggers: string[];  // When to escalate to human sales
}
```

#### 4.2 Experience Center Promotion

**AI Behavior**:
- Proactively suggest Experience Center visits after 2-3 meaningful exchanges
- Highlight unique Experience Center benefits:
  - Hands-on interaction with all models
  - Expert consultation without pressure
  - Personalized test drive scheduling
  - Family-friendly environment

**Sample Dialogue**:
```
User: "Tôi đang phân vân giữa EX5 và Monjaro."
AI: "Cả hai đều là lựa chọn tuyệt vời cho nhu cầu của bạn. 
     Để trải nghiệm thực tế, tôi khuyên bạn ghé Tasco Experience Center 
     để ngồi thử cả hai mẫu và lái test. Bạn muốn tôi đặt lịch hẹn cho cuối tuần này không?"
```

#### 4.3 Sales Funnel Progression Tracking

**Intent Signals to Monitor**:
- Price negotiation questions → Ready for quote
- Comparison questions → Needs education, then soft close
- Test drive inquiries → High intent, book immediately
- Timeline questions ("When can I get it?") → Very high intent, prioritize

**Progressive CTAs**:
1. Early conversation → Educational resources
2. Mid-conversation → Comparison tools, spec deep-dives
3. Late conversation → Quote generation, test drive booking
4. Decision mode → Showroom appointment, deposit discussion

---

### Phase 5: Advanced Conversational Features

#### 5.1 Multi-Turn Conversation Memory

**Requirements**:
- Remember user preferences across sessions
- Track previously discussed vehicles
- Recall stated priorities (budget, features, timeline)
- Reference past concerns in new recommendations

**Technical Approach**:
- Store conversation summaries in localStorage (MVP)
- Implement session-based context window management
- Consider backend storage for logged-in users (future)

#### 5.2 Proactive Guidance

**Scenario-Based Prompts**:

| User Profile | Proactive Suggestion |
|--------------|---------------------|
| First-time buyer | "Would you like me to explain the car buying process step by step?" |
| Family shopper | "Should we focus on safety ratings and rear seat space?" |
| Budget-conscious | "I can help you find the best financing options within your budget." |
| EV-curious | "Let me explain charging infrastructure and total cost of ownership." |

#### 5.3 Rich Media Responses

**Future Enhancement**:
- Embed comparison tables directly in chat
- Show image galleries when discussing specific models
- Link to relevant spec sections on page
- Generate personalized shortlists within conversation

---

### Phase 6: Analytics & Continuous Improvement

#### 6.1 Conversation Analytics

**Metrics to Track**:
- Conversation completion rate (did user reach CTA?)
- Average messages per conversation
- Common question categories
- Drop-off points in conversation flow
- Conversion rate: Chat → Quote/Test Drive/Showroom Visit

**Event Tracking Enhancements**:

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
  userSatisfaction?: 1 | 2 | 3 | 4 | 5;  // Post-chat survey
}
```

#### 6.2 A/B Testing Framework

**Test Variables**:
- Conversation tone (formal vs casual)
- CTA timing (early vs late)
- Information density (concise vs detailed)
- Question prompts (open-ended vs specific)

**Success Metrics**:
- Engagement duration
- CTA click-through rate
- Showroom visit conversion
- User satisfaction scores

#### 6.3 Feedback Loop

**Mechanisms**:
1. **Thumbs up/down** after each response
2. **"Was this helpful?"** micro-survey at conversation end
3. **Flag inappropriate/incorrect** responses
4. **Suggest improvement** open text field

**Continuous Learning**:
- Weekly review of flagged conversations
- Monthly prompt template optimization
- Quarterly knowledge base updates

---

## 4. UI/UX Design Specifications

### 4.1 Global Chat Widget Enhancements

**Current State**: Floating button bottom-right, expands to chat panel

**Proposed Improvements**:

1. **Smart Positioning**
   - Desktop: Fixed bottom-right (current)
   - Mobile: Bottom center, above navigation bar
   - Auto-hide on scroll down, show on scroll up

2. **Visual States**
   - **Idle**: Compact button with icon + "Chat AI"
   - **Unread**: Badge indicator for AI responses
   - **Active**: Expanded chat panel
   - **Typing**: Animated dots indicator

3. **Quick Actions Bar** (inside chat)
   ```
   [🚗 View Recommendations] [⚖️ Compare] [💰 Get Quote] [📍 Book Test Drive]
   ```

### 4.2 Spec-Level Interaction Design

**Visual Treatment**:

```css
.interactive-spec-item {
  cursor: pointer;
  border-bottom: 1px dashed #94a3b8;
  transition: all 0.2s ease;
}

.interactive-spec-item:hover {
  background-color: #f1f5f9;
  border-bottom-style: solid;
  color: #0f172a;
}

.interactive-spec-item::after {
  content: "❓";
  font-size: 10px;
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.interactive-spec-item:hover::after {
  opacity: 1;
}
```

**Interaction Flow**:
1. User hovers over spec → Tooltip appears: "Click to ask about this"
2. User clicks → Chat widget opens (if closed) or scrolls to top
3. Input field pre-populated with context-aware question
4. User can edit question or send as-is
5. AI responds with spec-specific explanation

### 4.3 Mobile Optimization

**Responsive Chat Panel**:
- Width: 95vw on mobile, fixed 380px on desktop
- Height: 70vh on mobile, adaptive on desktop
- Keyboard handling: Auto-scroll to keep input visible
- Touch targets: Minimum 44px for all interactive elements

---

## 5. Data Model Extensions

### 5.1 Conversation History Schema

```typescript
interface ConversationHistory {
  id: string;
  userId?: string;  // Optional for logged-in users
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  messages: ConversationMessage[];
  context: {
    profileSnapshot?: UserProfile;
    viewedVehicle?: string;  // modelSlug
    comparedVehicles?: string[];
    shortlistVehicles?: string[];
  };
  outcome?: {
    ctaClicked?: string;
    converted?: boolean;
    rating?: number;
  };
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    specContext?: {
      specKey: string;
      category: string;
      value: string;
    };
    suggestedActions?: string[];
  };
}
```

### 5.2 Educational Content Index

```typescript
interface EducationalTopic {
  id: string;
  keywords: string[];  // Trigger phrases
  category: 'powertrain' | 'safety' | 'efficiency' | 'ownership' | 'comparison';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  explanationTemplates: {
    vi: string[];
    en: string[];
  };
  relatedTopics: string[];
  commonFollowUps: string[];
}
```

---

## 6. Implementation Roadmap

### Sprint 1-2: Spec-Level Q&A (Weeks 1-2)
- [ ] Create `InteractiveSpecItem` component
- [ ] Modify `specSectionsForVehicle.ts` to add interactive metadata
- [ ] Update `VehicleDetailPage.tsx` with clickable specs
- [ ] Enhance AI prompt to handle spec-specific contexts
- [ ] Add visual design (hover states, tooltips)
- [ ] Test across all vehicle detail pages

### Sprint 3-4: Knowledge Base Integration (Weeks 3-4)
- [ ] Build crawler for oto.com.vn (or integrate existing)
- [ ] Design extended vehicle schema
- [ ] Create data normalization pipeline
- [ ] Update AI prompt to handle cross-brand comparisons
- [ ] Implement data quality scoring
- [ ] Add competitive comparison talking points

### Sprint 5-6: Tasco Policy Deep Integration (Weeks 5-6)
- [ ] Extend `merchantGuardrails.ts` with strategic fields
- [ ] Create promotional campaign management in admin
- [ ] Implement Experience Center promotion logic
- [ ] Add sales funnel progression tracking
- [ ] Build escalation rules for human handoff
- [ ] Train AI on Tasco-specific advantages

### Sprint 7-8: Advanced Features (Weeks 7-8)
- [ ] Implement conversation memory (localStorage MVP)
- [ ] Add proactive guidance triggers
- [ ] Build conversation analytics dashboard
- [ ] Create feedback collection mechanisms
- [ ] Optimize mobile UX
- [ ] Performance optimization and testing

### Sprint 9+: Continuous Improvement (Ongoing)
- [ ] A/B testing framework
- [ ] Rich media responses
- [ ] Backend conversation storage
- [ ] Multi-language expansion
- [ ] Voice input capability
- [ ] Integration with CRM/DMS systems

---

## 7. Success Metrics

### 7.1 Primary KPIs

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Chat engagement rate | >40% of visitors | Analytics event tracking |
| Conversation completion | >60% reach 5+ messages | Session analysis |
| CTA click-through | >25% click at least one CTA | Event tracking |
| Showroom visit conversion | >15% of chatters book visit | CRM integration |
| User satisfaction | >4.0/5.0 average | Post-chat surveys |

### 7.2 Secondary KPIs

- Average conversation length
- Questions per category (education vs comparison vs pricing)
- Return visitor rate
- Time to first meaningful action
- Reduction in bounce rate on vehicle detail pages

### 7.3 Business Impact

- **Increased lead quality**: Better-educated visitors = higher conversion
- **Reduced sales cycle**: Pre-qualified leads require less hand-holding
- **Expanded reach**: Serve unlimited concurrent users vs limited sales staff
- **Consistent messaging**: All users receive accurate, policy-compliant information
- **Data insights**: Understand customer questions and concerns at scale

---

## 8. Risk Mitigation

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI API downtime | Medium | High | Fallback to rule-based responses (already implemented) |
| Slow response times | Medium | Medium | Implement streaming responses, optimize context size |
| Incorrect information | Low | High | Regular audits, user flagging system, conservative responses |
| Data synchronization issues | Medium | Medium | Clear data freshness indicators, prioritize official sources |

### 8.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Over-reliance on AI | Medium | Medium | Clear escalation paths to human sales |
| Brand voice inconsistency | Low | Medium | Regular prompt reviews, sample conversation audits |
| Customer frustration with limitations | Low | Medium | Set clear expectations, offer human alternative |
| Competitive response | High | Low | First-mover advantage, continuous improvement |

### 8.3 Ethical Considerations

- **Transparency**: Always disclose AI nature of assistant
- **Privacy**: Minimal data collection, clear privacy policy
- **Bias prevention**: Regular audits for fair treatment across user segments
- **Accuracy**: Never fabricate specifications or pricing
- **Pressure-free**: Respect user autonomy, avoid aggressive sales tactics

---

## 9. Appendix

### 9.1 Sample Conversation Flows

#### Flow 1: Beginner Education
```
User: "Động cơ V8 là gì?"
AI: "Động cơ V8 có 8 xi-lanh xếp hình chữ V, cho công suất mạnh và âm thanh đặc trưng. 
     Thường dùng cho xe sang hoặc xe thể thao. Trong tầm giá của bạn, 
     Monjaro với động cơ 2.0L turbo cũng mang lại hiệu năng tương đương 
     mà tiết kiệm nhiên liệu hơn. Bạn muốn tìm hiểu sâu hơn về công nghệ động cơ không?"
→ CTA: [Xem thông số Monjaro] [So sánh với xe khác]
```

#### Flow 2: Comparison Request
```
User: "So sánh VinFast VF8 và BYD Atto 3 giúp mình."
AI: "Cả hai đều là SUV điện đáng cân nhắc:
     - VF8: Thiết kế thể thao, phạm vi ~400km, bảo hành 10 năm
     - Atto 3: Nội thất độc đáo, phạm vi ~420km, giá cạnh tranh hơn
     
     Tuy nhiên, khi mua xe tại Tasco, bạn được hưởng:
     ✓ Mạng lưới dịch vụ toàn quốc
     ✓ Hỗ trợ tài chính linh hoạt
     ✓ Chính sách bảo hành minh bạch
     
     Bạn muốn trải nghiệm thực tế cả hai mẫu tại Tasco Experience Center không?"
→ CTA: [Đặt lịch test drive] [Nhận báo giá chi tiết]
```

#### Flow 3: Spec-Specific Query
```
[User clicks "400+ km WLTP" on EX5]
AI: "Phạm vi 400km WLTP của EX5 đủ cho hầu hết nhu cầu hàng tuần. 
     Ví dụ:
     - Đi làm hàng ngày (40km): Sạc 1 lần/tuần
     - Du lịch cuối tuần (200km): Vẫn dư 50% pin
     - Đường dài: Trạm sạc nhanh 10-80% trong 30 phút mỗi 300km
     
     Bạn thường di chuyển quãng đường bao nhiêu km mỗi ngày?"
→ CTA: [Tính toán chi phí sạc] [Tìm trạm sạc gần bạn]
```

### 9.2 Prompt Template Examples

See existing templates:
- `/workspace/prompt/en/carmatch-ai-assistant-system-prompt.txt`
- `/workspace/prompt/vi/carmatch-ai-assistant-system-prompt.txt`

### 9.3 Related Documentation

- Product Requirements Document: `/workspace/carmatch-prd.md`
- System Architecture Diagram: `/workspace/CarMatch.drawio.png`
- Current Implementation: `/workspace/src/`

---

## 10. Conclusion

This AI Sales Agent Optimization Plan provides a comprehensive roadmap for transforming CarMatch into a truly intelligent, conversational car buying assistant. By implementing these phases systematically, we will:

1. **Empower users** with accessible, judgment-free automotive education
2. **Streamline the sales funnel** from curiosity to showroom visit
3. **Differentiate Tasco** through innovative, customer-centric technology
4. **Generate actionable insights** from conversation analytics
5. **Scale personalized consultation** without proportional staff increases

The foundation is already in place with the Global Chat Widget and AI integration. The next phases will deepen the intelligence, expand the knowledge base, and refine the user experience to create a best-in-class digital sales assistant.

**Next Steps**:
1. Review and approve this plan with stakeholders
2. Prioritize Phase 2 (Spec-Level Q&A) for immediate development
3. Begin crawler development for Phase 3 (Market Data)
4. Schedule weekly check-ins to track progress and adjust priorities

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Author: AI Development Team*
