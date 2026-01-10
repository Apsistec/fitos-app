# 🚀 FitOS Deployment Guide

**All production builds are complete!** Follow this guide to deploy.

---

## ✅ **WHAT'S READY**

### Production Builds
- ✅ **Mobile App:** `apps/mobile/www/browser/` (2.47 MB)
- ✅ **Landing Page:** `dist/apps/landing/` (SSR-ready)
- ✅ **AI Backend:** `apps/ai-backend/` (configured)

### Configuration
- ✅ Supabase production database connected
- ✅ Anthropic API key configured
- ✅ Capacitor configured for iOS/Android builds

---

## 🎯 **DEPLOYMENT OPTIONS**

### Option 1: Vercel (Recommended - Easiest)

**Mobile App + Landing Page in 5 minutes:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy Mobile App
cd apps/mobile/www/browser
vercel --prod
# Name it: fitos-app
# Copy the URL (e.g., https://fitos-app.vercel.app)

# Deploy Landing Page
cd ../../../../dist/apps/landing
vercel --prod
# Name it: fitos-landing
# Copy the URL (e.g., https://fitos-landing.vercel.app)
```

**Cost:** Free for hobby projects

---

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy Mobile App
netlify deploy --prod --dir=apps/mobile/www/browser
# Site name: fitos-app

# Deploy Landing Page
netlify deploy --prod --dir=dist/apps/landing/browser
# Site name: fitos-landing
```

**Cost:** Free for personal projects

---

### Option 3: Railway (For AI Backend)

**Best for deploying the AI backend:**

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your FitOS repo
5. Set root directory to `apps/ai-backend`
6. Add environment variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   SUPABASE_URL=https://dmcogmopboebqiimzoej.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ENVIRONMENT=production
   ```
7. Deploy!

**Cost:** $5/month (includes $5 free credit)

**Your AI backend will be live at:** `https://fitos-ai-backend-production.up.railway.app`

---

### Option 4: Google Cloud Run (Scalable)

**For the AI backend:**

```bash
cd apps/ai-backend

# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Set environment variables
gcloud run services update fitos-ai-backend \
  --set-env-vars ANTHROPIC_API_KEY=sk-ant-... \
  --set-env-vars SUPABASE_URL=https://dmcogmopboebqiimzoej.supabase.co \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
  --set-env-vars ENVIRONMENT=production
```

**Cost:** Pay-per-use (free tier: 2M requests/month)

---

## 📱 **MOBILE APPS (iOS & Android)**

### Prerequisites

**For iOS:**
- macOS computer
- Xcode installed
- Apple Developer account ($99/year)

**For Android:**
- Android Studio installed
- Google Play Developer account ($25 one-time)

### Build iOS App

```bash
# Install CocoaPods (if not installed)
sudo gem install cocoapods

# Add iOS platform
npx cap add ios

# Open in Xcode
npx cap open ios
```

**In Xcode:**
1. Select "Product" > "Archive"
2. Click "Distribute App"
3. Follow App Store Connect upload wizard

### Build Android App

```bash
# Add Android platform
npx cap add android

# Open in Android Studio
npx cap open android
```

**In Android Studio:**
1. Build > Generate Signed Bundle / APK
2. Select "Android App Bundle"
3. Create or select keystore
4. Build and upload to Play Console

---

## 🔧 **POST-DEPLOYMENT SETUP**

### 1. Update Mobile App to Use Deployed AI Backend

Once AI backend is deployed, update the mobile app:

**Edit:** `apps/mobile/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co',
  supabaseAnonKey: 'sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y',
  aiApiUrl: 'https://your-ai-backend.railway.app/api/v1', // UPDATE THIS
  stripePublishableKey: 'pk_live_...', // Update when ready for payments
};
```

Then rebuild and redeploy:
```bash
npm run build
cd apps/mobile/www/browser
vercel --prod
```

---

### 2. Set Up Custom Domains (Optional)

**Vercel:**
1. Go to project settings
2. Click "Domains"
3. Add your domain (e.g., `app.fitos.com`)
4. Update DNS records as shown

**Railway:**
1. Go to project settings
2. Click "Networking" > "Custom Domain"
3. Add domain (e.g., `api.fitos.com`)
4. Update DNS CNAME record

---

### 3. Enable Production Stripe (Optional)

1. Go to https://dashboard.stripe.com
2. Switch from "Test mode" to "Live mode"
3. Get live API keys
4. Update `environment.prod.ts`:
   ```typescript
   stripePublishableKey: 'pk_live_...'
   ```
