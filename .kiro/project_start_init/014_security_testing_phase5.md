# Task 014: Phase 5 - Security & Testing

## Objective
Implement comprehensive security measures and testing infrastructure to ensure data isolation, user authentication, and system reliability across all multi-tenant features.

## Prerequisites
- Phase 1: Initial Convex Setup (Complete)
- Phase 2: Frontend Auth UI (Complete)
- Phase 3: App Store Backend (Complete)
- Phase 4: Organization Management UI (Complete)
- Basic understanding of security best practices
- Familiarity with testing frameworks (Jest, React Testing Library)

## Security Implementation

### 1. Data Isolation Validation

#### A. Query-Level Security
```typescript
// convex/security/validators.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const validateOrgAccess = async (
  ctx: any,
  orgId: string,
  requiredRole?: "admin" | "member"
) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) => 
      q.eq("userId", identity.subject).eq("organizationId", orgId)
    )
    .first();
    
  if (!membership) throw new Error("Access denied: Not a member");
  
  if (requiredRole === "admin" && membership.role !== "admin") {
    throw new Error("Access denied: Admin role required");
  }
  
  return membership;
};

// Apply to all org-specific queries
export const secureOrgQuery = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await validateOrgAccess(ctx, args.orgId);
    // Query logic here
  },
});
```

#### B. Cross-Tenant Access Prevention
```typescript
// convex/security/crossTenantCheck.ts
export const preventCrossTenantAccess = async (
  ctx: any,
  resourceId: string,
  resourceType: "installedApps" | "appData"
) => {
  const resource = await ctx.db.get(resourceId);
  if (!resource) throw new Error("Resource not found");
  
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  
  // Verify user has access to the resource's org
  await validateOrgAccess(ctx, resource.organizationId);
  
  return resource;
};
```

### 2. Authentication Security Layer

#### A. Session Management
```typescript
// convex/auth/sessions.ts
export const createSecureSession = mutation({
  args: {
    userId: v.id("users"),
    deviceInfo: v.object({
      userAgent: v.string(),
      ip: v.optional(v.string()),
      platform: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Create session with expiry
    const session = await ctx.db.insert("sessions", {
      userId: args.userId,
      token: generateSecureToken(),
      deviceInfo: args.deviceInfo,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      lastActiveAt: Date.now(),
    });
    
    // Log security event
    await ctx.db.insert("securityLogs", {
      type: "session_created",
      userId: args.userId,
      timestamp: Date.now(),
      metadata: args.deviceInfo,
    });
    
    return session;
  },
});
```

#### B. Rate Limiting
```typescript
// convex/security/rateLimiter.ts
export const checkRateLimit = async (
  ctx: any,
  action: string,
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
) => {
  const windowStart = Date.now() - windowMs;
  
  const attempts = await ctx.db
    .query("rateLimitAttempts")
    .withIndex("by_action_and_identifier", (q) => 
      q.eq("action", action).eq("identifier", identifier)
    )
    .filter((q) => q.gte(q.field("timestamp"), windowStart))
    .collect();
    
  if (attempts.length >= limit) {
    throw new Error(`Rate limit exceeded for ${action}`);
  }
  
  // Record attempt
  await ctx.db.insert("rateLimitAttempts", {
    action,
    identifier,
    timestamp: Date.now(),
  });
};
```

### 3. Input Validation & Sanitization

#### A. Business Registration Validation
```typescript
// convex/validation/businessValidation.ts
import { z } from "zod";

export const businessRegistrationSchema = z.object({
  businessName: z.string()
    .min(2, "Business name too short")
    .max(100, "Business name too long")
    .regex(/^[a-zA-Z0-9\s\-\.&]+$/, "Invalid characters in business name"),
  
  taxId: z.string()
    .regex(/^[A-Z0-9\-]+$/, "Invalid tax ID format")
    .optional(),
  
  email: z.string()
    .email("Invalid email format")
    .toLowerCase(),
    
  website: z.string()
    .url("Invalid URL format")
    .optional()
    .or(z.literal("")),
    
  industry: z.enum([
    "technology", "finance", "healthcare", "retail", "manufacturing", "other"
  ]),
});

export const validateBusinessInput = (data: unknown) => {
  return businessRegistrationSchema.parse(data);
};
```

#### B. XSS Prevention
```typescript
// convex/security/sanitization.ts
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
};

export const sanitizeBusinessData = (data: any) => {
  return {
    ...data,
    businessName: sanitizeInput(data.businessName),
    description: data.description ? sanitizeInput(data.description) : undefined,
  };
};
```

## Testing Implementation

### 1. Unit Tests

