# Stream 3: Seller Onboarding + Sub-Org Creation + Stripe Connect

## Context

You are working on a Next.js monorepo at `/Users/foundbrand_001/Development/vc83-com`. The app `apps/hub-gw` is a benefits marketplace for "Gründungswerft" (a German startup network).

**This stream handles:** When an authenticated GW member wants to become a **seller** (offer benefits, services, or commissions), they need:
1. A **sub-organization** created under the GW parent org
2. A **Stripe Connect account** linked to that sub-org for receiving payments
3. Their `frontend_user` updated with the new `subOrgId`

This stream depends on Stream 1 (OAuth + user sync) being in place — the member must be authenticated first.

## Architecture Overview

```
Member authenticates (Stream 1)
    │
    │  frontend_user exists, isSeller = false, subOrgId = null
    │
    ▼
Member clicks "Anbieter werden" (Become a Seller)
    │
    ▼
┌────────────────────────────────────────────────────┐
│  Step 1: Collect Business Info                      │
│  ─ Business name (required)                         │
│  ─ Industry / category                              │
│  ─ Short description                                │
│  ─ Tax ID / VAT number (optional, for invoicing)    │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│  Step 2: Create Sub-Org (backend)                   │
│  ─ POST to platform: create child org under GW      │
│  ─ parentOrganizationId = GW_ORG_ID                 │
│  ─ Inherits GW's plan tier                          │
│  ─ Returns childOrganizationId                      │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│  Step 3: Stripe Connect Onboarding                  │
│  ─ Redirect to Stripe OAuth                         │
│  ─ Member creates/connects Stripe account           │
│  ─ Callback stores acct_xxx on sub-org              │
│  ─ Sub-org now has payment processing               │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│  Step 4: Update frontend_user                       │
│  ─ Set subOrgId = childOrganizationId               │
│  ─ Set isSeller = true                              │
│  ─ Refresh JWT session                              │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
Member can now create benefits, services, commissions
    → Objects scoped to their sub-org
    → Payments flow to their Stripe Connect account
    → Platform fee deducted via application_fee_amount
```

## What Already Exists (Read These Files)

### Sub-Org Creation:
- `convex/onboarding/agencySubOrgBootstrap.ts` — Full bootstrap pipeline: `bootstrapClientOrg` action. Steps: verify parent tier + sub-org limit, generate slug, create child org, provision baseline, provision agents, register deep link. **This is the reference implementation** but it's designed for agency-managed sub-orgs with agents. For GW sellers, we need a **lighter version** that skips agent provisioning.
- `convex/api/v1/subOrganizationsInternal.ts` — Lower-level CRUD: `createChildOrganizationInternal` mutation. Creates child org with `parentOrganizationId`, inherits plan, verifies slug uniqueness, prevents double-nesting.
- `convex/api/v1/subOrganizations.ts` — HTTP endpoints: `POST /api/v1/organizations/children` (requires `organizations:write` scope)
- `convex/schemas/coreSchemas.ts` — `organizations` table: `parentOrganizationId` field, `by_parent` index, `paymentProviders[]` array

### Stripe Connect Onboarding:
- `convex/stripeConnect.ts` — Full onboarding flow:
  - `startOnboarding` mutation — validates session, checks feature access, schedules `createStripeAccountLink`
  - `createStripeAccountLink` internal action — builds Stripe OAuth URL with `client_id`, `scope: "read_write"`, org email/name pre-fill
  - `handleOAuthCallback` mutation — receives authorization code, schedules `completeOAuthConnection`
  - `completeOAuthConnection` internal action — exchanges code via `stripe.oauth.token()`, gets account status, saves to DB
  - `updateStripeConnectAccountInternal` internal mutation — saves provider config to `organizations.paymentProviders[]`
  - `refreshAccountStatusFromStripe` internal action — refreshes status, syncs tax + invoicing settings
