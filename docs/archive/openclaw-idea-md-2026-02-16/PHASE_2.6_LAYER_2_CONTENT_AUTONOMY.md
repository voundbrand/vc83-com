# Phase 2.6 — Layer 2: Content & Action Autonomy (4-Tier HITL)

> **Status:** Implementation Plan
> **Depends on:** Phase 2.6 Layer 1 (Exec Approvals), Phase 1 (Agent Per Org)
> **OpenClaw ref:** `PHASE_1_AGENT_PER_ORG.md` (autonomy levels), `PHASE_3_CONTENT_GENERATION.md` (risk scoring)

---

## 1. What Exists Today

### Working
| Component | File | What It Does |
|---|---|---|
| 3 autonomy levels | `convex/agentOntology.ts:191-195` | `supervised`, `autonomous`, `draft_only` |
| Draft-only filtering | `convex/ai/agentExecution.ts:897-904` | Restricts tool set to read-only tools |
| Supervised gating | `convex/ai/agentExecution.ts:911` | All tool calls queued as approvals |
| Autonomous + per-tool | `convex/ai/agentExecution.ts:917` | `requireApprovalFor` array check |
| Bulk email preview | `convex/ai/tools/bulkCRMEmailTool.ts:84` | `requireApproval` flag, preview-before-send |
| Contact sync preview | `convex/schemas/contactSyncSchemas.ts:136` | `requireApproval` boolean |

### Missing (vs. OpenClaw spec)
| Gap | OpenClaw Feature | Priority |
|---|---|---|
| **`semi_autonomous` tier** | 4th tier: auto-execute low-risk, queue high-risk | HIGH |
| **Risk scoring per tool** | Classify tool calls as low/medium/high risk | HIGH |
| **Risk scoring per content** | Assess risk of generated content (promo vs. educational) | MEDIUM |
| **Autonomy promotion** | Agent "earns" higher autonomy over time based on metrics | MEDIUM |
| **Content-specific approval UI** | Calendar view for content posts with approve/edit/reject | FUTURE (Phase 3) |
| **Risk factors** | Competitor mentions, pricing, negative review responses | MEDIUM |

---

## 2. Architecture

### 2.1 Four Autonomy Tiers

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: draft_only                                         │
│  Agent generates responses, never executes tools.           │
│  Only read-only tools available.                            │
│  Owner sees everything in dashboard drafts.                 │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: supervised                                         │
│  Agent drafts + schedules, all actions require approval.    │
│  Full tool set available, every call queued.                │
├─────────────────────────────────────────────────────────────┤
│  TIER 3: semi_autonomous  ← NEW                            │
│  Auto-executes low-risk tools. Queues medium + high-risk.   │
│  Risk scored per tool + per content context.                │
├─────────────────────────────────────────────────────────────┤
│  TIER 4: autonomous                                         │
│  Acts freely within guardrails.                             │
│  Only tools in requireApprovalFor are queued.               │
│  alwaysAllowList skips approval (from Layer 1).             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Risk Assessment Model

Each tool call is scored across two dimensions:

**Dimension 1: Tool Risk Level** (static, from `riskClassification.ts` in Layer 1)
```
read-only → LOW risk    (query_org_data, search_contacts, list_events)
write     → MEDIUM risk (create_contact, create_event, propose_soul_update)
destructive → HIGH risk (send_email, send_bulk_email, send_sms, create_client_org)
```

**Dimension 2: Content Risk Factors** (dynamic, from tool arguments)
```
+1 risk: mentions pricing, discounts, offers
+1 risk: mentions competitors by name
+1 risk: responds to negative feedback/review
+1 risk: contains external URLs
+1 risk: bulk operation (>5 recipients)
+1 risk: first-time tool usage for this agent
-1 risk: educational/informational content
-1 risk: internal tool (no external side effects)
```

