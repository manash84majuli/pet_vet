# Vercel Deployment Guide for VetPet Application

## Issues & Solutions for "Pages Not Working" in Vercel

### Common Problems & Fixes

#### 1. ⚠️ Missing Environment Variables

**Problem:** Pages fail with 500 errors or blank screens because environment variables aren't set.

**Solution:** Add ALL required environment variables in Vercel Dashboard:

```bash
# Navigate to: Project Settings → Environment Variables → Add New
```

**Required Environment Variables:**

| Variable Name | Type | Example Value | Notes |
|--------------|------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | `https://xxx.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | `eyJhbGc...` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | `eyJhbGc...` | **Secret** |
| `DATABASE_URL` | Production | `postgresql://postgres:...` | **Secret** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Production | `rzp_live_xxx` | Public |
| `RAZORPAY_KEY_SECRET` | Production | `xxx` | **Secret** |
| `NEXT_PUBLIC_APP_URL` | Production | `https://yourapp.vercel.app` | Public |

**Important:** After adding variables, **redeploy** the application.

---

#### 2. 🔌 Database Connection Issues (Connection Pooling)

**Problem:** Serverless functions exhaust database connections.

**Error Messages:**
```
PostgresError: remaining connection slots reserved for non-replication superuser connections
```

**Solution:**

**Option A: Use Supabase Connection Pooler (Recommended)**
```bash
# In Vercel, update DATABASE_URL to use pooler:
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```
Note the port **6543** (pooler) instead of 5432 (direct).

**Option B: Use Supabase Edge Functions**
For API routes, consider migrating to Supabase Edge Functions instead of Next.js API routes.

**Option C: Reduce Pool Size**
Already implemented in your code (`max: 5` connections), but may need adjustment.

---

#### 3. 🚫 Middleware Configuration Issues

**Problem:** Middleware blocks all routes or doesn't run properly.

**Current Configuration:** ✅ Correctly configured to exclude static assets.

**Verify in Vercel Logs:**
1. Go to Deployment → Functions → Check if middleware is invoked
2. Look for middleware errors in real-time logs

**If middleware is failing:**
- Check environment variables are available at edge runtime
- Ensure Supabase credentials are valid

---

#### 4. 🎨 PWA Service Worker Issues

**Problem:** Service worker caching causes stale content or errors.

**Quick Fix:**
1. Clear browser cache
2. Unregister service worker in DevTools → Application → Service Workers
3. Hard refresh (Ctrl+Shift+R)

**For Production:**
```javascript
// Temporarily disable PWA in next.config.mjs
const withPWAConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Change to true to disable
  // ... rest of config
});
```

---

#### 5. 🔒 CORS and API Route Issues

**Problem:** API routes return 404 or CORS errors.

**Verify:**
1. Check that `/app/api/payment/verify/route.ts` is being deployed
2. Ensure proper HTTP methods are exported:
```typescript
export async function POST(request: NextRequest) { }
```

3. Check Vercel function logs for errors

---

#### 6. 📦 Build Failures

**Problem:** Build fails on Vercel but succeeds locally.

**Common Causes:**
- Missing `@types/*` packages
- Environment variable needed at build time
- Incorrect Node.js version

**Solution:**
1. Add `.nvmrc` file to specify Node version:
```
18.17.0
```

2. Ensure build completes locally first:
```bash
npm run build
```

3. Check Vercel build logs for specific errors

---

## Deployment Checklist

Before deploying to Vercel:

### Pre-Deployment
- [ ] Build passes locally: `npm run build`
- [ ] All environment variables documented in `.env.example`
- [ ] Database accessible from external connections
- [ ] Supabase RLS policies configured
- [ ] Payment gateway (Razorpay) set to production mode

### Vercel Configuration
- [ ] All environment variables added in Vercel Dashboard
- [ ] `vercel.json` file committed to repository
- [ ] Node.js version specified (`.nvmrc` or Vercel settings)
- [ ] Framework preset: Next.js
- [ ] Build command: `npm run build` (default)
- [ ] Output directory: `.next` (default)

### Post-Deployment
- [ ] Check deployment logs for errors
- [ ] Test all protected routes (/profile, /appointments, etc.)
- [ ] Verify login/logout functionality
- [ ] Test database operations (create order, book appointment)
- [ ] Verify payment flows work
- [ ] Check middleware redirects work correctly
- [ ] Test on mobile devices (PWA functionality)

---

## Debugging Steps

### Step 1: Check Vercel Deployment Logs

```bash
# In Vercel Dashboard:
1. Select your project
2. Go to "Deployments"
3. Click on latest deployment
4. Check "Build Logs" and "Function Logs"
```

**Look for:**
- Environment variable warnings
- Database connection errors
- Module not found errors
- TypeScript compilation errors

### Step 2: Test Individual Routes

Using Vercel deployment URL (`https://your-app.vercel.app`):

1. **Homepage:** `/` - Should load immediately
2. **Shop:** `/shop` - Tests Supabase connection
3. **Login:** `/login` - Tests auth context
4. **API Route:** `/api/payment/verify` - Tests serverless functions