- `convex/paymentProviders/stripe.ts` — `StripeConnectProvider` class:
  - `startAccountConnection(params)` — builds OAuth URL
  - `completeOAuthConnection(code)` — exchanges code for `stripe_user_id`
  - `getAccountStatus(accountId)` — retrieves account, maps to status enum
  - `createCheckoutSession(params)` — creates PaymentIntent on connected account

### Fee Structure:
- `apps/hub-gw/docs/project-notes/kiro/benefits_v2/PLATFORM_FEES.md` — Platform fee schedule:
  - Benefit Claim: €0.50 flat
  - Commission Payout (Stripe): 2.5% (min €1, max €50)
  - Commission Payout (Crypto): 1.5%
  - Escrow Release: 1.0%
  - Volume discounts at €500/€1000/€2500/€5000+ monthly

### Payment Phases:
- `apps/hub-gw/docs/project-notes/kiro/benefits_v2/phases/PHASE_2_PAYMENTS.md` — Payment roadmap
- `apps/hub-gw/docs/project-notes/kiro/benefits_v2/ARCHITECTURE.md` — Benefits v2 architecture
- `apps/hub-gw/docs/project-notes/kiro/benefits_v2/DATA_MODEL.md` — Data model for benefits marketplace

### Hub-GW Current State:
- `apps/hub-gw/app/meine-angebote/page.tsx` — "My Offers" page (currently shows mock data)
- `apps/hub-gw/components/create-benefit-modal.tsx` — Benefit creation form
- `apps/hub-gw/components/create-provision-modal.tsx` — Commission creation form
- `apps/hub-gw/components/create-service-modal.tsx` — Service creation form
- `apps/hub-gw/app/api/benefits/route.ts` — Creates objects via `channels.router.insertObjectInternal` — currently scoped to `GW_ORG_ID` (needs to change to sub-org ID for sellers)

## What Needs To Be Built

### 1. Backend: Lightweight Seller Sub-Org Bootstrap

Create `convex/onboarding/sellerSubOrgBootstrap.ts` (or add to existing files). This is a **lighter version** of `agencySubOrgBootstrap.ts` — no agent provisioning, no Telegram deep links. Just:

```typescript
export const bootstrapSellerOrg = internalAction({
  args: {
    parentOrganizationId: v.id("organizations"),  // GW_ORG_ID
    businessName: v.string(),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    frontendUserId: v.id("objects"),  // The frontend_user to link
    crmOrganizationId: v.optional(v.id("objects")),  // CRM org if exists
  },
  handler: async (ctx, args) => {
    // 1. Verify parent exists and has sub-org capability
    //    GW should be Agency or Enterprise tier with subOrgsEnabled

    // 2. Check sub-org limit

    // 3. Generate unique slug from businessName

    // 4. Create child org via createChildOrganizationInternal
    //    - parentOrganizationId = GW_ORG_ID
    //    - Inherits parent's plan

    // 5. Apply minimal baseline provisioning
    //    - Create organization_profile object with industry/description
    //    - Skip agent provisioning (sellers don't need AI agents)
    //    - Skip Telegram deep link

    // 6. Link frontend_user to the new sub-org
    //    - Update frontend_user.customProperties.subOrgId = childOrgId
    //    - Update frontend_user.customProperties.isSeller = true
    //    - Create objectLink: frontend_user → sub-org (linkType: "seller_of")

    // 7. If crmOrganizationId provided, link crm_org to sub-org
    //    - Create objectLink: crm_organization → sub-org (linkType: "platform_org")
    //    - Store platformSubOrgId in crm_organization.customProperties

    // 8. Return result
    return {
      success: true,
      childOrganizationId: childOrgId,
      slug,
      stripeOnboardingRequired: true,  // Signal to frontend
    };
  },
});
```

### 2. Backend: HTTP Endpoint for Seller Onboarding

Add to `convex/http.ts` (or create `convex/api/v1/sellerOnboarding.ts`):

```
POST /api/v1/seller/onboard
```

