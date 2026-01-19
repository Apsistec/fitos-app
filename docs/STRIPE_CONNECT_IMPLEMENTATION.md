# FitOS Stripe Connect Implementation Guide

**Version:** 1.0  
**Updated:** January 2026  
**Priority:** P0 - Critical for marketplace functionality

---

## Overview

Stripe Connect enables FitOS to operate as a marketplace where gym owners and trainers receive payments directly, with FitOS collecting a platform fee. This guide covers the complete implementation strategy.

---

## Account Type: Express

**Why Express:**
- 2-minute onboarding (Stripe handles KYC)
- Express Dashboard for connected accounts
- Embedded components for white-label experience
- Ideal balance of simplicity and functionality

**Alternative Considered:**
- Standard: Too much friction for trainers
- Custom: Unnecessary complexity for fitness market

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FitOS Platform                      │
│                   (Platform Account)                     │
│              Platform Fee: 10% ($10 on $100)            │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Gym Owner A  │ │  Gym Owner B  │ │  Solo Trainer │
│   (Express)   │ │   (Express)   │ │   (Express)   │
│  Receives $90 │ │               │ │  Receives $90 │
└───────┬───────┘ └───────────────┘ └───────────────┘
        │
        ▼
┌───────────────┐
│   Trainer 1   │
│   (Express)   │
│  Receives $72 │  (80% of gym's $90)
└───────────────┘
```

---

## Payment Flows

### Flow 1: Solo Trainer (Direct)

```typescript
// Client pays trainer directly
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usd',
  transfer_data: {
    destination: trainerStripeAccountId,
  },
  application_fee_amount: 1000, // $10.00 (10% platform fee)
  metadata: {
    fitos_client_id: clientId,
    fitos_trainer_id: trainerId,
    session_type: 'personal_training'
  }
});
```

**Result:**
- Platform receives: $10.00
- Trainer receives: $90.00

### Flow 2: Gym with Trainer Split (Destination + Transfer)

```typescript
// Step 1: Client pays gym owner
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usd',
  transfer_data: {
    destination: gymOwnerStripeAccountId,
  },
  application_fee_amount: 1000, // $10.00 (10% platform fee)
  metadata: {
    fitos_client_id: clientId,
    fitos_gym_id: gymId,
    fitos_trainer_id: trainerId,
    commission_percent: 80
  }
});

// Step 2: Gym owner transfers to trainer (separate charges and transfers)
// This happens via scheduled job or webhook
const transfer = await stripe.transfers.create({
  amount: 7200, // $72.00 (80% of $90)
  currency: 'usd',
  destination: trainerStripeAccountId,
  source_transaction: paymentIntent.charges.data[0].id,
  metadata: {
    fitos_gym_id: gymId,
    fitos_trainer_id: trainerId,
    original_payment_intent: paymentIntent.id
  }
}, {
  stripeAccount: gymOwnerStripeAccountId
});
```

**Result:**
- Platform receives: $10.00
- Gym owner receives: $18.00 (20%)
- Trainer receives: $72.00 (80%)

### Flow 3: Subscription (Recurring)

```typescript
// Create subscription with application fee
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  application_fee_percent: 10, // 10% of each payment
  transfer_data: {
    destination: connectedAccountId,
  },
});
```

---

## Database Schema

```sql
-- Connected Stripe accounts
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_type TEXT DEFAULT 'express' CHECK (account_type IN ('express', 'standard', 'custom')),
  business_type TEXT, -- 'individual' or 'company'
  
  -- Onboarding status
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  
  -- Verification status
  currently_due TEXT[], -- Required fields
  eventually_due TEXT[],
  past_due TEXT[],
  disabled_reason TEXT,
  
  -- Metadata
  country TEXT DEFAULT 'US',
  default_currency TEXT DEFAULT 'usd',
  
  -- Timestamps
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account settings
CREATE TABLE stripe_connect_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES stripe_connect_accounts(id) ON DELETE CASCADE,
  
  -- Fee configuration
  application_fee_percent DECIMAL(5,2) DEFAULT 10.00,
  
  -- Payout settings
  payout_schedule TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'manual'
  payout_delay_days INTEGER DEFAULT 2,
  
  -- Branding
  statement_descriptor TEXT,
  statement_descriptor_suffix TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gym-trainer commission rates
CREATE TABLE trainer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00, -- Trainer gets 80%
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trainer_id, gym_id, effective_date)
);

-- Payout records
CREATE TABLE stripe_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES stripe_connect_accounts(id),
  stripe_payout_id TEXT NOT NULL UNIQUE,
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'in_transit', 'paid', 'failed', 'canceled'
  
  arrival_date DATE,
  failure_code TEXT,
  failure_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer records (gym to trainer)
