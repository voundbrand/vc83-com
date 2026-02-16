# Harness Model — Agent Harness + Team Harness

> Defines the scoping, isolation, and coordination boundaries that govern agent behavior.

---

## Layer Taxonomy (Canonical)

Use the canonical layer contract:
- [FOUR_LAYER_PLATFORM_MODEL.md](./FOUR_LAYER_PLATFORM_MODEL.md)

This document mainly describes `PolicyLayer` behavior (Platform -> Org -> Agent -> Session).  
Do not mix this with `BusinessLayer` hierarchy (Platform -> Agency -> Sub-org -> End-customer).

---

## Why Harnesses?

An agent without a harness is a liability. It can use any tool, spend any amount, talk to anyone, and never ask for help. Harnesses enforce:

- **Scope** — what an agent can do
- **Budget** — what it can spend
- **Escalation** — when it must ask for help
- **Isolation** — what it can see and affect
- **Coordination** — how it works with other agents and humans

---

## Agent Harness (Single-Agent Boundary)

Every agent execution runs inside an agent harness. The harness is assembled at pipeline step 1-7 and governs steps 8-13.

### Components

```
Agent Harness
├── Identity
│   ├── agentId, displayName, subtype
│   ├── protected: boolean (immutable if true)
│   └── organizationId (tenant boundary)
│
├── Soul
│   ├── personality, traits, communication style
│   ├── coreValues, neverDo, alwaysDo
│   ├── escalationTriggers
│   ├── soulMarkdown (SOUL.md equivalent)
│   └── version (for rollback)
│
├── Tool Scope (resolved from 4 `PolicyLayer` levels)
│   ├── activeTools[] — final tool set for this execution
│   ├── disabledForSession[] — tools disabled by runtime errors
│   └── integrationRequirements — tools requiring connected services
│
├── Credit Budget
│   ├── sessionBudget — remaining credits for this session
│   ├── orgBudget — org-level daily remaining
│   └── parentBudget — parent org remaining (if sub-org)
│
├── Autonomy Rules
│   ├── autonomyLevel: supervised | autonomous | draft_only
│   ├── requireApprovalFor[] — specific tools needing human OK
│   └── blockedTopics[] — topics that trigger escalation
│
├── Rate Limits
│   ├── maxMessagesPerDay, maxCostPerDay
│   └── current counts (messages today, cost today)
│
├── Session Context
│   ├── sessionId, channel, externalContactIdentifier
│   ├── conversationHistory (last 20 messages)
│   ├── crmContact (if resolved)
│   ├── knowledgeBaseDocs (filtered by tags)
│   └── sessionMode: freeform | guided
│
├── Error State
│   ├── failedToolsThisSession: Map<toolName, failCount>
│   ├── llmRetriesUsed: number
│   └── isDegradedMode: boolean
│
└── Escalation State
    ├── humanEscalationRequested: boolean
    ├── escalationReason?: string
    └── pendingApprovals: number
```

### Harness Assembly (steps 1-7)

```typescript
// Pseudocode for harness assembly
function assembleHarness(orgId, channel, contactId): AgentHarness {
  // Step 1: Load agent
  const agent = await getActiveAgentForOrg(orgId);
  if (agent.protected) enforceImmutability(agent);

  // Step 2: Rate limits
  const limits = await checkRateLimits(agent, orgId);
  if (limits.exceeded) return errorResponse("rate_limited");

  // Step 3: Session
  const session = await resolveSession(agent, orgId, channel, contactId);
  if (session.isExpired()) session = await createNewSession(...);

  // Step 4: CRM + knowledge
  const contact = await resolveContact(orgId, contactId);
  const docs = await getKnowledgeDocs(orgId, agent.knowledgeBaseTags);

  // Step 5-6: Prompt + history
  const systemPrompt = buildPrompt(agent.soul, agent.brand, docs);
  const history = await getHistory(session, 20);

  // Step 7: Tool scoping (4 PolicyLayer levels)
  const tools = resolveToolScope({
    platform: getPlatformToolPolicy(),
    org: getOrgToolPolicy(orgId),
    agent: agent.toolConfig,
    session: session.errorState,
    integrations: getConnectedIntegrations(orgId),
  });

  // Step 7.5: Credit check
  const budget = await checkCredits(orgId, agent);

  return {
    agent, session, contact, docs,
    systemPrompt, history, tools, budget,
    escalation: { requested: false },
    errors: { failedTools: new Map(), retries: 0 },
  };
}
```

