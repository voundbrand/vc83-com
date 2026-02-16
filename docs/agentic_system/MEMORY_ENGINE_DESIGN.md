# Memory Engine Design — Five-Layer Architecture

Canonical docs home:
- `docs/agentic_system/CANONICAL_DOCS_INDEX.md`
- `docs/agentic_system/DOC_STATUS_MATRIX.md`

**Last Updated:** 2025-02-05

---

## Overview

The Memory Engine is the core differentiator of our GHL integration. While GHL provides a single `{{contact.ai_memory}}` text field with ~2K character limit, we provide a **five-layer hierarchical memory system** that intelligently compresses, structures, and retrieves conversation context.

### **Design Goals**

1. **Unlimited Memory:** No hard character limits like GHL
2. **Intelligent Compression:** Auto-summarization prevents token bloat
3. **Structured Facts:** Extract and store actionable data points
4. **Reactivation-Aware:** Detect when leads return after going cold
5. **Cross-Channel Unified:** Same memory across SMS, email, WhatsApp
6. **Token-Optimized:** Stay within LLM context windows (~12K tokens for Sonnet 4.5)

---

## Five-Layer Memory Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MEMORY LAYERS                                 │
│  (Total Budget: ~3.5K tokens for context, leaving 8.5K for I/O)    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Memory L1: RECENT CONTEXT (Last 10-15 messages verbatim)            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Purpose: Maintain conversational coherence                 │    │
│  │ Storage: agentSessionMessages table (last N)               │    │
│  │ Format:  User/Assistant message pairs                      │    │
│  │ Budget:  ~2,000 tokens (largest layer)                     │    │
│  │                                                             │    │
│  │ Example:                                                    │    │
│  │ User: "What's your premium plan price?"                    │    │
│  │ Assistant: "Our premium plan is $299/month..."             │    │
│  │ User: "Do you offer annual discounts?"                     │    │
│  │ Assistant: "Yes! Annual plans are 20% off..."              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Memory L2: SESSION SUMMARY (Auto-generated every 10 messages)        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Purpose: Compress older conversation history               │    │
│  │ Storage: agentSessions.currentSummary field                │    │
│  │ Format:  Prose summary (LLM-generated)                     │    │
│  │ Budget:  ~500 tokens                                       │    │
│  │ Refresh: After every 10 messages or 24h idle               │    │
│  │                                                             │    │
│  │ Example:                                                    │    │
│  │ "Lead inquired about premium features and pricing.         │    │
│  │  Main concerns: integration with Zapier and API limits.    │    │
│  │  Interested in 6-month commitment for 15% discount.        │    │
│  │  Currently evaluating 3 competing platforms.               │    │
│  │  Follow-up scheduled for next Tuesday at 2pm."             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Memory L3: OPERATOR PINNED NOTES (Human-curated strategy) ★ NEW     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Purpose: Human operators annotate conversations with       │    │
│  │          strategic context that AI shouldn't compress      │    │
│  │ Storage: operatorNotes table (targetType: session|contact) │    │
│  │ Format:  Tagged notes ([strategy], [warning], etc.)        │    │
│  │ Budget:  ~250-500 tokens (5-10 notes)                      │    │
│  │ Persistence: NEVER compressed, never falls out of window   │    │
│  │                                                             │    │
│  │ Example:                                                    │    │
│  │ [strategy] "Brother-in-law of client Dave Chen — handle   │    │
│  │            with care. High priority for relationship."     │    │
│  │ [warning] "Price-sensitive. Don't lead with list pricing.  │    │
│  │           Emphasize ROI instead."                          │    │
│  │ [context] "'Maybe next quarter' means waiting for budget   │    │
│  │           approval on March 1st. Call at 9am that day."   │    │
│  │ [relationship] "Evaluating 3 competitors. Mentioned        │    │
│  │               competitor A has poor support."              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Memory L4: CONTACT PROFILE (Structured facts, AI-extracted)          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Purpose: Persistent facts that transcend conversations     │    │
│  │ Storage: objects table (type=crm_contact).aiMemory         │    │
│  │ Format:  Structured JSON (typed fields)                    │    │
│  │ Budget:  ~300 tokens                                       │    │
│  │ Persistence: Across all sessions and channels              │    │
│  │                                                             │    │
│  │ Example:                                                    │    │
│  │ {                                                           │    │
│  │   preferences: {                                            │    │
│  │     budget_range: "$200-400/month",                         │    │
│  │     timeline: "Q2 2025",                                    │    │
│  │     decision_maker: true,                                   │    │
│  │     preferred_contact: "sms"                                │    │
│  │   },                                                        │    │
│  │   painPoints: ["Current CRM too complex", "Need better     │    │
│  │                 automation"],                               │    │
│  │   objectionsAddressed: [                                    │    │
│  │     { objection: "price", resolved: true,                   │    │
│  │       resolution: "Showed ROI calculator" }                 │    │
│  │   ],                                                        │    │
│  │   productsDiscussed: ["premium_plan", "zapier_addon"],     │    │
│  │   currentStage: "consideration",                            │    │
│  │   nextStep: "Send case study by Friday"                    │    │
│  │ }                                                           │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Memory L5: REACTIVATION CONTEXT (Triggered when > 7 days idle)       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Purpose: Remind AI of previous conversation arc            │    │
│  │ Storage: agentSessions.reactivationContext field            │    │
│  │ Format:  Brief reminder (LLM-generated)                    │    │
│  │ Budget:  ~200 tokens                                       │    │
│  │ Trigger: When lead returns after 7+ day gap                │    │
│  │                                                             │    │
│  │ Example:                                                    │    │
│  │ "CONTEXT: This lead went quiet for 2 weeks after           │    │
│  │  discussing premium plan pricing. Last interaction:         │    │
│  │  they requested a case study but haven't responded yet.    │    │
│  │  They expressed urgency around Q2 timeline. Their main     │    │
│  │  concern was Zapier integration limits."                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Memory L3: Operator Pinned Notes (NEW — Human-Curated Strategy)

### **Purpose**
This is our **competitive differentiator**. No other platform offers human-curated context as a first-class feature. Operator Pinned Notes allow human operators to annotate conversations with strategic context that should NEVER be summarized away.

### **Why This Matters**
From the whitepaper:
> "Consider what the LLM does not know when it generates a session summary. It does not know your sales strategy. It does not know that a particular lead is the brother-in-law of your biggest client. It does not know that the throwaway comment about 'maybe next quarter' actually means 'I am waiting for budget approval on March 1st and you should call me at 9am that day.'"

**This solves the automation paradox:** Pure AI lacks business context. Pure manual CRM is slow. Operator Pinned Notes combine the best of both.

### **Data Schema**

```typescript
interface OperatorNote {
  id: string;
  organizationId: string;
  targetType: "session" | "contact";
  targetId: string; // sessionId or contactId

  // Note content
  category: "strategy" | "relationship" | "context" | "warning" | "opportunity";
  content: string; // The actual note text

  // Metadata
  createdBy: string; // userId of operator
  createdAt: number;
  updatedAt: number;

  // Display & priority
  priority: "high" | "medium" | "low";
  pinned: boolean; // Always show (vs. contextual)
  expiresAt?: number; // Optional expiration for time-sensitive notes
}
```

### **Storage**

**New Table: `operatorNotes`**

```typescript
// convex/schemas/memorySchemas.ts

export const operatorNotes = defineTable({
  organizationId: v.id("organizations"),
  targetType: v.union(v.literal("session"), v.literal("contact")),
  targetId: v.string(), // sessionId or contactId

  category: v.union(
    v.literal("strategy"),
    v.literal("relationship"),
    v.literal("context"),
    v.literal("warning"),
    v.literal("opportunity")
  ),
  content: v.string(),

  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),

  priority: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  ),
  pinned: v.boolean(),
  expiresAt: v.optional(v.number()),
})
  .index("by_target", ["targetType", "targetId"])
  .index("by_org", ["organizationId"])
  .index("by_session", ["targetId"]); // Optimized for session lookups
```

### **Use Cases**

**1. Strategic Context**
```
[strategy] "Hot lead — competitor contract expires in ~30 days. Create urgency around enterprise tier. Push for demo this week."
```

**2. Relationship Intelligence**
```
[relationship] "Brother-in-law of Dave Chen (our biggest client). Handle with white-glove service. Dave referred him personally."
```

**3. Business Context**
```
[context] "'Maybe next quarter' = waiting for budget approval on March 1st. Follow up at 9am that day."
```

**4. Warnings**
```
[warning] "Price-sensitive. Do NOT mention list pricing first. Lead with ROI calculator and case studies."
```

**5. Opportunity Tracking**
```
[opportunity] "Mentioned they have 3 other locations that might need this. Close this deal first, then upsell to multi-location package."
```

### **Building Context**

Operator notes are ALWAYS included in the context window, never compressed:

```typescript
async function buildOperatorNotesContext(
  ctx: QueryCtx,
  sessionId: Id<"agentSessions">,
  contactId?: Id<"objects">
): Promise<string> {
  const notes: OperatorNote[] = [];

  // Load session-level notes
  const sessionNotes = await ctx.db
    .query("operatorNotes")
    .withIndex("by_target", (q) =>
      q.eq("targetType", "session").eq("targetId", sessionId)
    )
    .filter((q) =>
      q.or(
        q.eq(q.field("pinned"), true),
        q.or(
          q.eq(q.field("expiresAt"), undefined),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
    )
    .collect();

  notes.push(...sessionNotes);

  // Load contact-level notes (if linked)
  if (contactId) {
    const contactNotes = await ctx.db
      .query("operatorNotes")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "contact").eq("targetId", contactId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("pinned"), true),
          q.or(
            q.eq(q.field("expiresAt"), undefined),
            q.gt(q.field("expiresAt"), Date.now())
          )
        )
      )
      .collect();

    notes.push(...contactNotes);
  }

  // Sort by priority
  notes.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Format for context
  if (notes.length === 0) return "";

  const sections = ["## Operator Notes (STRATEGIC CONTEXT)"];
  sections.push("*These notes are provided by human operators and contain critical business context.*\n");

  for (const note of notes) {
    const icon = {
      strategy: "🎯",
      relationship: "🤝",
      context: "💡",
      warning: "⚠️",
      opportunity: "💰"
    }[note.category];

    sections.push(`${icon} **[${note.category.toUpperCase()}]** ${note.content}`);
  }

  return sections.join("\n");
}
```

### **UI for Creating Notes**

**In Conversation View:**
```tsx
// Quick-add button next to each message
<Button onClick={() => addNote(message.id)}>
  📌 Pin Note
</Button>

// Modal for note creation
<OperatorNoteModal
  targetType="session"
  targetId={sessionId}
  categories={["strategy", "relationship", "context", "warning", "opportunity"]}
  onSave={handleSaveNote}
/>
```

**In Contact Profile:**
```tsx
// Notes tab showing all pinned notes
<NotesTab contactId={contactId}>
  {notes.map(note => (
    <NoteCard
      key={note.id}
      category={note.category}
      content={note.content}
      priority={note.priority}
      createdBy={note.createdBy}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ))}
</NotesTab>
```

### **Token Budget Management**

Operator notes take priority over auto-generated summaries:

```typescript
function buildOptimizedMemoryContext(
  session: AgentSession,
  contact: CRMContact,
  maxTokens: number = 3500 // Increased from 3000
): string {
  const layers = [];
  let currentTokens = 0;

  // Priority 0: Operator notes (ALWAYS include, highest priority)
  const operatorNotes = buildOperatorNotesContext(session, contact);
  currentTokens += estimateTokens(operatorNotes);
  layers.push(operatorNotes);

  // Priority 1: Recent context (always include, but truncate if needed)
  const layer1 = buildRecentContext(session);
  currentTokens += estimateTokens(layer1);
  layers.push(layer1);

  // Priority 2: Session summary (useful but can be omitted)
  if (currentTokens < maxTokens * 0.75 && session.currentSummary) {
    const layer2 = buildSessionSummary(session);
    currentTokens += estimateTokens(layer2);
    layers.push(layer2);
  }

  // Priority 3: Contact profile (critical for personalization)
  if (currentTokens < maxTokens * 0.85) {
    const layer4 = buildContactProfile(contact);
    currentTokens += estimateTokens(layer4);
    layers.push(layer4);
  }

  // Priority 4: Reactivation context (only if space available)
  if (currentTokens < maxTokens * 0.95 && session.reactivationContext) {
    const layer5 = buildReactivationContext(session);
    layers.push(layer5);
  }

  return layers.join("\n\n");
}
```

### **Competitive Advantage**

**No one else has this:**
- ✅ GHL: No human annotation system
- ✅ Custom builds: Pure automation, no human-in-the-loop
- ✅ Voiceflow/Botpress: Conversation design, but no strategic notes
- ✅ Make/Zapier: No concept of operator context

**This is our moat.** It combines:
1. AI automation (Memory L1, Memory L2, Memory L4, Memory L5)
2. Human intelligence (Memory L3)
3. Structured data (Memory L4)

---

## Memory L1: Recent Context Window (Unchanged)

---

## Memory L1: Recent Context Window

### **Purpose**
Maintain short-term conversational coherence. The AI needs to see recent exchanges verbatim to:
- Avoid repeating itself
- Answer follow-up questions correctly
- Reference what was just said ("As I mentioned earlier...")

### **Implementation**

```typescript
/**
 * Build recent context from last N messages
 */
async function buildRecentContext(
  ctx: QueryCtx,
  sessionId: Id<"agentSessions">,
  limit: number = 15
): Promise<string> {
  // Fetch last N messages
  const messages = await ctx.db
    .query("agentSessionMessages")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .order("desc")
    .take(limit);

  // Reverse to chronological order
  messages.reverse();

  // Format as conversation
  const formatted = messages.map((msg) => {
    const role = msg.role === "user" ? "Customer" : "Assistant";
    return `${role}: ${msg.content}`;
  });

  return formatted.join("\n");
}
```

### **Token Budget Strategy**

- **Target:** ~2,000 tokens
- **Dynamic sizing:** If messages are very long, reduce limit
- **Truncation:** Cut at sentence boundaries, not mid-word

```typescript
function adaptiveRecentContextLimit(avgMessageLength: number): number {
  // If average message is 100 tokens, we can fit 20 messages
  // If average message is 200 tokens, only fit 10 messages
  const targetTokens = 2000;
  const estimatedLimit = Math.floor(targetTokens / avgMessageLength);
  return Math.max(5, Math.min(15, estimatedLimit)); // Clamp between 5-15
}
```

### **When to Truncate**

Recent context should ALWAYS be included, but can be shortened if:
1. Total context exceeds 3K tokens
2. Individual messages are very long (e.g., customer pasted a long document)
3. Older layers (summary, profile) are more relevant for the current query

---

## Memory L2: Session Summary

### **Purpose**
Compress older conversation history into a concise prose summary. Replaces the need to load 50+ messages.

### **When to Generate**

**Trigger 1: Message Count**
- After every 10 messages exchanged
- Prevents context window from growing unbounded

**Trigger 2: Time-Based**
- After 24 hours of inactivity
- Captures "end of conversation" state

**Trigger 3: Manual**
- Agent can request summary via tool call
- Admin can trigger from dashboard

### **Generation Process**

```typescript
/**
 * Generate session summary using LLM
 */
async function generateSessionSummary(
  ctx: ActionCtx,
  sessionId: Id<"agentSessions">
): Promise<string> {
  // 1. Load last 50 messages (or all if < 50)
  const messages = await ctx.runQuery(
    internal.ai.agentSessions.getSessionMessages,
    { sessionId, limit: 50 }
  );

  // 2. Build summarization prompt
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `Summarize this customer conversation concisely (max 150 words).
Focus on:
- What the customer wants/needs
- Key concerns or objections raised
- Products/services discussed
- Current stage in buyer journey
- Next steps or commitments

Conversation:
${conversationText}

Summary:`;

  // 3. Call LLM
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const client = new OpenRouterClient(apiKey);
  const response = await client.chatCompletion({
    model: "anthropic/claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: "You are a conversation summarizer. Create concise, factual summaries.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3, // Low temp for consistency
    max_tokens: 500,
  });

  const summary = response.choices[0]?.message?.content || "No summary generated";

  // 4. Save to session
  await ctx.runMutation(internal.ai.agentSessions.updateSession, {
    sessionId,
    fields: {
      currentSummary: summary,
      lastSummaryAt: Date.now(),
      messagesSinceSummary: 0, // Reset counter
    },
  });

  return summary;
}
```

### **Summary Quality Guidelines**

**Good summary:**
```
Lead inquired about premium plan ($299/mo). Main concerns: Zapier integration
limits and API rate limits. Interested in annual pricing (20% discount).
Currently evaluating 3 competitors. Decision timeline: end of Q1. Requested
case study for similar SaaS company. Follow-up scheduled for Tuesday 2pm.
```

**Bad summary (too vague):**
```
Customer asked about pricing and features. They seemed interested and want
to follow up later.
```

**Bad summary (too detailed):**
```
Customer started by saying hello, then asked about the premium plan. I
explained it costs $299/month. They asked if there were discounts...
[continues with play-by-play]
```

### **Incremental vs. Full Re-Summarization**

**Phase 1 (MVP):** Full re-summarization
- After every 10 messages, re-read last 50 messages
- Generate fresh summary
- Simple but wasteful

**Phase 2 (Optimized):** Incremental updates
- Keep existing summary
- Prompt: "Given this existing summary: [X], update it with these new messages: [Y]"
- More efficient, maintains continuity

---

## Memory L4: Contact Profile (Structured Memory)

### **Purpose**
Extract and persist **structured facts** about the contact that should be remembered across all conversations and channels.

### **Data Schema**

```typescript
interface ContactMemory {
  // Buying preferences
  preferences: {
    budget_range?: string;           // "$200-400/month"
    timeline?: string;                // "Q2 2025", "urgent", "no rush"
    decision_maker?: boolean;         // Can they sign contracts?
    preferred_contact_method?: "sms" | "email" | "whatsapp" | "phone";
    preferred_contact_time?: string;  // "weekday mornings", "after 6pm"
    company_size?: string;            // "solo", "5-10 employees", "50+"
  };

  // Pain points mentioned by customer
  painPoints: string[];               // ["Current CRM too complex", ...]

  // Objections raised and whether resolved
  objectionsAddressed: Array<{
    objection: string;                // "Price too high"
    resolved: boolean;
    resolution?: string;              // "Showed ROI calculator"
    addressedAt: number;              // Timestamp
  }>;

  // Products/services discussed
  productsDiscussed: Array<{
    productName: string;              // "premium_plan"
    interest_level: "low" | "medium" | "high";
    discussedAt: number;
  }>;

  // Current stage in buyer journey
  currentStage: "awareness" | "consideration" | "decision" | "customer" | "churned";

  // Next step committed to
  nextStep?: {
    action: string;                   // "Review case study"
    dueDate?: number;                 // Timestamp
    assignedTo?: string;              // "customer" | "sales rep name"
  };

  // Last interaction summary (one-liner)
  lastInteractionSummary?: string;   // "Discussed pricing, waiting on approval"

  // Metadata
  lastExtractedAt: number;
  extractionCount: number;            // How many times we've updated this
}
```

### **Extraction Process**

**Trigger:** After each agent response (if meaningful new info detected)

```typescript
/**
 * Determine if conversation warrants fact extraction
 */
function shouldExtractFacts(assistantMessage: string): boolean {
  const extractionTriggers = [
    // Budget/pricing discussions
    /budget|afford|pricing|cost|expense/i,

    // Timeline discussions
    /when|timeline|deadline|urgency|soon|later/i,

    // Decision authority
    /decision|approve|sign|authority|manager|boss/i,

    // Pain points
    /challenge|problem|frustrat|issue|pain|struggle/i,

    // Objections
    /concern|worry|hesitat|unsure|not sure|question/i,

    // Product interest
    /interested in|looking at|considering|want to|need to/i,

    // Next steps
    /follow up|next step|send me|email me|call me/i,
  ];

  return extractionTriggers.some((pattern) => pattern.test(assistantMessage));
}

/**
 * Extract structured facts from conversation
 */
async function extractContactFacts(
  ctx: ActionCtx,
  conversationContent: string,
  existingMemory: ContactMemory | null
): Promise<Partial<ContactMemory>> {
  const prompt = `Extract structured facts from this customer conversation.

Current memory (update if new info found):
${JSON.stringify(existingMemory, null, 2)}

Recent conversation:
${conversationContent}

Output valid JSON with these fields (only include fields with NEW information):
{
  "preferences": {
    "budget_range": "string or null",
    "timeline": "string or null",
    "decision_maker": boolean or null,
    "preferred_contact_method": "sms|email|whatsapp|phone or null",
    "company_size": "string or null"
  },
  "painPoints": ["string"], // Array of pain points mentioned
  "objectionsAddressed": [{
    "objection": "string",
    "resolved": boolean,
    "resolution": "string or null"
  }],
  "productsDiscussed": ["string"], // Product names
  "currentStage": "awareness|consideration|decision|customer",
  "nextStep": {
    "action": "string",
    "dueDate": timestamp or null,
    "assignedTo": "string or null"
  }
}

IMPORTANT:
- Only extract explicitly stated facts, don't infer or assume
- If no new information, return {}
- Merge with existing memory (don't overwrite unnecessarily)`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const client = new OpenRouterClient(apiKey);
  const response = await client.chatCompletion({
    model: "anthropic/claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: "You are a data extraction specialist. Extract only explicit facts from conversations. Output valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1, // Very low temp for consistency
    max_tokens: 1000,
  });

  try {
    const content = response.choices[0]?.message?.content || "{}";
    // Handle markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("[MemoryEngine] Failed to parse extraction JSON:", error);
    return {};
  }
}
```

### **Merge Strategy**

When updating contact memory, intelligently merge new facts with existing:

```typescript
function mergeContactMemory(
  existing: ContactMemory,
  extracted: Partial<ContactMemory>
): ContactMemory {
  return {
    preferences: {
      ...existing.preferences,
      ...extracted.preferences, // New values override old
    },

    // Append new pain points (avoid duplicates)
    painPoints: [
      ...existing.painPoints,
      ...(extracted.painPoints || []),
    ].filter((v, i, a) => a.indexOf(v) === i),

    // Append new objections
    objectionsAddressed: [
      ...existing.objectionsAddressed,
      ...(extracted.objectionsAddressed || []),
    ],

    // Update products (merge interest levels)
    productsDiscussed: mergeProductsDiscussed(
      existing.productsDiscussed,
      extracted.productsDiscussed || []
    ),

    // Update stage (only if moving forward)
    currentStage: extracted.currentStage || existing.currentStage,

    // Update next step (always take latest)
    nextStep: extracted.nextStep || existing.nextStep,

    lastExtractedAt: Date.now(),
    extractionCount: existing.extractionCount + 1,
  };
}
```

### **Formatting for Context**

When building memory context for agent, format contact profile as:

```typescript
function formatContactProfile(contact: CRMContact): string {
  const memory = contact.customProperties?.aiMemory as ContactMemory;
  if (!memory) return "";

  const sections = [];

  // Preferences
  if (memory.preferences && Object.keys(memory.preferences).length > 0) {
    sections.push("**Preferences:**");
    if (memory.preferences.budget_range) sections.push(`- Budget: ${memory.preferences.budget_range}`);
    if (memory.preferences.timeline) sections.push(`- Timeline: ${memory.preferences.timeline}`);
    if (memory.preferences.decision_maker !== undefined) {
      sections.push(`- Decision maker: ${memory.preferences.decision_maker ? "Yes" : "No"}`);
    }
  }

  // Pain points
  if (memory.painPoints && memory.painPoints.length > 0) {
    sections.push("\n**Pain Points:**");
    memory.painPoints.forEach((p) => sections.push(`- ${p}`));
  }

  // Objections
  const unresolvedObjections = memory.objectionsAddressed?.filter((o) => !o.resolved);
  if (unresolvedObjections && unresolvedObjections.length > 0) {
    sections.push("\n**Unresolved Concerns:**");
    unresolvedObjections.forEach((o) => sections.push(`- ${o.objection}`));
  }

  // Products discussed
  if (memory.productsDiscussed && memory.productsDiscussed.length > 0) {
    sections.push("\n**Products Discussed:**");
    memory.productsDiscussed
      .filter((p) => p.interest_level !== "low")
      .forEach((p) => sections.push(`- ${p.productName} (${p.interest_level} interest)`));
  }

  // Current stage
  if (memory.currentStage) {
    sections.push(`\n**Current Stage:** ${memory.currentStage}`);
  }

  // Next step
  if (memory.nextStep) {
    sections.push(`\n**Next Step:** ${memory.nextStep.action}`);
    if (memory.nextStep.dueDate) {
      const dueDate = new Date(memory.nextStep.dueDate).toLocaleDateString();
      sections.push(`- Due: ${dueDate}`);
    }
  }

  return sections.join("\n");
}
```

**Example formatted output:**
```
**Preferences:**
- Budget: $200-400/month
- Timeline: Q2 2025
- Decision maker: Yes

**Pain Points:**
- Current CRM too complex
- Need better automation
- Zapier integration unreliable

**Unresolved Concerns:**
- API rate limits on premium plan

**Products Discussed:**
- premium_plan (high interest)
- zapier_addon (medium interest)

**Current Stage:** consideration

**Next Step:** Review case study by Friday
```

---

## Memory L5: Reactivation Context

### **Purpose**
When a lead goes cold for 7+ days and then returns, inject a brief reminder of the previous conversation arc so the AI doesn't start from scratch.

### **Detection Logic**

```typescript
/**
 * Check if session is a reactivation scenario
 */
function isReactivation(session: AgentSession): boolean {
  const daysSinceLastMessage = (Date.now() - session.lastMessageAt) / (1000 * 60 * 60 * 24);

  // Reactivation if:
  // 1. More than 7 days since last message
  // 2. Session has at least 3 previous messages (not a new lead)
  return daysSinceLastMessage > 7 && session.messageCount >= 3;
}
```

### **Generation Process**

**When to generate:** Immediately before responding to returning lead

```typescript
/**
 * Generate reactivation context
 */
async function generateReactivationContext(
  ctx: ActionCtx,
  sessionId: Id<"agentSessions">
): Promise<string> {
  // 1. Load session summary
  const session = await ctx.runQuery(internal.ai.agentSessions.getSession, { sessionId });
  const summary = session.currentSummary || "";

  // 2. Load contact profile
  const contact = session.crmContactId
    ? await ctx.runQuery(internal.objects.get, { id: session.crmContactId })
    : null;
  const memory = contact?.customProperties?.aiMemory as ContactMemory;

  // 3. Build reactivation prompt
  const prompt = `A lead has returned after ${Math.floor((Date.now() - session.lastMessageAt) / (1000 * 60 * 60 * 24))} days.

Previous conversation summary:
${summary}

Contact profile:
${JSON.stringify(memory, null, 2)}

Generate a brief reactivation context (max 100 words) that reminds the AI agent:
- What stage the conversation was at
- What the lead was interested in
- Any unresolved questions or concerns
- What the next step was supposed to be

Format: 2-3 sentences, factual and concise.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const client = new OpenRouterClient(apiKey);
  const response = await client.chatCompletion({
    model: "anthropic/claude-sonnet-4-20250514",
    messages: [
      {
        role: "system",
        content: "You are a conversation context generator. Create concise reactivation reminders.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  const context = response.choices[0]?.message?.content || "";

  // 4. Cache for future use
  await ctx.runMutation(internal.ai.agentSessions.updateSession, {
    sessionId,
    fields: {
      isReactivation: true,
      reactivationContext: context,
    },
  });

  return context;
}
```

### **Example Reactivation Context**

**Input:**
- Session summary: "Lead interested in premium plan, main concern was Zapier limits. Requested case study."
- Days since last message: 14
- Next step: "Review case study by Friday"

**Generated context:**
```
CONTEXT: This lead went quiet for 2 weeks after discussing the premium plan.
They were concerned about Zapier integration limits and requested a case study
for similar SaaS companies. The last agreed next step was to review the case
study by last Friday. They're in the consideration stage, evaluating 3 competitors.
```

### **Injection Point**

Reactivation context is prepended to system prompt:

```typescript
function buildSystemPrompt(memoryContext: MemoryContext): string {
  const parts = [];

  // Base system prompt
  parts.push(BASE_AGENT_SYSTEM_PROMPT);

  // Reactivation context (if applicable)
  if (memoryContext.reactivationContext) {
    parts.push("\n---\n");
    parts.push("⚠️ **REACTIVATION ALERT**");
    parts.push(memoryContext.reactivationContext);
    parts.push("---\n");
  }

  // Other memory layers
  parts.push(memoryContext.recentMessages);
  parts.push(memoryContext.sessionSummary);
  parts.push(memoryContext.contactProfile);

  return parts.join("\n\n");
}
```

---

## Memory Lifecycle Management

### **1. Session Start**
- Load recent context (Memory L1) ✅
- Load operator pinned notes (Memory L3) ✅
- Load contact profile (Memory L4) if contact is known ✅
- Check for reactivation (Memory L5) ✅

### **2. During Conversation**
- Every message: Add to recent context
- Every 10 messages: Trigger summarization (Memory L2)
- After each response: Check if extraction needed (Memory L4)
- Operator can add pinned notes (Memory L3) at any time

### **3. Session Idle (24h+)**
- Generate final summary (Memory L2)
- Generate reactivation context (Memory L5) for next time
- Mark session as potentially dormant
- Review operator notes for expiration

### **4. Session Reactivation**
- Detect gap > 7 days
- Load operator pinned notes (Memory L3)
- Inject reactivation context (Memory L5)
- Resume normal flow

### **5. Cross-Channel Handoff**
- If same contact messages via different channel
- Merge into existing session OR
- Create new session but link to same contact (unified Memory L4)
- Operator notes (Memory L3) follow the contact across channels

---

## Performance Optimization

### **Lazy Loading**

Don't build all 5 layers upfront. Load only what's needed:

```typescript
async function buildMemoryContextLazy(
  ctx: QueryCtx,
  sessionId: Id<"agentSessions">,
  maxTokens: number
): Promise<string> {
  let tokensUsed = 0;
  const parts = [];

  // Priority 0: ALWAYS include Memory L3 (operator notes) - NEVER skip
  const layer3 = await buildOperatorNotesContext(ctx, sessionId);
  tokensUsed += estimateTokens(layer3);
  parts.push(layer3);

  // Priority 1: Always include Memory L1 (recent context)
  const layer1 = await buildRecentContext(ctx, sessionId);
  tokensUsed += estimateTokens(layer1);
  parts.push(layer1);

  // Priority 2: Include Memory L4 (contact profile) if space allows
  if (tokensUsed < maxTokens * 0.7) {
    const layer4 = await buildContactProfile(ctx, sessionId);
    if (layer4) {
      tokensUsed += estimateTokens(layer4);
      parts.push(layer4);
    }
  }

  // Priority 3: Include Memory L2 (summary) if space allows
  if (tokensUsed < maxTokens * 0.85) {
    const layer2 = await buildSessionSummary(ctx, sessionId);
    if (layer2) {
      tokensUsed += estimateTokens(layer2);
      parts.push(layer2);
    }
  }

  // Priority 4: Include Memory L5 (reactivation) if applicable and space allows
  if (tokensUsed < maxTokens * 0.95) {
    const layer5 = await buildReactivationContext(ctx, sessionId);
    if (layer5) {
      parts.push(layer5);
    }
  }

  return parts.join("\n\n");
}
```

### **Caching**

Cache expensive operations:
- Session summaries (cache for 24h)
- Contact profiles (cache for 1h)
- Reactivation context (cache until next message)

### **Background Jobs**

Run expensive operations async:
- Summarization: Schedule 5min after trigger
- Extraction: Can be done post-response
- Reactivation context: Pre-generate when session goes idle

---

## Metrics & Analytics

### **Track Memory Effectiveness**

```typescript
interface MemoryMetrics {
  sessionId: string;

  // Memory layer usage
  memoryLayersUsed: string[];
  memoryL1Tokens: number;
  memoryL2Tokens: number;
  memoryL3Tokens: number;
  memoryL4Tokens: number;
  totalTokens: number;

  // Extraction metrics
  factsExtracted: number;
  extractionAccuracy: number; // Manual review score

  // Summarization metrics
  summarizationTriggered: boolean;
  summaryLength: number;

  // Reactivation metrics
  isReactivation: boolean;
  reactivationDays: number;
  reactivationEngaged: boolean; // Did lead respond positively?

  // Performance
  contextBuildTime: number; // ms
}
```

### **A/B Testing**

Test memory effectiveness:
- **Cohort A:** Full 5-layer memory (including operator notes)
- **Cohort B:** 4-layer memory (AI-only, no operator notes)
- **Cohort C:** GHL-style (single summary field)
- **Measure:** Conversion rate, response quality, engagement, operator satisfaction

**Hypothesis:** Operator Pinned Notes will significantly improve:
- Deal close rates (+15-25%)
- Strategic conversation quality
- Operator confidence in AI agent
- Ability to handle complex relationship dynamics

---

**Next:** [03_GHL_API_INTEGRATION.md](../ghl_integration_plus_memory/03_GHL_API_INTEGRATION.md) — Webhook and API implementation details
