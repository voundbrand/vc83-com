# Phase 2.8 Step 2: 4-Layer Architecture — Hierarchy Awareness, Coordinator Agent & Guardrails

## Goal

Every agent in the platform knows which layer it operates at, what it can and can't do, and how to communicate across layers. A dedicated coordinator agent orchestrates cross-layer communication. Layer 4 introduces a new `customer_service` agent subtype distinct from the PM, handling end-customer conversations with strict guardrails. This transforms the platform from a flat multi-tenant system into a hierarchical agency engine with clear boundaries and escalation paths.

## Depends On

- Step 1 (Per-Org Telegram Bots) — per-org channels enable layer separation
- Step 11 (Agency Sub-Orgs) — parent-child org hierarchy
- Step 3 (Team Tools) — `tag_in_specialist` pattern for inter-agent communication
- Step 7 (Soul Evolution) — self-modification guardrails at each layer
- Phase 2.6 Layer 1-3 — existing approval, autonomy, and HITL patterns

## The 4 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: PLATFORM                                              │
│                                                                 │
│  System Bot (@l4yercak3_platform_bot)                           │
│  - Onboarding new agency owners via guided interview            │
│  - Platform-level operations, admin                             │
│  - Agent subtype: "system"                                      │
│  - Telegram channel: Platform bot DM                            │
│  - Tools: All platform admin tools                              │
│  - Autonomy: autonomous (platform-controlled)                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: AGENCY                                                │
│                                                                 │
│  Agency Owner's PM Agent                                        │
│  - Manages client portfolio (create/list/monitor sub-orgs)      │
│  - Deploys custom bots for clients                              │
│  - Reviews client agent performance                             │
│  - Agent subtype: "pm" (on agency org)                          │
│  - Telegram channel: Platform bot DM (agency owner)             │
│  - Tools: Agency tools + org management + deploy_telegram_bot   │
│  - Autonomy: autonomous or semi_autonomous                      │
│  - Guardrails: Cannot modify child org agents directly          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: CLIENT (Sub-Org)                                      │
│                                                                 │
│  Client PM Agent                                                │
│  - Manages sub-org operations, team, and analytics              │
│  - Configures customer-facing agent behavior                    │
│  - Proposes soul evolution for L4 agents                        │
│  - Agent subtype: "pm" (on sub-org)                             │
│  - Telegram channel: Custom bot (@ClientBrandBot) or platform   │
│  - Tools: Org management within sub-org only                    │
│  - Autonomy: supervised → autonomous (grows over time)          │
│  - Guardrails: Cannot access parent org data, no agency tools   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: END-CUSTOMER                                          │
│                                                                 │
│  Customer Service Agent (NEW subtype)                           │
│  - Handles external customer conversations                      │
│  - Answers product questions, takes bookings, provides support  │
│  - Agent subtype: "customer_service" (on sub-org)               │
│  - Telegram channel: Same custom bot as L3                      │
│  - Tools: Read-only + customer-facing actions only              │
│  - Autonomy: supervised or semi_autonomous                      │
│  - Guardrails: No org management, no soul modification,         │
│    no data export, no bulk operations                           │
└─────────────────────────────────────────────────────────────────┘
```

## What Already Exists

| Component | Status | Location |
|---|---|---|
| Agent autonomy levels (draft_only, supervised, autonomous) | Done | `convex/agentOntology.ts:191-195` |
| Approval queue infrastructure | Done | `convex/ai/agentApprovals.ts` |
| `checkNeedsApproval()` gate in execution pipeline | Done | `convex/ai/agentExecution.ts:985-996` |
| Tool filtering by autonomy level | Done | `convex/ai/agentExecution.ts:947-983` |
| Agent harness (self-awareness context in system prompt) | Done | `convex/ai/harness.ts` |
| Team roster in system prompt | Done | `convex/ai/harness.ts:134-159` |
| Agency model awareness in harness | Done | `convex/ai/harness.ts:186-201` |
| `tag_in_specialist` tool for intra-org agent-to-agent | Done | `convex/ai/tools/teamTools.ts` |
| Parent-child org hierarchy with `parentOrganizationId` | Done | `convex/schemas/coreSchemas.ts:72,145` |
| License-gated agency tools | Done | `convex/ai/agentExecution.ts:182-194` |
| Soul evolution proposal system | Done | `convex/ai/soulEvolution.ts` |
| Per-org Telegram bots (Step 1) | Planned | Step 1 of this phase |
| Risk classification (tool risk levels) | Documented | Phase 2.6 Layer 2 docs |
| Semi-autonomous tier | Documented | Phase 2.6 Layer 2 docs |

## What's Missing

### 1. Layer Identity in Agent Harness

Agents don't know which layer they operate at. The harness (`harness.ts`) includes org name, plan tier, and team roster, but not:
- Layer number (1-4)
- Parent org name (for sub-org agents)
- What data/actions are forbidden at their layer
- Escalation paths

### 2. Coordinator Agent Type

No dedicated agent for cross-layer orchestration. Currently, `tag_in_specialist` only works within the same org. There's no mechanism for:
- L3 agent escalating to L2 agency PM
- L2 agent pushing instructions to L3 agents
- L4 agent escalating to L3 PM

### 3. `customer_service` Agent Subtype

All sub-org agents are currently `subtype: "pm"`. There's no distinct agent type for handling end-customer conversations with restricted permissions. The PM handles both internal ops and customer-facing work.

### 4. Layer-Specific Tool Filtering

`filterToolsForAgent()` filters by autonomy level and `subOrgsEnabled`, but not by layer. A sub-org's L3 agent has access to the same tools as the agency L2 agent (minus agency tools). L4 agents need stricter filtering.

### 5. Cross-Layer Communication Tools

No tools exist for agents to communicate across organizational boundaries:
- `escalate_to_parent` — L3/L4 sends issue to L2
- `delegate_to_child` — L2 pushes task to L3
- `share_insight_upward` — L3 shares learnings with L2

### 6. Layer-Aware Deep Link Context Switching

When an agency owner uses deep links to test different sub-org agents (L3/L4), the system doesn't clearly communicate the context switch. The owner should know they're "entering" a different layer for testing.

## Architecture

### Layer Determination

Each agent's layer is determined by a combination of org hierarchy and agent subtype:

```typescript
function determineAgentLayer(
  org: Organization,
  agentSubtype: string
): 1 | 2 | 3 | 4 {
  // Layer 1: Platform org's system agent
  if (org._id === PLATFORM_ORG_ID && agentSubtype === "system") return 1;

  // Layer 2: Top-level org (no parent) — agency PM
  if (!org.parentOrganizationId && agentSubtype === "pm") return 2;

  // Layer 4: Sub-org's customer-facing agent
  if (org.parentOrganizationId && agentSubtype === "customer_service") return 4;

  // Layer 3: Sub-org's PM agent
  if (org.parentOrganizationId && agentSubtype === "pm") return 3;

  // Default: Layer 2 for top-level, Layer 3 for sub-org
  return org.parentOrganizationId ? 3 : 2;
}
```

### Cross-Layer Communication Flow

```
L4 (Customer Service) ──escalate──▶ L3 (Client PM)
         │                                 │
         │                          escalate/share
         │                                 │
         │                                 ▼
         │                          L2 (Agency PM)
         │                                 │
         │                          escalate (rare)
         │                                 │
         │                                 ▼
         └─────────────────────── L1 (Platform/System)

