# Soul Evolution

> Soul versioning, proposal lifecycle, rollback mechanism, rate limiting, and reflection triggers.

---

## Current State

### What Works

- **Proposal types:** add, modify, remove, add_faq
- **Proposal triggers:** conversation, reflection, owner_directed
- **Version tracking:** `soulVersionHistory` stores JSON snapshots of before/after
- **Owner approval:** Telegram inline buttons for approve/reject
- **Self-reflection:** `runSelfReflection()` analyzes 20 recent sessions, proposes 0-3 changes

### What's Missing

- **No rollback mechanism.** History is audit-only. No mutation to revert.
- **No rate limiting on proposals.** Agent can spam owner with 20 proposals/day.
- **No cooldown after rejection.** Rejected proposal can be immediately re-proposed.
- **No minimum data requirement.** Agent can propose changes after 1 conversation.
- **No cap on pending proposals.** Unreviewed proposals pile up.
- **No auto-reflection trigger.** `runSelfReflection()` exists but has no cron/scheduler.
- **No proposal quality guard.** Nothing prevents subtle drift from owner's original intent.

---

## Soul Version Model

### Version History

```
Soul v1 (bootstrap)
  │ Generated from onboarding interview
  │ Traits: ["friendly", "professional"]
  │
  │ Proposal: "Add trait: empathetic" (approved)
  ▼
Soul v2
  │ Traits: ["friendly", "professional", "empathetic"]
  │
  │ Proposal: "Modify greeting: more casual" (approved)
  ▼
Soul v3
  │ Greeting: "Hey! How can I help?"
  │
  │ Proposal: "Remove neverDo: use slang" (REJECTED)
  │ → cooldown 24h, feedback stored
  │
  │ Owner clicks "Rollback to v1"
  ▼
Soul v4 (rollback to v1 snapshot)
  │ Traits: ["friendly", "professional"]
  │ Greeting: (original)
  │ changeType: "rollback", fromVersion: 3, toVersion: 1
```

### soulVersionHistory Schema

```typescript
// Existing table
soulVersionHistory: defineTable({
  agentId: v.id("objects"),
  version: v.number(),
  previousSoul: v.string(),          // JSON snapshot
  newSoul: v.string(),               // JSON snapshot
  proposalId: v.optional(v.id("objects")),
  changeType: v.union(
    v.literal("proposal"),           // from soul evolution proposal
    v.literal("manual"),             // owner edited directly
    v.literal("rollback"),           // reverted to previous version
    v.literal("bootstrap"),          // initial generation
  ),
  // New fields
  fromVersion: v.optional(v.number()),  // for rollbacks
  toVersion: v.optional(v.number()),    // for rollbacks
  changedBy: v.optional(v.string()),    // "system" | "owner" | userId
  timestamp: v.number(),
})
.index("by_agent", ["agentId"])
.index("by_agent_version", ["agentId", "version"]),
```

---

## Rollback Mechanism

### One-Click Rollback

```typescript
export const rollbackSoul = internalMutation({
  args: {
    agentId: v.id("objects"),
    targetVersion: v.number(),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // Check protected status
    if (agent.customProperties.protected) {
      throw new Error("Cannot modify protected system agent");
    }

    // Get target version snapshot
    const targetHistory = await ctx.db.query("soulVersionHistory")
      .withIndex("by_agent_version", q =>
        q.eq("agentId", args.agentId).eq("version", args.targetVersion)
      )
      .first();

    if (!targetHistory) {
      throw new Error(`Soul version ${args.targetVersion} not found`);
    }

    // Parse the target soul state
    const targetSoul = JSON.parse(targetHistory.newSoul);
    const currentSoul = agent.customProperties.soul;
    const currentVersion = currentSoul.version || 1;

    // Apply rollback
    const newVersion = currentVersion + 1;
    const rolledBackSoul = {
      ...targetSoul,
      version: newVersion,
    };

    await ctx.db.patch(args.agentId, {
      customProperties: {
        ...agent.customProperties,
        soul: rolledBackSoul,
      },
    });

    // Record in version history
    await ctx.db.insert("soulVersionHistory", {
      agentId: args.agentId,
      version: newVersion,
      previousSoul: JSON.stringify(currentSoul),
      newSoul: JSON.stringify(rolledBackSoul),
      changeType: "rollback",
      fromVersion: currentVersion,
      toVersion: args.targetVersion,
      changedBy: args.requestedBy,
      timestamp: Date.now(),
    });

    return { success: true, newVersion, rolledBackToVersion: args.targetVersion };
  },
});
```

