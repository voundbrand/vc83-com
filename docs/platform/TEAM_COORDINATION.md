# Team Coordination

> Multi-agent sessions, handoff protocol, group chat, human escalation, and team harness operations.

---

## Overview

Agents don't work alone. Customers have complex needs that span multiple domains. A support agent needs a billing specialist. A sales agent needs a booking agent. And sometimes, a human needs to step in.

Team coordination provides:
1. **Agent-to-agent handoffs** — seamless transition between specialists
2. **Shared context** — compressed state that transfers between agents
3. **Human-in-the-loop** — escalation, takeover, and resume
4. **Group chat** — team visibility into customer conversations
5. **Coordination rules** — guardrails on handoff frequency, budgets, and permissions

---

## Team Session Model

### Schema Additions

```typescript
// agentSessions table — new fields
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
  conversationGoal: v.optional(v.string()),
  handoffNotes: v.optional(v.any()),  // Map<agentId, string>

  // Human escalation
  humanEscalationRequested: v.boolean(),
  humanEscalationReason: v.optional(v.string()),
  humanEscalationUrgency: v.optional(v.union(
    v.literal("low"), v.literal("normal"), v.literal("high")
  )),
  humanAgentUserId: v.optional(v.id("users")),
  humanTakeoverAt: v.optional(v.number()),
})),
```

### Team Coordination Config (per org)

```typescript
// On organization settings or agent config
teamCoordination: {
  // Which agents can be tagged in
  availableAgents: Id<"objects">[],

  // Handoff limits
  maxHandoffsPerSession: 5,
  handoffCooldownMinutes: 2,

  // Who can tag in whom
  handoffPermissions: [
    { from: "primary-agent-id", to: ["billing-agent-id", "booking-agent-id"] },
    { from: "billing-agent-id", to: ["primary-agent-id"] },
    // "*" means any agent can tag in any other
  ],

  // Human escalation
  escalationRecipients: [
    { userId: "owner-user-id", channels: ["telegram", "email"] },
    { userId: "support-user-id", channels: ["telegram"] },
  ],
  escalationTimeout: "5m",        // if no human responds in 5 min, re-escalate

  // Budget
  teamBudgetPerSession: 100,      // credits, shared across all agents in session

  // Notifications
  notifyOwnerOnHandoff: true,
  notifyOwnerOnEscalation: true,
}
```

---

## Handoff Protocol

### Tag-In Tool

New tool added to the agent tool catalog:

```typescript
const tagInAgentTool = {
  name: "tag_in_agent",
  description: "Hand off the conversation to a specialist agent. Use when the customer's request is outside your expertise.",
  parameters: {
    targetAgentId: {
      type: "string",
      description: "ID of the agent to tag in",
    },
    reason: {
      type: "string",
      description: "Why this handoff is needed",
    },
    contextSummary: {
      type: "string",
      description: "Brief summary of conversation context for the next agent",
    },
    suggestedApproach: {
      type: "string",
      description: "Optional suggestion for how the next agent should handle this",
    },
    transitionMessage: {
      type: "string",
      description: "Optional message to send to the customer during transition",
    },
  },
};
```

### Handoff Execution