5. Rebuild and redeploy

---

## 📊 **DEPLOYMENT CHECKLIST**

### Phase 1: Web Deployment

- [ ] Deploy mobile app to Vercel/Netlify
- [ ] Deploy landing page to Vercel/Netlify
- [ ] Deploy AI backend to Railway/Cloud Run
- [ ] Update mobile app with AI backend URL
- [ ] Test live app end-to-end
- [ ] Sign up as trainer and client
- [ ] Test all core features

### Phase 2: Mobile Apps

- [ ] Build iOS app with Xcode
- [ ] Submit to App Store Connect
- [ ] Build Android app with Android Studio
- [ ] Submit to Google Play Console
- [ ] Wait for app store approval (1-7 days)

### Phase 3: Production Polish

- [ ] Set up custom domains
- [ ] Enable live Stripe payments
- [ ] Add Deepgram key for voice features (optional)
- [ ] Add Terra key for wearables (optional)
- [ ] Configure Firebase for push notifications (optional)
- [ ] Set up monitoring/analytics

---

## 🔒 **SECURITY CHECKLIST**

Before going live:

- [ ] Change all default passwords
- [ ] Review Supabase Row Level Security policies
- [ ] Enable HTTPS only (Vercel/Netlify do this automatically)
- [ ] Set up Stripe webhooks for payment processing
- [ ] Configure CORS properly on AI backend
- [ ] Enable rate limiting on API endpoints
- [ ] Set up error tracking (Sentry, etc.)

---

## 💰 **ESTIMATED COSTS**

### Free Tier (Testing)
- **Mobile App:** Free (Vercel/Netlify)
- **Landing Page:** Free (Vercel/Netlify)
- **AI Backend:** Free (Railway $5 credit)
- **Supabase:** Free tier
- **Anthropic:** $5 free credit
- **Total:** $0/month initially

### Production (Paid)
- **Hosting:** ~$10/month (Vercel Pro if needed)
- **AI Backend:** ~$10-20/month (Railway or Cloud Run)
- **Supabase:** $25/month (Pro tier)
- **Anthropic API:** ~$10-30/month (usage-based)
- **Stripe:** 2.9% + $0.30 per transaction
- **Total:** ~$55-85/month + transaction fees

### Mobile Apps (One-time + Annual)
- **Apple Developer:** $99/year
- **Google Play:** $25 one-time
- **Total:** $124 first year, $99/year after

---

## 🆘 **TROUBLESHOOTING**

### Mobile App Won't Deploy

**Issue:** Vercel shows 404 errors

**Fix:**
```bash
# Make sure index.html exists
ls apps/mobile/www/browser/index.html

# Deploy the correct directory
cd apps/mobile/www/browser
vercel --prod
```

---

### AI Backend Deploy Fails

**Issue:** Missing dependencies

**Fix:** Check `pyproject.toml` includes all packages:
```bash
cd apps/ai-backend
poetry check
poetry install
```

---

### Can't Connect to Deployed API

**Issue:** CORS errors in browser console

**Fix:** Update AI backend CORS origins:

**Edit:** `apps/ai-backend/.env`
```bash
CORS_ORIGINS=https://fitos-app.vercel.app,https://app.yourdomain.com
```

Redeploy the AI backend.

---

## 📚 **NEXT STEPS**

After deploying:

1. **Test everything thoroughly**
   - Sign up as different roles
   - Create workouts, log nutrition
   - Test messaging
   - Verify AI chat works (if backend deployed)

2. **Set up monitoring**
   - Vercel Analytics (free)
   - Railway logs
   - Supabase monitoring dashboard

3. **Launch checklist**
   - Create social media accounts
   - Prepare launch announcement
   - Invite beta testers
   - Collect feedback

4. **Iterate**
   - Fix bugs
   - Add requested features
   - Optimize performance
   - Scale as needed

---

## ✨ **YOU'RE READY TO DEPLOY!**

**Recommended order:**

1. **Today:** Deploy mobile app to Vercel (5 min)
2. **Today:** Deploy landing page to Vercel (5 min)
3. **Tomorrow:** Deploy AI backend to Railway (15 min)
4. **Next week:** Build and submit mobile apps

**Start here:**
```bash
npm install -g vercel
cd apps/mobile/www/browser
vercel --prod
```

Good luck! 🚀
