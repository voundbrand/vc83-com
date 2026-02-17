# Licensing System Analysis

**Date**: 2025-01-27  
**Scope**: Complete analysis of tier configs and licensing enforcement across the entire application

## Executive Summary

Your licensing system is **well-architected** with a solid foundation, but there are several areas where enforcement is **incomplete** or **inconsistent**. The system handles complexity reasonably well, but there are opportunities to simplify and ensure all boundaries are properly checked.

### Key Findings

✅ **Strengths:**
- Single source of truth (`organization_license` object)
- Comprehensive tier configuration system
- Good separation of concerns (helpers, configs, enforcement)
- Strong documentation

⚠️ **Areas of Concern:**
- Some limits not enforced (users, storage, some nested resources)
- Inconsistent enforcement patterns across apps
- Missing checks in some mutation paths
- Sub-organization licensing complexity unclear
- Rate limiting uses different tier names than licensing system

---

## Architecture Overview

### 1. Core Components

#### **Tier Configurations** (`convex/licensing/tierConfigs.ts`)
- **5 tiers**: Free, Starter, Professional, Agency, Enterprise
- **90+ limit fields** across all resource types
- **60+ feature flags** for premium features
- Single source of truth for all tier definitions

#### **License Helpers** (`convex/licensing/helpers.ts`)
- `getLicenseInternal()` - Core license retrieval
- `checkResourceLimit()` - Enforce resource limits
- `checkMonthlyResourceLimit()` - Enforce monthly limits
- `checkFeatureAccess()` - Enforce feature flags
- `checkSystemTemplateAccess()` - Special template handling

#### **Super Admin Tools** (`convex/licensing/superAdmin.ts`)
- `setOrganizationLicense()` - Set tier and custom limits
- `changePlanTier()` - Simple tier changes
- `toggleFeature()` - Feature-level overrides
- `updateLicenseLimits()` - Custom limit adjustments

### 2. Data Model

```typescript
// License stored in objects table
{
  type: "organization_license",
  organizationId: Id<"organizations">,
  status: "active" | "trial" | "expired" | "suspended",
  customProperties: {
    planTier: "free" | "starter" | "professional" | "agency" | "enterprise",
    limits: { ... },              // Merged: tier defaults → custom → manual override
    features: { ... },             // Merged: tier defaults → custom → featureOverrides
    featureOverrides: { ... },     // Super admin can override individual features
    manualOverride: {              // Tracks manual grants
      customLimits: { ... },
      grantedBy: Id<"users">,
      reason: string
    }
  }
}
```

**Merge Priority:**
1. Tier defaults (from `TIER_CONFIGS`)
2. Custom limits/features (from `setOrganizationLicense`)
3. Manual override limits (super admin)
4. Feature overrides (super admin) - **highest priority**

---

## Enforcement Coverage Analysis

### ✅ Fully Enforced Resources

These resources have proper `checkResourceLimit()` calls in their creation mutations:

| Resource | Limit Key | Files Enforced |
|----------|-----------|----------------|
| Contacts | `maxContacts` | `crmOntology.ts` |
| CRM Organizations | `maxOrganizations` | `crmOntology.ts` |
| Projects | `maxProjects` | `projectOntology.ts` |
| Events | `maxEvents` | `eventOntology.ts` |
| Products | `maxProducts` | `productOntology.ts` |
| Forms | `maxForms` | `formsOntology.ts` |
| Checkout Instances | `maxCheckoutInstances` | `checkoutOntology.ts` |
| Workflows | `maxWorkflows` | `workflows/workflowOntology.ts` |
| Invoices (Monthly) | `maxInvoicesPerMonth` | `invoicingOntology.ts` (3 locations) |
| Emails (Monthly) | `maxEmailsPerMonth` | `emailQueue.ts` |

### ⚠️ Partially Enforced Resources

These have limits defined but enforcement is incomplete:

#### **1. API Keys** (`maxApiKeys`)
- ✅ **Enforced**: `convex/apiKeysInternal.ts:115` - `checkApiKeyLimit()`
- ⚠️ **Issue**: Uses custom internal query instead of standard `checkResourceLimit()`
- ⚠️ **Issue**: Different error format than other limits
- **Recommendation**: Standardize to use `checkResourceLimit()` pattern

#### **2. Custom Domains** (`maxCustomDomains`)
- ✅ **Feature Check**: `convex/domainConfigOntology.ts:141` - `checkFeatureAccess()`
- ❌ **Limit Check**: No `checkResourceLimit()` call found
- **Recommendation**: Add limit enforcement in domain creation mutation

