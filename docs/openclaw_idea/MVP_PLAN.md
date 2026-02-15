# MVP Plan: Agent Harness + SOUL.md + CLI WhatsApp Relay

**Goal:** Replicate the OpenClaw "aha effect" — a self-aware agent with a soul that you can message via WhatsApp and watch it think, respond, and evolve.

**Approach:** Build on what exists. Don't rebuild — upgrade.

---

## What We Already Have (No Work Needed)

| Component | Status | Location |
|---|---|---|
| WhatsApp integration | Production-ready | `convex/channels/providers/whatsappProvider.ts` |
| WhatsApp OAuth | Working | `convex/oauth/whatsapp.ts` |
| Webhook handling | Working | `convex/channels/webhooks.ts` |
| Channel router | Working | `convex/channels/router.ts` |
| Agent execution pipeline | 13-step pipeline | `convex/ai/agentExecution.ts` |
| Agent config (personality, brand voice, system prompt) | Working | `convex/agentOntology.ts` |
| Tool registry + filtering | Working | `convex/ai/tools/registry.ts` |
| Session management | Working | `convex/ai/agentSessions.ts` |
| Knowledge system (13KB customer, 78KB setup) | Working | `convex/ai/systemKnowledge/` |
| Credit system | Working | `convex/credits/` |

---

## MVP: Three Features, Three Layers

### Feature 1: SOUL.md — Agent Personality Framework

**What:** Replace the flat `personality` + `brandVoiceInstructions` + `systemPrompt` fields with a structured, editable SOUL.md document per agent.

**Why this is the "aha":** Right now, agent personality is scattered across 3+ config fields. SOUL.md unifies it into one living document that the agent is aware of and can reference.

#### 1a. Soul Schema

Add a `soul` field to agent customProperties:

```typescript
// In agentOntology.ts — extend org_agent customProperties
soul: {
  // Identity
  name: string;              // Agent's self-chosen or assigned name
  tagline: string;           // One-liner identity ("I'm Maya, your growth strategist")

  // Personality
  traits: string[];          // ["warm", "direct", "curious", "patient"]
  communicationStyle: string; // "Conversational and supportive, uses analogies..."
  toneGuidelines: string;   // "Never be pushy. Lead with questions..."

  // Values & Boundaries
  coreValues: string[];      // ["honesty", "customer-first", "no pressure"]
  neverDo: string[];         // ["Never promise specific results", "Never share pricing unprompted"]
  alwaysDo: string[];        // ["Always use the customer's name", "Always offer to connect with a human"]

  // Behavioral Rules
  escalationTriggers: string[];  // ["customer sounds upset", "legal question", "HIPAA mention"]

  // Voice
  greetingStyle: string;     // How the agent opens conversations
  closingStyle: string;      // How the agent ends conversations
  emojiUsage: "none" | "minimal" | "moderate" | "expressive";

  // The full markdown soul (generated from above + user edits)
  soulMarkdown: string;      // The rendered SOUL.md content

  // Meta
  version: number;
  lastUpdatedAt: number;
  generatedBy: "wizard" | "manual" | "agent_self";
}
```

#### 1b. Soul Builder UI

A wizard in the agent config panel:

1. **Step 1: Name & Identity** — "What should your agent be called?" + auto-generate tagline
2. **Step 2: Personality** — Pick traits from a palette (warm/professional/casual/formal/witty/serious)
3. **Step 3: Rules** — "What should your agent never do?" + "What should it always do?"
4. **Step 4: Voice** — Sample greeting/closing, emoji preference
5. **Step 5: Preview** — Shows the rendered SOUL.md, user can edit directly
6. **Step 6: Save** — Stores soul, rebuilds system prompt

#### 1c. Soul → System Prompt Integration

Modify `buildAgentSystemPrompt()` in `agentExecution.ts`:

```typescript
// Current: scattered fields
// NEW: unified soul injection
if (agentConfig.soul?.soulMarkdown) {
  parts.push("## YOUR SOUL (Who You Are)\n");
  parts.push(agentConfig.soul.soulMarkdown);
  parts.push("\n---\n");
}
```

The soul goes BEFORE knowledge and FAQ — it's the agent's foundation.

#### 1d. "Give Yourself a Soul" (Agent Self-Generation)

Like Peter did with OpenClaw — let the agent generate its own soul:

- Add a button: "Let your agent define itself"
- Feed the agent: org name, industry, existing FAQs, knowledge base summary
- Prompt: "Based on this business context, create your SOUL.md — give yourself a name, personality, and behavioral rules"
- User reviews and edits the result

