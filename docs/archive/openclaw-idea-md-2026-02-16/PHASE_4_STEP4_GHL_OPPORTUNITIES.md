# Phase 4 Step 4: Opportunities & Pipeline Sync

## Goal

GHL opportunities (deals) sync bidirectionally with our ontology pipeline objects. The agent can move deals through stages, update monetary values, and react to pipeline changes in real-time. Sales automation becomes fully agent-driven.

## Depends On

- Phase 4 Step 1 (OAuth Foundation) — authenticated GHL API access
- Phase 4 Step 2 (Contact Sync) — contacts linked with `ghlContactId`
- Pipeline/opportunity objects in ontology

## GHL Opportunities API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /opportunities/search` | GET | Search opportunities with filters |
| `GET /opportunities/{id}` | GET | Get opportunity details |
| `POST /opportunities/` | POST | Create a new opportunity |
| `PUT /opportunities/{id}` | PUT | Update opportunity |
| `DELETE /opportunities/{id}` | DELETE | Delete opportunity |
| `PUT /opportunities/{id}/status` | PUT | Update opportunity status (open/won/lost/abandoned) |
| `GET /opportunities/pipelines` | GET | List available pipelines and stages |

### GHL Opportunity Object

```json
{
  "id": "opp_abc123",
  "name": "Deal with Acme Corp",
  "monetaryValue": 5000,
  "pipelineId": "pip_xyz",
  "pipelineStageId": "stage_456",
  "status": "open",
  "contactId": "contact_789",
  "assignedTo": "user_001",
  "source": "api",
  "dateAdded": "2026-01-15T10:00:00Z",
  "lastStatusChangeAt": "2026-01-15T10:00:00Z",
  "customFields": []
}
```

## Field Mapping

| Our Field | GHL Field | Direction | Notes |
|-----------|-----------|-----------|-------|
| `name` | `name` | Bidirectional | Deal title |
| `customProperties.monetaryValue` | `monetaryValue` | Bidirectional | Deal value in cents |
| `customProperties.pipelineId` | `pipelineId` | GHL → Ours | Pipeline identifier |
| `customProperties.pipelineName` | (resolved from pipelines) | Cached | Human-readable |
| `customProperties.stageId` | `pipelineStageId` | Bidirectional | Current stage |
| `customProperties.stageName` | (resolved from pipelines) | Cached | Human-readable |
| `customProperties.dealStatus` | `status` | Bidirectional | open/won/lost/abandoned |
| `customProperties.ghlOpportunityId` | `id` | Our → GHL lookup | |
| `customProperties.ghlContactId` | `contactId` | Link | Associated contact |
| `customProperties.assignedTo` | `assignedTo` | GHL → Ours | GHL user ID |
| `status` | (derived) | Internal | active/inactive based on deal status |

## Architecture

```
┌───────────────────────────────────────────────────────┐
│              INBOUND (GHL → Our Ontology)              │
├───────────────────────────────────────────────────────┤
│                                                       │
│  GHL Webhook Events:                                  │
│    ├── OpportunityCreate    → create in ontology      │
│    ├── OpportunityUpdate    → update fields            │
│    ├── OpportunityStageUpdate → update stage + notify  │
│    ├── OpportunityStatusUpdate → update status         │
│    ├── OpportunityMonetaryValueUpdate → update value   │
│    └── OpportunityDelete    → soft-delete              │
│                                                       │
│  Pipeline stage changes trigger agent notification     │
│  so the agent can react (e.g., send follow-up)        │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│             OUTBOUND (Agent → GHL)                    │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Agent tools:                                         │
│    ├── create_opportunity  → POST /opportunities/     │
│    ├── update_opportunity  → PUT /opportunities/{id}  │
│    ├── move_deal_stage     → PUT /opportunities/{id}  │
│    └── update_deal_status  → PUT .../status           │
└───────────────────────────────────────────────────────┘
```

## Implementation

### 1. Pipeline & Stage Cache

**File:** `convex/integrations/ghlOpportunities.ts` (new)

