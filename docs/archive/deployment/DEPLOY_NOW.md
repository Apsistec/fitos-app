# 🚀 Ready to Deploy - Quick Start

Your Firebase project is configured and ready to deploy!

## Project Configuration ✅

- **Firebase Project ID:** `fitos-88fff`
- **Landing Site:** `fitos-88fff` (https://fitos-88fff.web.app)
- **Mobile PWA Site:** `fitos-mobile` (https://fitos-mobile.web.app)

## Deploy Landing Page (3 commands)

```bash
# 1. Build the landing page
npm run build:landing

# 2. Deploy to Firebase
npm run deploy:landing

# 3. Visit your site
# URL will be shown after deployment
```

Expected output:
```
✔  Deploy complete!

Hosting URL: https://fitos-88fff.web.app
Hosting URL: https://fitos-88fff.firebaseapp.com
```

## Deploy Mobile PWA (Web Version)

```bash
# 1. Build mobile app
npm run build

# 2. Deploy to Firebase
npm run deploy:mobile:web

# 3. Visit mobile site
# URL will be shown after deployment
```

Expected output:
```
✔  Deploy complete!

Hosting URL: https://fitos-mobile.web.app
Hosting URL: https://fitos-mobile.firebaseapp.com
```

## Deploy Both at Once

```bash
npm run deploy:both
```

This builds and deploys both landing and mobile web apps.

## Preview Deployments (Test Before Going Live)

```bash
# Preview landing page
npm run deploy:preview:landing

# Preview mobile app
npm run deploy:preview:mobile
```

Preview URLs look like: `https://fitos-88fff--preview-xyz.web.app`

## Your URLs After Deployment

### Landing Page
- **Primary:** https://fitos-88fff.web.app
- **Alternate:** https://fitos-88fff.firebaseapp.com

### Mobile PWA
- **Primary:** https://fitos-mobile.web.app
- **Alternate:** https://fitos-mobile.firebaseapp.com

## Send to Your Partner

After deploying, send these links to your partner:

**For desktop/web testing:**
```
Landing Page: https://fitos-88fff.web.app

Test these pages:
- Home page
- Features (/features)
- Pricing (/pricing)
- Help Center (/help)
- Documentation (/docs)
- Changelog (/changelog)
```

**For mobile app testing (PWA):**
```
Mobile App: https://fitos-mobile.web.app

On mobile, they can:
1. Visit the URL in Safari/Chrome
2. Tap "Add to Home Screen"
3. Use it like a native app

Or use the Firebase App Distribution method from DEPLOYMENT_GUIDE.md
```

## Quick Verification Checklist

After deployment, verify:

### Landing Page
- [ ] Home page loads
- [ ] All navigation links work
- [ ] Help Center search works
- [ ] Accordions expand/collapse
- [ ] Documentation links work
- [ ] Mobile responsive
- [ ] Dark mode toggle works

### Mobile PWA
- [ ] App loads on mobile browser
- [ ] Can install to home screen
- [ ] Navigation works
- [ ] Settings page accessible

## Common Issues

### Build Failed
```bash
# Clear and rebuild
rm -rf node_modules dist .angular package-lock.json
npm install
npm run build:landing
```

### "No targets found"
Make sure you're in the project root directory with firebase.json

### SSR Function Not Deploying
Verify Node.js version matches firebase.json (22.x):
```bash
node --version
```

## Next Steps

1. ✅ Deploy landing page
2. ✅ Deploy mobile PWA
3. ✅ Test both sites yourself
4. ✅ Send URLs to partner
5. ✅ Gather feedback
6. ✅ Iterate and redeploy

## Custom Domain (Later)

Once testing is successful, you can add your custom domain:

1. Firebase Console → Hosting
2. Add custom domain (e.g., fitos.app)
3. Follow DNS setup instructions
4. SSL certificate auto-provisioned

## Cost During Testing

- **Firebase Hosting:** FREE (10GB storage, 360MB/day bandwidth)
- **Cloud Functions (SSR):** FREE (2M invocations/month)
- **Total:** $0/month during alpha testing

## Need Help?

- Full guide: `docs/DEPLOYMENT_GUIDE.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Firebase Console: https://console.firebase.google.com/project/fitos-88fff

---

**Ready? Deploy now:**

```bash
npm run deploy:landing
```

Then visit https://fitos-88fff.web.app to see your site live! 🎉