CREATE TABLE stripe_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_transfer_id TEXT NOT NULL UNIQUE,
  
  -- Accounts
  source_account_id UUID REFERENCES stripe_connect_accounts(id),
  destination_account_id UUID NOT NULL REFERENCES stripe_connect_accounts(id),
  
  -- Payment reference
  source_transaction_id TEXT, -- Original charge ID
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  -- Metadata
  trainer_id UUID REFERENCES profiles(id),
  gym_id UUID REFERENCES gyms(id),
  commission_percent DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_transfers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY stripe_connect_accounts_select ON stripe_connect_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY stripe_connect_accounts_insert ON stripe_connect_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Gym owners can see their trainers' commission rates
CREATE POLICY trainer_commissions_select ON trainer_commissions
  FOR SELECT USING (
    trainer_id = auth.uid() OR
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );
```

---

## Service Implementation

```typescript
// core/services/stripe-connect.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';

export interface ConnectAccount {
  id: string;
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
}

export interface OnboardingLink {
  url: string;
  expiresAt: Date;
}

@Injectable({ providedIn: 'root' })
export class StripeConnectService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);
  
  account = signal<ConnectAccount | null>(null);
  loading = signal(false);
  
  /**
   * Check if user has a connected Stripe account
   */
  async checkAccount(userId: string): Promise<ConnectAccount | null> {
    const { data, error } = await this.supabase.client
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    
    const account: ConnectAccount = {
      id: data.id,
      stripeAccountId: data.stripe_account_id,
      chargesEnabled: data.charges_enabled,
      payoutsEnabled: data.payouts_enabled,
      detailsSubmitted: data.details_submitted,
      onboardingComplete: data.onboarding_completed_at != null
    };
    
    this.account.set(account);
    return account;
  }
  
  /**
   * Create a new Express connected account
   */
  async createAccount(userId: string, businessType: 'individual' | 'company' = 'individual'): Promise<OnboardingLink> {
    this.loading.set(true);
    
    try {
      const response = await this.http.post<{
        accountId: string;
        onboardingUrl: string;
        expiresAt: string;
      }>(
        `${environment.apiUrl}/stripe/connect/create`,
        { userId, businessType }
      ).toPromise();
      
      return {
        url: response!.onboardingUrl,
        expiresAt: new Date(response!.expiresAt)
      };
    } finally {
      this.loading.set(false);
    }
  }
  
  /**
   * Get onboarding link for incomplete account
   */
  async getOnboardingLink(accountId: string): Promise<OnboardingLink> {
    const response = await this.http.post<{
      url: string;
      expiresAt: string;
    }>(
      `${environment.apiUrl}/stripe/connect/onboarding-link`,
      { accountId }
    ).toPromise();
    
    return {
      url: response!.url,
      expiresAt: new Date(response!.expiresAt)
    };
  }
  
  /**
   * Get dashboard link for connected account
   */
  async getDashboardLink(accountId: string): Promise<string> {
    const response = await this.http.post<{ url: string }>(
      `${environment.apiUrl}/stripe/connect/dashboard-link`,
      { accountId }
    ).toPromise();
    
    return response!.url;
  }
  
  /**
   * Create payment intent with transfer
   */
  async createPaymentIntent(params: {
    amount: number; // in cents
    destinationAccountId: string;
    metadata: Record<string, string>;
  }): Promise<{ clientSecret: string }> {
    const response = await this.http.post<{ clientSecret: string }>(
      `${environment.apiUrl}/stripe/connect/payment-intent`,
      params
    ).toPromise();
    
    return response!;
  }
  
  /**
   * Get payout history
   */
  async getPayouts(accountId: string): Promise<StripePayout[]> {
    const { data } = await this.supabase.client
      .from('stripe_payouts')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    return data || [];
  }
  
  /**
   * Get commission rate for trainer at gym
   */
  async getCommissionRate(trainerId: string, gymId: string): Promise<number> {
    const { data } = await this.supabase.client
      .from('trainer_commissions')
      .select('commission_percent')
      .eq('trainer_id', trainerId)
      .eq('gym_id', gymId)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();
    
    return data?.commission_percent ?? 80; // Default 80%
  }
}
```

---

## Supabase Edge Function: Create Account

```typescript
// supabase/functions/stripe-connect-create/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { userId, businessType } = await req.json();
  
  // Get user profile for prefill
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();
  
  // Create Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: profile?.email,
    business_type: businessType,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      mcc: '7941', // Sports clubs, fields, and promoters
      product_description: 'Personal training and fitness coaching services',
    },
    metadata: {
      fitos_user_id: userId,
    },
  });
  
  // Store in database
  await supabase.from('stripe_connect_accounts').insert({
    user_id: userId,
    stripe_account_id: account.id,
    account_type: 'express',
    business_type: businessType,
    country: 'US',
  });
  
  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${Deno.env.get('APP_URL')}/settings/payments?refresh=true`,
    return_url: `${Deno.env.get('APP_URL')}/settings/payments?success=true`,
    type: 'account_onboarding',
  });
  
  return new Response(JSON.stringify({
    accountId: account.id,
    onboardingUrl: accountLink.url,
    expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Webhook Handler

```typescript
// supabase/functions/stripe-connect-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const endpointSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')!;

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      
      await supabase
        .from('stripe_connect_accounts')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          disabled_reason: account.requirements?.disabled_reason,
          onboarding_completed_at: 
            account.charges_enabled && account.payouts_enabled 
              ? new Date().toISOString() 
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', account.id);
      
      break;
    }
    
    case 'payout.created':
    case 'payout.updated':
    case 'payout.paid':
    case 'payout.failed': {
      const payout = event.data.object as Stripe.Payout;
      
      // Find account
      const { data: accountData } = await supabase
        .from('stripe_connect_accounts')
        .select('id')
        .eq('stripe_account_id', event.account)
        .single();
      
      if (accountData) {
        await supabase.from('stripe_payouts').upsert({
          account_id: accountData.id,
          stripe_payout_id: payout.id,
          amount_cents: payout.amount,
          currency: payout.currency,
          status: payout.status,
          arrival_date: payout.arrival_date 
            ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0]
            : null,
          failure_code: payout.failure_code,
          failure_message: payout.failure_message,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'stripe_payout_id'
        });
      }
      
      break;
    }
    
    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer;
      
      // Record transfer
      const { data: destAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('id')
        .eq('stripe_account_id', transfer.destination)
        .single();
      
      if (destAccount) {
        await supabase.from('stripe_transfers').insert({
          stripe_transfer_id: transfer.id,
          destination_account_id: destAccount.id,
          source_transaction_id: transfer.source_transaction,
          amount_cents: transfer.amount,
          currency: transfer.currency,
          trainer_id: transfer.metadata?.fitos_trainer_id,
          gym_id: transfer.metadata?.fitos_gym_id,
          commission_percent: transfer.metadata?.commission_percent,
        });
      }
      
      break;
    }
  }
  
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Smart Retries Configuration

