# Universal Memory Consent System

**Last Updated:** 2025-02-05

---

## Overview

A unified consent-based memory system inspired by Claude Desktop's approach, integrated across **all areas of the platform**: GHL integration, Layers, multichannel automation, CRM, agent interactions, and more.

## Core Principle

> **Ask before remembering.** Users control what gets stored in long-term memory.

---

## Two-Way Consent Model

### 1. User-Initiated Memory

User explicitly requests memory storage:

```
User: "Remember that I prefer to be contacted via WhatsApp after 6pm"
Agent: "✓ I'll remember your preferred contact method and timing."
```

```
User: "Save this: our budget approval cycle is March 1st"
Agent: "✓ Saved to your contact profile."
```

**Detection patterns** (trigger memory save):
- "remember that..."
- "save this..."
- "store this preference..."
- "make a note that..."
- "don't forget..."

### 2. AI-Suggested Memory

Agent proactively detects important facts and **asks permission**:

```
Agent: "I noticed you mentioned your budget range is $200-400/month.
        Would you like me to remember this for future conversations?"

User: "Yes" → Saves to Layer 4 (Contact Profile)
User: "No" → Discarded, not saved
```

**When to suggest memory**:
- Budget/pricing discussions
- Timeline/deadline mentions
- Decision authority clarifications
- Pain points identified
- Product preferences expressed
- Contact preferences (channel, time)
- Company information (size, industry)
- Next steps agreed upon

---

## Memory Consent UI Patterns

### Pattern 1: Inline Consent Widget (Chat)

After agent response that contains extractable facts:

```
┌─────────────────────────────────────────────────────────────┐
│ Agent: "Got it! So your timeline is Q2 2025 and you're      │
│        evaluating 3 competitors. What's your main           │
│        concern with your current solution?"                  │
├─────────────────────────────────────────────────────────────┤
│  💡 Remember this?                                          │
│  □ Timeline: Q2 2025                                        │
│  □ Evaluating 3 competitors                                 │
│                                                              │
│  [Remember Selected] [No Thanks]                            │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 2: Toast Notification (Non-intrusive)

For low-priority facts:

```
┌──────────────────────────────────────────┐
│  💾 Save "Preferred contact: WhatsApp"?  │
│  [Yes] [No]                              │
└──────────────────────────────────────────┘
```

Auto-dismisses after 10 seconds if not interacted with.

### Pattern 3: End-of-Session Prompt

When conversation ends or goes idle:

```
┌─────────────────────────────────────────────────────────────┐
│  Before you go...                                            │
│                                                              │
│  I noticed a few things from our conversation. Would you    │
│  like me to remember any of these?                          │
│                                                              │
│  ✓ Budget range: $200-400/month                             │
│  ✓ Timeline: Q2 2025                                        │
│  ✓ Main concern: API rate limits                            │
│  □ Preferred contact time: Weekday mornings                 │
│                                                              │
│  [Save Selected] [Save All] [No Thanks]                     │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 4: Operator Note Confirmation

When human operator adds a strategic note:

```
┌─────────────────────────────────────────────────────────────┐
│  Add Operator Note                                           │
│                                                              │
│  Category: [Relationship ▼]                                 │
│                                                              │
│  Note: "Brother-in-law of Dave Chen (our biggest client).   │
│         Handle with white-glove service."                   │
│                                                              │
│  Priority: ⦿ High  ○ Medium  ○ Low                          │
│                                                              │
│  □ Pin this note (always visible to AI)                     │
│  □ Set expiration date [Optional]                           │
│                                                              │
│  [Save Note] [Cancel]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points Across Platform

### 1. GHL Integration (Conversational AI)

**Location**: SMS, WhatsApp, Email conversations

**Memory types**:
- Contact preferences (Layer 4)
- Session summaries (Layer 2)
- Operator pinned notes (Layer 3)

**UI**: Inline consent widget after agent response

**Example**:
```
SMS conversation:
User: "I prefer WhatsApp for quick updates"
Agent: "Got it! I can remember your preferred contact method.
        Would you like me to save this?"
