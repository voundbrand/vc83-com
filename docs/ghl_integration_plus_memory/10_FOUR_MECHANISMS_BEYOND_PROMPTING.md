# The Four Mechanisms Beyond Prompting

**Last Updated:** 2025-02-05

---

## The Problem: RLHF Averaging

AI models are trained via **Reinforcement Learning from Human Feedback (RLHF)**, where thousands of human raters compare outputs and pick which they prefer. The model learns to produce responses that win with **generic raters** — the statistical center.

**Result:** Every response is optimized for someone who doesn't exist — the median user, a composite of everyone's preferences and nobody's in particular.

The career advice applies to someone in roughly your situation but not your actual situation. The code works but doesn't match how your team builds. The content is fine — helpful, competent, polite — but it doesn't feel like it was written **for you**.

---

## The Four Mechanisms

To escape RLHF averaging, AI platforms have quietly built four distinct mechanisms:

### 1. Memory
**What it is:** Context that persists across conversations. Facts about you, your preferences, your history.

**Examples:**
- "User prefers TypeScript over JavaScript"
- "Client's busy season is Q4"
- "Last conversation was about premium plan pricing"

### 2. Instructions
**What it is:** Standing orders about how to behave. System-level directives that apply across all interactions.

**Examples:**
- "Always show code examples in TypeScript"
- "Lead with ROI, not features"
- "Use UK spelling, not US spelling"
- "Never suggest video content"

### 3. Tools
**What it is:** External capabilities the AI can invoke. Actions beyond text generation.

**Examples:**
- Search the web
- Query a database
- Send an email
- Create a calendar event
- Update CRM record

### 4. Style Controls
**What it is:** Preferences for tone, verbosity, format. How the AI should communicate.

**Examples:**
- Formal vs. casual
- Concise vs. detailed
- Technical vs. accessible
- Direct vs. diplomatic

---

## How We Implement All Four Mechanisms