**Combined Risk Score:**
```
Tool risk level + Content risk factors → Final risk
  LOW  + 0-1 factors = LOW    → semi_autonomous auto-executes
  LOW  + 2+  factors = MEDIUM → semi_autonomous queues
  MEDIUM + 0 factors = MEDIUM → semi_autonomous queues
  MEDIUM + 1+ factors = HIGH  → semi_autonomous queues
  HIGH + any          = HIGH  → semi_autonomous queues
```

### 2.3 Decision Matrix

| Tier | LOW risk | MEDIUM risk | HIGH risk |
|---|---|---|---|
| `draft_only` | Block | Block | Block |
| `supervised` | Queue | Queue | Queue |
| `semi_autonomous` | **Execute** | **Queue** | **Queue** |
| `autonomous` | Execute | Execute | Execute* |

*`autonomous` still respects `requireApprovalFor` and Layer 1 rules.

---

## 3. Implementation Steps

### Step 1: Add `semi_autonomous` to schema

**File:** `convex/agentOntology.ts`

```diff
  autonomyLevel: v.union(
    v.literal("supervised"),
    v.literal("autonomous"),
+   v.literal("semi_autonomous"),
    v.literal("draft_only")
  ),
```

Apply the same change in:
- `createAgent` args (line 191)
- `updateAgent` args (line 297)
- `createAgentInternal` args (line 523)

**File:** `convex/ai/agentExecution.ts` — `AgentConfig` interface

```diff
  interface AgentConfig {
-   autonomyLevel: "supervised" | "autonomous" | "draft_only";
+   autonomyLevel: "supervised" | "autonomous" | "semi_autonomous" | "draft_only";
    ...
  }
```

### Step 2: Content risk analyzer

**New file:** `convex/ai/tools/riskAnalyzer.ts`

```typescript
/**
 * RISK ANALYZER
 *
 * Scores the risk of a tool call based on:
 * 1. Static tool risk level (from riskClassification.ts)
 * 2. Dynamic content risk factors (from tool arguments)
 *
 * Used by semi_autonomous tier to decide execute vs. queue.
 */

import { getToolRiskLevel, type ToolRiskLevel } from "./riskClassification";

export type RiskScore = "low" | "medium" | "high";

interface RiskAssessment {
  score: RiskScore;
  toolRiskLevel: ToolRiskLevel;
  contentFactors: string[];
  factorCount: number;
}

// Patterns that increase risk
const PRICING_PATTERNS = /\b(price|pricing|cost|fee|discount|offer|deal|€|\$|USD|EUR)\b/i;
const COMPETITOR_PATTERNS = /\b(competitor|versus|vs\.|alternative|compared to|better than)\b/i;
const NEGATIVE_PATTERNS = /\b(complaint|disappointed|angry|frustrated|terrible|worst|refund)\b/i;
const URL_PATTERN = /https?:\/\/[^\s]+/;

export function assessToolCallRisk(
  toolName: string,
  toolArgs: Record<string, unknown>,
  agentContext?: { firstTimeUsingTool?: boolean }
): RiskAssessment {
  const toolRiskLevel = getToolRiskLevel(toolName);
  const contentFactors: string[] = [];

  // Serialize args to string for pattern matching
  const argsStr = JSON.stringify(toolArgs);

  // Check content risk factors
  if (PRICING_PATTERNS.test(argsStr)) contentFactors.push("pricing_content");
  if (COMPETITOR_PATTERNS.test(argsStr)) contentFactors.push("competitor_mention");
  if (NEGATIVE_PATTERNS.test(argsStr)) contentFactors.push("negative_context");
  if (URL_PATTERN.test(argsStr)) contentFactors.push("external_url");

  // Bulk operations
  const recipients = extractRecipientCount(toolArgs);
  if (recipients > 5) contentFactors.push("bulk_operation");

  // First-time tool usage
  if (agentContext?.firstTimeUsingTool) contentFactors.push("first_time_usage");

  // Calculate final score
  const score = calculateFinalRisk(toolRiskLevel, contentFactors.length);

  return {
    score,
    toolRiskLevel,
    contentFactors,
    factorCount: contentFactors.length,
  };
}

function calculateFinalRisk(
  toolRisk: ToolRiskLevel,
  factorCount: number
): RiskScore {
  if (toolRisk === "destructive") return "high";
  if (toolRisk === "write" && factorCount > 0) return "high";
  if (toolRisk === "write" && factorCount === 0) return "medium";
  if (toolRisk === "read-only" && factorCount >= 2) return "medium";
  return "low";
}

function extractRecipientCount(args: Record<string, unknown>): number {
  // Check common patterns for bulk operations
  const recipients = args.recipients || args.contacts || args.emailList;
  if (Array.isArray(recipients)) return recipients.length;
  if (typeof args.count === "number") return args.count;
  return 1;
}
```

