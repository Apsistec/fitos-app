# FitOS Sprint Planning v3.0

**Updated:** January 2026  
**Current Sprint:** Sprint 16 (Polish & Launch Prep)  
**Status:** Phase 2 Complete, Phase 3 Planned

---

## Phase Overview

| Phase | Sprints | Status | Focus |
|-------|---------|--------|-------|
| Phase 1 | 0-6 | ✅ Complete | MVP Core Features |
| Phase 1.5 | 6.5 | ✅ Complete | Polish, Dark Mode, Adherence-Neutral |
| Phase 2A | 7-10 | ✅ Complete | Voice AI, Photo Nutrition, Design System |
| Phase 2B | 11-12 | ✅ Complete | CRM, Email Marketing |
| Phase 2C | 13-14 | ✅ Complete | AI Coaching, JITAI |
| Phase 2D | 15-16 | 🔄 In Progress | Apple Watch, Launch Prep |
| Phase 3A | 17-20 | 📋 Planned | Differentiation Features |
| Phase 3B | 21-24 | 📋 Planned | Advanced AI & Scale |
| Phase 3C | 25-28 | 📋 Planned | Market Expansion |

---

## Completed Sprints Summary

### Phase 1: MVP Core (Sprints 0-6) ✅

- User authentication (Supabase Auth)
- Trainer/client role system
- Workout builder and templates
- Exercise library
- Client management
- Basic nutrition tracking
- Progress tracking
- Messaging system
- Settings and profile

### Sprint 6.5: Phase 1 Polish ✅

- Dark mode as default
- Adherence-neutral colors (purple instead of red for "over")
- WCAG contrast fixes
- Performance optimizations (OnPush, virtual scrolling)

### Sprint 7: Design System Refresh ✅

- Design tokens system (`_design-tokens.scss`)
- Dark-first color system
- Typography scale
- Card components with glow effects
- Skeleton loading patterns
- Theme service (dark/light/system)

### Sprint 8: Voice Workout Logging ✅

**Implemented:**
- `VoiceService` with Deepgram WebSocket streaming
- Voice command parser for workout intents
- `VoiceLoggerComponent` with pulsing animation
- Fitness keyword boosting
- Haptic feedback on successful recognition
- TTS confirmation via Deepgram Aura

**Files:**
- `core/services/voice.service.ts`
- `shared/components/voice-logger/`
- `ai-backend/app/routes/voice.py`

### Sprint 9: Voice & AI Nutrition Logging ✅

**Implemented:**
- `NutritionParserService` with Nutritionix NLP
- Voice input for nutrition logging
- `VoiceNutritionComponent`
- Food confirmation UI
- Multi-food entry support
- Portion estimation

**Files:**
- `core/services/nutrition-parser.service.ts`
- `features/nutrition/components/voice-nutrition/`
- `shared/components/food-confirmation/`

### Sprint 10: Photo Nutrition AI ✅

**Implemented:**
- `PhotoNutritionService` with Passio AI
- Photo capture flow (Capacitor Camera)
- `FoodIdentificationResultsComponent`
- Multi-food plate detection
- Confidence scores display
- Manual portion adjustment

**Files:**
- `core/services/photo-nutrition.service.ts`
- `features/nutrition/components/photo-capture/`
- `features/nutrition/components/food-identification-results/`

### Sprint 11: CRM Foundation ✅

**Implemented:**
- `LeadService` with full CRUD
- Lead pipeline Kanban UI
- Lead detail page with activity timeline
- Lead capture form builder
- UTM parameter tracking
- Source attribution

**Files:**
- `core/services/lead.service.ts`
- `features/crm/pages/crm/` (pipeline)
- `features/crm/pages/lead-detail/`
- `features/crm/pages/form-builder/`

### Sprint 12: Email Marketing ✅

**Implemented:**
- `EmailService` with Resend integration
- Email template editor
- Pre-built templates (welcome, nurture, win-back)
- Email sequences (automated campaigns)
- Open/click tracking
- Email analytics dashboard

