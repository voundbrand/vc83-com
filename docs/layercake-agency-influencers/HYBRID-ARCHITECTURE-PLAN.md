# RefRef + Benefits Ontology: Hybrid Architecture Plan

> How RefRef (external affiliate tracking) connects to Layer Cake's existing Benefits Ontology (internal commission system)

---

## System Comparison

| Aspect | RefRef | Benefits Ontology |
|--------|--------|-------------------|
| **Primary Use** | External affiliate tracking | Internal member-to-member value sharing |
| **Audience** | Influencers, agency owners, external partners | Organization members, CRM contacts |
| **Attribution** | Cookie-based (90-day), referral codes | Direct member links |
| **Commission Types** | Cash, discount | Sales, consulting, referral, partnership |
| **Workflow** | Auto-calculated on events | Claim → Approve → Redeem |
| **Payout** | Aggregated, batch payouts | Per-claim basis |
| **Database** | PostgreSQL (Drizzle) | Convex |

---

## The Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL WORLD                                     │
│                                                                              │
│   Influencer clicks link → Visitor → Signs up → Becomes Customer → Pays    │
│         ↓                                          ↓                 ↓      │
│    [Cookie Set]                              [User Created]    [Invoice Paid]│
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                         Stripe Webhook │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                              REFREF                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐                  │
│  │ Attribution │ →  │    Events    │ →  │    Rewards    │                  │
│  │   Tracking  │    │ (signup,     │    │ (40% of $599  │                  │
│  │  (cookies)  │    │  purchase)   │    │  = $239.60)   │                  │
│  └─────────────┘    └──────────────┘    └───────────────┘                  │
│                                                  │                          │
│                                          reward.created                     │
│                                                  ↓                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                                   │
                              ┌────────────────────┘
                              │  Webhook / Sync Job
                              ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│                         LAYER CAKE (Convex)                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Benefits Ontology                               │   │
│  │                                                                      │   │
│  │   ┌──────────────┐     objectLinks      ┌──────────────┐            │   │
│  │   │    Member    │ ←─earns_commission─→ │  Commission  │            │   │
│  │   │ (crm_contact)│                      │   (object)   │            │   │
│  │   │              │                      │              │            │   │
│  │   │ affiliateId: │                      │ subtype:     │            │   │
│  │   │ "refref_xxx" │                      │ "referral"   │            │   │
│  │   └──────────────┘                      │              │            │   │
│  │                                         │ source:      │            │   │
│  │                                         │ "refref"     │            │   │
│  │                                         │              │            │   │
│  │                                         │ refrefReward │            │   │
│  │                                         │ Id: "rwd_xx" │            │   │
│  │                                         └──────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Keep Separate (Now)

**What to build:**
- RefRef runs as separate service (`services/affiliate/`)
- RefRef tracks attribution, creates rewards
- No connection to Benefits Ontology yet
- Payouts handled manually or via PayPal batch

**Why:**
- Faster to ship
- RefRef is designed for this exact use case
- Benefits Ontology is for internal member value sharing

**Timeline:** 2-3 weeks

---

## Phase 2: Sync RefRef Affiliates to Convex (Later)

**What to build:**
- Create a `crm_contact` in Convex for each RefRef affiliate
- Store `refrefParticipantId` on the contact
- Benefits Ontology can now "see" affiliates

**How:**

```typescript
// convex/affiliateSync.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sync a RefRef affiliate to Convex as a CRM contact
 * Called via webhook when affiliate joins RefRef program
 */
export const syncAffiliateFromRefRef = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    refrefParticipantId: v.string(),
    email: v.string(),
    name: v.string(),
    refcode: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already synced
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.refrefParticipantId"), args.refrefParticipantId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new CRM contact for affiliate
    const contactId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: "affiliate", // New subtype for affiliates
      name: args.name,
      status: "active",
      customProperties: {
        email: args.email,
        refrefParticipantId: args.refrefParticipantId,
        refcode: args.refcode,
        affiliateSource: "refref",
        affiliateJoinedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return contactId;
  },
});
```

**Timeline:** After Phase 1 is stable

---

