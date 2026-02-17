# Unimplemented Licensed Features & Sub-Organization Documentation

**Date**: 2025-01-27  
**Status**: Analysis of features defined in licensing system but not yet implemented

## Executive Summary

The licensing system defines **48 feature flags** and **86 resource limits**. Most features are implemented and enforced, but there are several features that are **defined in tier configs but not yet built or enforced**.

---

## 1. Sub-Organizations (NOT IMPLEMENTED)

### Status: ❌ **Not Implemented**

**Definition:**
- Sub-organizations allow Agency/Enterprise tier customers to create separate client workspaces
- Each sub-org gets its own isolated data, settings, and branding
- Pricing: €79/month per sub-org (in addition to base Agency tier €599/month)

**What's Defined:**
- ✅ `maxSubOrganizations` limit in tier configs:
  - Free: 0
  - Starter: 0
  - Professional: 0
  - Agency: 2 (included), +€79/each additional, max 20
  - Enterprise: Unlimited
- ✅ `subOrgsEnabled` feature flag:
  - Free/Starter/Professional: `false`
  - Agency/Enterprise: `true`
- ✅ Stripe product configured (`prod_agency_sub_org`)
- ✅ Pricing documented (€79/month, €790/year)

**What's Missing:**
- ❌ No database schema for sub-organization relationships
  - Organizations table doesn't have `parentOrganizationId` field
  - No way to link organizations as parent/child
- ❌ No UI for creating/managing sub-organizations
- ❌ No enforcement of `subOrgsEnabled` feature flag
- ❌ No enforcement of `maxSubOrganizations` limit
- ❌ No billing integration for sub-org add-ons
- ❌ No data isolation logic between parent and sub-orgs
- ❌ Usage stats return hardcoded `subOrganizationsCount = 0`

**Current Code References:**
- `convex/licensing/helpers.ts:916` - Hardcoded count: `const subOrganizationsCount = 0;`
- `convex/licensing/helpers.ts:855` - Feature tier mapping exists but never checked
- `docs/pricing-and-trials/STRIPE-CONFIGURATION.md:445` - Stripe product configured

**Recommendation:**
This is a **major feature** that requires:
1. Database schema changes (add `parentOrganizationId` to organizations table)
2. Complete UI for sub-org management
3. Billing integration with Stripe
4. Data isolation and access control
5. Limit enforcement in organization creation

**Estimated Effort:** Large (2-3 weeks)

---

## 2. Features Defined But Not Enforced

### Status: ⚠️ **Partially Implemented**

These features are defined in tier configs and may have some UI, but **lack enforcement checks**:

#### 2.1. Budget Tracking (`budgetTrackingEnabled`)
- **Status**: ✅ Enforced in `projectOntology.ts:280`
- **Tier**: Starter+ (Free: false)
- **Enforcement**: ✅ Checked when creating/updating project budgets

#### 2.2. Advanced Reports (`advancedReportsEnabled`)
- **Status**: ✅ Enforced in `projectAnalytics.ts`
- **Tier**: Professional+ (Free/Starter: false)
- **Enforcement**: ✅ Checked in analytics queries

#### 2.3. Media Gallery (`mediaGalleryEnabled`)
- **Status**: ✅ Enforced in `eventOntology.ts:791, 1092`
- **Tier**: Starter+ (Free: false)
- **Enforcement**: ✅ Checked when uploading event media

#### 2.4. Event Analytics (`eventAnalyticsEnabled`)
- **Status**: ✅ Enforced in `eventOntology.ts:1097`
- **Tier**: Professional+ (Free/Starter: false)
- **Enforcement**: ✅ Checked in event analytics queries

#### 2.5. Inventory Tracking (`inventoryTrackingEnabled`)
- **Status**: ✅ Enforced in `productOntology.ts:472`
- **Tier**: Starter+ (Free: false)
- **Enforcement**: ✅ Checked when managing product inventory

#### 2.6. B2B Invoicing (`b2bInvoicingEnabled`)
- **Status**: ✅ Enforced in `productOntology.ts:517`
- **Tier**: Starter+ (Free: false)
- **Enforcement**: ✅ Checked when creating B2B invoices

#### 2.7. Multi-Step Forms (`multiStepFormsEnabled`)
- **Status**: ✅ Enforced in `formsOntology.ts:376`
- **Tier**: Starter+ (Free: false)
- **Enforcement**: ✅ Checked when creating multi-step forms

#### 2.8. Conditional Logic (`conditionalLogicEnabled`)
- **Status**: ✅ Enforced in `formsOntology.ts:385`
- **Tier**: Starter+ (Free: false)
- **Enforcement**: ✅ Checked when adding conditional logic to forms

