# Human-in-the-Loop (HITL) Implementation Plan

## Overview

The Human-in-the-Loop system allows users to review and edit AI-generated actions before they're executed. This prevents accidental data creation/modification and gives users full control over what the AI does.

## User Flow

### Without HITL (Auto Mode)
```
User: "Create contact John Doe at Acme Corp"
  ↓
AI executes create_contact immediately
  ↓
✅ Contact created in CRM
  ↓
User sees success message
```

### With HITL (Review Mode)
```
User: "Create contact John Doe at Acme Corp"
  ↓
AI creates draft (NOT in database)
  ↓
📋 Draft shows in detail pane with editable fields
  ↓
User reviews/edits the draft
  ↓
User clicks "Approve" or "Reject"
  ↓
If approved: Execute mutation → ✅ Contact created
If rejected: Discard draft → ❌ Nothing created
```

## Architecture

### 1. HITL Toggle (✅ COMPLETE)

**Location**: Chat input area
**Component**: `chat-input-redesign.tsx`
**State**: Managed in `ai-chat-context.tsx`

```tsx
// Context state
const [humanInLoopEnabled, setHumanInLoopEnabled] = useState(false)

// UI Toggle
<button onClick={() => setHumanInLoopEnabled(!humanInLoopEnabled)}>
  <UserCheck /> {humanInLoopEnabled ? "Review" : "Auto"}
</button>
```

**Visual states:**
- **Auto Mode** (default): Gray button, AI executes immediately
- **Review Mode**: Green button, AI creates drafts for approval

### 2. Draft Execution Flow (🚧 IN PROGRESS)

**Backend Changes Needed:**

#### A. Add Draft Table
```typescript
// convex/schema.ts
aiToolDrafts: defineTable({
  conversationId: v.id("aiConversations"),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  toolName: v.string(),
  parameters: v.any(),
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  createdAt: v.number(),
  updatedAt: v.number(),
  // Optional: Store result from dry-run validation
  validationResult: v.optional(v.any()),
})
```

#### B. Modify AI Chat Action
```typescript
// convex/ai/chat.ts - sendMessage action

// Before tool execution, check HITL mode:
if (args.humanInLoopEnabled && toolSupportsDrafts(toolCall.function.name)) {
  // Create draft instead of executing
  const draftId = await ctx.runMutation(api.ai.conversations.createToolDraft, {
    conversationId,
    toolName: toolCall.function.name,
    parameters: parsedArgs,
    organizationId: args.organizationId,
    userId: args.userId,
  });

  // Return draft info to AI
  return {
    success: true,
    isDraft: true,
    draftId,
    message: "Draft created for review. Please review and approve in the detail pane.",
  };
} else {
  // Execute immediately (current behavior)
  const result = await executeTool(...);
}
```

#### C. Draft Mutations
```typescript
// convex/ai/conversations.ts

export const createToolDraft = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    toolName: v.string(),
    parameters: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiToolDrafts", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const approveDraft = mutation({
  args: {
    draftId: v.id("aiToolDrafts"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft || draft.status !== "pending") {
      throw new Error("Draft not found or already processed");
    }

    // Mark as approved
    await ctx.db.patch(args.draftId, {
      status: "approved",
      updatedAt: Date.now(),
    });

    // Execute the actual tool (via action)
    return await ctx.runAction(api.ai.drafts.executeDraft, {
      draftId: args.draftId,
    });
  },
});

export const rejectDraft = mutation({
  args: {
    draftId: v.id("aiToolDrafts"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft || draft.status !== "pending") {
      throw new Error("Draft not found or already processed");
    }

    await ctx.db.patch(args.draftId, {
      status: "rejected",
      updatedAt: Date.now(),
    });
  },
});

export const updateDraft = mutation({
  args: {
    draftId: v.id("aiToolDrafts"),
    parameters: v.any(),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft || draft.status !== "pending") {
      throw new Error("Draft not found or already processed");
    }

    await ctx.db.patch(args.draftId, {
      parameters: args.parameters,
      updatedAt: Date.now(),
    });
  },
});

export const getPendingDrafts = query({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiToolDrafts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});
```

#### D. Draft Execution Action
```typescript
// convex/ai/drafts.ts (NEW FILE)

export const executeDraft = action({
  args: {
    draftId: v.id("aiToolDrafts"),
  },
  handler: async (ctx, args) => {
    const draft: any = await ctx.runQuery(api.ai.conversations.getDraft, {
      draftId: args.draftId,
    });

    if (!draft || draft.status !== "approved") {
      throw new Error("Draft not approved");
    }

    // Execute the tool
    const result = await executeTool(
      {
        ...ctx,
        organizationId: draft.organizationId,
        userId: draft.userId,
      },
      draft.toolName,
      draft.parameters
    );

    // Log execution
    await ctx.runMutation(api.ai.conversations.logToolExecution, {
      conversationId: draft.conversationId,
      organizationId: draft.organizationId,
      userId: draft.userId,
      toolName: draft.toolName,
      parameters: draft.parameters,
      result,
      status: "success",
      tokensUsed: 0, // Drafts don't use tokens
      costUsd: 0,
      executedAt: Date.now(),
      durationMs: 0,
    });

    return result;
  },
});
```

