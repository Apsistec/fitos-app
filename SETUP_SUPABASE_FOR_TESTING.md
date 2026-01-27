# Set Up Supabase for Remote Testing (5 Minutes)

## Why You Need This

Your colleague can't access `localhost:4200` - they need the deployed site at `https://fitos-mobile.web.app`.

For that to work, you need a **real Supabase cloud project** (not local).

---

## Quick Setup (5 Minutes)

### Step 1: Create Supabase Project (2 min)

1. **Go to:** https://supabase.com/dashboard
2. **Sign in** (or create account if needed)
3. **Click:** "New Project"
4. **Fill in:**
   - **Organization:** Create one if you don't have one
   - **Name:** `fitos-testing` (or whatever you want)
   - **Database Password:** Create a strong password
     - **IMPORTANT:** Copy and save this password! You'll need it.
   - **Region:** Choose closest to you (e.g., `US West (N. California)`)
   - **Pricing Plan:** Free (perfect for testing)

5. **Click:** "Create new project"
6. **Wait:** 2-3 minutes for project to set up

### Step 2: Get Your Credentials (30 sec)

Once the project is created:

1. **Go to:** Settings (gear icon) → API
2. **You'll see:**
   - **Project URL:** `https://xxxyyyyzzz.supabase.co`
   - **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long)

3. **Copy both values** - you'll need them in the next step

### Step 3: Set Up Database Schema (2 min)

```bash
# In your terminal, link to the new project
npx supabase link --project-ref YOUR_PROJECT_REF

# Example: If URL is https://abcdefg.supabase.co
# Then project ref is: abcdefg

# Push your local database schema to the cloud
npx supabase db push

# This creates all your tables (profiles, trainer_profiles, etc.)
```

### Step 4: Configure Email Settings (1 min)

1. Go to: **Authentication → URL Configuration**
2. Set **Site URL:** `https://fitos-mobile.web.app`
3. Add **Redirect URLs:**
   - `https://fitos-mobile.web.app/**`
   - `http://localhost:4200/**` (for your local testing)

### Step 5: Update Production Config (1 min)

Open `apps/mobile/src/environments/environment.prod.ts` and update:

```typescript
export const environment = {
  production: true,
  firebase: {
    // Keep existing Firebase config
    apiKey: "AIzaSyBijnr_BnCtP7lbTpfAVFBvOlvt-DgjN4w",
    authDomain: "fitos-88fff.firebaseapp.com",
    projectId: "fitos-88fff",
    storageBucket: "fitos-88fff.firebasestorage.app",
    messagingSenderId: "953773965912",
    appId: "1:953773965912:web:3ad21d048d6b9788b8402d",
    measurementId: "G-KD9MMFVBDY"
  },

  // UPDATE THESE with your new Supabase credentials:
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co', // From Step 2
  supabaseAnonKey: 'eyJ...YOUR-LONG-KEY-HERE...', // From Step 2

  // Keep the rest as is:
  stripePublishableKey: 'pk_test_51SaoYU8dyNFOBioE9PzoGWPwMCeM7yET0I2mRbkq2LjwLFU0ICxvkTzF3EjwgNYYS72PKvIxjVwTL4HALdeHXFZR00PFVjwXG8',
  terraApiKey: '',
  usdaApiKey: '',
  aiBackendUrl: 'http://localhost:8000',
};
```

### Step 6: Deploy (1 min)

```bash
# Rebuild with new config
cd apps/mobile
npm run build -- --configuration=production

# Deploy to Firebase
firebase deploy --only hosting:fitos-mobile

# Done! Takes about 2 minutes
```

### Step 7: Test

Go to: **https://fitos-mobile.web.app**

1. Click "Sign Up"
2. Register an account
3. Check your email for verification link
4. Click link → Verify email
5. Sign in

**Now your colleague can test at the same URL!**

---

## Verification Emails

With cloud Supabase:
- Emails are sent to **real email addresses**
- Check your actual email inbox (and spam folder)
- Verification links will redirect to https://fitos-mobile.web.app/auth/verify-email

---

## Cost

**Free tier includes:**
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Unlimited API requests

**Perfect for testing!** You won't be charged anything.

---

## If You Get Stuck

### Can't find project URL/keys?
- Go to: https://supabase.com/dashboard
- Click your project
- Settings → API
- Copy "Project URL" and "anon public" key

### Database migration fails?
```bash
# Make sure you're linked to the right project
npx supabase link --project-ref YOUR_PROJECT_REF

# Try pushing again
npx supabase db push

# If still failing, check your database password is correct
```

### Site still shows "Failed to fetch"?
- Double-check you updated `environment.prod.ts`
- Make sure you rebuilt: `npm run build -- --configuration=production`
- Make sure you redeployed: `firebase deploy --only hosting:fitos-mobile`
- Clear browser cache or try incognito mode

---

## Example: Complete Terminal Session

```bash
# Step 3: Link to cloud Supabase
$ npx supabase link --project-ref abcdefg
✓ Linked to project: abcdefg

# Push database schema
$ npx supabase db push
✓ All migrations applied successfully!

# Step 6: Build and deploy
$ cd apps/mobile
$ npm run build -- --configuration=production
✓ Build complete

$ firebase deploy --only hosting:fitos-mobile
✓ Deploy complete!

# Done! Your colleague can now test at:
# https://fitos-mobile.web.app
```

---

## After Setup

**You can test:**
- Locally: http://localhost:4200 (uses local Supabase)
- Remotely: https://fitos-mobile.web.app (uses cloud Supabase)

**Your colleague can test:**
- Only remotely: https://fitos-mobile.web.app

---

## Summary

1. Create Supabase project (2 min)
2. Get credentials (30 sec)
3. Push database schema (2 min)
4. Configure email settings (1 min)
5. Update `environment.prod.ts` (1 min)
6. Rebuild and deploy (2 min)

**Total:** ~8 minutes to get your colleague testing!
