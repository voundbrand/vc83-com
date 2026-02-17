# AI Tool Building Guide: Full Spectrum Chat Interface

## 🎯 Overview

The AI chat interface has **4 powerful areas** that work together:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AI ASSISTANT (Main Chat)                                 │
│    - Natural language conversation                          │
│    - Tool execution messages                                │
│    - Confirmations and questions                            │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 2. TOOL EXECUTION & DEBUGGING                               │
│    - Shows tool calls with parameters                       │
│    - Displays execution results                             │
│    - Debug information                                      │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────────┬──────────────────────────────────┐
│ 3. WORK ITEMS            │ 4. ITEM DETAILS                  │
│  - Records found         │   - Preview of changes           │
│  - Records to create     │   - Detailed information         │
│  - Batch operations      │   - Comparison (old vs new)      │
│  - Progress tracking     │   - Field-by-field breakdown     │
└──────────────────────────┴──────────────────────────────────┘
```

## 🏗️ The Complete Tool Pattern

### **Phase 1: Tool Response Structure**

Every AI tool should return this structure:

```typescript
interface AIToolResponse {
  success: boolean;
  action: string;

  // For Work Items (middle-left pane)
  workItemId?: string;           // ID of work item record
  workItemType?: string;         // "crm_search" | "project_create" | etc.

  // For Item Details (right pane)
  data?: {
    items?: Array<{              // Records found or to be created
      id: string;
      type: string;
      name: string;
      status: string;
      preview?: {                // What WILL change
        action: "create" | "update" | "skip" | "delete";
        changes: Record<string, { old: any; new: any }>;
      };
    }>;
    summary?: {
      total: number;
      toCreate: number;
      toUpdate: number;
      toSkip: number;
    };
  };

  // Standard message for chat
  message: string;
  error?: string;
}
```

### **Phase 2: Preview vs Execute Pattern**

**CRITICAL**: All tools that CREATE or MODIFY data must support:

```typescript
{
  mode: "preview" | "execute"  // ALWAYS include this parameter
}
```

#### **Preview Mode** (Default):
1. Shows what WILL happen (doesn't actually do it)
2. Creates a work item with status "preview"
3. Returns preview data for user review
4. User can approve/reject in the UI

#### **Execute Mode**:
1. Actually performs the operations
2. Updates work item status to "executing" → "completed"
3. Returns results of actual operations

### **Phase 3: Database Schema**

For tools that need human-in-the-loop approval:

```typescript
// Generic work items table (add to schema)
export const aiWorkItems = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  conversationId: v.id("aiConversations"),

  // Work item identity
  type: v.string(), // "crm_search" | "project_create" | "contact_sync" | etc.
  name: v.string(), // User-friendly name
  status: v.union(
    v.literal("preview"),     // Waiting for approval
    v.literal("approved"),    // User approved
    v.literal("executing"),   // Currently running
    v.literal("completed"),   // Done
    v.literal("failed"),      // Error occurred
    v.literal("cancelled")    // User cancelled
  ),

  // Preview data (what will happen)
  previewData: v.optional(v.array(v.any())),

  // Execution results (what actually happened)
  results: v.optional(v.any()),

  // Progress tracking
  progress: v.optional(v.object({
    total: v.number(),
    completed: v.number(),
    failed: v.number(),
  })),

  // Metadata
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_org", ["organizationId"])
  .index("by_conversation", ["conversationId"])
  .index("by_status", ["status"]);
