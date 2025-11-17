# Workflow Builder: Conditional Branching & Test Mode Implementation

## 📌 Context: Where We Left Off

We've successfully built an n8n-style workflow builder with:

### ✅ Completed Features (v1.0)
1. **Behavior-Only Pipeline** - Removed object nodes, workflows are pure behavior chains
2. **Visual Trigger Node** - Green start node showing trigger type (manual, API call, form submit, etc.)
3. **Custom Edges with + Buttons** - Click + on any arrow to insert behaviors between steps
4. **Drag-to-Reorder** - Drag nodes horizontally to change execution order (auto-recalculates priorities)
5. **Horizontal Flow** - Left→right execution by priority
6. **Insert Behavior Modal** - Quick behavior selection when clicking edge + buttons

### 🏗️ Current Architecture

**Key Files:**
```
src/components/window-content/workflows-window/workflow-builder/
├── index.tsx                      // Main builder component
├── workflow-canvas.tsx            // React Flow canvas with trigger + behaviors
├── trigger-node.tsx               // Green trigger start node
├── custom-edge-with-add.tsx       // Edges with + buttons
├── insert-behavior-modal.tsx      // Behavior insertion UI
├── behavior-config-panel.tsx      // Right panel for config
└── behavior-config-modal.tsx      // Individual behavior settings

convex/workflows/
├── workflowOntology.ts            // Workflow CRUD (objects optional now)
└── workflowExecution.ts           // Workflow execution engine (TBD for test mode)
```

**Data Model:**
```typescript
interface WorkflowBehavior {
  id: string;
  type: string;              // "validate", "transform", "conditional", etc.
  enabled: boolean;
  priority: number;          // Higher = executes first (leftmost)
  config?: Record<string, unknown>;
  triggers?: BehaviorTriggers;

  // NEW FIELDS NEEDED:
  outputs?: string[];        // For conditional branching: ["success", "error"]
  branches?: {               // For conditional branching
    [outputName: string]: {
      condition: string;     // JSON logic or expression
      nextBehaviorId?: string;
    }
  };
}

interface WorkflowExecution {
  triggerOn: string;
  requiredInputs?: string[];
  outputActions?: string[];
  errorHandling: "rollback" | "continue" | "notify";

  // NEW FIELDS NEEDED:
  testMode?: boolean;        // Is this a test run?
  testData?: Record<string, unknown>; // Sample input data
}
```

**Current Flow:**
```
[🎯 TRIGGER: API Call] → [Validate] → [Transform] → [Email]
                           ↓              ↓            ↓
                       priority: 100  priority: 90  priority: 80
```

## 🎯 Goal: Add Conditional Branching & Test Mode

### Part 1: Conditional Branching

**What n8n has:**
```
                    ┌→ [Send Success Email] → [Log Success]
[Validate Input] ──→┤
                    └→ [Send Error Email] → [Retry]
                         ↑
                    "IF validation fails"
```

**What we need to build:**

#### 1.1 Multi-Output Nodes
- Nodes can have multiple output handles (success/error/default/custom)
- Each output has a condition (JSON logic or expression)
- Connections store which output handle they connect from

**Visual Design:**
```
┌─────────────────────┐
│   Validate Input    │
│                     │
│  ○ Success (right)  │ ───→ [Transform Data]
│  ○ Error (bottom)   │ ───→ [Error Handler]
└─────────────────────┘
```

**Implementation Approach:**

**New Behavior Type: "conditional"**
```typescript
{
  type: "conditional",
  config: {
    conditions: [
      {
        name: "success",
        expression: "input.email != null && input.email.includes('@')",
        color: "#16a34a"  // Green
      },
      {
        name: "error",
        expression: "!conditions.success",  // Default fallback
        color: "#dc2626"  // Red
      }
    ]
  },
  outputs: ["success", "error"]
}
```

**Files to Create/Modify:**

1. **Create `conditional-behavior-node.tsx`**
   - Custom node with multiple output handles
   - Visual indicators for each branch
   - Condition labels

2. **Update `workflow-canvas.tsx`**
   - Support nodes with multiple outputs
   - Edge stores which output handle it uses
   - Color-code edges by branch type

3. **Create `condition-editor.tsx`**
   - UI for editing branch conditions
   - Expression builder or JSON logic editor
   - Test condition against sample data