### Owner UX (Telegram)

```
Owner taps "Soul History" in Telegram settings
  │
  ▼
Bot shows version list:
  "📜 Soul Version History for Maya:

   v4 (current) — 2 days ago
   ├── Rollback from v3 → v1

   v3 — 5 days ago
   ├── Modified greeting style (casual)

   v2 — 1 week ago
   ├── Added trait: empathetic

   v1 — 2 weeks ago
   ├── Initial soul (bootstrap)

   Tap a version to see details or rollback:"

  [v3 Details] [v2 Details] [v1 Details]
  │
  ▼
Owner taps [v2 Details]:
  "📋 Soul v2 Changes:

   + Added trait: 'empathetic'

   Traits were: ['friendly', 'professional']
   Became:      ['friendly', 'professional', 'empathetic']

   Proposed by: Self-reflection
   Approved:    2026-02-08"

  [Rollback to v2] [Back]
  │
  ▼
Owner taps [Rollback to v2]:
  "⚠️ This will revert Maya's personality to version 2.
   Current personality changes since v2 will be undone.

   Are you sure?"

  [Yes, Rollback] [Cancel]
```

---

## Rate Limiting

### Soul Evolution Policy

```typescript
// On agent config
soulEvolutionPolicy: {
  // Proposal frequency limits
  maxProposalsPerDay: 3,
  maxProposalsPerWeek: 10,

  // Cooldowns
  cooldownAfterRejection: "24h",     // back off after owner says no
  cooldownBetweenProposals: "4h",    // minimum gap between proposals

  // Quality gates
  requireMinConversations: 20,       // don't propose until enough data
  requireMinSessions: 5,             // across multiple sessions
  maxPendingProposals: 5,            // don't pile up unreviewed

  // Auto-reflection schedule
  autoReflectionSchedule: "weekly",  // "daily" | "weekly" | "biweekly" | "off"
  autoReflectionDay: "monday",       // day of week for weekly

  // Safety
  protectedFields: [                 // fields that can never be auto-modified
    "neverDo",
    "blockedTopics",
    "escalationTriggers",
  ],
}
```

### Default Policy

```typescript
const DEFAULT_SOUL_EVOLUTION_POLICY = {
  maxProposalsPerDay: 3,
  maxProposalsPerWeek: 10,
  cooldownAfterRejection: "24h",
  cooldownBetweenProposals: "4h",
  requireMinConversations: 20,
  requireMinSessions: 5,
  maxPendingProposals: 5,
  autoReflectionSchedule: "weekly",
  autoReflectionDay: "monday",
  protectedFields: ["neverDo", "blockedTopics", "escalationTriggers"],
};
```

### Rate Limit Checks

```typescript
async function canCreateProposal(ctx, agentId): Promise<{ allowed: boolean, reason?: string }> {
  const policy = await getSoulEvolutionPolicy(ctx, agentId);

  // Check pending count
  const pendingCount = await getPendingProposalCount(ctx, agentId);
  if (pendingCount >= policy.maxPendingProposals) {
    return { allowed: false, reason: "Too many pending proposals — review existing ones first" };
  }

  // Check daily limit
  const todayCount = await getProposalCountSince(ctx, agentId, startOfDay());
  if (todayCount >= policy.maxProposalsPerDay) {
    return { allowed: false, reason: "Daily proposal limit reached" };
  }

  // Check weekly limit
  const weekCount = await getProposalCountSince(ctx, agentId, startOfWeek());
  if (weekCount >= policy.maxProposalsPerWeek) {
    return { allowed: false, reason: "Weekly proposal limit reached" };
  }

  // Check cooldown after rejection
  const lastRejection = await getLastRejection(ctx, agentId);
  if (lastRejection) {
    const cooldownMs = parseDuration(policy.cooldownAfterRejection);
    if (Date.now() - lastRejection.timestamp < cooldownMs) {
      return { allowed: false, reason: "Cooling down after recent rejection" };
    }
  }

  // Check cooldown between proposals
  const lastProposal = await getLastProposal(ctx, agentId);
  if (lastProposal) {
    const cooldownMs = parseDuration(policy.cooldownBetweenProposals);
    if (Date.now() - lastProposal.timestamp < cooldownMs) {
      return { allowed: false, reason: "Minimum gap between proposals not met" };
    }
  }

  // Check minimum data requirement
  const stats = await getAgentConversationStats(ctx, agentId);
  if (stats.totalMessages < policy.requireMinConversations) {
    return { allowed: false, reason: "Not enough conversation data" };
  }
  if (stats.uniqueSessions < policy.requireMinSessions) {
    return { allowed: false, reason: "Not enough unique sessions" };
  }

  return { allowed: true };
}
```

