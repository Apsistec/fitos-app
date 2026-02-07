# 🚀 FitOS - Quick Start Guide

**Everything is configured! Here's what to do next.**

---

## ✅ **COMPLETED**

- ✅ Supabase production project connected
- ✅ API keys configured (Anthropic + Supabase)
- ✅ Environment files created
- ✅ Mobile app ready
- ✅ AI backend ready
- ✅ Landing page ready

---

## 🎯 **RUN LOCALLY (Choose One Path)**

### **Path A: Test Mobile App Only** (Easiest - 2 minutes)

```bash
# Start the mobile app
npm start
```

Visit: **http://localhost:4200**

**What works:**
- ✅ Sign up / Login
- ✅ Onboarding
- ✅ Dashboards (all roles)
- ✅ Create workouts
- ✅ Log nutrition
- ✅ Client management
- ✅ Messaging

**What doesn't work yet:**
- ❌ AI chat (needs AI backend running)
- ❌ Voice logging (needs AI backend + Deepgram key)
- ❌ Photo nutrition (needs AI backend)

---

### **Path B: Test Everything Including AI** (Needs Python setup - 15 minutes)

#### Step 1: Install Python 3.11+

**macOS:**
```bash
brew install python@3.11
```

**Linux:**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv
```

**Windows:**
Download from https://www.python.org/downloads/

#### Step 2: Install Poetry

```bash
curl -sSL https://install.python-poetry.org | python3.11 -
export PATH="$HOME/.local/bin:$PATH"
```

#### Step 3: Start AI Backend

```bash
cd apps/ai-backend
poetry install
poetry run uvicorn main:app --reload
```

Visit: **http://localhost:8000/docs**

#### Step 4: Start Mobile App (separate terminal)

```bash
npm start
```

Visit: **http://localhost:4200**

**Now everything works!** ✅

---

### **Path C: Use Docker** (If you don't want to install Python)

```bash
# Build and run AI backend
cd apps/ai-backend
docker build -t fitos-ai-backend .
docker run -p 8000:8000 --env-file .env fitos-ai-backend

# In another terminal, start mobile app
npm start
```

---

## 📦 **DEPLOY TO PRODUCTION**

### **Option 1: Railway.app** (Easiest - No Config Needed)

**AI Backend:**
1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose this repo
5. Select `apps/ai-backend` folder
6. Add environment variables from `.env`
7. Deploy!

**Mobile App:**
1. Railway can also host the static files
2. Or use Netlify/Vercel (see below)

---

### **Option 2: Vercel** (Best for Mobile + Landing)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy mobile app
npm run build
cd dist/mobile/browser
vercel --prod

# Deploy landing page
npm run build:landing
cd dist/landing/browser
vercel --prod
```

---

### **Option 3: Google Cloud Run** (Scalable)

```bash
# Install gcloud CLI first
# https://cloud.google.com/sdk/docs/install

cd apps/ai-backend

# Deploy
gcloud builds submit --config cloudbuild.yaml

# Set environment variables
gcloud run services update fitos-ai-backend \
  --set-env-vars ANTHROPIC_API_KEY=sk-ant-... \
  --set-env-vars SUPABASE_URL=https://... \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

---

## 🧪 **TEST CHECKLIST**

### Mobile App Test

- [ ] Sign up with new account
- [ ] Select role (trainer or client)
- [ ] Complete onboarding
- [ ] See dashboard load
- [ ] Create a workout (trainer)
- [ ] Log nutrition entry
- [ ] Send a message
- [ ] View settings

### AI Backend Test

```bash
curl http://localhost:8000/api/v1/health
```

Should return:
```json
{"status": "healthy", "timestamp": "...", "service": "fitos-ai-backend"}
```

---

## 📱 **BUILD MOBILE APPS** (Later)

### iOS

```bash
npx cap build ios
```
Opens Xcode. Requires macOS + Apple Developer account ($99/year)

### Android

```bash
npx cap build android
```
Opens Android Studio. Requires Google Play account ($25 one-time)

---

## 🎁 **OPTIONAL: Add More Features**

### Voice Logging (Deepgram)

1. Get API key: https://console.deepgram.com
2. Add to root `.env`:
   ```
   DEEPGRAM_API_KEY=your_key_here
   ```
3. Restart AI backend

### Wearable Integration (Terra)

1. Get API key: https://dashboard.tryterra.co
2. Add to `.env`:
   ```
   TERRA_API_KEY=your_key_here
   TERRA_DEV_ID=your_dev_id_here
   ```

### Live Payments (Stripe)

1. Get live keys: https://dashboard.stripe.com
2. Update `environment.prod.ts`:
   ```typescript
   stripePublishableKey: 'pk_live_...'
   ```

---

## 🆘 **TROUBLESHOOTING**

**"Can't connect to Supabase"**
→ Check internet connection and Supabase project status

**"AI backend won't start"**
→ Make sure Python 3.11+ is installed: `python3.11 --version`

**"Poetry not found"**
→ Add to PATH: `export PATH="$HOME/.local/bin:$PATH"`

**"Module not found" errors**
→ Run `npm install` in project root

**Port already in use**
→ Kill the process: `lsof -ti:4200 | xargs kill` (or use different port)

---

## 📊 **CURRENT STATUS**

| Component | Status | URL |
|-----------|--------|-----|
| Mobile App | ✅ Ready | npm start → localhost:4200 |
| AI Backend | ✅ Configured | Needs Python 3.11 + Poetry |
| Landing Page | ✅ Ready | npm run start:landing |
| Supabase | ✅ Live | Production ready |
| Stripe | ✅ Test Mode | Has test keys |

---

## 🎯 **RECOMMENDED NEXT STEPS**

**Today:**
1. Run `npm start` and test the mobile app
2. Sign up and explore features
3. Decide if you want to deploy or test AI features first

**This Week:**
1. Deploy mobile app to Vercel/Netlify
2. Deploy AI backend to Railway/Cloud Run
3. Test production deployment

**Later:**
1. Build iOS/Android apps
2. Add optional integrations (voice, wearables)
3. Get live Stripe keys
4. Submit to app stores

---

**Questions?** Just ask! I'm here to help. 🚀
