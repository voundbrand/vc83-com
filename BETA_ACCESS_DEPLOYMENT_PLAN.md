# Beta Access System - Production Deployment Plan

## Overview
Complete deployment plan for rolling out the beta access gating system to production.

**Status:** ✅ TypeScript compilation passing
**Date:** 2026-02-08
**Feature:** Beta access gateway with admin approval workflow

---

## 🎯 Pre-Deployment Checklist

### 1. Code Quality & Testing
- [x] TypeScript compilation passes (minor unrelated error in apiKeys.ts)
- [ ] Run full test suite: `npm test`
- [ ] Manual QA testing in development environment
- [ ] Review all changed files for security issues

### 2. Environment Configuration
Check these environment variables are set in **production**:
- [ ] `RESEND_API_KEY` - Email sending service
- [ ] `AUTH_RESEND_FROM` - From email address
- [ ] `SALES_EMAIL` - Sales notification recipient email
- [ ] All OAuth credentials (Google, Microsoft, GitHub)

### 3. Database Preparation
- [ ] Verify `platformSettings` table exists in production
- [ ] Verify `users` table has beta access fields:
  - `betaAccessStatus`
  - `betaAccessRequestedAt`
  - `betaAccessApprovedAt`
  - `betaAccessApprovedBy`
  - `betaAccessRejectionReason`
- [ ] Check index `by_beta_status` exists on users table

---

## 📋 Testing Protocol (Development)

### Test 1: Email/Password Signup with Beta ON
1. Toggle beta gating ON in Organizations → Beta Access tab
2. Create new account with email/password
3. **Verify:**
   - ✅ User shows "Beta Access Requested" screen
   - ✅ User receives beta request confirmation email
   - ✅ Sales receives beta request notification email
   - ✅ User blocked from accessing platform
   - ✅ User's `betaAccessStatus = "pending"`

### Test 2: OAuth Signup (Google) with Beta ON
1. Sign up with Google OAuth
2. **Verify same as Test 1**

### Test 3: Admin Approval Flow
1. As super admin, go to Organizations → Beta Access tab
2. Find pending user and approve
3. **Verify:**
   - ✅ User receives beta approval email (NOT regular welcome email)
   - ✅ Sales receives beta approval notification
   - ✅ User can now access platform
   - ✅ User's `betaAccessStatus = "approved"`

### Test 4: Admin Rejection Flow
1. Create another test user
2. Reject with reason "Not a good fit"
3. **Verify:**
   - ✅ User receives rejection email with reason
   - ✅ User sees rejection screen with reason
   - ✅ User's `betaAccessStatus = "rejected"`

### Test 5: Beta Gating OFF (Normal Flow)
1. Toggle beta gating OFF
2. Create new account
3. **Verify:**
   - ✅ User receives regular welcome email
   - ✅ User receives sales notification (free_signup)
   - ✅ User has immediate access to platform
   - ✅ User's `betaAccessStatus = "approved"`

### Test 6: Super Admin Bypass
1. Toggle beta gating ON
2. Sign in as super admin
3. **Verify:**
   - ✅ Super admin bypasses beta check
   - ✅ Super admin has full platform access

---

## 🚀 Deployment Steps

### Step 1: Deploy Convex Functions
```bash
# From project root
npx convex deploy --prod

# Verify deployment
npx convex dashboard --prod
```

**Files deployed:**
- `convex/betaAccess.ts` - Core beta access logic
- `convex/onboarding.ts` - Updated signup flow
- `convex/api/v1/emailAuth.ts` - Email/password auth
- `convex/api/v1/oauthSignup.ts` - OAuth signups
- `convex/actions/betaAccessEmails.ts` - Email templates
- `convex/actions/salesNotificationEmail.ts` - Updated with beta_approved

### Step 2: Deploy Next.js App
```bash
# Automatic via Vercel (if connected to GitHub)
git push origin main

# Or manual deploy
vercel --prod
```

**Files deployed:**
- `src/app/page.tsx` - Updated with beta blocking
- `src/components/waiting-for-approval-screen.tsx` - Beta blocking UI
- `src/components/window-content/login-window.tsx` - Beta messaging
- `src/hooks/window-registry.tsx` - Removed old beta window

### Step 3: Verify Deployment
1. Check Vercel deployment status
2. Check Convex dashboard for function deployment
3. Test production URL is accessible
4. Check browser console for errors

### Step 4: Database Setup (if needed)
```bash
# Create platformSettings if doesn't exist
npx convex run betaAccess:toggleBetaGating \
  --sessionId "YOUR_ADMIN_SESSION" \
  --enabled false
```

---

## 🎬 Go-Live Sequence

### Phase 1: Soft Launch (Beta OFF)
1. **Deploy to production** (Steps 1-3 above)
2. **Keep beta gating OFF** (default state)
3. **Monitor for 24 hours:**
   - Check error logs: `npx convex logs --prod`
   - Verify new signups work normally
   - Verify emails are sending