Enable Smart Retries in Stripe Dashboard:
1. Navigate to Settings > Billing > Subscriptions
2. Enable "Smart Retries"
3. Configure retry schedule (Stripe ML-optimized)

**Expected Impact:** +57% failed payment recovery (Deliveroo benchmark: £100M+ recovered)

---

## UI Components

### Onboarding Page

```typescript
// features/payments/pages/connect-onboarding/connect-onboarding.page.ts
@Component({
  selector: 'app-connect-onboarding',
  template: `
    <ion-content class="ion-padding">
      <div class="onboarding-container">
        @if (connectService.loading()) {
          <ion-spinner name="crescent" />
          <p>Setting up your payment account...</p>
        } @else if (connectService.account()?.onboardingComplete) {
          <ion-icon name="checkmark-circle" color="success" />
          <h2>Payments Enabled!</h2>
          <p>You can now receive payments from clients.</p>
          <ion-button (click)="openDashboard()">
            View Dashboard
          </ion-button>
        } @else {
          <div class="setup-card">
            <ion-icon name="card-outline" />
            <h2>Enable Payments</h2>
            <p>Set up your payment account to receive payments from clients directly.</p>
            
            <ul class="benefits">
              <li>✓ Instant payouts available</li>
              <li>✓ Accept cards and Apple Pay</li>
              <li>✓ Automatic tax documents</li>
              <li>✓ 2-minute setup</li>
            </ul>
            
            <ion-button expand="block" (click)="startOnboarding()">
              Get Started
            </ion-button>
            
            <p class="powered-by">
              <ion-icon name="lock-closed" />
              Powered by Stripe
            </p>
          </div>
        }
      </div>
    </ion-content>
  `
})
export class ConnectOnboardingPage {
  connectService = inject(StripeConnectService);
  private authService = inject(AuthService);
  
  async startOnboarding() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    
    const { url } = await this.connectService.createAccount(userId);
    window.location.href = url;
  }
  
  async openDashboard() {
    const account = this.connectService.account();
    if (!account) return;
    
    const url = await this.connectService.getDashboardLink(account.id);
    window.open(url, '_blank');
  }
}
```

---

## Testing Checklist

### Onboarding
- [ ] Express account creation works
- [ ] Onboarding link opens correctly
- [ ] Return URL handles success/refresh
- [ ] Webhook updates account status
- [ ] Incomplete onboarding can be resumed

### Payments
- [ ] Destination charges route correctly
- [ ] Platform fee calculated accurately
- [ ] Trainer transfers execute correctly
- [ ] Commission rates applied properly

### Payouts
- [ ] Daily payouts work
- [ ] Payout history displays
- [ ] Failed payouts show reason
- [ ] Dashboard link works

### Webhooks
- [ ] account.updated handled
- [ ] payout.* events handled
- [ ] transfer.created logged

---

## Related Documentation

- [Stripe Connect Express Guide](https://stripe.com/docs/connect/express-accounts)
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Smart Retries](https://stripe.com/docs/billing/subscriptions/smart-retries)
- `GAP_ANALYSIS_2026.md` - Strategic context
- `SPRINTS_27-45_ROADMAP.md` - Sprint planning
