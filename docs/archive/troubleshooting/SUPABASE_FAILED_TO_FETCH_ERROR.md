# Supabase "Failed to Fetch" Error - Diagnosis & Solutions

**Error:** "Failed to fetch" when trying to register a new account
**Date:** Jan 25, 2026
**Status:** Investigating

---

## The Problem

When attempting to sign up for a new account on the production site (https://fitos-mobile.web.app), users see the error:

```
Failed to fetch
```

This is a generic browser error that indicates the HTTP request to Supabase failed before receiving a response.

---

## Possible Causes

### 1. **Incorrect Supabase Credentials** (Most Likely)

**Current configuration** in `environment.prod.ts`:
```typescript
supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co',
supabaseAnonKey: 'sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y',
```

**Issue:**
- The anon key format `sb_publishable_*` is unusual
- Standard Supabase anon keys start with `eyJ` (JWT format)
- This might be a placeholder or incorrect key

**How to verify:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/dmcogmopboebqiimzoej
2. Navigate to: **Settings → API**
3. Check the **anon/public** key
4. It should be a long JWT token starting with `eyJ`

**Example of correct format:**
```typescript
supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtY29nbW9wYm9lYnFpaW16b2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2...',
```

### 2. **CORS Configuration** (Less Likely)

Supabase needs to allow requests from your deployed domain.

**How to verify:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/dmcogmopboebqiimzoej
2. Navigate to: **Authentication → URL Configuration**
3. Check **Site URL** is set to: `https://fitos-mobile.web.app`
4. Check **Redirect URLs** includes: `https://fitos-mobile.web.app/**`

**Required settings:**
- Site URL: `https://fitos-mobile.web.app`
- Redirect URLs:
  - `https://fitos-mobile.web.app/**`
  - `http://localhost:4200/**` (for local dev)

### 3. **Supabase Project Not Created**

The project reference `dmcogmopboebqiimzoej` might not exist.

**How to verify:**
1. Go to: https://supabase.com/dashboard
2. Look for project: `dmcogmopboebqiimzoej`
3. If it doesn't exist, you need to create a new Supabase project

### 4. **Network/Firewall Issue**

Less likely, but possible:
- User's network blocking Supabase
- Firewall blocking requests
- ISP blocking certain domains

---

## How to Fix

### Option A: Get Correct Supabase Credentials (Recommended)

If you already have a Supabase project:

1. **Get the correct credentials:**
   ```bash
   # Go to Supabase Dashboard
   https://supabase.com/dashboard/project/dmcogmopboebqiimzoej

   # Navigate to Settings → API
   # Copy:
   # - Project URL (should be: https://dmcogmopboebqiimzoej.supabase.co)
   # - anon/public key (should start with eyJ...)
   ```

2. **Update environment file:**
   ```typescript
   // apps/mobile/src/environments/environment.prod.ts
   export const environment = {
     production: true,
     supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co', // ✅ Verify this URL
     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // ✅ Replace with real key
     // ... rest of config
   };
   ```

3. **Rebuild and redeploy:**
   ```bash
   cd apps/mobile
   npm run build -- --configuration=production
   firebase deploy --only hosting:fitos-mobile
   ```

### Option B: Create New Supabase Project

If the project doesn't exist:

1. **Create project:**
   - Go to: https://supabase.com/dashboard
   - Click "New Project"
   - Name: `fitos-production`
   - Region: Choose closest to your users (e.g., US West)
   - Database Password: Save this securely!
   - Click "Create new project"

2. **Get credentials:**
   - Go to: Settings → API
   - Copy Project URL
   - Copy anon/public key

3. **Run database migrations:**
   ```bash
   # Link to new project
   npx supabase link --project-ref YOUR_NEW_PROJECT_REF

   # Push database schema
   npx supabase db push
   ```

4. **Update environment and redeploy** (same as Option A step 2-3)

### Option C: Use Local Supabase for Testing

If you just want to test quickly:

1. **Start local Supabase:**
   ```bash
   npm run db:start
   ```

2. **Use development build:**
   ```bash
   npm start
   # Visit: http://localhost:4200
   ```

3. **Development uses local Supabase:**
   ```typescript
   // environment.ts (development)
   supabaseUrl: 'http://127.0.0.1:54321',
   supabaseAnonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
   ```

---

## Diagnostic Steps Added

I've added enhanced logging to help diagnose the issue:

### In AuthService (auth.service.ts:250-254)
```typescript
console.log('[AuthService] Starting signUp:', { email, role, fullName });
console.log('[AuthService] Supabase client initialized:', !!this.supabase);
console.log('[AuthService] Environment origin:', window.location.origin);
```

### In AuthService (auth.service.ts:267-271)
```typescript
if (error) {
  console.error('[AuthService] SignUp error:', error);
  console.error('[AuthService] Error message:', error.message);
  console.error('[AuthService] Error status:', (error as any).status);
  console.error('[AuthService] Full error:', JSON.stringify(error, null, 2));
  throw error;
}
```

### In RegisterPage (register.page.ts:406-408)
```typescript
console.error('Sign up error:', error);
console.error('Sign up error type:', typeof error);
console.error('Sign up error keys:', Object.keys(error));
```

### Enhanced User Error Message (register.page.ts:412-418)
```typescript
// Check for network errors
if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
  errorMsg = 'Network error: Unable to connect to server. Please check:\n' +
             '1. Your internet connection\n' +
             '2. If you\'re using a VPN, try disabling it\n' +
             '3. Your firewall settings';
}
```

---

## How to Get Diagnostic Info

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Go to Console tab**
3. **Try to register an account**
4. **Look for logs starting with `[AuthService]`**

The logs will show:
- Whether Supabase client initialized
- What URL is being used
- The full error object
- Error status code (if any)

**Share these console logs** to help diagnose the issue.

---

## Expected Console Output

### If credentials are correct:
```
[AuthService] Starting signUp: {email: "test@example.com", role: "trainer", fullName: "Test User"}
[AuthService] Supabase client initialized: true
[AuthService] Environment origin: https://fitos-mobile.web.app
[AuthService] SignUp response: {data: {...}, error: null}
Sign up successful!
```

### If credentials are incorrect:
```
[AuthService] Starting signUp: {email: "test@example.com", role: "trainer", fullName: "Test User"}
[AuthService] Supabase client initialized: true
[AuthService] Environment origin: https://fitos-mobile.web.app
[AuthService] SignUp error: Error: Failed to fetch
[AuthService] Error message: Failed to fetch
[AuthService] Error status: undefined
[AuthService] Full error: {...}
```

---

## Quick Fix Checklist

- [ ] Verify Supabase project exists at: https://supabase.com/dashboard
- [ ] Get correct Project URL from Settings → API
- [ ] Get correct anon/public key from Settings → API (should start with `eyJ`)
- [ ] Update `apps/mobile/src/environments/environment.prod.ts` with correct credentials
- [ ] Rebuild: `cd apps/mobile && npm run build -- --configuration=production`
- [ ] Deploy: `firebase deploy --only hosting:fitos-mobile`
- [ ] Test registration again
- [ ] Check browser console for diagnostic logs

---

## Additional Resources

- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Supabase API Settings: https://supabase.com/docs/reference/javascript/initializing

---

## Next Steps

1. **Get correct Supabase credentials** from dashboard
2. **Update environment.prod.ts** with real anon key
3. **Rebuild and redeploy**
4. **Test again with browser console open**
5. **Share console logs** if still failing

The most likely issue is that `sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y` is not a valid Supabase anon key. It should be a JWT token starting with `eyJ`.