**Files:**
- `core/services/email.service.ts`
- `features/crm/pages/email-campaigns/`

### Sprint 13: AI Coaching Chatbot ✅

**Implemented:**
- `AICoachService` with LangGraph backend
- Multi-agent router (workout/nutrition/recovery/motivation)
- RAG for user data retrieval
- `AIChatComponent` with typing indicator
- Quick action buttons
- Trainer methodology customization
- Escalate to trainer functionality

**Files:**
- `core/services/ai-coach.service.ts`
- `features/coaching/components/ai-chat/`
- `ai-backend/app/agents/coach_graph.py`
- `ai-backend/app/agents/specialists.py`
- `ai-backend/app/routes/coach.py`

### Sprint 14: JITAI Proactive Interventions ✅

**Implemented:**
- `JITAIService` with intervention engine
- Vulnerability/receptivity/opportunity scoring
- Frequency caps (max 3/day)
- Push notification delivery
- Personalized intervention messages
- At-risk client alerts for trainers
- Engagement scoring

**Files:**
- `core/services/jitai.service.ts`
- `ai-backend/app/routes/jitai.py`

### Sprint 15: Apple Watch & Wearables ✅

**Implemented:**
- `WatchService` with WatchConnectivity
- `HealthKitService` for Health Connect + HealthKit
- `TerraService` for Garmin/WHOOP/Oura
- `WearableDataCard` component
- Today's workout on watch
- Quick-log from wrist
- Phone-watch sync

**Files:**
- `core/services/watch.service.ts`
- `core/services/healthkit.service.ts`
- `core/services/terra.service.ts`
- `shared/components/wearable-data-card/`

---

## Sprint 16: Polish & Launch Prep (Current) 🔄

**Goal:** Production-ready application

### Epic 16.1: Performance Optimization
| Task | Points | Status |
|------|--------|--------|
| Final Lighthouse audit (90+) | 3 | ⬜ |
| Bundle size optimization | 3 | ⬜ |
| Image optimization (WebP, lazy load) | 2 | ⬜ |
| Fix remaining jank (60fps) | 3 | ⬜ |

### Epic 16.2: Accessibility
| Task | Points | Status |
|------|--------|--------|
| Automated a11y audit (Axe, Lighthouse) | 2 | ⬜ |
| VoiceOver/TalkBack testing | 5 | ⬜ |
| Fix accessibility issues | 5 | ⬜ |

### Epic 16.3: Celebration Animations
| Task | Points | Status |
|------|--------|--------|
| Workout completion confetti | 3 | ⬜ |
| Personal record celebration | 3 | ⬜ |
| Streak milestones (7, 30, 100 days) | 2 | ⬜ |

### Epic 16.4: App Store Prep
| Task | Points | Status |
|------|--------|--------|
| App Store screenshots and metadata | 3 | ⬜ |
| Play Store listing | 3 | ⬜ |
| Privacy policy updates | 2 | ⬜ |
| TestFlight beta distribution | 2 | ⬜ |

**Sprint 16 Total:** 41 points

---

## Phase 3A: Differentiation (Sprints 17-20) 📋

### Sprint 17: "Coach Brain" AI Assistant
**Goal:** AI that sounds like the trainer, not a generic chatbot  
**Duration:** 2 weeks  
**Strategic Value:** Unlike WHOOP Coach's generic responses

### Epic 17.1: Trainer Methodology Learning
| Task | Points | Status |
|------|--------|--------|
| Create `trainer_methodology` database table | 3 | ⬜ |
| Build methodology questionnaire UI | 5 | ⬜ |
| Implement RAG pipeline for trainer voice | 8 | ⬜ |
| Create prompt engineering templates | 5 | ⬜ |
| Build methodology analyzer for historical programs | 5 | ⬜ |
| Add trainer approval workflow | 3 | ⬜ |