```typescript
async function executeHandoff(ctx, params) {
  const { sessionId, fromAgentId, targetAgentId, reason, contextSummary,
          suggestedApproach, transitionMessage } = params;

  const session = await ctx.db.get(sessionId);
  const teamConfig = await getTeamCoordination(ctx, session.organizationId);

  // --- Validation ---

  // 1. Target agent exists and is active
  const targetAgent = await ctx.db.get(targetAgentId);
  if (!targetAgent || targetAgent.customProperties.status !== "active") {
    return { error: "Target agent not found or inactive" };
  }

  // 2. Same org
  if (targetAgent.customProperties.organizationId !== session.organizationId) {
    return { error: "Cannot hand off to agent in different organization" };
  }

  // 3. Handoff count within limit
  const handoffCount = session.teamSession?.handoffHistory?.length ?? 0;
  if (handoffCount >= teamConfig.maxHandoffsPerSession) {
    return { error: `Maximum handoffs (${teamConfig.maxHandoffsPerSession}) reached. Escalate to human instead.` };
  }

  // 4. Cooldown check
  const lastHandoff = session.teamSession?.handoffHistory?.at(-1);
  if (lastHandoff) {
    const cooldownMs = teamConfig.handoffCooldownMinutes * 60 * 1000;
    if (Date.now() - lastHandoff.timestamp < cooldownMs) {
      return { error: "Handoff cooldown active — wait before handing off again" };
    }
  }

  // 5. Permission check
  if (!isHandoffAllowed(teamConfig.handoffPermissions, fromAgentId, targetAgentId)) {
    return { error: "This handoff is not permitted by team configuration" };
  }

  // --- Execute ---

  // 6. Send transition message to customer
  if (transitionMessage) {
    await sendToCustomer(session, transitionMessage);
    await saveMessage(sessionId, "assistant", transitionMessage, {
      agentId: fromAgentId,
      isTransitionMessage: true,
    });
  }

  // 7. Update team session
  const updatedTeamSession = {
    isTeamSession: true,
    participatingAgentIds: [
      ...(session.teamSession?.participatingAgentIds ?? [fromAgentId]),
      ...(session.teamSession?.participatingAgentIds?.includes(targetAgentId) ? [] : [targetAgentId]),
    ],
    activeAgentId: targetAgentId,
    handoffHistory: [
      ...(session.teamSession?.handoffHistory ?? []),
      {
        fromAgentId,
        toAgentId: targetAgentId,
        reason,
        contextSummary,
        timestamp: Date.now(),
      },
    ],
    sharedContext: contextSummary,
    humanEscalationRequested: false,
  };

  await ctx.db.patch(sessionId, { teamSession: updatedTeamSession });

  // 8. Notify owner if configured
  if (teamConfig.notifyOwnerOnHandoff) {
    await notifyOwner(session.organizationId, "agent_handoff", {
      fromAgent: fromAgentId,
      toAgent: targetAgentId,
      reason,
      sessionId,
    });
  }

  return {
    success: true,
    message: `Handed off to ${targetAgent.customProperties.displayName}`,
  };
}
```

### Context Injection for Tagged-In Agent

When the tagged-in agent's next turn begins, the system prompt includes:

```
--- HANDOFF CONTEXT ---
You were tagged into this conversation by {fromAgentName}.
Reason: {reason}
Context summary: {contextSummary}
Suggested approach: {suggestedApproach}

The customer does not need to repeat themselves. Use the context above
to continue helping them seamlessly.
--- END HANDOFF CONTEXT ---
```

---

## Human Escalation

### Escalation Tool

```typescript
const escalateToHumanTool = {
  name: "escalate_to_human",
  description: "Escalate the conversation to a human team member. Use when you cannot resolve the customer's issue or they explicitly request a human.",
  parameters: {
    reason: {
      type: "string",
      description: "Why escalation is needed",
    },
    urgency: {
      type: "string",
      enum: ["low", "normal", "high"],
      description: "How urgent this escalation is",
    },
    contextSummary: {
      type: "string",
      description: "Brief summary for the human agent",
    },
    customerMessage: {
      type: "string",
      description: "Message to send to customer while they wait",
    },
  },
};
```

### Escalation Flow

```
Agent detects need for human
  │
  ▼
Agent calls escalate_to_human tool
  │
  ▼
System:
  1. Set session status = "handed_off"
  2. Set teamSession.humanEscalationRequested = true
  3. Record reason, urgency, context
  4. Send customer message ("Let me connect you with my team...")
  │
  ▼
Notify escalation recipients:
  ├── Telegram push to owner/support:
  │   "🆘 Escalation from Maya (HIGH urgency)
  │    Customer: John Smith
  │    Reason: Customer requesting refund approval
  │    Context: Order #1234, $50, delivered 3 days ago
  │
  │    [Take Over] [Assign] [Dismiss]"
  │
  ├── Team group (if teamGroupEnabled):
  │   Same message + conversation transcript
  │
  └── Email (if HIGH urgency and no response in 5 min):
      Full escalation details
  │
  ▼
Human responds:
  ├── [Take Over] → humanTakeoverAt = now, session routes to human
  ├── [Assign] → picks team member, routes to them
  └── [Dismiss] → resume agent with instruction
```