4. **Update `insert-behavior-modal.tsx`**
   - Add "Conditional Logic" as behavior type
   - Pre-configure with 2 outputs (success/error)

**Edge Data Structure:**
```typescript
interface ConditionalEdge extends Edge {
  data: {
    outputHandle: string;  // "success" or "error"
    condition: string;     // Expression to evaluate
    color: string;         // Branch color
  }
}
```

**Execution Logic:**
```typescript
// In workflow execution engine
async function executeBehavior(behavior, inputData) {
  if (behavior.type === "conditional") {
    // Evaluate each condition
    for (const condition of behavior.config.conditions) {
      if (evaluateExpression(condition.expression, inputData)) {
        // Follow this branch
        return {
          output: condition.name,
          data: inputData
        };
      }
    }
  }

  // Normal behavior: single output
  return {
    output: "default",
    data: await executeBehaviorLogic(behavior, inputData)
  };
}
```

#### 1.2 Visual Branch Rendering

**Handle Positioning:**
```typescript
// In ConditionalBehaviorNode
<Handle
  type="source"
  position={Position.Right}
  id="success"
  style={{ top: '30%', background: '#16a34a' }}
/>
<Handle
  type="source"
  position={Position.Bottom}
  id="error"
  style={{ left: '50%', background: '#dc2626' }}
/>
```

**Edge Colors:**
```typescript
// Success edges: green
{ style: { stroke: '#16a34a' } }

// Error edges: red
{ style: { stroke: '#dc2626' } }
```

#### 1.3 Merging Branches

**Problem:** What if branches rejoin?
```
        ┌→ [Success Path] ──┐
[Check] ┤                   ├→ [Continue]
        └→ [Error Path] ────┘
```

**Solution:** Add "Merge" behavior type
```typescript
{
  type: "merge",
  config: {
    waitForAll: false,  // Execute when first branch arrives
    mergeStrategy: "first" | "latest" | "combine"
  }
}
```

---

### Part 2: Test Mode

**What n8n has:**
- "Execute Workflow" button with sample data
- Shows data at each step in real-time
- Highlights successful/failed nodes
- Displays execution time and output

**What we need to build:**

#### 2.1 Test Mode UI

**Top Bar Addition:**
```
[< Back] | Workflow Name | [🧪 Test] [💾 Save]
                              ↑
                         New button!
```

**Test Panel (slides in from bottom):**
```
┌─────────────────────────────────────────────┐
│ 🧪 Test Workflow                       [x]  │
├─────────────────────────────────────────────┤
│ Input Data (JSON):                          │
│ ┌─────────────────────────────────────────┐ │
│ │ {                                       │ │
│ │   "email": "test@example.com",         │ │
│ │   "name": "John Doe",                  │ │
│ │   "age": 30                            │ │
│ │ }                                       │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [▶ Run Test]           [Clear] [Load Sample]│
└──────────────────────────────────────────────┘
```

**Files to Create:**

1. **Create `test-mode-panel.tsx`**
   - JSON editor for input data
   - Run/Stop buttons
   - Sample data templates
   - Execution log viewer

2. **Create `execution-visualizer.tsx`**
   - Real-time node status updates
   - Data inspection popups
   - Execution timeline

3. **Update `workflow-canvas.tsx`**
   - Node status badges (running, success, failed)
   - Data preview on node click during test
   - Execution path highlighting

#### 2.2 Execution Engine Integration

**Backend: `convex/workflows/workflowExecution.ts`**

```typescript
// New test execution endpoint
export const testWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    testData: v.any(),  // Input data
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    const behaviors = workflow.customProperties.behaviors;

    // Execute in test mode
    const results = [];
    let currentData = args.testData;

    for (const behavior of sortByPriority(behaviors)) {
      const result = await executeBehavior(behavior, currentData, {
        testMode: true,
        captureOutput: true
      });

      results.push({
        behaviorId: behavior.id,
        status: result.status,  // "success" | "error"
        input: currentData,
        output: result.data,
        duration: result.duration,
        timestamp: Date.now()
      });

      currentData = result.data;

      // Handle conditional branching
      if (result.output) {
        // Follow branch based on output
      }
    }

    return {
      success: true,
      results,
      finalOutput: currentData
    };
  }
});
```

