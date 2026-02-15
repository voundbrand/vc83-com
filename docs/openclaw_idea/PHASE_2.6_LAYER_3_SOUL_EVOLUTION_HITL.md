# Phase 2.6 — Layer 3: Soul Evolution HITL (Self-Modification Controls)

> **Status:** Implementation Plan
> **Depends on:** Phase 2.5 Step 7 (Soul Evolution), Phase 2.5 Step 10 (Self-Improvement Loop), Phase 2.6 Layer 1 (Approval Forwarding)
> **OpenClaw ref:** `PHASE_2.5_STEP7_SOUL_EVOLUTION.md`, `PHASE_2.5_STEP10_SELF_IMPROVEMENT_LOOP.md`

---

## 1. What Exists Today

### Working
| Component | File | What It Does |
|---|---|---|
| Soul proposals table | `convex/schemas/soulEvolutionSchemas.ts:22-66` | Full schema: type, field, value, reason, evidence, status |
| `createProposal` | `convex/ai/soulEvolution.ts:29-58` | Creates pending proposal in DB |
| `approveProposal` | `convex/ai/soulEvolution.ts:63-92` | Marks approved, records feedback |
| `rejectProposal` | `convex/ai/soulEvolution.ts:97-125` | Marks rejected, records feedback |
| `applyProposal` | `convex/ai/soulEvolution.ts:130-215` | Applies to soul (add/modify/remove/add_faq), snapshots version history |
| Version history | `convex/schemas/soulEvolutionSchemas.ts:113-123` | `soulVersionHistory` with before/after snapshots |
| Proposal feedback | `convex/schemas/soulEvolutionSchemas.ts:131-141` | `proposalFeedback` for learning loop |
| `propose_soul_update` tool | `convex/ai/tools/soulEvolutionTools.ts:24-135` | Agent-facing tool with evidence collection |
| `review_own_soul` tool | `convex/ai/tools/soulEvolutionTools.ts:140-182` | Agent reads its own soul |
| `view_pending_proposals` tool | `convex/ai/tools/soulEvolutionTools.ts:187-223` | Agent checks pending proposals |
| Telegram inline buttons | `convex/ai/soulEvolution.ts:283-366` | `notifyOwnerOfProposal` sends [Approve] [Reject] |
| Telegram callback handler | `convex/ai/soulEvolution.ts:372-437` | `handleTelegramCallback` processes button taps |
| Self-reflection | `convex/ai/soulEvolution.ts:443-559` | `runSelfReflection` — LLM reviews conversations, generates proposals |
| Conversation metrics | `convex/ai/selfImprovement.ts:32-165` | `recordConversationMetrics` — tracks sentiment, escalation, failures |
| Daily reflection | `convex/ai/selfImprovement.ts:208-381` | `dailyReflection` — metrics-based reflection with calibration rules |
| Idle session detection | `convex/ai/selfImprovement.ts:412-434` | `detectIdleSessions` — triggers metrics recording |
| Crons registered | `convex/crons.ts:181-200` | Daily reflection (6:30 AM) + idle detection (every 15 min) |
| Metrics schema | `convex/schemas/soulEvolutionSchemas.ts:74-105` | `agentConversationMetrics` with all signals |

### What's Wired End-to-End
```
✅ Agent calls propose_soul_update during conversation
✅ Proposal saved to soulProposals table (status: pending)
✅ Telegram notification sent with inline buttons
✅ Owner taps Approve → proposal applied → soul version bumped
✅ Owner taps Reject → proposal rejected → feedback recorded
✅ Version history snapshot saved
✅ Daily self-reflection generates proposals from metrics
✅ Idle sessions trigger metric recording
```

### Missing (vs. OpenClaw spec)
| Gap | OpenClaw Feature | Priority |
|---|---|---|
| **Multi-channel proposal forwarding** | Forward soul proposals to ALL connected channels (not just Telegram) | HIGH |
| **`/approve` command for soul proposals** | Approve proposals from any chat channel via text command | HIGH |
| **Edit-before-approve flow** | Owner modifies proposed value before approving | HIGH |
| **Duplicate proposal prevention** | Don't re-propose if similar proposal was rejected recently | MEDIUM |
| **Proposal rate limiting** | Max N proposals per agent per day | MEDIUM |
| **Autonomy promotion proposals** | Soul evolution proposes autonomy level upgrades (Layer 2 integration) | MEDIUM |
| **Dashboard: proposal review UI** | In-app UI for reviewing proposals (not just Telegram) | MEDIUM |
| **Rollback capability** | Revert to previous soul version from version history | MEDIUM |
| **Batch proposals** | Group multiple proposals into a single review | LOW |
| **Confidence scoring** | Show confidence level on proposals to help owner decide | LOW |

