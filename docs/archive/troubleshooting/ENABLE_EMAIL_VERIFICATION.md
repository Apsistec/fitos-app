# Enable Email Verification in Supabase

## Current Problem

When users register, they see "Registration successful, you can now sign in" instead of being prompted to verify their email.

**Root Cause:** Supabase email confirmation is disabled (default for new projects).

---

## Fix: Enable Email Confirmation (2 minutes)

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Click on your project
3. Go to: **Authentication** (in left sidebar)

### Step 2: Enable Email Confirmation

1. Click on **Providers** (under Authentication)
2. Find **Email** in the list
3. Click on **Email** to expand settings
4. Look for **"Confirm email"** toggle
5. **Turn it ON** (enable)
6. Click **Save**

### Step 3: Configure Email Templates (Optional)

1. Go to: **Authentication → Email Templates**
2. Click on **"Confirm signup"**
3. Review the template (default is fine)
4. You can customize if desired

### Step 4: Set Redirect URLs

1. Go to: **Authentication → URL Configuration**
2. Add to **Redirect URLs:**
   - `https://fitos-mobile.web.app/auth/verify-email`
   - `https://fitos-mobile.web.app/**`
   - `http://localhost:4200/**` (for local dev)
3. Click **Save**

### Step 5: Test Again

1. Go to: https://fitos-mobile.web.app
2. Try registering a new account
3. You should now see:
   - **Alert:** "Verify Your Email"
   - **Message:** "We've sent a verification link to [your-email]..."
   - **Must click OK** to proceed
4. Check your email inbox for verification link
5. Click the link to verify
6. Then you can sign in

---

## What Should Happen Now

### Before Fix (Current):
```
User registers
↓
Sees: "Registration successful, you can now sign in"
↓
User is auto-confirmed (no email sent)
↓
User can sign in immediately ❌
```

### After Fix:
```
User registers
↓
Alert: "Verify Your Email"
"We've sent a verification link to user@example.com"
↓
User clicks OK → Navigated to login
↓
Email sent to user's inbox
↓
User clicks verification link in email
↓
Email verified
↓
User can sign in ✅
```

---

## Verification Settings Location

**Path in Supabase Dashboard:**
```
Authentication → Providers → Email → Confirm email (toggle ON)
```

**Screenshot reference:**
- Left sidebar: Authentication
- Top tabs: Providers
- List of providers: Email (click to expand)
- Toggle: "Confirm email" → Turn ON

---

## Testing After Enabling

### Test 1: Registration
1. Register with a REAL email address
2. You should see alert: "Verify Your Email"
3. Click OK → Taken to login page
4. You should NOT be logged in

### Test 2: Email Delivery
1. Check your email inbox (including spam)
2. Look for email from Supabase
3. Subject: "Confirm your signup"
4. Should have a verification link

### Test 3: Verification
1. Click the link in email
2. Should redirect to: https://fitos-mobile.web.app/auth/verify-email
3. Should show: "Verifying..." then "Email Verified!"
4. Auto-redirects to login after 3 seconds

### Test 4: Login
1. Go to login page
2. Try to sign in with unverified email
3. Should show error: "Please verify your email..."
4. After verification, sign in should work

---

## If Email Doesn't Arrive

### Check These:
1. **Spam folder** - Verification emails often go to spam
2. **Email address** - Make sure you entered it correctly
3. **Supabase email quota** - Free tier has limits
4. **Email provider** - Some providers block automated emails

### View Sent Emails:
1. Go to: **Authentication → Users**
2. Find your user in the list
3. Check "Email Confirmed" column - should be ❌ (unconfirmed)
4. Check "Last Sign In" - should be empty if unverified

---

## Common Issues

### Issue 1: "Registration successful" still appearing

**Cause:** Email confirmation not enabled in Supabase

**Fix:**
1. Go to Authentication → Providers → Email
2. Enable "Confirm email" toggle
3. Save settings
4. Try registering again with NEW email

### Issue 2: User still auto-logged in

**Cause:** Our code detects auto-confirmation and signs them out

**What happens:**
1. Supabase auto-confirms user
2. Our code detects session exists
3. Immediately signs user out
4. Shows alert about email verification
5. User must still verify email to sign in

**Fix:** Enable email confirmation (Step 2 above)

### Issue 3: Verification link doesn't work

**Cause:** Redirect URLs not configured

**Fix:**
1. Go to Authentication → URL Configuration
2. Add: `https://fitos-mobile.web.app/auth/verify-email`
3. Save and try again

---

## Current Behavior

Your code has a **safety mechanism**:

```typescript
// Check if user was auto-confirmed (should NOT happen in production)
const session = data.session;
if (session) {
  console.warn('[AuthService] User was auto-confirmed. Signing out to force email verification.');
  // Sign out immediately to prevent auto-login
  await this.supabase.auth.signOut();
}
```

This means even if Supabase auto-confirms the user, we still:
1. Detect it
2. Sign them out immediately
3. Show the verification alert
4. Force them through the verification flow

**However**, enabling email confirmation in Supabase is the proper fix.

---

## Quick Steps Summary

1. ✅ Supabase Dashboard → Authentication → Providers
2. ✅ Click "Email" to expand
3. ✅ Toggle "Confirm email" ON
4. ✅ Save
5. ✅ Go to URL Configuration
6. ✅ Add redirect URLs
7. ✅ Save
8. ✅ Test registration again

**Time:** 2 minutes

---

## After You Enable It

The flow will work exactly as designed:
- Registration shows persistent alert
- User clicks OK → Goes to login
- User is NOT logged in
- Email sent to their inbox
- User verifies → Can sign in

This is the secure, proper flow for user registration.
