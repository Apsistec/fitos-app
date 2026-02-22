pp[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[p[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[p[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[pp# Supabase OAuth Configuration Guide

This guide walks you through configuring Google OAuth (and later Apple Sign In) for FitOS authentication via Supabase.

## Prerequisites

- Supabase project: https://dmcogmopboebqiimzoej.supabase.co
- Google OAuth credentials already obtained ✅
- Apple Developer Account (for Apple Sign In - optional, can be done later)

## Google OAuth Setup

### Step 1: Configure Google Cloud Console

You've already completed this step! Your credentials are stored in:
- `.env` file (local development - not committed to Git)
- Supabase Dashboard (will configure in Step 3)

### Step 2: Add Authorized Redirect URIs

In your Google Cloud Console project (console.cloud.google.com):

1. Navigate to: **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://dmcogmopboebqiimzoej.supabase.co/auth/v1/callback
   ```
4. For local development, also add:
   ```
   http://localhost:54321/auth/v1/callback
   ```
5. Click **Save**

### Step 3: Configure Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/dmcogmopboebqiimzoej
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and click to expand
4. Toggle **Enable Sign in with Google** to ON
5. Enter your credentials (found in `.env` file):
   - **Client ID**: `GOOGLE_CLIENT_ID` from `.env`
   - **Client Secret**: `GOOGLE_CLIENT_SECRET` from `.env`
6. Click **Save**

### Step 4: Test Google Sign-In

1. Start your development server:
   ```bash
   npm start
   ```

2. Navigate to the login page: http://localhost:4200/auth/login

3. Click the **"Google"** button

4. You should be redirected to Google's OAuth consent screen

5. After authorizing, you should be redirected back to FitOS and logged in

## Apple Sign In Setup (Optional - For Later)

When you're ready to add Apple Sign In:

### Step 1: Apple Developer Account Setup

1. Enroll in Apple Developer Program ($99/year): https://developer.apple.com/programs/
2. Create an App ID at: https://developer.apple.com/account/resources/identifiers/list
3. Enable "Sign In with Apple" capability for your App ID

### Step 2: Create Services ID

1. Go to: https://developer.apple.com/account/resources/identifiers/list/serviceId
2. Click the **+** button to create a new Services ID
3. Register a new Services ID:
   - **Description**: FitOS Web Login
   - **Identifier**: `com.fitos.web.signin` (or similar)
4. Enable "Sign In with Apple" and configure:
   - **Primary App ID**: Select your app's App ID
   - **Web Domain**: Your production domain (e.g., `app.fitos.com`)
   - **Return URLs**: `https://dmcogmopboebqiimzoej.supabase.co/auth/v1/callback`

### Step 3: Create Key for Apple Sign In

1. Go to: https://developer.apple.com/account/resources/authkeys/list
2. Click the **+** button to create a new key
3. Enter a key name (e.g., "FitOS Sign In with Apple Key")
4. Enable "Sign In with Apple"
5. Click **Configure** and select your Primary App ID
6. Click **Continue**, then **Register**
7. **Download the key file** (.p8) - you can only download it once!
8. Note your **Key ID** (10-character string)
9. Note your **Team ID** (found in top-right of Apple Developer portal)

### Step 4: Configure Supabase for Apple

1. Go to Supabase Dashboard → Authentication → Providers
2. Find **Apple** and toggle it ON
3. Enter the following:
   - **Services ID**: `com.fitos.web.signin` (from Step 2)
   - **Team ID**: Your 10-character team ID
   - **Key ID**: Your 10-character key ID
   - **Private Key**: Paste the contents of your .p8 file
4. Click **Save**

### Step 5: Update Environment Variables

Add to your `.env` file:
```bash
APPLE_SERVICES_ID=com.fitos.web.signin
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----
```

## Current Configuration Status

### ✅ Completed
- [x] Google OAuth credentials obtained
- [x] Environment variables configured in `.env`
- [x] Supabase credentials configured in `environment.ts`
- [x] Stripe test keys configured
- [x] OAuth UI already implemented in login/register pages

### ⏳ Pending (Next Steps)
- [ ] Configure Google OAuth provider in Supabase Dashboard (Step 3 above)
- [ ] Add authorized redirect URIs to Google Console (Step 2 above)
- [ ] Test Google Sign-In flow
- [ ] Apple Sign In setup (optional, can be done later)
- [ ] Configure Stripe webhook endpoint
- [ ] Apply database migrations to Supabase

## Testing OAuth Locally

### For Google:
1. Make sure your redirect URI includes `http://localhost:54321/auth/v1/callback` in Google Console
2. Start local Supabase: `npm run db:start`
3. Start development server: `npm start`
4. Navigate to: http://localhost:4200/auth/login
5. Click "Google" button to test

### For Apple (when configured):
1. Apple Sign In requires HTTPS, so you'll need to test in production or use ngrok:
   ```bash
   ngrok http 4200
   ```
2. Add the ngrok URL to Apple's Return URLs
3. Test through the HTTPS ngrok URL

## Troubleshooting

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Solution: Ensure `https://dmcogmopboebqiimzoej.supabase.co/auth/v1/callback` is added to Authorized redirect URIs in Google Console

**Error: "Access blocked: This app's request is invalid"**
- Solution: Make sure OAuth consent screen is configured in Google Cloud Console
- For development, set to "Testing" mode and add your email to test users

**Error: "invalid_client"**
- Solution: Double-check Client ID and Secret are correct in Supabase

### Apple Sign In Issues

**Error: "invalid_client"**
- Solution: Verify Services ID, Team ID, and Key ID are correct

**Error: "invalid_request"**
- Solution: Check that Return URLs match exactly (including protocol)

**Private key format errors**
- Solution: Ensure the .p8 file content is pasted correctly with newlines preserved

## Security Notes

1. **Never commit real credentials to Git**
   - The `.env` file is gitignored
   - Environment files should only contain test/development keys in the repo
   - Use secrets management for production (Vercel, Railway, etc.)

2. **OAuth Redirect URI Validation**
   - Always use HTTPS in production
   - Keep redirect URIs as specific as possible
   - Never use wildcard domains

3. **Key Rotation**
   - Rotate Apple keys periodically for security
   - If a key is compromised, immediately revoke and create a new one

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/social-login)
