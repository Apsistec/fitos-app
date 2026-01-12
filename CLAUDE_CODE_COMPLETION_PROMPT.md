# FitOS Phase 2 Completion Prompt

## CONTEXT

You are completing FitOS, an AI-powered fitness coaching platform. A comprehensive assessment (`docs/IMPLEMENTATION_ASSESSMENT.md`) reveals the project is **68% complete** with critical features missing.

**Repository:** `~/Dev/fitos-app`
**Stack:** Angular 21, Ionic 8, Capacitor 6, TypeScript 5.8, Supabase, LangGraph

---

## IMMEDIATE FIRST STEP

Commit all existing work:

```bash
cd ~/Dev/fitos-app
git add .
git commit -m "docs: Add implementation assessment - 68% complete

- Comprehensive audit against research findings
- Graded each category (Design A, Voice D, CRM C-, etc.)
- Identified 440 points remaining across 10 sprints
- Created detailed sprint plan for completion"
git push origin main
```

---

## REQUIRED READING BEFORE EACH SPRINT

1. `docs/IMPLEMENTATION_ASSESSMENT.md` - What's done vs missing
2. `docs/CLAUDE.md` - Project rules (NEVER red for nutrition, etc.)
3. `docs/ANGULAR_IONIC_RULES.md` - Angular 21 patterns
4. `docs/DESIGN_SYSTEM.md` - Design tokens
5. Research synthesis (attached) - Original requirements

---

## CRITICAL RULES (ALWAYS FOLLOW)

```typescript
// ❌ NEVER
color="danger" // for nutrition
*ngFor / *ngIf // use @for/@if
@Input() / @Output() // use input()/output()
constructor(private service: Service) // use inject()
BehaviorSubject // use signal()

// ✅ ALWAYS
--fitos-nutrition-over: #8B5CF6 // purple for over-target
@for (item of items(); track item.id) // new control flow
input.required<Type>() // signal inputs
inject(Service) // inject function
signal<Type>() / computed() // reactive state
ChangeDetectionStrategy.OnPush // on all components
```

---

## SPRINT SEQUENCE (21 WEEKS TOTAL)

### Sprint 7: Integration & Polish (2 weeks) - START HERE
**Goal:** Wire up services, add haptics, fix fonts

#### Tasks:
1. **Install Haptics**
   ```bash
   npm install @capacitor/haptics
   npx cap sync
   ```

2. **Create HapticService**
   ```typescript
   // apps/mobile/src/app/core/services/haptic.service.ts
   import { Injectable } from '@angular/core';
   import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
   import { Capacitor } from '@capacitor/core';

   @Injectable({ providedIn: 'root' })
   export class HapticService {
     async impact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
       if (!Capacitor.isNativePlatform()) return;
       await Haptics.impact({ style });
     }
     
     async notification(type: NotificationType): Promise<void> {
       if (!Capacitor.isNativePlatform()) return;
       await Haptics.notification({ type });
     }
     
     async success(): Promise<void> {
       await this.notification(NotificationType.Success);
     }
   }
   ```

3. **Add Haptics to ActiveWorkoutPage**
   - On set completion: `haptic.success()`
   - On timer end: `haptic.notification(NotificationType.Warning)`
   - On workout complete: `haptic.impact(ImpactStyle.Heavy)`

4. **Load Inter Font**
   ```html
   <!-- index.html -->
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
   ```

5. **Create Deepgram Edge Function**
   ```typescript
   // supabase/functions/deepgram-key/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   
   serve(async (req) => {
     // Verify user is authenticated
     const authHeader = req.headers.get('Authorization');
     if (!authHeader) {
       return new Response('Unauthorized', { status: 401 });
     }
     
     // Return Deepgram key (stored in Supabase secrets)
     const key = Deno.env.get('DEEPGRAM_API_KEY');
     return new Response(JSON.stringify({ key }), {
       headers: { 'Content-Type': 'application/json' }
     });
   });
   ```

6. **Integrate VoiceLogger into ActiveWorkoutPage**
   - Add `<app-voice-logger>` component
   - Handle `(commandParsed)` event
   - Implement "repeat" command

**Commit after Sprint 7:**
```bash
git add .
git commit -m "feat(sprint-7): Haptic feedback, fonts, voice integration

- Add @capacitor/haptics with HapticService
- Load Inter and JetBrains Mono fonts
- Create Deepgram Edge Function for API key
- Integrate VoiceLoggerComponent into ActiveWorkoutPage
- Add haptic feedback on set/workout completion"
git push origin main
```

---

### Sprint 8: Voice & Photo Nutrition (2 weeks)

#### Tasks:
1. **Create Nutritionix Edge Function**
2. **Connect NutritionParserService to API**
3. **Build nutrition confirmation UI**
4. **Add voice button to NutritionAddPage**
5. **Configure Passio AI / SnapCalorie**
6. **Build photo capture flow**
7. **Create food breakdown editor component**

