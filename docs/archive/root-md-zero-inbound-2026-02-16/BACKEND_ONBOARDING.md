# Backend Onboarding Architecture

**Last Updated:** January 2026

This document explains how user onboarding works in the L4yercak3 backend.

---

## Overview

There are **two main entry points** for account creation:

1. **Web Self-Service Signup** - Email/password registration
2. **OAuth Signup** - Google, Apple, Microsoft, GitHub (web + mobile)

Both flows create the same core resources but have slight differences.

---

## 1. Web Self-Service Signup

**File:** `convex/onboarding.ts`

**Entry Point:** `signupFreeAccount` action

### Flow

```
User fills signup form
        ↓
signupFreeAccount (action)
        ↓
    ┌───────────────────────────────┐
    │  1. Validate email format     │
    │  2. Validate password (8+)    │
    │  3. Block disposable emails   │
    │  4. Hash password (bcrypt)    │
    │  5. Generate API key          │
    │  6. Hash API key (bcrypt)     │
    └───────────────────────────────┘
        ↓
createFreeAccountInternal (mutation)
        ↓
    ┌───────────────────────────────┐
    │  Database Records Created     │
    └───────────────────────────────┘
        ↓
Async Tasks Scheduled
        ↓
Return session + API key
```

### What `createFreeAccountInternal` Creates

| Step | Table | Description |
|------|-------|-------------|
| 1 | `users` | User record with email, name |
| 2 | `userPasswords` | Bcrypt password hash |
| 3 | `organizations` | Personal workspace with unique slug |
| 4 | `roles` | Gets/creates `org_owner` role |
| 5 | `organizationMembers` | User as owner (invitedBy: self) |
| 6 | `users` | Sets `defaultOrgId` |
| 7 | `organizationStorage` | Initialize at 0 bytes |
| 8 | `userStorageQuotas` | 250 MB limit (free tier) |
| 9 | `objects` | API settings (apiKeysEnabled: true) |
| 10 | `apiKeys` | First API key for Freelancer Portal |
| 11 | `sessions` | 24-hour platform session |
| 12 | `auditLogs` | Signup event logged |
| 13 | (scheduled) | `growthTracking.recordSignupEvent` |
| 14 | (scheduled) | `assignAllAppsToOrg` |
| 15 | (scheduled) | `provisionStarterTemplates` |

### Async Tasks (After Mutation)

| Task | File | Purpose |
|------|------|---------|
| `sendWelcomeEmail` | `convex/actions/welcomeEmail.ts` | Welcome email with API key |
| `sendSalesNotification` | `convex/actions/salesNotificationEmail.ts` | Alert sales team |
| `createStripeCustomerForFreeUser` | `convex/onboarding.ts` | Enable upgrade path |

---

## 2. OAuth Signup (Web + Mobile)

**Files:**
- `convex/api/v1/oauthSignup.ts` - Web OAuth
- `convex/api/v1/mobileOAuth.ts` - Mobile OAuth (native SDKs)

**Entry Points:**
- Web: `completeOAuthSignup` action
- Mobile: `mobileOAuthHandler` HTTP action

### Flow

```
User clicks "Sign in with Google/Apple"
        ↓
Native SDK / OAuth redirect
        ↓
┌─────────────────────────────────────┐
│  Web: completeOAuthSignup           │
│  Mobile: mobileOAuthHandler         │
└─────────────────────────────────────┘
        ↓
findOrCreateUserFromOAuth (mutation)
        ↓
    ┌───────────────────────────────┐
    │  Check if user exists (email) │
    │  If exists → return user      │
    │  If new → create everything   │
    └───────────────────────────────┘
        ↓
(Mobile only) Create identity record
        ↓
Async Tasks Scheduled
        ↓
Return session
```

### What `findOrCreateUserFromOAuth` Creates

| Step | Table | Description |
|------|-------|-------------|
| 1 | `users` | User record (isPasswordSet: false) |
| 2 | `organizations` | Personal workspace with unique slug |
| 3 | `roles` | Gets/creates `org_owner` role |
| 4 | `organizationMembers` | User as owner |
| 5 | `users` | Sets `defaultOrgId` |
| 6 | `organizationStorage` | Initialize at 0 bytes |
| 7 | `userStorageQuotas` | 250 MB limit (free tier) |
| 8 | `objects` | API settings |
| 9 | `auditLogs` | Signup event logged |
| 10 | (scheduled) | `growthTracking.recordSignupEvent` |
| 11 | (scheduled) | `assignAllAppsToOrg` |

### Additional for Mobile OAuth

| Step | Table | Description |
|------|-------|-------------|
| 12 | `userIdentities` | OAuth identity linked to user |

### Async Tasks (After Mutation)

| Task | Purpose |
|------|---------|
| `sendWelcomeEmail` | Welcome email (apiKeyPrefix: "n/a") |
| `sendSalesNotification` | Alert sales team |
| `createStripeCustomerForFreeUser` | Enable upgrade path |

---

## Comparison: Web vs OAuth Onboarding

