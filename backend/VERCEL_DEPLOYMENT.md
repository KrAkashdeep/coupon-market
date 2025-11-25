# Vercel Deployment Guide

## Issues Fixed ✅

### 1. **Server Export Issue**
- **Problem**: `app.listen()` doesn't work on Vercel serverless
- **Fix**: Export the Express app and only call `app.listen()` in development

### 2. **Cron Jobs Issue**
- **Problem**: Vercel serverless functions don't support long-running cron jobs
- **Fix**: Disabled cron jobs in production (use Vercel Cron Jobs instead)

### 3. **Simplified vercel.json**
- Removed unnecessary configuration
- Simplified routing

### 4. **Added .vercelignore**
- Excludes test files, logs, and unnecessary files from deployment

## Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Fix Vercel deployment configuration"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd backend
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select the `backend` folder as the root directory
5. Click "Deploy"

### Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend-url.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
NODE_ENV=production
```

### Step 4: Set Up Vercel Cron Jobs (Optional)

Since cron jobs don't work on Vercel serverless, you have two options:

#### Option 1: Use Vercel Cron (Recommended)
Create `vercel.json` in your project root with cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-confirm",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/timer-warnings",
      "schedule": "* * * * *"
    }
  ]
}
```

Then create API endpoints for these cron jobs.

#### Option 2: Use External Cron Service
Use services like:
- Cron-job.org
- EasyCron
- GitHub Actions

To call your API endpoints periodically.

### Step 5: Update Frontend API URL

Update your frontend `.env.production` file:

```
VITE_API_URL=https://your-backend-url.vercel.app
```

## Common Deployment Errors

### Error: "Module not found"
- **Solution**: Make sure all dependencies are in `package.json`
- Run `npm install` to verify

### Error: "Function timeout"
- **Solution**: Optimize database queries
- Add indexes to MongoDB collections
- Reduce API response size

### Error: "CORS error"
- **Solution**: Verify FRONTEND_URL in environment variables
- Check CORS configuration in server.js

### Error: "Cannot connect to MongoDB"
- **Solution**: 
  - Whitelist Vercel IP addresses in MongoDB Atlas
  - Or use "Allow access from anywhere" (0.0.0.0/0)

## Testing Deployment

1. Test the root endpoint:
   ```
   https://your-backend-url.vercel.app/
   ```
   Should return: `{"message": "Coupon Marketplace API"}`

2. Test authentication:
   ```
   POST https://your-backend-url.vercel.app/api/auth/login
   ```

3. Check logs in Vercel Dashboard → Deployments → View Function Logs

## Important Notes

⚠️ **Cron Jobs**: The auto-confirm and timer warning features won't work automatically on Vercel. You need to set up Vercel Cron Jobs or use an external service.

⚠️ **Cold Starts**: First request after inactivity may be slow (5-10 seconds). This is normal for serverless functions.

⚠️ **File Uploads**: Vercel has a 4.5MB request body limit. Large file uploads should use direct Cloudinary uploads.

## Troubleshooting

If deployment fails:

1. Check build logs in Vercel Dashboard
2. Verify all environment variables are set
3. Test locally with `NODE_ENV=production npm start`
4. Check MongoDB connection string
5. Verify all dependencies are installed

## Support

If you encounter issues:
- Check Vercel documentation: https://vercel.com/docs
- Check deployment logs
- Test API endpoints with Postman
