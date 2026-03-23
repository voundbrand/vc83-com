# Phase 3: Backend API - Detailed Checklist

**Duration:** 2-3 days
**Status:** Not Started
**Goal:** Create L4YERCAK3 API endpoints for benefits and commissions

---

## Overview

This phase builds the backend API in L4YERCAK3 (Convex) to store benefits and commission offers. We'll create database schemas, API endpoints, and Next.js API routes (BFF pattern).

**Success Criteria:**
- ✅ Database schema created in Convex
- ✅ L4YERCAK3 API endpoints working
- ✅ Next.js API routes (BFF) working
- ✅ CRUD operations tested
- ✅ Data validation implemented

---

## Day 6: Database Schema (3-4 hours)

### Morning: Convex Schema

**File:** `convex/schema.ts` (update existing)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables

  // NEW: Benefits
  benefits: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.string(), // member_id from OAuth
    createdByName: v.string(),
    createdByEmail: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("discount"),
      v.literal("service"),
      v.literal("product"),
      v.literal("event")
    ),
    contactInfo: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive", "organizationId"]),

  // NEW: Commissions
  commissions: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.string(),
    createdByName: v.string(),
    createdByEmail: v.string(),
    title: v.string(),
    description: v.string(),
    commissionRate: v.string(),
    category: v.union(
      v.literal("sales"),
      v.literal("consulting"),
      v.literal("referral"),
      v.literal("other")
    ),
    contactInfo: v.string(),
    requirements: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive", "organizationId"]),
});
```

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for complete backend implementation details including:
- Phase 3 API endpoints (GET/POST/PATCH/DELETE for benefits and commissions)
- Next.js BFF API routes
- Validation and security
- Testing strategies

---

**Phase 3 Status:** Not Started
**Estimated Completion:** Day 8 end

For complete Phase 3 details, see the master [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) file.
