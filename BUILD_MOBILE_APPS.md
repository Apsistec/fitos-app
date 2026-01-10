# 📱 Building Native Mobile Apps - Complete Guide

**Status:** Capacitor is configured and ready. Mobile app is built.

---

## ⚠️ **IMPORTANT PREREQUISITES**

### For iOS Development

**Required:**
- macOS computer (cannot build iOS apps on Windows/Linux)
- Xcode 15+ (free, download from Mac App Store)
- Apple Developer account ($99/year)
- CocoaPods (Ruby gem manager)

**Check if you have these:**
```bash
# Check macOS version (need 13+)
sw_vers

# Check Xcode (need 15+)
xcodebuild -version

# Check CocoaPods
pod --version
```

### For Android Development

**Required:**
- Android Studio (free)
- Java JDK 17+
- Android SDK (installed with Android Studio)

**Download:**
- Android Studio: https://developer.android.com/studio

---

## 🍎 **iOS BUILD PROCESS**

### Step 1: Install Prerequisites

```bash
# Install CocoaPods
sudo gem install cocoapods

# May need to use sudo if permission denied
```

**If you get permission errors:**
```bash
# Use Homebrew version instead
brew install cocoapods
```

---

### Step 2: Add iOS Platform

```bash
# From project root
npx cap add ios

# This creates: /ios/ directory with Xcode project
```

**Expected output:**
```
✔ Adding native ios project in: ios
✔ add in 10.45s
✔ Copying web assets from apps/mobile/www/browser to ios/App/public in 156.10ms
✔ Creating capacitor.config.json in ios/App in 1.18ms
✔ copy ios in 185.63ms
✔ Updating iOS plugins in 4.91ms
```

---

### Step 3: Open in Xcode

```bash
npx cap open ios
```

**Xcode will open automatically.**

---

### Step 4: Configure App in Xcode

**1. Select the "App" target (top left)**

**2. Go to "Signing & Capabilities" tab**
   - Check "Automatically manage signing"
   - Select your Apple Developer team
   - Bundle Identifier should be: `com.fitos.app`

**3. Go to "General" tab**
   - Set Display Name: `FitOS`
   - Set Version: `1.0.0`
   - Set Build: `1`
   - Set Deployment Target: `iOS 15.0` or higher

**4. Set App Icon (optional)**
   - Click "App Icon" in Assets.xcassets
   - Drag images for different sizes
   - Or use https://appicon.co to generate all sizes

---

### Step 5: Build for Testing

**Test on Simulator:**
1. Select a simulator from device menu (e.g., "iPhone 15 Pro")
2. Click the Play button (▶) or press Cmd+R
3. App should launch in simulator

**Test on Real Device:**
1. Connect iPhone via USB
2. Select your iPhone from device menu
3. Click Play button
4. First time: May need to trust developer certificate on iPhone
   - Settings > General > VPN & Device Management > Trust

---

### Step 6: Archive for App Store

**1. Select "Any iOS Device" from device menu**

**2. Product > Archive**
   - This builds a release version
   - Takes 2-5 minutes

**3. When done, Organizer window opens**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Click "Upload"
   - Sign in with Apple ID

**4. Wait for processing (30-90 minutes)**
   - You'll get email when ready
   - Then submit for review in App Store Connect

---

### Step 7: Submit to App Store

**Go to:** https://appstoreconnect.apple.com

**1. Create App Listing:**
   - Click "My Apps" > "+"
   - Name: FitOS
   - Primary Language: English
   - Bundle ID: com.fitos.app
   - SKU: fitos-app-001

**2. Fill App Information:**
   - Description
   - Keywords
   - Support URL
   - Marketing URL
   - Privacy Policy URL

**3. Upload Screenshots:**
   - 6.5" Display (iPhone 15 Pro Max): Required
   - 5.5" Display (iPhone 8 Plus): Optional

**Screenshot sizes:**
   - 6.7": 1290 x 2796 pixels
   - 6.5": 1242 x 2688 pixels
   - 5.5": 1242 x 2208 pixels

**4. Select Build:**
   - Choose the build you uploaded
   - May take 30-90 min to appear

**5. Submit for Review:**
   - Add review notes if needed
   - Submit!

**6. Wait for Approval:**
   - Usually 1-3 days
   - Check status in App Store Connect

---

## 🤖 **ANDROID BUILD PROCESS**

### Step 1: Install Android Studio

**Download:** https://developer.android.com/studio

**During setup:**
- Install Android SDK
- Install Android SDK Platform-Tools
- Install Android Virtual Device

---

### Step 2: Add Android Platform

```bash
# From project root
npx cap add android

# This creates: /android/ directory with Gradle project
```

---

### Step 3: Open in Android Studio

```bash
npx cap open android
```

**Android Studio will open automatically.**

**First time:**
- May need to download additional SDK components
- Let it install everything it needs
- May take 10-15 minutes

---

### Step 4: Configure App

**1. Open `android/app/build.gradle`**

Update version info:
```gradle
android {
    defaultConfig {
        applicationId "com.fitos.app"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

**2. Update `android/app/src/main/res/values/strings.xml`:**
```xml
<resources>
    <string name="app_name">FitOS</string>
    <string name="title_activity_main">FitOS</string>