User: "Yes"
Agent: "✓ Saved. I'll prioritize WhatsApp for future updates."
```

### 2. Layers (Visual Automation Canvas)

**Location**: Canvas workflow configuration

**Memory types**:
- Workflow preferences (e.g., "always use LC CRM instead of HubSpot")
- Template selections (e.g., "agency owner prefers minimalist templates")
- Integration preferences (e.g., "user prefers Resend over SendGrid")

**UI**: Toast notification when preferences detected

**Example**:
```
User drags "LC CRM" node instead of "HubSpot" for 3rd time in a row

Toast appears:
"💡 I notice you prefer LC CRM. Should I default to this
    for new workflows?"
[Set as Default] [Not Now]
```

### 3. Multichannel Automation

**Location**: Sequence builder, message templates

**Memory types**:
- Sequence preferences (e.g., "customer prefers 3-day cadence")
- Template style (e.g., "formal tone for B2B")
- Channel preferences (e.g., "WhatsApp for urgent, email for newsletters")

**UI**: End-of-setup prompt

**Example**:
```
After creating 2 sequences with similar patterns:

"I noticed you:
 ✓ Use 3-day intervals between messages
 ✓ Prefer WhatsApp for reminders
 ✓ Send follow-ups at 9am

 Save these as your defaults?"
[Yes, Save Defaults] [No Thanks]
```

### 4. CRM (Contact Management)

**Location**: Contact profiles, deal pipelines

**Memory types**:
- Contact preferences (Layer 4)
- Deal patterns (e.g., "typical deal cycle: 14 days")
- Pipeline stages (e.g., "this contact prefers demo before pricing")

**UI**: Inline edit with consent checkbox

**Example**:
```
Agent extracts: "Decision maker: Yes" from conversation

In contact profile UI:
┌─────────────────────────────────────┐
│  Suggested Update                    │
│  Decision Maker: ☐ No  ☑ Yes       │
│  [Apply] [Dismiss]                   │
└─────────────────────────────────────┘
```

### 5. Builder (Landing Page Generator)

**Location**: Builder chat panel, project files

**Memory types**:
- Design preferences (e.g., "prefers dark mode layouts")
- Framework preferences (e.g., "always uses Tailwind")
- Component library (e.g., "prefers shadcn/ui")

**UI**: Project memory tab + inline suggestions

**Example**:
```
User generates 3 landing pages, all with hero + CTA + social proof

After 3rd generation:
"I see a pattern in your landing pages. Save this as
 your default structure?"
[Save Template] [Not Now]
```

### 6. Agent Configuration Window

**Location**: Agent setup, knowledge base

**Memory types**:
- Agent tone/style preferences
- Knowledge base sources
- Tool usage patterns

**UI**: Setup wizard with consent step

**Example**:
```
Step 5 of Agent Setup:

"Based on your inputs, I recommend:
 ✓ Friendly, conversational tone
 ✓ System knowledge: Marketing, StoryBrand
 ✓ Tools: CRM, Booking, Email

 Save as template for future agents?"
[Yes, Create Template] [No, One-Time Setup]
```

---

## Data Architecture

### Memory Consent Table

New table: `memoryConsents`

```typescript
interface MemoryConsent {
  id: string;
  organizationId: string;
  userId?: string;        // For user-specific consents
  contactId?: string;     // For contact-specific consents

  // What memory was proposed
  memoryType: "contact_preference" | "workflow_default" |
              "template_choice" | "agent_config" | "operator_note";
  memoryContent: string;  // JSON representation of the fact

  // Consent status
  status: "pending" | "accepted" | "declined" | "expired";

  // Where it came from
  source: "user_initiated" | "ai_suggested" | "operator_created";
  contextType: "conversation" | "workflow" | "builder" | "crm" | "agent_config";
  contextId: string;      // sessionId, workflowId, etc.

