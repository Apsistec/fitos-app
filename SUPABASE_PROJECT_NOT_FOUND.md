# CRITICAL: Supabase Project Does Not Exist

## The Issue

The domain `dmcogmopboebqiimzoej.supabase.co` **does not exist**.

Error from browser:
```
POST https://dmcogmopboebqiimzoej.supabase.co/auth/v1/signup
net::ERR_NAME_NOT_RESOLVED
```

This is a DNS error meaning the domain cannot be resolved - **the Supabase project does not exist**.

---

## What You Need to Do

### Option 1: Use Your Actual Supabase Project (If You Have One)

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Find Your Project:**
   - Look at your list of projects
   - Find the project you want to use for FitOS
   - Click on it

3. **Get the Correct Credentials:**
   - Go to: **Settings → API**
   - Copy the **Project URL** (e.g., `https://xxxyyyzzzz.supabase.co`)
   - Copy the **anon/public** key (starts with `eyJ...`)

4. **Update Your Environment File:**
   ```typescript
   // apps/mobile/src/environments/environment.prod.ts
   export const environment = {
     production: true,
     firebase: { /* existing config */ },

     // Replace these with YOUR actual values:
     supabaseUrl: 'https://YOUR-ACTUAL-PROJECT.supabase.co',
     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

     // ... rest of config
   };
   ```

5. **Rebuild and Deploy:**
   ```bash
   cd apps/mobile
   npm run build -- --configuration=production
   firebase deploy --only hosting:fitos-mobile
   ```

---

### Option 2: Create a New Supabase Project

If you don't have a Supabase project yet:

#### Step 1: Create Project

1. Go to: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `fitos-production` (or whatever you prefer)
   - **Database Password:** Create a strong password and **SAVE IT**
   - **Region:** Choose closest to your users (e.g., `US West (N. California)`)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to provision

#### Step 2: Get Credentials

Once created:
1. Go to **Settings → API**
2. You'll see:
   - **Project URL:** `https://abcdefghijklmnop.supabase.co`
   - **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**IMPORTANT:** Copy these values NOW!

#### Step 3: Set Up Database Schema

You need to run migrations to create the database tables:

```bash
# Link to your new project
npx supabase link --project-ref YOUR_PROJECT_REF

# Example:
# If URL is https://abcdefghijklmnop.supabase.co
# Then project ref is: abcdefghijklmnop

# Push database schema and migrations
npx supabase db push
```

This will create all the necessary tables (`profiles`, `trainer_profiles`, `client_profiles`, etc.).

#### Step 4: Configure Email Settings

1. Go to **Authentication → Email Templates**
2. Verify **Confirm signup** template looks good
3. Go to **Authentication → URL Configuration**
4. Set **Site URL:** `https://fitos-mobile.web.app`
5. Add **Redirect URLs:**
   - `https://fitos-mobile.web.app/**`
   - `http://localhost:4200/**`

#### Step 5: Update Environment Files

```typescript
// apps/mobile/src/environments/environment.prod.ts
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

  // NEW VALUES FROM YOUR SUPABASE PROJECT:
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'eyJ...your-actual-anon-key...',

  stripePublishableKey: 'pk_test_51SaoYU8dyNFOBioE9PzoGWPwMCeM7yET0I2mRbkq2LjwLFU0ICxvkTzF3EjwgNYYS72PKvIxjVwTL4HALdeHXFZR00PFVjwXG8',
  terraApiKey: '',
  usdaApiKey: '',
  aiBackendUrl: 'http://localhost:8000',
};
```

Also update development environment:
```typescript
// apps/mobile/src/environments/environment.ts (development)
export const environment = {
  production: false,
  firebase: { /* same as above */ },

  // For local development, you can use local Supabase OR your cloud project
  // Option A: Local Supabase (recommended for dev)
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',

  // Option B: Cloud Supabase (same as production)
  // supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  // supabaseAnonKey: 'eyJ...your-actual-anon-key...',

  // ... rest
};
```

#### Step 6: Rebuild and Deploy

```bash
# Rebuild production build
cd apps/mobile
npm run build -- --configuration=production

# Deploy to Firebase
firebase deploy --only hosting:fitos-mobile

# Test at: https://fitos-mobile.web.app
```

---

## Verification

After updating and deploying, test registration:

1. Go to: https://fitos-mobile.web.app
2. Click "Sign Up"
3. Fill in form and submit
4. Open browser console (F12)
5. You should see:
   ```
   [AuthService] Starting signUp: {email: "...", role: "trainer", fullName: "..."}
   [AuthService] SignUp response: {data: {...}, error: null}
   ```

**If successful:** You'll see the "Verify Your Email" alert!

**If still failing:** Check console for new error messages

---

## Current Invalid Configuration

**DO NOT USE THESE VALUES** (they don't work):

```typescript
// ❌ WRONG - Project does not exist
supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co',
supabaseAnonKey: 'sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y',
```

The domain `dmcogmopboebqiimzoej.supabase.co` returns `ERR_NAME_NOT_RESOLVED` which means it doesn't exist in DNS.

---

## Summary

**Problem:** The Supabase project `dmcogmopboebqiimzoej` does not exist.

**Solution:**
1. Either use your actual existing Supabase project credentials
2. Or create a new Supabase project and use those credentials

**Quick Test:**
Try visiting `https://dmcogmopboebqiimzoej.supabase.co` in your browser - you'll get an error because this domain doesn't exist.

---

## Need Help?

If you need help creating the Supabase project or have questions:

1. Supabase Docs: https://supabase.com/docs
2. Supabase Dashboard: https://supabase.com/dashboard
3. Check if you have any existing projects already

**The key issue:** You're using a Supabase URL that doesn't exist. You need to either:
- Get the correct URL from your existing project, OR
- Create a new Supabase project and use its URL