---

## Protected Fields

Some soul fields should never be auto-modified because they represent safety guardrails set by the owner.

```typescript
async function validateProposal(proposal, policy) {
  // Check if proposal targets a protected field
  if (policy.protectedFields.includes(proposal.targetField)) {
    return {
      valid: false,
      reason: `Field "${proposal.targetField}" is protected and cannot be modified by soul evolution. Owner must edit directly.`
    };
  }

  // Check for scope creep — proposal should be specific and bounded
  if (proposal.type === "modify" && proposal.targetField === "systemPrompt") {
    return {
      valid: false,
      reason: "Soul evolution cannot modify the full system prompt. Propose specific field changes instead."
    };
  }

  return { valid: true };
}
```

---

## Auto-Reflection Cron

```typescript
// convex/crons.ts
crons.weekly(
  "soul-reflection",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.ai.soulEvolution.scheduledReflection
);

// convex/ai/soulEvolution.ts
export const scheduledReflection = internalAction({
  handler: async (ctx) => {
    // Get all active agents with reflection enabled
    const agents = await ctx.runQuery(internal.agentOntology.getAgentsForReflection);

    for (const agent of agents) {
      const policy = agent.customProperties.soulEvolutionPolicy ?? DEFAULT_SOUL_EVOLUTION_POLICY;

      if (policy.autoReflectionSchedule === "off") continue;

      // Check if enough data since last reflection
      const canPropose = await ctx.runQuery(internal.ai.soulEvolution.canCreateProposal, {
        agentId: agent._id,
      });

      if (!canPropose.allowed) continue;

      // Run reflection (async, non-blocking)
      await ctx.scheduler.runAfter(0, internal.ai.soulEvolution.runSelfReflection, {
        agentId: agent._id,
      });
    }
  },
});
```

---

## Proposal Quality Scoring

To prevent subtle drift, proposals are scored before being sent to the owner.

```typescript
// During runSelfReflection
const qualityChecks = {
  // Evidence-based: proposal backed by multiple conversations
  evidenceScore: proposal.supportingConversations.length / 5,  // 0-1

  // Consistency: doesn't contradict existing soul
  consistencyScore: checkConsistency(proposal, currentSoul),   // 0-1

  // Specificity: proposal is targeted, not vague
  specificityScore: proposal.targetField !== "personality" ? 1 : 0.3,

  // Reversibility: change is easy to undo
  reversibilityScore: proposal.type === "add" ? 1 : 0.5,
};

const overallScore = Object.values(qualityChecks).reduce((a, b) => a + b) / 4;

// Only propose if quality threshold met
if (overallScore < 0.6) {
  return;  // silently discard low-quality proposal
}
```

---

## Proposal Feedback Loop

When an owner rejects a proposal, store feedback to improve future proposals.

```typescript
// On rejection
proposalFeedback: {
  proposalId: Id<"objects">,
  action: "rejected",
  ownerFeedback?: string,          // optional text from owner
  timestamp: number,
}

// In future reflections, include rejection history as negative examples
const rejectedProposals = await getRecentRejections(agentId, 10);
if (rejectedProposals.length > 0) {
  reflectionPrompt += `\n\nPreviously rejected proposals (avoid similar):\n`;
  for (const r of rejectedProposals) {
    reflectionPrompt += `- "${r.description}" — rejected ${r.reason || ""}\n`;
  }
}
```

---

## Soul Diff View

For owner transparency, show exactly what changed between versions.

```typescript
function generateSoulDiff(previousSoul, newSoul) {
  const diffs = [];

  for (const key of Object.keys(newSoul)) {
    const prev = previousSoul[key];
    const next = newSoul[key];

    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      if (Array.isArray(next)) {
        const added = next.filter(v => !prev?.includes(v));
        const removed = prev?.filter(v => !next.includes(v)) || [];
        if (added.length) diffs.push({ field: key, type: "added", values: added });
        if (removed.length) diffs.push({ field: key, type: "removed", values: removed });
      } else {
        diffs.push({ field: key, type: "modified", from: prev, to: next });
      }
    }
  }

  return diffs;
}

// Example output:
// [
//   { field: "traits", type: "added", values: ["empathetic"] },
//   { field: "greetingStyle", type: "modified", from: "formal", to: "casual" },
// ]
```