### Step 3: Integrate risk scoring into execution pipeline

**File:** `convex/ai/agentExecution.ts`

Update `checkNeedsApproval()` to handle `semi_autonomous`:

```typescript
import { assessToolCallRisk, type RiskScore } from "./tools/riskAnalyzer";

function checkNeedsApproval(
  config: AgentConfig,
  toolName: string,
  toolArgs?: Record<string, unknown>,
  orgToolApprovalMode?: "all" | "dangerous" | "none",
): { needsApproval: boolean; riskScore?: RiskScore; riskFactors?: string[] } {
  // Draft-only: nothing executes (tools already filtered)
  if (config.autonomyLevel === "draft_only") {
    return { needsApproval: false };
  }

  // Supervised: everything queued
  if (config.autonomyLevel === "supervised") {
    return { needsApproval: true };
  }

  // Per-tool blocklist (highest priority, any tier)
  if (config.requireApprovalFor?.includes(toolName)) {
    return { needsApproval: true };
  }

  // Per-tool allowlist (user said "always allow", any tier)
  if (config.alwaysAllowList?.includes(toolName)) {
    return { needsApproval: false };
  }

  // Org-level override
  if (orgToolApprovalMode === "all") return { needsApproval: true };
  if (orgToolApprovalMode === "none") return { needsApproval: false };

  // Semi-autonomous: risk-based decision
  if (config.autonomyLevel === "semi_autonomous") {
    const assessment = assessToolCallRisk(toolName, toolArgs || {});

    if (orgToolApprovalMode === "dangerous" && assessment.toolRiskLevel === "destructive") {
      return { needsApproval: true, riskScore: assessment.score, riskFactors: assessment.contentFactors };
    }

    // Low risk → execute, medium/high → queue
    return {
      needsApproval: assessment.score !== "low",
      riskScore: assessment.score,
      riskFactors: assessment.contentFactors,
    };
  }

  // Autonomous: check org dangerous mode
  if (config.autonomyLevel === "autonomous") {
    if (orgToolApprovalMode === "dangerous") {
      const riskLevel = getToolRiskLevel(toolName);
      if (riskLevel === "destructive") return { needsApproval: true };
    }
    return { needsApproval: false };
  }

  return { needsApproval: false };
}
```

Update the tool call loop (~line 336) to pass risk metadata to approval:

```typescript
const { needsApproval, riskScore, riskFactors } = checkNeedsApproval(
  config, toolName, parsedArgs, orgToolApprovalMode
);

if (needsApproval) {
  const approvalId = await ctx.runMutation(
    getInternal().ai.agentApprovals.createApprovalRequest,
    {
      agentId: agent._id,
      sessionId: session._id,
      organizationId: args.organizationId,
      actionType: toolName,
      actionPayload: parsedArgs,
      // NEW: risk metadata
      riskScore,
      riskFactors,
    }
  );

  // Notify owner (from Layer 1)
  ctx.scheduler.runAfter(0, getInternal().ai.approvalNotifier.notifyOwnerOfApproval, {
    approvalId,
    organizationId: args.organizationId,
    agentName: config.displayName || agent.name,
    toolName,
    toolDescription: TOOL_REGISTRY[toolName]?.description || toolName,
    toolArgs: parsedArgs,
    riskScore,
    riskFactors,
  });

  toolResults.push({ tool: toolName, status: "pending_approval" });
}
```

