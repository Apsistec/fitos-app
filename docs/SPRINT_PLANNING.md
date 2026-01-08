# FitOS Sprint Planning & Roadmap

**Updated:** January 2026  
**Current Sprint:** Sprint 6.5 (Phase 1 Polish)

---

## Phase Overview

| Phase | Sprints | Status | Focus |
|-------|---------|--------|-------|
| Phase 1 | 0-6 | ✅ Complete | MVP Core Features |
| Phase 1.5 | 6.5 | 🔄 In Progress | Polish, Dark Mode, Bug Fixes |
| Phase 2 | 7-16 | 📋 Planned | AI, Voice, CRM, Differentiation |

---

## Sprint 6.5: Phase 1 Polish (Current)

**Duration:** 1 week  
**Goal:** Fix dark mode issues, polish UI, prepare for Phase 2

### Epic P1: Dark Mode Fixes
**Priority:** P0 | **Points:** 8

| Task | Status | Assignee |
|------|--------|----------|
| Update variables.scss with dark-first colors | ⬜ | - |
| Fix Settings page header contrast | ⬜ | - |
| Fix dropdown selector backgrounds (white → dark) | ⬜ | - |
| Fix Privacy/Terms page body text contrast | ⬜ | - |
| Replace nutrition red "over" with purple | ⬜ | - |
| Add accent glow effects to active states | ⬜ | - |
| Update StatusBar for dark mode (iOS/Android) | ⬜ | - |
| Test on OLED devices | ⬜ | - |

### Epic P2: Adherence-Neutral Updates  
**Priority:** P0 | **Points:** 5

| Task | Status | Assignee |
|------|--------|----------|
| Audit all nutrition color usage | ⬜ | - |
| Update NutritionSummaryComponent | ⬜ | - |
| Update progress bar styles | ⬜ | - |
| Remove judgmental copy ("over", "bad") | ⬜ | - |
| Add weekly average view (more forgiving) | ✅ | - |

### Epic P3: Performance Audit
**Priority:** P1 | **Points:** 5

| Task | Status | Assignee |
|------|--------|----------|
| Verify OnPush on all components | ⬜ | - |
| Add virtual scrolling to exercise library | ⬜ | - |
| Verify lazy loading all feature modules | ⬜ | - |
| Add trackBy to remaining *ngFor loops | ⬜ | - |
| Lighthouse audit (target 90+) | ⬜ | - |

### Sprint 6.5 Definition of Done
- [ ] All text passes WCAG AA contrast (4.5:1+ body, 7:1+ metrics)
- [ ] No red colors in nutrition tracking
- [ ] Dark mode default on fresh install
- [ ] Lighthouse Performance 90+
- [ ] No console errors/warnings

---

## Sprint 7: Design System Refresh

**Duration:** 2 weeks  
**Goal:** Implement new dark-first design system

### Epic 11.1: Color System Implementation
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Create _design-tokens.scss | 3 | All CSS custom properties |
| Update variables.scss | 5 | Ionic variable mappings |
| Create theme toggle service | 3 | Dark/light/system preference |
| Update all ion-card backgrounds | 2 | Use --fitos-bg-secondary |

### Epic 11.2: Typography Update
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Add Inter font (or system fallback) | 2 | Variable weight 300-700 |
| Create typography utility classes | 3 | .fitos-heading-1, .fitos-body, etc. |
| Update metric displays | 2 | Monospace for numbers |
| Audit heading hierarchy | 1 | Consistent H1→H6 usage |

### Epic 11.3: Component Refresh
**Priority:** P1 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Create .fitos-card base styles | 3 | Glow effects, hover states |
| Update StatCard component | 2 | New typography, spacing |
| Create hero card variant | 3 | For today's workout |
| Update button variants | 3 | Primary, secondary, ghost |
| Add skeleton loading patterns | 2 | Consistent across app |

### Sprint 7 Deliverables
- [ ] Design tokens documented and implemented
- [ ] All cards use new styling
- [ ] Dark mode is visually polished
- [ ] Typography is consistent

---

## Sprint 8: Voice Workout Logging

**Duration:** 2 weeks  
**Goal:** Enable hands-free workout logging

### Epic 12.1: Deepgram Integration
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Set up Deepgram account | 1 | API keys, project setup |
| Create VoiceService | 5 | WebSocket streaming, STT |
| Add microphone permissions | 2 | Capacitor permissions |
| Implement keyword boosting | 3 | Fitness vocabulary |
| Add TTS feedback (Aura) | 2 | Confirmation responses |

### Epic 12.2: Workout Voice Commands
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Create intent parser | 5 | Parse "10 reps at 185" |
| Implement "repeat" command | 2 | Duplicate last set |
| Implement "skip" command | 2 | Skip exercise |
| Implement "next" command | 2 | Advance to next |
| Add timer commands | 2 | Start/stop rest |