#### 2.3 Real-Time Status Updates

**Frontend State Management:**
```typescript
// In workflow-canvas.tsx
const [executionState, setExecutionState] = useState<{
  running: boolean;
  currentBehaviorId?: string;
  results: Map<string, ExecutionResult>;
}>({
  running: false,
  results: new Map()
});

// Update node appearance based on execution
const getNodeStyle = (behaviorId: string) => {
  const result = executionState.results.get(behaviorId);
  if (!result) return {};

  switch (result.status) {
    case "running":
      return { borderColor: '#3b82f6', animation: 'pulse 1s infinite' };
    case "success":
      return { borderColor: '#16a34a' };
    case "error":
      return { borderColor: '#dc2626' };
  }
};
```

**Execution Visualization:**
```typescript
// Behavior node during test
┌─────────────────────┐
│ ✅ Validate Input   │  ← Green checkmark = success
│                     │
│ ⏱️ 45ms             │  ← Execution time
│ 📊 View Data        │  ← Click to see input/output
└─────────────────────┘

// VS running state
┌─────────────────────┐
│ ⟳ Transform Data    │  ← Spinning loader
│                     │
│ Running...          │
└─────────────────────┘

// VS error state
┌─────────────────────┐
│ ❌ Send Email       │  ← Red X = failed
│                     │
│ Error: Invalid API  │  ← Error message
│ 🔍 Debug            │  ← Click to see stack trace
└─────────────────────┘
```

#### 2.4 Data Inspection

**Data Inspector Modal:**
```
┌──────────────────────────────────────┐
│ Data at: Transform Data              │
├──────────────────────────────────────┤
│ Input:                               │
│ {                                    │
│   "email": "test@example.com",      │
│   "name": "John Doe"                │
│ }                                    │
│                                      │
│ Output:                              │
│ {                                    │
│   "email": "test@example.com",      │
│   "firstName": "John",              │
│   "lastName": "Doe",                │
│   "fullName": "John Doe"            │
│ }                                    │
│                                      │
│ Transformations Applied:             │
│ ✓ Split name into first/last        │
│ ✓ Added fullName field              │
└──────────────────────────────────────┘
```

---

## 🚀 Implementation Plan

### Phase 1: Conditional Branching (1-2 weeks)

**Week 1: Basic Multi-Output**
- [ ] Create ConditionalBehaviorNode component
- [ ] Add multiple output handles (success/error)
- [ ] Update edge data model to store output handle
- [ ] Color-code edges by branch type
- [ ] Update canvas to render multi-output nodes

**Week 2: Condition Logic**
- [ ] Create ConditionEditor component
- [ ] Implement expression evaluator (use jsonlogic or similar)
- [ ] Add condition testing UI
- [ ] Update execution engine to handle branching
- [ ] Add merge behavior type

**Testing:**
```typescript
// Test case: Email validation workflow
Trigger: API Call
  ↓
[Validate Email]
  ├─ Success (email valid) → [Send Welcome Email]
  └─ Error (email invalid) → [Send Error Notification]
```

### Phase 2: Test Mode (1 week)

**Day 1-2: UI Components**
- [ ] Create TestModePanel component
- [ ] Add JSON input editor
- [ ] Create sample data templates
- [ ] Add Run/Stop buttons

**Day 3-4: Execution Engine**
- [ ] Create testWorkflow mutation
- [ ] Add execution result capture
- [ ] Implement real-time status updates
- [ ] Handle errors gracefully

**Day 5: Visualization**
- [ ] Add status badges to nodes
- [ ] Implement execution timeline
- [ ] Create data inspector modal
- [ ] Add execution path highlighting

**Testing:**
```typescript
// Test workflow with sample data
Input: { email: "test@example.com", name: "John" }

Expected Visualization:
[🎯 API Call] ✅
  ↓
[Validate] ✅ 45ms
  ↓ (success branch)
[Transform] ✅ 23ms
  ↓
[Email] ✅ 156ms

Final Output: { success: true, emailSent: true }
```

---

## 📋 Technical Decisions to Make

### Conditional Branching:

1. **Expression Language:**
   - Option A: JSON Logic (structured, safe) ✅ Recommended
   - Option B: JavaScript eval (flexible, dangerous)
   - Option C: Custom DSL (complex, powerful)