| Feature | Web (Password) | OAuth |
|---------|----------------|-------|
| Password stored | Yes (bcrypt) | No |
| API key created | Yes | No |
| Starter templates | Yes | No* |
| Identity record | No | Yes (mobile) |
| Welcome email | With API key | Without API key |
| Stripe customer | Yes | Yes |
| Apps assigned | Yes | Yes |
| Growth tracking | Yes | Yes |

*Consider adding `provisionStarterTemplates` to OAuth flow for parity.

---

## The "Teaser Model" - App Assignment

**Function:** `assignAllAppsToOrg` in `convex/onboarding.ts`

Every new organization gets access to ALL apps:

```typescript
// 1. Find system organization (slug: "system")
const systemOrg = await ctx.db.query("organizations")
  .withIndex("by_slug", q => q.eq("slug", "system"))
  .first();

// 2. Get all active/approved system apps
const activeApps = await ctx.db.query("apps")
  .withIndex("by_creator", q => q.eq("creatorOrgId", systemOrg._id))
  .filter(q => q.or(
    q.eq(q.field("status"), "active"),
    q.eq(q.field("status"), "approved")
  ))
  .collect();

// 3. For each app, create:
//    - appAvailabilities (isAvailable: true)
//    - appInstallations (status: active)
```

**Why?** Users see all apps, but premium features show upgrade prompts based on their tier (licensing). This is the "teaser model" approach.

---

## Starter Templates Provisioning

**Function:** `provisionStarterTemplatesInternal` in `convex/onboarding.ts`

Currently provisions the **Freelancer Portal** template:

```typescript
const STARTER_TEMPLATES = [
  {
    name: "Freelancer Portal",
    templateCode: "freelancer_portal_v1",
    slug: "/portal",
    description: "Client-facing portal for projects, invoices, and profile management",
    requiredScopes: ["contacts:read", "contacts:write", "projects:read", "invoices:read"],
    // ...
  },
  // Future: Marketing Landing Page, Client Portal, etc.
];
```

**What it does:**

1. Finds templates in system org (`type: "template"`, `subtype: "web_app"`)
2. Copies template to user's organization
3. Creates `published_page` object (status: draft)
4. Creates `objectLinks` record (page → template)

---

## Unique Slug Generation

**Function:** `generateUniqueSlug` in `convex/onboarding.ts`

```typescript
// "John's Organization" → "johns-organization"
// If taken → "johns-organization-2", "johns-organization-3", etc.

let baseSlug = name
  .toLowerCase()
  .replace(/'/g, '')           // Remove apostrophes
  .replace(/[^a-z0-9]+/g, "-") // Non-alphanumeric → hyphens
  .replace(/^-+|-+$/g, "")     // Trim hyphens
  .slice(0, 50);               // Max 50 chars

// Check uniqueness, append counter if needed
```

---

## Stripe Customer Creation

**Function:** `createStripeCustomerForFreeUser` in `convex/onboarding.ts`

Creates a Stripe customer for the upgrade path:

```typescript
const customer = await stripe.customers.create({
  name: organizationName,
  email: userEmail,
  metadata: {
    organizationId: orgId,
    platform: "l4yercak3",
    tier: "free",
    signupDate: new Date().toISOString(),
  },
});

// Store customer ID in organization
await ctx.runMutation(internal.organizations.updateStripeCustomer, {
  organizationId,
  stripeCustomerId: customer.id,
});
```

---

## Storage Quotas

### Organization Storage

```typescript
await ctx.db.insert("organizationStorage", {
  organizationId,
  totalSizeBytes: 0,
  totalSizeGB: 0,
  fileCount: 0,
  byCategoryBytes: {},
  lastCalculated: Date.now(),
  updatedAt: Date.now(),
});
```

### User Storage Quota

```typescript
await ctx.db.insert("userStorageQuotas", {
  organizationId,
  userId,
  storageUsedBytes: 0,
  fileCount: 0,
  isEnforced: true,
  storageLimitBytes: 250 * 1024 * 1024, // 250 MB for Free tier
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `convex/onboarding.ts` | Web signup + shared helpers |
| `convex/api/v1/oauthSignup.ts` | Web OAuth signup |
| `convex/api/v1/mobileOAuth.ts` | Mobile OAuth signup |
| `convex/auth/identity.ts` | Multi-provider identity management |
| `convex/actions/welcomeEmail.ts` | Welcome email action |
| `convex/actions/salesNotificationEmail.ts` | Sales notification action |
| `convex/growthTracking.ts` | Signup event tracking |

---

## Audit Trail

All signups are logged to `auditLogs`:

```typescript
await ctx.db.insert("auditLogs", {
  organizationId,
  userId,
  action: "user.signup",
  resource: "users",
  resourceId: userId,
  metadata: {
    signupMethod: "self_service" | "oauth",
    planTier: "free",
    organizationName: orgName,
  },
  success: true,
  createdAt: Date.now(),
});
```

---

## Future Improvements

1. **Add `provisionStarterTemplates` to OAuth flow** - Currently only web signup gets templates
2. **Add API key generation for OAuth users** - Optional, on-demand from settings
3. **Add Microsoft provider to mobile** - Currently only Google/Apple on mobile
4. **Add organization invite flow** - Join existing org instead of creating new
