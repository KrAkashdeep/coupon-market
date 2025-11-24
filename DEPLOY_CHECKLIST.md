# 🚀 Deployment Checklist

## Quick Fix for Your Issues

### ✅ What Was Fixed:

1. **404 on page refresh** → Added `vercel.json` for frontend
2. **Coupon upload timeout** → Disabled OCR in production
3. **OCR taking too long** → Skipped on Vercel (admin verifies instead)

---

## 📋 Step-by-Step Deployment

### Step 1: Commit Changes

```bash
# Add all new files
git add .

# Commit with message
git commit -m "Fix: Vercel 404 errors and OCR timeout issues"

# Push to GitHub
git push origin main
```

### Step 2: Redeploy on Vercel

**Option A: Automatic (if GitHub connected)**
- Vercel will auto-deploy when you push to GitHub
- Wait 2-3 minutes for deployment to complete

**Option B: Manual**
1. Go to https://vercel.com/dashboard
2. Select your **frontend** project
3. Click "Deployments" tab
4. Click "Redeploy" on latest deployment
5. Repeat for **backend** project

### Step 3: Verify Environment Variables

**Frontend Project Settings:**
```
VITE_API_URL = https://your-backend.vercel.app
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
```

**Backend Project Settings:**
```
MONGO_URI = mongodb+srv://...
JWT_SECRET = your-secret-key
STRIPE_SECRET_KEY = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
CLOUDINARY_CLOUD_NAME = your-cloud-name
CLOUDINARY_API_KEY = your-api-key
CLOUDINARY_API_SECRET = your-api-secret
FRONTEND_URL = https://your-frontend.vercel.app
NODE_ENV = production
```

### Step 4: Test Everything

**Test 1: Login Page Refresh**
- ✅ Go to `/login`
- ✅ Press F5
- ✅ Should load (not 404)

**Test 2: Direct URL Access**
- ✅ Copy any page URL
- ✅ Open in new tab
- ✅ Should load (not 404)

**Test 3: Coupon Upload**
- ✅ Go to "Add Coupon"
- ✅ Fill form and upload image
- ✅ Should upload in 2-3 seconds
- ✅ Status: "pending_verification"

---

## 🔧 If Issues Persist

### Still Getting 404?

1. **Clear browser cache**
   - Chrome: Ctrl+Shift+Delete
   - Or use Incognito mode

2. **Check deployment status**
   - Go to Vercel dashboard
   - Ensure deployment is "Ready"
   - Check for errors in logs

3. **Verify vercel.json exists**
   - Should be in frontend root folder
   - Should be committed to GitHub

### Still Getting Timeout?

1. **Check backend deployment**
   - Ensure latest code is deployed
   - Check Vercel function logs

2. **Reduce image size**
   - Keep screenshots under 2MB
   - Compress before uploading

3. **Check environment variables**
   - Ensure `NODE_ENV=production` is set
   - This enables OCR skip

---

## 📝 Important Notes

### OCR Behavior:

**Production (Vercel):**
- OCR is **disabled** (too slow for serverless)
- Coupons go to "pending_verification"
- Admin manually verifies
- Upload is **fast** (2-3 seconds)

**Development (Localhost):**
- OCR is **enabled**
- Full automatic verification
- Upload is **slower** (15-30 seconds)

### Why This Approach?

Vercel serverless functions have timeout limits:
- Free: 10 seconds
- Pro: 60 seconds

OCR takes 15-30 seconds, so we skip it in production to avoid timeouts.

---

## ✨ Expected Results After Deployment

| Feature | Before | After |
|---------|--------|-------|
| Login page refresh | ❌ 404 error | ✅ Works |
| Direct URL access | ❌ 404 error | ✅ Works |
| Coupon upload | ❌ Timeout | ✅ Fast (2-3s) |
| OCR processing | ❌ Too slow | ✅ Skipped |
| Admin verification | ⚠️ Optional | ✅ Required |

---

## 🎯 Summary

**What you need to do:**
1. ✅ Commit and push changes to GitHub
2. ✅ Redeploy on Vercel (or wait for auto-deploy)
3. ✅ Clear browser cache
4. ✅ Test all functionality

**What will work after deployment:**
- ✅ No more 404 errors on refresh
- ✅ Fast coupon uploads (no timeout)
- ✅ All routes accessible directly
- ✅ Admin verifies coupons manually

That's it! Your Vercel deployment should work perfectly now. 🎉