---

## 2. Architecture

### 2.1 Enhanced Proposal Flow

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER                                                     │
│  ├── Conversation: Agent notices gap during live chat         │
│  ├── Reflection:   Daily cron reviews metrics (6:30 AM UTC)  │
│  └── Owner:        Owner tells agent to update itself         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  GATE — Pre-flight checks                                    │
│  ├── Duplicate check: similar proposal rejected in 30 days?  │
│  ├── Rate limit: <3 proposals per agent per day?             │
│  └── Quality: proposal has evidence + clear reason?          │
└────────────────────┬────────────────────────────────────────┘
                     │ PASS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFY — Multi-channel forwarding                           │
│  ├── In-app:     Proposal visible in dashboard (always)      │
│  ├── Telegram:   Inline keyboard [Approve] [Edit] [Reject]   │
│  ├── WhatsApp:   Text with /soul_approve <id>                │
│  ├── Email:      Rich HTML with one-click approve link        │
│  └── SMS:        Short text with /soul_approve <id>           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  RESOLVE                                                     │
│  ├── Approve          → Apply to soul, bump version           │
│  ├── Approve + Edit   → Owner modifies value, then apply      │
│  ├── Reject           → Record feedback, agent learns          │
│  └── Expire (72h)     → Auto-reject, agent notified            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LEARN — Feedback loop                                       │
│  ├── Record outcome in proposalFeedback table                │
│  ├── Update rejection patterns for future calibration         │
│  └── If promotion eligible, propose autonomy upgrade          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Enhanced Proposal Schema

```typescript
// soulProposals table — additions to existing schema
{
  // Existing fields (all kept)
  organizationId, agentId, sessionId,
  proposalType, targetField, currentValue, proposedValue, reason,
  triggerType, evidenceMessages,
  status, createdAt, reviewedAt, reviewedBy,
  telegramMessageId, telegramChatId,

  // NEW: Pre-flight metadata
  confidence: "high" | "medium" | "low",  // From reflection LLM
  similarRejected: boolean,               // Was a similar proposal rejected recently?

  // NEW: Resolution tracking
  resolvedVia: "telegram" | "whatsapp" | "email" | "sms" | "dashboard" | "api",
  editedByOwner: boolean,                 // Owner modified before approving
  originalProposedValue: string,          // What agent proposed (if owner edited)

  // NEW: Expiry
  expiresAt: number,                      // 72h after creation
}
```

---

## 3. Implementation Steps

### Step 1: Pre-flight gates (duplicate detection + rate limiting)

**File:** `convex/ai/soulEvolution.ts` — enhance `createProposal`

```typescript
export const createProposal = internalMutation({
  args: { /* existing args */ },
  handler: async (ctx, args) => {
    // GATE 1: Rate limit — max 3 proposals per agent per day
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentProposals = await ctx.db
      .query("soulProposals")
      .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.gte(q.field("createdAt"), dayAgo))
      .collect();

    if (recentProposals.length >= 3) {
      return { gated: true, reason: "rate_limit", message: "Maximum 3 proposals per day reached" };
    }

    // GATE 2: Duplicate detection — similar proposal rejected in last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentRejected = await ctx.db
      .query("soulProposals")
      .withIndex("by_agent_status", (q) =>
        q.eq("agentId", args.agentId).eq("status", "rejected")
      )
      .filter((q) => q.gte(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    const isSimilar = recentRejected.some((r) =>
      r.targetField === args.targetField &&
      r.proposalType === args.proposalType &&
      // Fuzzy: same first 50 chars of proposed value
      r.proposedValue.slice(0, 50).toLowerCase() === args.proposedValue.slice(0, 50).toLowerCase()
    );

    if (isSimilar) {
      return { gated: true, reason: "similar_rejected", message: "A similar proposal was recently rejected" };
    }

    // PASS: Create the proposal
    const proposalId = await ctx.db.insert("soulProposals", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 72 * 60 * 60 * 1000, // 72h expiry
      confidence: args.confidence || "medium",
      similarRejected: false,
    });

    return { gated: false, proposalId };
  },
});
```

