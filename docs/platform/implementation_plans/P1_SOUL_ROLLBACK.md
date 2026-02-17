# P1: Soul Rollback & Rate Limiting

> Priority: HIGH | Estimated complexity: Low-Medium | Files touched: 2-3

---

## Problem Statement

Soul version history exists but is audit-only — no rollback mechanism. No rate limiting on proposals. No cooldown after rejection. No minimum data requirements. Agents can spam owners with proposals. No auto-reflection cron trigger.

---

## Deliverables

1. **`rollbackSoul` mutation** — revert to any previous version
2. **`soulEvolutionPolicy` config** — rate limits, cooldowns, gates
3. **Rate limit checks** in proposal creation flow
4. **Protected fields** that can't be auto-modified
5. **Auto-reflection cron** with configurable schedule
6. **Owner UX** — Telegram version history + rollback buttons

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/ai/soulEvolution.ts` | Add `rollbackSoul`, rate limit checks, protected field validation, cron handler |
| `convex/schemas/soulEvolutionSchemas.ts` | Add `fromVersion`, `toVersion`, `changedBy` to history schema |
| `convex/crons.ts` | Add weekly soul reflection cron |

---

## Implementation Steps

### Step 1: Add rollback mutation

```typescript
// convex/ai/soulEvolution.ts
export const rollbackSoul = internalMutation({
  args: {
    agentId: v.id("objects"),
    targetVersion: v.number(),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");
    if (agent.customProperties.protected) {
      throw new Error("Cannot modify protected system agent");
    }

    // Find target version
    const targetHistory = await ctx.db.query("soulVersionHistory")
      .withIndex("by_agent", q => q.eq("agentId", args.agentId))
      .filter(q => q.eq(q.field("version"), args.targetVersion))
      .first();

    if (!targetHistory) throw new Error(`Version ${args.targetVersion} not found`);

    const targetSoul = JSON.parse(targetHistory.newSoul);
    const currentSoul = agent.customProperties.soul;
    const currentVersion = currentSoul?.version ?? 1;
    const newVersion = currentVersion + 1;

    // Apply rollback
    await ctx.db.patch(args.agentId, {
      customProperties: {
        ...agent.customProperties,
        soul: { ...targetSoul, version: newVersion },
      },
    });

    // Record in history
    await ctx.db.insert("soulVersionHistory", {
      agentId: args.agentId,
      version: newVersion,
      previousSoul: JSON.stringify(currentSoul),
      newSoul: JSON.stringify({ ...targetSoul, version: newVersion }),
      changeType: "rollback",
      fromVersion: currentVersion,
      toVersion: args.targetVersion,
      changedBy: args.requestedBy,
      timestamp: Date.now(),
    });

    return { success: true, newVersion };
  },
});
```

### Step 2: Add soul evolution policy config

```typescript
const DEFAULT_SOUL_EVOLUTION_POLICY = {
  maxProposalsPerDay: 3,
  maxProposalsPerWeek: 10,
  cooldownAfterRejection: 24 * 60 * 60 * 1000,  // 24h in ms
  cooldownBetweenProposals: 4 * 60 * 60 * 1000,  // 4h in ms
  requireMinConversations: 20,
  requireMinSessions: 5,
  maxPendingProposals: 5,
  autoReflectionSchedule: "weekly",
  protectedFields: ["neverDo", "blockedTopics", "escalationTriggers"],
};
```

### Step 3: Add rate limit check before proposal creation

```typescript
async function canCreateProposal(ctx, agentId) {
  const agent = await ctx.db.get(agentId);
  if (agent.customProperties.protected) return { allowed: false, reason: "Protected agent" };

  const policy = agent.customProperties.soulEvolutionPolicy ?? DEFAULT_SOUL_EVOLUTION_POLICY;

  // Pending count
  const pending = await ctx.db.query("objects")
    .withIndex("by_org_type", q => q.eq("type", "soul_proposal"))
    .filter(q => q.and(
      q.eq(q.field("customProperties.agentId"), agentId),
      q.eq(q.field("customProperties.status"), "pending"),
    ))
    .collect();

  if (pending.length >= policy.maxPendingProposals) {
    return { allowed: false, reason: "Too many pending proposals" };
  }

  // Daily count
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentProposals = await ctx.db.query("objects")
    .withIndex("by_org_type", q => q.eq("type", "soul_proposal"))
    .filter(q => q.and(
      q.eq(q.field("customProperties.agentId"), agentId),
      q.gte(q.field("_creationTime"), dayAgo),
    ))
    .collect();

  if (recentProposals.length >= policy.maxProposalsPerDay) {
    return { allowed: false, reason: "Daily limit reached" };
  }

  // Rejection cooldown
  const lastRejection = await ctx.db.query("objects")
    .withIndex("by_org_type", q => q.eq("type", "soul_proposal"))
    .filter(q => q.and(
      q.eq(q.field("customProperties.agentId"), agentId),
      q.eq(q.field("customProperties.status"), "rejected"),
    ))
    .order("desc")
    .first();

  if (lastRejection) {
    const rejectedAt = lastRejection.customProperties.reviewedAt ?? lastRejection._creationTime;
    if (Date.now() - rejectedAt < policy.cooldownAfterRejection) {
      return { allowed: false, reason: "Cooling down after rejection" };
    }
  }

  return { allowed: true };
}
```

### Step 4: Add protected field validation

```typescript
function validateProposalTarget(proposal, policy) {
  if (policy.protectedFields.includes(proposal.targetField)) {
    return { valid: false, reason: `"${proposal.targetField}" is protected` };
  }
  return { valid: true };
}
```

### Step 5: Wire rate checks into existing proposal flow

Insert `canCreateProposal` check at the top of the proposal creation function:

```typescript
// In createSoulProposal or wherever proposals are created
const check = await canCreateProposal(ctx, agentId);
if (!check.allowed) {
  console.log(`[SoulEvolution] Proposal blocked: ${check.reason}`);
  return null; // silently skip
}