</resources>
```

---

### Step 5: Build for Testing

**Test in Emulator:**
1. Tools > Device Manager
2. Create Virtual Device (e.g., Pixel 7)
3. Click Play button (▶) in toolbar
4. Select emulator
5. App launches in emulator

**Test on Real Device:**
1. Enable Developer Options on Android phone:
   - Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings > Developer Options > USB Debugging
3. Connect via USB
4. Click Play button
5. Select your device

---

### Step 6: Generate Signed APK/AAB

**1. Create Keystore (first time only):**

```bash
cd android/app
keytool -genkey -v -keystore fitos-release.keystore -alias fitos -keyalg RSA -keysize 2048 -validity 10000
```

**Enter details:**
- Password: (create strong password)
- Name, Organization, etc.

**IMPORTANT:** Save this keystore file safely! You'll need it for all future updates.

---

**2. Configure Signing:**

Create `android/keystore.properties`:
```properties
storeFile=app/fitos-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=fitos
keyPassword=YOUR_KEY_PASSWORD
```

Update `android/app/build.gradle`:
```gradle
// Add at top
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

**3. Build Release Bundle:**

**In Android Studio:**
- Build > Generate Signed Bundle / APK
- Select "Android App Bundle"
- Select your keystore
- Enter passwords
- Select "release" build variant
- Click "Finish"

**Output:** `android/app/release/app-release.aab`

**Or via command line:**
```bash
cd android
./gradlew bundleRelease
```

---

### Step 7: Submit to Google Play

**Go to:** https://play.google.com/console

**1. Create App:**
- Click "Create app"
- Name: FitOS
- Default language: English
- App or game: App
- Free or paid: Free

**2. Fill Store Listing:**
- Short description (80 chars)
- Full description (4000 chars)
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (2-8 images):
   - Phone: 320-3840px, 16:9 or 9:16
   - 7" tablet: 320-3840px
   - 10" tablet: 320-3840px

**3. Content Rating:**
- Complete questionnaire
- Submit for rating

**4. Target Audience:**
- Select age ranges
- Complete questionnaire

**5. Upload App Bundle:**
- Production > Create new release
- Upload the .aab file
- Add release notes
- Review and rollout

**6. Submit for Review:**
- Usually approved within hours
- Can take up to 7 days for first app

---

## 🔄 **UPDATING YOUR APPS**

### When You Make Changes

**1. Rebuild the web app:**
```bash
npm run build
```

**2. Sync with Capacitor:**
```bash
npx cap sync
```

**3. For iOS:**
```bash
npx cap open ios
# Increment build number
# Product > Archive > Upload
```

**4. For Android:**
```bash
npx cap open android
# Increment versionCode
# Build > Generate Signed Bundle
# Upload to Play Console
```

---

## 🐛 **TROUBLESHOOTING**

### iOS: "No profiles for 'com.fitos.app'"

**Fix:**
1. Select your Apple Developer team
2. Xcode will automatically create certificates

---

### iOS: CocoaPods Install Fails

**Fix:**
```bash
cd ios/App
pod install --repo-update
```

---

### Android: Gradle Build Fails

**Fix:**
```bash
cd android
./gradlew clean
./gradlew build
```

---

### Android: "SDK location not found"

**Fix:** Create `android/local.properties`:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

Replace `YOUR_USERNAME` with your actual username.

---

## 📋 **MOBILE APP CHECKLIST**

### Before Submitting

- [ ] Test on real devices (iOS & Android)
- [ ] All features work without crashes
- [ ] Handles offline mode gracefully
- [ ] Push notifications work (if implemented)
- [ ] App icons look good
- [ ] Launch screens configured
- [ ] Privacy policy URL works
- [ ] Terms of service URL works
- [ ] Support email/URL configured
- [ ] App description is compelling
- [ ] Screenshots show key features
- [ ] Version numbers incremented

---

## ⏱️ **TIMELINE ESTIMATE**

| Task | Time |
|------|------|
| Set up iOS project | 30 min |
| Configure & test iOS | 1 hour |
| Create App Store listing | 1 hour |
| Submit to App Store | 15 min |
| **Total iOS:** | **~3 hours** |
| | |
| Set up Android project | 30 min |
| Configure & test Android | 1 hour |
| Create Play Store listing | 1 hour |
| Generate signed bundle | 30 min |
| Submit to Play Store | 15 min |
| **Total Android:** | **~3 hours** |
| | |
| **Grand Total:** | **~6 hours** |

Plus review time:
- iOS: 1-3 days
- Android: Few hours to 7 days

---

## 💡 **TIPS**

1. **Build iOS first** - Longer review process
2. **Test thoroughly** - Rejection delays launch by days
3. **Screenshots matter** - Show your best features
4. **Save your keystores!** - Backup Android keystore safely
5. **Version consistently** - Keep iOS and Android in sync
6. **Use TestFlight** - Beta test iOS app before public release
7. **Internal testing** - Use Play Console internal testing track

---

## 🆘 **STILL STUCK?**

**Common issues:**

1. **No macOS computer:** Can't build iOS apps
   - Solution: Use MacStadium, MacinCloud, or friend's Mac
   - Or focus on Android first

2. **Don't have developer accounts:** Need to purchase
   - Apple: $99/year
   - Google: $25 one-time

3. **Build errors:** Check Capacitor docs
   - https://capacitorjs.com/docs/ios
   - https://capacitorjs.com/docs/android

---

**Ready to build?** Start with whichever platform you have access to! 🚀