### Step 2: Multi-channel proposal forwarding

**New file:** `convex/ai/proposalNotifier.ts`

Reuses the pattern from Layer 1's `approvalNotifier.ts` but for soul proposals:

```typescript
/**
 * PROPOSAL NOTIFIER
 *
 * Forwards soul proposals to org owner via ALL connected channels.
 * Uses Layer 1's channel forwarding pattern.
 */

export const notifyOwnerOfProposal = internalAction({
  args: {
    proposalId: v.id("soulProposals"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.runQuery(
      getInternal().ai.soulEvolution.getProposalById,
      { proposalId: args.proposalId }
    );
    if (!proposal) return;

    // Load agent name
    const agent = await ctx.runQuery(
      getInternal().agentOntology.getAgentInternal,
      { agentId: proposal.agentId }
    );
    const agentName = (agent?.customProperties as any)?.soul?.name
      || (agent?.customProperties as any)?.displayName
      || "Your agent";

    // Find owner and connected channels
    const owner = await ctx.runQuery(
      getInternal().organizations.getOwnerInternal,
      { organizationId: args.organizationId }
    );
    if (!owner) return;

    const bindings = await ctx.runQuery(
      getInternal().channels.webhooks.getChannelBindingsInternal,
      { organizationId: args.organizationId }
    );

    // Format the proposal message
    const shortId = args.proposalId.toString().slice(-8);
    const typeLabels: Record<string, string> = {
      add: "ADD to",
      modify: "CHANGE",
      remove: "REMOVE from",
      add_faq: "ADD FAQ to",
    };

    const message = {
      rich: [
        `🧠 *Soul Update Proposal* (${shortId})`,
        ``,
        `*${agentName}* wants to update its personality:`,
        ``,
        `*${typeLabels[proposal.proposalType]}* \`${proposal.targetField}\`:`,
        proposal.currentValue ? `Currently: "${proposal.currentValue}"` : null,
        `Proposed: "${proposal.proposedValue}"`,
        ``,
        `*Reason:* ${proposal.reason}`,
        proposal.confidence ? `*Confidence:* ${proposal.confidence}` : null,
        proposal.triggerType === "reflection" ? `_Generated from daily self-reflection_` : null,
      ].filter(Boolean).join("\n"),

      plain: [
        `Soul Update Proposal (${shortId})`,
        `${agentName} wants to ${typeLabels[proposal.proposalType]} ${proposal.targetField}:`,
        `"${proposal.proposedValue}"`,
        `Reason: ${proposal.reason}`,
        ``,
        `Reply:`,
        `  /soul_approve ${shortId}`,
        `  /soul_edit ${shortId} <new value>`,
        `  /soul_reject ${shortId} [reason]`,
      ].join("\n"),
    };

    // Send to each connected channel
    for (const binding of bindings) {
      if (binding.channel === "telegram") {
        await sendTelegramProposal(ctx, {
          chatId: binding.recipientId,
          message: message.rich,
          proposalId: args.proposalId,
          shortId,
        });
      } else {
        await ctx.runAction(
          getInternal().channels.router.sendMessage,
          {
            organizationId: args.organizationId,
            channel: binding.channel,
            recipientIdentifier: binding.recipientId,
            content: message.plain,
          }
        );
      }
    }
  },
});

async function sendTelegramProposal(ctx: any, args: {
  chatId: string;
  message: string;
  proposalId: Id<"soulProposals">;
  shortId: string;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: args.chatId,
      text: args.message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `soul_approve:${args.proposalId}` },
            { text: "✏️ Edit", callback_data: `soul_edit:${args.proposalId}` },
            { text: "❌ Reject", callback_data: `soul_reject:${args.proposalId}` },
          ],
        ],
      },
    }),
  });

  const data = await response.json() as any;
  if (data.ok && data.result?.message_id) {
    await ctx.runMutation(
      getInternal().ai.soulEvolution.updateProposalTelegram,
      {
        proposalId: args.proposalId,
        telegramMessageId: data.result.message_id,
        telegramChatId: args.chatId,
      }
    );
  }
}
```

### Step 3: Chat command handler for soul proposals

**File:** `convex/channels/webhooks.ts` — extend the approval command parser from Layer 1

```typescript
// Extend the command parser to handle soul commands
function parseSoulCommand(text: string): {
  action: "soul_approve" | "soul_edit" | "soul_reject";
  shortId: string;
  value?: string;
  reason?: string;
} | null {
  const approveMatch = text.match(/^\/soul_approve\s+(\S+)$/i);
  if (approveMatch) return { action: "soul_approve", shortId: approveMatch[1] };

  const editMatch = text.match(/^\/soul_edit\s+(\S+)\s+(.+)$/i);
  if (editMatch) return { action: "soul_edit", shortId: editMatch[1], value: editMatch[2] };

  const rejectMatch = text.match(/^\/soul_reject\s+(\S+)(?:\s+(.+))?$/i);
  if (rejectMatch) return { action: "soul_reject", shortId: rejectMatch[1], reason: rejectMatch[2] };

  return null;
}
```

### Step 4: Edit-before-approve flow

**File:** `convex/ai/soulEvolution.ts` — add `editAndApproveProposal`

```typescript
/**
 * Owner edits the proposed value before approving.
 * Stores the original for audit trail, applies the edited version.
 */