### 3. Draft Detail Pane (📋 PENDING)

**Component**: `detail-view.tsx` (extend existing)

**New Props:**
```typescript
interface DetailViewProps {
  selectedWorkItem: WorkItem | null;
  selectedDraft: ToolDraft | null; // NEW
  onClearSelection: () => void;
  onApproveDraft: (draftId: Id<"aiToolDrafts">) => Promise<void>; // NEW
  onRejectDraft: (draftId: Id<"aiToolDrafts">) => Promise<void>; // NEW
  onUpdateDraft: (draftId: Id<"aiToolDrafts">, params: any) => Promise<void>; // NEW
}
```

**Draft Display:**
```tsx
// If draft selected, show editable form
{selectedDraft && (
  <DraftEditor
    draft={selectedDraft}
    onApprove={() => onApproveDraft(selectedDraft._id)}
    onReject={() => onRejectDraft(selectedDraft._id)}
    onUpdate={(params) => onUpdateDraft(selectedDraft._id, params)}
  />
)}
```

**Draft Editor Component:**
```tsx
function DraftEditor({ draft, onApprove, onReject, onUpdate }) {
  const [editedParams, setEditedParams] = useState(draft.parameters);
  const [isEditing, setIsEditing] = useState(false);

  // Render fields based on tool type
  return (
    <div>
      <h3>{draft.toolName} - Pending Approval</h3>

      {/* Tool-specific form */}
      {draft.toolName === "create_contact" && (
        <ContactDraftForm
          params={editedParams}
          onChange={setEditedParams}
          isEditing={isEditing}
        />
      )}

      {draft.toolName === "create_event" && (
        <EventDraftForm
          params={editedParams}
          onChange={setEditedParams}
          isEditing={isEditing}
        />
      )}

      {/* Generic fallback */}
      {!["create_contact", "create_event"].includes(draft.toolName) && (
        <GenericDraftForm
          params={editedParams}
          onChange={setEditedParams}
          isEditing={isEditing}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit"}
        </button>
        {isEditing && (
          <button onClick={() => {
            onUpdate(editedParams);
            setIsEditing(false);
          }}>
            Save Changes
          </button>
        )}
        <button onClick={onApprove} disabled={isEditing}>
          ✅ Approve & Execute
        </button>
        <button onClick={onReject}>
          ❌ Reject & Discard
        </button>
      </div>
    </div>
  );
}
```

### 4. Tool Execution Panel Integration (🔄 PENDING)

Show drafts in the tool execution panel alongside completed executions:

```tsx
// tool-execution-panel-redesign.tsx

const pendingDrafts = useQuery(
  api.ai.conversations.getPendingDrafts,
  currentConversationId ? { conversationId: currentConversationId } : "skip"
);

// Render drafts with "Pending Review" status
{pendingDrafts?.map((draft) => (
  <ToolExecutionItem
    key={draft._id}
    execution={{
      id: draft._id,
      toolName: draft.toolName,
      status: "pending_review", // NEW STATUS
      startTime: new Date(draft.createdAt),
      input: draft.parameters,
    }}
    onClick={() => onSelectDraft(draft)}
  />
))}
```

### 5. Clickable Links to Created Records (🔗 PENDING)

After successful execution (or draft approval), show link to the created object:

```tsx
// In tool execution result:
{execution.output?.success && execution.output.contactId && (
  <a
    href="#"
    onClick={() => openWindow("CRM", { selectedContactId: execution.output.contactId })}
    className="text-blue-600 hover:underline"
  >
    View Contact →
  </a>
)}

{execution.output?.success && execution.output.eventId && (
  <a
    href="#"
    onClick={() => openWindow("Events", { selectedEventId: execution.output.eventId })}
    className="text-blue-600 hover:underline"
  >
    View Event →
  </a>
)}
```

## Tool-Specific Draft Forms

### Contact Draft Form
```tsx
function ContactDraftForm({ params, onChange, isEditing }) {
  return (
    <div className="space-y-2">
      <input
        value={params.firstName}
        onChange={(e) => onChange({ ...params, firstName: e.target.value })}
        disabled={!isEditing}
        placeholder="First Name"
      />
      <input
        value={params.lastName}
        onChange={(e) => onChange({ ...params, lastName: e.target.value })}
        disabled={!isEditing}
        placeholder="Last Name"
      />
      <input
        value={params.email}
        onChange={(e) => onChange({ ...params, email: e.target.value })}
        disabled={!isEditing}
        placeholder="Email"
      />
      <input
        value={params.phone || ""}
        onChange={(e) => onChange({ ...params, phone: e.target.value })}
        disabled={!isEditing}
        placeholder="Phone"
      />
      <input
        value={params.company || ""}
        onChange={(e) => onChange({ ...params, company: e.target.value })}
        disabled={!isEditing}
        placeholder="Company"
      />
    </div>
  );
}
```