2. **Branch Rejoin Strategy:**
   - Wait for all branches? (AND logic)
   - Continue on first? (OR logic)
   - User-configurable?

3. **Max Branch Depth:**
   - Limit nested conditionals? (e.g., max 5 levels)
   - Prevent infinite loops?

### Test Mode:

1. **Data Storage:**
   - Store test runs in database?
   - Keep in memory only?
   - Export test results?

2. **Real-Time Updates:**
   - WebSocket for live updates?
   - Polling with short interval?
   - Optimistic UI updates?

3. **Error Handling:**
   - Stop on first error?
   - Continue and collect all errors?
   - User choice?

---

## 🎯 Success Criteria

### Conditional Branching:
- ✅ Can create IF/ELSE logic visually
- ✅ Multiple output handles render correctly
- ✅ Edges color-coded by branch type
- ✅ Conditions editable with UI
- ✅ Execution follows correct branch
- ✅ Branches can rejoin

### Test Mode:
- ✅ Can run workflow with sample data
- ✅ See real-time execution status
- ✅ Inspect data at each step
- ✅ View errors and debug info
- ✅ Export test results
- ✅ Load sample data templates

---

## 📚 Resources & References

**Libraries to Consider:**

1. **JSON Logic** (for conditions)
   ```bash
   npm install json-logic-js
   ```
   Docs: http://jsonlogic.com/

2. **Monaco Editor** (for JSON editing)
   ```bash
   npm install @monaco-editor/react
   ```
   Better JSON editing experience

3. **React JSON View** (for data inspection)
   ```bash
   npm install react-json-view
   ```
   Nice tree view for nested objects

**React Flow Documentation:**
- Multiple handles: https://reactflow.dev/examples/nodes/multiple-handles
- Custom edges: https://reactflow.dev/examples/edges/custom-edge
- Edge markers: https://reactflow.dev/examples/edges/edge-with-button

---

## 🔧 Quick Start Commands

When resuming this work:

```bash
# 1. Review current state
git log --oneline -10
git diff main

# 2. Check what we built
ls -la src/components/window-content/workflows-window/workflow-builder/

# 3. Run the app
npm run dev
npx convex dev

# 4. Navigate to Workflows window to see current implementation

# 5. Start with conditional branching:
# - Create conditional-behavior-node.tsx
# - Test with simple IF/ELSE workflow
```

---

## 💬 Continuation Prompt to Use

**Paste this when ready to continue:**

```
I'm continuing the workflow builder implementation. We previously built:
- Behavior-only pipeline (no objects)
- Visual trigger node
- Drag-to-reorder
- Edge + buttons for insertion

Now I need to add:
1. Conditional branching (IF/ELSE logic with multiple outputs)
2. Test mode (run with sample data, visualize execution)

Current files are in:
/src/components/window-content/workflows-window/workflow-builder/

See WORKFLOW_CONTINUATION_PROMPT.md for full context.

Let's start with Phase 1: Conditional Branching - Week 1.
First, create the ConditionalBehaviorNode component with multiple output handles (success/error).

The component should:
- Show 2 output handles (right side for success, bottom for error)
- Color-code handles (green for success, red for error)
- Display condition labels
- Integrate with existing workflow canvas

Ready to implement!
```

---

## 🎨 Visual Design Mockups

### Conditional Node:
```
┌─────────────────────────────┐
│   IF: Email is Valid        │
│   ┌─────────────────────┐   │
│   │ Condition:          │   │
│   │ email.includes('@') │   │
│   └─────────────────────┘   │
│                             │
│  ✅ Success  ───────────────┤ → [Send Welcome]
│                             │
│  ❌ Error   ────────────────┤ → [Send Error]
│                             │
└─────────────────────────────┘
```

### Test Mode Active:
```
┌────────────────────────────────────────┐
│ 🧪 TEST MODE ACTIVE                    │
│ Running with sample data...            │
└────────────────────────────────────────┘

[🎯 API Call] ✅ Done (12ms)
  ↓ (data: {...})
[Validate] ⟳ Running...

Test Input:
{ email: "test@example.com" }
```

Good luck! This should give you everything needed to pick up right where we left off! 🚀
