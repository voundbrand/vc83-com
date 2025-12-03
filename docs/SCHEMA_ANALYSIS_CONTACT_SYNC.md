# Database Schema Analysis: Contact Sync & Bulk Email

**Date:** 2025-12-02
**Analyst:** Code Analyzer Agent
**Task:** Schema design for AI-powered contact sync and bulk communication tools

---

## Executive Summary

The AI Contact Sync Tool requires two new tables in the Convex schema:

1. **contactSyncs** - Audit trail for contact synchronization operations
2. **emailCampaigns** - Bulk email campaign tracking and analytics

Both tables integrate seamlessly with existing systems:
- OAuth connections (Microsoft/Google)
- Organizations and users
- CRM ontology system (objects table for contacts)
- AI billing and usage tracking

---

## Schema Design

### 1. contactSyncs Table

**Purpose:** Track all contact synchronization operations from external providers (Microsoft/Google) to internal CRM.

**Key Features:**
- Audit trail of all sync operations
- Preview data storage for three-pane UI workflow
- Statistics tracking (created, updated, skipped, failed)
- Links to OAuth connections for provider integration

**Integration Points:**
- `organizationId` → links to organizations table
- `userId` → links to users table (who initiated sync)
- `connectionId` → links to oauthConnections table
- Contact data syncs to `objects` table (type="contact", subtype="customer")

**Indexes:**
- `by_org_user` - Query sync history per user in organization
- `by_organization` - All syncs for an organization
- `by_status` - Filter by sync status (preview/executing/completed/failed)
- `by_provider` - Filter by provider (Microsoft/Google)

### 2. emailCampaigns Table

**Purpose:** Track bulk email campaigns sent to CRM contacts/organizations.

**Key Features:**
- Campaign metadata (name, status, target criteria)
- Analytics tracking (sent, failed, opened, clicked)
- AI cost tracking (integrates with aiBillingSchemas)
- Links to CRM query criteria (pipeline, tags, contact IDs)

**Integration Points:**
- `organizationId` → links to organizations table
- `userId` → links to users table (campaign creator)
- `targetCriteria` → references objects table (CRM contacts/orgs)
- `totalCost` → tracked in aiUsage table

**Indexes:**
- `by_org` - All campaigns for organization
- `by_user` - Campaigns created by user
- `by_status` - Filter by campaign status
- `by_org_status` - Org campaigns filtered by status

---

## Data Flow Architecture

### Contact Sync Flow
```
External Provider (Microsoft/Google)
  ↓ [OAuth Token from oauthConnections]
Fetch contacts via API
  ↓
contactSyncs table (status: preview, previewData: {...})
  ↓ [User reviews in 3-pane UI]
contactSyncs table (status: executing)
  ↓
Create/update in objects table (type="contact")
  ↓
contactSyncs table (status: completed, stats: {...})
```

### Bulk Email Flow
```
CRM Query (pipeline/tags/contactIds)
  ↓
Query objects table (type="contact")
  ↓
emailCampaigns table (status: draft, targetCriteria: {...})
  ↓ [AI generates personalized emails]
aiUsage table (track LLM costs)
  ↓ [User reviews in 3-pane UI]
emailCampaigns table (status: sending)
  ↓
Send via Microsoft Graph (oauthConnections)
  ↓
emailCampaigns table (status: completed, stats: {...})
  ↓
objectActions table (record email sent actions per contact)
```

---

## Schema Changes Required

### File: `convex/schema.ts`

**Location:** After AI schemas, before storage schemas

**Changes:**
1. Import new schemas from `convex/schemas/contactSyncSchemas.ts`
2. Add `contactSyncs` to schema export
3. Add `emailCampaigns` to schema export

### New File: `convex/schemas/contactSyncSchemas.ts`

**Purpose:** Modular schema definitions for contact sync and bulk email features.

**Exports:**
- `contactSyncs` table definition
- `emailCampaigns` table definition

---

## Index Strategy

### Performance Considerations

**contactSyncs:**
- Most common query: "Show my recent syncs" → `by_org_user` + `createdAt` desc
- Admin view: "All syncs for organization" → `by_organization`
- Monitoring: "Active syncs" → `by_status` where status = "executing"
- Provider-specific: "Microsoft syncs only" → `by_provider`

**emailCampaigns:**
- Most common query: "My campaigns" → `by_user` + `createdAt` desc
- Dashboard: "Active campaigns" → `by_org_status` where status = "sending"
- Analytics: "All completed campaigns" → `by_org_status` where status = "completed"
- Monitoring: "Failed campaigns" → `by_status` where status = "failed"