### Epic 17.2: AI Voice Customization
| Task | Points | Status |
|------|--------|--------|
| Create methodology setup wizard | 5 | ⬜ |
| Build sample conversation preview | 3 | ⬜ |
| Implement voice testing interface | 3 | ⬜ |
| Add response editing workflow | 3 | ⬜ |

**Sprint 17 Total:** 43 points

**Success Metrics:**
- AI response accuracy: 85%+
- Trainer satisfaction with AI voice: 4.5/5
- Client perception of continuity: 90%+

---

### Sprint 18: Progressive Autonomy Transfer
**Goal:** Systematically reduce client dependency (SDT-aligned)  
**Duration:** 2 weeks  
**Research:** Filipino adolescent study 2025 (autonomy d=1.72)

### Epic 18.1: Client Independence Scoring
| Task | Points | Status |
|------|--------|--------|
| Create autonomy score calculation engine | 5 | ⬜ |
| Build independence assessment questionnaire | 3 | ⬜ |
| Implement workout creation capability scoring | 3 | ⬜ |
| Create nutrition self-management scoring | 3 | ⬜ |
| Build trainer dashboard for client readiness | 5 | ⬜ |

### Epic 18.2: Maintenance Mode
| Task | Points | Status |
|------|--------|--------|
| Create reduced-price maintenance tier | 3 | ⬜ |
| Build quarterly check-in scheduling | 3 | ⬜ |
| Implement on-demand consultation booking | 3 | ⬜ |
| Create graduation celebration animations | 2 | ⬜ |
| Add re-engagement pathway | 3 | ⬜ |

**Sprint 18 Total:** 33 points

**Success Metrics:**
- Client self-efficacy increase: 30%+
- Voluntary maintenance conversion: 40%+
- Client satisfaction with graduation: 4.5/5

---

### Sprint 19: Adaptive Streak Healing
**Goal:** Research-backed engagement that forgives, not punishes  
**Duration:** 2 weeks  
**Research:** UCL/Loughborough 2024 - streak breaks "especially demotivating"

### Epic 19.1: Forgiveness-First Streak System
| Task | Points | Status |
|------|--------|--------|
| Refactor streak system from daily to weekly | 5 | ⬜ |
| Implement streak repair mechanisms | 5 | ⬜ |
| Create "grace days" for life events | 3 | ⬜ |
| Build consistency band visualization | 5 | ⬜ |
| Add streak milestone celebrations | 3 | ⬜ |
| Implement forgiveness messaging UI | 3 | ⬜ |