- Accepts: `{ businessName, industry?, description?, taxId? }`
- Auth: Bearer token (frontend_user._id)
- Validates the user is authenticated and NOT already a seller
- Calls `bootstrapSellerOrg`
- Returns `{ childOrganizationId, slug, stripeOnboardingUrl? }`

```
POST /api/v1/seller/stripe/start
```

- Accepts: `{ returnUrl, refreshUrl }`
- Auth: Bearer token (must be a seller with subOrgId)
- Calls `stripeConnect.startOnboarding` for the seller's sub-org
- Returns `{ onboardingUrl }` (redirect to Stripe)

```
POST /api/v1/seller/stripe/callback
```

- Accepts: `{ code, state }`
- Handles the Stripe OAuth callback
- Calls `stripeConnect.handleOAuthCallback` for the seller's sub-org
- Returns `{ success, accountStatus }`

```
GET /api/v1/seller/status
```

- Auth: Bearer token
- Returns the seller's current status:
  ```typescript
  {
    isSeller: boolean,
    subOrgId?: string,
    stripeStatus: "not_connected" | "pending" | "active" | "restricted",
    chargesEnabled: boolean,
    payoutsEnabled: boolean,
  }
  ```

### 3. Frontend: Seller Onboarding Flow (hub-gw)

**Create these files:**

- `apps/hub-gw/app/seller/onboard/page.tsx` — Multi-step onboarding wizard:
  - **Step 1:** Business info form (name, industry, description)
  - **Step 2:** Review & confirm → calls `POST /api/v1/seller/onboard`
  - **Step 3:** Stripe Connect → redirects to Stripe OAuth
  - **Step 4:** Success page → "You're ready to sell!"

- `apps/hub-gw/app/seller/stripe/callback/page.tsx` — Handles Stripe OAuth return. Calls `POST /api/v1/seller/stripe/callback`, then redirects to success page.

- `apps/hub-gw/components/seller-onboarding-wizard.tsx` — The multi-step form component

- `apps/hub-gw/components/seller-status-badge.tsx` — Shows seller status in navigation/profile:
  - Not a seller → "Anbieter werden" button
  - Stripe pending → "Stripe einrichten" warning
  - Active → Green badge

**Update these files:**

- `apps/hub-gw/components/navigation.tsx` — Add "Anbieter werden" CTA for non-sellers. Show seller status badge for sellers.

- `apps/hub-gw/app/meine-angebote/page.tsx` — Gate behind seller status. Show onboarding prompt if not a seller. If seller but no Stripe, show Stripe setup prompt.

- `apps/hub-gw/app/api/benefits/route.ts` — **Critical change:** When a seller creates a benefit, scope it to their **sub-org ID** instead of `GW_ORG_ID`. This ensures:
  - The benefit is owned by the seller's sub-org
  - Payments for this benefit go to the seller's Stripe Connect
  - The benefit still shows in the GW marketplace (query both parent + child orgs)

- Similarly update `apps/hub-gw/app/api/provisionen/route.ts` and `apps/hub-gw/app/api/leistungen/route.ts`

### 4. Backend: Marketplace Query Update

Currently `listObjectsByOrgTypeInternal` only queries one org. For the marketplace, we need to list objects from GW parent **AND all child orgs**:

Add to `convex/channels/router.ts` (or create a new query):

```typescript
// List objects from a parent org AND all its child orgs
export const listMarketplaceObjectsInternal = internalQuery({
  args: {
    parentOrganizationId: v.id("organizations"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get all child org IDs
    const childOrgs = await ctx.db
      .query("organizations")
      .withIndex("by_parent", (q) => q.eq("parentOrganizationId", args.parentOrganizationId))
      .collect();

    const orgIds = [args.parentOrganizationId, ...childOrgs.map(o => o._id)];

    // 2. Query objects from all orgs
    const results = await Promise.all(
      orgIds.map(orgId =>
        ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) => q.eq("organizationId", orgId).eq("type", args.type))
          .collect()
      )
    );

    return results.flat();
  },
});
```

Then update `apps/hub-gw/lib/data-server.ts` to use this new query for listing marketplace content (benefits, services, commissions from all sellers).

