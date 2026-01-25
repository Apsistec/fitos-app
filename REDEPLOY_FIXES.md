# 🚀 Redeploy with Auth Fixes

## ✅ Fixes Applied

### 1. **Sign Out Feedback**
- ✅ Shows "Signed out successfully" toast
- ✅ Navigates to login page automatically
- ✅ Clears auth state properly
- ✅ Shows error toast if sign out fails

### 2. **Account Creation Fixed**
- ✅ Production Supabase database configured
- ✅ Using real Supabase project: `dmcogmopboebqiimzoej.supabase.co`
- ✅ Users can now create accounts and log in

### 3. **Environment Configuration**
- ✅ Production environment now has Firebase config
- ✅ Production environment now has Supabase credentials

---

## 📦 Deploy Steps

### 1. Re-authenticate with Firebase

Your Firebase credentials expired. Run:

```bash
firebase login --reauth
```

This will open your browser to re-authenticate.

### 2. Deploy Mobile App

```bash
firebase deploy --only hosting:fitos-mobile
```

This deploys the mobile app with the fixes.

### 3. Test the Fixes

Visit https://fitos-mobile.web.app and test:

**Account Creation:**
1. Click "Sign Up"
2. Enter email and password
3. Choose role (Trainer or Client)
4. Account should be created successfully

**Sign Out:**
1. If logged in, go to Settings
2. Click "Sign Out" button
3. Should see:
   - ✅ "Signed out successfully" toast at bottom
   - ✅ Redirected to login page automatically

---

## 🔍 What Changed

### `apps/mobile/src/app/core/services/auth.service.ts`

**Before:**
```typescript
async signOut(): Promise<void> {
  await this.supabase.auth.signOut();
}
```

**After:**
```typescript
async signOut(): Promise<void> {
  try {
    this._state.update((s) => ({ ...s, loading: true }));
    await this.supabase.auth.signOut();

    // Clear state
    this._state.set({
      user: null,
      profile: null,
      session: null,
      loading: false,
      initialized: true,
    });

    // Show success toast
    const toast = await this.toastController.create({
      message: 'Signed out successfully',
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();

    // Navigate to login
    await this.router.navigate(['/auth/login']);
  } catch (error) {
    // Show error toast and handle error
  }
}
```

### `apps/mobile/src/environments/environment.prod.ts`

**Added:**
- Production Supabase URL
- Production Supabase anon key
- Firebase configuration

---

## 🎯 Expected Behavior After Deploy

### Sign Up Flow:
1. Visit https://fitos-mobile.web.app
2. Click "Sign Up"
3. Enter:
   - Email: `test@example.com`
   - Password: (at least 6 characters)
   - Role: Trainer or Client
4. ✅ Account created in Supabase
5. ✅ Redirected to appropriate dashboard

### Sign Out Flow:
1. While logged in, go to Settings tab
2. Scroll to bottom
3. Click "Sign Out" button
4. ✅ See green toast: "Signed out successfully"
5. ✅ Automatically redirected to login page
6. ✅ Can sign back in

---

## 🐛 If Account Creation Still Fails

Check these potential issues:

### 1. Supabase Database Triggers

The app expects a database trigger called `handle_new_user` that:
- Creates a profile in `profiles` table
- Creates role-specific profile in `trainer_profiles` or `client_profiles`

**To check:**
```bash
# Start local Supabase
npm run db:start

# Check for the trigger
supabase db diff
```

### 2. Check Supabase Auth Settings

1. Go to: https://supabase.com/dashboard/project/dmcogmopboebqiimzoej
2. Settings → Authentication
3. Ensure:
   - ✅ Email confirmations are disabled (for testing)
   - ✅ Sign-ups are enabled

### 3. Check Browser Console

Open DevTools (F12) and look for errors like:
- `Failed to create profile`
- `Trigger not found`
- `Permission denied`

---

## 📊 Database Setup (If Needed)

If the Supabase database doesn't have the schema:

```bash
# Link to production Supabase
npx supabase link --project-ref dmcogmopboebqiimzoej

# Push database schema
npx supabase db push

# This creates all tables and triggers
```

---

## ✅ Success Checklist

After deploying:

- [ ] Firebase login succeeded
- [ ] Mobile app deployed successfully
- [ ] Can create new account
- [ ] Can log in with created account
- [ ] Can see dashboard after login
- [ ] Sign out shows toast
- [ ] Sign out redirects to login
- [ ] Can sign back in

---

## 🚀 Quick Deploy Command

Run all at once:

```bash
firebase login --reauth && \
firebase deploy --only hosting:fitos-mobile && \
echo "✅ Deployed! Test at https://fitos-mobile.web.app"
```

---

## 📞 Next Steps

1. **Deploy the fixes** (run commands above)
2. **Test account creation and sign out**
3. **Send updated URL to partner**
4. **Gather feedback on the auth flow**

The landing page doesn't need redeployment since the auth fixes only affect the mobile app.

---

## 💡 Future Improvements

Consider adding:
- Email confirmation flow
- Password reset functionality
- Social auth (Google, Apple)
- Remember me option
- Biometric authentication (Face ID, Touch ID)

But for alpha testing, basic email/password auth is perfect! 🎯