4. **Create 2-3 test signups** to verify normal flow

### Phase 2: Enable Beta Gating
1. **As super admin in production:**
   - Navigate to Organizations → Beta Access tab
   - Toggle beta gating ON
2. **Create test signup to verify:**
   - User gets blocked screen
   - Emails send correctly
   - Admin can approve/reject
3. **Announce beta program** (email blast, social, etc.)

### Phase 3: Monitor & Iterate
**First 48 hours:**
- [ ] Check pending requests every 4-6 hours
- [ ] Monitor email delivery (Resend dashboard)
- [ ] Check error logs for issues
- [ ] Verify sales notifications arriving

**Weekly:**
- [ ] Review approval/rejection rates
- [ ] Analyze beta request reasons
- [ ] Optimize email templates based on feedback

---

## 🆘 Rollback Plan

If critical issues occur:

### Quick Rollback
```bash
# Disable beta gating immediately
# Option 1: In admin UI
Organizations → Beta Access → Toggle OFF

# Option 2: Via Convex CLI (if UI broken)
npx convex run betaAccess:toggleBetaGating \
  --sessionId "SUPER_ADMIN_SESSION" \
  --enabled false
```

### Full Rollback (Emergency)
```bash
# Revert to previous Convex deployment
npx convex deploy --prod --from <previous-version>

# Revert Vercel deployment
vercel rollback <previous-deployment-url> --prod
```

---

## 📊 Success Metrics

Track these metrics in first 2 weeks:

**Beta Flow Metrics:**
- Beta requests per day
- Approval rate (target: >80%)
- Time to approval (target: <24 hours)
- Email delivery rate (target: >99%)

**User Experience:**
- Rejection complaints (target: <5%)
- Email confusion (support tickets)
- Platform bugs related to beta blocking

**System Health:**
- Error rate in beta functions
- Email send failures
- Database performance

---

## 🔧 Post-Deployment Tasks

1. **Document beta approval criteria** for team
2. **Set up Slack notifications** for new beta requests
3. **Create dashboard** for beta metrics
4. **Schedule daily approval reviews** (morning/evening)
5. **Prepare customer support docs** for beta questions

---

## 📝 Key Files Changed

### Backend (Convex)
- [x] `convex/betaAccess.ts` - Beta access system
- [x] `convex/onboarding.ts` - Signup flow updates
- [x] `convex/api/v1/emailAuth.ts` - Email auth
- [x] `convex/api/v1/oauthSignup.ts` - OAuth signups
- [x] `convex/actions/betaAccessEmails.ts` - Email templates
- [x] `convex/actions/salesNotificationEmail.ts` - Sales notifications
- [x] `convex/schemas/coreSchemas.ts` - User schema updates

### Frontend (Next.js)
- [x] `src/app/page.tsx` - Beta blocking logic
- [x] `src/components/waiting-for-approval-screen.tsx` - Blocking UI
- [x] `src/components/window-content/login-window.tsx` - Beta notices
- [x] `src/hooks/window-registry.tsx` - Cleanup

### Deleted
- [x] `src/components/beta-access-blocked-screen.tsx`
- [x] `src/components/window-content/beta-access-request-window/`

---

## 🎉 Launch Communication

**Internal announcement:**
```
🚀 Beta Access System - Now Live!

We've deployed the beta access gating system. Here's what you need to know:

✅ Beta gating is currently OFF (normal signups)
✅ Ready to enable when we want to start filtering signups
✅ Admin approval workflow in Organizations → Beta Access tab

What changed:
- Auto-assignment of beta status during signup
- Full-screen blocking for pending users
- Streamlined email flow (no duplicate welcome emails)
- Admin approval/rejection workflow

Next steps:
1. Test the system in production (beta OFF)
2. Enable beta gating when ready to go exclusive
3. Monitor pending requests daily

Questions? Ping @remington
```

**User-facing (when enabling beta):**
```
🔒 We're Now in Private Beta

l4yercak3 is now in private beta. New signups will be reviewed and approved within 24-48 hours.

Already have an account? You're all set!

Want access? Sign up at https://l4yercak3.com and we'll review your request.
```

---

## ✅ Final Checklist

Before going live:
- [ ] All tests passing (automated + manual)
- [ ] Environment variables verified in production
- [ ] Database schema updated
- [ ] Email templates reviewed and approved
- [ ] Team trained on approval workflow
- [ ] Support docs updated
- [ ] Rollback plan tested
- [ ] Monitoring/alerting configured
- [ ] Stakeholder signoff received

**Sign-off:**
- [ ] Engineering Lead
- [ ] Product Manager
- [ ] Customer Support Lead

---

## 🤝 Support Contact

**Issues during deployment:**
- Technical: @remington
- Product questions: @remington
- Emergency rollback: @remington

**Post-launch support:**
- Beta approval decisions: @remington
- Email delivery issues: Check Resend dashboard
- System errors: Convex logs + Vercel logs