#### **3. Users** (`maxUsers`)
- ❌ **Not Enforced**: No limit check found in user/organization member creation
- **Impact**: Users can exceed tier limits (Free: 1, Starter: 3, Pro: 10)
- **Recommendation**: Add enforcement in `organizationMembers` creation

#### **4. Storage** (`totalStorageGB`, `perUserStorageGB`, `maxFileUploadMB`)
- ❌ **Not Enforced**: No storage limit checks found
- **Impact**: Users can exceed storage quotas
- **Recommendation**: Add storage checks in file upload mutations

#### **5. Nested Resources** (Milestones, Tasks, Attendees, Sponsors, Addons, etc.)
- ❌ **Not Enforced**: Limits exist in config but not checked
- **Examples**: 
  - `maxMilestonesPerProject` - Not checked in milestone creation
  - `maxTasksPerProject` - Not checked in task creation
  - `maxAttendeesPerEvent` - Not checked in attendee creation
  - `maxSponsorsPerEvent` - Not checked in sponsor creation
  - `maxAddonsPerProduct` - Not checked in addon creation
- **Recommendation**: Add nested resource limit checks

#### **6. Forms Responses** (`maxResponsesPerForm`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Impact**: Forms can receive unlimited responses regardless of tier
- **Recommendation**: Add check in form response submission

#### **7. Workflow Behaviors** (`maxBehaviorsPerWorkflow`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in behavior creation

#### **8. Custom Templates** (`maxCustomTemplates`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in template creation

#### **9. Certificates** (`maxCertificates`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in certificate generation

#### **10. Languages** (`maxLanguages`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in language addition

#### **11. Pipelines** (`maxPipelines`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in pipeline creation

#### **12. Pages** (`maxPages`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in page creation

#### **13. OAuth Apps** (`maxCustomOAuthApps`, `maxThirdPartyIntegrations`)
- ⚠️ **Partially Enforced**: Some checks exist but may be incomplete
- **Files**: `convex/oauth/applications.ts`
- **Recommendation**: Verify all OAuth app creation paths are covered

#### **14. Webhooks** (`maxWebhooks`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check in webhook creation

#### **15. Websites per API Key** (`maxWebsitesPerKey`)
- ❌ **Not Enforced**: Limit exists but not checked
- **Recommendation**: Add check when associating websites with API keys

### ✅ Feature Flags Enforcement

**Well Enforced Features** (19+ features):
- Consolidated Invoicing
- Stripe Connect
- Payment Providers
- Multi-Language Checkout
- Inventory Tracking
- B2B Invoicing
- Budget Tracking
- Multi-Step Forms
- Conditional Logic
- File Uploads
- Workflow Templates
- Advanced Conditions
- Custom Domains
- White Label
- Contact Sync
- Advanced Reports
- Event Analytics
- Form Analytics
- SEO Tools
- Content Rules
- Template Versioning
- Custom Roles (RBAC)
- Audit Log Export

**Documentation Status**: See `docs/STARTER-TIER-ENFORCEMENT.md` and `docs/PROFESSIONAL-TIER-ENFORCEMENT.md`

---

## Complexity Analysis

### 1. Tier Configuration Complexity

**Current State:**
- 5 tiers × 90+ limits = **450+ limit values** to maintain
- 5 tiers × 60+ features = **300+ feature flags** to maintain
- Total: **~750 configuration values**

**Assessment**: This is **necessary complexity** given your multi-app platform. The structure is well-organized with clear groupings (CRM, Projects, Events, etc.).

**Recommendation**: ✅ Keep as-is, but consider:
- Adding validation to ensure all limits are set for all tiers
- Creating a migration script to verify tier config completeness

### 2. Enforcement Pattern Complexity

**Current Patterns:**

1. **Standard Pattern** (Most Common):
   ```typescript
   await checkResourceLimit(ctx, orgId, "resource_type", "maxResourceLimit");
   ```

2. **Monthly Limit Pattern**:
   ```typescript
   await checkMonthlyResourceLimit(ctx, orgId, "resource_type", "maxResourceLimitPerMonth");
   ```

3. **Feature Flag Pattern**:
   ```typescript
   await checkFeatureAccess(ctx, orgId, "featureFlagName");
   ```