#### 2.9. Form Analytics (`formAnalyticsEnabled`)
- **Status**: ✅ Enforced in `formsOntology.ts:676`
- **Tier**: Professional+ (Free/Starter: false)
- **Enforcement**: ✅ Checked in form analytics queries

#### 2.10. SEO Tools (`seoToolsEnabled`)
- **Status**: ✅ Enforced in `publishingOntology.ts:133, 535`
- **Tier**: Professional+ (Free/Starter: false)
- **Enforcement**: ✅ Checked when managing SEO settings

#### 2.11. Content Rules (`contentRulesEnabled`)
- **Status**: ✅ Enforced in `publishingOntology.ts:461`
- **Tier**: Professional+ (Free/Starter: false)
- **Enforcement**: ✅ Checked when managing content rules

#### 2.12. Page Analytics (`pageAnalyticsEnabled`)
- **Status**: ✅ Enforced in `pageAnalytics.ts`
- **Tier**: Professional+ (Free/Starter: false)
- **Enforcement**: ✅ Checked in page analytics queries

---

## 3. Features That May Not Be Fully Implemented

### Status: ⚠️ **Needs Verification**

These features are defined but may not have complete implementations:

#### 3.1. Contact Sync (`contactSyncEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ✅ Enforced in `convex/ai/tools/contactSyncTool.ts:241`
- **Enforcement**: ✅ Checked when using AI contact sync tool

#### 3.2. Template Versioning (`templateVersioningEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if template versioning system exists

#### 3.3. Cloud Integration (`cloudIntegrationEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if cloud storage integrations exist

#### 3.4. Auto Translation (`autoTranslationEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if automatic translation feature exists

#### 3.5. SSO (`ssoEnabled`)
- **Tier**: Enterprise only
- **Status**: ⚠️ Needs verification
- **Action**: Check if SSO implementation exists

#### 3.6. GDPR Tools (`gdprToolsEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if GDPR compliance tools exist

#### 3.7. Cookie Consent (`cookieConsentEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if cookie consent management exists

#### 3.8. Privacy Policy Generator (`privacyPolicyGeneratorEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if privacy policy generator exists

#### 3.9. Terms Generator (`termsGeneratorEnabled`)
- **Tier**: Professional+ (Free/Starter: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if terms generator exists

#### 3.10. Deployment Integrations (`deploymentIntegrationsEnabled`)
- **Tier**: Starter+ (Free: false)
- **Status**: ⚠️ Needs verification
- **Action**: Check if GitHub/Vercel deployment integrations exist

---

## 4. Summary

### Fully Implemented & Enforced: ✅
- Budget Tracking
- Advanced Reports
- Media Gallery
- Event Analytics
- Inventory Tracking
- B2B Invoicing
- Multi-Step Forms
- Conditional Logic
- Form Analytics
- SEO Tools
- Content Rules
- Page Analytics
- Contact Sync (AI tool)

### Not Implemented: ❌
- **Sub-Organizations** (major feature, requires significant work)

### Needs Verification: ⚠️
- Template Versioning
- Cloud Integration
- Auto Translation
- SSO
- GDPR Tools
- Cookie Consent
- Privacy Policy Generator
- Terms Generator
- Deployment Integrations (GitHub/Vercel)
- Vercel Deployment (separate from deploymentIntegrationsEnabled)

---

## 5. Recommendations

### Priority 1: Document Sub-Organization Model
1. **Design the data model:**
   - Add `parentOrganizationId?: Id<"organizations">` to organizations table
   - Add `isSubOrganization: boolean` flag
   - Consider `subOrganizationSettings` for isolation rules

2. **Define licensing model:**
   - Do sub-orgs inherit parent's license or have separate licenses?
   - How do limits apply? (shared pool vs. separate limits)
   - Can sub-orgs have different tiers than parent?

3. **Plan enforcement:**
   - Check `subOrgsEnabled` before allowing sub-org creation
   - Enforce `maxSubOrganizations` limit
   - Handle billing for sub-org add-ons

### Priority 2: Verify Unimplemented Features
1. Search codebase for each feature listed in "Needs Verification"
2. If found but not enforced, add `checkFeatureAccess()` calls
3. If not found, either:
   - Remove from tier configs (if not planned)
   - Add to product roadmap (if planned)

### Priority 3: Clean Up Tier Configs
1. Remove features that are not planned for implementation
2. Add TODO comments for features that are planned but not yet built
3. Ensure all implemented features have enforcement checks

---

## 6. Next Steps

1. **Review this document** with product team
2. **Decide on sub-organization model** (inherit vs. separate licenses)
3. **Verify each "Needs Verification" feature** - implement or remove
4. **Create implementation plan** for sub-organizations if proceeding
5. **Update tier configs** to reflect actual feature availability

---

**Last Updated**: 2025-01-27  
**Next Review**: After sub-organization model decision
