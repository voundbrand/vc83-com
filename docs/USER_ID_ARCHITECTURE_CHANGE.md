# User ID Architecture Change - Impact Analysis

**Date**: 2025-01-18
**Status**: PLANNING - NOT YET IMPLEMENTED
**Related**: docs/FRONTEND_USER_ARCHITECTURE.md

---

## 🎯 Goal

Change the architecture so that **all customer-facing records** (tickets, contacts, transactions, form responses) link to `frontend_user` objects instead of platform `users`.

### Why This Change?

Currently we have a mismatch:
- ❌ Guest registrations create records with no valid `userId` (breaks validation)
- ❌ System user workarounds like `"k1system000000000000000000"` don't exist in DB
- ❌ When customers activate accounts later, their past data isn't linked to them

After this change:
- ✅ Guest registrations create dormant `frontend_user` → all records link to it
- ✅ When customer activates account (sets password), ALL their history is already linked
- ✅ Clean architecture: platform users manage, frontend users own data

---

## 📊 Current State

### Schema Fields (convex/schemas/ontologySchemas.ts)

**objects table** (line 48):
```typescript
createdBy: v.id("users"), // ❌ Required, expects platform user
```

**objectLinks table** (line 94):
```typescript
createdBy: v.optional(v.id("users")), // ✅ Already optional!
```

**objectActions table** (line 124):
```typescript
performedBy: v.id("users"), // ❌ Required, expects platform user
```

### Affected Mutation Arguments

Files with `userId: v.id("users")`:
- convex/ticketOntology.ts (line 217) - `userId: v.optional(v.id("users"))`
- convex/checkoutSessionOntology.ts
- convex/purchaseOntology.ts
- convex/certificateOntology.ts
- convex/accountManagement.ts

Files with `performedBy: v.id("users")`:
- convex/api/v1/crmInternal.ts (line 407) - ✅ Already made optional!
- convex/rbacHelpers.ts
- convex/crmIntegrations.ts
- convex/purchaseOntology.ts

Files with `createdBy: v.id("users")`:
- convex/workflows/behaviors/createFormResponse.ts (line 160)
- convex/testHelpers.ts
- convex/organizations.ts
- convex/organizationOntology.ts

---

## 🔄 Proposed Changes

### Option 1: Make All User Fields Accept Both Types (Union)

```typescript
// In schemas
createdBy: v.optional(v.union(v.id("users"), v.id("objects"))),
performedBy: v.optional(v.union(v.id("users"), v.id("objects"))),

// In mutations
userId: v.optional(v.union(v.id("users"), v.id("objects"))),
```

**Pros:**
- ✅ Backwards compatible
- ✅ Supports both platform users and frontend users

**Cons:**
- ❌ Union types are architecturally messy
- ❌ Unclear which type is which without checking
- ❌ More complex queries (need to check both)

### Option 2: Frontend Users Only (RECOMMENDED)

```typescript
// In schemas
createdBy: v.optional(v.id("objects")), // Always frontend_user
performedBy: v.optional(v.id("objects")), // Always frontend_user

// In mutations
userId: v.optional(v.id("objects")), // Always frontend_user
```

**Pros:**
- ✅ Clean architecture: one user type for customer data
- ✅ Simpler TypeScript, no unions
- ✅ Forces proper separation: platform users manage, frontend users own

**Cons:**
- ❌ **BREAKING CHANGE** - requires migration
- ❌ Platform admins creating tickets must select a frontend_user
- ❌ Existing data may have platform user IDs in these fields

### Option 3: Hybrid Approach (Keep Both Systems)

Keep current schema but:
- Make all user ID fields **optional**
- Add new fields: `frontendUserId: v.optional(v.id("objects"))`
- Gradually migrate to using `frontendUserId`

**Pros:**
- ✅ Non-breaking, gradual migration
- ✅ Supports both systems during transition

**Cons:**
- ❌ Technical debt: two fields for same purpose
- ❌ Confusion about which field to use

---

## 🔍 Impact Assessment

### 1. Database Schema Changes

**High Impact:**
- `convex/schemas/ontologySchemas.ts` - objects table `createdBy` field
- `convex/schemas/ontologySchemas.ts` - objectActions table `performedBy` field

**Low Impact:**
- `convex/schemas/ontologySchemas.ts` - objectLinks table (already optional)

### 2. Internal Mutations

**Already Updated:**
- ✅ `convex/api/v1/crmInternal.ts` - `createContactInternal` (performedBy optional)