```typescript
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/**
 * Fetch and cache GHL pipelines + stages for an org.
 * Called on initial sync and periodically.
 */
export const syncGhlPipelines = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;

    const res = await fetch(
      `${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch pipelines: ${await res.text()}`);
    }

    const data = await res.json();
    const pipelines = data.pipelines || [];

    // Store as ontology object for agent awareness
    await ctx.runMutation(
      internal.integrations.ghlOpportunities.storePipelineCache,
      { organizationId: args.organizationId, pipelines }
    );

    return { pipelines: pipelines.length };
  },
});

export const storePipelineCache = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    pipelines: v.any(),
  },
  handler: async (ctx, args) => {
    // Upsert pipeline cache object
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ghl_pipeline_cache")
      )
      .first();

    const data = {
      organizationId: args.organizationId,
      type: "ghl_pipeline_cache" as any,
      name: "GHL Pipelines",
      status: "active" as const,
      customProperties: {
        pipelines: args.pipelines,
        lastSynced: Date.now(),
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("objects", { ...data, createdAt: Date.now() });
    }
  },
});

/**
 * Get cached pipeline/stage info for display and agent context.
 */
export const getGhlPipelines = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ghl_pipeline_cache")
      )
      .first();

    return (cache?.customProperties as any)?.pipelines || [];
  },
});
```

### 2. Inbound Opportunity Events

**File:** `convex/integrations/ghlOpportunities.ts` (continued)

```typescript
/**
 * Process GHL opportunity webhook events.
 */
export const processGhlOpportunityEvent = internalAction({
  args: {
    organizationId: v.id("organizations"),
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const { event } = args;
    const eventType = event.type;

    switch (eventType) {
      case "OpportunityCreate":
        return await ctx.runMutation(
          internal.integrations.ghlOpportunities.upsertOpportunityFromGhl,
          { organizationId: args.organizationId, ghlOpportunity: event }
        );

      case "OpportunityUpdate":
      case "OpportunityStageUpdate":
      case "OpportunityStatusUpdate":
      case "OpportunityMonetaryValueUpdate":
        return await ctx.runMutation(
          internal.integrations.ghlOpportunities.updateOpportunityFromGhl,
          { organizationId: args.organizationId, ghlOpportunity: event }
        );

      case "OpportunityDelete":
        return await ctx.runMutation(
          internal.integrations.ghlOpportunities.softDeleteOpportunityFromGhl,
          { organizationId: args.organizationId, ghlOpportunityId: event.id }
        );

      default:
        return { status: "skipped" };
    }
  },
});

export const upsertOpportunityFromGhl = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ghlOpportunity: v.any(),
  },
  handler: async (ctx, args) => {
    const { organizationId, ghlOpportunity } = args;
    const ghlOppId = ghlOpportunity.id || ghlOpportunity.opportunityId;

    // Check if we already have this opportunity
    const existing = await findOpportunityByGhlId(ctx, organizationId, ghlOppId);

    if (existing) {
      return await updateOpportunityFields(ctx, existing._id, ghlOpportunity);
    }

    // Create new opportunity in ontology
    const oppId = await ctx.db.insert("objects", {
      organizationId,
      type: "opportunity",
      name: ghlOpportunity.name || "Untitled Deal",
      status: ghlOpportunity.status === "open" ? "active" : "inactive",
      customProperties: {
        monetaryValue: ghlOpportunity.monetaryValue || 0,
        pipelineId: ghlOpportunity.pipelineId,
        stageId: ghlOpportunity.pipelineStageId,
        stageName: ghlOpportunity.pipelineStageName || undefined,
        dealStatus: ghlOpportunity.status || "open",
        ghlOpportunityId: ghlOppId,
        ghlContactId: ghlOpportunity.contactId,
        assignedTo: ghlOpportunity.assignedTo,
        source: ghlOpportunity.source || "ghl",
        lastGhlSync: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { status: "created", opportunityId: oppId };
  },
});

export const updateOpportunityFromGhl = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ghlOpportunity: v.any(),
  },
  handler: async (ctx, args) => {
    const ghlOppId = args.ghlOpportunity.id || args.ghlOpportunity.opportunityId;
    const existing = await findOpportunityByGhlId(ctx, args.organizationId, ghlOppId);

    if (!existing) {
      // Create if not found (missed create webhook)
      return await ctx.runMutation(
        internal.integrations.ghlOpportunities.upsertOpportunityFromGhl,
        args
      );
    }

    return await updateOpportunityFields(ctx, existing._id, args.ghlOpportunity);
  },
});

export const softDeleteOpportunityFromGhl = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ghlOpportunityId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await findOpportunityByGhlId(ctx, args.organizationId, args.ghlOpportunityId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "inactive",
        customProperties: {
          ...(existing.customProperties as Record<string, unknown>),
          deletedInGhl: true,
          deletedInGhlAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
    }
    return { status: "soft_deleted" };
  },
});

// --- Helpers ---

async function findOpportunityByGhlId(ctx: any, orgId: any, ghlOppId: string) {
  const opps = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", orgId).eq("type", "opportunity")
    )
    .collect();

  return opps.find(
    (o: any) => (o.customProperties as any)?.ghlOpportunityId === ghlOppId
  ) || null;
}

async function updateOpportunityFields(ctx: any, oppId: any, ghlOpp: any) {
  const existing = await ctx.db.get(oppId);
  if (!existing) return { status: "not_found" };

  const cp = existing.customProperties as Record<string, unknown>;

  await ctx.db.patch(oppId, {
    name: ghlOpp.name || existing.name,
    status: (ghlOpp.status || cp.dealStatus) === "open" ? "active" : "inactive",
    customProperties: {
      ...cp,
      monetaryValue: ghlOpp.monetaryValue ?? cp.monetaryValue,
      stageId: ghlOpp.pipelineStageId || cp.stageId,
      stageName: ghlOpp.pipelineStageName || cp.stageName,
      dealStatus: ghlOpp.status || cp.dealStatus,
      assignedTo: ghlOpp.assignedTo || cp.assignedTo,
      lastGhlSync: Date.now(),
    },
    updatedAt: Date.now(),
  });

  return { status: "updated", opportunityId: oppId };
}
```

### 3. Outbound Push (Agent → GHL)

**File:** `convex/integrations/ghlOpportunities.ts` (continued)

```typescript
/**
 * Create an opportunity in GHL from our system.
 */
export const pushOpportunityToGhl = internalAction({
  args: {
    organizationId: v.id("organizations"),
    opportunityId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const opp = await ctx.runQuery(
      internal.integrations.ghlOpportunities.getOpportunityInternal,
      { opportunityId: args.opportunityId }
    );
    if (!opp) throw new Error("Opportunity not found");

    const cp = opp.customProperties as Record<string, any>;
    const ghlOppId = cp?.ghlOpportunityId;

    const payload = {
      name: opp.name,
      monetaryValue: cp?.monetaryValue || 0,
      pipelineId: cp?.pipelineId,
      pipelineStageId: cp?.stageId,
      status: cp?.dealStatus || "open",
      contactId: cp?.ghlContactId,
    };

    if (ghlOppId) {
      // Update existing
      const res = await fetch(`${GHL_API_BASE}/opportunities/${ghlOppId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`GHL opportunity update failed: ${await res.text()}`);
      return { status: "updated", ghlOpportunityId: ghlOppId };
    } else {
      // Create new
      const conn = await ctx.runQuery(
        internal.integrations.ghl.getGhlConnectionInternal,
        { organizationId: args.organizationId }
      );
      const locationId = (conn?.customProperties as any)?.locationId;

      const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({ ...payload, locationId }),
      });

      if (!res.ok) throw new Error(`GHL opportunity create failed: ${await res.text()}`);
      const result = await res.json();
      const newId = result.opportunity?.id;

      if (newId) {
        await ctx.runMutation(
          internal.integrations.ghlOpportunities.linkGhlOpportunityId,
          { opportunityId: args.opportunityId, ghlOpportunityId: newId }
        );
      }

      return { status: "created", ghlOpportunityId: newId };
    }
  },
});