**Files to modify:**
- `convex/agentOntology.ts` — add soul field to schema
- `convex/ai/agentExecution.ts` — inject soul into system prompt
- `src/components/` — new Soul Builder wizard component
- New: `convex/ai/soulGenerator.ts` — agent self-generation logic

---

### Feature 2: Agent Harness — Self-Awareness Layer

**What:** Make the agent deeply aware of its own runtime context — what model it runs, what tools it has, what channels it's connected to, its own soul.

**Why this is the "aha":** The agent can introspect. When asked "what can you do?", it gives a real answer, not a hallucinated one. When a tool fails, it knows to try alternatives.

#### 2a. Harness Context Builder

New function that builds a self-awareness block for the system prompt:

```typescript
// New: convex/ai/harness.ts

function buildHarnessContext(config: AgentConfig): string {
  return `
## YOUR HARNESS (Self-Awareness)

**Identity:** ${config.soul?.name || config.displayName}
**Model:** ${config.modelId} (via ${config.modelProvider})
**Autonomy:** ${config.autonomyLevel}
**Channels:** ${config.channelBindings.filter(c => c.enabled).map(c => c.channel).join(", ")}

**Available Tools:**
${config.filteredTools.map(t => `- ${t.name}: ${t.description} [${t.status}]`).join("\n")}

**Rate Limits:**
- Max messages/day: ${config.maxMessagesPerDay}
- Max cost/day: $${config.maxCostPerDay}
- Current usage: ${stats.messagesToday}/${config.maxMessagesPerDay} messages

**Knowledge Base:** ${config.knowledgeBaseTags.length} document tags loaded
**FAQ Entries:** ${config.faqEntries.length} entries

**Self-Awareness Instructions:**
- You know exactly which tools you have. Don't claim capabilities you lack.
- If a tool fails, explain what happened and suggest alternatives.
- If asked "what can you do?", reference your actual tool list above.
- You can see your own soul and personality — be consistent with it.
`;
}
```

#### 2b. Inject Harness into Pipeline

Modify `processInboundMessage()` to include harness context:

```typescript
// In agentExecution.ts, after building system prompt
const harnessContext = buildHarnessContext(agentConfig, filteredTools, sessionStats);
systemPrompt = harnessContext + "\n\n" + systemPrompt;
```

**Prompt layer order (top to bottom):**
1. Harness (self-awareness) — NEW
2. Soul (personality & rules) — NEW
3. System knowledge frameworks (existing)
4. Organization knowledge base (existing)
5. FAQ entries (existing)
6. Interview context (existing, if guided mode)

#### 2c. Runtime Stats Injection

Include live stats so the agent knows its own state:

```typescript
**Current Session:**
- Messages in this conversation: ${session.messageCount}
- Session started: ${formatTimestamp(session.startedAt)}
- Last message: ${formatTimestamp(session.lastMessageAt)}
- CRM contact linked: ${session.crmContactId ? "Yes" : "No"}
- Channel: ${session.channel}
```

**Files to modify:**
- New: `convex/ai/harness.ts` — harness context builder
- `convex/ai/agentExecution.ts` — inject harness into prompt pipeline

---

### Feature 3: CLI WhatsApp Relay (Test & Demo Tool)

**What:** A simple CLI script that lets you test agent conversations locally — type a message, see the agent think, get a response. Optionally relay to/from WhatsApp for live demos.

**Why this is the "aha":** Instant feedback loop. No UI needed. Type → see agent respond with full harness + soul context. Like OpenClaw's terminal experience.

#### 3a. CLI Test Mode (No WhatsApp Required)

A local script that calls `processInboundMessage` directly:

```typescript
// scripts/agent-cli.ts
// Usage: npx tsx scripts/agent-cli.ts --org <orgId> --agent <agentId>

import { ConvexHttpClient } from "convex/browser";
import readline from "readline";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("Agent CLI - Type a message (Ctrl+C to quit)");
console.log("---");

function prompt() {
  rl.question("You: ", async (message) => {
    const result = await client.action(api.ai.agentExecution.processInboundMessage, {
      organizationId: args.org,
      channel: "api_test",
      externalContactIdentifier: "cli-user@test",
      message,
      metadata: { providerId: "direct", source: "cli" }
    });

    console.log(`Agent: ${result.response}`);
    console.log("---");
    prompt();
  });
}

prompt();
```

#### 3b. CLI WhatsApp Bridge (Live Demo)

A bridge script that connects the CLI to a real WhatsApp number:

