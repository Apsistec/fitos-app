# FitOS Deployment Checklist

Quick reference checklist for deploying to your partner for testing.

## ✅ Pre-Deployment Checklist

### 1. Firebase Setup
- [ ] Firebase project created in GCP console
- [ ] Get Firebase project ID: `firebase projects:list`
- [ ] Update `.firebaserc` with your project ID
- [ ] Login to Firebase: `firebase login`

### 2. Environment Variables
- [ ] Create `apps/landing/src/environments/environment.prod.ts`
- [ ] Add Supabase URL and anon key
- [ ] Add Stripe publishable key
- [ ] (Optional) Set Firebase Functions config for secrets

### 3. Test Build Locally
- [ ] Run `npm run build:landing`
- [ ] Verify build succeeds
- [ ] Check `dist/apps/landing/browser` exists
- [ ] Check `dist/apps/landing/server` exists

## 🚀 Landing Page Deployment (5 minutes)

### Option 1: One Command (Recommended)
```bash
npm run deploy:landing
```

### Option 2: Manual Steps
```bash
# 1. Build
npm run build:landing

# 2. Deploy
firebase deploy --only hosting,functions

# 3. Get URL from output
# Example: https://your-project-id.web.app
```

### Verify
- [ ] Visit hosting URL
- [ ] Check homepage loads
- [ ] Test navigation (Features, Pricing, Help, Docs)
- [ ] Verify accordions work
- [ ] Check mobile responsiveness

## 📱 Mobile App Deployment

### Android (Firebase App Distribution)

#### Build APK
```bash
npm run deploy:mobile:android
```

#### Upload to Firebase
1. Go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/appdistribution
2. Click "Upload release"
3. Upload: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
4. Add tester email (your partner)
5. Click "Distribute"

#### Partner Setup
- [ ] Partner installs "Firebase App Distribution" from Play Store
- [ ] Partner signs in with invited email
- [ ] Partner downloads and installs FitOS app

### iOS (TestFlight) - Requires Mac + Xcode

#### Build & Upload
```bash
# 1. Sync iOS project
npm run deploy:mobile:ios

# 2. Open Xcode
open apps/mobile/ios/App/App.xcworkspace

# 3. In Xcode:
# - Product → Archive
# - Distribute App → App Store Connect → Upload
```

#### Configure TestFlight
1. Go to: https://appstoreconnect.apple.com
2. TestFlight tab → Add External Testers
3. Add partner's email
4. Partner receives email invite

#### Partner Setup
- [ ] Partner installs TestFlight from App Store
- [ ] Partner accepts email invitation
- [ ] Partner installs FitOS from TestFlight

## 🔍 Post-Deployment Verification

### Landing Page
- [ ] All pages load correctly
- [ ] Help Center search works
- [ ] Accordions expand/collapse properly
- [ ] Documentation links work
- [ ] Forms are functional (if any)
- [ ] Dark mode toggle works
- [ ] Mobile responsive design works

### Mobile App
- [ ] App launches successfully
- [ ] Login/signup works
- [ ] Navigation between tabs works
- [ ] Settings page accessible
- [ ] Help Center opens
- [ ] Documentation link works

## 📊 Monitoring (Optional but Recommended)

### Enable Firebase Analytics
```bash
# Install Firebase SDK
npm install firebase

# Already included in mobile app
# Just verify in Firebase Console
```

### Set up Crashlytics (Catch bugs)
1. Firebase Console → Crashlytics
2. Enable for Android/iOS
3. Test crash reporting

## 🐛 Common Issues & Fixes

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### "Project not found"
```bash
firebase use --add
# Select your project
```

### "Build failed"
```bash
# Clear everything and rebuild
rm -rf node_modules dist .angular package-lock.json
npm install
npm run build:landing
```

### "Functions deployment failed"
Check Node.js version in `firebase.json` matches your local:
```bash
node --version  # Should be 22.x
```

### Android app won't install
Enable "Install from unknown sources" in Android settings

### iOS build errors
Ensure you have:
- Xcode 15+
- Valid Apple Developer account
- Proper code signing certificate

## 💰 Expected Costs (Alpha Testing Phase)

- Firebase Hosting: **$0** (free tier)
- Cloud Functions: **$0** (free tier)
- Firebase App Distribution: **$0** (always free)
- TestFlight: **$0** (included with Apple Developer)
- Apple Developer Account: **$99/year** (if doing iOS)

**Total: $0-99/year during testing**

## 📞 Get Help

- Full guide: `docs/DEPLOYMENT_GUIDE.md`
- Firebase docs: https://firebase.google.com/docs/hosting
- Questions: Create GitHub issue

## 🎯 Next Steps After Partner Testing

1. Collect feedback in shared doc/Notion
2. Prioritize bug fixes vs. new features
3. Iterate on critical issues
4. Plan beta testing with more users
5. Prepare for production launch
6. Set up custom domain (fitos.app)
7. Submit to App Store / Play Store

---

**Ready to deploy?** Start with the landing page:
```bash
npm run deploy:landing
```

Then send the hosting URL to your partner! 🚀
