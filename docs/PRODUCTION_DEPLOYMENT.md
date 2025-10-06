# Production Deployment Guide

**Last Updated: 2025-10-06**
**Version: 1.0.0**

## Overview

This guide covers the complete production deployment process for L4YERCAK3.com, including database seeding, environment configuration, and post-deployment verification.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables](#environment-variables)
3. [Database Seeding](#database-seeding)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] Run `npm run typecheck` - No TypeScript errors
- [ ] Run `npm run lint` - No linting errors
- [ ] Run `npm test` - All tests passing
- [ ] Run `npm run build` - Production build succeeds

### Security Review
- [ ] Environment variables configured in Vercel
- [ ] Convex deployment URL set correctly
- [ ] No hardcoded secrets in codebase
- [ ] RBAC permissions verified
- [ ] Audit logging enabled

### Database Preparation
- [ ] Backup existing production data (if any)
- [ ] Review seed data requirements
- [ ] Test seed scripts locally
- [ ] Verify RBAC roles and permissions

---

## Environment Variables

### Required Production Variables

```bash
# Convex (Backend)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod_xxxxxxxxxxxx

# Email Service (if using Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@layercake.com

# Application
NEXT_PUBLIC_APP_URL=https://layercake.com
NODE_ENV=production

# Optional: Analytics
NEXT_PUBLIC_GA_ID=GA-XXXXXXXXX
NEXT_PUBLIC_MIXPANEL_TOKEN=xxxxxxxxxxxx
```

### Vercel Environment Setup

1. Navigate to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for the "Production" environment
3. Ensure sensitive keys are marked as "Sensitive"

---

## Database Seeding

### Critical Seed Data Required

The application REQUIRES the following seed data to function:

#### 1. RBAC Roles (MANDATORY)

The system expects these exact roles to exist:

```typescript
// These MUST be created in this order due to hierarchy
1. super_admin    - System-wide admin
2. org_owner      - Organization owner
3. business_manager - Business unit manager
4. employee       - Regular employee
5. viewer         - Read-only access
```

#### 2. Default Permissions (MANDATORY)

Each role requires specific permissions. Run the seed script to ensure all are created.

#### 3. Super Admin User (MANDATORY)

At least one super_admin must exist to bootstrap the system.

### Seed Script Execution

#### Local Testing First

```bash
# 1. Test with local Convex instance
npx convex dev

# 2. In another terminal, run seed script
npx convex run seedAdmin

# 3. Verify seed data
npx convex run internal:listRoles
npx convex run internal:listPermissions
```

#### Production Seeding

```bash
# 1. Deploy Convex functions to production
npx convex deploy --prod

# 2. Run production seed script
npx convex run --prod seedAdmin

# 3. Verify production data
npx convex run --prod internal:verifyProductionSeed
```

### Seed Data Verification Checklist

- [ ] All 5 RBAC roles created
- [ ] All permissions assigned correctly
- [ ] Super admin user created and can login
- [ ] Default organization created (if applicable)
- [ ] Audit log table initialized

---

## Deployment Steps

### 1. Pre-Deployment

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Run final checks
npm run typecheck
npm run lint
npm test
npm run build
```

### 2. Deploy Convex Backend

```bash
# Deploy Convex to production
npx convex deploy --prod

# Run seed scripts if first deployment
npx convex run --prod seedAdmin

# Verify backend is responsive
curl https://your-project.convex.cloud/api/health
```

### 3. Deploy to Vercel

#### Option A: Automatic (Git Push)

```bash
# Tag the release
git tag -a v1.0.0 -m "Initial production release"
git push origin main --tags
```

#### Option B: Manual Deploy

```bash
# Using Vercel CLI
vercel --prod

# Or trigger from Vercel Dashboard
# Dashboard → Your Project → Deployments → Deploy
```

### 4. DNS Configuration

If using custom domain:
1. Add domain in Vercel Dashboard → Domains
2. Update DNS records with your provider
3. Wait for SSL certificate provisioning

---

## Post-Deployment Verification

### Critical Path Testing

1. **Authentication Flow**
   ```
   ✓ Can access login page
   ✓ Super admin can login
   ✓ Session persists across refreshes
   ✓ Logout works correctly
   ```

2. **RBAC System**
   ```
   ✓ Super admin can access all features
   ✓ Permissions are enforced
   ✓ Audit logs are being created
   ```

3. **Core Features**
   ```
   ✓ Desktop loads with proper theme
   ✓ Windows open and close
   ✓ Theme switching works
   ✓ Settings persist
   ```

4. **User Management**
   ```
   ✓ Super admin can invite users
   ✓ Email invitations sent (if configured)
   ✓ New users can set passwords
   ✓ Organization assignment works
   ```

### Performance Checks

```bash
# Run Lighthouse audit
npm run lighthouse

# Check Core Web Vitals
# - LCP < 2.5s
# - FID < 100ms
# - CLS < 0.1
```

### Security Verification

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CSP policy active
- [ ] No console errors in production
- [ ] No exposed sensitive data

---

## Rollback Procedures

### Quick Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find the last known good deployment
3. Click "..." → "Promote to Production"
4. Verify rollback successful

### Database Rollback

```bash
# If seed data issues:
npx convex run --prod internal:clearBadData
npx convex run --prod seedAdmin

# For complete reset (DESTRUCTIVE):
# 1. Export any user data first
# 2. Clear tables
# 3. Re-run seeds
```

### Emergency Contacts

- **Vercel Status**: status.vercel.com
- **Convex Status**: status.convex.dev
- **Team Lead**: [Contact Info]
- **On-Call Dev**: [Contact Info]

---

## Monitoring & Alerts

### Set Up Monitoring

1. **Vercel Analytics**
   - Enable in Dashboard → Analytics
   - Monitor Web Vitals
   - Track user interactions

2. **Convex Monitoring**
   - Dashboard → Your Project → Logs
   - Set up log streaming if needed
   - Monitor function execution times

3. **Error Tracking (Optional)**
   ```bash
   # Install Sentry
   npm install @sentry/nextjs

   # Configure in next.config.js
   ```

4. **Uptime Monitoring**
   - Configure external monitor (UptimeRobot, Pingdom)
   - Set up status page
   - Alert on downtime

### Health Check Endpoints

Create these endpoints for monitoring:

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}

// pages/api/health/db.ts
export default async function handler(req, res) {
  try {
    // Check Convex connection
    const result = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/health`);
    res.status(200).json({
      database: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      database: 'unhealthy',
      error: error.message
    });
  }
}
```

---

## Common Issues & Solutions

### Issue: "RBAC roles not found"

**Solution:**
```bash
# Re-run seed script
npx convex run --prod seedAdmin