  // Timestamps
  proposedAt: number;
  respondedAt?: number;
  expiresAt?: number;     // For time-sensitive consents

  // If accepted, where was it saved?
  savedToLayer?: 1 | 2 | 3 | 4 | 5;
  savedToTable?: string;
  savedToRecordId?: string;
}
```

### Schema Definition

```typescript
// convex/schemas/memorySchemas.ts

export const memoryConsents = defineTable({
  organizationId: v.id("organizations"),
  userId: v.optional(v.id("users")),
  contactId: v.optional(v.id("objects")),

  memoryType: v.union(
    v.literal("contact_preference"),
    v.literal("workflow_default"),
    v.literal("template_choice"),
    v.literal("agent_config"),
    v.literal("operator_note")
  ),
  memoryContent: v.string(), // JSON string

  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("declined"),
    v.literal("expired")
  ),

  source: v.union(
    v.literal("user_initiated"),
    v.literal("ai_suggested"),
    v.literal("operator_created")
  ),
  contextType: v.union(
    v.literal("conversation"),
    v.literal("workflow"),
    v.literal("builder"),
    v.literal("crm"),
    v.literal("agent_config")
  ),
  contextId: v.string(),

  proposedAt: v.number(),
  respondedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),

  savedToLayer: v.optional(v.union(
    v.literal(1),
    v.literal(2),
    v.literal(3),
    v.literal(4),
    v.literal(5)
  )),
  savedToTable: v.optional(v.string()),
  savedToRecordId: v.optional(v.string()),
})
  .index("by_org", ["organizationId"])
  .index("by_contact", ["contactId"])
  .index("by_status", ["status"])
  .index("by_context", ["contextType", "contextId"]);
```

---

## Memory Extraction Engine

### Fact Detection Service

```typescript
// convex/ai/memoryExtraction.ts

interface ExtractedFact {
  type: "preference" | "constraint" | "goal" | "concern" | "timeline";
  category: string;       // e.g., "budget", "contact_method", "decision_authority"
  value: string;
  confidence: number;     // 0-1, how confident the AI is
  sourceText: string;     // Original text that triggered extraction
  suggestRemember: boolean; // Should we prompt user?
}

export async function detectMemoryOpportunities(
  ctx: ActionCtx,
  conversationText: string,
  existingMemory: ContactMemory | null
): Promise<ExtractedFact[]> {

  const prompt = `Analyze this conversation for facts worth remembering.

Existing memory (don't duplicate):
${JSON.stringify(existingMemory, null, 2)}

Recent conversation:
${conversationText}

Extract NEW facts in this JSON format:
[
  {
    "type": "preference|constraint|goal|concern|timeline",
    "category": "budget|timeline|contact_method|decision_authority|pain_point|etc",
    "value": "the actual fact",
    "confidence": 0.0-1.0,
    "sourceText": "exact quote from conversation",
    "suggestRemember": true/false
  }
]

Rules:
- Only extract EXPLICIT facts, not assumptions
- confidence < 0.7: don't suggest remembering
- confidence >= 0.7: suggest if it's important
- Don't duplicate existing memory
- Focus on actionable, persistent facts`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const client = new OpenRouterClient(apiKey);
  const response = await client.chatCompletion({
    model: "anthropic/claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: "You are a fact extraction specialist. Be precise and cautious.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });

  try {
    const content = response.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[MemoryExtraction] Failed to parse facts:", error);
    return [];
  }
}
```

### Consent Proposal Service

```typescript
// convex/ai/memoryConsent.ts

export const proposeMemoryConsent = mutation({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.optional(v.id("objects")),
    facts: v.array(v.any()), // ExtractedFact[]
    contextType: v.string(),
    contextId: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, contactId, facts, contextType, contextId } = args;

    const consents = [];

    for (const fact of facts) {
      if (!fact.suggestRemember) continue;

      // Create pending consent
      const consentId = await ctx.db.insert("memoryConsents", {
        organizationId,
        contactId,
        memoryType: "contact_preference",
        memoryContent: JSON.stringify(fact),
        status: "pending",
        source: "ai_suggested",
        contextType: contextType as any,
        contextId,
        proposedAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      });

      consents.push({ id: consentId, fact });
    }

    return consents;
  },
});

