# VC83.com Deployment Guide

Complete guide to deploying vc83.com to production using Vercel and Convex.

## Prerequisites

- GitHub repository: ✅ `https://github.com/voundbrand/vc83-com.git`
- Node.js installed locally: ✅
- Convex CLI installed: `npm install -g convex`

## Step-by-Step Deployment

### 1. Set Up Production Convex Deployment

#### 1.1 Create Production Deployment

```bash
# Navigate to project directory
cd /Users/foundbrand_001/Development/vc83-com

# Login to Convex (if not already)
npx convex login

# Create production deployment
npx convex deploy

# This will:
# - Create a new production deployment
# - Give you a production URL (e.g., https://your-project.convex.cloud)
# - Deploy your schema and functions
```

#### 1.2 Configure Production Environment Variables

After deployment, set environment variables in Convex dashboard:

```bash
# Open Convex dashboard
npx convex dashboard

# Or go to: https://dashboard.convex.dev
```

In the Convex dashboard:
1. Select your production deployment
2. Go to **Settings** → **Environment Variables**
3. Add the following variables:

```
RESEND_API_KEY=re_your_resend_api_key_here
```

**Getting Resend API Key:**
1. Sign up at https://resend.com (free tier available)
2. Go to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

### 2. Set Up Vercel Deployment

#### 2.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

#### 2.2 Deploy to Vercel via GitHub Integration

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import `voundbrand/vc83-com` repository
5. Vercel will auto-detect Next.js
6. Configure project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

**Option B: Via Vercel CLI**

```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Select scope (your account)
# - Link to GitHub repo
```

#### 2.3 Configure Vercel Environment Variables

In Vercel dashboard (or during CLI setup):

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add the following:

```bash
# Convex Production URL (from step 1.1)
NEXT_PUBLIC_CONVEX_URL=https://your-production-deployment.convex.cloud

# App URL (will be your Vercel URL or custom domain)
NEXT_PUBLIC_APP_URL=https://vc83.vercel.app
# Or your custom domain:
# NEXT_PUBLIC_APP_URL=https://vc83.com
```

**Important**: Add these variables for:
- ✅ Production
- ✅ Preview (optional, but recommended)
- ⚠️ Development (use local Convex URL)

### 3. Set Up Custom Domain (Optional)

If you have `vc83.com` domain:

#### 3.1 In Vercel Dashboard

1. Go to project **Settings** → **Domains**
2. Add domain: `vc83.com`
3. Add domain: `www.vc83.com` (optional)
4. Follow DNS configuration instructions

#### 3.2 DNS Configuration

Add these DNS records with your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21 (Vercel's IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 3.3 Update Environment Variables

Once domain is verified, update in Vercel and Convex:

```bash
# In Vercel
NEXT_PUBLIC_APP_URL=https://vc83.com

# In Convex email.ts (line 20)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vc83.com";
```

### 4. Configure Resend Domain (Recommended for Production)

For better email deliverability:

#### 4.1 In Resend Dashboard

1. Go to **Domains** → **Add Domain**
2. Add `vc83.com`
3. Add DNS records provided by Resend

#### 4.2 Update Email Configuration

In `convex/email.ts`:

```typescript
// Change line 18 from:
const FROM_EMAIL = "VC83 Podcast <noreply@vc83.com>";

// To (if using custom domain):
const FROM_EMAIL = "VC83 Podcast <no-reply@vc83.com>";
```

### 5. Deployment Workflow

#### 5.1 Deploy to Production

```bash
# Ensure you're on main branch
git checkout main

# Pull latest changes
git pull origin main

# Deploy Convex functions (if schema/functions changed)
npx convex deploy

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

#### 5.2 Automatic Deployments

Once set up:
- **Production**: Pushes to `main` branch auto-deploy to production
- **Preview**: Pull requests create preview deployments
- **Convex**: Functions deploy automatically when pushing to main

### 6. Testing the Deployment

#### 6.1 Verify Deployment

```bash
# Check Vercel deployment
vercel ls

# Check Convex deployment
npx convex dashboard
```

#### 6.2 Test Critical Flows

1. **Visit your site**: https://vc83.com (or Vercel URL)
2. **Test signup**: Create account → verify email is sent
3. **Check email**: Verify email arrives in inbox
4. **Click verification link**: Should redirect and verify
5. **Test login**: Should work after verification
6. **Test password reset**: Request reset → receive email → reset password
7. **Test retro UI**: All windows, buttons, theme work

#### 6.3 Monitor Logs

```bash
# Vercel logs
vercel logs [deployment-url]

# Convex logs
npx convex dashboard
# Go to Logs section
```

### 7. Environment Variables Summary

#### Convex Production

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

#### Vercel Production

```bash
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
NEXT_PUBLIC_APP_URL=https://vc83.com
```

### 8. CI/CD Pipeline

Your deployment pipeline:

```
Developer Push to main
         ↓
    GitHub Main Branch
         ↓
    ┌────┴────┐
    ↓         ↓
Convex     Vercel
Deploy     Build & Deploy
    ↓         ↓
Production URLs
```

### 9. Troubleshooting

#### Deployment Fails

```bash
# Check build logs in Vercel
vercel logs --follow

# Test build locally
npm run build

# Check TypeScript errors
npm run typecheck

# Check linting
npm run lint
```

#### Emails Not Sending

1. Check Resend API key is correct
2. Check Resend dashboard for error logs
3. Verify `RESEND_API_KEY` is set in Convex production environment
4. Check Convex function logs for errors

#### Convex Connection Issues

1. Verify `NEXT_PUBLIC_CONVEX_URL` is correct
2. Check Convex deployment is active
3. Verify schema is deployed: `npx convex deploy`

#### CORS Issues

Convex allows all origins by default, but if issues arise:
1. Check Convex dashboard settings
2. Verify URLs match in environment variables

### 10. Post-Deployment Checklist

- [ ] Production Convex deployment created
- [ ] Resend API key configured in Convex
- [ ] Vercel project created and linked to GitHub
- [ ] Environment variables set in Vercel
- [ ] Domain configured (if using custom domain)
- [ ] DNS records updated
- [ ] Resend domain verified (recommended)
- [ ] Test signup flow works
- [ ] Test email verification works
- [ ] Test password reset works
- [ ] Test login flow works
- [ ] Monitor error logs for 24 hours

### 11. Maintenance

#### Updating Schema

```bash
# Make schema changes
# Test locally
npm run dev
npx convex dev

# Deploy to production
npx convex deploy
git push origin main
```

#### Rolling Back

```bash
# Vercel: Use dashboard to rollback to previous deployment
# Or via CLI:
vercel rollback [deployment-url]

# Convex: Rollback in dashboard if needed
```

### 12. Monitoring

#### Set Up Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Convex Monitoring**: Check dashboard regularly
3. **Resend Analytics**: Monitor email delivery rates
4. **Error Tracking**: Consider adding Sentry or similar

#### Key Metrics to Watch

- Deployment success rate
- Build time
- Email delivery rate
- Error rate in Convex logs
- Page load time

## Quick Reference

```bash
# Deploy everything to production
npx convex deploy
git push origin main

# Check status
npx convex dashboard
vercel ls

# View logs
vercel logs --follow
```

## Support

- **Vercel**: https://vercel.com/docs
- **Convex**: https://docs.convex.dev
- **Resend**: https://resend.com/docs
- **Next.js**: https://nextjs.org/docs

---

**Need Help?** Check Vercel and Convex dashboards for detailed error messages and logs.
