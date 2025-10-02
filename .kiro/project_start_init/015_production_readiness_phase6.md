# Task 015: Phase 6 - Production Readiness

## Objective
Prepare the multi-tenant podcast platform for production deployment, including performance optimization, monitoring setup, deployment configuration, and operational documentation.

## Prerequisites
- Phase 1-5: All previous phases completed
- Security audit passed (Phase 5)
- All tests passing
- Convex production account setup
- Vercel account for deployment

## Production Optimization

### 1. Performance Optimization

#### A. Database Query Optimization
```typescript
// convex/optimization/queryOptimizer.ts
import { query } from "../_generated/server";
import { v } from "convex/values";

// Optimized org apps query with caching
export const getOrgAppsOptimized = query({
  args: { 
    orgId: v.id("organizations"),
    useCache: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check cache first
    if (args.useCache) {
      const cached = await ctx.db
        .query("queryCache")
        .withIndex("by_key", (q) => 
          q.eq("key", `org_apps_${args.orgId}`)
        )
        .first();
        
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
        return cached.data;
      }
    }
    
    // Batch fetch to minimize queries
    const [apps, installations, appData] = await Promise.all([
      ctx.db.query("applications").collect(),
      ctx.db
        .query("installedApps")
        .withIndex("by_organization", (q) => 
          q.eq("organizationId", args.orgId)
        )
        .collect(),
      ctx.db
        .query("appData")
        .withIndex("by_organization", (q) => 
          q.eq("organizationId", args.orgId)
        )
        .collect(),
    ]);
    
    // Process and cache result
    const result = processAppsData(apps, installations, appData);
    
    if (args.useCache) {
      await ctx.db.insert("queryCache", {
        key: `org_apps_${args.orgId}`,
        data: result,
        timestamp: Date.now(),
      });
    }
    
    return result;
  },
});

// Cache invalidation
export const invalidateOrgCache = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("queryCache")
      .withIndex("by_key", (q) => 
        q.eq("key", `org_apps_${args.orgId}`)
      )
      .first();
      
    if (cached) {
      await ctx.db.delete(cached._id);
    }
  },
});
```

#### B. Frontend Performance
```typescript
// components/performance/LazyWindow.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy window components
const EpisodesWindow = dynamic(
  () => import('../window-content/episodes-window'),
  { 
    loading: () => <WindowSkeleton />,
    ssr: false,
  }
);

// Image optimization for retro icons
export const OptimizedRetroIcon = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="pixel-icon"
      width={32}
      height={32}
    />
  );
};

// Debounced window dragging
export const useDebouncedDrag = () => {
  const dragHandler = useCallback(
    debounce((data: DraggableData) => {
      updateWindowPosition(data.node.id, { x: data.x, y: data.y });
    }, 16), // ~60fps
    []
  );
  
  return dragHandler;
};
```

#### C. Bundle Size Optimization
```javascript
// next.config.js
module.exports = {
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['convex.cloud'],
  },
  
  // Bundle analyzer in dev
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            priority: 20,
          },
        },
      };
    }
    return config;
  },
};
```

### 2. Monitoring & Observability

#### A. Application Monitoring
```typescript
// lib/monitoring/appMonitoring.ts
import * as Sentry from "@sentry/nextjs";

// Initialize Sentry
export const initMonitoring = () => {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};

// Custom error boundary
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      scope.setTag('component', 'RetroDesktop');
      Sentry.captureException(error);
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <RetroErrorScreen onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

#### B. Performance Monitoring
```typescript
// lib/monitoring/performance.ts
export const measureWindowPerformance = () => {
  // Track window open time
  performance.mark('window-open-start');
  
  // After window renders
  performance.mark('window-open-end');
  performance.measure(
    'window-open-duration',
    'window-open-start',
    'window-open-end'
  );
  
  // Send to analytics
  const measure = performance.getEntriesByName('window-open-duration')[0];
  trackMetric('window_open_time', measure.duration);
};

// Core Web Vitals tracking
export const trackWebVitals = (metric: any) => {
  const vitals = ['FCP', 'LCP', 'CLS', 'FID', 'TTFB'];
  
  if (vitals.includes(metric.name)) {
    // Send to monitoring service
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        path: window.location.pathname,
        org: getCurrentOrgId(),
      }),
    });
  }
};
```

#### C. Business Metrics Dashboard
```typescript
// convex/analytics/businessMetrics.ts
export const getOrganizationMetrics = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    // Gather metrics
    const [
      activeUsers,
      appUsage,
      storageUsed,
      apiCalls,
    ] = await Promise.all([
      // Active users in last 30 days
      ctx.db
        .query("sessions")
        .withIndex("by_org_and_time", (q) => 
          q.eq("organizationId", args.orgId)
           .gte("lastActiveAt", thirtyDaysAgo)
        )
        .collect(),
        
      // App usage stats
      ctx.db
        .query("appUsageEvents")
        .withIndex("by_org_and_time", (q) => 
          q.eq("organizationId", args.orgId)
           .gte("timestamp", thirtyDaysAgo)
        )
        .collect(),
        
      // Calculate storage
      calculateOrgStorage(ctx, args.orgId),
      
      // API usage
      ctx.db
        .query("apiUsage")
        .withIndex("by_org_and_time", (q) => 
          q.eq("organizationId", args.orgId)
           .gte("timestamp", thirtyDaysAgo)
        )
        .collect(),
    ]);
    
    return {
      activeUsers: new Set(activeUsers.map(s => s.userId)).size,
      appUsageByType: groupAppUsage(appUsage),
      storageGB: storageUsed / (1024 * 1024 * 1024),
      apiCallsTotal: apiCalls.length,
      apiCallsByDay: groupByDay(apiCalls),
    };
  },
});
```

### 3. Deployment Configuration

#### A. Environment Configuration
```bash
# .env.production
# Convex Production
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
CONVEX_DEPLOY_KEY=prod_xxx

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_MAINTENANCE_MODE=false