export const editAndApproveProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
    editedValue: v.string(),
    resolvedVia: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      return { error: "Proposal not found or already processed" };
    }

    // Save original value, update to edited
    await ctx.db.patch(args.proposalId, {
      originalProposedValue: proposal.proposedValue,
      proposedValue: args.editedValue,
      editedByOwner: true,
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: "owner",
      resolvedVia: args.resolvedVia || "dashboard",
    });

    // Record feedback
    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "approved",
      ownerFeedback: `Edited from "${proposal.proposedValue}" to "${args.editedValue}"`,
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${args.editedValue}`,
      learnedRule: "Owner prefers edited version — adjust proposals closer to this style",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
```

### Step 5: Telegram edit flow

**File:** `convex/ai/soulEvolution.ts` — enhance `handleTelegramCallback`

When the owner taps "Edit", enter a conversational flow where the bot asks for the new value:

```typescript
// In handleTelegramCallback, add soul_edit case:
} else if (actionType === "soul_edit") {
  // Ask owner for the edited value
  if (botToken) {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: args.callbackQueryId,
        text: "Reply with the corrected value",
      }),
    });

    // Send prompt for the new value
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: args.telegramChatId,
        text: `Please reply with the corrected value for this proposal.\nOriginal: "${proposal.proposedValue}"\n\nReply format: /soul_edit ${proposalId.slice(-8)} <your corrected value>`,
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }),
    });
  }
}
```

### Step 6: Proposal expiry cron

**File:** `convex/ai/soulEvolution.ts` — add `expireStaleProposals`

```typescript
export const expireStaleProposals = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const pendingProposals = await ctx.db
      .query("soulProposals")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let expired = 0;
    for (const proposal of pendingProposals) {
      const expiresAt = (proposal as any).expiresAt as number | undefined;
      if (expiresAt && now > expiresAt) {
        await ctx.db.patch(proposal._id, {
          status: "rejected",
          reviewedAt: now,
          reviewedBy: "system_expired",
        });

        // Record feedback
        await ctx.db.insert("proposalFeedback", {
          organizationId: proposal.organizationId,
          agentId: proposal.agentId,
          proposalId: proposal._id,
          outcome: "rejected",
          ownerFeedback: "Auto-expired after 72 hours with no response",
          proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
          createdAt: now,
        });

        expired++;
      }
    }
    return { expired };
  },
});
```

**File:** `convex/crons.ts` — register the cron

```typescript
/**
 * Expire Stale Soul Proposals
 *
 * Runs every 6 hours to expire soul proposals older than 72 hours.
 */
crons.interval(
  "Expire stale soul proposals",
  { hours: 6 },
  internal.ai.soulEvolution.expireStaleProposals
);
```

### Step 7: Soul rollback capability

**File:** `convex/ai/soulEvolution.ts` — add `rollbackSoul`

