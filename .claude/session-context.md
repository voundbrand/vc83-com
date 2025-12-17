# Session Context: Licensing System Refactor & Payment Provider Integration

## What We Just Completed

### 1. **Licensing Consolidation (MAJOR REFACTOR)**
We successfully consolidated all licensing/plan tier management to a **single source of truth**: the `organization_license` object in the `objects` table.

**Key Changes:**
- ✅ Removed `plan` field from `organizations` table (made optional for backward compatibility)
- ✅ All licensing now managed through `organization_license` object
- ✅ Updated 24+ files across backend and frontend
- ✅ All code now uses `getLicenseInternal()` from `convex/licensing/helpers.ts`
- ✅ OAuth quotas, platform checkout, sales notifications, growth tracking all refactored
- ✅ Frontend components updated to query licenses instead of reading `organization.plan`

**Data Structure:**
```typescript
// Single source of truth: objects table
{
  type: "organization_license",
  organizationId: Id<"organizations">,
  status: "active",
  customProperties: {
    planTier: "free" | "starter" | "professional" | "agency" | "enterprise",
    featureOverrides: { ... },  // Super admin can override individual features
    limits: { ... },             // Custom limits if needed
    features: { ... }            // Custom features if needed
  }
}
```

**How to Check License:**
- Query: `getLicense({ organizationId })` - Public query
- Internal: `getLicenseInternal(ctx, organizationId)` - For mutations/actions
- Super Admin: Use Licensing Tab in Super Admin Organizations Window
- Change tier: `changePlanTier({ sessionId, organizationId, planTier })`

### 2. **Upgrade Modal Integration**
Improved UX for tier-restricted features:
- ✅ `checkFeatureAccess()` now throws `ConvexError` with `FEATURE_LOCKED` code
- ✅ Frontend catches this and shows polished upgrade modal instead of error
- ✅ Implemented in Stripe Connect section
- ✅ Uses existing `useUpgradeModal()` hook with `showFeatureLockedModal()`

**Pattern for Adding Feature Locks:**
```typescript
// Backend (convex mutation/action)
await checkFeatureAccess(ctx, organizationId, "stripeConnectEnabled");

// Frontend (catch and show modal)
try {
  await someMutation({ ... });
} catch (error: any) {
  if (error?.data?.code === "FEATURE_LOCKED") {
    showFeatureLockedModal(
      "Feature Name",
      "Feature description...",
      error.data.requiredTier || "Starter (€199/month)"
    );
  }
}
```

### 3. **Payment Provider System**
Multi-provider payment system is operational:

**Payment Provider Storage (3 locations):**
1. **Primary:** `objects` table with `type: "payment_provider_config"`
2. **Cache:** `organizations.paymentProviders` array
3. **Settings:** `organization_payment_settings` objects

**Providers Supported:**
- `stripe-connect` - Main payment processor (charges, payouts, invoicing)
- `invoice` - Manual invoicing without Stripe

**Check Payment Providers:**
```typescript
// Query payment settings
getPublicPaymentSettings({ organizationId })

// Check in objects table
type: "payment_provider_config"
customProperties: {
  providerCode: "stripe-connect",
  accountId: "acct_...",
  status: "active" | "disabled" | "pending" | "restricted",
  isTestMode: boolean,
  metadata: { chargesEnabled, payoutsEnabled, invoicingEnabled }
}
```

## Current Issues Being Investigated

### Issue #1: License Changes Not Taking Effect
**Symptoms:** User changed plan tier to "starter" but still getting FEATURE_LOCKED error
**Debug Added:** Console logs in `checkFeatureAccess()` to see:
- What tier is being read
- Whether license object exists
- Actual feature flag value

**Next Steps:**
1. Check Convex logs for debug output
2. Verify `organization_license` object in database
3. Confirm `customProperties.planTier` = "starter"

### Issue #2: Payment UI Appears Outdated
**User Report:** "our stripe payment ui is outdated though"
**Need to Clarify:** Which UI component?
- Stripe Connect section in Payments window?
- Payment method selection in checkout?
- Invoice display?