**Need Updates:**
- `convex/ticketOntology.ts` - `createTicketInternal` (line 217)
- `convex/workflows/behaviors/createFormResponse.ts` - `createFormResponseInternal` (line 37)
- `convex/checkoutSessionOntology.ts` - checkout mutations
- `convex/purchaseOntology.ts` - purchase mutations
- `convex/certificateOntology.ts` - certificate mutations

### 3. Workflow Behaviors

**Already Updated:**
- ✅ `convex/workflows/behaviors/createContact.ts` - creates frontend_user first
- ✅ `convex/workflows/behaviors/calculatePricing.ts` - handles addon IDs

**Need Updates:**
- `convex/workflows/behaviors/createTicket.ts` - use frontendUserId
- `convex/workflows/behaviors/createFormResponse.ts` - use frontendUserId
- `convex/workflows/behaviors/createTransaction.ts` - use frontendUserId
- `convex/workflows/behaviors/updateStatistics.ts` - handle addon IDs

### 4. Frontend/API Impact

**Low Impact:**
- Frontend doesn't directly pass user IDs
- Workflow API receives data, creates frontend_user automatically
- No breaking changes to API contracts

### 5. Existing Data Migration

**Questions to Answer:**
1. Are there existing tickets/contacts with `createdBy` = platform user ID?
2. Do we need to migrate them to frontend_users?
3. Can we leave historical data as-is?

---

## 📝 Recommended Approach

### Phase 1: Minimal Changes (Current Workflow Fix)

**Goal**: Get guest registration working WITHOUT breaking existing code

**Changes:**
1. ✅ Create `createOrGetGuestUser` mutation (DONE)
2. ✅ Make `performedBy` optional in `createContactInternal` (DONE)
3. ✅ Update `create-contact` behavior to create frontend_user (DONE)
4. Make `userId` optional in `createTicketInternal` (**IN PROGRESS**)
5. Make `createdBy` optional in `createFormResponseInternal`
6. Update workflow behaviors to pass `frontendUserId` in context
7. Store `frontendUserId` in **customProperties** (not schema fields yet)

**Schema Changes:**
```typescript
// NO SCHEMA CHANGES YET - just make existing fields optional
performedBy: v.optional(v.id("users")), // Allow undefined
userId: v.optional(v.id("users")),      // Allow undefined
createdBy: v.optional(v.id("users")),   // Allow undefined (objectLinks already optional)
```

**Data Storage Pattern:**
```typescript
// Tickets, contacts, etc.
{
  createdBy: undefined, // Guest registration - no platform user
  customProperties: {
    frontendUserId: "k9abc123...", // Link to dormant account
    // ... other data
  }
}
```

**Pros:**
- ✅ Minimal breaking changes
- ✅ Workflow fixed immediately
- ✅ Preserves existing data structure
- ✅ Can migrate to proper schema later

**Cons:**
- ❌ `frontendUserId` in customProperties instead of proper field
- ❌ Still have platform user ID fields (unused for guests)

---

### Phase 2: Proper Architecture (Future)

**Goal**: Clean up architecture, use proper schema fields

**Changes:**
1. Change schema to accept `Id<"objects">` for user fields
2. Migrate `frontendUserId` from customProperties to proper field
3. Update all queries/mutations to use new field
4. Migrate existing data (if any)

**Timeline**: After Phase 1 is stable and tested

---

## ✅ Recommendation: Start with Phase 1

**Decision**: Use **Phase 1 (Minimal Changes)** approach

**Reasoning:**
1. Gets workflow working immediately
2. Non-breaking to existing code
3. Allows testing before major schema changes
4. Can migrate to Phase 2 when stable

**Next Steps:**
1. Finish current workflow behavior updates
2. Store `frontendUserId` in customProperties
3. Test guest registration end-to-end
4. Review results before considering Phase 2

---

## 🚧 Open Questions

1. **Existing Tickets**: Do any exist with platform user IDs in `createdBy`?
2. **Admin-Created Tickets**: How should admins create tickets for customers?
   - Should admin UI select a frontend_user?
   - Or auto-create frontend_user from customer email?
3. **Historical Data**: Keep as-is or migrate?
4. **Performance**: Any query performance issues with optional fields?

---

## 📚 Related Documentation

- [Frontend User Architecture](./FRONTEND_USER_ARCHITECTURE.md)
- [Event Management Architecture](./EVENT_MANAGEMENT_ARCHITECTURE.md)
- [RBAC Complete Guide](./RBAC_COMPLETE_GUIDE.md)

---

Last Updated: 2025-01-18
Status: PLANNING PHASE - Awaiting approval for Phase 1 implementation