```typescript
/**
 * Rollback agent soul to a previous version.
 * Uses soulVersionHistory to restore a snapshot.
 */
export const rollbackSoul = internalMutation({
  args: {
    agentId: v.id("objects"),
    targetVersion: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the target version
    const versionEntry = await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) =>
        q.eq("agentId", args.agentId).eq("version", args.targetVersion)
      )
      .first();

    if (!versionEntry) {
      return { error: `Version ${args.targetVersion} not found` };
    }

    // Load current agent
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return { error: "Agent not found" };

    const config = (agent.customProperties || {}) as Record<string, any>;
    const currentSoul = config.soul || {};

    // Snapshot current before rollback
    const currentVersion = currentSoul.version || 1;

    // Restore the target version's soul
    const restoredSoul = JSON.parse(versionEntry.previousSoul);
    restoredSoul.version = currentVersion + 1;
    restoredSoul.lastUpdatedAt = Date.now();
    restoredSoul.lastUpdatedBy = "owner_rollback";

    // Save
    config.soul = restoredSoul;
    await ctx.db.patch(args.agentId, { customProperties: config });

    // Record version history
    await ctx.db.insert("soulVersionHistory", {
      agentId: args.agentId,
      organizationId: agent.organizationId,
      version: restoredSoul.version,
      previousSoul: JSON.stringify(currentSoul),
      newSoul: JSON.stringify(restoredSoul),
      changeType: `rollback_to_v${args.targetVersion}`,
      changedAt: Date.now(),
    });

    return { success: true, newVersion: restoredSoul.version };
  },
});
```

### Step 8: Enhanced reflection with feedback calibration

**File:** `convex/ai/selfImprovement.ts` — enhance `dailyReflection`

Add smarter calibration based on proposal history:

```typescript
// Before building the reflection prompt, compute calibration context:
const allFeedback = await ctx.runQuery(
  getInternal().ai.selfImprovement.getRecentFeedback,
  { agentId: args.agentId, limit: 30 }
);

const rejectedFields = allFeedback
  .filter((f: any) => f.outcome === "rejected")
  .map((f: any) => f.proposalSummary);

const approvalRate = allFeedback.length > 0
  ? allFeedback.filter((f: any) => f.outcome === "approved").length / allFeedback.length
  : 1;

// Add to reflection prompt:
const calibrationBlock = `
=== CALIBRATION RULES ===
Your historical proposal approval rate: ${(approvalRate * 100).toFixed(0)}%

${rejectedFields.length > 0
  ? `Recently REJECTED proposals (DO NOT re-propose similar changes):
${rejectedFields.map(s => `- ${s}`).join("\n")}`
  : "No recent rejections."}

${approvalRate > 0.8
  ? "Your proposals are well-calibrated. Continue current approach."
  : approvalRate > 0.5
    ? "Some proposals are being rejected. Be more conservative — only propose changes backed by strong evidence."
    : "Many proposals are being rejected. Significantly reduce proposal frequency. Only propose if absolutely necessary."}
=== END CALIBRATION ===`;
```

### Step 9: Wire proposal notifications into the tool

**File:** `convex/ai/tools/soulEvolutionTools.ts` — update `proposeSoulUpdateTool.execute`

Replace the Telegram-only notification with multi-channel:

```diff
- // Notify owner via Telegram (if channel is telegram)
- if (channel === "telegram" && contactId) {
-   await ctx.runAction(
-     getInternal().ai.soulEvolution.notifyOwnerOfProposal,
-     { proposalId, telegramChatId: contactId }
-   );
- }

+ // Notify owner via ALL connected channels
+ if (proposalId && !result.gated) {
+   await ctx.runAction(
+     getInternal().ai.proposalNotifier.notifyOwnerOfProposal,
+     { proposalId, organizationId }
+   );
+ }
```

---

## 4. Schema Changes

### `convex/schemas/soulEvolutionSchemas.ts` — soulProposals

```diff
  export const soulProposals = defineTable({
    // ... existing fields ...

+   // Pre-flight metadata
+   confidence: v.optional(v.union(
+     v.literal("high"),
+     v.literal("medium"),
+     v.literal("low"),
+   )),
+   similarRejected: v.optional(v.boolean()),
+
+   // Resolution tracking
+   resolvedVia: v.optional(v.string()),
+   editedByOwner: v.optional(v.boolean()),
+   originalProposedValue: v.optional(v.string()),
+
+   // Expiry
+   expiresAt: v.optional(v.number()),
  })
```

### `convex/schemas/soulEvolutionSchemas.ts` — proposalFeedback

```diff
  export const proposalFeedback = defineTable({
    // ... existing fields ...

+   // Learning context
+   learnedRule: v.optional(v.string()),
  })
```

> Note: `learnedRule` already exists in the schema but was not being populated. The edit-and-approve flow now writes it.

---

## 5. Files Changed