### 5. Session Refresh After Becoming a Seller

After the seller onboarding completes, the JWT session needs to be refreshed to include the new `subOrgId` and `isSeller = true`. Options:

**Option A (Recommended):** Force a session refresh by calling `sync-user` again and updating the JWT via NextAuth's `update()` method.

**Option B:** Redirect the user to sign out and back in (poor UX but simpler).

Implement Option A: After `POST /api/v1/seller/onboard` succeeds, call a Next.js API route that updates the session:

```typescript
// apps/hub-gw/app/api/auth/refresh-session/route.ts
export async function POST(request: Request) {
  // Re-fetch user data from platform
  // Update JWT token with new subOrgId and isSeller
  // Return updated session
}
```

## Important Constraints

1. **DO NOT use `npx convex dev`** — it deploys to the live backend. Use `npx tsc --noEmit --pretty -- <files>` for type checking.
2. **DO NOT run `git stash`, `git checkout .`, or other destructive git commands** without asking first.
3. Sub-org creation is **one level only** — the platform enforces this (no sub-sub-orgs).
4. Stripe Connect requires `STRIPE_CLIENT_ID` and `STRIPE_SECRET_KEY` env vars on the platform side.
5. The seller onboarding wizard should be **skippable for Stripe** initially — a member can become a seller (sub-org created) but defer Stripe setup. They just can't receive payments until Stripe is connected.
6. Free benefits (discount codes, referral links) can be offered without Stripe. Only paid services/commissions require Stripe.
7. **Marketplace listing queries** must include objects from both the parent GW org AND all child sub-orgs. This is a critical change from the current single-org query pattern.

## Environment Variables

Platform side (already configured):
```
STRIPE_SECRET_KEY=sk_...
STRIPE_CLIENT_ID=ca_...          # For Stripe Connect OAuth
STRIPE_WEBHOOK_SECRET=whsec_...
```

Hub-GW side (add to `.env.local.example`):
```
# Stripe Connect return URLs
NEXT_PUBLIC_STRIPE_RETURN_URL=http://localhost:3000/seller/stripe/callback
NEXT_PUBLIC_STRIPE_REFRESH_URL=http://localhost:3000/seller/stripe/callback?refresh=true
```

## Testing Strategy

1. Create a test sub-org manually via Convex dashboard under GW_ORG_ID
2. Test the `bootstrapSellerOrg` function independently
3. Test Stripe Connect in **test mode** (isTestMode = true)
4. Use Stripe's test mode OAuth flow (connects to test accounts)
5. Test marketplace query that spans parent + child orgs
6. Test the full flow: authenticate → become seller → connect Stripe → create benefit → verify it appears in marketplace

## Success Criteria

- [ ] `bootstrapSellerOrg` action created (lighter than agency bootstrap)
- [ ] `POST /api/v1/seller/onboard` endpoint created
- [ ] `POST /api/v1/seller/stripe/start` endpoint created
- [ ] `POST /api/v1/seller/stripe/callback` endpoint created
- [ ] `GET /api/v1/seller/status` endpoint created
- [ ] Seller onboarding wizard UI in hub-gw
- [ ] Stripe Connect redirect flow working
- [ ] frontend_user updated with subOrgId after onboarding
- [ ] Session refresh after becoming a seller
- [ ] Benefit/service/commission creation scoped to sub-org
- [ ] `listMarketplaceObjectsInternal` query spans parent + child orgs
- [ ] `data-server.ts` updated to use marketplace query
- [ ] Seller status badge in navigation
- [ ] "Anbieter werden" CTA for non-sellers
- [ ] Free benefits work without Stripe; paid require Stripe

## Relationship to Other Streams

- **Stream 1 (OAuth):** This stream depends on Stream 1. The member must be authenticated before they can become a seller. The sync-user response tells us if they're already a seller.
- **Stream 2 (Shared CMS Package):** Independent. CMS is about content editing, not seller onboarding.