### Query Patterns

```typescript
// Get user's recent syncs
ctx.db.query("contactSyncs")
  .withIndex("by_org_user", q => q.eq("organizationId", orgId).eq("userId", userId))
  .order("desc")
  .take(10);

// Get active campaigns for organization
ctx.db.query("emailCampaigns")
  .withIndex("by_org_status", q => q.eq("organizationId", orgId).eq("status", "sending"))
  .collect();

// Get all syncs from Microsoft for organization
ctx.db.query("contactSyncs")
  .withIndex("by_provider", q => q.eq("organizationId", orgId).eq("provider", "microsoft"))
  .collect();
```

---

## Migration Strategy

### Phase 1: Schema Addition (No Breaking Changes)
1. Add new schemas to `convex/schemas/contactSyncSchemas.ts`
2. Import and register in `convex/schema.ts`
3. Deploy schema changes (Convex auto-migrates)
4. No existing data affected

### Phase 2: Feature Implementation
1. Create `convex/ai/tools/contactSyncTool.ts`
2. Create `convex/ai/tools/bulkCRMEmailTool.ts`
3. Add queries/mutations for CRUD operations
4. Implement three-pane UI components

### Phase 3: Integration Testing
1. Test with real Microsoft OAuth connection
2. Sync 100+ contacts to verify performance
3. Send bulk emails to verify rate limiting
4. Monitor aiUsage table for cost tracking

---

## Security & Privacy Considerations

### Data Protection
- **Preview data:** Stored temporarily in `previewData` field (cleaned after sync)
- **OAuth tokens:** Already encrypted in `oauthConnections` table
- **Email content:** Not stored permanently (only in preview phase)
- **Audit trail:** All operations logged in `contactSyncs` and `emailCampaigns`

### Access Control
- Organization-scoped: All queries filtered by `organizationId`
- User-scoped: Users only see their own syncs/campaigns (unless admin)
- OAuth-scoped: Only access contacts/email with valid OAuth token

### GDPR Compliance
- **Right to deletion:** Can delete `contactSyncs` records
- **Data minimization:** Only store necessary audit data
- **Purpose limitation:** Preview data cleared after sync completion

---

## Performance Estimates

### Storage Impact
- **contactSyncs:** ~2-5 KB per sync record
- **emailCampaigns:** ~1-3 KB per campaign record
- **objects (contacts):** ~1 KB per contact

### Query Performance
- **Recent syncs:** <10ms (indexed by org_user)
- **Campaign dashboard:** <20ms (indexed by org_status)
- **Sync history:** <50ms for 100 records

### Scalability
- **Expected volume:** 10-100 syncs per org per month
- **Expected volume:** 5-50 campaigns per org per month
- **Contact growth:** 100-10,000 contacts per org
- **Index maintenance:** Automatic (Convex handles)

---

## Recommendations

### Immediate Actions
1. ✅ Create `convex/schemas/contactSyncSchemas.ts` with table definitions
2. ✅ Update `convex/schema.ts` to import and register new tables
3. ✅ Add comprehensive indexes for common query patterns
4. ✅ Document schema in code comments

### Future Enhancements
1. Add `syncSchedules` table for automated syncs
2. Add `emailTemplates` table for reusable campaign templates
3. Add vector indexes for AI-powered contact matching
4. Add time-series indexes for analytics dashboards

### Monitoring
1. Track `contactSyncs` table size growth
2. Monitor query performance on indexes
3. Alert on failed syncs (status = "failed")
4. Track email campaign success rates

---

## Validation Checklist

- ✅ Schema follows existing patterns (coreSchemas, aiSchemas)
- ✅ All foreign keys reference existing tables
- ✅ Indexes cover common query patterns
- ✅ No breaking changes to existing data
- ✅ GDPR-compliant data retention
- ✅ Integrates with OAuth system
- ✅ Integrates with CRM ontology
- ✅ Integrates with AI billing
- ✅ Supports three-pane UI workflow
- ✅ Audit trail for all operations

---

## Next Steps

1. **Backend Developer:** Implement schema files
2. **Backend Developer:** Create CRUD operations
3. **Frontend Developer:** Build three-pane UI components
4. **QA:** Integration testing with OAuth providers
5. **DevOps:** Monitor schema migration in production

---

**Status:** ✅ Analysis Complete - Ready for Implementation
**Estimated Implementation Time:** 2-3 hours (schema + basic CRUD)
**Risk Level:** Low (additive changes only, no existing data affected)