export const respondToMemoryConsent = mutation({
  args: {
    consentId: v.id("memoryConsents"),
    accepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { consentId, accepted } = args;

    const consent = await ctx.db.get(consentId);
    if (!consent) throw new Error("Consent not found");

    // Update consent status
    await ctx.db.patch(consentId, {
      status: accepted ? "accepted" : "declined",
      respondedAt: Date.now(),
    });

    // If accepted, save to appropriate layer
    if (accepted) {
      const fact = JSON.parse(consent.memoryContent);

      // Determine target layer based on memory type
      const targetLayer = determineTargetLayer(consent.memoryType, fact);

      // Save to contact profile (Layer 4) or operator notes (Layer 3)
      await saveMemoryToLayer(ctx, consent, fact, targetLayer);

      // Update consent with save location
      await ctx.db.patch(consentId, {
        savedToLayer: targetLayer,
      });
    }

    return { success: true, accepted };
  },
});
```

---

## User Settings & Privacy

### Memory Settings Page

```
┌─────────────────────────────────────────────────────────────┐
│  Memory & Privacy Settings                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Memory Preferences                                          │
│  ━━━━━━━━━━━━━━━━━                                         │
│                                                              │
│  ☑ Allow AI to suggest memories                             │
│  ☑ Remember contact preferences automatically               │
│  ☑ Remember workflow patterns                               │
│  ☐ Remember builder design choices                          │
│                                                              │
│  Suggestion Frequency                                        │
│  ⦿ Show all suggestions  ○ Important only  ○ Never         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Stored Memories (47)                                        │
│  ━━━━━━━━━━━━━━━━━━━                                       │
│                                                              │
│  📞 Contact Preferences (12)                                │
│  🎯 Workflow Defaults (8)                                   │
│  🎨 Builder Templates (6)                                   │
│  🤖 Agent Configurations (5)                                │
│  📝 Operator Notes (16)                                     │
│                                                              │
│  [View All Memories] [Export Data] [Delete All]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Memory Viewer (Dedicated Page)

```
/settings/memory

┌─────────────────────────────────────────────────────────────┐
│  Your Memories                                               │
├─────────────────────────────────────────────────────────────┤
│  [Contact Preferences ▼] [Search memories...]      [+ Add]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Contact: John Smith (john@example.com)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  💬 Preferred Contact Method: WhatsApp after 6pm      │  │
│  │  Saved: 2025-01-15  |  Source: Conversation           │  │
│  │  [Edit] [Delete]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  💰 Budget Range: $200-400/month                      │  │
│  │  Saved: 2025-01-20  |  Source: AI Detection           │  │
│  │  [Edit] [Delete]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ⚠️ [Warning] Price-sensitive. Lead with ROI.        │  │
│  │  Saved: 2025-01-22  |  Source: Operator (Sarah)       │  │
│  │  [Edit] [Delete]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## GDPR & Privacy Compliance

### Data Subject Rights

**Right to Access**:
- `GET /api/v1/memory/export` → Download all memories as JSON

**Right to Erasure**:
- `DELETE /api/v1/memory/contact/:contactId` → Delete all contact memories
- `DELETE /api/v1/memory/consent/:consentId` → Delete specific consent

**Right to Rectification**:
- `PATCH /api/v1/memory/:memoryId` → Edit memory content

**Right to Restrict Processing**:
- User can disable AI memory suggestions globally
- User can mark specific memories as "do not use"

### Retention Policy

```typescript
// convex/crons/memoryRetention.ts

