# FitOS Deployment Guide

Complete guide for deploying the landing page and mobile apps for partner testing.

## Table of Contents
1. [Landing Page (Firebase Hosting)](#landing-page-firebase-hosting)
2. [Mobile Apps (TestFlight & Firebase App Distribution)](#mobile-apps)
3. [Environment Variables](#environment-variables)
4. [CI/CD Setup](#cicd-setup-optional)

---

## Landing Page (Firebase Hosting)

### Prerequisites
- Firebase project created (you have this)
- Firebase CLI installed globally
- Node.js 22+ installed

### Initial Setup (One-Time)

#### Step 1: Login to Firebase
```bash
firebase login
```
This will open your browser for authentication.

#### Step 2: Get Your Firebase Project ID
```bash
# List all your Firebase projects
firebase projects:list

# Copy your project ID from the list
```

#### Step 3: Update Firebase Configuration
Edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your actual project ID:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

#### Step 4: Initialize Firebase Functions (for SSR)
```bash
# The firebase.json is already configured
# Just verify the project is set
firebase use --add
# Select your project when prompted
```

### Build and Deploy

#### Production Deployment
```bash
# Build and deploy in one command
npm run deploy:landing
```

This will:
1. Generate the latest changelog
2. Build the Angular SSR application
3. Deploy to Firebase Hosting
4. Deploy Cloud Functions for SSR

#### Preview Deployment (for testing)
```bash
# Deploy to a preview channel (doesn't affect production)
npm run deploy:preview
```

You'll get a preview URL like: `https://your-project--preview-xyz.web.app`

### Manual Deployment Steps

If you prefer to do it manually:

```bash
# 1. Generate changelog
npm run changelog:generate

# 2. Build the landing page
nx build fitos-landing --configuration=production

# 3. Deploy to Firebase
firebase deploy --only hosting,functions
```

### Verify Deployment

After deployment, Firebase will show:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

Visit the Hosting URL to verify.

### Custom Domain Setup (Optional)

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `fitos.app`)
4. Follow DNS verification steps
5. Firebase will automatically provision SSL certificate

---

## Mobile Apps

### Android Testing (Firebase App Distribution)

Firebase App Distribution is perfect for beta testing before Google Play.

#### Step 1: Build Android APK
```bash
npm run deploy:mobile:android
```

This creates: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

#### Step 2: Upload to Firebase App Distribution

**Option A: Via Firebase Console (Easiest)**
1. Go to https://console.firebase.google.com/project/YOUR_PROJECT_ID/appdistribution
2. Click "Get started"
3. Click "Upload release"
4. Drag and drop `app-release.apk`
5. Add release notes: "Alpha testing build - [Date]"
6. Add tester emails (your partner's email)
7. Click "Distribute"

**Option B: Via CLI**
```bash
# Install Firebase App Distribution CLI
firebase appdistribution:distribute \
  apps/mobile/android/app/build/outputs/apk/release/app-release.apk \
  --app YOUR_FIREBASE_ANDROID_APP_ID \
  --groups "testers" \
  --release-notes "Alpha build for partner testing"
```

Your partner will receive an email with download link.

#### Android Testing Setup for Partner

Your partner needs to:
1. Download Firebase App Distribution from Google Play
2. Sign in with the email you invited
3. Download and install your app
4. Enable "Install from unknown sources" if prompted

### iOS Testing (TestFlight)

TestFlight is Apple's official beta testing platform.

#### Prerequisites
- Apple Developer Account ($99/year)
- Mac with Xcode installed
- iPhone/iPad for testing

#### Step 1: Sync iOS Project
```bash
npm run deploy:mobile:ios
```

#### Step 2: Open in Xcode
```bash
open apps/mobile/ios/App/App.xcworkspace
```

#### Step 3: Configure Signing
1. In Xcode, select project "App" in navigator
2. Select target "App"
3. Go to "Signing & Capabilities" tab
4. Select your Team
5. Xcode will automatically create provisioning profile

#### Step 4: Archive and Upload
1. In Xcode menu: Product → Archive
2. Wait for archive to complete
3. In Organizer window that opens:
   - Select the archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Click "Upload"
4. Wait for upload to complete

#### Step 5: Configure in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to TestFlight tab
4. Wait for build to process (~10 minutes)
5. Add "External Tester" group
6. Add your partner's email
7. They'll receive TestFlight invite email

#### iOS Testing Setup for Partner

Your partner needs to:
1. Download TestFlight from App Store
2. Accept email invitation
3. Install and test app

---

## Environment Variables

### Landing Page Environment

Create `apps/landing/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  stripePublishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY',
  apiUrl: 'https://your-api.cloudfunctions.net',
};
```

### Mobile App Environment

Update `apps/mobile/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  stripePublishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY',
  deepgramApiKey: 'YOUR_DEEPGRAM_API_KEY',
  terraApiKey: 'YOUR_TERRA_API_KEY',
  apiUrl: 'https://your-api.cloudfunctions.net',
};
```

### Firebase Environment Configuration

For sensitive keys in Cloud Functions:

```bash
# Set environment variables for Firebase Functions
firebase functions:config:set \
  supabase.url="YOUR_SUPABASE_URL" \
  supabase.key="YOUR_SUPABASE_SERVICE_KEY" \
  stripe.secret="YOUR_STRIPE_SECRET_KEY"

# Deploy to apply changes
firebase deploy --only functions
```

---

## CI/CD Setup (Optional)

### GitHub Actions for Automatic Deployment

Create `.github/workflows/deploy-landing.yml`:

```yaml
name: Deploy Landing Page

on:
  push:
    branches:
      - main
    paths:
      - 'apps/landing/**'
      - 'docs/CHANGELOG.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build landing page
        run: npm run build:landing

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '\${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '\${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

### Required GitHub Secrets

Add these in GitHub repository settings → Secrets:

1. `FIREBASE_SERVICE_ACCOUNT`:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Copy entire JSON content
   - Paste as GitHub secret

---

## Quick Reference

### Landing Page Commands
```bash
npm run deploy:landing      # Deploy to production
npm run deploy:preview      # Deploy to preview channel
firebase hosting:channel:list  # List all preview channels
firebase hosting:channel:delete preview  # Delete preview channel
```

### Mobile App Commands
```bash
npm run deploy:mobile:android  # Build Android APK
npm run deploy:mobile:ios      # Sync iOS project
```

### Rollback
```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

---

## Costs Estimate

### Firebase Hosting (Free Tier)
- ✅ 10 GB storage
- ✅ 360 MB/day bandwidth
- ✅ Sufficient for alpha testing

### Cloud Functions (Free Tier)
- ✅ 2M invocations/month
- ✅ 400,000 GB-seconds compute
- ✅ More than enough for SSR

### Firebase App Distribution
- ✅ **Completely free** (unlimited testers)

### TestFlight
- ✅ **Free** with Apple Developer Account

**Total monthly cost during testing:** ~$0 (assuming you have Apple Developer Account)

---

## Troubleshooting

### "Firebase project not found"
```bash
firebase use --add
# Select your project from the list
```

### "Build failed: Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "SSR function not working"
Check that `dist/apps/landing/server` exists after build. If not:
```bash
nx build fitos-landing --configuration=production
ls -la dist/apps/landing/
```

### Mobile app won't install
**Android:** Enable "Install from unknown sources" in device settings
**iOS:** Ensure device UDID is registered in provisioning profile

---

## Support

For deployment issues:
- Firebase: https://firebase.google.com/support
- TestFlight: https://developer.apple.com/testflight
- App Distribution: https://firebase.google.com/docs/app-distribution

## Next Steps After Testing

1. Gather partner feedback
2. Fix critical bugs
3. Set up production domains
4. Configure analytics (Firebase Analytics)
5. Set up error monitoring (Sentry/Firebase Crashlytics)
6. Prepare for App Store/Play Store submissions