L2 (Agency PM) ──delegate──▶ L3 (Client PM)
L3 (Client PM) ──instruct──▶ L4 (Customer Service)
```

### Coordinator Agent Pattern

The coordinator is a lightweight agent (subtype: `"coordinator"`) that sits at L2 or L3 and handles cross-layer routing:

```
L3 Agent calls escalate_to_parent(issue)
    │
    ▼
Coordinator receives escalation
    │
    ├── Creates escalation record in DB
    ├── Notifies L2 PM agent (via internal message or Telegram)
    ├── Provides context summary from L3 conversation
    └── Tracks resolution status
```

The coordinator doesn't replace the PM — it routes. The PM makes decisions. The coordinator ensures messages cross layer boundaries cleanly.

## Implementation

### 1. Layer Awareness in Agent Harness

**File:** `convex/ai/harness.ts`

Add a new section to `buildHarnessContext()` after the existing org info block:

```typescript
// --- Layer Awareness ---
const layer = determineAgentLayer(org, config.subtype);

lines.push("");
lines.push("## Your Position in the Organization Hierarchy");
lines.push("");
lines.push(`**Layer:** ${layer} of 4`);
lines.push(`**Layer name:** ${LAYER_NAMES[layer]}`);

if (layer >= 3 && parentOrg) {
  lines.push(`**Parent agency:** ${parentOrg.name} (${parentOrg.planTier} tier)`);
}