#### A. Authentication Tests
```typescript
// __tests__/auth/authentication.test.ts
import { describe, it, expect } from '@jest/globals';
import { validateOrgAccess } from '../../convex/security/validators';

describe('Authentication Security', () => {
  it('should deny access to non-members', async () => {
    const mockCtx = createMockContext({
      userId: 'user123',
      orgs: ['org456'],
    });
    
    await expect(
      validateOrgAccess(mockCtx, 'org789')
    ).rejects.toThrow('Access denied: Not a member');
  });
  
  it('should allow access to members', async () => {
    const mockCtx = createMockContext({
      userId: 'user123',
      orgs: ['org456'],
    });
    
    const result = await validateOrgAccess(mockCtx, 'org456');
    expect(result).toBeTruthy();
  });
  
  it('should enforce admin role requirements', async () => {
    const mockCtx = createMockContext({
      userId: 'user123',
      orgs: ['org456'],
      role: 'member',
    });
    
    await expect(
      validateOrgAccess(mockCtx, 'org456', 'admin')
    ).rejects.toThrow('Access denied: Admin role required');
  });
});
```

#### B. Data Isolation Tests
```typescript
// __tests__/security/dataIsolation.test.ts
describe('Data Isolation', () => {
  it('should prevent cross-tenant data access', async () => {
    const ctx = createTestContext();
    
    // Create two organizations
    const org1 = await createTestOrg(ctx, 'Org 1');
    const org2 = await createTestOrg(ctx, 'Org 2');
    
    // Create app in org1
    const app = await createTestApp(ctx, org1.id);
    
    // Try to access from org2 context
    await expect(
      accessAppFromOrg(ctx, app.id, org2.id)
    ).rejects.toThrow('Access denied');
  });
  
  it('should isolate app data between organizations', async () => {
    const ctx = createTestContext();
    const org1 = await createTestOrg(ctx, 'Org 1');
    const org2 = await createTestOrg(ctx, 'Org 2');
    
    // Install same app in both orgs
    await installApp(ctx, org1.id, 'episodes');
    await installApp(ctx, org2.id, 'episodes');
    
    // Add data to org1's app
    await addAppData(ctx, org1.id, 'episodes', { title: 'Org1 Episode' });
    
    // Query from org2 should not see org1's data
    const org2Data = await getAppData(ctx, org2.id, 'episodes');
    expect(org2Data).toHaveLength(0);
  });
});
```

### 2. Integration Tests

#### A. Multi-Tenant Flow Tests
```typescript
// __tests__/integration/multiTenantFlow.test.ts
describe('Multi-Tenant User Flow', () => {
  it('should handle complete business registration flow', async () => {
    const { user, page } = await setupTestEnvironment();
    
    // Navigate to registration
    await page.goto('/register/business');
    
    // Fill business details
    await page.fill('[name="businessName"]', 'Test Corp');
    await page.fill('[name="email"]', 'test@testcorp.com');
    await page.selectOption('[name="industry"]', 'technology');
    
    // Submit and verify
    await page.click('[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Verify organization created
    const org = await getOrgByEmail('test@testcorp.com');
    expect(org.name).toBe('Test Corp');
    expect(org.plan).toBe('trial');
  });
  
  it('should enforce app visibility controls', async () => {
    const { admin, member, org } = await setupMultiUserOrg();
    
    // Admin hides an app
    await loginAs(admin);
    await hideApp(org.id, 'episodes');
    
    // Member should not see hidden app
    await loginAs(member);
    const visibleApps = await getVisibleApps(org.id);
    expect(visibleApps).not.toContainEqual(
      expect.objectContaining({ appId: 'episodes' })
    );
  });
});
```

#### B. Security Boundary Tests
```typescript
// __tests__/integration/securityBoundaries.test.ts
describe('Security Boundaries', () => {
  it('should prevent unauthorized API access', async () => {
    const response = await fetch('/api/organizations/org123/apps', {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });
    
    expect(response.status).toBe(401);
  });
  
  it('should rate limit authentication attempts', async () => {
    const attempts = Array(15).fill(null).map(() => 
      attemptLogin('user@example.com', 'wrong-password')
    );
    
    const results = await Promise.all(attempts);
    const blocked = results.filter(r => r.status === 429);
    
    expect(blocked.length).toBeGreaterThan(0);
  });
});
```

### 3. Performance & Load Tests