### Step 4: Store risk metadata on approval objects

**File:** `convex/ai/agentApprovals.ts` — `createApprovalRequest`

Add risk fields to the approval customProperties:

```diff
  args: {
    agentId: v.id("objects"),
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    actionType: v.string(),
    actionPayload: v.any(),
+   riskScore: v.optional(v.string()),
+   riskFactors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const approvalId = await ctx.db.insert("objects", {
      ...
      customProperties: {
        ...
+       riskScore: args.riskScore,
+       riskFactors: args.riskFactors,
      },
    });
  }
```

### Step 5: Tool filtering for semi_autonomous

**File:** `convex/ai/agentExecution.ts` — `filterToolsForAgent()`

```diff
  // In draft_only mode, only allow read-only tools
  if (config.autonomyLevel === "draft_only") {
    const readOnlyTools = new Set([ ... ]);
    schemas = schemas.filter((s) => readOnlyTools.has(s.function.name));
  }

+ // Semi-autonomous mode: all tools available (risk scored at execution time)
+ // No filtering needed — same tool set as autonomous
```

No change needed — semi_autonomous uses the full tool set like autonomous.

### Step 6: Autonomy promotion (metrics-based)

**New file:** `convex/ai/autonomyPromotion.ts`

Agents can be automatically promoted from `supervised` → `semi_autonomous` → `autonomous` based on performance metrics. This is opt-in per org.