export const getOpportunityInternal = internalQuery({
  args: { opportunityId: v.id("objects") },
  handler: async (ctx, args) => await ctx.db.get(args.opportunityId),
});

export const linkGhlOpportunityId = internalMutation({
  args: { opportunityId: v.id("objects"), ghlOpportunityId: v.string() },
  handler: async (ctx, args) => {
    const opp = await ctx.db.get(args.opportunityId);
    if (opp) {
      await ctx.db.patch(args.opportunityId, {
        customProperties: {
          ...(opp.customProperties as Record<string, unknown>),
          ghlOpportunityId: args.ghlOpportunityId,
        },
        updatedAt: Date.now(),
      });
    }
  },
});
```

## Files Summary

| File | Change | Risk |
|------|--------|------|
| `convex/integrations/ghlOpportunities.ts` | **New** — pipeline cache, opportunity CRUD, sync | Medium |
| `convex/integrations/ghl.ts` | Webhook routing for opportunity events (Step 2 router) | Low |

## Verification

1. **Inbound create**: Create opportunity in GHL → appears in our ontology with `ghlOpportunityId`
2. **Stage change**: Move deal to new stage in GHL → our `stageId` + `stageName` update
3. **Status change**: Mark deal as Won in GHL → our `dealStatus` updates, `status` becomes inactive
4. **Monetary value**: Update deal value in GHL → our `monetaryValue` updates
5. **Outbound create**: Agent creates opportunity → appears in GHL pipeline
6. **Outbound stage move**: Agent moves deal stage → GHL opportunity updates
7. **Pipeline cache**: `syncGhlPipelines` populates pipeline/stage data for agent context
8. **Delete**: Delete opportunity in GHL → soft-deleted in our system
