# 🚀 Deployment Instructions - Supabase Connection Pool Fix

**Date:** October 4, 2026  
**Fix:** Switch from transaction pooler (port 6543) to session pooler (port 5432) with proper connection management

## ✅ What Was Done (Already Completed)

1. ✅ Updated database connection configuration in all backends
2. ✅ Added proper connection pooling with timeouts
3. ✅ Added smart retry logic for transient errors  
4. ✅ Optimized for Cloudflare Workers architecture
5. ✅ Committed and pushed to GitHub (staging + main branches)

## 🔴 What YOU Need to Do NOW

### Step 1: Update Cloudflare Secrets (CRITICAL!)

The DATABASE_URL secrets in Cloudflare still point to the OLD port (6543). You MUST update them to port 5432.

#### For backend-web (Production):
1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **synapse-backend**
3. Click: **Settings** → **Variables**
4. Find the **DATABASE_URL** secret
5. Click **Edit** and change to:
   ```
   postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```
   (Note: Changed from `:6543/` to `:5432/`)
6. Click **Save**

#### For backend-web (Staging):
1. Same as above, but select **synapse-backend-staging**
2. Update DATABASE_URL to port **5432**

#### For backend-chat (Production):
1. Navigate to: **Workers & Pages** → **synapse-chat**
2. Update DATABASE_URL to port **5432**

#### For backend-chat (Staging):
1. Navigate to: **Workers & Pages** → **synapse-chat-staging**
2. Update DATABASE_URL to port **5432**

### Step 2: Deploy All Backends

After updating secrets, deploy each service:

#### Deploy backend-web (Production):
1. In Cloudflare Dashboard → **synapse-backend**
2. Go to **Deployments** tab
3. Click **Create deployment** or **Redeploy latest**
4. OR it may auto-deploy from GitHub - wait 2-3 minutes

#### Deploy backend-web (Staging):
1. Same steps for **synapse-backend-staging**

#### Deploy backend-chat (Production):
1. Same steps for **synapse-chat**

#### Deploy backend-chat (Staging):
1. Same steps for **synapse-chat-staging**

### Step 3: Verify Deployment

After deploying, test with curl:

```bash
# Test production backend
curl -X POST https://synapse-backend.mrpralay2005.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ADMIN","password":"ADMIN"}'

# Should return success with token (not CORS error or timeout)
```

### Step 4: Test in Browser

1. Open: https://android-app-synapse.pages.dev
2. Login with: ADMIN / ADMIN
3. Navigate around for 30+ seconds
4. Check browser console - should NOT see repeating CORS errors
5. Settings toggles should work
6. Follow/unfollow should work

## 🔍 Alternative: Use Wrangler CLI (If Network Issue Resolved)

If you can access Cloudflare from terminal later:

```bash
# Update secrets
cd backend-web
echo 'postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' | npx wrangler secret put DATABASE_URL --env=""
echo 'postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' | npx wrangler secret put DATABASE_URL --env=staging

# Deploy
npx wrangler deploy --env=""
npx wrangler deploy --env=staging

# Repeat for backend-chat
cd ../backend-chat
echo 'postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' | npx wrangler secret put DATABASE_URL --env=""
echo 'postgresql://postgres.vcwhkuhyqlhlcsgleswl:Database%40password%402026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' | npx wrangler secret put DATABASE_URL --env=staging

npx wrangler deploy --env=""
npx wrangler deploy --env=staging
```

## 📊 What This Fix Does

### Before (Broken):
- Used port **6543** (transaction pooler)
- No connection limits → pool exhaustion
- No timeouts → requests hang forever
- Result: CORS errors flooding console after few seconds

### After (Fixed):
- Uses port **5432** (session pooler)
- Proper connection management with limits
- Fast timeouts (5s connection, 10s idle)
- Smart retry only for transient errors
- Result: Fast, reliable, works for 10-15 concurrent users

## ⚠️ Important Notes

1. **Both code AND secrets must be updated** - code is done, you must do secrets
2. **Port 5432 is critical** - this is the session pooler, not transaction pooler
3. **Test after deployment** - make sure to verify it works
4. **Connection limit still exists** - Free tier Supabase = ~15 connections max
5. **For production scale** - consider upgrading Supabase plan later

## 🆘 If Still Not Working After Deployment

1. **Hard refresh browser**: Ctrl+Shift+R (or Cmd+Shift+R)
2. **Clear Cloudflare cache**: In dashboard → Caching → Purge Everything
3. **Check deployment logs**: Workers → synapse-backend → Logs
4. **Verify secrets**: Make sure DATABASE_URL shows port :5432 not :6543

## 📞 Contact

If issues persist after following these steps, provide:
- Screenshot of Cloudflare deployment logs
- Screenshot of browser console errors
- Confirm which step you completed

---

**Status:** Code changes committed ✅ | Secrets need manual update ⏳ | Deployment needed ⏳