if (layer === 2) {
  lines.push(`**Role:** You manage client sub-organizations and their agents.`);
  lines.push(`**You can:** Create sub-orgs, deploy bots, monitor client performance.`);
  lines.push(`**You cannot:** Directly modify client agent souls or execute tools on behalf of client agents.`);
}

if (layer === 3) {
  lines.push(`**Role:** You manage operations for "${org.name}" under the ${parentOrg?.name} agency.`);
  lines.push(`**You can:** Manage contacts, products, events, and team within your org.`);
  lines.push(`**You cannot:** Access parent agency data, create sub-orgs, or modify agency-level settings.`);
  lines.push(`**Escalation:** Use escalate_to_parent to send issues to your agency PM.`);
}

if (layer === 4) {
  lines.push(`**Role:** You handle customer conversations for "${org.name}".`);
  lines.push(`**You can:** Answer questions, search products, create bookings, log interactions.`);
  lines.push(`**You cannot:** Modify org settings, access analytics, manage team, or propose soul changes.`);
  lines.push(`**Escalation:** Use escalate_to_parent to send complex issues to the PM.`);
}
```

**Constants:**
```typescript
const LAYER_NAMES: Record<number, string> = {
  1: "Platform",
  2: "Agency",
  3: "Client",
  4: "End-Customer",
};
```

**New query needed:** Fetch parent org info for sub-org agents. Add to `agentExecution.ts` pipeline (before step 5.6 where system prompt is built):

```typescript
// Step 5.57: Fetch parent org info (for layer awareness)
let parentOrgInfo = null;
if (orgInfo?.parentOrganizationId) {
  parentOrgInfo = await ctx.runQuery(
    getInternal().organizations.getOrgById,
    { organizationId: orgInfo.parentOrganizationId }
  );
}
```

---

### 2. `customer_service` Agent Subtype

**File:** `convex/agentOntology.ts`

Add `"customer_service"` to the valid subtypes list. The existing pattern uses `subtype` as a string field in the agent's customProperties:

```typescript
// Valid agent subtypes:
// "pm" — Project Manager (general management)
// "sales_assistant" — Sales specialist
// "booking_agent" — Booking specialist
// "customer_service" — Customer-facing conversations (L4)  ← NEW
// "coordinator" — Cross-layer orchestration                ← NEW
```

**File:** `convex/onboarding/agencySubOrgBootstrap.ts`

When bootstrapping a sub-org, create TWO agents instead of one:
1. PM agent (subtype: `"pm"`, layer 3) — manages internal ops
2. Customer service agent (subtype: `"customer_service"`, layer 4) — handles end-customer conversations

The customer service agent is the one that receives inbound messages from the sub-org's Telegram bot. The PM agent handles messages from the agency owner.

**Routing logic update:** `agentOntology.getActiveAgentForOrg` needs to consider channel context:
- Inbound from external customer → route to `customer_service` agent
- Inbound from agency owner (via deep link or org switcher) → route to `pm` agent
- If no `customer_service` agent exists → fallback to `pm` (backward compatibility)

---

### 3. Layer-Specific Tool Filtering

**File:** `convex/ai/agentExecution.ts` — `filterToolsForAgent()`

Add layer-based filtering after autonomy filtering:

```typescript
// Layer-based tool restrictions
const layer = determineAgentLayer(org, config.subtype);

if (layer === 4) {
  // L4: Customer-facing — read-only + customer actions only
  const l4AllowedTools = new Set([
    "query_org_data", "search_contacts", "list_events", "list_products",
    "list_forms", "search_media", "search_unsplash_images",
    "get_form_responses", "create_contact", "create_booking",
    "escalate_to_parent",
  ]);
  schemas = schemas.filter((s) => l4AllowedTools.has(s.function.name));
}

if (layer === 3) {
  // L3: No agency tools, no platform admin
  const l3BlockedTools = new Set([
    "create_client_org", "list_client_orgs", "get_client_org_stats",
    "deploy_telegram_bot",
  ]);
  schemas = schemas.filter((s) => !l3BlockedTools.has(s.function.name));
}

