# FitOS Help System - Quick Start Guide

**Status:** ✅ Implementation Complete - Ready for Testing

---

## 🚀 Quick Test (5 Minutes)

### 1. Start the App
```bash
cd /Users/dougwhite/Dev/fitos-app
npm start
```

### 2. Navigate to Help System
1. Launch app in browser (usually http://localhost:4200)
2. Login with any user account
3. Navigate: **More Tab** → **Settings** → **Help & Support**

### 3. Test Key Features

**Search:**
- Type "workout" in search bar
- Should see results from FAQs and guides
- Click a result to navigate

**Getting Started:**
- Click "Getting Started" card
- Check a few steps
- Verify progress persists on page refresh

**FAQs:**
- Click "FAQs" card
- Switch between categories using segment
- Expand/collapse FAQ items
- Test "Was this helpful?" buttons

**Feature Guides:**
- Click "Feature Guides" or navigate to Help Center
- Open "Voice Workout Logging" guide
- Verify sections render with HTML formatting
- Check related guides at bottom

**Contact Support:**
- Click "Contact Support" card
- Fill out form (all fields required)
- Try adding screenshot (optional)
- Verify device info auto-populates
- Submit form

---

## 📦 Database Setup (First Time Only)

### Run Migration
```bash
# Start Supabase (if not already running)
npm run db:start

# Run migration to create support_tickets table
npm run db:migrate

# Generate TypeScript types
npm run db:gen-types
```

### Verify Migration
```bash
# Check if table was created
supabase db diff
```

---

## 🔧 Backend Setup (Optional)

The frontend works without the backend (uses Supabase directly as fallback).

To enable the full backend API:

### 1. Start Backend
```bash
npm run ai:dev
```

Backend will run at: http://localhost:8000

### 2. Test API Endpoint
```bash
# Check if support_ticket route is registered
curl http://localhost:8000/docs

# Look for "Support" section in Swagger UI
```

### 3. Test Support Ticket Submission
Submit a ticket via the app - check terminal logs for:
```
INFO: Support ticket created: <ticket_id> | Category: bug | User: <user_id>
```

---

## ✅ What to Test

### Navigation Flow
- [ ] Settings → Help works
- [ ] Help → Getting Started works
- [ ] Help → FAQs works
- [ ] Help → Feature Guides → Help Center works
- [ ] Help → Contact Support works
- [ ] Back button works from all pages

### Search Functionality
- [ ] Search input debounces (300ms delay)
- [ ] Results show FAQs and guides
- [ ] Results grouped by type
- [ ] Clicking result navigates correctly
- [ ] "No results" shows when nothing matches

### Role-Based Filtering

**As Client:**
- [ ] FAQ categories don't include "Managing Clients" or "CRM & Marketing"
- [ ] Popular guides show: Voice Logging, Photo Nutrition, AI Coaching
- [ ] Can't access trainer-only guides (e.g., /guide/workout-builder)

**As Trainer:**
- [ ] FAQ categories include "Managing Clients" and "CRM & Marketing"
- [ ] Popular guides show: Workout Builder, CRM Pipeline, Email Marketing
- [ ] Can access all guides

**To test different roles:**
1. Create accounts with different roles in Supabase
2. Update `role` field in `profiles` table
3. Login with each account and verify content

### Progress Tracking
- [ ] Check boxes on Getting Started page
- [ ] Refresh page - progress persists
- [ ] Complete all steps - see completion message
- [ ] Progress stored in localStorage (check DevTools)

### Support Form
- [ ] Category required
- [ ] Subject min 5 characters
- [ ] Description 20-2000 characters (counter updates)
- [ ] Character warning shows if < 20
- [ ] Submit disabled when invalid
- [ ] Device info shows (app version, platform, OS, model)
- [ ] Screenshot upload works
- [ ] Screenshot preview shows with remove button
- [ ] Form submission works
- [ ] Success toast shows
- [ ] Navigates back to help after submit

### Content Rendering
- [ ] FAQ HTML renders correctly (bold, lists, line breaks)
- [ ] Feature guide sections render with formatting
- [ ] Tips sections display
- [ ] Related guides clickable

---

## 🐛 Common Issues

### Issue: "Table support_tickets does not exist"
**Solution:** Run migration
```bash
npm run db:migrate
```

### Issue: "Backend API unavailable" in console
**Expected:** Frontend falls back to direct Supabase insert
**Optional:** Start backend with `npm run ai:dev`

### Issue: Device info not showing
**Check:** Capacitor Device plugin installed
**Fallback:** Shows "unknown" values if plugin fails

### Issue: Screenshot upload fails
**Check:** Capacitor Camera plugin installed
**Browser:** May not work in browser, test on device/simulator

### Issue: Role filtering not working
**Check:** User has correct `role` in profiles table
**Verify:** AuthService.profile() returns role

---

## 📊 Where to Check Data

### Support Tickets (Supabase Studio)
1. Open Supabase Studio: http://localhost:54323
2. Navigate to Table Editor
3. Open `support_tickets` table
4. Verify new tickets appear after form submission

### Completed Steps (Browser DevTools)
1. Open DevTools → Application → Local Storage
2. Look for key: `help-getting-started-progress`
3. Value is JSON array of completed step IDs

---

## 🎯 Success Criteria

After testing, you should see:

✅ All 7 help pages load without errors
✅ Search returns relevant results
✅ Role-based content filtering works
✅ Progress tracking persists
✅ Support tickets submit successfully
✅ Content renders with proper HTML formatting
✅ Navigation flow works smoothly
✅ Mobile-responsive design
✅ Accessibility features work (keyboard nav, etc.)

---

## 📝 Report Issues

If you find bugs or have feedback:

1. **Check verification doc:** `docs/HELP_SYSTEM_VERIFICATION.md`
2. **Review implementation:** `docs/HELP_SYSTEM_IMPLEMENTATION_SUMMARY.md`
3. **Create support ticket** (yes, use the system to report issues about the system!)

---

## 🎉 Next Steps After Testing

1. **Production Deploy:**
   - Run migration on production Supabase
   - Update backend URL in SupportService
   - Test with real user accounts

2. **Content Updates:**
   - FAQs: `apps/mobile/src/app/features/help/data/faq-data.ts`
   - Guides: `apps/mobile/src/app/features/help/data/feature-docs-data.ts`
   - Onboarding: `apps/mobile/src/app/features/help/data/guides-data.ts`

3. **Monitor:**
   - Support ticket submissions
   - Most searched terms
   - Popular FAQs/guides
   - Completion rates for onboarding

---

**Happy Testing! 🚀**