| File | Change |
|---|---|
| `convex/ai/soulEvolution.ts` | Pre-flight gates, `editAndApproveProposal`, `expireStaleProposals`, `rollbackSoul`, enhanced Telegram edit flow |
| `convex/ai/selfImprovement.ts` | Enhanced calibration in `dailyReflection` |
| `convex/ai/tools/soulEvolutionTools.ts` | Switch from Telegram-only to multi-channel notification |
| `convex/schemas/soulEvolutionSchemas.ts` | Add confidence, resolution tracking, expiry fields |
| `convex/crons.ts` | Register `expireStaleProposals` cron |
| `convex/channels/webhooks.ts` | `/soul_approve`, `/soul_edit`, `/soul_reject` command parsing |
| **NEW** `convex/ai/proposalNotifier.ts` | Multi-channel soul proposal forwarding |

---

## 6. The Complete Learning Arc

```
Day 1:  Agent bootstrapped, soul generated from onboarding
        Autonomy: supervised | Proposals: 0 | Soul: v1

Day 3:  Agent handles 10 conversations
        Notices customers ask about group lessons → proposes FAQ
        Owner approves via Telegram → Soul: v2

Day 7:  Daily reflection runs
        Detects 20% "I don't know" responses about pricing
        Proposes: ADD to alwaysDo: "Always check price list before responding"
        Owner approves → Soul: v3

Day 14: Agent has 50+ conversations
        Correction rate: 3%, Positive: 75%, Escalation: 12%
        Self-improvement proposes promotion: supervised → semi_autonomous
        Owner approves → Autonomy upgraded

Day 21: Agent in semi_autonomous mode
        Low-risk queries auto-execute, sends/pricing queued
        Proposes: MODIFY communicationStyle → more concise
        Owner edits → approves edited version → Soul: v5

Day 30: Agent has 200+ conversations
        Correction rate: 1%, Positive: 85%, Escalation: 8%
        Proposes promotion: semi_autonomous → autonomous
        Owner approves → Full autonomy earned
        Soul: v7 (evolved through 6 approved proposals)
```

---

## 7. Cost Model

| Component | Frequency | Cost |
|---|---|---|
| Daily reflection | 1 LLM call per agent per day | ~$0.02-0.04 |
| Metric recording | Pure DB writes (no LLM) | $0 |
| Idle detection | Query-only (no LLM) | $0 |
| Proposal notifications | Channel API calls only | $0 |
| Proposal expiry | Query + mutation only | $0 |
| **Total per active agent** | **Daily** | **~$0.03** |

---

## 8. Testing Checklist

- [ ] **Proposal creation**: propose_soul_update creates pending proposal
- [ ] **Rate limiting**: 4th proposal in a day is blocked
- [ ] **Duplicate detection**: Re-proposing recently-rejected similar change is blocked
- [ ] **Telegram approval**: Inline buttons work (Approve, Edit, Reject)
- [ ] **Telegram edit flow**: Owner taps Edit → prompted for new value → applied
- [ ] **WhatsApp approval**: `/soul_approve <id>` command resolves proposal
- [ ] **Email approval**: Rich HTML with approve link works
- [ ] **Edit-before-approve**: Owner edits value, original stored for audit
- [ ] **Version history**: Snapshot saved before/after every change
- [ ] **Rollback**: Restoring previous version works correctly
- [ ] **Expiry**: Proposals auto-expire after 72h
- [ ] **Feedback calibration**: Agent reduces proposals when rejection rate is high
- [ ] **Autonomy promotion**: Eligible agent gets promotion proposal in daily reflection
- [ ] **End-to-end**: Agent notices gap → proposes → owner approves → soul updated → agent behaves differently

---

## 9. Migration

No data migration needed. New fields are all optional with sensible defaults:
- `confidence` defaults to `undefined` (treated as "medium")
- `expiresAt` defaults to `undefined` (no expiry for existing proposals)
- `resolvedVia` defaults to `undefined` (unknown channel)

Existing proposals and feedback continue working. The enhanced gates only apply to new proposals.

**Rollout:**
1. Deploy schema changes (new optional fields)
2. Deploy pre-flight gates (rate limit + duplicate detection)
3. Deploy multi-channel notifier (replaces Telegram-only)
4. Deploy edit-before-approve flow
5. Deploy expiry cron
6. Deploy rollback capability
7. Deploy enhanced feedback calibration in daily reflection