const validation = validateProposalTarget(proposal, policy);
if (!validation.valid) {
  console.log(`[SoulEvolution] Proposal invalid: ${validation.reason}`);
  return null;
}
```

### Step 6: Add auto-reflection cron

```typescript
// convex/crons.ts
crons.weekly("soul-reflection", { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.ai.soulEvolution.scheduledReflection
);

// convex/ai/soulEvolution.ts
export const scheduledReflection = internalAction({
  handler: async (ctx) => {
    const agents = await ctx.runQuery(internal.agentOntology.listActiveAgents);

    for (const agent of agents) {
      if (agent.customProperties.protected) continue;
      const policy = agent.customProperties.soulEvolutionPolicy ?? DEFAULT_SOUL_EVOLUTION_POLICY;
      if (policy.autoReflectionSchedule === "off") continue;

      const check = await ctx.runQuery(internal.ai.soulEvolution.canCreateProposalQuery, {
        agentId: agent._id,
      });
      if (!check.allowed) continue;

      // Schedule reflection (staggered to avoid spike)
      const delay = Math.random() * 60 * 60 * 1000; // random 0-60 min
      await ctx.scheduler.runAfter(delay, internal.ai.soulEvolution.runSelfReflection, {
        agentId: agent._id,
      });
    }
  },
});
```

### Step 7: Version history + rollback via Telegram

Add a Telegram inline keyboard flow for owners to view soul history and trigger rollback. This integrates with the existing Telegram bot notification system.

```typescript
// Handler for "soul_history" callback
async function handleSoulHistoryCallback(ctx, agentId, callbackData) {
  if (callbackData === "soul_history") {
    const history = await ctx.db.query("soulVersionHistory")
      .withIndex("by_agent", q => q.eq("agentId", agentId))
      .order("desc")
      .take(5);

    const text = formatVersionHistory(history);
    return { text, buttons: history.map(h => ({
      text: `Rollback to v${h.version}`,
      callback_data: `soul_rollback_${h.version}`,
    }))};
  }

  if (callbackData.startsWith("soul_rollback_")) {
    const targetVersion = parseInt(callbackData.replace("soul_rollback_", ""));
    await ctx.runMutation(internal.ai.soulEvolution.rollbackSoul, {
      agentId, targetVersion, requestedBy: "owner_telegram",
    });
    return { text: `Rolled back to version ${targetVersion}.` };
  }
}
```

---

## Testing Strategy

1. **Unit test**: rollback reverts soul to target version, increments version number
2. **Unit test**: rate limit blocks proposals when daily/weekly limit hit
3. **Unit test**: cooldown after rejection enforced
4. **Unit test**: protected fields can't be targeted
5. **Integration test**: weekly cron triggers reflection for eligible agents
6. **Integration test**: Telegram rollback callback works end-to-end

---

## Success Criteria

- [ ] Owners can rollback soul to any previous version via Telegram
- [ ] Rollback creates new version entry (audit trail maintained)
- [ ] Proposals rate-limited per day/week
- [ ] Cooldown after rejection (24h default)
- [ ] Protected fields (`neverDo`, `blockedTopics`, `escalationTriggers`) can't be auto-modified
- [ ] Weekly auto-reflection cron runs for eligible agents
- [ ] Protected agents are immune to proposals