```

## 🎨 Real-World Examples

### **Example 1: CRM Search (Read-Only)**

**Tool Response:**
```typescript
// User: "Find all companies in the technology industry"
{
  success: true,
  action: "search_organizations",
  workItemId: "k17...",
  workItemType: "crm_search",
  data: {
    items: [
      {
        id: "j5k...",
        type: "crm_organization",
        name: "Acme Corporation",
        status: "active",
        preview: null // No changes, just viewing
      },
      {
        id: "j5l...",
        type: "crm_organization",
        name: "TechCorp Inc",
        status: "active",
        preview: null
      }
    ],
    summary: { total: 2, toCreate: 0, toUpdate: 0, toSkip: 0 }
  },
  message: "Found 2 technology companies. Click any to view details."
}
```

**What User Sees:**
- **Chat**: "Found 2 technology companies. Click any to view details."
- **Work Items**: Shows "CRM Search - Technology" with 2 items
- **Item Details** (when clicked): Full organization details

### **Example 2: Create Project (Preview Mode)**

**Tool Call:**
```typescript
manage_projects({
  action: "create_project",
  mode: "preview", // PREVIEW FIRST!
  projectName: "Website Redesign",
  projectType: "client_project",
  budget: { amount: 75000, currency: "USD" }
})
```

**Tool Response:**
```typescript
{
  success: true,
  action: "create_project",
  mode: "preview",
  workItemId: "k18...",
  workItemType: "project_create",
  data: {
    items: [{
      id: "temp-001", // Temporary ID (not created yet)
      type: "project",
      name: "Website Redesign",
      status: "preview",
      preview: {
        action: "create",
        changes: {
          name: { old: null, new: "Website Redesign" },
          type: { old: null, new: "client_project" },
          budget: { old: null, new: { amount: 75000, currency: "USD" } },
          projectCode: { old: null, new: "PRJ-2025-003" },
          status: { old: null, new: "draft" }
        }
      }
    }],
    summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
  },
  message: "Ready to create project 'Website Redesign'. Review the details and approve to proceed."
}
```

**What User Sees:**
- **Chat**: "Ready to create project... Review and approve"
- **Work Items**: Shows "Create Project - Website Redesign" with ⏸️ preview badge
- **Item Details**: Shows field-by-field preview of what will be created
- **Approval Buttons**: [Approve] [Reject] buttons in UI

**After User Clicks [Approve]:**

Tool automatically calls:
```typescript
manage_projects({
  action: "create_project",
  mode: "execute",
  workItemId: "k18...", // Same work item
  ... same parameters ...
})
```

Response:
```typescript
{
  success: true,
  action: "create_project",
  mode: "execute",
  workItemId: "k18...",
  data: {
    items: [{
      id: "j6m...", // REAL ID now!
      type: "project",
      name: "Website Redesign",
      status: "completed",
      preview: null // No longer preview
    }],
    summary: { total: 1, created: 1 }
  },
  message: "✅ Created project: Website Redesign (PRJ-2025-003)"
}
```

### **Example 3: Contact Sync (Batch Operation)**

**Preview:**
```typescript
{
  success: true,
  action: "sync_contacts",
  mode: "preview",
  workItemId: "k19...",
  workItemType: "contact_sync",
  data: {
    items: [
      {
        id: "temp-001",
        type: "contact",
        name: "John Smith",
        status: "preview",
        preview: {
          action: "create",
          source: "Microsoft 365",
          changes: {
            email: { old: null, new: "john@acme.com" },
            name: { old: null, new: "John Smith" }
          }
        }
      },
      {
        id: "j7n...",
        type: "contact",
        name: "Jane Doe",
        status: "preview",
        preview: {
          action: "update",
          confidence: "high",
          reason: "Email match",
          changes: {
            phone: { old: "(555) 111-2222", new: "(555) 999-8888" }
          }
        }
      },
      {
        id: "j7o...",
        type: "contact",
        name: "Bob Johnson",
        status: "preview",
        preview: {
          action: "skip",
          reason: "Already up-to-date"
        }
      }
    ],
    summary: { total: 3, toCreate: 1, toUpdate: 1, toSkip: 1 }
  },
  message: "Preview: 1 new contact, 1 update, 1 skip. Review and approve to sync."
}
```

**What User Sees:**
- **Work Items**: "Contact Sync - Microsoft 365" with 3 items
  - John Smith (⏸️ will create)
  - Jane Doe (⏸️ will update)
  - Bob Johnson (⏸️ will skip)
- **Item Details** (when clicked):
  - Shows old vs new values
  - Explains why action was chosen
  - Color coding: green=create, blue=update, gray=skip

## 📝 Tool Implementation Checklist

### ✅ **For ALL Tools:**

- [ ] Include `mode: "preview" | "execute"` parameter
- [ ] Return work item ID for UI tracking
- [ ] Structure data with items array
- [ ] Include summary statistics
- [ ] Provide clear, actionable messages

### ✅ **For Search/List Tools:**

- [ ] Return items even if empty (with helpful message)
- [ ] Include enough details for item details pane
- [ ] No preview needed (read-only)
- [ ] Support filtering/pagination

### ✅ **For Create/Update Tools:**

- [ ] Default to `mode: "preview"`
- [ ] Create aiWorkItems record with previewData
- [ ] Show what WILL change (old vs new)
- [ ] On execute: Update work item status
- [ ] Return actual created/updated IDs

### ✅ **For Batch Operations:**

- [ ] Show progress for each item
- [ ] Allow per-item review
- [ ] Support partial execution (some approved, some rejected)
- [ ] Track stats (created, updated, skipped, failed)

## 🎯 UI Settings Integration

### **Auto vs Review Mode**

User can set preference in Settings:

```typescript
// User preference stored in organizationAiSettings
{
  defaultApprovalMode: "auto" | "review"
}
```

**Auto Mode:**
- Skip preview, go straight to execute
- Faster workflow
- For trusted operations

**Review Mode:** (Default)
- Always preview first
- Require manual approval
- Safer for critical operations

## 🚀 Migration Guide

### **Updating Existing Tools:**

1. **Add mode parameter:**
```typescript
mode: v.optional(v.string()) // "preview" or "execute"
```

2. **Check mode in handler:**
```typescript
if (!args.mode || args.mode === "preview") {
  // Create work item with preview data
  return createPreview(...);
} else {
  // Execute actual operation
  return executeOperation(...);
}
```

3. **Return structured response:**
```typescript
return {
  success: true,
  action: "create_project",
  workItemId: workItem._id,
  data: { items: [...], summary: {...} },
  message: "..."
};
```

## 📚 Reference Tools

**Study these tools for examples:**
- `contactSyncTool.ts` - Perfect example of preview/execute
- `bulkCRMEmailTool.ts` - Batch operations with approval
- `workItems.ts` - Query patterns for UI

---

**Remember: The goal is to give users FULL VISIBILITY and CONTROL over what AI is doing!**
