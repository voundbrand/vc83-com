# Continuation Prompt: Licensing System Improvements

## Context

We've been working through a comprehensive analysis and improvement of the licensing system. We completed Priority 1 (Critical Missing Enforcement) and Priority 2 (Standardization). The system is now more consistent and properly enforces user, storage, and domain limits.

## What We've Completed

### ✅ Priority 1: Critical Missing Enforcement (COMPLETE)

1. **User Limit Enforcement** ✅
   - Added `maxUsers` limit checks in:
     - `convex/organizations.ts` - `addUserToOrganization()` internal mutation
     - `convex/invitationOntology.ts` - `internalAcceptInvitation()` mutation
   - Both check current user count before adding members
   - Standardized error messages with upgrade prompts

2. **Storage Limit Enforcement** ✅
   - Refactored `convex/organizationMedia.ts` to use licensing system
   - Removed hardcoded `STORAGE_QUOTAS` based on deprecated `org.plan`
   - Now uses `getLicenseInternal()` to get `totalStorageGB` from tier configs
   - Added `maxFileUploadMB` enforcement in `generateUploadUrl()`
   - Updated `totalStorageGB` checks in all upload paths
   - Standardized error messages

3. **Custom Domain Limit Standardization** ✅
   - Updated `convex/domainConfigOntology.ts` to use consistent error format
   - Improved error message consistency
   - Uses same tier upgrade path mapping

### ✅ Priority 2: Standardization (COMPLETE)

1. **API Key Limit Standardization** ✅
   - Updated `convex/apiKeysInternal.ts` to match `checkResourceLimit()` pattern
   - Standardized error message format
   - Uses same tier upgrade path mapping

2. **Error Format Standardization** ✅
   - `checkResourceLimit()` now throws `ConvexError` with `LIMIT_EXCEEDED` code
   - `checkMonthlyResourceLimit()` now throws `ConvexError` with `LIMIT_EXCEEDED` code
   - Both include structured error data (limitKey, currentCount, limit, planTier, nextTier)
   - Matches pattern used by `checkFeatureAccess()` (`FEATURE_LOCKED`)

3. **Rate Limiting Tier Mapping** ✅
   - Updated `convex/middleware/rateLimit.ts` to use licensing tier names
   - `RATE_LIMITS` now uses: `free`, `starter`, `professional`, `agency`, `enterprise`
   - Values aligned with `rateLimitPerMinute` and `rateLimitPerDay` from tier configs
   - `getRateLimitPlan()` updated with backward compatibility

## ✅ Priority 3: Completeness (NEARLY COMPLETE - 95%)

### ✅ 1. Nested Resource Limits (COMPLETE - 7/8 resources)
- ✅ `maxMilestonesPerProject` - Added in `projectOntology.ts` and `internalToolMutations.ts`
- ✅ `maxTasksPerProject` - Added in `projectOntology.ts` and `internalToolMutations.ts`
- ✅ `maxAttendeesPerEvent` - Added in `crmIntegrations.ts` (createContactFromEvent)
- ✅ `maxSponsorsPerEvent` - Added in `eventOntology.ts` (linkSponsorToEvent)
- ✅ `maxAddonsPerProduct` - Added in `productOntology.ts` (updateProduct)
- ✅ `maxBehaviorsPerWorkflow` - Added in `workflowOntology.ts` (createWorkflow, updateWorkflow)
- ✅ `maxResponsesPerForm` - Added in `formsOntology.ts` (createFormResponse, createPublicFormResponse)

### ✅ 2. Remaining Resource Limits (COMPLETE - 6/6 resources)
- ✅ `maxCustomTemplates` - Added in `templateOntology.ts` (createCustomTemplate)
- ✅ `maxCertificates` - Added in `certificateOntology.ts` (createCertificateInternal)
- ✅ `maxPipelines` - Added in `crmPipeline.ts` (createPipeline)
- ✅ `maxPages` - Added in `publishingOntology.ts` (createPublishedPage)
- ✅ `maxWebhooks` - Added in `zapier/webhooks.ts` (subscribeWebhook)
- ✅ `maxWebsitesPerKey` - Added in `domainConfigOntology.ts` (createDomainConfig, updateDomainConfig) - checks when domain configs link to API keys
- ❌ `maxLanguages` - **REMOVED** - Languages are now unlimited for all tiers (not a licensable feature)

### ⏳ 3. Sub-Organization Licensing (PENDING)
- Document sub-organization licensing model
- Add sub-organization limit enforcement
- Clarify how limits apply to sub-organizations (inherit parent? separate license?)

## Files Modified (So Far)