```typescript
// scripts/whatsapp-bridge.ts
// Usage: npx tsx scripts/whatsapp-bridge.ts --org <orgId>

// Option A: Poll for new messages via Convex query
// Option B: Use Convex real-time subscription

// Shows:
// 1. Incoming WhatsApp messages in terminal
// 2. Agent's response generation (with harness/soul info)
// 3. Outbound response sent back to WhatsApp
// 4. Tool calls executed (if any)

// This is purely a VIEWER — messages still flow through the normal
// webhook → agentExecution → router pipeline
```

#### 3c. Debug Output

The CLI shows what's happening inside the harness:

```
[WhatsApp] +1-555-123-4567: "Hey, what services do you offer?"

[Harness] Agent: Maya (claude-sonnet-4-5) | Channel: whatsapp | Autonomy: autonomous
[Soul] Traits: warm, direct, curious | Style: conversational
[Memory] Session #42 | 3 prior messages | CRM contact: John Doe
[Tools] 8 available | 2 restricted

[Agent] Maya: "Hey John! Great to hear from you. We offer three main services..."

[Stats] Tokens: 847 | Cost: $0.003 | Response time: 1.2s
---
```

**Files to create:**
- `scripts/agent-cli.ts` — local test CLI
- `scripts/whatsapp-bridge.ts` — live WhatsApp viewer/bridge

---

## Implementation Order

### Phase 1: Soul (3-4 sessions)
1. Add soul schema to `agentOntology.ts`
2. Build soul → system prompt injection in `agentExecution.ts`
3. Create `soulGenerator.ts` for agent self-generation
4. Build Soul Builder wizard UI component
5. Test: create an agent with a soul, verify it shows in responses

### Phase 2: Harness (2-3 sessions)
1. Create `convex/ai/harness.ts` — context builder
2. Inject harness into `agentExecution.ts` pipeline
3. Add runtime stats (session info, usage counters)
4. Test: ask agent "what can you do?" — verify accurate self-reporting

### Phase 3: CLI (1-2 sessions)
1. Create `scripts/agent-cli.ts` — local test mode
2. Add debug output (harness info, soul info, stats)
3. Create `scripts/whatsapp-bridge.ts` — live viewer
4. Test: end-to-end WhatsApp message → CLI display → response

### Phase 4: Demo & Polish (1 session)
1. End-to-end test: WhatsApp → agent with soul + harness → response
2. Record demo showing the "aha" effect
3. Document in `docs/openclaw_idea/`

---

## What Makes This an "Aha"

The magic moment is when you message your agent on WhatsApp and it responds:

1. **With personality** — not generic AI, but "Maya" with her specific warmth and directness
2. **With self-awareness** — "I can help you with X, Y, Z" (real capabilities, not hallucinated)
3. **With boundaries** — "I'd rather connect you with our team for that" (soul-defined guardrails)
4. **With memory** — "Last time we talked about your Q2 timeline" (existing memory layers)

And in the CLI, you can **see all of this happening** — the harness context, the soul injection, the tool filtering, the memory loading. It's the X-ray view into the agent's mind.

---

## Files Summary

### New Files
| File | Purpose |
|---|---|
| `convex/ai/harness.ts` | Agent self-awareness context builder |
| `convex/ai/soulGenerator.ts` | Agent self-generation of SOUL.md |
| `scripts/agent-cli.ts` | Local CLI test tool |
| `scripts/whatsapp-bridge.ts` | Live WhatsApp viewer/bridge |
| Soul Builder UI component(s) | Wizard for creating agent souls |

### Modified Files
| File | Change |
|---|---|
| `convex/agentOntology.ts` | Add `soul` field to org_agent schema |
| `convex/ai/agentExecution.ts` | Inject harness + soul into prompt pipeline |
| Agent config UI | Add "Soul" tab alongside existing config |

### No Changes Needed
| File | Why |
|---|---|
| `convex/channels/providers/whatsappProvider.ts` | Already works |
| `convex/channels/router.ts` | Already works |
| `convex/channels/webhooks.ts` | Already works |
| `convex/ai/agentSessions.ts` | Already works |
| `convex/ai/tools/registry.ts` | Already works |

---

## Estimated Effort

- **Phase 1 (Soul):** 3-4 sessions — mostly schema + prompt engineering + UI
- **Phase 2 (Harness):** 2-3 sessions — new module + pipeline integration
- **Phase 3 (CLI):** 1-2 sessions — scripts + debug formatting
- **Phase 4 (Demo):** 1 session — integration testing + polish

**Total: ~8-10 working sessions to "aha" moment**

The beauty is that 80% of the infrastructure already exists. We're adding a personality layer (soul), a self-awareness layer (harness), and a visibility layer (CLI) on top of a working agent platform.