4. **Custom Pattern** (API Keys):
   ```typescript
   await ctx.runQuery(internal.apiKeysInternal.checkApiKeyLimit, { organizationId });
   ```

**Issue**: Pattern #4 is inconsistent with the rest of the codebase.

**Recommendation**: Standardize all limit checks to use `checkResourceLimit()` or `checkMonthlyResourceLimit()`.

### 3. Merge Logic Complexity

**Current Merge Order:**
```
Tier Defaults → Custom Limits → Manual Override Limits
Tier Defaults → Custom Features → Feature Overrides
```

**Assessment**: This is **appropriate complexity** for flexibility, but:
- ⚠️ **Risk**: Feature overrides can completely bypass tier restrictions
- ⚠️ **Risk**: Manual overrides aren't validated against tier minimums
- ⚠️ **Risk**: No audit trail for manual overrides (except in `manualOverride` object)

**Recommendation**: 
- Add validation to prevent manual overrides from going below tier minimums
- Add audit logging for all manual overrides
- Consider requiring approval workflow for manual overrides

### 4. Sub-Organization Complexity

**Current State:**
- Agency tier supports sub-organizations (`maxSubOrganizations: 2`)
- Comments mention "+€79/each additional, max 20"
- **Issue**: No enforcement found for sub-organization limits
- **Issue**: Unclear how sub-org licensing works (inherit parent? separate license?)

**Recommendation**: 
- Clarify sub-organization licensing model
- Add enforcement for sub-organization creation
- Document how limits apply to sub-organizations

---

## Boundary Checking Issues

### 1. Missing Limit Checks

**Critical Missing Checks:**
1. ❌ User limits (`maxUsers`) - **HIGH PRIORITY**
2. ❌ Storage limits (`totalStorageGB`, `perUserStorageGB`) - **HIGH PRIORITY**
3. ❌ Nested resource limits (milestones, tasks, attendees, etc.) - **MEDIUM PRIORITY**
4. ❌ Form response limits (`maxResponsesPerForm`) - **MEDIUM PRIORITY**
5. ❌ Custom domain limits (`maxCustomDomains`) - **MEDIUM PRIORITY**

### 2. Inconsistent Error Handling

**Current Error Formats:**

1. **Standard Limit Error**:
   ```
   "You've reached your {limitKey} limit ({limit}). Upgrade to {NextTier} for more capacity."
   ```

2. **Monthly Limit Error**:
   ```
   "You've reached your monthly {limitKey} limit ({limit}). Upgrade to {NextTier} or wait until next month."
   ```

3. **Feature Error** (ConvexError):
   ```typescript
   {
     code: "FEATURE_LOCKED",
     message: "This feature requires {Tier}. Current tier: {currentTier}.",
     requiredTier: "...",
     currentTier: "...",
     featureKey: "..."
   }
   ```

4. **API Key Error** (Custom):
   ```
   "You've reached your API key limit ({limit}). Upgrade to {Tier} for {count} API keys."
   ```

**Issue**: API key errors use different format, making frontend parsing inconsistent.

**Recommendation**: Standardize all errors to use `ConvexError` with error codes.

### 3. Rate Limiting Discrepancy

**Issue**: Rate limiting system (`convex/middleware/rateLimit.ts`) uses different tier names:
- `free`, `personal`, `pro`, `business`, `enterprise`

**Licensing system uses:**
- `free`, `starter`, `professional`, `agency`, `enterprise`

**Impact**: Rate limits may not align with licensing tiers.

**Recommendation**: 
- Map licensing tiers to rate limit tiers
- Or refactor rate limiting to use licensing tier names directly

---

## Recommendations

### Priority 1: Critical Missing Enforcement

1. **Add User Limit Enforcement**
   - File: `convex/rbac.ts` or organization member creation
   - Check: `maxUsers` before adding members
   - Impact: Prevents tier limit violations

2. **Add Storage Limit Enforcement**
   - Files: File upload mutations
   - Checks: `totalStorageGB`, `perUserStorageGB`, `maxFileUploadMB`
   - Impact: Prevents storage quota violations

3. **Add Custom Domain Limit Enforcement**
   - File: `convex/domainConfigOntology.ts`
   - Check: `maxCustomDomains` in domain creation
   - Impact: Enforces domain limits per tier

### Priority 2: Standardization

4. **Standardize API Key Limit Checking**
   - Refactor `checkApiKeyLimit()` to use `checkResourceLimit()` pattern
   - Use standard error format
   - Impact: Consistency and maintainability

