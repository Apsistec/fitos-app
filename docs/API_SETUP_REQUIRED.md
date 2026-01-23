# Required External API Setup

This document lists all external services that need API keys for FitOS to function in production.

## Status Legend
- ✅ **Already Configured** - Has test keys, ready for development
- ⚠️ **Needs Production Keys** - Has test keys, needs production upgrade
- ❌ **Not Configured** - Needs API key registration
- 🔜 **Phase 2** - Not needed for MVP, coming later

---

## 🔥 Firebase (✅ Configured)

**Status:** Fully configured for both landing and mobile apps

**What it provides:**
- Hosting for landing page and mobile PWA
- Analytics
- Performance monitoring (optional)

**URLs:**
- Landing: https://fitos-88fff.web.app
- Mobile: https://fitos-mobile.web.app

**Project:** `fitos-88fff`

**Already have:**
- ✅ Landing app configured
- ✅ Mobile app configured
- ✅ Hosting deployed

**No action needed** - Already set up!

---

## 🗄️ Supabase (⚠️ Needs Production Keys)

**Status:** Using local development instance, needs cloud setup

**What it provides:**
- PostgreSQL database
- Authentication
- Real-time subscriptions
- Row-level security
- Storage for user uploads

**Current setup:**
- Development: `http://127.0.0.1:54321`
- Anon Key: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` (local only)

**Action Required:**

1. **Create Supabase Project**
   - Go to: https://supabase.com
   - Click "Start your project"
   - Choose a name: `fitos-production`
   - Select region: Choose closest to your users (e.g., US West)
   - Click "Create new project"

2. **Get API Keys**
   - Go to Project Settings → API
   - Copy:
     - `URL` (e.g., `https://abc123.supabase.co`)
     - `anon/public` key

3. **Run Migrations**
   ```bash
   # Link to production
   npx supabase link --project-ref YOUR_PROJECT_REF

   # Push database schema
   npx supabase db push
   ```

4. **Update Environment Files**
   - `apps/landing/src/environments/environment.prod.ts`
   - `apps/mobile/src/environments/environment.prod.ts`

   Replace:
   ```typescript
   supabaseUrl: 'YOUR_PRODUCTION_SUPABASE_URL',
   supabaseAnonKey: 'YOUR_PRODUCTION_SUPABASE_ANON_KEY',
   ```

**Cost:** Free tier supports:
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Should be free for alpha testing

---

## 💳 Stripe (⚠️ Needs Production Keys)

**Status:** Using test keys, needs production setup

**What it provides:**
- Payment processing for client subscriptions
- Stripe Connect for trainer payouts
- Subscription management

**Current setup:**
- Test publishable key: `pk_test_51SaoYU8dyNFOBioE...`
- Using test mode

**Action Required:**

1. **Activate Stripe Account**
   - Go to: https://dashboard.stripe.com/account/onboarding
   - Complete business verification
   - Provide tax information
   - Add bank account for payouts

2. **Enable Stripe Connect**
   - Dashboard → Connect → Get started
   - Choose "Platform or marketplace"
   - Complete Connect onboarding

3. **Get Production Keys**
   - Dashboard → Developers → API keys
   - Toggle "Viewing test data" to "Viewing live data"
   - Copy:
     - `Publishable key` (starts with `pk_live_`)
     - `Secret key` (starts with `sk_live_`)

4. **Set Up Webhooks**
   ```
   Endpoint URL: https://your-api.cloudfunctions.net/stripe-webhook

   Events to listen for:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - account.updated (for Connect)
   ```

5. **Update Environment**
   ```typescript
   stripePublishableKey: 'pk_live_YOUR_PRODUCTION_KEY',
   ```

**Cost:**
- No monthly fee
- 2.9% + $0.30 per successful charge
- Additional 2% for Connect (trainer payouts)

---

## 🏃 Terra API (❌ Not Configured)

**Status:** Not configured, needs registration

**What it provides:**
- Unified API for wearable data
- Supports: Apple Health, Google Fit, Fitbit, Garmin, Oura, Whoop, etc.
- Resting heart rate, HRV, sleep, steps

**Why we use it:**
- Single integration for all wearables
- Better than individual APIs
- Real-time webhooks for data updates

**Action Required:**

1. **Create Terra Account**
   - Go to: https://tryterra.co
   - Click "Get Started"
   - Choose "Developer" plan

2. **Get API Credentials**
   - Dashboard → API Keys
   - Copy:
     - `API Key`
     - `Dev ID`

3. **Configure Webhook**
   ```
   Webhook URL: https://your-api.cloudfunctions.net/terra-webhook
   ```

4. **Update Environment**
   ```typescript
   terraApiKey: 'YOUR_TERRA_API_KEY',
   terraDevId: 'YOUR_TERRA_DEV_ID',
   ```

**Cost:**
- Free tier: 5 users
- Growth: $49/month for 500 users
- **Recommendation:** Start with free tier for testing

---

## 🎤 Deepgram (🔜 Phase 2)

**Status:** Not needed for MVP

**What it provides:**
- AI voice transcription for workout logging
- "10 reps at 185 pounds" → structured data
- Real-time streaming transcription

**When you'll need it:**
- Phase 2 (Sprint 8-9)
- Voice logging feature