// L2: Already handled by subOrgsEnabled check (agency tools gated by license)
// L1: No restrictions (platform admin)
```

---

### 4. Coordinator Agent

**New file:** `convex/ai/tools/coordinatorTools.ts`

Three cross-layer communication tools:

**`escalate_to_parent`:**
- Available to L3 and L4 agents
- Creates an escalation record (new object type: `"escalation"`)
- Sends notification to the parent org's PM agent via their Telegram channel
- Includes context summary from the current conversation

```typescript
export const escalateToParentTool: AITool = {
  name: "escalate_to_parent",
  description: "Escalate an issue to the parent agency's PM agent for resolution.",
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Brief summary of the issue" },
      severity: { type: "string", enum: ["low", "medium", "high"], description: "Issue severity" },
      context: { type: "string", description: "Relevant conversation context" },
    },
    required: ["summary", "severity"],
  },
  execute: async (ctx, args) => {
    // 1. Look up parent org
    // 2. Find parent PM agent
    // 3. Create escalation record
    // 4. Notify parent PM via Telegram (using parent's channel)
    // 5. Return escalation ID for tracking
  },
};
```

**`delegate_to_child`:**
- Available to L2 agents only
- Sends an instruction/task to a specific child org's PM agent
- Creates a delegation record with status tracking

```typescript
export const delegateToChildTool: AITool = {
  name: "delegate_to_child",
  description: "Send an instruction or task to a client sub-org's PM agent.",
  parameters: {
    type: "object",
    properties: {
      clientSlug: { type: "string", description: "Target client org slug" },
      instruction: { type: "string", description: "What the client PM should do" },
      priority: { type: "string", enum: ["low", "medium", "high"] },
    },
    required: ["clientSlug", "instruction"],
  },
};
```

**`share_insight_upward`:**
- Available to L3 and L4 agents
- Non-urgent sharing of learnings, patterns, or suggestions
- Stored as insights for the parent PM to review

```typescript
export const shareInsightUpwardTool: AITool = {
  name: "share_insight_upward",
  description: "Share a learning, pattern, or suggestion with the parent agency PM.",
  parameters: {
    type: "object",
    properties: {
      insight: { type: "string", description: "The insight to share" },
      category: { type: "string", enum: ["customer_trend", "product_feedback", "performance", "suggestion"] },
      evidence: { type: "string", description: "Supporting data or examples" },
    },
    required: ["insight", "category"],
  },
};
```

**File:** `convex/ai/tools/registry.ts`

Register all three tools. Gate by layer (not by license tier):
- `escalate_to_parent`: Available at L3, L4
- `delegate_to_child`: Available at L2 only
- `share_insight_upward`: Available at L3, L4

---

### 5. Coordinator Agent Bootstrap

**File:** `convex/onboarding/agencySubOrgBootstrap.ts`

Optionally create a coordinator agent during sub-org bootstrap:

```typescript
// Step 8b: Bootstrap coordinator agent (lightweight, no soul generation needed)
await ctx.runMutation(
  getInternal().agentOntology.createAgent,
  {
    organizationId: childOrgId,
    name: `${args.businessName} Coordinator`,
    subtype: "coordinator",
    customProperties: {
      displayName: `${args.businessName} Coordinator`,
      autonomyLevel: "autonomous",
      modelId: "anthropic/claude-haiku-4-5", // Lightweight model for routing
      isInternal: true, // Not customer-facing
    },
  }
);
```

The coordinator agent is internal-only — it never sends messages to external users. It only routes communications between layers.

---

### 6. Schema Additions

**File:** `convex/schemas/coreSchemas.ts` or new `convex/schemas/layerSchemas.ts`

New object types in the `objects` table:

```typescript
// Escalation record (cross-layer issue)
type: "escalation"
customProperties: {
  sourceOrganizationId: Id<"organizations">,
  targetOrganizationId: Id<"organizations">,
  sourceAgentId: Id<"objects">,
  targetAgentId: Id<"objects">,
  sourceLayer: 1 | 2 | 3 | 4,
  targetLayer: 1 | 2 | 3 | 4,
  summary: string,
  severity: "low" | "medium" | "high",
  context: string,
  status: "pending" | "acknowledged" | "resolved" | "dismissed",
  resolvedAt?: number,
  resolution?: string,
}

