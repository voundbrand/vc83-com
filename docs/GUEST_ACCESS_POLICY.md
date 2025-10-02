# Guest Access Security Policy

## Overview

vc83.com implements a **freemium** model where certain features are accessible without authentication to drive user acquisition and conversion. This document defines which endpoints allow guest access and why each is secure.

## Principles

1. **Public Data Only**: Guests can only access data intended for public consumption
2. **Read-Only**: Guests have no write access (no create/update/delete)
3. **Rate Limited**: All guest endpoints should have rate limiting to prevent abuse
4. **Audit Logged**: Guest actions can be logged for security monitoring
5. **No Escalation**: Guest access cannot be escalated to authenticated access

## Allowed Guest Endpoints

### Category 1: Free Content (Shared-Content Apps)

**Rationale**: Free content is marketing material to drive conversions

| Endpoint | Data Exposed | Why Safe | File Location |
|----------|--------------|----------|---------------|
| `app_vc83pod.getEpisodes` | Published podcast episodes only | Public marketing content, filters draft episodes | `convex/app_vc83pod.ts:210-251` |
| `app_vc83pod.getEpisodeBySlug` | Single published episode | Public content, authentication optional | `convex/app_vc83pod.ts:253-286` |
| `app_vc83pod.getEpisodeById` | Single published episode by ID | Public content, authentication optional | `convex/app_vc83pod.ts:288-308` |
| `app_vc83pod.incrementEpisodeViews` | View count increment | Anonymous metric, no sensitive data | `convex/app_vc83pod.ts:310-324` |

**Security Controls**:
- ✅ Only `status: "published"` episodes visible to guests (line 243-245)
- ✅ Draft/archived episodes require VC83 creator authentication
- ✅ Uses `getPublicContext()` helper for safe guest handling (line 221, 258, 293)
- ✅ No personal data exposed (creator info is public system data)
- ⚠️ Rate limiting: TODO - Add 100 requests/hour per IP

**Implementation Details**:
```typescript
// convex/app_vc83pod.ts:220-251
const { user, organization } = await getPublicContext(ctx); // Safe for guests
const isCreator = user && organization?._id === vc83Org._id;

if (status) {
  episodesQuery = episodesQuery.filter((q) => q.eq(q.field("status"), status));
} else if (!isCreator) {
  // Guests and non-creators only see published
  episodesQuery = episodesQuery.filter((q) => q.eq(q.field("status"), "published"));
}
```

### Category 2: App Store (Public Catalog)

**Rationale**: App catalog is marketing material

| Endpoint | Data Exposed | Why Safe | Status |
|----------|--------------|----------|--------|
| `apps.listApps` | All active apps with metadata | Public catalog, pricing is public information | TODO |
| `apps.getAppByCode` | Single app details | Public information | TODO |

**Security Controls**:
- Only `isActive: true` apps should be visible
- No sensitive configuration exposed
- No installation data visible (guest can't see who installed what)
- Rate limiting: Should add 50 requests/hour per IP

## Forbidden for Guests

**These endpoints MUST require authentication**:

1. **✅ Episode Mutations**: `createEpisode`, `updateEpisode`, `deleteEpisode`
   - Uses `requireCreatorOrg()` helper (convex/helpers.ts:164-210)
   - Enforces VC83-only access
   - Creates audit logs for all actions

2. **✅ App Installation**: `appInstallations.*` (all mutations and queries)
   - Already requires authentication

3. **User Data**: `users.*` (all endpoints)
   - Authentication required for all user operations

4. **Organization Data**: `organizations.*` (all endpoints)
   - Authentication required for all org operations

5. **Membership Data**: `memberships.*` (all endpoints)
   - Authentication required for all membership operations

6. **Private-Tool Apps**: Any app with `appType: "private-tool"`
   - Installation required

7. **Paid Content**: Any app with `price > 0` (unless installed)
   - Installation with payment required

8. **Audit Logs**: `auditLogs.*` (all endpoints)
   - Sensitive security data, authentication required

9. **Admin Functions**: Any endpoint requiring `owner` or `admin` role
   - Role-based access control enforced

## Rate Limiting

**Current Status**: ⚠️ NOT IMPLEMENTED

**Recommended Implementation**:
- Default: 50 requests/hour per IP
- Burst: 10 requests/minute per IP
- Content endpoints: 100 requests/hour (higher for streaming)
- Exceeded limit → 429 Too Many Requests

**Implementation in convex/security.ts**:
```typescript
// Rate limiting helper exists but not applied to endpoints
export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<boolean> {
  // In-memory rate limiting implementation
}
```

**TODO**: Apply `checkRateLimit()` to all guest-accessible endpoints

## Monitoring and Alerts

**Security monitoring for guest access**:

1. **Unusual Patterns** (Future implementation):
   - Single IP making 1000+ requests/hour
   - Multiple IPs from same ASN making coordinated requests
   - Automated user agents (bots)

2. **Alert Triggers**:
   - Rate limit exceeded by same IP 3+ times
   - Suspected scraping behavior
   - Authentication bypass attempts

3. **Response**:
   - Temporary IP ban (1 hour)
   - CAPTCHA challenge (future)
   - Manual review for persistent offenders

## Implementation Verification

**How to verify guest access is properly scoped**:

1. **Code Review Checklist**:
   - [x] Episode queries use `getPublicContext()` for safe guest handling
   - [x] Only published episodes returned to guests
   - [x] All mutations require authentication via `requireCreatorOrg()`
   - [ ] Rate limiting applied (TODO)
   - [x] Audit logging configured for mutations

2. **Security Testing**:
   - [x] Test suite designed (convex/tests/episodes.test.ts)
   - [x] Verify no sensitive data returned to guests
   - [ ] Test rate limiting (TODO - awaiting implementation)
   - [x] Test escalation prevention (covered in test design)

3. **Audit Evidence**:
   - ✅ Code review: SOC2-001 completed
   - ✅ Security patterns: `getPublicContext()`, `requireCreatorOrg()`
   - ⚠️ Test execution: Blocked by convex-test tooling
   - ⚠️ Rate limiting: Not yet implemented

## SOC2 Compliance Status

### ✅ Implemented

1. **Authentication Control**: All mutations require authentication
2. **Data Isolation**: Creator-only mutations enforce organization boundaries
3. **Audit Logging**: All security-sensitive operations logged
4. **Guest Access Scoping**: Only public data accessible without auth
5. **Security Helper Functions**: Centralized security enforcement

### ⚠️ Pending

1. **Rate Limiting**: Schema and helpers exist, not applied to endpoints
2. **IP Tracking**: Schema supports it, needs HTTP context injection
3. **Automated Tests**: Test suite designed, execution blocked by tooling

### 📋 Future Enhancements

1. **Enhanced Monitoring**: Real-time alerts for suspicious patterns
2. **CAPTCHA**: Add CAPTCHA challenges for rate limit violations
3. **Advanced Bot Detection**: Fingerprinting and behavior analysis

## Changes to This Policy

Any changes to guest access must:

1. Be reviewed by security team
2. Be documented in this policy
3. Have security test coverage
4. Be communicated to SOC2 auditor (if applicable)

**Last Updated**: 2025-10-01  
**Next Review**: 2026-04-01 (6 months)  
**Document Owner**: Development Team  
**SOC2 Auditor**: TBD