### Auto-Escalation Triggers

In addition to the agent explicitly calling `escalate_to_human`, the system auto-escalates when:

```typescript
const AUTO_ESCALATION_TRIGGERS = {
  // Customer sentiment drops
  sentiment_threshold: {
    condition: (metrics) => metrics.customerSentiment < -0.5,
    urgency: "high",
    reason: "Customer appears upset",
  },

  // Customer explicitly asks for human
  explicit_request: {
    patterns: [
      /talk to (a |an )?(human|person|agent|representative|manager)/i,
      /speak (to|with) (a |an )?(human|person|real|someone)/i,
      /i want (a |an )?(human|real person)/i,
      /customer service/i,
      /connect me/i,
    ],
    urgency: "normal",
    reason: "Customer explicitly requested human contact",
  },

  // Agent stuck in loop
  response_loop: {
    condition: (session) => detectRepetition(session.recentMessages, 2),
    urgency: "normal",
    reason: "Agent appears stuck in a response loop",
  },

  // Topic matches blockedTopics
  blocked_topic: {
    condition: (message, agent) => matchesBlockedTopics(message, agent.blockedTopics),
    urgency: "normal",
    reason: "Conversation touched a restricted topic",
  },

  // Agent says "I don't know" too many times
  uncertainty_threshold: {
    condition: (session) => session.uncertainResponses >= 3,
    urgency: "low",
    reason: "Agent unable to answer multiple questions",
  },
};
```

### Human Takeover & Resume

```typescript
// Human types in team group or dashboard
async function handleHumanMessage(ctx, sessionId, userId, message) {
  const session = await ctx.db.get(sessionId);

  if (session.status !== "handed_off") {
    throw new Error("Session is not in handoff mode");
  }

  // Record the human's takeover if not already recorded
  if (!session.teamSession.humanTakeoverAt) {
    await ctx.db.patch(sessionId, {
      teamSession: {
        ...session.teamSession,
        humanAgentUserId: userId,
        humanTakeoverAt: Date.now(),
      },
    });
  }

  // Send human's message to customer via channel
  await sendToCustomer(session, message);

  // Save to session history
  await saveMessage(sessionId, "human_agent", message, { userId });
}

// Human types "@agent resume" or clicks Resume
async function resumeAgent(ctx, sessionId) {
  const session = await ctx.db.get(sessionId);

  // Compile what happened during human takeover
  const humanMessages = await getMessagesSince(session._id, session.teamSession.humanTakeoverAt);
  const humanSummary = await generateHandoverSummary(humanMessages);

  await ctx.db.patch(sessionId, {
    status: "active",
    teamSession: {
      ...session.teamSession,
      humanEscalationRequested: false,
      humanAgentUserId: undefined,
      humanTakeoverAt: undefined,
      sharedContext: humanSummary,  // inject what human resolved
    },
  });

  // Agent's next turn will include: "A team member resolved the following: {humanSummary}"
}
```

---

## Group Chat Architecture

### Team Group Setup

Each org can have a Telegram team group where:
- Customer conversations are mirrored (anonymized or full)
- Human team members can observe agent behavior
- Humans can intervene with `@agent` commands
- Escalations appear as highlighted messages

### Group Chat Commands

```
@agent pause     → Pause agent, human takes over current session
@agent resume    → Resume agent on current session
@agent status    → Show agent's current session count, active conversations
@agent history   → Show recent conversation summary
@agent soul      → Show current soul summary
@agent rollback  → Show soul version history with rollback options
```

### Message Mirroring