export const cleanupExpiredMemories = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Expire pending consents after 7 days
    const expiredConsents = await ctx.db
      .query("memoryConsents")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const consent of expiredConsents) {
      await ctx.db.patch(consent._id, { status: "expired" });
    }

    // 2. Delete declined consents after 30 days
    const oldDeclined = await ctx.db
      .query("memoryConsents")
      .withIndex("by_status", (q) => q.eq("status", "declined"))
      .filter((q) => q.lt(q.field("respondedAt")!, now - 30 * 24 * 60 * 60 * 1000))
      .collect();

    for (const consent of oldDeclined) {
      await ctx.db.delete(consent._id);
    }

    // 3. Review operator notes for expiration
    const expiredNotes = await ctx.db
      .query("operatorNotes")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt")!, now)
        )
      )
      .collect();

    for (const note of expiredNotes) {
      await ctx.db.delete(note._id);
    }
  },
});

// Run daily at 2am
export default cronJobs;
cronJobs.daily(
  "cleanup-expired-memories",
  { hourUTC: 2, minuteUTC: 0 },
  internal.crons.memoryRetention.cleanupExpiredMemories
);
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create `memoryConsents` table schema
- [ ] Build fact extraction service
- [ ] Implement consent proposal/response APIs
- [ ] Create memory viewer UI (basic)

### Phase 2: GHL Integration (Week 3-4)
- [ ] Inline consent widget in conversation view
- [ ] End-of-session memory summary
- [ ] Integrate with Layer 4 (Contact Profile)
- [ ] Operator note consent flow

### Phase 3: Platform-Wide Rollout (Week 5-7)
- [ ] Layers canvas memory detection
- [ ] Multichannel automation preferences
- [ ] Builder template preferences
- [ ] Agent config memory

### Phase 4: Privacy & Settings (Week 8-9)
- [ ] Memory settings page
- [ ] Bulk memory management
- [ ] GDPR compliance tools (export, delete)
- [ ] Retention policy automation

### Phase 5: Analytics & Optimization (Week 10)
- [ ] Track consent accept/decline rates
- [ ] Measure memory impact on conversions
- [ ] A/B test consent UI patterns
- [ ] Refine fact extraction prompts

---

## Success Metrics

### Adoption Metrics
- **Consent accept rate**: Target 60%+ (industry benchmark: 40-50%)
- **User-initiated memories**: Target 20% of all memories
- **Memory viewer usage**: Target 30% of users visit monthly

### Quality Metrics
- **Fact extraction accuracy**: Target 85%+ (manual review)
- **Memory relevance score**: Target 4.2/5.0 (user rating)
- **False positive rate**: Target <10% (inappropriate suggestions)

### Impact Metrics
- **Conversion rate lift**: Target +15-20% (vs. no memory)
- **Agent response quality**: Target +25% (operator satisfaction)
- **Time to close**: Target -30% (with operator notes)

---

## Competitive Advantage

**This system provides**:
1. ✅ **Transparency**: Users see exactly what's remembered
2. ✅ **Control**: Users decide what gets stored
3. ✅ **Privacy**: GDPR-compliant from day one
4. ✅ **Intelligence**: AI suggests, human decides
5. ✅ **Universality**: Works across ALL platform areas

**No competitor has this:**
- GHL: No consent system, opaque memory
- Voiceflow: No user-controlled memory
- Custom builds: Usually no memory at all
- Claude Desktop: Has this, but only for chat (not multi-channel, not CRM-integrated)

**This is our second moat** (after Operator Pinned Notes).

---

**Next Steps**:
1. Review this spec with team
2. Prioritize integration points (GHL first?)
3. Design detailed UI mockups for consent widgets
4. Begin Phase 1 implementation

---

**Related Docs**:
- [MEMORY_ENGINE_DESIGN.md](../agentic_system/MEMORY_ENGINE_DESIGN.md) — 5-layer memory architecture
- [03_GHL_API_INTEGRATION.md](./03_GHL_API_INTEGRATION.md) — GHL webhook implementation
- [04_IMPLEMENTATION_TIMELINE.md](./04_IMPLEMENTATION_TIMELINE.md) — 14-week timeline
