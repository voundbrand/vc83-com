# Tool Approval System Design (Claude Code-Inspired)

## Problem Statement

**Current Issue**: The "Review" toggle is confusing because:
- AI says "I'll create X" but then just stops waiting
- User doesn't know they need to respond with "yes, do it"
- No clear UI indicating approval is needed
- All-or-nothing mode (all tools need approval or none)

**Desired Behavior** (like Claude Code):
- AI says "I want to do X"
- **Approval prompt immediately appears** with clear options
- User can approve/reject specific actions
- User can set preferences to avoid repeated prompts
- Conversation flow is natural and obvious

## User Experience Flow

### Scenario: User asks AI to create a contact

**Current (Broken) Flow:**
```
User: "Create contact John Doe at Acme Corp"
  ↓
AI: "I'll create the contact for you..."
  ↓
[NOTHING HAPPENS - User confused]
  ↓
User: "Did you do it?"
  ↓
AI: "I was waiting for your approval..."
```

**New (Claude Code-Style) Flow:**
```
User: "Create contact John Doe at Acme Corp"
  ↓
AI: "I'll create the contact John Doe (john@acme.com) at Acme Corp"
  ↓
[Approval Prompt Appears in Detail Panel]
┌─────────────────────────────────────────┐
│ AI wants to create a contact            │
│                                         │
│ Name: John Doe                          │
│ Email: john@acme.com                    │
│ Company: Acme Corp                      │
│                                         │
│ [1] Yes                                 │
│ [2] Yes, and don't ask again            │
│ [3] No                                  │
│ [ ] Custom instruction...               │
└─────────────────────────────────────────┘
  ↓
User clicks "Yes" or presses "1"
  ↓
AI: "✅ Contact created successfully. View contact →"
```

## Architecture

### 1. Tool Execution States

```typescript
type ToolExecutionState =
  | "proposed"      // AI wants to execute, waiting for approval
  | "approved"      // User approved, executing now
  | "executing"     // Currently running
  | "completed"     // Successfully executed
  | "rejected"      // User said no
  | "failed"        // Execution failed
```

### 2. Approval Preferences

Store user preferences for auto-approval:

```typescript
// In localStorage or database
interface ApprovalPreferences {
  autoApprove: {
    // Tool name → should auto-approve?
    create_contact: boolean;
    update_contact: boolean;
    create_event: boolean;
    send_email_campaign: boolean;
    // ... etc
  };
  // When user clicks "Yes, and don't ask again"
  // we set the corresponding tool to true
}
```

### 3. Backend Schema Changes

```typescript
// convex/schema.ts
aiToolExecutions: defineTable({
  conversationId: v.id("aiConversations"),
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  toolName: v.string(),
  parameters: v.any(),

  // NEW FIELDS
  state: v.union(
    v.literal("proposed"),
    v.literal("approved"),
    v.literal("executing"),
    v.literal("completed"),
    v.literal("rejected"),
    v.literal("failed")
  ),

  // For AI to explain what it wants to do
  proposalMessage: v.optional(v.string()), // "Create contact John Doe at Acme Corp"

  // User's response
  userResponse: v.optional(v.union(
    v.literal("approve"),
    v.literal("reject"),
    v.literal("custom")
  )),
  customInstruction: v.optional(v.string()), // If user chooses custom

  // Existing fields
  result: v.optional(v.any()),
  error: v.optional(v.string()),
  executedAt: v.number(),
  durationMs: v.optional(v.number()),
})
```

### 4. AI Chat Flow Modifications

**Current Flow:**
```typescript
// convex/ai/chat.ts
// AI wants to use tool → Execute immediately
const toolResult = await executeTool(toolName, params);
```

**New Flow:**
```typescript
// convex/ai/chat.ts
async function handleToolCall(toolCall, ctx) {
  // Check if user has auto-approve preference
  const prefs = await getApprovalPreferences(ctx.userId, ctx.organizationId);

  if (prefs.autoApprove[toolCall.function.name]) {
    // Auto-approve: execute immediately
    return await executeTool(toolCall.function.name, params);
  }

  // Needs approval: Create proposed execution
  const executionId = await ctx.runMutation(api.ai.conversations.proposeToolExecution, {
    conversationId,
    organizationId,
    userId,
    toolName: toolCall.function.name,
    parameters: params,
    proposalMessage: `Execute ${toolCall.function.name} with the following parameters`,
  });

  // Return pending status to AI
  return {
    status: "pending_approval",
    executionId,
    message: "This action requires user approval. Please wait for confirmation.",
  };
}
```

### 5. Frontend Components

#### A. ToolApprovalPrompt Component

