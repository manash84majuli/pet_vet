# Vercel Troubleshooting: Profile, POS & Store Manager Pages

## 🔴 Critical Issue: Pages Not Working in Production

### Affected Pages:
- `/profile` - User profile and pet management
- `/pos` - Point of Sale (Admin/Store Manager only)
- `/store-manager` - Store management dashboard (Admin/Store Manager only)

---

## Root Causes & Solutions

### 1. ⚠️ DATABASE_URL Not Using Connection Pooler

**Problem:** Serverless functions exhaust direct PostgreSQL connections.

**Error Symptoms:**
- Pages loading forever (timeout)
- 500 Internal Server Error
- "remaining connection slots reserved for non-replication superuser connections"

**✅ SOLUTION: Use Supabase Connection Pooler**

In Vercel Dashboard → Environment Variables:

```bash
# ❌ WRONG (Direct connection - port 5432)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# ✅ CORRECT (Connection pooler - port 6543)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

**Key differences:**
- Port: `6543` (pooler) NOT `5432` (direct)
- Query parameter: `?pgbouncer=true`

**After changing, REDEPLOY!**

---

### 2. 🔐 Missing Environment Variables

**Problem:** Auth or database connections fail silently.

**Required Environment Variables:**

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | `eyJhbGc...` |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database | See above (use port 6543) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL | `https://yourapp.vercel.app` |

**Check in Vercel:**
1. Go to Project Settings → Environment Variables
2. Click "Show Secret" to verify values are correct
3. Ensure all are set for "Production" environment
4. After changes, redeploy

---

### 3. 👤 User Role Not Set in Production Database

**Problem:** POS and Store Manager pages check user roles. If role is not set, access denied.

**Symptoms:**
- Redirected to homepage immediately after login
- Can access `/profile` but not `/pos` or `/store-manager`

**✅ SOLUTION: Set User Role in Production Database**

**Option A: Using Supabase Dashboard (SQL Editor)**

```sql
-- Check current roles
SELECT id, email, role FROM profiles;

-- Set role to store_manager
UPDATE profiles 
SET role = 'store_manager' 
WHERE email = 'your-email@example.com';

-- Or set to admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

**Option B: Create Admin User Script**

Create a file `scripts/create-admin.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function createAdmin(email: string) {
  const updated = await db
    .update(schema.profiles)
    .set({ role: "admin" })
    .where(eq(schema.profiles.email, email))
    .returning();
  
  console.log("Updated:", updated);
  await client.end();
}