### Harness Enforcement During Execution (steps 8-13)

```
Before LLM call (step 8):
  ✓ Only activeTools[] in tool definitions
  ✓ System prompt includes soul + guardrails
  ✓ Credit budget sufficient

During tool execution (step 9):
  ✓ Check autonomy → queue approval if needed
  ✓ Check tool not in disabledForSession
  ✓ Check credit cost of tool
  ✓ Track failures in failedToolsThisSession
  ✓ If 3+ failures → disable tool, notify owner

Before channel send (step 13):
  ✓ Check channel binding exists
  ✓ Apply message formatting for channel
  ✓ Retry with backoff on failure
  ✓ Dead letter queue on persistent failure
```

---

## Team Harness (Multi-Agent Boundary)

The team harness wraps multiple agent harnesses when agents need to collaborate on a single conversation.

### When Is a Team Harness Created?

A team harness activates when:
1. An agent calls the `tag_in_agent` tool
2. A human operator assigns multiple agents to a session
3. An escalation trigger routes to a specialist agent
4. A group chat has multiple bound agents

### Components

```
Team Harness
├── Team Identity
│   ├── teamSessionId
│   ├── participatingAgentIds[]
│   ├── activeAgentId (who's currently responding)
│   └── organizationId (must be same org)
│
├── Handoff Protocol
│   ├── handoffHistory: [{from, to, reason, timestamp}]
│   ├── maxHandoffsPerSession: number (default: 5)
│   └── handoffCooldown: duration (prevent ping-pong)
│
├── Shared Context
│   ├── contextSummary: string (compressed shared state)
│   ├── customerProfile: object (CRM data visible to all)
│   ├── conversationGoal?: string (what we're trying to achieve)
│   └── handoffNotes: Map<agentId, string> (per-agent notes)
│
├── Human Escalation
│   ├── humanEscalationRequested: boolean
│   ├── humanEscalationReason?: string
│   ├── humanAgentUserId?: Id<"users">
│   └── humanTakeoverAt?: timestamp
│
├── Team Credit Budget
│   ├── teamBudgetRemaining: number (shared across all agents)
│   ├── perAgentSpend: Map<agentId, number>
│   └── budgetOwner: agentId (whose credits are consumed)
│
└── Coordination Rules
    ├── allowParallelExecution: boolean (default: false)
    ├── requireHandoffReason: boolean (default: true)
    ├── notifyOwnerOnHandoff: boolean (default: true)
    └── autoResumeAfterHuman: boolean (default: false)
```

### Handoff Protocol

```
Agent A handling conversation
  │
  │ Customer asks about billing
  │ Agent A recognizes it's outside its expertise
  │
  ▼
Agent A calls tag_in_agent tool
  │ Parameters:
  │   targetAgentId: "billing-specialist"
  │   reason: "Customer asking about invoice discrepancy"
  │   contextSummary: "Customer John, order #1234, paid $50 but expected $40"
  │   suggestedApproach: "Check invoice details, explain line items"
  │
  ▼
Team Harness validates handoff
  │ ✓ Target agent exists and is active
  │ ✓ Target agent is in same org
  │ ✓ Handoff count < maxHandoffsPerSession
  │ ✓ Not in cooldown period
  │ ✓ Credits sufficient for target agent
  │
  ▼
Team Harness executes handoff
  │ 1. Save Agent A's contextSummary to sharedContext
  │ 2. Set activeAgentId = Agent B
  │ 3. Record in handoffHistory
  │ 4. (Optional) Agent A sends transition message:
  │    "Let me connect you with our billing specialist..."
  │
  ▼
Agent B receives context
  │ System prompt includes:
  │   - Agent B's own soul
  │   - sharedContext from Agent A
  │   - handoffNotes
  │   - Last N messages from session
  │   - "You were tagged in because: [reason]"
  │
  ▼
Agent B responds to customer
  │ Customer sees seamless transition
  │
  ▼
(Later) Agent B can:
  ├── Continue handling
  ├── Hand back to Agent A (tag_in_agent with original agentId)
  └── Escalate to human (escalate_to_human tool)
```

