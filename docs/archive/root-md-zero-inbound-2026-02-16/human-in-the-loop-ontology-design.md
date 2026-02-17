# Human-in-the-Loop (HITL) System - Ontology-Based Design

## Overview

The HITL system allows users to review and approve AI-generated actions before they're executed. Instead of creating a separate `aiToolDrafts` table, we leverage the existing **objects ontology** for maximum flexibility and code reuse.

## Why Ontology-Based?

### ✅ Advantages

1. **Already Built**: Objects table handles all entity types with full CRUD
2. **Flexible**: AI metadata stored in `customProperties` alongside normal fields
3. **Status Workflow**: Built-in status field (`draft` → `active` → `rejected`)
4. **No Duplication**: Reuses existing queries, views, RBAC, and permissions
5. **Future-Proof**: Works with all current and future tool types automatically
6. **Audit Trail**: `objectActions` tracks all status changes and approvals

### ❌ Avoided Complexity

- No separate draft table to maintain
- No duplicate CRUD operations
- No separate approval workflow
- No schema migrations for new tool types

## Design

### Draft Object Structure

When HITL mode is enabled, AI tools create objects with `status="draft"`:

```typescript
await ctx.db.insert("objects", {
  organizationId,
  type: "crm_contact",       // or "event", "product", "form", etc.
  subtype: "person",
  name: "John Doe",
  status: "draft",            // ← KEY: Draft until approved

  // Normal object fields
  description: "Sales contact",

  customProperties: {
    // Normal CRM fields
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1234567890",

    // AI Metadata (when created by AI in HITL mode)
    aiGenerated: true,
    aiToolName: "create_contact",
    aiConversationId: conversationId,
    aiUserMessage: "Create a contact for John Doe at Acme Corp",
    aiReasoning: "User requested new contact creation with company affiliation",
    aiCreatedAt: Date.now(),
    aiParameters: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      company: "Acme Corp"
    }
  },

  createdBy: userId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

## Workflow States

### Object Status Flow

```
draft → active    (User approved)
draft → rejected  (User rejected)
```

### Status Field Usage

- `draft`: Pending user review (HITL mode)
- `active`: Approved and live
- `rejected`: User rejected this draft
- `archived`: Soft-deleted (not used in HITL)

## Implementation Components

### 1. AI Chat Modifications

When `humanInLoopEnabled` is true:
- Create object with `status="draft"`
- Add AI metadata to `customProperties`
- Return draft ID to user
- Show "Review pending" message

### 2. Draft Queries

```typescript
// Get all pending drafts for organization
export const getPendingDrafts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("status", "draft")
      )
      .filter((q) => q.eq(q.field("customProperties.aiGenerated"), true))
      .collect();
  },
});

// Get drafts by conversation
export const getDraftsByConversation = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("customProperties.aiConversationId"), args.conversationId)
        )
      )
      .collect();
  },
});
```

### 3. Approve/Reject Mutations

```typescript
// Approve draft (change status to active)
export const approveDraft = mutation({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify permissions
    const { userId, organizationId } = await getSessionData(ctx, args.sessionId);

    const object = await ctx.db.get(args.objectId);
    if (!object || object.status !== "draft") {
      throw new Error("Object not found or not a draft");
    }

    // Update status to active
    await ctx.db.patch(args.objectId, {
      status: "active",
      updatedAt: Date.now(),
      customProperties: {
        ...object.customProperties,
        aiApprovedBy: userId,
        aiApprovedAt: Date.now(),
      },
    });

    // Record action in objectActions
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: args.objectId,
      actionType: "approved_draft",
      performedBy: userId,
      timestamp: Date.now(),
      changes: { status: { from: "draft", to: "active" } },
    });

    return { success: true, objectId: args.objectId };
  },
});

// Reject draft
export const rejectDraft = mutation({
  args: {
    sessionId: v.string(),
    objectId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Similar implementation, set status="rejected"
    // Store rejection reason in customProperties
  },
});
```

### 4. Detail Pane Updates

The detail pane already shows objects by type. For drafts, we add:

- **Visual indicator**: "Draft - Pending Review" badge
- **AI context panel**: Show `aiUserMessage` and `aiReasoning`
- **Edit capability**: Allow inline editing before approval
- **Action buttons**: "Approve" and "Reject" buttons

### 5. Editable Forms

Reuse existing object edit forms with:
- All fields editable before approval
- Changes update `customProperties` fields
- Original AI parameters preserved for reference

## Benefits of This Approach

### For Users

1. **Familiar Interface**: Uses existing object views and forms
2. **Full Edit Control**: Can modify any field before approval
3. **Context Visible**: See what AI was trying to do
4. **Audit Trail**: Complete history in objectActions

### For Developers

1. **Less Code**: Reuse 90% of existing infrastructure
2. **Type Safety**: Objects table handles all entity types
3. **Flexible**: Easy to add new tool types
4. **Maintainable**: Single source of truth for all entities

### For System

1. **Performance**: No JOIN queries needed
2. **Scalability**: Existing indexes handle draft filtering
3. **Consistency**: Same RBAC and permissions apply
4. **Extensibility**: Works with future features automatically

## Example User Flow

1. **User**: "Create a contact for Jane Smith at Tech Corp"
2. **AI**: Creates draft contact with `status="draft"`
3. **System**: Shows notification "Draft created - Review pending"
4. **User**: Clicks "Review" in detail pane
5. **System**: Shows editable form with AI context
6. **User**: Edits phone number, clicks "Approve"
7. **System**: Changes `status="draft"` → `status="active"`
8. **Result**: Contact now appears in CRM as normal

## Migration Path

### Phase 1: Core Implementation (Current)
- ✅ Schema design (using objects table)
- 🔄 Draft creation in AI tools
- 🔄 Query/mutation implementations
- 🔄 Detail pane updates

### Phase 2: Enhanced UX
- Bulk approve/reject
- Draft comparison view
- AI reasoning explanations
- Approval workflows

### Phase 3: Advanced Features
- Multi-step approvals
- Conditional auto-approval
- Learning from approvals
- Suggested improvements

## Technical Notes

### Indexing

Existing indexes support drafts:
- `by_org_status`: Perfect for fetching all pending drafts
- `by_organization`: Filtering by AI metadata works

### Filtering

Use `customProperties.aiGenerated` to distinguish AI drafts from manual drafts:
```typescript
.filter((q) => q.eq(q.field("customProperties.aiGenerated"), true))
```

### Cleanup

Rejected drafts can be:
- Kept for analysis (recommended)
- Auto-archived after 30 days
- Manually deleted by user

## Conclusion

Using the objects ontology for HITL drafts is superior because:
- **Simpler**: Less code, less maintenance
- **Flexible**: Works with all entity types
- **Proven**: Built on existing, tested infrastructure
- **Scalable**: No performance impact

This design embodies the principle: **"Use the platform, don't fight it."**