// Delegation record (parent → child task)
type: "delegation"
customProperties: {
  sourceOrganizationId: Id<"organizations">,
  targetOrganizationId: Id<"organizations">,
  instruction: string,
  priority: "low" | "medium" | "high",
  status: "pending" | "accepted" | "completed" | "rejected",
  completedAt?: number,
  result?: string,
}

// Insight record (child → parent learning)
type: "insight"
customProperties: {
  sourceOrganizationId: Id<"organizations">,
  targetOrganizationId: Id<"organizations">,
  insight: string,
  category: "customer_trend" | "product_feedback" | "performance" | "suggestion",
  evidence?: string,
  acknowledgedAt?: number,
}
```

These use the existing `objects` table pattern — no schema migration needed.

---

### 7. Deep Link Context Switching for Testing

**File:** `convex/onboarding/telegramResolver.ts`

When an agency owner uses a deep link to test a sub-org agent, the resolver should:
1. Detect that the user is the parent org's owner (via `telegramMappings` lookup + org membership check)
2. Add metadata indicating "testing mode" context switch
3. The agent can then greet appropriately: "Welcome to testing mode for [Client Name]. I'm their customer service agent."

```typescript
// In resolveChatToOrg, after deep link resolution:
if (deepLinkResult) {
  const isParentOwner = await checkIfParentOrgOwner(
    ctx, args.telegramChatId, deepLinkResult.organizationId
  );

  return {
    organizationId: deepLinkResult.organizationId,
    isNew: !existingDeepLink,
    routeToSystemBot: false,
    testingMode: isParentOwner,  // NEW: signals context switch
  };
}
```

The `testingMode` flag is passed through to `processInboundMessage` metadata, and the harness includes a note:

```
⚠️ TESTING MODE: This conversation is from the agency owner testing your capabilities.
Behave exactly as you would with a real customer, but acknowledge this is a test if asked.
```

## Layer Guardrail Matrix

| Capability | L1 Platform | L2 Agency | L3 Client | L4 Customer |
|---|---|---|---|---|
| Create sub-orgs | Yes | Yes | No | No |
| Deploy bots | Yes | Yes | No | No |
| Manage org settings | Yes | Own org | Own sub-org | No |
| Access parent org data | N/A | N/A | No | No |
| Access child org data | Yes | Yes (query) | N/A | N/A |
| Soul evolution | Yes | Propose | Propose | No |
| Bulk operations | Yes | Yes | Yes (limited) | No |
| Send external messages | Yes | Yes | Yes | Yes |
| Modify agents | Yes | Own agents | Own agents | No |
| Data export | Yes | Yes | Yes | No |
| Escalate up | N/A | To L1 (rare) | To L2 | To L3 |
| Delegate down | To L2 | To L3 | To L4 | N/A |

## Files Summary

| File | Change | Risk |
|---|---|---|
| `convex/ai/harness.ts` | Layer awareness section in system prompt | Medium |
| `convex/ai/agentExecution.ts` | Fetch parent org, layer-based tool filtering, testingMode metadata | Medium |
| `convex/agentOntology.ts` | Add `customer_service` and `coordinator` subtypes | Low |
| `convex/onboarding/agencySubOrgBootstrap.ts` | Bootstrap L4 agent + coordinator alongside PM | Low |
| `convex/ai/tools/coordinatorTools.ts` | **New file** — escalate, delegate, share tools | Medium |
| `convex/ai/tools/registry.ts` | Register coordinator tools, layer-gated | Low |
| `convex/onboarding/telegramResolver.ts` | Testing mode detection for deep link context switch | Low |
| `convex/schemas/layerSchemas.ts` | **Optional new file** — escalation, delegation, insight object types | None |

## Verification

1. **Layer identification**: Agent system prompt shows correct layer (1-4) based on org hierarchy + subtype
2. **L4 tool restriction**: Customer service agent can only use read-only + customer actions
3. **L3 tool restriction**: Sub-org PM cannot see agency tools
4. **Escalation flow**: L4 agent calls `escalate_to_parent` → L3 PM receives notification
5. **Delegation flow**: L2 agent calls `delegate_to_child` → L3 PM receives instruction
6. **Testing mode**: Agency owner uses deep link to test L4 agent → "TESTING MODE" indicator in harness
7. **Coordinator routing**: Escalation crosses org boundary correctly
8. **Backward compatibility**: Existing single-agent sub-orgs still work (PM handles everything if no L4 agent)