## File Locations Reference

### Licensing System
- **Core Logic:** `convex/licensing/helpers.ts` - `getLicense()`, `checkFeatureAccess()`, `changePlanTier()`
- **Tier Configs:** `convex/licensing/tierConfigs.ts` - All tier limits and features
- **Super Admin:** `convex/licensing/superAdmin.ts` - Manual license management
- **UI Components:**
  - `src/components/licensing/license-overview.tsx` - Main license display
  - `src/components/licensing/feature-category.tsx` - Feature toggles
  - `src/components/window-content/super-admin-organizations-window/manage-org/licensing-tab.tsx`

### Payment Providers
- **Backend:** `convex/stripeConnect.ts` - OAuth, onboarding, status checks
- **Settings:** `convex/organizationPaymentSettings.ts` - Public payment settings
- **Frontend:** `src/components/window-content/payments-window/stripe-connect-section.tsx`
- **Invoice:** `src/components/window-content/payments-window/stripe-invoice-section.tsx`

### Checkout System
- **Behavior-Driven:** `src/templates/checkout/behavior-driven/` - Main checkout flow
- **Payment Step:** `src/templates/checkout/behavior-driven/steps/payment.tsx`
- **Session Management:** `convex/checkoutSessions.ts`, `convex/checkoutSessionOntology.ts`

## Important Patterns

### Checking Licenses in Backend
```typescript
// In mutation/action
const license = await getLicenseInternal(ctx, organizationId);
console.log(license.planTier); // "free", "starter", etc.
console.log(license.features.stripeConnectEnabled); // boolean
console.log(license.limits.maxContacts); // number

// Check feature (throws if locked)
await checkFeatureAccess(ctx, organizationId, "stripeConnectEnabled");
```

### Checking Licenses in Frontend
```typescript
// In React component
const license = useQuery(api.licensing.helpers.getLicense, { organizationId });

if (license?.planTier === "free") {
  // Show upgrade prompt
}

if (!license?.features.stripeConnectEnabled) {
  // Feature locked
}
```

### Super Admin: Changing Plan Tier
```typescript
// Use the mutation
await changePlanTier({
  sessionId,
  organizationId,
  planTier: "starter"
});

// Or toggle individual features
await toggleFeature({
  sessionId,
  organizationId,
  featureKey: "stripeConnectEnabled",
  enabled: true
});
```

## Database Objects to Check

### For Licensing Issues
1. **objects table** → Filter by `type: "organization_license"` and your `organizationId`
2. Check `customProperties.planTier`
3. Check `customProperties.featureOverrides` for manual toggles
4. Verify `status: "active"`

### For Payment Provider Issues
1. **objects table** → Filter by `type: "payment_provider_config"` and your `organizationId`
2. Check `customProperties.providerCode` = "stripe-connect"
3. Check `customProperties.status` = "active"
4. Verify `customProperties.metadata` has capability flags

### For Checkout Issues
1. **checkout_session objects** → Check `customProperties.totalAmount`, `subtotal`, `taxAmount`
2. **organizations table** → Check `paymentProviders` array

## Recent Commits
1. `703cdf9` - refactor: Consolidate licensing to single source of truth
2. `95d50b2` - fix: Make plan field optional for backward compatibility
3. `b9a028c` - fix: Restore totalAmount in checkout session updates
4. `d33f58b` - feat: Show upgrade modal instead of error for locked features
5. `52dafd8` - debug: Add logging to checkFeatureAccess

## What to Work On Next

1. **Debug License Issue** - Check logs, verify database state
2. **Update Payment UI** - Need clarification on which UI is outdated
3. **Consider Migration Script** - Migrate existing `organizations.plan` to `organization_license` objects
4. **Remove Debug Logging** - Once license issue is resolved

## Key Principles

✅ **Single Source of Truth** - Always use `organization_license` object for licensing
✅ **Feature Locks** - Always show upgrade modal, never throw raw errors to users
✅ **Backward Compatibility** - Support existing production data during migration
✅ **Consistent Naming** - Use `planTier` not `plan`, use `stripe-connect` not `stripe`
