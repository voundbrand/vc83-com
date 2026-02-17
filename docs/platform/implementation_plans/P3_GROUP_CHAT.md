# P3: Group Chat & Team Mirroring

> Priority: LOW | Estimated complexity: Medium | Files touched: 3-4
> Prerequisites: P2 (team harness, human-in-the-loop)

---

## Problem Statement

No group chat support. Org owners can't observe their agent's conversations in real-time. No way for team members to see what the agent is doing or intervene quickly via a familiar interface (Telegram group).

---

## Deliverables

1. **Team Telegram group setup** — link a Telegram group to an org
2. **Message mirroring** — customer conversations mirrored to team group
3. **Mirror modes** — all / escalations only / summaries only
4. **Team commands** — `@agent pause`, `@agent resume`, `@agent status`, `@agent rollback`
5. **Human intervention via group** — type in group to respond to customer
6. **Anonymization option** — hide customer identity in team group

---

## Design

### Team Group Setup Flow

```
Owner creates Telegram group → adds @l4yercak3_bot
  ↓
Bot detects group add event → sends setup message:
  "I've been added to this group. Link it as your team chat?
   [Link to {orgName}] [Cancel]"
  ↓
Owner taps [Link] → group registered as teamGroupChatId
  ↓
Bot confirms: "This group is now your team dashboard for {agentName}.
  I'll mirror conversations here based on your settings.
  Type /mirror to configure mirroring mode."
```

### Mirror Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `all` | Every customer message + agent response mirrored | Active monitoring |
| `escalations_only` | Only when escalated or human tagged | Low-noise |
| `summaries` | Session summaries posted on close | Daily review |

### Team Commands

```
@agent pause     → Pause agent on current/specified session
@agent resume    → Resume agent after human intervention
@agent status    → Show active sessions, pending escalations
@agent history   → Recent session summaries
@agent soul      → Show current soul configuration
@agent rollback  → Show soul version history with rollback options
@agent help      → List available commands
```

### Message Format in Group

```
💬 Customer (Telegram) — Session #abc123
━━━━━━━━━━━━━━━━━━━━━━
> Can I get a refund on my last order?

🤖 Maya
> I'd be happy to help with that! Let me look up your order...
> 🔧 Used: search_contacts, query_org_data
> 📊 Found order #1234 ($50, delivered 3 days ago)

> I can see your order #1234. Our refund policy allows returns
> within 7 days. Would you like me to process a refund?
━━━━━━━━━━━━━━━━━━━━━━
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/integrations/telegram.ts` | Handle group events, mirror messages, team commands |
| `convex/ai/agentExecution.ts` | After step 13, call mirror function |
| `convex/http.ts` | Handle group chat webhook events |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/teamGroup.ts` | Mirror logic, command parsing, group setup, anonymization |

---

## Key Implementation

### Mirror After Agent Response

In `agentExecution.ts`, after step 13 (channel send):

```typescript
// Mirror to team group if configured
const teamGroupConfig = await getTeamGroupConfig(ctx, orgId);
if (teamGroupConfig?.enabled) {
  await mirrorToTeamGroup(ctx, {
    teamGroupChatId: teamGroupConfig.chatId,
    mirrorMode: teamGroupConfig.mirrorMode,
    customerMessage: userMessage,
    agentResponse: assistantMessage,
    toolCalls: executedTools,
    session,
    anonymize: teamGroupConfig.anonymizeCustomer,
  });
}
```

### Human Reply Detection

When a message comes from the team group (not the bot):

```typescript
// In telegram webhook handler
if (isFromTeamGroup(chatId) && !isFromBot(senderId)) {
  // Human is responding — check if there's an active escalation
  const session = await getEscalatedSessionForGroup(chatId);
  if (session) {
    await handleHumanMessage(ctx, session._id, senderId, messageText);
    // Route human's message to customer via the session's channel
  }
}
```

---

## Configuration

```typescript
// Per-org team group settings
teamGroupSettings: {
  enabled: boolean,
  chatId: string,                     // Telegram group chat ID
  mirrorMode: "all" | "escalations_only" | "summaries",
  anonymizeCustomer: boolean,
  includeToolCalls: boolean,
  includeSessionId: boolean,
}
```

---

## Success Criteria

- [ ] Org owners can link a Telegram group as their team chat
- [ ] Customer conversations mirrored based on configured mode
- [ ] Team commands work (`@agent pause/resume/status/rollback`)
- [ ] Human messages in group route to customer when session is escalated
- [ ] Customer identity optionally anonymized
- [ ] Tool usage shown in mirrored messages (optional)