### Epic 12.3: Voice Logger UI
**Priority:** P0 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Create VoiceLoggerComponent | 3 | Mic button, transcript |
| Add to active workout page | 2 | Integration |
| Show real-time transcript | 2 | With confidence indicator |
| Add haptic feedback | 1 | On successful log |

### Sprint 8 Deliverables
- [ ] Voice logging works end-to-end
- [ ] >90% accuracy on common commands
- [ ] Works in gym environment (noise handling)

---

## Sprint 9: Voice/AI Nutrition Logging

**Duration:** 2 weeks  
**Goal:** Natural language food logging

### Epic 13.1: Natural Language Parser
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Integrate Nutritionix NLP API | 5 | 90% accuracy target |
| Create NL parsing service | 3 | Transform text → foods |
| Handle portion estimation | 3 | "fist-sized", "handful" |
| Support multi-food entries | 2 | "eggs, toast, and coffee" |

### Epic 13.2: Voice Food Logging
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Add voice to nutrition page | 3 | Reuse VoiceService |
| Create food-specific parser | 3 | Different intents |
| Build confirmation UI | 2 | Editable breakdown |

### Epic 13.3: AI Describe Feature
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Create AI description endpoint | 3 | Claude/GPT-4 backend |
| Build restaurant knowledge | 3 | Common menu items |
| Handle vague descriptions | 2 | Clarifying questions |

### Sprint 9 Deliverables
- [ ] "Two eggs and toast" logs correctly
- [ ] "Lunch at Chipotle" provides estimate
- [ ] Voice input works for food

---

## Sprint 10: Photo Nutrition AI

**Duration:** 2 weeks  
**Goal:** Snap photo to log meal

### Epic 14.1: Photo Recognition
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Evaluate/integrate Passio AI | 5 | Or SnapCalorie |
| Create photo capture flow | 3 | Capacitor Camera |
| Build results UI | 3 | Editable food list |
| Handle multi-food plates | 2 | Multiple items |

### Epic 14.2: Portion Estimation
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Implement depth estimation | 3 | LiDAR if available |
| Add reference objects | 2 | For scale |
| Allow manual adjustment | 2 | User correction |
| Learn from corrections | 1 | Improve over time |

### Sprint 10 Deliverables
- [ ] Photo → food breakdown in <3 seconds
- [ ] 85%+ accuracy on common foods
- [ ] Transparent breakdown (not opaque)

---

## Sprint 11: CRM Foundation

**Duration:** 2 weeks  
**Goal:** Lead tracking for trainers

### Epic 15.1: Lead Pipeline
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Create leads database schema | 3 | Tables, indexes, RLS |
| Build LeadService | 3 | CRUD operations |
| Create Kanban UI | 5 | Drag-drop stages |
| Implement source tracking | 2 | Attribution |

### Epic 15.2: Lead Capture Forms
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Create form builder | 3 | Customizable fields |
| Generate embed code | 2 | Iframe/JS snippet |
| Auto-create leads | 2 | On form submit |
| Lead magnet support | 1 | PDF download |

### Epic 15.3: Lead Activities
**Priority:** P1 | **Points:** 5

| Task | Est | Description |
|------|-----|-------------|
| Create activities table | 2 | Activity tracking |
| Build timeline UI | 2 | Lead detail page |
| Auto-log stage changes | 1 | Activity entries |

### Sprint 11 Deliverables
- [ ] Visual lead pipeline
- [ ] Embeddable lead forms
- [ ] Source attribution tracking

---

## Sprint 12: Email Marketing

**Duration:** 2 weeks  
**Goal:** Built-in email campaigns

### Epic 16.1: Email Infrastructure
**Priority:** P0 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Integrate Resend/SendGrid | 3 | Email provider |
| Create templates table | 2 | Database schema |
| Build template editor | 5 | WYSIWYG |
| Implement sending service | 3 | Edge Function |

### Epic 16.2: Email Sequences
**Priority:** P1 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Create sequences schema | 2 | Multi-step campaigns |
| Build sequence builder UI | 5 | Visual timeline |
| Implement delay logic | 3 | Send after X days |
| Add trigger conditions | 3 | lead_created, etc. |

### Epic 16.3: Email Analytics
**Priority:** P1 | **Points:** 5

| Task | Est | Description |
|------|-----|-------------|
| Track opens/clicks | 2 | Webhooks |
| Build analytics dashboard | 3 | Metrics display |

### Sprint 12 Deliverables
- [ ] Email template editor
- [ ] Automated welcome sequence
- [ ] Open/click tracking

---

## Sprint 13: AI Coaching Chatbot

**Duration:** 2 weeks  
**Goal:** GPT-4 powered coaching

### Epic 17.1: AI Agent Backend
**Priority:** P0 | **Points:** 21