### Epic 19.2: Smart Recovery Day Integration
| Task | Points | Status |
|------|--------|--------|
| Detect planned rest days (don't count against streak) | 3 | ⬜ |
| Integrate wearable recovery data for auto-rest | 5 | ⬜ |
| Create "active recovery" options | 3 | ⬜ |
| Build deload week support | 3 | ⬜ |

**Sprint 19 Total:** 38 points

**Success Metrics:**
- Streak continuation post-miss: +40% vs. current
- User sentiment on streaks: 4.5/5 positive
- Weekly retention improvement: +15%

---

### Sprint 20: Coach-Client Video Feedback
**Goal:** Async form correction addressing AI's #1 limitation  
**Duration:** 2 weeks  
**Strategic Value:** Cannot be replicated by AI alone

### Epic 20.1: Video Submission System
| Task | Points | Status |
|------|--------|--------|
| Create video upload flow (Capacitor + Supabase Storage) | 5 | ⬜ |
| Build video compression pipeline (<50MB) | 5 | ⬜ |
| Implement trainer annotation tools | 8 | ⬜ |
| Create video playback with annotations | 5 | ⬜ |
| Build common corrections library | 3 | ⬜ |

### Epic 20.2: Video Feedback Workflow
| Task | Points | Status |
|------|--------|--------|
| Implement video retention policy | 2 | ⬜ |
| Add video request feature | 3 | ⬜ |
| Create notification system for feedback | 3 | ⬜ |
| Build trainer response time tracking | 2 | ⬜ |

**Sprint 20 Total:** 36 points

**Success Metrics:**
- Video submission rate: 20%+ of clients
- Form correction satisfaction: 4.5/5
- Response time: <24 hours average

---

## Phase 3B: Advanced AI & Scale (Sprints 21-24) 📋

### Sprint 21: Wearable Recovery Integration
**Goal:** Auto-adjust workout intensity based on HRV/sleep

| Epic | Points | Focus |
|------|--------|-------|
| Recovery score calculation | 15 | HRV, sleep, HR analysis |
| Auto-intensity adjustment | 12 | Workout modification |
| Trainer recovery alerts | 8 | Dashboard widgets |
| **Total** | **35** | |

---

### Sprint 22: Natural Language Program Design
**Goal:** Text/voice-to-workout program converter

| Epic | Points | Focus |
|------|--------|-------|
| Program generation AI | 15 | GPT-4 prompt engineering |
| PDF import with OCR | 8 | Tesseract integration |
| Voice-to-program flow | 8 | Deepgram + AI chain |
| **Total** | **31** | |

---

### Sprint 23: Local SEO Automation
**Goal:** 46% of Google searches are local

| Epic | Points | Focus |
|------|--------|-------|
| Google Business Profile API | 10 | Auto-generation |
| Schema.org structured data | 5 | Trainer pages |
| Review automation | 8 | Post-milestone triggers |
| **Total** | **23** | |

---

### Sprint 24: Integration Marketplace
**Goal:** Compete on core UX, not ecosystem lock-in

| Epic | Points | Focus |
|------|--------|-------|
| Integration framework | 12 | Architecture |
| MyFitnessPal sync | 8 | Nutrition data |
| Calendly integration | 5 | Scheduling |
| Zapier webhooks | 8 | Automation |
| **Total** | **33** | |

---

## Phase 3C: Market Expansion (Sprints 25-28) 📋

### Sprint 25: Gym Owner Business Analytics
**Goal:** Expand TAM to studio owners

| Epic | Points | Focus |
|------|--------|-------|
| Multi-trainer dashboard | 12 | Owner view |
| Revenue analytics | 10 | Per-trainer breakdown |
| Retention cohort analysis | 8 | Client lifecycle |
| **Total** | **30** | |

---

### Sprint 26: Outcome-Based Pricing Tier
**Goal:** Align platform success with trainer success

| Epic | Points | Focus |
|------|--------|-------|
| Result verification system | 10 | Progress tracking |
| Outcome tier pricing logic | 8 | Stripe integration |
| Success celebration | 5 | Client achievements |
| **Total** | **23** | |

---

### Sprint 27: Advanced Gamification
**Goal:** Research shows +489 steps/day with gamification

| Epic | Points | Focus |
|------|--------|-------|
| Activity-based leaderboards | 8 | Not appearance |
| Weekly challenges | 10 | With repair mechanisms |
| Supportive community | 8 | Privacy-first |
| **Total** | **26** | |

---

### Sprint 28: Enterprise Readiness
**Goal:** Position for corporate wellness market

| Epic | Points | Focus |
|------|--------|-------|
| SSO integration | 12 | SAML/OIDC |
| Admin dashboard | 10 | Organization management |
| Compliance reporting | 8 | SOC2 preparation |
| **Total** | **30** | |

---

## Feature Inventory

### Core Services Implemented

| Service | Purpose | Status |
|---------|---------|--------|
| `auth.service.ts` | Supabase authentication | ✅ |
| `supabase.service.ts` | Database client | ✅ |
| `client.service.ts` | Client management | ✅ |
| `workout.service.ts` | Workout CRUD | ✅ |
| `workout-session.service.ts` | Active workout tracking | ✅ |
| `exercise.service.ts` | Exercise library | ✅ |
| `nutrition.service.ts` | Nutrition logging | ✅ |
| `food.service.ts` | Food database | ✅ |
| `measurement.service.ts` | Progress measurements | ✅ |
| `messaging.service.ts` | In-app messaging | ✅ |
| `voice.service.ts` | Deepgram voice AI | ✅ |
| `nutrition-parser.service.ts` | NLP food parsing | ✅ |
| `photo-nutrition.service.ts` | Photo food recognition | ✅ |
| `lead.service.ts` | CRM leads | ✅ |
| `email.service.ts` | Email marketing | ✅ |
| `ai-coach.service.ts` | AI coaching chat | ✅ |
| `jitai.service.ts` | Proactive interventions | ✅ |
| `healthkit.service.ts` | Health Connect/HealthKit | ✅ |
| `terra.service.ts` | Third-party wearables | ✅ |
| `watch.service.ts` | Apple Watch | ✅ |
| `theme.service.ts` | Dark/light mode | ✅ |
| `haptic.service.ts` | Haptic feedback | ✅ |
| `stripe.service.ts` | Payments | ✅ |
| `subscription.service.ts` | Subscription management | ✅ |

### Phase 3 Services (Planned)

| Service | Purpose | Sprint |
|---------|---------|--------|
| `coach-brain.service.ts` | Trainer methodology AI | 17 |
| `autonomy.service.ts` | Client independence scoring | 18 |
| `streak.service.ts` | Adaptive streak healing | 19 |
| `video-feedback.service.ts` | Form check videos | 20 |
| `recovery.service.ts` | Wearable recovery scoring | 21 |
| `program-generator.service.ts` | NL program design | 22 |
| `local-seo.service.ts` | SEO automation | 23 |
| `integration.service.ts` | Third-party integrations | 24 |

---

## Success Metrics Targets

### Current (Phase 2 Complete)
| Metric | Target | Status |
|--------|--------|--------|
| User retention (30 day) | 60% | TBD |
| Workout completion rate | 70% | TBD |
| Voice logging adoption | 40% | TBD |
| CRM feature usage | 60% | TBD |
| App store rating | 4.5+ | TBD |
| Lighthouse Performance | 90+ | TBD |

### Phase 3A Targets
| Metric | Target |
|--------|--------|
| Coach Brain approval rate | 85%+ |
| Streak continuation post-miss | +40% |
| Video submission rate | 20%+ clients |
| Maintenance mode conversion | 40%+ |

### Phase 3B Targets
| Metric | Target |
|--------|--------|
| Recovery-adjusted adoption | 60%+ |
| Program creation time | -70% |
| Local search visibility | +50% |
| Integration adoption | 40%+ trainers |

### Phase 3C Targets
| Metric | Target |
|--------|--------|
| Gym owner adoption | 15%+ |
| Challenge participation | 40%+ |
| Enterprise conversion | 20%+ |
| Overall app rating | 4.7+ |

---

## Launch Checklist

### Technical
- [ ] Lighthouse Performance 90+
- [ ] Lighthouse Accessibility 100
- [ ] Bundle size < 2MB initial
- [ ] API response times < 200ms P95
- [ ] Crash rate < 0.1%
- [ ] All E2E tests passing

### App Store
- [ ] App Store Connect metadata complete
- [ ] Screenshots for all device sizes
- [ ] App preview videos
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] TestFlight beta tested

### Play Store
- [ ] Google Play Console listing complete
- [ ] Screenshots and graphics
- [ ] Privacy policy
- [ ] Data safety section
- [ ] Internal testing track

### Marketing
- [ ] Landing page live
- [ ] Pre-launch email sequence
- [ ] Social media accounts
- [ ] Press kit ready

---

## Related Documentation

- `ROADMAP.md` - Strategic overview and timeline
- `PHASE1_BACKLOG.md` - MVP features (complete)
- `PHASE2_BACKLOG.md` - AI/CRM features (complete)
- `PHASE3_BACKLOG.md` - Differentiation features (planned)
- `MARKET_RESEARCH_REPORT.md` - Competitive analysis
- `COST_ANALYSIS.md` - Infrastructure costs
- `AI_INTEGRATION.md` - Voice, photo, coaching architecture