### Backend Files:
- `convex/organizations.ts` - Added user limit enforcement
- `convex/invitationOntology.ts` - Added user limit enforcement
- `convex/organizationMedia.ts` - Refactored storage limits to use licensing system
- `convex/domainConfigOntology.ts` - Standardized domain limit error format
- `convex/apiKeysInternal.ts` - Standardized API key limit checking
- `convex/licensing/helpers.ts` - Added `checkNestedResourceLimit()` helper function, standardized error formats
- `convex/middleware/rateLimit.ts` - Fixed tier mapping to match licensing tiers
- `convex/projectOntology.ts` - Added milestone and task limit checks
- `convex/ai/tools/internalToolMutations.ts` - Added milestone and task limit checks for AI tools
- `convex/eventOntology.ts` - Added sponsor limit checks
- `convex/crmIntegrations.ts` - Added attendee limit checks
- `convex/productOntology.ts` - Added addon limit checks
- `convex/workflows/workflowOntology.ts` - Added behavior limit checks
- `convex/formsOntology.ts` - Added form response limit checks
- `convex/templateOntology.ts` - Added custom template limit checks
- `convex/certificateOntology.ts` - Added certificate limit checks
- `convex/crmPipeline.ts` - Added pipeline limit checks
- `convex/publishingOntology.ts` - Added page limit checks
- `convex/zapier/webhooks.ts` - Added webhook limit checks
- `convex/domainConfigOntology.ts` - Added `maxWebsitesPerKey` limit check when domain configs link to API keys
- `convex/apiKeysInternal.ts` - Added `checkWebsitesPerKeyLimit()` helper (for future API key update mutation)

### Frontend Files:
- `src/components/licensing/license-overview.tsx` - Enhanced to support editing limits when `editable={true}`
- `src/components/licensing/limit-category.tsx` - Added `editable` and `onLimitChange` props
- `src/components/licensing/usage-bar.tsx` - Added inline editing UI for limits (edit button, input field, save/cancel)

### Documentation:
- `docs/LICENSING-SYSTEM-ANALYSIS.md` - Complete analysis document

## Key Patterns Established

### Standard Limit Check Pattern:
```typescript
import { checkResourceLimit } from "./licensing/helpers";

await checkResourceLimit(
  ctx,
  organizationId,
  "resource_type",      // e.g., "crm_contact", "project"
  "maxResourceLimit"    // e.g., "maxContacts", "maxProjects"
);
```

### Standard Monthly Limit Check Pattern:
```typescript
import { checkMonthlyResourceLimit } from "./licensing/helpers";

await checkMonthlyResourceLimit(
  ctx,
  organizationId,
  "resource_type",
  "maxResourceLimitPerMonth"
);
```

### Standard Nested Resource Limit Check Pattern:
```typescript
import { checkNestedResourceLimit } from "./licensing/helpers";

await checkNestedResourceLimit(
  ctx,
  organizationId,
  parentId,              // e.g., projectId, eventId, productId, workflowId, formId
  "linkType",           // e.g., "has_milestone", "has_task", "registered_for", "sponsored_by"
  "maxResourceLimit"    // e.g., "maxMilestonesPerProject", "maxTasksPerProject"
);
```

### Standard Feature Check Pattern:
```typescript
import { checkFeatureAccess } from "./licensing/helpers";

await checkFeatureAccess(ctx, organizationId, "featureFlagName");
```

### Error Handling:
All limit checks now throw `ConvexError` with structured data:
- `code`: "LIMIT_EXCEEDED" or "FEATURE_LOCKED"
- `limitKey`: The limit that was exceeded
- `currentCount`: Current usage
- `limit`: The limit value
- `planTier`: Current tier
- `nextTier`: Recommended upgrade tier

Frontend can parse these with `parseLimitError()` from `src/components/ui/upgrade-prompt.tsx`.

## Next Steps

1. **Continue with Priority 3**: Add nested resource limit checks
   - Start with milestones, tasks, attendees, sponsors, addons, behaviors
   - Each needs a check before creation in their respective ontology files

2. **Add remaining resource limit checks**:
   - Templates, certificates, languages, pipelines, pages, webhooks
   - Each needs a check in their creation mutations

3. **Clarify sub-organization licensing**:
   - Document how sub-orgs inherit or get separate licenses
   - Add enforcement for sub-organization creation limits

## Testing Checklist

For each new limit check added:
- [ ] Test with Free tier (should enforce limit)
- [ ] Test with Starter tier (should enforce limit)
- [ ] Test with Professional tier (should enforce limit)
- [ ] Test with Enterprise tier (should allow unlimited)
- [ ] Verify error message format matches standard pattern
- [ ] Verify frontend can parse error and show upgrade prompt

## Notes

- All changes pass TypeScript type checking ✅
- Error formats are now standardized ✅
- Rate limiting tiers now match licensing tiers ✅
- User and storage limits are now enforced ✅
- API key limits use standardized format ✅

The system is now **~98% complete** in terms of enforcement coverage. 

**Completed:**
- ✅ All nested resource limits (7/7)
- ✅ All remaining resource limits (6/6)
- ✅ Helper function for nested limits created
- ✅ Super admin UI enhanced for fine-tuning licensing
  - Can edit individual limit values inline
  - Can toggle features on/off
  - Can change plan tier
  - Uses `updateLicenseLimits` mutation for custom limit overrides
- ✅ Removed `maxLanguages` as a licensable feature - all languages available to everyone

**Remaining:**
- ⏳ Sub-organization licensing documentation and enforcement
- ⏳ Verify unimplemented features (see `docs/UNIMPLEMENTED-LICENSED-FEATURES.md`)

**Next Steps:**
1. Review `docs/UNIMPLEMENTED-LICENSED-FEATURES.md` for complete analysis
2. Document and implement sub-organization licensing model (if proceeding)
3. Verify and either implement or remove features listed as "Needs Verification"
4. Test super admin licensing UI end-to-end