**Future setup:**
1. Go to: https://deepgram.com
2. Create account
3. Get API key from console
4. Free tier: $200 credit

**Cost:**
- Pay as you go: $0.0043/minute
- ~$2.58/hour of voice logging
- Most users log <5 min/workout = $0.01-0.02/workout

---

## 🍔 USDA FoodData Central (❌ Not Configured)

**Status:** Not configured, but **optional**

**What it provides:**
- Free nutrition database
- 400,000+ foods with macro data
- Fallback when photo nutrition AI fails

**Action Required:**

1. **Get API Key**
   - Go to: https://fdc.nal.usda.gov/api-key-signup.html
   - Enter email
   - Receive API key instantly

2. **Update Environment**
   ```typescript
   usdaApiKey: 'YOUR_USDA_API_KEY',
   ```

**Cost:**
- **Completely free**
- 3,600 requests/hour limit
- More than enough for your needs

**Recommendation:** Set this up early - it's free and useful!

---

## 🤖 OpenAI (🔜 Phase 2)

**Status:** Not needed for MVP

**What it provides:**
- Photo nutrition AI (GPT-4 Vision)
- AI coaching responses
- Meal plan generation

**When you'll need it:**
- Phase 2 (Sprint 10)
- Photo nutrition feature
- AI coaching feature

**Future setup:**
1. Go to: https://platform.openai.com
2. Create account
3. Add payment method
4. Get API key

**Cost:**
- GPT-4 Vision: $0.01/image
- GPT-4 text: $0.03/1K tokens
- Estimate: $0.02-0.05 per AI interaction

---

## 📧 Email Service (🔜 Phase 2)

**Status:** Not needed for MVP

**What it provides:**
- Transactional emails (password reset, notifications)
- Marketing emails (newsletters, sequences)

**Options:**
1. **SendGrid** (Recommended)
   - Free tier: 100 emails/day
   - Growth: $19.95/month for 50K emails

2. **Resend** (Modern alternative)
   - Free tier: 3,000 emails/month
   - Clean API, good DX

**When you'll need it:**
- Phase 2 (Sprint 11-12)
- Built-in email marketing feature

---

## Summary: What to Set Up NOW

### Immediate (For Alpha Testing):
1. ✅ **Supabase** - Database and auth (30 min)
2. ✅ **Stripe** - Payment processing (1 hour with verification)
3. ⚠️ **USDA FoodData** - Free nutrition data (5 min)

### Can Wait:
4. ⏸️ **Terra API** - Wearables (Phase 1, but not critical)
5. ⏸️ **Deepgram** - Voice logging (Phase 2)
6. ⏸️ **OpenAI** - Photo nutrition/AI coaching (Phase 2)
7. ⏸️ **Email Service** - Marketing emails (Phase 2)

---

## Environment File Template

Once you have the keys, update `apps/mobile/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyBijnr_BnCtP7lbTpfAVFBvOlvt-DgjN4w",
    authDomain: "fitos-88fff.firebaseapp.com",
    projectId: "fitos-88fff",
    storageBucket: "fitos-88fff.firebasestorage.app",
    messagingSenderId: "953773965912",
    appId: "1:953773965912:web:3ad21d048d6b9788b8402d",
    measurementId: "G-KD9MMFVBDY"
  },

  // REQUIRED: Set up Supabase cloud project
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PRODUCTION_ANON_KEY',

  // REQUIRED: Activate Stripe live mode
  stripePublishableKey: 'pk_live_YOUR_KEY',

  // RECOMMENDED: Free and useful
  usdaApiKey: 'YOUR_USDA_API_KEY',

  // OPTIONAL: Phase 1 feature
  terraApiKey: 'YOUR_TERRA_API_KEY',

  // Backend URL (will be Cloud Functions or Cloud Run)
  aiBackendUrl: 'https://your-api.cloudfunctions.net',
};
```

---

## Cost Summary (Monthly)

**Alpha Testing Phase:**
- Firebase Hosting: **$0** (free tier)
- Supabase: **$0** (free tier)
- Stripe: **$0** (pay per transaction only)
- USDA FoodData: **$0** (free)

**Total: $0/month + transaction fees**

**Production with 100 Active Users:**
- Firebase: **$0** (still free)
- Supabase: **$0** (500 MAU free)
- Stripe: ~**$50-200/month** (depends on revenue)
- Terra API: **$49/month** (for wearables)
- Total: **~$50-250/month**

---

## Quick Start Checklist

- [ ] Create Supabase production project
- [ ] Get Supabase URL and anon key
- [ ] Run database migrations to Supabase
- [ ] Activate Stripe account (submit verification)
- [ ] Get Stripe production keys
- [ ] Set up Stripe webhooks
- [ ] Register for USDA API key
- [ ] Update production environment files
- [ ] Redeploy with production keys
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Verify database connections

**Time estimate:** 2-3 hours (mostly waiting for Stripe verification)

---

## Need Help?

- Supabase docs: https://supabase.com/docs
- Stripe docs: https://stripe.com/docs
- Terra docs: https://docs.tryterra.co
- USDA docs: https://fdc.nal.usda.gov/api-guide.html

## Security Notes

**NEVER commit API keys to git!**
- Production keys go in environment files only
- Use Firebase Functions config for backend secrets
- Add `.env` to `.gitignore` (already done)
- Use environment variables in CI/CD
