# Testing Locally (Development Mode)

## Current Situation

You're testing the app, not ready for production yet. The **production deployment** at https://fitos-mobile.web.app is configured to use a non-existent Supabase project, which is why you're getting the "Failed to fetch" error.

## Solution: Test Locally

For testing and development, run the app **locally** instead of using the deployed version.

---

## Quick Start (Testing Now)

### 1. Ensure Local Supabase is Running

```bash
# Check if it's running
npx supabase status

# If not running, start it
npm run db:start

# Should show:
# Project URL: http://127.0.0.1:54321
```

### 2. Start the Development Server

```bash
# Run the mobile app in development mode
npm start

# Or specifically:
cd apps/mobile
npm start
```

### 3. Open in Browser

The app will open at: **http://localhost:4200**

This uses your **local Supabase** instance which is already running!

---

## Testing the Registration Flow

Now test at http://localhost:4200:

1. ✅ Click "Sign Up"
2. ✅ Fill in the form
3. ✅ Click "Create Account"
4. ✅ You should see the "Verify Your Email" alert
5. ✅ Click "OK" to go to login page

### Email Verification in Development

When running locally with Supabase:

1. **Mailpit** captures all emails: http://127.0.0.1:54324
2. After registering, check Mailpit for the verification email
3. Click the verification link in the email
4. Complete the verification flow

---

## Development vs Production

### Development (Local Testing) ✅
- **URL:** http://localhost:4200
- **Supabase:** http://127.0.0.1:54321 (local)
- **Emails:** Captured in Mailpit (http://127.0.0.1:54324)
- **Database:** Local PostgreSQL
- **Configuration:** `environment.ts`

### Production (Live Deployment) ❌
- **URL:** https://fitos-mobile.web.app
- **Supabase:** Requires cloud Supabase project
- **Emails:** Sent via Supabase email service
- **Database:** Cloud PostgreSQL
- **Configuration:** `environment.prod.ts`

**Current issue:** Production config points to non-existent Supabase project.

---

## Why Production is Failing

The production deployment at https://fitos-mobile.web.app uses this config:

```typescript
// environment.prod.ts
supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co', // ❌ Does not exist
supabaseAnonKey: 'sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y', // ❌ Invalid format
```

This Supabase project doesn't exist, causing the "Failed to fetch" error.

---

## Complete Local Testing Workflow

### Initial Setup (One Time)

```bash
# 1. Ensure local Supabase is running
npm run db:start

# 2. Check status
npx supabase status

# 3. Start the app
npm start
```

### Testing Features

1. **Registration:**
   - http://localhost:4200 → Sign Up
   - Fill form → Submit
   - See alert → Click OK
   - Check Mailpit: http://127.0.0.1:54324
   - Click verification link in email
   - Verify email → Sign in

2. **Login:**
   - After verification, sign in with email/password
   - Should redirect to dashboard

3. **Database:**
   - View data in Supabase Studio: http://127.0.0.1:54323
   - Check `profiles` table for new users

---

## When You're Ready for Production

When you want to deploy to production, you'll need to:

### 1. Create Supabase Cloud Project

```bash
# Go to Supabase Dashboard
https://supabase.com/dashboard

# Create new project
# - Name: fitos-production
# - Region: US West
# - Save database password!

# Get credentials from Settings → API:
# - Project URL: https://YOUR-PROJECT.supabase.co
# - anon key: eyJ...
```

### 2. Run Migrations

```bash
# Link to cloud project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push local schema to cloud
npx supabase db push
```

### 3. Update Production Config

```typescript
// apps/mobile/src/environments/environment.prod.ts
export const environment = {
  production: true,
  firebase: { /* existing */ },

  // Use YOUR cloud Supabase credentials:
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'eyJ...YOUR-ACTUAL-KEY...',

  // ... rest
};
```

### 4. Deploy

```bash
npm run build -- --configuration=production
firebase deploy --only hosting:fitos-mobile
```

---

## Current Environment Status

### ✅ Development (Working)
```typescript
supabaseUrl: 'http://127.0.0.1:54321' // Local Supabase
supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' // Local key
```
**Status:** Ready for testing at http://localhost:4200

### ❌ Production (Broken)
```typescript
supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co' // Does not exist
supabaseAnonKey: 'sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y' // Invalid
```
**Status:** Will fail until you create real Supabase project

---

## Testing Checklist

**For Local Testing (Do This Now):**
- [ ] Verify local Supabase is running: `npx supabase status`
- [ ] Start dev server: `npm start`
- [ ] Open: http://localhost:4200
- [ ] Test registration flow
- [ ] Check Mailpit for verification email: http://127.0.0.1:54324
- [ ] Complete email verification
- [ ] Test sign in
- [ ] Verify dashboard loads

**For Production (Later):**
- [ ] Create Supabase cloud project
- [ ] Get real credentials
- [ ] Update `environment.prod.ts`
- [ ] Run migrations to cloud
- [ ] Rebuild and redeploy
- [ ] Test at https://fitos-mobile.web.app

---

## Quick Commands

```bash
# Start local Supabase (if not running)
npm run db:start

# Check Supabase status
npx supabase status

# Start development server
npm start

# View local database
# → http://127.0.0.1:54323 (Supabase Studio)

# View test emails
# → http://127.0.0.1:54324 (Mailpit)

# Stop local Supabase (when done)
npm run db:stop
```

---

## Summary

**Right now:** Test at **http://localhost:4200** with local Supabase

**Later (when ready for production):**
1. Create Supabase cloud project
2. Update production environment config
3. Redeploy to Firebase

The production deployment won't work until you have a real Supabase cloud project configured.
