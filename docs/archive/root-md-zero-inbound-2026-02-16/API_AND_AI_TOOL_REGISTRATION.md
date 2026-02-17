# API and AI Tool Registration Guide

This document explains how to expose new apps/features to the HTTP API and AI agents in the l4yercak3.com platform.

## Overview

The platform has two main ways to expose functionality externally:

1. **HTTP API** (`convex/api/v1/`) - REST API endpoints for external integrations
2. **AI Tools** (`convex/ai/tools/`) - Tools the AI assistant can use to help users

Both systems follow consistent patterns and should be implemented together when adding new features.

---

## Part 1: HTTP API Endpoints

### File Structure

```
convex/api/v1/
├── yourFeature.ts          # HTTP action handlers
├── yourFeatureInternal.ts  # Internal query/mutation functions
└── corsHeaders.ts          # CORS utilities (shared)
```

### Step 1: Create Internal Functions

Create `convex/api/v1/yourFeatureInternal.ts` with internal queries and mutations:

```typescript
/**
 * YOUR FEATURE INTERNAL FUNCTIONS
 */
import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

/**
 * LIST ITEMS (INTERNAL)
 */
export const listItemsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Query the database
    let items = await ctx.db
      .query("yourTable")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Apply filters
    if (args.status) {
      items = items.filter((item) => item.status === args.status);
    }

    // Apply pagination
    const total = items.length;
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const paginatedItems = items.slice(offset, offset + limit);

    return { items: paginatedItems, total, limit, offset };
  },
});

/**
 * CREATE ITEM (INTERNAL)
 */
export const createItemInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    // ... other fields
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const itemId = await ctx.db.insert("yourTable", {
      organizationId: args.organizationId,
      name: args.name,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: args.performedBy,
    });

    return itemId;
  },
});
```

### Step 2: Create HTTP Handlers

Create `convex/api/v1/yourFeature.ts` with HTTP action handlers:

```typescript
/**
 * API V1: YOUR FEATURE ENDPOINTS
 */
import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";

/**
 * CREATE ITEM
 * POST /api/v1/your-feature
 * Required Scope: your-feature:write
 */
export const createItem = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require scope for OAuth tokens (API keys get full access)
    const scopeCheck = requireScopes(authContext, ["your-feature:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

    // 3. Parse and validate request body
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Call internal mutation
    const itemId = await ctx.runMutation(
      internal.api.v1.yourFeatureInternal.createItemInternal,
      {
        organizationId,
        name,
        performedBy: userId,
      }
    );

    // 5. Return success response
    return new Response(
      JSON.stringify({ success: true, itemId }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error: any) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST ITEMS
 * GET /api/v1/your-feature
 * Required Scope: your-feature:read
 */
export const listItems = httpAction(async (ctx, request) => {
  // ... similar pattern with requireScopes(["your-feature:read"])
});
```

### Step 3: Register Routes in http.ts

Add imports and routes in `convex/http.ts`:

```typescript
// Add import
import {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
} from "./api/v1/yourFeature";

// Add routes section
/**
 * YOUR FEATURE API
 */

// POST /api/v1/your-feature - Create item
http.route({
  path: "/api/v1/your-feature",
  method: "POST",
  handler: createItem,
});

// GET /api/v1/your-feature - List items
http.route({
  path: "/api/v1/your-feature",
  method: "GET",
  handler: listItems,
});

// GET /api/v1/your-feature/:itemId - Get item details
http.route({
  path: "/api/v1/your-feature/:itemId",
  method: "GET",
  handler: getItem,
});

// PATCH /api/v1/your-feature/:itemId - Update item
http.route({
  path: "/api/v1/your-feature/:itemId",
  method: "PATCH",
  handler: updateItem,
});

// DELETE /api/v1/your-feature/:itemId - Delete item
http.route({
  path: "/api/v1/your-feature/:itemId",
  method: "DELETE",
  handler: deleteItem,
});
```

### Authentication Middleware

The `convex/middleware/auth.ts` file provides:

- `authenticateRequest(ctx, request)` - Handles both API key and OAuth token auth
- `requireScopes(authContext, scopes)` - Validates OAuth scopes (API keys bypass)
- `getEffectiveOrganizationId(authContext)` - Gets the org ID from auth context

### OAuth Scopes Convention

Follow the pattern: `{feature}:read` and `{feature}:write`

Examples:
- `benefits:read`, `benefits:write`
- `projects:read`, `projects:write`
- `crm:read`, `crm:write`

---

## Part 2: AI Tool Registration

### File Structure

```
convex/ai/tools/
├── yourFeatureTool.ts  # Tool definition and action
├── registry.ts         # Tool registry (register here)
└── internalToolMutations.ts  # Shared internal helpers
```

### Step 1: Create Tool Definition and Action

Create `convex/ai/tools/yourFeatureTool.ts`:

```typescript
/**
 * AI Your Feature Management Tool
 */
import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION (OpenAI Function Calling format)
// ============================================================================

export const yourFeatureToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_your_feature",
    description: `Tool description here. Explain what the tool does and when to use it.