**Use Browser DevTools:**
- Console: Check for JavaScript errors
- Network: Check failing requests (500, 404, etc.)
- Application: Check cookies and local storage

### Step 3: Compare Logs (Local vs. Vercel)

**Local (Working):**
```bash
npm run dev
# Check terminal output
```

**Vercel (Not Working):**
```bash
# Check real-time logs in Vercel dashboard
# Or use Vercel CLI:
vercel logs your-app-name
```

Compare error messages to identify differences.

### Step 4: Progressive Testing

Deploy incrementally:

1. **Static Pages Only:**
   - Comment out all server actions temporarily
   - Deploy and verify static pages load

2. **Add Authentication:**
   - Uncomment auth context
   - Verify login/logout works

3. **Add Database:**
   - Uncomment database queries
   - Verify data fetching works

4. **Add API Routes:**
   - Uncomment payment routes
   - Verify POST requests work

---

## Common Error Messages & Fixes

### Error: "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"

**Fix:**
```bash
# Add in Vercel Dashboard → Environment Variables
# Make sure to select "Production" scope
# Then redeploy
```

### Error: "Failed to connect to database"

**Fix:**
```bash
# Update DATABASE_URL to use connection pooler
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

### Error: "Cannot find module './AdminClient'"

**This is a VS Code issue, not a Vercel issue.** The build succeeds.

**Fix:** Restart TypeScript server in VS Code (Ctrl+Shift+P → TypeScript: Restart TS Server)

### Error: "Middleware is blocking all requests"

**Fix:**
Check middleware matcher configuration:
```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)",
  ],
};
```

### Error: "504 Gateway Timeout"

**Cause:** Serverless function exceeded time limit (10s default)

**Fix:**
1. Optimize slow database queries
2. Add indexes to frequently queried columns
3. Increase function timeout in `vercel.json`:
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

---

## Performance Optimization for Vercel

### 1. Enable Edge Caching

Add cache headers to API responses:
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
  }
});
```

### 2. Optimize Images

Images are already configured for optimization. Ensure remote patterns are correct:
```javascript
// next.config.mjs
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**.supabase.co",
    },
  ],
}
```

### 3. Use ISR for Product Pages

For product listings, enable Incremental Static Regeneration:
```typescript
// app/shop/page.tsx
export const revalidate = 3600; // Revalidate every hour
```

### 4. Database Query Optimization

- Add indexes on frequently queried columns
- Use `SELECT` with specific columns instead of `SELECT *`
- Implement pagination for large datasets

---

## Monitoring & Alerts

### Recommended Tools:

1. **Vercel Analytics** (Built-in)
   - Enable in Project Settings
   - Track real user metrics

2. **Sentry** (Error Tracking)
   ```bash
   npm install @sentry/nextjs
   ```

3. **Vercel Speed Insights**
   - Automatically enabled for Pro plans
   - Shows Core Web Vitals

4. **Supabase Monitoring**
   - Monitor database connections
   - Track query performance
   - Set up alerts for high usage

---

## Security Checklist for Production

- [ ] All sensitive env vars marked as "Secret" in Vercel
- [ ] Supabase RLS policies enabled on all tables
- [ ] Rate limiting configured (consider Vercel Edge Config)
- [ ] CORS configured properly for API routes
- [ ] Content Security Policy headers added
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Secrets not committed to Git
- [ ] Production Razorpay keys used (not test keys)

---

## Quick Fix Commands

### Redeploy Latest Commit
```bash
# Via Vercel Dashboard:
Deployments → Latest → Redeploy

# Via CLI:
vercel --prod
```

### Clear Build Cache
```bash
# In Vercel Dashboard:
Project Settings → General → Clear Build Cache
# Then trigger new deployment
```

### View Real-Time Logs
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Stream logs
vercel logs --follow
```

### Test Production Build Locally
```bash
# Build for production
npm run build

# Start production server
npm start

# Open browser to http://localhost:3000
```

---

## Regional Performance Optimization

Your app is configured for `"bom1"` region (Mumbai, India).

**For global users:**
```json
// vercel.json
{
  "regions": ["bom1", "sin1", "syd1"]
}
```

Available regions:
- `bom1` - Mumbai, India
- `sin1` - Singapore
- `syd1` - Sydney, Australia
- `iad1` - Washington DC, USA
- `lhr1` - London, UK

---

## Contact & Support

If pages still don't work after following this guide:

1. **Check Vercel Status:** https://www.vercel-status.com
2. **Vercel Discord:** https://vercel.com/discord
3. **GitHub Issues:** Create issue with:
   - Deployment URL
   - Build logs (sanitized)
   - Browser console errors (screenshot)
   - Steps to reproduce

---

## Emergency Rollback

If deployment breaks production:

```bash
# Via Dashboard:
1. Go to Deployments
2. Find last working deployment
3. Click "..." → Promote to Production

# Via CLI:
vercel rollback
```

This immediately reverts to the previous working version.

---

**Last Updated:** February 15, 2026  
**Version:** 1.0  
**Author:** GitHub Copilot