createAdmin(process.argv[2]);
```

Run:
```bash
npx tsx scripts/create-admin.ts your-email@example.com
```

**User Roles:**
- `customer` - Default, can't access POS or Store Manager
- `store_manager` - Can access both POS and Store Manager
- `admin` - Can access everything

---

### 4. ⏱️ Database Query Timeout (Cold Start)

**Problem:** First request after inactivity times out.

**Symptoms:**
- Pages work after 2-3 refresh attempts
- First visit shows 504 Gateway Timeout
- Subsequent visits work fine

**✅ SOLUTION: Optimize Database Queries**

Update `vercel.json` to increase timeout:

```json
{
  "functions": {
    "app/**/*.tsx": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

**Optimize connection pooling:**

Update `lib/drizzle.ts`:

```typescript
const queryClient =
  globalForPostgres.queryClient ??
  postgres(process.env.DATABASE_URL, {
    prepare: true,
    max: 1, // Single connection for serverless
    idle_timeout: 20,
    connect_timeout: 10,
  });
```

---

### 5. 🔄 Middleware Issues

**Problem:** Middleware blocks or incorrectly handles routes.

**Check middleware logs in Vercel:**
1. Deployment → Functions → Select a function
2. Look for middleware invocations
3. Check for errors in real-time logs

**Verify middleware is working:**

The middleware should:
- Allow unauthenticated users to access `/login`, `/signup`
- Redirect authenticated users from `/login` to `/`
- Protect `/profile`, `/pos`, `/store-manager`

**If middleware is failing:**
- Check `NEXT_PUBLIC_SUPABASE_URL` is set
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- Ensure no trailing slashes in URLs

---

### 6. 📦 Build/Runtime Configuration

**Problem:** Pages use server features that need Node.js runtime.

**✅ SOLUTION: Ensure Node.js Runtime**

Your pages use:
- `cookies()` from "next/headers"
- Direct database queries
- Server-side redirects

These require Node.js runtime (not Edge).

**Verify in `next.config.mjs`:**
```javascript
// Should NOT have:
export const runtime = 'edge'; // ❌ Remove this if present

// Default is Node.js runtime ✅
```

**Or explicitly set in page:**
```typescript
// app/pos/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

---

## Debugging Steps

### Step 1: Check Vercel Function Logs

1. Go to your Vercel project
2. Click "Deployments" → Latest deployment
3. Click "Functions" tab
4. Click on `/profile`, `/pos`, or `/store-manager` function
5. Look for error messages

**Common errors:**
```
Error: DATABASE_URL environment variable not set
Error: Connection timeout
Error: remaining connection slots reserved
PostgresError: role "..." does not exist
```

### Step 2: Test Database Connection

Create `app/api/test-db/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import * as schema from "@/lib/schema";

export async function GET() {
  try {
    const count = await db.select().from(schema.profiles).limit(1);
    return NextResponse.json({ 
      success: true, 
      message: "Database connected",
      count: count.length 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

Visit: `https://yourapp.vercel.app/api/test-db`

**Expected:** `{"success":true,"message":"Database connected","count":1}`

**If fails:** Database connection issue (check DATABASE_URL)

### Step 3: Test Authentication

Visit: `https://yourapp.vercel.app/profile`

**Scenario A: Redirects to `/login`**
- ✅ Good: Middleware working
- Issue: Need to log in

**Scenario B: Shows 500 error**
- ❌ Database or environment variable issue
- Check browser console for errors

**Scenario C: Blank page**
- ❌ JavaScript error in client component
- Check browser console

**Scenario D: Infinite loading**
- ❌ Database timeout or connection pool exhausted
- Check DATABASE_URL uses port 6543

### Step 4: Test Role-Based Access

After logging in:

1. Visit `/profile` - Should work for all users
2. Visit `/pos` - Should redirect to `/` if not admin/store_manager
3. Visit `/store-manager` - Should redirect to `/` if not admin/store_manager

**If redirects incorrectly:**
- Check user role in database (see Solution #3)

### Step 5: Check Browser DevTools

**Console Tab:**
```
Failed to load resource: the server responded with a status of 500
Uncaught Error: ...
```

**Network Tab:**
- Look for failed requests (red)
- Check response status codes
- View response body for error messages

---

## Quick Fixes Checklist

Run through this checklist:

- [ ] **Environment Variables Set**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `DATABASE_URL` (with port 6543 and `?pgbouncer=true`)
  - [ ] `NEXT_PUBLIC_APP_URL`

- [ ] **Database Connection**
  - [ ] Using Supabase connection pooler (port 6543)
  - [ ] Can connect from Vercel (test with API route)

- [ ] **User Roles**
  - [ ] User exists in `profiles` table
  - [ ] User has correct role (`store_manager` or `admin` for POS/Store Manager)

- [ ] **Deployment**
  - [ ] Latest code deployed
  - [ ] Build succeeded
  - [ ] No function errors in logs

- [ ] **Testing**
  - [ ] Can log in successfully
  - [ ] `/profile` loads
  - [ ] `/pos` accessible (if admin/store_manager)
  - [ ] `/store-manager` accessible (if admin/store_manager)

---

## Working Configuration Example

**Vercel Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dntwhfdtcoeyqcwucifc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
DATABASE_URL=postgresql://postgres:your-password@db.dntwhfdtcoeyqcwucifc.supabase.co:6543/postgres?pgbouncer=true
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

**Database (profiles table):**
```sql
id                  | email                | role
--------------------|----------------------|---------------
abc-123-def         | admin@example.com    | admin
xyz-456-ghi         | manager@example.com  | store_manager
```

**vercel.json:**
```json
{
  "functions": {
    "app/**/*.tsx": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

---

## Still Not Working?

### Get Detailed Logs

**Using Vercel CLI:**
```bash
npm i -g vercel
vercel login
vercel logs yourapp --follow
```

**In Browser DevTools:**
```javascript
// Console
localStorage.debug = '*';
location.reload();
```

### Create Minimal Reproduction

**Test if basic server components work:**

Create `app/test-server/page.tsx`:
```typescript
import { cookies } from "next/headers";

export default async function TestPage() {
  const cookieStore = cookies();
  return <div>Cookies work! Count: {cookieStore.getAll().length}</div>;
}
```

Visit: `https://yourapp.vercel.app/test-server`

**If this fails:** Fundamental Next.js/Vercel configuration issue

**If this works:** Issue specific to your pages (likely database or auth)

---

## Common Mistakes

❌ **Using direct database connection (port 5432)**
✅ Use connection pooler (port 6543)

❌ **Missing `?pgbouncer=true` in DATABASE_URL**
✅ Add query parameter

❌ **Not redeploying after environment variable changes**
✅ Always redeploy after changing env vars

❌ **Using `customer` role to access POS**
✅ Need `admin` or `store_manager` role

❌ **Trying to test on Vercel Preview deployments without env vars**
✅ Set env vars for "Preview" and "Production" environments

❌ **Mixing local .env with Vercel env vars**
✅ Vercel uses its own environment variables, not your local .env

---

## Success Indicators

✅ Pages load within 2-3 seconds
✅ No 500 or 504 errors
✅ User redirected appropriately based on role
✅ Database queries complete successfully
✅ No errors in Vercel function logs
✅ No errors in browser console

---

## Contact & Support

If you've followed all steps and still have issues:

1. **Export function logs:**
   ```bash
   vercel logs yourapp > logs.txt
   ```

2. **Screenshot browser console errors**

3. **Note which specific page fails:**
   - `/profile` only?
   - `/pos` only?
   - All three pages?

4. **Check if login works:**
   - Can you log in?
   - Does `/shop` work?
   - Is it only protected pages?

This information will help diagnose the specific issue.

---

**Last Updated:** February 15, 2026  
**Version:** 1.0