| Task | Est | Description |
|------|-----|-------------|
| Set up LangGraph service | 5 | Cloud Run deployment |
| Create chat database | 2 | Conversations table |
| Implement RAG | 8 | User data retrieval |
| Build multi-agent router | 5 | workout/nutrition/recovery |
| Add trainer methodology | 1 | Custom prompts |

### Epic 17.2: Chat UI
**Priority:** P0 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Create chat page | 3 | Message list + input |
| Add typing indicator | 2 | While AI processes |
| Support quick actions | 2 | Suggested questions |
| Add voice input | 1 | Reuse VoiceService |

### Sprint 13 Deliverables
- [ ] AI coaching chatbot works
- [ ] Routes to appropriate specialist
- [ ] Knows user history

---

## Sprint 14: Proactive Interventions

**Duration:** 2 weeks  
**Goal:** JITAI nudges

### Epic 18.1: Intervention Engine
**Priority:** P1 | **Points:** 13

| Task | Est | Description |
|------|-----|-------------|
| Create intervention rules | 5 | Vulnerability scoring |
| Implement receptivity check | 3 | Right moment detection |
| Add frequency caps | 2 | Max 2-3/day |
| Create intervention templates | 3 | AI-generated copy |

### Epic 18.2: Notification Delivery
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Create notification service | 3 | Push + in-app |
| Personalize messages | 3 | User history |
| Track engagement | 2 | Response rates |

### Sprint 14 Deliverables
- [ ] Proactive workout reminders
- [ ] Smart timing (not annoying)
- [ ] Personalized copy

---

## Sprint 15: Apple Watch

**Duration:** 2 weeks  
**Goal:** Wrist-based logging

### Epic 19.1: Watch App Foundation
**Priority:** P1 | **Points:** 21

| Task | Est | Description |
|------|-----|-------------|
| Create watchOS target | 3 | Xcode project |
| Implement WatchConnectivity | 5 | Phone-watch sync |
| Build workout complication | 5 | Today's workout glance |
| Create logging interface | 5 | Haptic-driven |
| Sync data to phone | 3 | Background sync |

### Sprint 15 Deliverables
- [ ] Watch shows today's workout
- [ ] Can log sets from wrist
- [ ] Syncs with phone app

---

## Sprint 16: Polish & Launch

**Duration:** 2 weeks  
**Goal:** Production ready

### Epic 20.1: Performance
**Priority:** P0 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Final performance audit | 3 | Lighthouse, profiling |
| Bundle size optimization | 2 | Tree shaking |
| Image optimization | 2 | WebP, lazy load |
| Fix any remaining jank | 1 | 60fps target |

### Epic 20.2: Accessibility
**Priority:** P1 | **Points:** 8

| Task | Est | Description |
|------|-----|-------------|
| Automated a11y audit | 2 | Axe, Lighthouse |
| VoiceOver/TalkBack testing | 3 | Manual testing |
| Fix identified issues | 3 | Remediation |

### Epic 20.3: Celebrations
**Priority:** P1 | **Points:** 5

| Task | Est | Description |
|------|-----|-------------|
| Workout completion confetti | 2 | Animation + haptic |
| PR celebration | 2 | Personal record |
| Streak milestone | 1 | 7, 30, 100 days |

### Sprint 16 Deliverables
- [ ] Lighthouse 90+ all categories
- [ ] WCAG 2.1 AA compliant
- [ ] Celebration animations
- [ ] Ready for app store submission

---

## Velocity & Capacity

**Assumed Velocity:** 40 points/sprint (1 developer)

| Sprint | Points | Focus |
|--------|--------|-------|
| 6.5 | 18 | Polish |
| 7 | 34 | Design System |
| 8 | 34 | Voice Workout |
| 9 | 29 | Voice Nutrition |
| 10 | 21 | Photo AI |
| 11 | 26 | CRM |
| 12 | 31 | Email |
| 13 | 29 | AI Chat |
| 14 | 21 | JITAI |
| 15 | 21 | Watch |
| 16 | 21 | Polish |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Deepgram accuracy in gym | Medium | High | Test with gym audio, add noise handling |
| Photo AI accuracy | Medium | Medium | Start with common foods, expand |
| LangGraph complexity | Medium | High | Start simple, iterate |
| Apple Watch approval | Low | Medium | Follow HIG, test thoroughly |
| API costs at scale | Medium | Medium | Cache aggressively, rate limit |

---

## Success Metrics

| Metric | Phase 1 Target | Phase 2 Target |
|--------|---------------|----------------|
| User retention (30 day) | 40% | 60% |
| Workout completion rate | 50% | 70% |
| Voice logging adoption | - | 40% |
| CRM feature usage | - | 60% |
| App store rating | 4.0+ | 4.5+ |
| Lighthouse Performance | 85+ | 90+ |
