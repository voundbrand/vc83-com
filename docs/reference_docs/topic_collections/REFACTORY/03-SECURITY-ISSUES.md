# Security Issues Found During Refactoring Analysis

**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## CRITICAL: Plaintext Password Storage

**File:** `convex/crmIntegrations.ts:787`
```typescript
await ctx.db.insert("userPasswords", {
  userId,
  passwordHash: args.password, // TODO: Actually hash this!
  createdAt: Date.now(),
});
```

**Risk:** Passwords stored in plaintext in the database. If the database is breached, all CRM-integration-created user passwords are immediately compromised.

**Fix:** Use the same hashing mechanism as `convex/auth.ts` and `convex/api/v1/emailAuthInternal.ts` which properly accept `passwordHash` (pre-hashed). The CRM integration endpoint must hash before storing.

**Related files using correct pattern:**
- `convex/auth.ts:133-137` - accepts `passwordHash` (correct)
- `convex/onboarding.ts:295-299` - accepts `passwordHash` (correct)
- `convex/invitationOntology.ts:600-604` - accepts `passwordHash` (correct)
- `convex/api/v1/emailAuthInternal.ts:89-101` - accepts `passwordHash` (correct)
- `convex/api/v1/customerAuthInternal.ts:135-140` - accepts `passwordHash` (correct)

---

## HIGH: Hardcoded Organization Data in Invoices

**File:** `convex/consolidatedInvoicing.ts:341-344`
```typescript
organization_address: "Your Business Address",
organization_phone: "Your Phone",
organization_email: "billing@yourcompany.com",
logo_url: undefined,
tax_rate: 0,
```

**Risk:** If this code path is reached in production, invoices will contain placeholder data instead of actual organization information. Could cause legal/compliance issues.

**Fix:** Fetch from organization settings table before generating invoices. Add validation that required fields exist before invoice generation.

---

## MEDIUM: Incomplete Security Event Triggering

**File:** `convex/security/usageTracking.ts:83, 212-223`
```typescript
// TODO: Trigger anomaly detection (async, non-blocking)
// TODO: Use recentFailures count for security event triggering
// TODO: If 20+ failures in 5 minutes, trigger security event
```

**Risk:** Failed authentication attempts are tracked but never trigger security responses (lockouts, alerts). An attacker could brute-force without detection.

---

## MEDIUM: Missing Stripe Webhook Transaction Records

**File:** `convex/stripeWebhooks.ts:147`
```typescript
// TODO: Create transaction record in database
```

**Risk:** Stripe payments may succeed but not be recorded in the application database, leading to inconsistencies between Stripe and application state.

---

## MEDIUM: Incomplete Token Lifecycle

**File:** `convex/stripe/aiWebhooks.ts:331, 350`
```typescript
// TODO: Reset monthly tokens if this is a new billing cycle
// TODO: Mark subscription as past_due
```

**Risk:** AI usage tokens may not reset on billing cycle boundaries, potentially giving users free usage or incorrectly blocking paid users. Past-due subscriptions may continue to have access.

---

## MEDIUM: Missing OAuth Token Revocation

**File:** `convex/oauth/microsoft.ts:305`
```typescript
// TODO: Revoke token with Microsoft (requires separate API call)
```

**Risk:** When users disconnect Microsoft integration, their OAuth tokens remain valid. Could be a compliance issue if organization data access should be fully revoked.

---

## LOW: Incomplete Vercel Webhook Processing

**File:** `src/app/api/oauth/vercel/webhook/route.ts:96-108`
```typescript
// TODO: Store deployment status in database
// TODO: Notify user via WebSocket or polling
// TODO: Update deployment status to "success"
// TODO: Notify user with success message and live URL
```

**Risk:** Deployment status updates from Vercel are received but not processed, meaning users won't see deployment progress in the UI.

---

## LOW: Missing Admin-Only Checks (OAuth Applications)

**File:** `convex/oauth/applications.ts:57, 311, 342, 425, 451, 501, 527`
```typescript
// TODO Phase 3: Add admin-only check using RBAC system
// TODO Phase 3: Restrict to admins only
```

**Risk:** OAuth application management (create, update, delete, rotate secrets) may be accessible to non-admin users. 5 separate endpoints need admin checks.

---

## Recommended Priority Order

1. **Password hashing** - immediate fix, 30 minutes
2. **Hardcoded invoice data** - immediate fix, 1 hour
3. **Security event triggering** - implement brute-force detection, 1-2 days
4. **Stripe transaction records** - ensure payment consistency, 1 day
5. **Token lifecycle** - billing accuracy, 1 day
6. **OAuth admin checks** - access control, 2-3 hours
7. **Microsoft token revocation** - compliance, 2-3 hours
8. **Vercel webhook processing** - UX improvement, 1 day