### Event Draft Form
```tsx
function EventDraftForm({ params, onChange, isEditing }) {
  return (
    <div className="space-y-2">
      <input
        value={params.title}
        onChange={(e) => onChange({ ...params, title: e.target.value })}
        disabled={!isEditing}
        placeholder="Event Title"
      />
      <textarea
        value={params.description || ""}
        onChange={(e) => onChange({ ...params, description: e.target.value })}
        disabled={!isEditing}
        placeholder="Description"
      />
      <input
        type="datetime-local"
        value={params.startDate?.slice(0, 16) || ""}
        onChange={(e) => onChange({ ...params, startDate: e.target.value })}
        disabled={!isEditing}
      />
      <input
        value={params.location}
        onChange={(e) => onChange({ ...params, location: e.target.value })}
        disabled={!isEditing}
        placeholder="Location"
      />
      <select
        value={params.eventType || "meetup"}
        onChange={(e) => onChange({ ...params, eventType: e.target.value })}
        disabled={!isEditing}
      >
        <option value="conference">Conference</option>
        <option value="workshop">Workshop</option>
        <option value="concert">Concert</option>
        <option value="meetup">Meetup</option>
        <option value="seminar">Seminar</option>
      </select>
    </div>
  );
}
```

## Implementation Checklist

### Phase 1: Backend (🚧 IN PROGRESS)
- [x] Add `humanInLoopEnabled` to AI context
- [ ] Create `aiToolDrafts` schema
- [ ] Add draft mutations (create, approve, reject, update)
- [ ] Add draft queries (getPendingDrafts, getDraft)
- [ ] Create draft execution action
- [ ] Modify `sendMessage` action to handle HITL mode
- [ ] Add `humanInLoopEnabled` parameter to action

### Phase 2: UI Components (📋 PENDING)
- [x] Add HITL toggle to chat input
- [ ] Create `DraftEditor` component
- [ ] Create tool-specific draft forms (Contact, Event)
- [ ] Create generic draft form fallback
- [ ] Integrate draft display in detail pane
- [ ] Add draft items to tool execution panel
- [ ] Add clickable links to created records

### Phase 3: Integration (🔄 PENDING)
- [ ] Connect draft approval to execution flow
- [ ] Handle draft rejection cleanup
- [ ] Add draft editing workflow
- [ ] Test with multiple tool types
- [ ] Add loading states and error handling
- [ ] Add confirmation dialogs for approve/reject

### Phase 4: Polish (✨ PENDING)
- [ ] Add animations for draft state changes
- [ ] Add keyboard shortcuts (approve = Enter, reject = Escape)
- [ ] Add draft expiration (auto-reject after 24 hours)
- [ ] Add bulk approve/reject for multiple drafts
- [ ] Add draft history view
- [ ] Add undo for rejected drafts (within 5 minutes)

## Testing Plan

### Test Scenarios
1. **Basic HITL Flow**:
   - Enable HITL mode
   - Ask AI to create contact
   - Verify draft appears in detail pane
   - Approve draft
   - Verify contact created

2. **Draft Editing**:
   - Create draft
   - Click "Edit"
   - Modify fields
   - Save changes
   - Approve modified draft

3. **Draft Rejection**:
   - Create draft
   - Reject draft
   - Verify nothing created in database
   - Verify draft marked as rejected

4. **Multiple Drafts**:
   - Create 3 contacts with HITL enabled
   - Approve 1st, reject 2nd, edit 3rd
   - Verify correct outcomes

5. **Toggle Mid-Conversation**:
   - Start with HITL disabled
   - Create 2 contacts (auto-execute)
   - Enable HITL
   - Create 2 more contacts (drafts)
   - Verify correct behavior

## Future Enhancements

1. **Smart Defaults**: AI suggests reasonable defaults for optional fields
2. **Validation Preview**: Show validation errors before approval
3. **Bulk Operations**: Create 10 contacts → review all in one view
4. **Conditional HITL**: Auto-execute simple tasks, draft complex ones
5. **Draft Templates**: Save common drafts as templates
6. **Collaboration**: Multiple users can review/approve drafts
7. **Audit Trail**: Track who approved/rejected what and when

## Benefits

✅ **Safety**: Prevents accidental data creation/modification
✅ **Control**: User has final say on all AI actions
✅ **Transparency**: User sees exactly what AI wants to do
✅ **Flexibility**: Can edit AI suggestions before execution
✅ **Learning**: Users learn platform features by reviewing drafts
✅ **Confidence**: Reduces anxiety about AI making mistakes

## Current Status

**Completed** (✅):
- HITL toggle in UI
- Context state management

**In Progress** (🚧):
- Backend draft architecture
- Database schema

**Pending** (📋):
- Draft detail pane
- Editable forms
- Execution workflow

**Estimated Completion**: 2-3 hours of focused development