### Human Takeover Flow

```
Agent detects escalation trigger
  │ (customer angry / topic blocked / confidence low / explicit request)
  │
  ▼
Agent calls escalate_to_human tool
  │ Parameters:
  │   reason: "Customer requesting refund, needs human approval"
  │   urgency: "high" | "normal" | "low"
  │   contextSummary: "..."
  │
  ▼
Team Harness:
  │ 1. Set humanEscalationRequested = true
  │ 2. Set session status = "handed_off"
  │ 3. Agent sends: "Let me connect you with my team. They'll be right with you."
  │ 4. Notify owner via:
  │    ├── Telegram push to owner
  │    ├── Team group message (if teamGroupEnabled)
  │    ├── Dashboard notification
  │    └── Email (if urgent and no response in 5 min)
  │
  ▼
Human takes over
  │ Types in team group or dashboard
  │ Messages route directly to customer
  │
  ▼
Human finishes
  │ Types "@agent resume" or clicks "Resume Agent"
  │ Team Harness:
  │   1. Set humanEscalationRequested = false
  │   2. Set session status = "active"
  │   3. Set activeAgentId back to primary agent
  │   4. Inject human's resolution as context for agent
  │   5. Agent continues naturally
```

---

## Harness Interaction Model

```
                    ┌─────────────────────────┐
                    │    Inbound Message       │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Is this a team session? │
                    └───┬───────────────┬─────┘
                        │               │
                      No│               │Yes
                        │               │
                ┌───────▼──────┐ ┌──────▼────────┐
                │ Agent Harness│ │ Team Harness   │
                │  (standard)  │ │  ↓             │
                │              │ │ Route to active │
                │  → Execute   │ │ agent's harness │
                │    pipeline  │ │                 │
                │              │ │  → Execute in   │
                │              │ │    agent harness │
                │              │ │    context       │
                └──────────────┘ └─────────────────┘
```

### Credit Flow in Team Sessions

```
Team session with Agent A (primary) and Agent B (specialist):

Message arrives → routed to active agent (B)
  │
  ├── Agent B's LLM call: cost charged to org credit pool
  ├── Agent B's tool calls: cost charged to org credit pool
  ├── perAgentSpend[B] += cost
  │
  └── If credits exhausted:
      ├── Try parent org fallback (with maxCreditSharePerChild cap)
      └── If still exhausted → notify both agents + owner + user
```

---

## Protected Agent Rules

System bots (Quinn, future platform agents) have `protected: true`:

| Rule | Effect |
|------|--------|
| Soul evolution proposals | Silently rejected — cannot propose changes |
| Soul editing via UI | Blocked — "This is a system agent" error |
| Tool modification | Only platform admins can change |
| Archiving/pausing | Blocked — system agents are always active |
| Rate limits | Use platform-level limits, not org-level |
| Credit consumption | Platform org budget, not per-org |
| Config backup | Soul stored as versioned template, not mutable properties |
| Scaling | Can spawn worker instances from template |

---

## Design Decisions

### Why 4 layers instead of OpenClaw's 8?

OpenClaw has per-provider tool policies because it supports many LLM providers with different capabilities. l4yercak3 routes through OpenRouter, so provider-level tool restrictions are unnecessary. Our 4 layers (platform → org → agent → session) match our tenant hierarchy exactly.

### Why team harness is separate from agent harness?

Agent harness is assembled every pipeline execution. Team harness persists across multiple agent activations within a session. Mixing them would mean re-resolving team state on every message, which is wasteful and error-prone.

### Why credit budget at harness level?

Pre-computing the credit budget at harness assembly (step 7.5) means we can reject messages before the expensive LLM call. The session-level budget tracks accumulated spend so we can enforce per-session caps without querying the credit table on every tool call.