## Phase 3: Sync RefRef Rewards to Benefits Ontology (Future)

**What to build:**
- When RefRef creates a reward → create corresponding `commission` object in Convex
- Unified view of all commissions (internal referrals + external affiliates)
- Single payout system

**How:**

```typescript
// convex/commissionSync.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a commission object from a RefRef reward
 * Called via webhook when RefRef creates a reward
 */
export const createCommissionFromRefRef = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    refrefRewardId: v.string(),
    refrefParticipantId: v.string(),
    amount: v.number(),
    currency: v.string(),
    eventType: v.string(), // "purchase", "signup"
    eventMetadata: v.object({
      orderId: v.optional(v.string()),
      orderAmount: v.optional(v.number()),
      userId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Find the member (affiliate) by refref ID
    const member = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.refrefParticipantId"), args.refrefParticipantId)
      )
      .first();

    if (!member) {
      console.error(`Affiliate not found for refref ID: ${args.refrefParticipantId}`);
      return null;
    }

    // Check for duplicate (idempotency)
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "commission")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.refrefRewardId"), args.refrefRewardId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create the commission object
    const commissionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "commission",
      subtype: "referral", // Affiliate commissions are "referral" type
      name: `Affiliate Commission - ${args.eventType}`,
      description: `40% commission from ${args.eventType} event`,
      status: "active", // or "pending_disbursal"
      customProperties: {
        // RefRef tracking
        source: "refref",
        refrefRewardId: args.refrefRewardId,
        refrefParticipantId: args.refrefParticipantId,

        // Commission details
        amount: args.amount,
        currency: args.currency,
        commissionRate: 40, // 40%

        // Event context
        eventType: args.eventType,
        orderId: args.eventMetadata.orderId,
        orderAmount: args.eventMetadata.orderAmount,
        referredUserId: args.eventMetadata.userId,

        // Payout status
        payoutStatus: "pending",
        payoutId: null,
        paidAt: null,
      },
      createdBy: member._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create the earns_commission link
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: member._id,
      toObjectId: commissionId,
      linkType: "earns_commission",
      properties: {
        earnedAt: Date.now(),
        source: "refref",
      },
      createdBy: member._id,
      createdAt: Date.now(),
    });

    // Log the commission
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: commissionId,
      actionType: "commission_earned",
      actionData: {
        amount: args.amount,
        currency: args.currency,
        source: "refref",
        eventType: args.eventType,
      },
      performedBy: member._id,
      performedAt: Date.now(),
    });

    return commissionId;
  },
});
```

**Benefits of this approach:**
- All commissions visible in one place (internal + external)
- Use Benefits Ontology's existing payout infrastructure
- Affiliates become first-class citizens in your CRM
- Full audit trail in `objectActions`

**Timeline:** After affiliate program is generating revenue

---

## Data Model Mapping

### RefRef → Benefits Ontology

| RefRef Field | Benefits Ontology Field |
|--------------|-------------------------|
| `participant.id` | `objects.customProperties.refrefParticipantId` |
| `participant.email` | `objects.customProperties.email` |
| `participant.name` | `objects.name` |
| `participant.referralCode` | `objects.customProperties.refcode` |
| `reward.id` | `objects.customProperties.refrefRewardId` |
| `reward.amount` | `objects.customProperties.amount` |
| `reward.currency` | `objects.customProperties.currency` |
| `reward.status` | `objects.customProperties.payoutStatus` |
| `reward.rewardType` | "commission" (object type) |
| — | `objects.subtype` = "referral" |

### Link Types for Affiliates

```typescript
// New link types for affiliate relationships
const affiliateLinkTypes = [
  "earns_commission",  // member → commission (existing)
  "refers_user",       // affiliate → referred user (NEW)
];
```

---

## Schema Updates Needed

### 1. Add affiliate subtype to CRM contacts

```typescript
// In your schema or types
export const crmContactSubtypes = [
  "lead",
  "customer",
  "partner",
  "affiliate",  // NEW
] as const;
```

### 2. Add commission fields for RefRef tracking