```tsx
// src/components/window-content/ai-chat-window/four-pane/tool-approval-prompt.tsx

interface ToolApprovalPromptProps {
  execution: {
    _id: Id<"aiToolExecutions">;
    toolName: string;
    parameters: Record<string, unknown>;
    proposalMessage?: string;
  };
  onApprove: (executionId: Id<"aiToolExecutions">, dontAskAgain: boolean) => Promise<void>;
  onReject: (executionId: Id<"aiToolExecutions">) => Promise<void>;
  onCustomInstruction: (executionId: Id<"aiToolExecutions">, instruction: string) => Promise<void>;
}

export function ToolApprovalPrompt({
  execution,
  onApprove,
  onReject,
  onCustomInstruction
}: ToolApprovalPromptProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  // Keyboard shortcuts (1, 2, 3)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "1") onApprove(execution._id, false);
      if (e.key === "2") onApprove(execution._id, true);
      if (e.key === "3") onReject(execution._id);
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [execution._id, onApprove, onReject]);

  return (
    <div className="border-2 p-4 rounded" style={{
      borderColor: 'var(--warning)',
      background: 'var(--warning-bg)'
    }}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          {getToolActionTitle(execution.toolName)}
        </h3>
      </div>

      {/* Parameters Preview */}
      <div className="mb-4 p-3 rounded" style={{
        background: 'var(--win95-bg)',
        borderLeft: '3px solid var(--warning)'
      }}>
        <ToolParametersPreview
          toolName={execution.toolName}
          parameters={execution.parameters}
        />
      </div>

      {/* Custom Instruction Input */}
      {showCustomInput && (
        <div className="mb-3">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Tell the AI what to do instead..."
            className="w-full p-2 border rounded"
            rows={3}
          />
          <button
            onClick={() => {
              onCustomInstruction(execution._id, customText);
              setCustomText("");
              setShowCustomInput(false);
            }}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
          >
            Send Instruction
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => onApprove(execution._id, false)}
          className="w-full px-4 py-2 text-left rounded border-2 hover:bg-blue-50 transition-colors"
          style={{
            borderColor: 'var(--win95-highlight)',
            background: 'var(--win95-highlight-subtle)'
          }}
        >
          <span className="font-bold" style={{ color: 'var(--win95-highlight)' }}>1</span>
          {" "}Yes
        </button>

        <button
          onClick={() => onApprove(execution._id, true)}
          className="w-full px-4 py-2 text-left rounded border hover:bg-gray-50 transition-colors"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)'
          }}
        >
          <span className="font-bold" style={{ color: 'var(--win95-text-muted)' }}>2</span>
          {" "}Yes, and don't ask again
        </button>

        <button
          onClick={() => onReject(execution._id)}
          className="w-full px-4 py-2 text-left rounded border hover:bg-gray-50 transition-colors"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)'
          }}
        >
          <span className="font-bold" style={{ color: 'var(--win95-text-muted)' }}>3</span>
          {" "}No
        </button>

        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="w-full px-4 py-2 text-left rounded border hover:bg-gray-50 transition-colors text-sm"
          style={{
            borderColor: 'var(--win95-border-light)',
            background: 'var(--win95-bg)',
            color: 'var(--win95-text-muted)'
          }}
        >
          Tell the AI what to do instead
        </button>
      </div>
    </div>
  );
}
```

#### B. ToolParametersPreview Component

```tsx
// Tool-specific parameter previews
function ToolParametersPreview({ toolName, parameters }: {
  toolName: string;
  parameters: Record<string, unknown>;
}) {
  if (toolName === "create_contact") {
    return (
      <div className="space-y-1 text-sm">
        <div><strong>Name:</strong> {parameters.firstName} {parameters.lastName}</div>
        <div><strong>Email:</strong> {parameters.email}</div>
        {parameters.phone && <div><strong>Phone:</strong> {parameters.phone}</div>}
        {parameters.company && <div><strong>Company:</strong> {parameters.company}</div>}
      </div>
    );
  }

  if (toolName === "create_event") {
    return (
      <div className="space-y-1 text-sm">
        <div><strong>Title:</strong> {parameters.title}</div>
        {parameters.description && <div><strong>Description:</strong> {parameters.description}</div>}
        <div><strong>Date:</strong> {new Date(parameters.startDate).toLocaleDateString()}</div>
        {parameters.location && <div><strong>Location:</strong> {parameters.location}</div>}
      </div>
    );
  }

  // Generic fallback
  return (
    <pre className="text-xs overflow-auto">
      {JSON.stringify(parameters, null, 2)}
    </pre>
  );
}
```

#### C. Integration in DetailView