```typescript
/**
 * AUTONOMY PROMOTION
 *
 * Evaluates agent performance and suggests autonomy level upgrades.
 * Runs as part of the daily reflection (selfImprovement.ts).
 *
 * Promotion criteria:
 * - supervised → semi_autonomous:
 *   - 50+ conversations handled
 *   - <5% owner correction rate
 *   - >70% positive sentiment
 *   - <15% escalation rate
 *
 * - semi_autonomous → autonomous:
 *   - 200+ conversations handled
 *   - <2% owner correction rate
 *   - >80% positive sentiment
 *   - <10% escalation rate
 *   - No rejected proposals in last 30 days
 *
 * Promotions are ALWAYS proposed (never auto-applied).
 * Owner must approve the autonomy upgrade via soul proposal.
 */

export interface PromotionAssessment {
  currentLevel: string;
  eligibleForPromotion: boolean;
  suggestedLevel?: string;
  evidence: {
    totalConversations: number;
    correctionRate: number;
    positiveRate: number;
    escalationRate: number;
    rejectedProposals: number;
  };
  reason: string;
}

const PROMOTION_THRESHOLDS = {
  supervised_to_semi: {
    minConversations: 50,
    maxCorrectionRate: 0.05,
    minPositiveRate: 0.70,
    maxEscalationRate: 0.15,
  },
  semi_to_autonomous: {
    minConversations: 200,
    maxCorrectionRate: 0.02,
    minPositiveRate: 0.80,
    maxEscalationRate: 0.10,
    maxRejectedProposals: 0,
    rejectedProposalWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

export function assessPromotion(
  currentLevel: string,
  metrics: {
    totalConversations: number;
    correctionRate: number;
    positiveRate: number;
    escalationRate: number;
    rejectedProposalsLast30Days: number;
  }
): PromotionAssessment {
  const evidence = {
    totalConversations: metrics.totalConversations,
    correctionRate: metrics.correctionRate,
    positiveRate: metrics.positiveRate,
    escalationRate: metrics.escalationRate,
    rejectedProposals: metrics.rejectedProposalsLast30Days,
  };

  if (currentLevel === "supervised") {
    const t = PROMOTION_THRESHOLDS.supervised_to_semi;
    const eligible =
      metrics.totalConversations >= t.minConversations &&
      metrics.correctionRate <= t.maxCorrectionRate &&
      metrics.positiveRate >= t.minPositiveRate &&
      metrics.escalationRate <= t.maxEscalationRate;

    return {
      currentLevel,
      eligibleForPromotion: eligible,
      suggestedLevel: eligible ? "semi_autonomous" : undefined,
      evidence,
      reason: eligible
        ? `Agent has handled ${metrics.totalConversations} conversations with ${(metrics.positiveRate * 100).toFixed(0)}% positive sentiment and only ${(metrics.correctionRate * 100).toFixed(0)}% owner corrections. Ready for semi-autonomous mode.`
        : `Not yet eligible. Needs ${t.minConversations} conversations (has ${metrics.totalConversations}), <${t.maxCorrectionRate * 100}% corrections (at ${(metrics.correctionRate * 100).toFixed(0)}%), >${t.minPositiveRate * 100}% positive (at ${(metrics.positiveRate * 100).toFixed(0)}%).`,
    };
  }

  if (currentLevel === "semi_autonomous") {
    const t = PROMOTION_THRESHOLDS.semi_to_autonomous;
    const eligible =
      metrics.totalConversations >= t.minConversations &&
      metrics.correctionRate <= t.maxCorrectionRate &&
      metrics.positiveRate >= t.minPositiveRate &&
      metrics.escalationRate <= t.maxEscalationRate &&
      metrics.rejectedProposalsLast30Days <= t.maxRejectedProposals;

    return {
      currentLevel,
      eligibleForPromotion: eligible,
      suggestedLevel: eligible ? "autonomous" : undefined,
      evidence,
      reason: eligible
        ? `Agent has handled ${metrics.totalConversations} conversations with stellar metrics. Ready for full autonomy.`
        : `Not yet eligible for full autonomy.`,
    };
  }

  return {
    currentLevel,
    eligibleForPromotion: false,
    evidence,
    reason: currentLevel === "autonomous"
      ? "Already at maximum autonomy level."
      : "Draft-only mode is manual — promotion not applicable.",
  };
}
```

**Integration point:** `convex/ai/selfImprovement.ts` — `dailyReflection`

After the reflection LLM call, run promotion assessment and create a soul proposal if eligible:

```typescript
// After existing reflection logic...
const promotionResult = assessPromotion(
  config.autonomyLevel,
  {
    totalConversations: allTimeMetrics.length,
    correctionRate: parseFloat(stats.ownerCorrectionRate) / 100,
    positiveRate: parseFloat(stats.positiveRate) / 100,
    escalationRate: parseFloat(stats.escalationRate) / 100,
    rejectedProposalsLast30Days: recentRejections,
  }
);

if (promotionResult.eligibleForPromotion) {
  await ctx.runMutation(
    getInternal().ai.soulEvolution.createProposal,
    {
      organizationId: args.organizationId,
      agentId: args.agentId,
      proposalType: "modify",
      targetField: "autonomyLevel",
      currentValue: promotionResult.currentLevel,
      proposedValue: promotionResult.suggestedLevel,
      reason: `[Autonomy Promotion] ${promotionResult.reason}`,
      triggerType: "reflection",
      evidenceMessages: [JSON.stringify(promotionResult.evidence)],
    }
  );
}
```

### Step 7: System prompt awareness

**File:** `convex/ai/agentExecution.ts` — `buildAgentSystemPrompt()`

Add autonomy awareness so the agent knows its tier:

```typescript
// After the autonomy instruction for draft_only (~line 790):
if (config.autonomyLevel === "semi_autonomous") {
  parts.push(`\nIMPORTANT: You are in semi-autonomous mode. Low-risk actions (data queries, creating records) will execute automatically. Higher-risk actions (sending messages, bulk operations, anything involving pricing or competitors) will be queued for owner approval. If an action is queued, tell the customer you're checking with the team and will get back to them shortly.`);
}