# Limits
NEXT_PUBLIC_MAX_ORGS_PER_USER=5
NEXT_PUBLIC_MAX_APPS_PER_ORG=20
NEXT_PUBLIC_MAX_MEMBERS_PER_ORG=100
```

#### B. Vercel Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build:production",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "app/api/webhook/[...slug].ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

#### C. Deployment Scripts
```json
// package.json scripts
{
  "scripts": {
    // Development
    "dev": "next dev",
    "dev:convex": "convex dev",
    
    // Building
    "build": "next build",
    "build:production": "NODE_ENV=production npm run build",
    
    // Testing
    "test": "jest",
    "test:e2e": "playwright test",
    "test:security": "npm run test -- --testPathPattern=security",
    
    // Deployment
    "deploy:preview": "vercel --env preview",
    "deploy:production": "vercel --prod",
    "deploy:convex": "convex deploy",
    
    // Post-deployment
    "migrate:production": "convex run migrations:latest",
    "seed:demo": "convex run seed:demoData",
    
    // Monitoring
    "monitor:sentry": "sentry-cli releases new $VERSION",
    "monitor:performance": "lighthouse https://vc83.com --output=json"
  }
}
```

### 4. Operational Runbooks

#### A. Deployment Checklist
```markdown
## Production Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] Rollback plan documented

### Deployment Steps
1. **Create Release Branch**
   ```bash
   git checkout -b release/v1.0.0
   git push origin release/v1.0.0
   ```

2. **Deploy Convex Functions**
   ```bash
   npm run deploy:convex
   npm run migrate:production
   ```

3. **Deploy Frontend**
   ```bash
   npm run deploy:production
   ```

4. **Verify Deployment**
   - [ ] Check all routes load
   - [ ] Test authentication flow
   - [ ] Verify org switching works
   - [ ] Test app installation
   - [ ] Check monitoring dashboards

### Post-Deployment
- [ ] Tag release in Git
- [ ] Update Sentry release
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Announce to team
```

#### B. Incident Response
```markdown
## Incident Response Playbook

### Severity Levels
- **SEV1**: Complete outage, data loss risk
- **SEV2**: Major feature broken, significant degradation
- **SEV3**: Minor feature broken, workaround available
- **SEV4**: Cosmetic issues, minor bugs

### Response Process

#### 1. Identification
- Monitor alerts from Sentry/PagerDuty
- Check status page reports
- Verify in multiple regions

#### 2. Communication
- Update status page
- Notify on-call engineer
- Create incident channel

#### 3. Investigation
```bash
# Check application logs
vercel logs --prod --since 1h

# Check Convex logs
convex logs --prod

# Check error rates
curl https://api.sentry.io/projects/vc83/issues/

# Check database status
convex dashboard
```

#### 4. Mitigation
- **Quick fixes**: Hot patch via Vercel
- **Rollback**: `vercel rollback [deployment-id]`
- **Feature flag**: Disable problematic features
- **Scale up**: Increase Vercel functions

#### 5. Resolution
- Deploy fix
- Verify resolution
- Update status page
- Document in postmortem
```

#### C. Scaling Operations
```markdown
## Scaling Guide

### Monitoring Thresholds
- CPU Usage > 80% for 5 minutes
- Memory Usage > 90%
- Response Time > 2s p95
- Error Rate > 1%

### Scaling Actions

#### Frontend (Vercel)
- Automatic scaling (no action needed)
- Consider edge functions for geo-distribution
- Enable ISR for static content

#### Backend (Convex)
1. **Query Optimization**
   - Add database indexes
   - Implement query caching
   - Batch operations

2. **Data Archival**
   - Archive old audit logs
   - Move cold data to storage
   - Implement data retention policies

3. **Rate Limiting**
   - Adjust limits per plan
   - Implement backpressure
   - Add queue system for heavy ops
```

### 5. Documentation

#### A. API Documentation
```typescript
// scripts/generateApiDocs.ts
import { generateOpenAPI } from 'convex-helpers/server/openapi';

