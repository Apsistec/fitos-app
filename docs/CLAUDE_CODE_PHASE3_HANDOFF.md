# Claude Code Development Handoff - Phase 3

**Date:** January 15, 2026  
**Project:** FitOS  
**Phase:** 3A - Payment Infrastructure (Sprints 27-29)

---

## Context Summary

FitOS is an AI-powered fitness business management platform built with Angular 21, Ionic 8, and Supabase. Phase 2 (Sprints 17-26) is complete, including AI coaching, CRM, gamification, and analytics features.

Phase 3 focuses on market leadership through:
1. **Payment Infrastructure** (Stripe Connect marketplace)
2. **Agentic AI** (LangGraph 1.0 multi-agent)
3. **Fitness Science** (HRV recovery, chronotype optimization)

---

## Immediate Priority: Sprint 27 - Stripe Connect Foundation

### Goal
Implement Stripe Connect Express accounts to enable gym→trainer payment splits with a 10% platform fee.

### Key Documents to Review
1. `/docs/STRIPE_CONNECT_IMPLEMENTATION.md` - Complete implementation guide
2. `/docs/GAP_ANALYSIS_2026.md` - Strategic context and competitive analysis
3. `/docs/SPRINTS_27-45_ROADMAP.md` - Full sprint planning

### Technical Requirements

**Database Schema to Create:**
```sql
-- See STRIPE_CONNECT_IMPLEMENTATION.md for full schema
-- Key tables: stripe_connect_accounts, stripe_connect_settings, trainer_commissions
```

**Files to Create:**
1. `apps/mobile/src/app/features/payments/pages/connect-onboarding/connect-onboarding.page.ts`
2. `apps/mobile/src/app/core/services/stripe-connect.service.ts`
3. `supabase/functions/stripe-connect-create/index.ts`
4. `supabase/functions/stripe-connect-webhook/index.ts`
5. `supabase/migrations/00023_stripe_connect.sql`

**Payment Flow Implementation:**
- Solo trainers: Direct destination charges
- Gyms with trainers: Destination + separate transfers for commission splits

### Success Criteria
- [ ] Gym owners can onboard in <3 minutes
- [ ] Destination charges route correctly
- [ ] Platform fee (10%) collected automatically
- [ ] Webhook handles account.updated events
- [ ] Payout status visible in UI

---

## Code Patterns

### Angular Component Pattern
```typescript
@Component({
  selector: 'fit-component',
  standalone: true,
  imports: [CommonModule, IonComponents...],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class ComponentName {
  private service = inject(ServiceName);
  
  // Use signals for state
  items = this.service.items;
  loading = this.service.loading;
  
  // Computed signals for derived state
  isEmpty = computed(() => this.items().length === 0);
}
```

### Service Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class ServiceName {
  private supabase = inject(SupabaseService);
  private http = inject(HttpClient);
  
  // State with signals
  private _items = signal<Item[]>([]);
  items = this._items.asReadonly();
  loading = signal(false);
  error = signal<string | null>(null);
  
  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('table')
        .select('*');
      if (error) throw error;
      this._items.set(data);
    } catch (err) {
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
```

### Supabase Edge Function Pattern
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { param } = await req.json();
  
  // Implementation
  
  return new Response(JSON.stringify({ result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Environment Variables Needed

```env
# Stripe (add to Supabase secrets)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# App URL for redirects
APP_URL=https://app.fitos.app
```

---

## After Sprint 27, Continue With:

### Sprint 28: Stripe Connect Marketplace
- Embedded payment components
- Trainer payout system
- Commission tracking UI

### Sprint 29: Payment Analytics & Recovery
- Smart Retries activation
- Payment analytics dashboard
- MRR tracking

### Sprint 30: LangGraph 1.0 Multi-Agent
- Upgrade from current LangGraph to 1.0
- Implement supervisor agent pattern
- Add human-in-the-loop workflows

---

## Key Technical Decisions

1. **Stripe Connect Type:** Express (not Standard or Custom)
   - Fastest onboarding (2 minutes)
   - Stripe handles KYC
   - Express Dashboard for users

2. **Payment Split Method:** Destination charges + separate transfers
   - Cleaner than separate charges and transfers
   - Supports gym→trainer secondary splits

3. **Platform Fee:** 10% application fee
   - Industry standard
   - Collected automatically via application_fee_amount

4. **LangGraph Version:** 1.0 (released October 2025)
   - Stable API commitment until 2.0
   - State persistence and checkpointing
   - Production-ready with LangSmith

---

## Questions to Ask Doug If Unclear

1. Commission split defaults (currently 80% trainer, 20% gym)
2. Payout schedule preferences (daily vs weekly)
3. MCC code for fitness businesses (currently 7941)
4. Custom statement descriptors

---

## Repository Structure Reference

```
apps/
  mobile/
    src/app/
      core/
        services/           # Singleton services
      features/
        payments/           # Payment features (NEW)
          pages/
          components/
        analytics/          # Analytics features
        coaching/           # AI coaching
      shared/               # Shared components
  ai-backend/
    app/
      agents/               # LangGraph agents
      routes/               # FastAPI routes
      services/             # Backend services

supabase/
  functions/               # Edge Functions
  migrations/              # Database migrations
```

---

## Ready to Start

Begin with Sprint 27, Task 27.1: Express Account Onboarding Flow

1. Create the database migration (`00023_stripe_connect.sql`)
2. Implement the Supabase Edge Function for account creation
3. Build the Angular service
4. Create the onboarding UI page
5. Set up webhook handling

Reference `/docs/STRIPE_CONNECT_IMPLEMENTATION.md` for complete code examples.