```tsx
// src/components/window-content/ai-chat-window/four-pane/detail-view.tsx

export function DetailView() {
  const { currentConversationId } = useAIChatContext();

  // Query pending tool executions
  const pendingExecutions = useQuery(
    api.ai.conversations.getPendingToolExecutions,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  );

  // Mutations
  const approveExecution = useMutation(api.ai.conversations.approveToolExecution);
  const rejectExecution = useMutation(api.ai.conversations.rejectToolExecution);

  const handleApprove = async (executionId: Id<"aiToolExecutions">, dontAskAgain: boolean) => {
    // Update preferences if "don't ask again"
    if (dontAskAgain) {
      const execution = pendingExecutions?.find(e => e._id === executionId);
      if (execution) {
        await updateApprovalPreference(execution.toolName, true);
      }
    }

    // Approve and execute
    await approveExecution({ executionId });
  };

  const handleReject = async (executionId: Id<"aiToolExecutions">) => {
    await rejectExecution({ executionId });
  };

  // Show approval prompt if there are pending executions
  if (pendingExecutions && pendingExecutions.length > 0) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-sm font-bold">Approval Required</h2>
        {pendingExecutions.map(execution => (
          <ToolApprovalPrompt
            key={execution._id}
            execution={execution}
            onApprove={handleApprove}
            onReject={handleReject}
            onCustomInstruction={handleCustomInstruction}
          />
        ))}
      </div>
    );
  }

  // ... rest of detail view (work items, etc)
}
```

### 6. Backend Mutations

```typescript
// convex/ai/conversations.ts

export const proposeToolExecution = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    toolName: v.string(),
    parameters: v.any(),
    proposalMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiToolExecutions", {
      ...args,
      state: "proposed",
      executedAt: Date.now(),
    });
  },
});

export const approveToolExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.state !== "proposed") {
      throw new Error("Execution not found or not in proposed state");
    }

    // Mark as approved
    await ctx.db.patch(args.executionId, {
      state: "approved",
      userResponse: "approve",
    });

    // Execute via action
    await ctx.scheduler.runAfter(0, api.ai.drafts.executeApprovedTool, {
      executionId: args.executionId,
    });
  },
});

export const rejectToolExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.state !== "proposed") {
      throw new Error("Execution not found or not in proposed state");
    }

    await ctx.db.patch(args.executionId, {
      state: "rejected",
      userResponse: "reject",
    });
  },
});

export const getPendingToolExecutions = query({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiToolExecutions")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("state"), "proposed"))
      .order("desc")
      .collect();
  },
});
```

## UI/UX Details

### Visual States

1. **Pending Approval** (Detail Panel):
   - Yellow/orange border (warning color)
   - Large, obvious action buttons
   - Keyboard shortcuts visible (1, 2, 3)
   - Parameters clearly displayed

2. **Approved** (Tool Execution Panel):
   - Blue/green indicator
   - Shows "Executing..." animation
   - Collapses approval prompt

3. **Rejected** (Tool Execution Panel):
   - Gray/muted indicator
   - Shows "Rejected by user"
   - Removed from detail panel

### Keyboard Shortcuts

- `1` = Yes
- `2` = Yes, and don't ask again
- `3` = No
- `Escape` = Dismiss / No

### Mobile Considerations

- On small screens, show approval prompt as full-screen modal
- Touch-friendly button sizes
- Swipe gestures: swipe right = approve, swipe left = reject

## Migration Plan

### Phase 1: Backend Foundation
1. Add `state` field to `aiToolExecutions` schema
2. Create approval mutations
3. Modify AI chat flow to create proposed executions

### Phase 2: UI Components
1. Build `ToolApprovalPrompt` component
2. Build `ToolParametersPreview` component
3. Integrate into `DetailView`

### Phase 3: Preferences
1. Add approval preferences storage
2. Implement "don't ask again" logic
3. Add preference management UI

### Phase 4: Replace Review Toggle
1. Remove old "Review" button
2. Add "Always ask for approval" toggle in settings
3. Update documentation

## Benefits Over Current System

✅ **Crystal clear UX** - User always knows what's happening
✅ **Contextual approval** - See what will happen before it happens
✅ **Selective automation** - Auto-approve safe actions, review risky ones
✅ **Natural conversation flow** - AI proposes, user responds
✅ **Keyboard shortcuts** - Power users can approve quickly
✅ **Remembers preferences** - Reduces interruptions over time
✅ **Better than Claude Code** - We show parameters inline, not just action name

## Testing Checklist

- [ ] Create contact with approval required
- [ ] Approve with "don't ask again" → next contact auto-approves
- [ ] Reject action → nothing created
- [ ] Custom instruction → AI adjusts and re-proposes
- [ ] Multiple pending approvals queue properly
- [ ] Keyboard shortcuts work (1, 2, 3)
- [ ] Mobile modal displays correctly
- [ ] Preferences persist across sessions