export const generateDocs = async () => {
  const spec = await generateOpenAPI({
    title: 'VC83 Multi-Tenant API',
    version: '1.0.0',
    servers: [
      { url: 'https://api.vc83.com', description: 'Production' },
      { url: 'https://staging-api.vc83.com', description: 'Staging' },
    ],
    security: [{ bearerAuth: [] }],
  });
  
  // Add custom endpoints
  spec.paths['/organizations'] = {
    get: {
      summary: 'List user organizations',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of organizations',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Organization' },
              },
            },
          },
        },
      },
    },
  };
  
  // Write to file
  fs.writeFileSync('docs/api.json', JSON.stringify(spec, null, 2));
};
```

#### B. Operations Manual
```markdown
# VC83 Operations Manual

## System Architecture
- Frontend: Next.js on Vercel
- Backend: Convex (Serverless)
- Auth: Clerk
- Monitoring: Sentry + PostHog

## Daily Operations

### Health Checks
1. Check dashboard at https://vc83.com/admin/health
2. Review Sentry for new errors
3. Check Convex dashboard for anomalies
4. Review security logs

### Backup Procedures
- Convex handles automatic backups
- Additional exports run daily at 3 AM UTC
- Backup retention: 30 days

### Maintenance Windows
- Scheduled: Sundays 2-4 AM UTC
- Emergency: As needed with 30-min notice
- Procedure: Enable maintenance mode flag

## Troubleshooting

### Common Issues

#### "Organization not found"
1. Check user's org memberships
2. Verify org exists in database
3. Check for soft-delete flag
4. Review recent audit logs

#### Performance Degradation
1. Check Convex query performance
2. Review recent deployments
3. Check for N+1 queries
4. Monitor memory usage

#### Authentication Failures
1. Verify Clerk webhook
2. Check session expiry
3. Review rate limiting
4. Check CORS settings

## Contact Information
- On-call: +1-xxx-xxx-xxxx
- Engineering: eng@vc83.com
- Status Page: https://status.vc83.com
```

## Monitoring Dashboard Setup

### 1. Create Monitoring Endpoints
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkStorage(),
    checkExternalServices(),
  ]);
  
  const status = checks.every(c => c.healthy) ? 'healthy' : 'degraded';
  
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks: checks.map(c => ({
      name: c.name,
      status: c.healthy ? 'pass' : 'fail',
      message: c.message,
      responseTime: c.responseTime,
    })),
  });
}
```

### 2. Status Page Component
```typescript
// app/status/page.tsx
export default function StatusPage() {
  const { data: status } = useQuery(api.monitoring.getSystemStatus);
  
  return (
    <div className="retro-window">
      <h1 className="pixel-font">System Status</h1>
      
      <div className="status-grid">
        {status?.services.map((service) => (
          <div 
            key={service.name}
            className={`status-item ${service.status}`}
          >
            <span className="service-name">{service.name}</span>
            <span className="service-status">{service.status}</span>
            <span className="response-time">{service.responseTime}ms</span>
          </div>
        ))}
      </div>
      
      <div className="incidents">
        <h2>Recent Incidents</h2>
        {status?.incidents.map((incident) => (
          <div key={incident.id} className="incident">
            <span className="incident-time">{incident.time}</span>
            <span className="incident-severity">{incident.severity}</span>
            <span className="incident-message">{incident.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Launch Checklist

### Pre-Launch (1 Week Before)
- [ ] Complete security penetration testing
- [ ] Load test with expected traffic
- [ ] Review and update documentation
- [ ] Train support team
- [ ] Prepare marketing materials
- [ ] Set up monitoring alerts
- [ ] Configure auto-scaling rules
- [ ] Test disaster recovery procedures

### Launch Day
- [ ] Deploy to production
- [ ] Verify all systems operational
- [ ] Monitor real-time metrics
- [ ] Support team on standby
- [ ] Communication channels open
- [ ] Rollback plan ready

### Post-Launch (First Week)
- [ ] Monitor error rates closely
- [ ] Review performance metrics
- [ ] Gather user feedback
- [ ] Address critical issues
- [ ] Plan first update release
- [ ] Document lessons learned

## Success Criteria

- [ ] Zero-downtime deployment completed
- [ ] All monitoring systems operational
- [ ] Performance meets SLA (< 200ms p95)
- [ ] Error rate below 0.1%
- [ ] Successful load handling (1000+ concurrent users)
- [ ] Security scan shows no critical issues
- [ ] Documentation complete and accessible
- [ ] Support team fully trained
- [ ] Automated backups verified
- [ ] Incident response tested

## Conclusion
The multi-tenant podcast platform is now ready for production deployment. All systems have been optimized, monitored, and documented. The platform can handle the expected load while maintaining security and performance standards.

## Next Steps
1. Schedule production deployment
2. Coordinate with marketing for launch
3. Set up 24/7 monitoring rotation
4. Plan first feature update based on user feedback
5. Continue monitoring and optimization