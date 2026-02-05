# Phase 3: Execution Engine

**Goal**: Make workflows actually run — trigger-based execution, real-time status visualization, node-level logging, and integration with existing behaviorExecutor.

**Estimated Duration**: 5-7 days

---

## Implementation Tasks

### 1. Execution Mode Toggle

- [ ] Add mode selector to top bar: Design | Test | Live
- [ ] **Design Mode** (default): Canvas editing, node placement, configuration
- [ ] **Test Mode**: Send sample data through workflow, see results at each step
- [ ] **Live Mode**: Workflow is active, processing real events

- [ ] Implement mode switching:
  - [ ] Design → Test: Validate all nodes configured
  - [ ] Test → Live: Confirm execution settings, activate triggers
  - [ ] Live → Design: Deactivate workflow, show confirmation dialog

### 2. Trigger Configuration

- [ ] Implement trigger node configuration for each type:

  **Form Submitted**:
  - [ ] Select form (dropdown of LC Forms)
  - [ ] Map form fields to workflow variables
  - [ ] Test: Submit sample form data

  **Payment Received**:
  - [ ] Select payment provider (Stripe, LC Checkout, etc.)
  - [ ] Filter by amount, product, or status
  - [ ] Test: Send sample payment event

  **Booking Created**:
  - [ ] Select booking calendar (LC Bookings)
  - [ ] Filter by event type, resource
  - [ ] Test: Create sample booking

  **Contact Created/Updated**:
  - [ ] Select CRM (LC CRM, HubSpot, etc.)
  - [ ] Filter by tags, pipeline stage, or field changes
  - [ ] Test: Create sample contact

  **Webhook Received**:
  - [ ] Generate unique webhook URL
  - [ ] Show webhook URL for user to configure in external service
  - [ ] Test: Send sample webhook payload

  **Schedule (Cron)**:
  - [ ] Cron expression builder (simple UI for common patterns)
  - [ ] Preview next 5 run times
  - [ ] Test: Trigger manually

  **Manual Trigger**:
  - [ ] Add "Run Now" button in workflow
  - [ ] Optionally provide input data

  **Email Received**:
  - [ ] Generate unique email address (e.g., workflow-{id}@layers.l4yercak3.com)
  - [ ] Show email address for user to forward to
  - [ ] Test: Send sample email

  **Chat Message Received**:
  - [ ] Select channel (WhatsApp, Telegram, etc.)
  - [ ] Filter by sender, keywords, or message type
  - [ ] Test: Send sample message

### 3. Graph Execution Engine (New — Not Extending behaviorExecutor)

The existing behaviorExecutor is a linear pipeline (sorted by priority, flat context merge). Layers requires a DAG-based graph engine. We build new, but delegate to existing behaviors for LC Native nodes.

- [x] Create graph execution engine:
  - [x] Topological sort of workflow DAG from trigger node(s)
  - [x] Execute nodes following edge connections (not priority order)
  - [x] Handle branching (if/then → follow matching output handle)
  - [x] Handle parallel paths (independent branches execute concurrently)
  - [x] Handle merge nodes (wait for all incoming edges before continuing)
  - [ ] Handle loops (with max iteration limit, default 100)
  - [x] Per-edge data mapping (resolve source fields → target fields at each edge)

- [ ] Implement async execution model:
  - [ ] Queue-based: trigger → enqueue job → worker picks up → executes graph
  - [ ] Use Convex scheduled functions for async execution
  - [ ] Support long-running workflows (wait/delay nodes may pause for hours/days)
  - [ ] Execution state persisted so workflows survive restarts

- [x] Implement Dynamic Node Registry:
  - [x] `registerNodeType(type, executor, inputSchema, outputSchema)`
  - [x] Resolve executor at runtime by node type (no static switch statement)
  - [x] Registration happens at module load time
  - [x] Must support 50+ node types without dispatcher changes