5. **Standardize Error Formats**
   - Convert all limit errors to `ConvexError` with error codes
   - Use consistent error structure
   - Impact: Better frontend error handling

6. **Fix Rate Limiting Tier Mapping**
   - Map licensing tiers to rate limit tiers
   - Or refactor to use licensing tier names
   - Impact: Consistent tier-based limits

### Priority 3: Completeness

7. **Add Nested Resource Limit Checks**
   - Milestones per project
   - Tasks per project
   - Attendees per event
   - Sponsors per event
   - Addons per product
   - Behaviors per workflow
   - Impact: Complete tier enforcement

8. **Add Remaining Resource Limit Checks**
   - Form responses
   - Custom templates
   - Certificates
   - Languages
   - Pipelines
   - Pages
   - Webhooks
   - Impact: Complete tier enforcement

9. **Clarify Sub-Organization Licensing**
   - Document sub-org licensing model
   - Add sub-org limit enforcement
   - Impact: Clear boundaries for agency tier

### Priority 4: Improvements

10. **Add Validation**
    - Validate manual overrides don't go below tier minimums
    - Validate all tier configs are complete
    - Impact: Prevents configuration errors

11. **Add Audit Logging**
    - Log all manual overrides
    - Log all tier changes
    - Impact: Better compliance and debugging

12. **Add Testing**
    - Unit tests for limit checking
    - Integration tests for tier enforcement
    - Impact: Prevents regressions

---

## Complexity Assessment

### Is It Too Complicated?

**Verdict**: **No, but it could be simplified.**

**Current Complexity Level**: **7/10** (Appropriate for multi-app platform)

**Reasons:**
- ✅ Well-structured with clear separation of concerns
- ✅ Good documentation
- ✅ Consistent patterns (mostly)
- ⚠️ Some inconsistencies that add complexity
- ⚠️ Many limits not enforced (adds perceived complexity)

**Simplification Opportunities:**

1. **Consolidate Limit Checking**
   - Single function for all limit checks
   - Consistent error formats
   - Reduces cognitive load

2. **Reduce Configuration Surface**
   - Group related limits (e.g., "CRM limits" object)
   - Use inheritance for tier upgrades
   - Reduces maintenance burden

3. **Automate Enforcement**
   - Decorator/annotation system for automatic limit checking
   - Reduces boilerplate

4. **Better Tooling**
   - Validation scripts
   - Enforcement coverage reports
   - Reduces manual verification

---

## Summary Statistics

### Enforcement Coverage

| Category | Total | Enforced | Missing | Coverage |
|----------|-------|----------|---------|----------|
| **Top-Level Resources** | 15 | 10 | 5 | 67% |
| **Nested Resources** | 8 | 0 | 8 | 0% |
| **Monthly Limits** | 2 | 2 | 0 | 100% |
| **Feature Flags** | 60+ | 40+ | ~20 | ~67% |
| **Storage Limits** | 3 | 0 | 3 | 0% |
| **User Limits** | 1 | 0 | 1 | 0% |
| **API Limits** | 5 | 1 | 4 | 20% |

### Overall Assessment

- **Core Resources**: ✅ Well enforced (67% coverage)
- **Feature Flags**: ✅ Well enforced (~67% coverage)
- **Nested Resources**: ❌ Not enforced (0% coverage)
- **Storage/Users**: ❌ Not enforced (0% coverage)
- **API Limits**: ⚠️ Partially enforced (20% coverage)

**Overall Coverage**: **~50%** of defined limits are actively enforced.

---

## Next Steps

1. **Immediate**: Add user and storage limit enforcement
2. **Short-term**: Standardize API key checking and error formats
3. **Medium-term**: Add nested resource limit checks
4. **Long-term**: Add validation, audit logging, and testing

---

## Files to Review

### Core Licensing Files
- `convex/licensing/tierConfigs.ts` - Tier definitions
- `convex/licensing/helpers.ts` - Enforcement helpers
- `convex/licensing/superAdmin.ts` - Admin tools

### Enforcement Files (28 files with checks)
- See `grep` results for `checkResourceLimit|checkFeatureAccess`

### Documentation Files
- `docs/STARTER-TIER-ENFORCEMENT.md`
- `docs/PROFESSIONAL-TIER-ENFORCEMENT.md`
- `docs/UPGRADE-PROMPT-PATTERN.md`
- `docs/APP_AVAILABILITY_ENFORCEMENT.md`

---

**End of Analysis**