```typescript
// customProperties for commission objects from RefRef
interface RefRefCommissionProps {
  source: "refref" | "internal";
  refrefRewardId?: string;
  refrefParticipantId?: string;
  eventType: "signup" | "purchase";
  orderId?: string;
  orderAmount?: number;
  referredUserId?: string;
  commissionRate: number;
  payoutStatus: "pending" | "processing" | "paid" | "failed";
  payoutId?: string;
  paidAt?: number;
}
```

### 3. (Optional) Add benefitClaims-like table for commissions

If you want claim/approval workflow for commissions:

```typescript
// convex/schema.ts
commissionPayouts: defineTable({
  organizationId: v.id("organizations"),
  commissionId: v.id("objects"),
  memberId: v.id("objects"),
  amount: v.number(),
  currency: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("paid"),
    v.literal("failed")
  ),
  paymentMethod: v.string(), // "paypal", "wise", "stripe"
  paymentReference: v.optional(v.string()),
  requestedAt: v.number(),
  processedAt: v.optional(v.number()),
  paidAt: v.optional(v.number()),
  notes: v.optional(v.string()),
})
  .index("by_member", ["memberId"])
  .index("by_status", ["status"])
  .index("by_org", ["organizationId"]),
```

---

## Webhook Endpoints

### RefRef → Convex Webhooks

```typescript
// apps/api/src/routes/v1/webhooks/convex.ts (in RefRef)
// OR
// src/app/api/webhooks/refref/route.ts (in Layer Cake)

/**
 * Webhook events to send from RefRef to Convex:
 *
 * 1. participant.created - New affiliate signed up
 * 2. reward.created - Commission earned
 * 3. reward.status_changed - Payout status updated
 */

// Example webhook payload
interface RefRefWebhookPayload {
  event: "participant.created" | "reward.created" | "reward.status_changed";
  timestamp: string;
  data: {
    // Varies by event type
  };
}
```

### Layer Cake webhook handler

```typescript
// src/app/api/webhooks/refref/route.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

export async function POST(request: Request) {
  const payload = await request.json();

  switch (payload.event) {
    case "participant.created":
      await convex.mutation(api.affiliateSync.syncAffiliateFromRefRef, {
        organizationId: process.env.LAYER_CAKE_ORG_ID as any,
        refrefParticipantId: payload.data.participantId,
        email: payload.data.email,
        name: payload.data.name,
        refcode: payload.data.referralCode,
      });
      break;

    case "reward.created":
      await convex.mutation(api.commissionSync.createCommissionFromRefRef, {
        organizationId: process.env.LAYER_CAKE_ORG_ID as any,
        refrefRewardId: payload.data.rewardId,
        refrefParticipantId: payload.data.participantId,
        amount: payload.data.amount,
        currency: payload.data.currency,
        eventType: payload.data.eventType,
        eventMetadata: payload.data.metadata,
      });
      break;
  }

  return new Response("OK", { status: 200 });
}
```

---

## Recommendation for Backend Team

### Immediate (Phase 1)
1. ✅ Deploy RefRef as separate service
2. ✅ Integrate with Stripe webhooks
3. ✅ Manual payouts via PayPal/Wise
4. ❌ No Convex integration yet

### After Launch (Phase 2)
1. Add webhook from RefRef to Convex
2. Sync affiliates to `objects` table as `crm_contact` with `subtype: "affiliate"`
3. Affiliates visible in Layer Cake CRM

### At Scale (Phase 3)
1. Sync rewards to `objects` table as `commission`
2. Unified commission dashboard
3. Single payout system
4. Consider moving payout logic FROM RefRef TO Convex

---

## Questions for Backend Team

1. **Do you want to show affiliates in the Layer Cake CRM?**
   - If yes → Phase 2 is priority
   - If no → Stay at Phase 1

2. **Do you want unified commission reporting?**
   - If yes → Phase 3 is priority
   - If no → Use RefRef dashboard

3. **Do you have existing payout infrastructure in Convex?**
   - If yes → Phase 3 makes sense
   - If no → Use RefRef/PayPal for payouts

---

*Part of the [Layer Cake Affiliate Recruitment Campaign](./README.md)*