- [ ] Implement node executors by category:

  **LC Native Nodes (via Behavior Adapter — REUSE existing code)**:
  - [x] Create `BehaviorAdapter` that wraps existing behaviorExecutor
  - [x] Translation layer: Layers node config → behavior params
  - [x] Translation layer: behavior result → Layers node output
  - [x] Reuse existing credit deduction and licensing checks
  - [x] Mapped behaviors:
    - LC CRM → `create-contact`, `detect-employer-billing`
    - LC Email → `send-confirmation-email`, `send-admin-notification`
    - LC Invoice → `generate-invoice`, `consolidated-invoice-generation`
    - LC Checkout → `create-transaction`, `calculate-pricing`
    - LC Tickets → `create-ticket`
    - LC Forms → `create-form-response`, `validate-registration`
    - LC Events → `check-event-capacity`, `update-statistics`
    - LC ActiveCampaign → `activecampaign-sync`

  **Integration Nodes (NEW)**:
  - [ ] Call integration APIs via IntegrationAdapter interface
  - [ ] Reuse existing OAuth/API key credentials from integrations window
  - [ ] Map input data to API parameters (per-node action config)
  - [ ] Parse API response, extract output fields
  - [ ] Handle errors (retry with backoff, fail, skip — configurable per node)

  **Logic Nodes (NEW)**:
  - [x] **If/Then**: Evaluate condition via expression evaluator (jsonlogic or similar), route to matching output handle
  - [x] **Wait/Delay**: Persist execution state, schedule resume via Convex cron
  - [x] **Split (A/B)**: Randomly route to one of multiple paths (weighted)
  - [x] **Merge**: Collect inputs from all incoming edges, combine into single context
  - [ ] **Loop**: Iterate over array field, execute sub-graph for each item
  - [x] **Filter**: Evaluate condition on each item, pass matching items only
  - [x] **Transform**: Apply data transformation (field rename, format, calculate)
  - [ ] **HTTP Request**: Make custom HTTP call (GET, POST, PUT, DELETE) with templated URL/body
  - [ ] **Code Block**: Execute custom JavaScript (sandboxed, resource-limited)

- [x] Implement expression evaluator (replaces simple string matcher):
  - [x] Support operators: ==, !=, >, <, >=, <=, in, contains, startsWith, endsWith
  - [x] Support logical: AND, OR, NOT
  - [x] Support nested conditions
  - [x] Support variable references: `{{nodes.node-1.email}}`, `{{trigger.formData.name}}`
  - [x] Consider jsonlogic library or build lightweight custom evaluator

### 4. Data Mapping & Context

- [ ] Implement workflow context object:
  ```typescript
  {
    trigger: { /* original trigger data */ },
    variables: { /* user-defined variables */ },
    nodes: {
      [nodeId]: { /* node output data */ }
    },
    execution: {
      id: string,
      workflow_id: string,
      started_at: number,
      status: 'running' | 'completed' | 'failed',
    }
  }
  ```

- [ ] Implement data mapping UI for edges:
  - [ ] Click edge → open data mapper
  - [ ] Show source node outputs (fields)
  - [ ] Show target node inputs (fields)
  - [ ] Drag to map source → target
  - [ ] Support transformations (format, filter, calculate)

- [ ] Variable system:
  - [ ] Define workflow-level variables (constants, secrets)
  - [ ] Reference variables in node config: `{{variables.api_key}}`
  - [ ] Reference node outputs: `{{nodes.node-1.email}}`
  - [ ] Support expressions: `{{nodes.node-1.total * 1.1}}`

### 5. Real-Time Execution Visualization

- [ ] Show execution status on canvas (in Live or Test mode):
  - [ ] Trigger fires: pulse animation on trigger node
  - [ ] Node starts: border glows, status badge shows "running"
  - [ ] Node completes: status badge shows "completed", edge shows flowing particles
  - [ ] Node fails: status badge shows "error", red glow

- [ ] Implement flowing edge particles:
  - [ ] Animate particles along edge path (SVG animation or CSS)
  - [ ] Speed indicates data flow rate (faster = more active)
  - [ ] Color matches edge status (green = success, red = error)

- [ ] Add node badges for execution stats:
  - [ ] Count of items processed today
  - [ ] Success/fail ratio
  - [ ] Average processing time

### 6. Node Inspector: Execution Logs

- [ ] Add "Logs" tab to node inspector:
  - [ ] List recent executions for this specific node
  - [ ] Show timestamp, status, input data, output data, error message
  - [ ] Expand to see full JSON payload
  - [ ] Filter by status (all, success, error)