#### A. Multi-Tenant Load Testing
```typescript
// __tests__/performance/multiTenantLoad.test.ts
describe('Multi-Tenant Performance', () => {
  it('should handle concurrent org operations', async () => {
    const startTime = Date.now();
    
    // Simulate 100 concurrent org operations
    const operations = Array(100).fill(null).map((_, i) => 
      createOrgWithApps(`Org ${i}`, ['episodes', 'about', 'contact'])
    );
    
    await Promise.all(operations);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(10000); // 10 seconds max
  });
  
  it('should maintain query performance with many orgs', async () => {
    // Create 1000 organizations
    await seedDatabase(1000);
    
    const queryTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await queryOrgApps(`org${i}`);
      queryTimes.push(Date.now() - start);
    }
    
    const avgTime = queryTimes.reduce((a, b) => a + b) / queryTimes.length;
    expect(avgTime).toBeLessThan(50); // 50ms average
  });
});
```

### 4. Security Audit Tools

#### A. Automated Security Scanning
```typescript
// scripts/securityAudit.ts
import { scanForVulnerabilities } from './security/scanner';

export const runSecurityAudit = async () => {
  console.log('🔒 Running Security Audit...\n');
  
  const checks = [
    { name: 'SQL Injection', test: testSQLInjection },
    { name: 'XSS Vulnerabilities', test: testXSS },
    { name: 'CSRF Protection', test: testCSRF },
    { name: 'Rate Limiting', test: testRateLimiting },
    { name: 'Data Isolation', test: testDataIsolation },
    { name: 'Auth Bypass', test: testAuthBypass },
  ];
  
  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        await check.test();
        return { name: check.name, status: 'PASS', issues: [] };
      } catch (error) {
        return { 
          name: check.name, 
          status: 'FAIL', 
          issues: [error.message] 
        };
      }
    })
  );
  
  // Generate report
  generateSecurityReport(results);
};
```

#### B. Penetration Testing Checklist
```markdown
## Manual Penetration Testing Checklist

### Authentication
- [ ] Attempt login with SQL injection payloads
- [ ] Test for session fixation vulnerabilities
- [ ] Verify session timeout enforcement
- [ ] Check for password policy bypass
- [ ] Test account enumeration prevention

### Authorization
- [ ] Attempt to access other orgs' data via API
- [ ] Test role elevation attacks
- [ ] Verify admin-only endpoints protection
- [ ] Check for IDOR vulnerabilities
- [ ] Test app permission boundaries

### Data Security
- [ ] Verify encrypted data transmission (HTTPS)
- [ ] Check for sensitive data in logs
- [ ] Test for information disclosure
- [ ] Verify secure cookie flags
- [ ] Check for data leakage in errors

### Business Logic
- [ ] Test org switching security
- [ ] Verify billing isolation
- [ ] Check app installation limits
- [ ] Test concurrent user limits
- [ ] Verify trial period enforcement
```

## Monitoring & Logging

### 1. Security Event Logging
```typescript
// convex/monitoring/securityLogger.ts
export const logSecurityEvent = async (
  ctx: any,
  event: {
    type: 'auth_failure' | 'access_denied' | 'rate_limit' | 'suspicious_activity';
    userId?: string;
    organizationId?: string;
    details: Record<string, any>;
  }
) => {
  await ctx.db.insert("securityLogs", {
    ...event,
    timestamp: Date.now(),
    ip: ctx.request?.ip,
    userAgent: ctx.request?.headers['user-agent'],
  });
  
  // Alert on critical events
  if (event.type === 'suspicious_activity') {
    await sendSecurityAlert(event);
  }
};
```

### 2. Audit Trail
```typescript
// convex/monitoring/auditTrail.ts
export const createAuditLog = mutation({
  args: {
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    changes: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    await ctx.db.insert("auditLogs", {
      ...args,
      userId: identity?.subject,
      timestamp: Date.now(),
      ip: ctx.request?.ip,
    });
  },
});
```

## Testing Commands

```bash
# Run all security tests
npm run test:security

# Run specific test suites
npm run test:auth
npm run test:isolation
npm run test:validation

# Run penetration tests
npm run test:pentest

# Generate security report
npm run audit:security

# Check for vulnerabilities
npm audit
npm run check:deps
```

## Success Criteria

- [ ] All authentication flows are secure and tested
- [ ] Data isolation between organizations is guaranteed
- [ ] Input validation prevents injection attacks
- [ ] Rate limiting protects against abuse
- [ ] Security events are properly logged
- [ ] All security tests pass
- [ ] Performance remains acceptable under load
- [ ] No critical vulnerabilities in dependencies
- [ ] Penetration testing finds no major issues
- [ ] Audit trail captures all important actions

## Next Steps
After completing security and testing implementation:
1. Run full security audit
2. Perform load testing with realistic data
3. Document security best practices
4. Proceed to Phase 6: Production Readiness (Task 015)