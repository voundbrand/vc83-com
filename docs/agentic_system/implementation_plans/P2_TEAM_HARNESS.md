# P2: Team Harness & Agent Handoffs

> Priority: MEDIUM | Estimated complexity: High | Files touched: 6-8
> Prerequisites: P0 (error harness, session TTL), P1 (system bot protection, tool scoping)

---

## Problem Statement

`participatingAgentIds` exists in the session schema but is completely unwired. No agent-to-agent communication. No handoff logic. No shared context between agents. No human takeover protocol. Agents operate in complete isolation.

---

## Deliverables

1. **Team session model** — `teamSession` field on `agentSessions`
2. **`tag_in_agent` tool** — agent-initiated handoffs with context transfer
3. **`escalate_to_human` tool** — human escalation with notification
4. **Handoff validation** — permissions, cooldowns, caps
5. **Context injection** — shared context in tagged-in agent's system prompt
6. **Human takeover/resume** — via team group or dashboard
7. **Team coordination config** — per-org settings

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/schemas/agentSessionSchemas.ts` | Add `teamSession` field |
| `convex/ai/agentExecution.ts` | Check teamSession for active agent, inject handoff context in prompt |
| `convex/ai/tools/registry.ts` | Register `tag_in_agent` and `escalate_to_human` tools |
| `convex/ai/agentSessions.ts` | Add handoff/escalation mutations |
| `convex/integrations/telegram.ts` | Handle team group commands, escalation notifications |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/tools/teamTools.ts` | `tag_in_agent` and `escalate_to_human` tool implementations |
| `convex/ai/teamHarness.ts` | Handoff execution, validation, context management |

---

## Schema Changes

```typescript
// agentSessions table
teamSession: v.optional(v.object({
  isTeamSession: v.boolean(),
  participatingAgentIds: v.array(v.id("objects")),
  activeAgentId: v.id("objects"),
  handoffHistory: v.array(v.object({
    fromAgentId: v.id("objects"),
    toAgentId: v.id("objects"),
    reason: v.string(),
    contextSummary: v.string(),
    timestamp: v.number(),
  })),
  sharedContext: v.optional(v.string()),
  humanEscalationRequested: v.boolean(),
  humanEscalationReason: v.optional(v.string()),
  humanEscalationUrgency: v.optional(v.string()),
  humanAgentUserId: v.optional(v.id("users")),
  humanTakeoverAt: v.optional(v.number()),
})),
```

---

## Key Implementation Details

### Pipeline Modifications (agentExecution.ts)

**At step 1** — check if team session has a different `activeAgentId`:
```typescript
// If team session exists, use the active agent instead of the session's original agent
const effectiveAgentId = session.teamSession?.activeAgentId ?? session.agentId;
const agent = await getAgentConfig(ctx, effectiveAgentId);
```

**At step 5** — inject handoff context:
```typescript
if (session.teamSession?.sharedContext) {
  const lastHandoff = session.teamSession.handoffHistory.at(-1);
  systemPrompt += `\n\n--- HANDOFF CONTEXT ---\n`;
  systemPrompt += `You were tagged in by a colleague.\n`;
  systemPrompt += `Reason: ${lastHandoff.reason}\n`;
  systemPrompt += `Context: ${session.teamSession.sharedContext}\n`;
  systemPrompt += `Continue helping the customer seamlessly.\n`;
  systemPrompt += `--- END HANDOFF CONTEXT ---`;
}
```

**At step 7** — include `tag_in_agent` and `escalate_to_human` in available tools when team coordination is configured for the org.

### Tool Implementations

See [TEAM_COORDINATION.md](../TEAM_COORDINATION.md) for full handoff protocol and escalation flow specifications.

### Auto-Escalation Detection

In `agentExecution.ts`, before step 8 (LLM call), check auto-escalation triggers:

```typescript
const autoEscalation = checkAutoEscalation(userMessage, session, agentConfig);
if (autoEscalation) {
  await executeEscalation(ctx, session, autoEscalation.reason, autoEscalation.urgency);
  return { status: "escalated" };
}
```

---

## Testing Strategy

1. **Handoff happy path**: Agent A tags in Agent B, context transfers, Agent B responds
2. **Handoff validation**: blocked when cap reached, cooldown active, or permission denied
3. **Escalation**: agent escalates, owner notified, session marked as handed_off
4. **Human takeover**: human sends message, routed to customer
5. **Human resume**: agent resumes with human's resolution as context
6. **Auto-escalation**: customer says "talk to a human", auto-triggers escalation

---

## Success Criteria

- [ ] Agents can hand off to other agents within the same org
- [ ] Handoff context transfers seamlessly
- [ ] Handoff limits enforced (max per session, cooldown, permissions)
- [ ] Human escalation works with Telegram notifications
- [ ] Human can take over and resume agent
- [ ] Auto-escalation triggers on customer requests and blocked topics