if (config.autonomyLevel === "supervised") {
  parts.push(`\nIMPORTANT: You are in supervised mode. All tool actions require owner approval before execution. When you use a tool, it will be queued for review. Let the customer know you're processing their request and it will be handled shortly.`);
}
```

---

## 4. Schema Changes

### `convex/agentOntology.ts`

```diff
  autonomyLevel: v.union(
    v.literal("supervised"),
    v.literal("autonomous"),
+   v.literal("semi_autonomous"),
    v.literal("draft_only")
  ),
+ alwaysAllowList: v.optional(v.array(v.string())),
```

### `convex/ai/agentApprovals.ts` — `createApprovalRequest`

```diff
  args: {
    ...
+   riskScore: v.optional(v.string()),
+   riskFactors: v.optional(v.array(v.string())),
  }
```

---

## 5. Files Changed

| File | Change |
|---|---|
| `convex/agentOntology.ts` | Add `semi_autonomous` to union, `alwaysAllowList` to config |
| `convex/ai/agentExecution.ts` | Enhanced `checkNeedsApproval()` with risk scoring, system prompt updates |
| `convex/ai/agentApprovals.ts` | Risk metadata on approval objects |
| **NEW** `convex/ai/tools/riskAnalyzer.ts` | Content risk scoring engine |
| **NEW** `convex/ai/autonomyPromotion.ts` | Metrics-based autonomy tier assessment |
| `convex/ai/selfImprovement.ts` | Integration point for promotion assessment |

---

## 6. Autonomy Level Decision Guide (for owners)

| You want... | Choose | What happens |
|---|---|---|
| Full control, see everything | `draft_only` | Agent only reads data, shows drafts in dashboard |
| Review before sending | `supervised` | Agent uses tools, but every action requires your approval |
| Trust for routine, review risky | `semi_autonomous` | Queries and record creation auto-run; messages, bulk ops, and pricing content queued |
| Maximum automation | `autonomous` | Agent acts freely, only tools you explicitly flag are queued |

### Progression path (The Praktikant Model)
```
Week 1:  supervised       — Agent learns, you review everything
Week 3:  semi_autonomous  — Agent handles routine, you review outbound
Week 8:  autonomous       — Agent runs independently, you monitor dashboard
```

---

## 7. Testing Checklist

- [ ] **semi_autonomous + read-only tool** → auto-execute (no approval)
- [ ] **semi_autonomous + write tool (no risk factors)** → queued (medium risk)
- [ ] **semi_autonomous + write tool + pricing content** → queued (high risk)
- [ ] **semi_autonomous + destructive tool** → always queued
- [ ] **Risk factor detection**: pricing, competitor, negative, URL, bulk all detected
- [ ] **Approval object has riskScore + riskFactors metadata**
- [ ] **Dashboard shows risk level on pending approvals**
- [ ] **System prompt reflects autonomy tier**
- [ ] **Promotion assessment**: supervised agent with 50+ good conversations → eligible
- [ ] **Promotion creates soul proposal** (not auto-applied)
- [ ] **Owner approves promotion** → agent autonomy level changes
- [ ] **Backwards compatible**: existing 3-tier agents work without changes

---

## 8. Migration

No data migration required. `semi_autonomous` is a new option — existing agents continue with their current level. Owners opt in by changing the autonomy level in the dashboard.

**Rollout:**
1. Deploy schema changes (add `semi_autonomous` to union types)
2. Deploy `riskAnalyzer.ts` and updated `checkNeedsApproval()`
3. Deploy system prompt awareness
4. Deploy `autonomyPromotion.ts` and integrate with daily reflection
5. Update dashboard UI to show 4 autonomy tiers + risk metadata on approvals