Our platform provides **all four mechanisms** across different layers of the system. Here's how they work together:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI AGENT SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LAYER 1: TOOLS (External Actions)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  40+ Agent Tools:                                   │    │
│  │  • CRM (create/update/search contacts)             │    │
│  │  • Booking (check availability, create bookings)   │    │
│  │  • Email (send via Resend)                         │    │
│  │  • SMS (send via Infobip)                          │    │
│  │  • WhatsApp (send via Infobip)                     │    │
│  │  • Invoicing (generate, send invoices)             │    │
│  │  • Payments (create checkout links)                │    │
│  │  • Workflows (trigger automation sequences)        │    │
│  │  • Web search, data extraction, etc.               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  LAYER 2: MEMORY (Persistent Context)                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  5-Layer Memory Architecture:                       │    │
│  │  • Layer 1: Recent context (last 10-15 messages)   │    │
│  │  • Layer 2: Session summaries (compressed history) │    │
│  │  • Layer 3: Operator pinned notes (strategic ctx)  │    │
│  │  • Layer 4: Contact profile (structured facts)     │    │
│  │  • Layer 5: Reactivation context (cold lead return)│    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  LAYER 3: INSTRUCTIONS (Standing Orders) ★ NEW             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Per-Contact Directives:                            │    │
│  │  • Behavioral rules ("Always lead with ROI")       │    │
│  │  • Content constraints ("Never pitch video")       │    │
│  │  • Communication style ("Use UK spelling")         │    │
│  │  • Strategic priorities ("Push Q4 campaigns")      │    │
│  │  • Learned corrections ("Don't use 'synergy'")    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  LAYER 4: STYLE CONTROLS (Tone & Format)                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Content DNA (from interview):                      │    │
│  │  • Tone: Casual, friendly, no corporate jargon     │    │
│  │  • Formality: Semi-formal                          │    │
│  │  • Verbosity: Concise (100-150 words)              │    │
│  │  • Format: Bullet points preferred                 │    │
│  │  • Avoid words: ["leverage", "synergy", "paradigm"]│    │
│  │  • Catchphrases: ["Let's dive in", "Here's the    │    │
│  │                    thing..."]                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 3: Instructions (The Missing Piece)

### What Instructions Are

**Instructions** are different from **Memory**:

| Aspect | Memory | Instructions |
|--------|--------|-------------|
| **Nature** | Facts | Rules |
| **Content** | "Client's budget is $200-400/mo" | "Always mention pricing last" |
| **Tense** | Descriptive (what IS) | Prescriptive (what to DO) |
| **Source** | Extracted from conversations | Encoded from corrections |
| **Example** | "Client prefers WhatsApp" | "Only contact via WhatsApp after 6pm" |

### Why Instructions Matter

**Without instructions**, corrections must be repeated every time:

```
Content Draft 1: "Our premium plan offers synergy..."
Client: "Don't use the word 'synergy' — too corporate"
→ Edit applied ✓

Content Draft 2: "Leverage our platform to achieve synergy..."
Client: "Again with 'synergy'? Please stop."
→ Edit applied ✓

Content Draft 3: "Create synergy between your teams..."
Client: "I SAID NO 'SYNERGY'!"
→ 🤦 The correction didn't compound
```

**With instructions**, corrections become standing orders:

```
Content Draft 1: "Our premium plan offers synergy..."
Client: "Don't use the word 'synergy'"

→ Instruction created:
  "NEVER use these words: synergy, leverage, paradigm"

Content Draft 2: "Connect your teams with our platform..."
→ No "synergy" ✓ Instruction applied automatically

Content Draft 3: "Align your workflow across departments..."
→ No "synergy" ✓ Instruction still applies
```

---

## Instruction Types

### 1. Behavioral Instructions (How to Act)

**Sales approach:**
- "Always lead with ROI and value, never features"
- "Price-sensitive — show calculator before mentioning cost"
- "This client needs social proof — reference similar customers"

**Communication rules:**
- "Only contact via WhatsApp after 6pm"
- "Keep messages under 100 words"
- "Always ask permission before sending files"

**Strategic priorities:**
- "Push holiday campaign templates in September (Q4 busy season)"
- "Focus on retention, not upsells (recent churn risk)"
- "Prioritize quick wins — they need early success"

### 2. Content Constraints (What NOT to Do)

**Never mention:**
- "Never pitch video content (rejected 3x)"
- "Don't discuss competitor pricing"
- "Avoid political topics"

**Avoid words:**
- "Don't use: synergy, leverage, paradigm, circle back"
- "Use 'help' not 'assist', 'start' not 'commence'"

**Format restrictions:**
- "No lists longer than 5 items"
- "No posts over 150 words"
- "Always include emojis in social posts"

### 3. Style Overrides (Fine-Tune Tone)

**Spelling & grammar:**
- "Use UK spelling (colour, organisation)"
- "Oxford comma required"
- "Single space after periods"

**Technical level:**
- "Assume expert audience — no 101 explanations"
- "Avoid jargon — write for beginners"

**Brand voice enforcement:**
- "Always reference 'clients' not 'customers'"
- "Use first person plural ('we', 'our') not third person"
- "Open with a question, close with a CTA"

### 4. Learned Corrections (From Feedback Loop)

**From content rejections:**
- Client rejects 3 drafts for being "too formal"
  → Instruction: "Tone down formality — write like talking to a friend"

- Client edits every draft to add personal stories
  → Instruction: "Always include a personal anecdote or story"

- Client removes all exclamation marks
  → Instruction: "Avoid exclamation marks — use periods only"

---

## Data Architecture

### Instructions Table Schema

```typescript
// New table: agentInstructions

interface AgentInstruction {
  id: string;
  organizationId: string;
  targetType: "organization" | "contact" | "agent";
  targetId: string;

  // Instruction content
  category: "behavioral" | "content_constraint" | "style_override" | "learned_correction";
  instruction: string;        // The actual directive
  priority: "high" | "medium" | "low";

  // Source tracking
  source: "operator_manual" | "client_feedback" | "ai_learned" | "system_default";
  sourceContext?: {
    rejectionCount?: number;  // How many times this pattern was corrected
    originalIssue?: string;   // What triggered this instruction
    exampleCorrection?: string; // Example of the correction
  };

  // Lifecycle
  createdBy: string;          // userId or "system"
  createdAt: number;
  expiresAt?: number;         // Optional expiration for temporary instructions
  isActive: boolean;          // Can be toggled on/off

  // Enforcement
  enforcementLevel: "strict" | "guideline" | "suggestion";
  // strict: AI must follow (hard constraint)
  // guideline: AI should follow (soft constraint)
  // suggestion: AI may follow (hint)
}
```

### Schema Definition

```typescript
// convex/schemas/instructionSchemas.ts

export const agentInstructions = defineTable({
  organizationId: v.id("organizations"),
  targetType: v.union(
    v.literal("organization"),
    v.literal("contact"),
    v.literal("agent")
  ),
  targetId: v.string(),

  category: v.union(
    v.literal("behavioral"),
    v.literal("content_constraint"),
    v.literal("style_override"),
    v.literal("learned_correction")
  ),
  instruction: v.string(),
  priority: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  ),

  source: v.union(
    v.literal("operator_manual"),
    v.literal("client_feedback"),
    v.literal("ai_learned"),
    v.literal("system_default")
  ),
  sourceContext: v.optional(v.object({
    rejectionCount: v.optional(v.number()),
    originalIssue: v.optional(v.string()),
    exampleCorrection: v.optional(v.string()),
  })),

  createdBy: v.string(),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
  isActive: v.boolean(),

  enforcementLevel: v.union(
    v.literal("strict"),
    v.literal("guideline"),
    v.literal("suggestion")
  ),
})
  .index("by_target", ["targetType", "targetId"])
  .index("by_org", ["organizationId"])
  .index("by_category", ["category"])
  .index("by_active", ["isActive"]);
```

---

## Instruction Lifecycle

### 1. Creation Sources

**Operator Manual:**
```
Agency adds instruction for Maria's Bakery:
"Push holiday campaign templates in September — Q4 is busy"
→ Source: operator_manual
→ Enforcement: guideline
```

**Client Feedback:**
```
Client rejects draft: "Too formal — tone it down"
System detects pattern (3rd rejection for formality)
→ Auto-creates instruction: "Use casual tone, avoid formal language"
→ Source: client_feedback
→ Enforcement: strict (learned from repeated feedback)
```

**AI Learned:**
```
AI notices: Client always removes exclamation marks
AI proposes: "Avoid exclamation marks in content?"
Operator approves
→ Source: ai_learned
→ Enforcement: guideline
```

**System Default:**
```
Platform provides default instruction:
"Use inclusive language (they/them when gender unknown)"
→ Source: system_default
→ Enforcement: suggestion
```

### 2. Priority & Conflict Resolution

When instructions conflict, resolve by:

1. **Enforcement level** (strict > guideline > suggestion)
2. **Priority** (high > medium > low)
3. **Specificity** (contact-level > org-level)
4. **Recency** (newer > older)

**Example conflict:**

```
Org-level instruction (medium priority):
"Keep all posts under 200 words"

Contact-level instruction (high priority):
"Client prefers detailed posts (250-300 words)"

→ Contact-level wins (more specific)
```

### 3. Learning from Corrections

When client rejects/edits AI output, detect patterns:

```typescript
async function learnFromCorrection(
  ctx: ActionCtx,
  contentId: string,
  originalText: string,
  correctedText: string,
  contactId: string
) {
  // 1. Analyze diff
  const diff = computeDiff(originalText, correctedText);

  // 2. Detect patterns
  const patterns = detectPatterns(diff);
  // Example patterns:
  // - Removed all exclamation marks (3x in a row)
  // - Added personal story (5x in a row)
  // - Changed "customers" to "clients" (every time)

  // 3. If pattern detected 3+ times, propose instruction
  if (patterns.confidence > 0.8 && patterns.count >= 3) {
    await proposeInstruction(ctx, {
      contactId,
      category: "learned_correction",
      instruction: patterns.suggestedInstruction,
      sourceContext: {
        rejectionCount: patterns.count,
        originalIssue: patterns.issue,
        exampleCorrection: diff.summary,
      },
    });
  }
}
```

---

## System Prompt Assembly

When building context for AI agent, assemble in this order:

```typescript
function buildAgentSystemPrompt(
  session: AgentSession,
  contact: CRMContact,
  agent: AgentConfig
): string {
  const sections = [];

  // 1. Base system prompt (agent's core identity)
  sections.push(agent.systemPrompt);

  // 2. Tools available (from registry)
  sections.push(formatToolsContext(agent.availableTools));

  // 3. Memory (5 layers)
  sections.push(buildMemoryContext(session, contact));
  // Includes:
  // - Recent context (Layer 1)
  // - Session summary (Layer 2)
  // - Operator notes (Layer 3)
  // - Contact profile (Layer 4)
  // - Reactivation context (Layer 5)

  // 4. Instructions (standing orders) ★ NEW
  sections.push(buildInstructionsContext(contact, agent));

  // 5. Style controls (Content DNA)
  sections.push(buildStyleContext(contact));

  return sections.join("\n\n");
}

function buildInstructionsContext(
  contact: CRMContact,
  agent: AgentConfig
): string {
  // Get all active instructions (contact-level + org-level)
  const instructions = getActiveInstructions(contact.id, contact.organizationId);

  if (instructions.length === 0) return "";

  const sections = ["## Standing Instructions (CRITICAL DIRECTIVES)"];
  sections.push("*You MUST follow these directives in all interactions:*\n");

  // Group by enforcement level
  const strict = instructions.filter(i => i.enforcementLevel === "strict");
  const guidelines = instructions.filter(i => i.enforcementLevel === "guideline");
  const suggestions = instructions.filter(i => i.enforcementLevel === "suggestion");

  if (strict.length > 0) {
    sections.push("### STRICT REQUIREMENTS (Must Follow):");
    strict.forEach(i => {
      sections.push(`❗ ${i.instruction}`);
    });
  }

  if (guidelines.length > 0) {
    sections.push("\n### GUIDELINES (Should Follow):");
    guidelines.forEach(i => {
      sections.push(`⚠️ ${i.instruction}`);
    });
  }

  if (suggestions.length > 0) {
    sections.push("\n### SUGGESTIONS (Consider):");
    suggestions.forEach(i => {
      sections.push(`💡 ${i.instruction}`);
    });
  }

  return sections.join("\n");
}
```

**Example assembled prompt:**

```
You are a helpful AI assistant for Maria's Bakery.

## Tools Available
- send_email, send_sms, create_booking, update_crm_contact, ...

## Memory Context
### Recent Conversation
User: "What's your pricing for the holiday campaign?"
Assistant: "Our holiday package is €299..."

### Operator Notes
🎯 [Strategy] Push holiday campaigns in September — Q4 is busy
🤝 [Relationship] VIP referral from Dave Chen — white-glove service

### Contact Profile
- Business: Local bakery in Munich
- Audience: Local families
- Budget: €200-400/month

## Standing Instructions (CRITICAL DIRECTIVES)
### STRICT REQUIREMENTS (Must Follow):
❗ Never use these words: synergy, leverage, paradigm
❗ Always mention pricing AFTER showing value/ROI
❗ Only contact via WhatsApp after 6pm on weekdays

### GUIDELINES (Should Follow):
⚠️ Keep messages under 100 words
⚠️ Include a personal story or anecdote
⚠️ Reference Q4 busy season in relevant content

### SUGGESTIONS (Consider):
💡 Use emojis sparingly (1-2 per message max)
💡 End with a question to encourage engagement

## Style Controls
- Tone: Warm, friendly, approachable
- Formality: Semi-casual
- Verbosity: Concise (100-150 words)
- Avoid words: ["corporate jargon", "circle back", "touch base"]
```

---

## UI for Managing Instructions

### Agency Dashboard: Contact Instructions

```
┌─────────────────────────────────────────────────────────────┐
│  Maria's Bakery — Instructions                    [+ Add]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Active Instructions (7)                                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ❗ STRICT: Never use these words: synergy, leverage  │  │
│  │     Source: Client feedback (3 corrections)           │  │
│  │     [Edit] [Deactivate] [Delete]                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  ❗ STRICT: Always mention pricing AFTER value/ROI    │  │
│  │     Source: Operator manual (added by Sarah)          │  │
│  │     [Edit] [Deactivate] [Delete]                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  ⚠️ GUIDELINE: Push holiday campaigns in September    │  │
│  │     Source: Operator manual (strategic)               │  │
│  │     [Edit] [Deactivate] [Delete]                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  💡 SUGGESTION: Use emojis sparingly (1-2 max)       │  │
│  │     Source: AI learned (pattern detected)             │  │
│  │     [Edit] [Deactivate] [Delete]                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Inactive Instructions (2) [Show]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Add Instruction Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  Add Instruction                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Category: [Behavioral ▼]                                   │
│                                                              │
│  Instruction:                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Always lead with ROI and value proposition        │    │
│  │  before mentioning pricing                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Enforcement:  ⦿ Strict  ○ Guideline  ○ Suggestion          │
│  Priority:     ○ High    ⦿ Medium     ○ Low                 │
│                                                              │
│  □ Set expiration date [Optional]                           │
│                                                              │
│  [Save Instruction] [Cancel]                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## The Compounding Effect

### Without Instructions (Corrections Repeat)

```
Month 1: Client corrects 10 drafts for tone
Month 2: Client corrects 8 drafts for tone (slightly better)
Month 3: Client corrects 6 drafts for tone (slow improvement)
Month 4: Client corrects 4 drafts for tone

Total corrections: 28
Time wasted: ~14 hours
```

### With Instructions (Corrections Compound)

```
Month 1: Client corrects 10 drafts
  → 3 instructions created from patterns
  → Encoded: "Use casual tone", "Avoid exclamations", "Include stories"

Month 2: Client corrects 2 drafts (instructions working)
  → 1 new instruction: "End with questions"

Month 3: Client corrects 0 drafts ✓
  → Instructions fully effective

Month 4: Client corrects 0 drafts ✓

Total corrections: 12
Time saved: ~20 hours vs. no instructions
Quality: Drafts get approved on first review
```

---

## Integration with Other Mechanisms

### Instructions + Memory

**Memory** tells you what IS. **Instructions** tell you what to DO about it.

```
Memory (Layer 4 - Contact Profile):
"Client's budget: $200-400/month"

Instruction (Layer 3):
"Always show ROI calculator before mentioning pricing"

→ AI generates content:
  "Our clients typically see 3x ROI in the first quarter.
   Here's how that breaks down for your budget range..."
  (Shows value BEFORE price ✓)
```

### Instructions + Tools

**Tools** are capabilities. **Instructions** tell you WHEN and HOW to use them.

```
Tool available: send_email

Instruction:
"Only send emails on weekdays before 5pm"

→ AI behavior:
  User: "Send Maria an email about the new package"
  AI: "It's Saturday. I'll schedule this for Monday morning. ✓"
```

### Instructions + Style

**Style** controls tone/format. **Instructions** add behavioral constraints.

```
Style (Content DNA):
Tone: Casual, friendly

Instruction:
"Never mention competitor pricing"

→ AI generates post:
  "We keep things simple and transparent. Our pricing is €299/mo,
   and here's exactly what you get..." ✓
  (Casual tone ✓, no competitor mention ✓)
```

---

## Where Instructions Break Down

### 1. Creative Work

Instructions work for **structured tasks** (sales, support, content drafts). They're less effective for **open-ended creative work** (brainstorming, strategy, art).

**Example:**
- ✅ Good: "Write LinkedIn post about our new feature"
  - Instructions can guide tone, format, constraints
- ❌ Limited: "Come up with a breakthrough marketing strategy"
  - Too open-ended for standing orders

### 2. Novel Situations

Instructions are learned from **past patterns**. They don't help with **truly novel situations**.

**Example:**
- ✅ Good: "How should I handle this pricing objection?"
  - Instruction: "Always lead with ROI" applies ✓
- ❌ Limited: "How should we respond to this unexpected PR crisis?"
  - No prior pattern, no instruction exists

### 3. Conflicting Constraints

Too many instructions can create **impossible constraints**.

**Example:**
```
Instruction 1: "Keep messages under 100 words"
Instruction 2: "Always include personal story"
Instruction 3: "Explain ROI with calculator"
Instruction 4: "Reference 3 case studies"

→ All four together = impossible ❌
```

**Solution:** Priority system + conflict detection

---

## Measuring Effectiveness

### Instruction Impact Metrics

```typescript
interface InstructionMetrics {
  instructionId: string;
  instruction: string;

  // Adherence
  timesApplied: number;        // How many times AI used this instruction
  timesViolated: number;       // How many times AI ignored it
  adherenceRate: number;       // timesApplied / (timesApplied + timesViolated)

  // Effectiveness
  approvalsWithInstruction: number;      // Content approved on first try
  approvalsWithoutInstruction: number;   // Content approved (before instruction existed)
  effectivenessLift: number;   // % improvement in approval rate

  // Corrections saved
  correctionsSavedEstimate: number;  // How many edits this prevented
  timeSavedHours: number;            // Estimated time saved
}
```

### Dashboard View

```
┌─────────────────────────────────────────────────────────────┐
│  Instruction Effectiveness Report                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Top Performing Instructions:                                │
│                                                              │
│  1. "Always lead with ROI before pricing"                   │
│     Adherence: 98% | Approval lift: +45% | Time saved: 12h │
│                                                              │
│  2. "Avoid corporate jargon (synergy, leverage, etc)"       │
│     Adherence: 95% | Approval lift: +32% | Time saved: 8h  │
│                                                              │
│  3. "Include personal story or anecdote"                    │
│     Adherence: 87% | Approval lift: +28% | Time saved: 6h  │
│                                                              │
│  Low Adherence Instructions (may need revision):             │
│                                                              │
│  • "Keep messages under 100 words" (adherence: 62%)         │
│    Issue: Conflicts with "Include story" instruction        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create `agentInstructions` table
- [ ] Build CRUD APIs (create, read, update, deactivate, delete)
- [ ] Implement priority & conflict resolution logic
- [ ] Add instructions to system prompt assembly

### Phase 2: UI & Management (Week 3)
- [ ] Agency dashboard: Instructions tab per contact
- [ ] Add/edit/delete instruction dialog
- [ ] Bulk operations (activate/deactivate multiple)
- [ ] Instruction templates library

### Phase 3: Learning Engine (Week 4-5)
- [ ] Pattern detection from content rejections
- [ ] Diff analysis for corrections
- [ ] Auto-propose instructions after 3+ patterns
- [ ] Operator approval workflow for AI-proposed instructions

### Phase 4: Effectiveness Tracking (Week 6)
- [ ] Track instruction adherence
- [ ] Measure approval rate lift
- [ ] Calculate time/corrections saved
- [ ] Effectiveness dashboard

### Phase 5: Advanced Features (Week 7+)
- [ ] Instruction conflict detection
- [ ] A/B testing (with/without specific instructions)
- [ ] Instruction templates marketplace
- [ ] Cross-client instruction patterns (anonymized)

---

## Competitive Advantage

### What Makes This Unique

| Feature | ChatGPT Custom Instructions | Claude Projects | Our Platform |
|---------|----------------------------|-----------------|--------------|
| **Scope** | User-level only | Project-level | Org + Contact + Agent |
| **Learning** | Manual only | Manual only | **Auto-learns from corrections** |
| **Enforcement** | Suggestion only | Suggestion only | **Strict / Guideline / Suggestion** |
| **Conflict resolution** | No system | No system | **Priority-based** |
| **Source tracking** | No | No | **Yes (operator/client/AI/system)** |
| **Effectiveness metrics** | No | No | **Yes (adherence, lift, time saved)** |
| **Integration** | Chat only | Chat only | **Cross-channel (SMS/WhatsApp/Email)** |

### Our Moats

1. **Auto-learning from corrections** — No one else compounds feedback into standing orders
2. **Multi-level hierarchy** — Org-wide, contact-specific, agent-specific
3. **Enforcement levels** — Strict vs. guideline vs. suggestion
4. **CRM integration** — Instructions tied to contact records, not just conversations
5. **Cross-channel** — Same instructions apply to SMS, WhatsApp, email, webchat

---

## Summary

### The Four Mechanisms Working Together

```
Client: "Draft a LinkedIn post about our new pricing"

TOOLS LAYER:
✓ Can access CRM to check pricing
✓ Can schedule post via social media tool

MEMORY LAYER:
✓ Layer 3 (Operator note): "VIP client — white-glove"
✓ Layer 4 (Contact profile): Budget $200-400, B2B audience

INSTRUCTIONS LAYER: ★ NEW
✓ "Always lead with ROI before mentioning price"
✓ "Never use: synergy, leverage, paradigm"
✓ "Include a client success story"

STYLE LAYER:
✓ Tone: Professional but approachable
✓ Length: 150-200 words
✓ Format: Hook + Story + CTA

AI GENERATES:
─────────────
Ever wonder what 3x ROI looks like in 90 days?

Sarah's agency was stuck at $10K/mo. She couldn't scale
because manual client onboarding took 6 hours per client.

We helped her automate the entire flow. Now she onboards
clients in 30 minutes. Her revenue? $32K/mo.

That's the power of smart automation. Our new pricing
makes it accessible for agencies of any size.

Want to see how it works for your agency? DM me.
─────────────

✓ Led with ROI (instruction followed)
✓ Included success story (instruction followed)
✓ No corporate jargon (instruction followed)
✓ Professional but approachable tone (style followed)
✓ 150 words (style followed)
✓ Hook + Story + CTA (style followed)

→ Client approves on first review ✓
→ No corrections needed ✓
→ 30 minutes saved ✓
```

---

**This is the system that escapes RLHF averaging. Not through better prompting. Through better architecture.**

**Related Documents:**
- [02_MEMORY_ENGINE_DESIGN.md](./02_MEMORY_ENGINE_DESIGN.md) — 5-layer memory architecture
- [09_UNIVERSAL_MEMORY_CONSENT.md](./09_UNIVERSAL_MEMORY_CONSENT.md) — Memory consent system
- [MEMORY_CONSENT_INTEGRATION.md](../pressmaster_onboarding/MEMORY_CONSENT_INTEGRATION.md) — Pressmaster integration