```typescript
// After every agent response in a customer session
async function mirrorToTeamGroup(session, agentMessage, customerMessage) {
  const teamGroupChatId = session.teamGroupChatId;
  if (!teamGroupChatId || !session.teamGroupEnabled) return;

  // Format for team group
  const mirrorMessage = [
    `💬 **${session.customerName || "Customer"}** (${session.channel}):`,
    `> ${customerMessage}`,
    ``,
    `🤖 **${session.agentName}**:`,
    `> ${agentMessage}`,
  ].join("\n");

  // Include tool calls if any
  if (session.lastToolCalls?.length > 0) {
    mirrorMessage += `\n\n🔧 Tools used: ${session.lastToolCalls.join(", ")}`;
  }

  await sendToTelegramGroup(teamGroupChatId, mirrorMessage);
}
```

### Mirroring Controls

```typescript
// Per-org team group settings
teamGroupSettings: {
  enabled: boolean,
  chatId: string,
  mirrorMode: "all" | "escalations_only" | "summaries",
  // "all" — every message mirrored
  // "escalations_only" — only when escalated or human tagged
  // "summaries" — daily/session summaries only
  anonymizeCustomer: boolean,        // hide customer identity
  includeToolCalls: boolean,         // show what tools agent used
  includeAgentThinking: boolean,     // show agent's reasoning (if available)
}
```

---

## Coordination Patterns

### Pattern 1: Support + Billing Handoff

```
Customer: "I was charged twice for my subscription"
  │
  ▼
Support Agent (Maya):
  "I'm sorry about that! Let me connect you with our billing specialist."
  → tag_in_agent(billing-agent, "double charge, subscription")
  │
  ▼
Billing Agent (Atlas):
  "Hi! Maya told me about the double charge. Let me look into your account..."
  → Uses check_invoices, process_refund tools
  "I've initiated a refund for the duplicate charge. You should see it in 3-5 days."
  → tag_in_agent(primary-agent, "refund processed, returning to Maya")
  │
  ▼
Support Agent (Maya):
  "Great, Atlas has taken care of the refund! Is there anything else I can help with?"
```

### Pattern 2: Auto-Escalation

```
Customer: "This is the third time I've had this issue. I want to speak to a manager."
  │
  ▼
Auto-escalation trigger: explicit_request pattern matched
  │
  ▼
Agent (Maya):
  "I completely understand your frustration. Let me connect you with a team member right away."
  → escalate_to_human(urgency: "high", reason: "Repeat issue, customer requesting manager")
  │
  ▼
Owner receives Telegram notification:
  "🆘 HIGH: Customer requesting manager (repeat issue)
   [Take Over] [Assign to Support Team]"
```

### Pattern 3: Supervised Mode Team

```
New org with autonomy="supervised"
  │
  ▼
Customer: "Can you send me a quote?"
  │
  ▼
Agent (Maya):
  Wants to use create_invoice tool → approval required
  → Creates approval request
  → "I'm preparing that for you — just need a quick confirmation from my team."
  │
  ▼
Owner approves via Telegram inline button
  │
  ▼
Agent (Maya):
  Invoice created and sent
  "Done! I've sent the quote to your email."
```

---

## Design Decisions

### Why not allow cross-org handoffs?

Security and data isolation. An agent from Org A should never see Org B's customer data. Even in the agency model (parent→child orgs), handoffs stay within the same org context.

### Why limit handoffs per session?

Preventing handoff ping-pong. If Agent A hands to Agent B who hands back to Agent A who hands to Agent C, the customer experience degrades. The limit (default: 5) forces escalation to a human instead of endless agent shuffling.

### Why a cooldown between handoffs?

Same reason — prevent rapid back-and-forth. A 2-minute cooldown ensures each agent gets a chance to meaningfully engage before handing off.

### Why mirror to team groups?

Transparency. Org owners need to see what their agents are doing. Group chat mirroring provides real-time visibility without requiring the owner to watch a dashboard. It also enables quick human intervention via `@agent` commands.
