# 🚀 FitOS Launch Checklist

**Current Status:** Phase 1 MVP Complete, Ready to Deploy

---

## ✅ **WHAT YOU ALREADY HAVE**

- ✅ Production Supabase project: `https://dmcogmopboebqiimzoej.supabase.co`
- ✅ Supabase URL and anon key configured in mobile app
- ✅ Stripe test keys configured
- ✅ Google OAuth credentials configured
- ✅ All database migrations ready
- ✅ TypeScript types generated
- ✅ Complete mobile app (Phase 1 MVP)
- ✅ Complete AI backend (ready to deploy)
- ✅ Landing page (ready to deploy)

---

## 🎯 **CRITICAL TASKS - Do These First (30 minutes)**

### 1. Get Supabase Service Role Key (5 minutes)

**Why needed:** AI backend needs this to access your database

**Steps:**
1. Go to: https://supabase.com/dashboard/project/dmcogmopboebqiimzoej/settings/api
2. Scroll to "Service Role Key" section
3. Click "Reveal" and copy the key
4. Update `/Users/dougwhite/Dev/fitos-app/.env`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (paste the real key)
   ```

---

### 2. Get LLM API Key (10 minutes)

**Choose ONE:**

**Option A: Anthropic Claude (Recommended)**
- Go to: https://console.anthropic.com/settings/keys
- Click "Create Key"
- Copy the key (starts with `sk-ant-`)
- Cost: $5 free credit, then pay-as-you-go

**Option B: OpenAI GPT-4**
- Go to: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy the key (starts with `sk-`)
- Cost: ~$10/month for typical usage

---

### 3. Create AI Backend .env File (2 minutes)

I'll create this file for you once you provide the keys above.

**File:** `/Users/dougwhite/Dev/fitos-app/apps/ai-backend/.env`

```bash
# LLM Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
OPENAI_API_KEY=sk-your-key-here

# Supabase
SUPABASE_URL=https://dmcogmopboebqiimzoej.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_step_1

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:4200,http://localhost:8100

# AI Configuration
DEFAULT_LLM_PROVIDER=anthropic
DEFAULT_MODEL=claude-sonnet-4.5
MAX_TOKENS=2048
TEMPERATURE=0.7

# JITAI Configuration
MAX_DAILY_INTERVENTIONS=3
INTERVENTION_THRESHOLD=0.7
```

---

## 🧪 **TEST EVERYTHING LOCALLY (15 minutes)**

### Test AI Backend

```bash
cd apps/ai-backend
poetry install
poetry run uvicorn main:app --reload
```

Visit: http://localhost:8000/docs

**Expected:**
- ✅ Swagger UI loads
- ✅ GET /api/v1/health returns 200
- ✅ POST /api/v1/coach/chat works

---

### Test Mobile App

```bash
# In root directory
npm start
```

Visit: http://localhost:4200

**Test checklist:**
- [ ] Sign up with new account
- [ ] Complete onboarding (pick trainer or client role)
- [ ] Dashboard loads with data
- [ ] Create a workout (if trainer)
- [ ] Log nutrition entry
- [ ] Send a message

---

## 📦 **DEPLOYMENT (What I Can Help With)**

### AI Backend Deployment

I can create the deployment scripts. You'll need to:

1. Have Google Cloud account set up
2. Install `gcloud` CLI
3. Run one command I provide

**Or** deploy to any Docker hosting:
- Railway.app (easiest)
- Fly.io
- Render.com
- AWS ECS
- Azure Container Apps

---

### Mobile App Deployment

**Options:**

**Option 1: Netlify (Easiest)**
```bash
# I can run this
npm run build
cd dist/mobile/browser
# You run this (connects to your Netlify account)
npx netlify-cli deploy --prod
```

**Option 2: Vercel**
```bash
# I can run this
npm run build
# You run this (connects to your Vercel account)
npx vercel --prod
```

**Option 3: Firebase Hosting**
```bash
npm run build
firebase deploy
```

---

### Landing Page Deployment

Same as mobile app, but use:
```bash
npm run build:landing
```

Vercel recommended for SSR support.

---

## 🎁 **OPTIONAL ENHANCEMENTS (Do Later)**

### Get Additional API Keys (as needed)

1. **Deepgram** (Voice features): https://console.deepgram.com
   - $200 free credit
   - Required for voice workout logging

2. **Live Stripe Keys** (Payments): https://dashboard.stripe.com
   - Switch from test to live mode
   - Complete business verification

3. **Terra API** (Wearables): https://dashboard.tryterra.co
   - For Apple Health, Google Fit, etc.

4. **USDA API** (Food database): https://fdc.nal.usda.gov/api-key-signup.html
   - Free
   - For nutrition data

5. **Apple Sign In**: https://developer.apple.com
   - Need paid Apple Developer account ($99/year)

---

## 📱 **MOBILE APP BUILDS (Later)**

### iOS App
```bash
npx cap build ios
```
Opens Xcode. Requires:
- macOS
- Xcode installed
- Apple Developer account ($99/year)

### Android App
```bash
npx cap build android
```
Opens Android Studio. Requires:
- Google Play Developer account ($25 one-time)

---

## 🔥 **WHAT I CAN DO RIGHT NOW**

Let me know when you have:
1. ✅ Supabase service role key
2. ✅ Anthropic or OpenAI API key

Then I can:
1. ✅ Create the AI backend .env file
2. ✅ Test the AI backend locally
3. ✅ Build production bundles
4. ✅ Create deployment scripts
5. ✅ Generate deployment documentation

---

## 📊 **QUICK STATUS**

| Component | Status | Needs |
|-----------|--------|-------|
| Supabase DB | ✅ Live | Service role key |
| Mobile App | ✅ Ready | Deploy command |
| AI Backend | ⏳ Ready | API key + deploy |
| Landing Page | ✅ Ready | Deploy command |
| Stripe | ✅ Test Mode | Live keys (later) |
| Google OAuth | ✅ Ready | Already configured |

---

## 🎯 **NEXT STEPS**

**Today (30 min):**
1. Get Supabase service role key → paste here
2. Get Anthropic API key → paste here
3. I'll configure everything and test locally

**Tomorrow (1 hour):**
1. Deploy AI backend (I'll create the script, you run 1 command)
2. Deploy mobile app (same)
3. Deploy landing page (same)

**Later:**
1. Build iOS/Android apps
2. Submit to app stores
3. Add optional integrations

---

**Ready to go?** Just provide those 2 keys and we'll have everything running locally within 15 minutes! 🚀