---

### Sprint 9: CRM Pipeline UI (2 weeks)

#### Tasks:
1. **Create LeadPipelineComponent**
   ```typescript
   // Kanban board with columns: new, contacted, qualified, consultation, won, lost
   import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
   ```

2. **Create LeadCardComponent**
   - Name, source badge, expected value
   - Last contact date
   - Click to open detail

3. **Create LeadDetailPage**
   - Contact info section
   - Activity timeline
   - Add activity buttons (note, call, email, meeting)
   - Next follow-up picker

4. **Create LeadFormComponent**
   - Form builder UI
   - Field configuration
   - Embed code generator

---

### Sprint 10: Email Marketing UI (2 weeks)

#### Tasks:
1. **Integrate Resend**
   ```bash
   npm install resend
   ```

2. **Create Email Edge Function**
3. **Build TemplateEditorComponent** (WYSIWYG)
4. **Build SequenceBuilderComponent**
5. **Create pre-built templates:**
   - Welcome sequence (4 emails over 7 days)
   - Lead nurture (5 emails over 14 days)
   - Win-back campaign (3 emails over 21 days)

---

### Sprint 11: AI Coaching Chat (2 weeks)

#### Tasks:
1. **Create ChatPage**
   ```html
   <ion-content>
     <div class="messages">
       @for (msg of messages(); track msg.id) {
         <app-chat-bubble [message]="msg" />
       }
       @if (isTyping()) {
         <app-typing-indicator />
       }
     </div>
   </ion-content>
   <ion-footer>
     <app-chat-input (send)="sendMessage($event)" />
   </ion-footer>
   ```

2. **Create ChatBubbleComponent**
3. **Create TypingIndicatorComponent**
4. **Add quick action buttons**
5. **Configure LLM API key**
6. **Implement RAG for user context**

---

### Sprint 12: Celebrations & Gamification (2 weeks)

#### Tasks:
1. **Install canvas-confetti**
   ```bash
   npm install canvas-confetti
   npm install -D @types/canvas-confetti
   ```

2. **Create CelebrationService**
   ```typescript
   import confetti from 'canvas-confetti';
   
   @Injectable({ providedIn: 'root' })
   export class CelebrationService {
     workoutComplete(): void {
       confetti({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 }
       });
       this.haptic.impact(ImpactStyle.Heavy);
     }
     
     streakMilestone(days: number): void {
       // Special celebration for 7, 30, 100 day streaks
     }
   }
   ```

3. **Implement streak tracking**
4. **Add animated progress rings**

---

### Sprint 13: Smart Logging & JITAI (2 weeks)

#### Tasks:
1. **Smart weight/rep predictions**
2. **"Go-To" foods by time of day**
3. **Configure JITAI backend**
4. **Implement push notifications**
5. **Create notification preferences UI**

---

### Sprint 14: Apple Watch (3 weeks)

#### Tasks:
1. **Create watchOS target**
2. **Implement WatchConnectivity**
3. **Build watch workout UI**
4. **Create complications**

---

### Sprint 15: Performance & Accessibility (2 weeks)

#### Checklist:
- [ ] Virtual scrolling on ExerciseLibrary, FoodSearch
- [ ] Verify lazy loading all features
- [ ] OnPush on all components
- [ ] trackBy on all @for loops
- [ ] Lighthouse 90+ score
- [ ] VoiceOver/TalkBack tested
- [ ] All touch targets 44px+
- [ ] ARIA labels on icon buttons

---

### Sprint 16: Launch Prep (2 weeks)

#### Tasks:
1. **App Store screenshots**
2. **Play Store screenshots**
3. **Privacy policy update**
4. **Help/FAQ content**
5. **Final QA pass**

---

## QUESTIONS TO ASK BEFORE EACH SPRINT

1. Are required API keys available? (Deepgram, Nutritionix, Passio, Resend, LLM)
2. Any blockers from previous sprint?
3. Specific design requirements or mockups?
4. Testing requirements?
5. Should I implement all tasks or a subset?

---

## FILE LOCATIONS

| Purpose | Path |
|---------|------|
| Services | `apps/mobile/src/app/core/services/` |
| Features | `apps/mobile/src/app/features/` |
| Shared Components | `apps/mobile/src/app/shared/components/` |
| Design Tokens | `apps/mobile/src/theme/_design-tokens.scss` |
| Global Styles | `apps/mobile/src/global.scss` |
| Edge Functions | `supabase/functions/` |
| Migrations | `supabase/migrations/` |
| AI Backend | `apps/ai-backend/` |
| Docs | `docs/` |

---

## BEGIN WORK

1. Read `docs/IMPLEMENTATION_ASSESSMENT.md`
2. Commit existing changes
3. Ask clarifying questions about Sprint 7
4. Begin implementation

**Target:** Complete all sprints to achieve 100% implementation of research concepts.