- [ ] Add "Test" tab to node inspector:
  - [ ] Send test data through this node in isolation
  - [ ] Show input form (pre-filled with sample data)
  - [ ] Execute node, show output result
  - [ ] Useful for debugging without running full workflow

### 7. Workflow Execution Logs

- [x] Create execution log storage in Convex:
  ```typescript
  {
    execution_id: string,
    workflow_id: string,
    trigger_type: string,
    trigger_data: any,
    started_at: number,
    completed_at?: number,
    status: 'running' | 'completed' | 'failed',
    nodes_executed: [
      {
        node_id: string,
        started_at: number,
        completed_at?: number,
        status: 'success' | 'error' | 'skipped',
        input: any,
        output?: any,
        error?: string,
      }
    ],
  }
  ```

- [ ] Create execution history panel (in workflow settings or separate tab):
  - [ ] List recent executions (last 100)
  - [ ] Show timestamp, trigger type, status, duration
  - [ ] Click to expand and see full execution trace
  - [ ] Filter by status, date range

### 8. Error Handling & Retry

- [ ] Implement error handling strategies (configurable per node):
  - [ ] **Fail**: Stop workflow, mark as failed
  - [ ] **Skip**: Continue to next node, log error
  - [ ] **Retry**: Retry up to N times with exponential backoff

- [ ] Add error notification system:
  - [ ] Send email/SMS to workflow owner on critical failure
  - [ ] Show error count badge on workflow in user's dashboard
  - [ ] Link to execution log with error details

- [ ] Add manual retry for failed executions:
  - [ ] "Retry" button in execution log
  - [ ] Re-run workflow from failed node (or from start)

### 9. Test Mode Implementation

- [ ] Implement test execution:
  - [ ] Switch to Test mode
  - [ ] Prompt for sample trigger data (or use pre-filled defaults)
  - [ ] Execute workflow step-by-step
  - [ ] Show result at each node (inline on canvas)
  - [ ] Don't commit changes (dry-run mode)

- [ ] Add step-through debugger (optional enhancement):
  - [ ] Pause at each node
  - [ ] Inspect context and variables
  - [ ] Step forward manually
  - [ ] Useful for complex workflows

### 10. Behavior Adapter Layer (Bridge to Existing System)

The adapter layer bridges the new graph engine to the existing behaviorExecutor. This is the key reuse point — all 16 existing behaviors work without modification.

- [x] Create `BehaviorAdapter` module:
  ```typescript
  // Translates Layers node execution into existing behavior calls
  interface BehaviorAdapter {
    // Map a Layers LC Native node type to its behavior type(s)
    getBehaviorType(nodeService: string, nodeAction: string): string;

    // Translate Layers node config → behavior config + context
    translateInput(
      nodeConfig: Record<string, any>,
      edgeInputs: Record<string, any>  // data from incoming edges
    ): { behaviorConfig: Record<string, any>; context: Record<string, any> };

    // Translate behavior result → Layers node output fields
    translateOutput(
      behaviorResult: { success: boolean; data?: any; error?: string }
    ): Record<string, any>;
  }
  ```

- [x] Implement mapping for each LC Native node:
  - [x] "LC CRM → Create Contact" → `create-contact` behavior
  - [x] "LC CRM → Detect Employer" → `detect-employer-billing` behavior
  - [x] "LC Email → Send Confirmation" → `send-confirmation-email` behavior
  - [x] "LC Email → Notify Admin" → `send-admin-notification` behavior
  - [x] "LC Invoice → Generate Invoice" → `generate-invoice` behavior
  - [x] "LC Invoice → Consolidated" → `consolidated-invoice-generation` behavior
  - [x] "LC Checkout → Create Transaction" → `create-transaction` behavior
  - [x] "LC Checkout → Calculate Pricing" → `calculate-pricing` behavior
  - [x] "LC Tickets → Create Ticket" → `create-ticket` behavior
  - [x] "LC Forms → Submit Response" → `create-form-response` behavior
  - [x] "LC Forms → Validate" → `validate-registration` behavior
  - [x] "LC Events → Check Capacity" → `check-event-capacity` behavior
  - [x] "LC Events → Update Stats" → `update-statistics` behavior
  - [x] "LC ActiveCampaign → Sync" → `activecampaign-sync` behavior

