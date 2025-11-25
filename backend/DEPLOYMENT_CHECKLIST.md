# Vercel Deployment Checklist ✅

## Pre-Deployment Checklist

- [ ] All code changes committed to Git
- [ ] `node_modules` is in `.gitignore`
- [ ] `.env` file is in `.gitignore` (don't commit secrets!)
- [ ] `package.json` has all required dependencies
- [ ] No syntax errors in code
- [ ] MongoDB connection string is ready
- [ ] Stripe API keys are ready
- [ ] Cloudinary credentials are ready

## Vercel Configuration

- [x] `server.js` exports the Express app
- [x] Cron jobs disabled in production
- [x] `vercel.json` configured correctly
- [x] `.vercelignore` created
- [x] CORS configured with frontend URL

## Environment Variables to Set in Vercel

Copy these to Vercel Dashboard → Settings → Environment Variables:

```
MONGO_URI=
JWT_SECRET=
FRONTEND_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
NODE_ENV=production
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select `backend` folder as root directory
   - Add environment variables
   - Click Deploy

3. **Verify Deployment**
   - [ ] Root endpoint works: `https://your-api.vercel.app/`
   - [ ] Login endpoint works: `POST /api/auth/login`
   - [ ] Check function logs for errors

4. **Update Frontend**
   - [ ] Update `VITE_API_URL` in frontend `.env.production`
   - [ ] Redeploy frontend

## Post-Deployment

- [ ] Test user registration
- [ ] Test user login
- [ ] Test coupon creation
- [ ] Test payment flow
- [ ] Test admin functions
- [ ] Monitor error logs

## Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution**: Whitelist Vercel IPs in MongoDB Atlas Network Access
- Go to MongoDB Atlas → Network Access
- Add IP: `0.0.0.0/0` (allow from anywhere)

### Issue: "CORS error"
**Solution**: Check FRONTEND_URL environment variable matches your frontend domain

### Issue: "Module not found"
**Solution**: Run `npm install` and commit `package-lock.json`

### Issue: "Function timeout"
**Solution**: Optimize database queries, add indexes

### Issue: "Cron jobs not working"
**Solution**: Set up Vercel Cron Jobs or use external service (see VERCEL_DEPLOYMENT.md)

## Need Help?

1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Test API with Postman
4. Review VERCEL_DEPLOYMENT.md for detailed guide