# Verify roles exist
npx convex run --prod internal:listRoles
```

### Issue: "Super admin cannot login"

**Solution:**
1. Check email/password in seed script
2. Verify user exists in database
3. Check session creation in Convex logs
4. Clear browser cache/cookies

### Issue: "Themes not loading"

**Solution:**
1. Check CSS variables in globals.css
2. Verify theme context provider
3. Check browser console for errors
4. Test in incognito mode

### Issue: "Invitations not sending"

**Solution:**
1. Verify RESEND_API_KEY is set
2. Check Resend dashboard for logs
3. Verify email templates
4. Check spam folders

---

## Production Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check performance metrics
- Review security alerts

**Weekly:**
- Review audit logs
- Check disk usage
- Update dependencies (dev only)

**Monthly:**
- Full backup
- Security audit
- Performance review
- Update documentation

### Database Maintenance

```bash
# Export production data
npx convex run --prod internal:exportData > backup.json

# Clean old audit logs (keep 90 days)
npx convex run --prod internal:cleanAuditLogs --days=90

# Optimize indexes (if needed)
npx convex run --prod internal:optimizeIndexes
```

---

## Deployment Checklist Summary

### First-Time Production Deploy

1. [ ] Configure all environment variables in Vercel
2. [ ] Deploy Convex backend (`npx convex deploy --prod`)
3. [ ] Run seed script (`npx convex run --prod seedAdmin`)
4. [ ] Verify seed data created correctly
5. [ ] Deploy frontend to Vercel
6. [ ] Test super admin login
7. [ ] Test core features
8. [ ] Set up monitoring
9. [ ] Document admin credentials securely
10. [ ] Notify team of successful deployment

### Subsequent Deploys

1. [ ] Run pre-deployment checks
2. [ ] Backup production data
3. [ ] Deploy Convex changes (if any)
4. [ ] Deploy to Vercel
5. [ ] Run post-deployment verification
6. [ ] Monitor for 30 minutes
7. [ ] Update deployment log

---

## Support & Resources

- **Convex Documentation**: docs.convex.dev
- **Vercel Documentation**: vercel.com/docs
- **Project Repository**: github.com/your-org/layercake
- **Internal Wiki**: [Your documentation site]

---

## Appendix: Seed Script Example

```typescript
// convex/seedAdmin.ts
import { mutation } from "./_generated/server";

export default mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existingAdmin = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "admin@layercake.com"))
      .first();

    if (existingAdmin) {
      return { message: "Admin already exists" };
    }

    // Create roles and permissions
    // ... (see full implementation in codebase)

    return { message: "Seed completed successfully" };
  }
});
```

---

**Remember:** Always test in staging before production. When in doubt, ask for help!