- [x] Preserve existing behavior guarantees:
  - [x] Credit deduction happens per behavior execution (unchanged)
  - [x] Licensing quota checks enforced (unchanged)
  - [x] Execution logs written to workflowExecutionLogs table (unchanged)

- [x] Reuse existing integrations:
  - [x] OAuth credentials from integrations window
  - [x] API clients (Stripe, ActiveCampaign, etc.)
  - [x] Error handling and rate limiting

### 11. Workflow Activation/Deactivation

- [ ] Add "Activate" button to top bar:
  - [ ] Validate all nodes configured
  - [ ] Validate all edges have data mappings (if required)
  - [ ] Activate all trigger listeners
  - [ ] Set workflow status to "active"

- [ ] Add "Deactivate" button:
  - [ ] Stop all trigger listeners
  - [ ] Set workflow status to "inactive"
  - [ ] Show confirmation dialog

- [ ] Show workflow status indicator in top bar:
  - [ ] Green dot = Active
  - [ ] Gray dot = Inactive
  - [ ] Red dot = Error (failed execution)

### 12. Performance & Scaling

- [ ] Implement execution queue (Convex or external queue):
  - [ ] Trigger fires → add to queue
  - [ ] Worker picks up job → executes workflow
  - [ ] Return result → update execution log

- [ ] Add rate limiting:
  - [ ] Limit executions per workflow (e.g., 1000/day for free tier)
  - [ ] Show usage stats in workflow settings
  - [ ] Warn when approaching limit

- [ ] Add execution timeout:
  - [ ] Kill workflow execution after 5 minutes (configurable)
  - [ ] Prevent infinite loops or stuck workflows

---

## Technical Details

### Execution Engine Pseudocode (Graph-Based)

```typescript
async function executeWorkflow(workflowId: string, triggerData: any) {
  const workflow = await getWorkflow(workflowId);
  const execution = await createExecution(workflowId, triggerData);

  const context: ExecutionContext = {
    trigger: triggerData,
    variables: workflow.variables,
    nodes: {},  // Per-node outputs keyed by node ID
    execution: { id: execution._id, workflow_id: workflowId, started_at: Date.now(), status: 'running' },
  };

  try {
    // Find trigger node(s) — entry points of the DAG
    const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');

    for (const trigger of triggerNodes) {
      await executeNode(trigger, context, workflow);
    }

    await updateExecution(execution._id, { status: 'completed', completed_at: Date.now() });
  } catch (error) {
    await updateExecution(execution._id, { status: 'failed', error: error.message, completed_at: Date.now() });
  }
}

async function executeNode(node: WorkflowNode, context: ExecutionContext, workflow: Workflow) {
  const nodeLog = { node_id: node.id, started_at: Date.now(), status: 'running' as const };

  try {
    // 1. Resolve input data from incoming edges (per-edge data mapping)
    const input = resolveEdgeInputs(node, context, workflow);

    // 2. Execute via dynamic node registry (NOT a static switch statement)
    const executor = nodeRegistry.getExecutor(node.service);
    let output: Record<string, any>;

    if (executor.type === 'lc_native') {
      // Delegate to existing behaviorExecutor via adapter
      output = await behaviorAdapter.execute(node, input, context);
    } else if (executor.type === 'integration') {
      // New integration adapter (OAuth/API clients)
      output = await integrationAdapter.execute(node, input, context);
    } else if (executor.type === 'logic') {
      // Logic node (if/then, loop, etc.)
      output = await logicExecutor.execute(node, input, context);
    } else {
      output = await executor.execute(node, input, context);
    }

    // 3. Store output per-node (not flat merge)
    context.nodes[node.id] = output;

    nodeLog.status = 'success';
    nodeLog.output = output;
    nodeLog.completed_at = Date.now();

    // 4. Find downstream nodes via outgoing edges
    const nextEdges = workflow.edges.filter(e => e.source === node.id);

    // For branching nodes (if/then), filter edges by output handle
    const activeEdges = node.type === 'logic'
      ? nextEdges.filter(e => e.sourceHandle === output._selectedHandle)
      : nextEdges;

    // Identify parallel branches vs sequential chains
    const parallelBranches = groupByTargetIndependence(activeEdges, workflow);

    // Execute parallel branches concurrently
    await Promise.all(
      parallelBranches.map(branch =>
        executeNode(
          workflow.nodes.find(n => n.id === branch.target)!,
          context,
          workflow
        )
      )
    );

  } catch (error) {
    nodeLog.status = 'error';
    nodeLog.error = error.message;
    nodeLog.completed_at = Date.now();

    // Per-node error handling (configured on each node)
    const errorStrategy = node.config.errorHandling || 'fail';
    if (errorStrategy === 'retry') {
      await retryWithBackoff(node, context, workflow, node.config.maxRetries || 3);
    } else if (errorStrategy === 'skip') {
      context.nodes[node.id] = { _skipped: true, _error: error.message };
      // Continue to next nodes
    } else {
      throw error; // 'fail' — propagate up
    }
  } finally {
    await appendNodeLog(context.execution.id, nodeLog);
  }
}

// Resolve input data using per-edge field mappings (not flat context merge)
function resolveEdgeInputs(
  node: WorkflowNode,
  context: ExecutionContext,
  workflow: Workflow
): Record<string, any> {
  const incomingEdges = workflow.edges.filter(e => e.target === node.id);
  const input: Record<string, any> = {};

  for (const edge of incomingEdges) {
    const sourceOutput = context.nodes[edge.source];
    if (edge.data_mapping) {
      // Apply field-level mapping: { "targetField": "sourceField" }
      for (const [targetField, sourceField] of Object.entries(edge.data_mapping)) {
        input[targetField] = resolveExpression(sourceField, sourceOutput, context);
      }
    } else {
      // No mapping defined — pass full source output
      Object.assign(input, sourceOutput);
    }
  }

  return input;
}
```