IMPORTANT WORKFLOW:
1. Step one
2. Step two
3. Step three`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["list_items", "create_item", "update_item", "delete_item"],
          description: "Action to perform"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will happen (default), execute = perform the operation"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode - returned from preview)"
        },
        // Add your specific parameters here
        itemId: {
          type: "string",
          description: "Item ID (for update/delete)"
        },
        name: {
          type: "string",
          description: "Item name"
        },
        // ... more parameters
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN ACTION HANDLER
// ============================================================================

export const executeManageYourFeature = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    itemId: v.optional(v.string()),
    name: v.optional(v.string()),
    // ... match parameters from definition
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    workItemType?: string;
    data?: any;
    message?: string;
    error?: string;
  }> => {
    // 1. Get organization context
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
    } else if (args.sessionId) {
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });
      if (!session?.organizationId || !session?.userId) {
        throw new Error("Invalid session");
      }
      organizationId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Auth context required");
    }

    // 2. Route to action handler
    try {
      switch (args.action) {
        case "list_items":
          return await listItems(ctx, organizationId, args);
        case "create_item":
          if (!args.name) throw new Error("name required");
          if (!userId) throw new Error("userId required");
          return await createItem(ctx, organizationId, userId, args);
        // ... other actions
        default:
          return { success: false, action: args.action, error: "Invalid action" };
      }
    } catch (error: any) {
      return { success: false, action: args.action, error: error.message };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

async function listItems(ctx: any, organizationId: Id<"organizations">, args: any) {
  const result = await ctx.runQuery(
    internal.api.v1.yourFeatureInternal.listItemsInternal,
    { organizationId, limit: args.limit || 20 }
  );

  return {
    success: true,
    action: "list_items",
    data: { items: result.items, total: result.total },
    message: `Found ${result.total} item(s)`
  };
}

async function createItem(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: any
) {
  const mode = args.mode || "preview";

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "item",
      name: args.name,
      status: "preview",
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New item will be created",
        changes: { name: { old: null, new: args.name } }
      }
    };

    // Create work item for tracking
    const workItemId = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "item_create",
        name: `Create Item - ${args.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_item",
      mode: "preview",
      workItemId,
      workItemType: "item_create",
      data: { items: [previewData], summary: { total: 1, toCreate: 1 } },
      message: `Ready to create "${args.name}". Review and approve.`
    };
  }

  // EXECUTE MODE: Actually create
  const itemId = await ctx.runMutation(
    internal.api.v1.yourFeatureInternal.createItemInternal,
    { organizationId, name: args.name, performedBy: userId }
  );

  if (args.workItemId) {
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      { workItemId: args.workItemId, status: "completed", results: { itemId } }
    );
  }

  return {
    success: true,
    action: "create_item",
    mode: "execute",
    data: { items: [{ id: itemId, name: args.name, status: "completed" }] },
    message: `Created item: ${args.name}`
  };
}
```

### Step 2: Register Tool in Registry

Edit `convex/ai/tools/registry.ts`:

```typescript
// 1. Add import at top of file
import { yourFeatureToolDefinition } from "./yourFeatureTool";

// 2. Add tool definition (follow the AITool interface pattern)
const manageYourFeatureTool: AITool = {
  name: "manage_your_feature",
  description: "Description of what this tool does",
  status: "ready",  // "ready", "placeholder", or "beta"
  parameters: yourFeatureToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    const result = await ctx.runAction(api.ai.tools.yourFeatureTool.executeManageYourFeature, {
      sessionId: ctx.sessionId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      action: args.action,
      mode: args.mode,
      workItemId: args.workItemId,
      itemId: args.itemId,
      name: args.name,
      // ... pass all parameters
    });
    return result;
  }
};

// 3. Add to TOOL_REGISTRY object
export const TOOL_REGISTRY: Record<string, AITool> = {
  // ... existing tools ...

  // Your Feature
  manage_your_feature: manageYourFeatureTool,

  // ... more tools ...
};
```

### Preview/Execute Pattern

AI tools use a two-phase workflow:

1. **Preview Mode** (`mode: "preview"`)
   - Shows what will happen without making changes
   - Returns preview data and a `workItemId`
   - User can review and approve

2. **Execute Mode** (`mode: "execute"`)
   - Actually performs the operation
   - Uses `workItemId` to track the approved action
   - Updates work item status to "completed"

This ensures:
- User always sees what will happen before it happens
- Operations are traceable via work items
- User has explicit control over data changes

---

## Quick Reference: Adding a New Feature

### Checklist

- [ ] Create `convex/api/v1/{feature}Internal.ts` with internal queries/mutations
- [ ] Create `convex/api/v1/{feature}.ts` with HTTP handlers
- [ ] Add imports to `convex/http.ts`
- [ ] Register routes in `convex/http.ts`
- [ ] Create `convex/ai/tools/{feature}Tool.ts` with tool definition and action
- [ ] Add import to `convex/ai/tools/registry.ts`
- [ ] Register tool in `TOOL_REGISTRY` in `convex/ai/tools/registry.ts`
- [ ] Run `npm run typecheck` to verify TypeScript
- [ ] Run `npm run lint` to check code style
- [ ] Test both API endpoints and AI tool functionality

### Naming Conventions

| Component | Pattern | Example |
|-----------|---------|---------|
| Internal file | `{feature}Internal.ts` | `benefitsInternal.ts` |
| API file | `{feature}.ts` | `benefits.ts` |
| Tool file | `{feature}Tool.ts` | `benefitsTool.ts` |
| Tool name | `manage_{feature}` | `manage_benefits` |
| API route | `/api/v1/{feature}` | `/api/v1/benefits` |
| OAuth scope read | `{feature}:read` | `benefits:read` |
| OAuth scope write | `{feature}:write` | `benefits:write` |

### Example Files

For a complete working example, see:

- HTTP API: `convex/api/v1/benefits.ts`, `convex/api/v1/benefitsInternal.ts`
- AI Tool: `convex/ai/tools/benefitsTool.ts`
- Routes: `convex/http.ts` (search for "BENEFITS API")
- Registry: `convex/ai/tools/registry.ts` (search for "manage_benefits")