### Behavior Adapter Pseudocode (Bridge to Existing System)

```typescript
class BehaviorAdapterImpl implements BehaviorAdapter {
  async execute(
    node: WorkflowNode,
    input: Record<string, any>,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    // 1. Map Layers node to behavior type
    const behaviorType = this.getBehaviorType(node.service, node.config.action);
    // e.g., "lc_crm" + "create_contact" → "create-contact"

    // 2. Translate Layers input → behavior config + context
    const { behaviorConfig, behaviorContext } = this.translateInput(node.config, input);

    // 3. Call existing behaviorExecutor (unchanged)
    const result = await ctx.runAction(internal.workflows.behaviorExecutor.executeBehavior, {
      organizationId: context.execution.organizationId,
      behaviorType,
      config: behaviorConfig,
      context: behaviorContext,
    });
    // Credit deduction, licensing checks happen inside executeBehavior (unchanged)

    // 4. Translate behavior result → Layers output
    return this.translateOutput(result);
  }
}
```

---

## Success Criteria

- Workflows can be activated/deactivated
- Triggers fire and start workflow execution
- Nodes execute in correct order
- Data passes between nodes via context
- Real-time visualization shows execution progress
- Execution logs are stored and viewable
- Test mode works for debugging
- Error handling and retry work as expected
- Integration with behaviorExecutor successful

---

## Testing Checklist

- [ ] Create simple workflow: Form Trigger → LC CRM → LC Email
- [ ] Activate workflow, submit form, verify execution
- [ ] Check execution logs, verify all nodes succeeded
- [ ] Create workflow with If/Then logic, test both branches
- [ ] Create workflow with Loop, test iteration over array
- [ ] Test error handling: simulate API failure, verify retry
- [ ] Test Test Mode: run workflow with sample data, verify results
- [ ] Test manual trigger: click "Run Now", verify execution
- [ ] Test webhook trigger: send HTTP POST, verify workflow fires
- [ ] Test schedule trigger: set cron to run every minute, verify fires

---

## Known Limitations (Deferred to Later Phases)

- Third-party integrations limited to what's built (Phase 4)
- Real-time collaboration not implemented (Phase 5)
- Advanced monitoring/analytics not implemented (Phase 5)

---

## Next Phase

Once Phase 3 is complete, proceed to **Phase 4: Integration Expansion** where we build out third-party integrations (OAuth flows, API clients) based on upvote data and user demand.
