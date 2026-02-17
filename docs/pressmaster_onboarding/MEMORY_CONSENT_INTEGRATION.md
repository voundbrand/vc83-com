# Memory Consent Integration — Pressmaster Onboarding

**Last Updated:** 2025-02-05

---

## Overview

The Pressmaster onboarding system conducts AI-powered interviews with clients to extract their "Content DNA" — brand voice, expertise, audience insights, and preferences. This document describes how the **Universal Memory Consent System** integrates with the interview engine to give clients transparency and control over what gets remembered.

**Related Documents:**
- [Universal Memory Consent System](../ghl_integration_plus_memory/09_UNIVERSAL_MEMORY_CONSENT.md)
- [Phase 1: Interview Engine](./PHASE_1_INTERVIEW_ENGINE.md)
- [Phase 3: Content Pipeline](./PHASE_3_CONTENT_PIPELINE.md)

---

## Why Memory Consent Matters Here

### The Problem Without Consent

In a traditional interview flow:
```
AI: "Who is your ideal customer?"
Client: "Small business owners struggling with cash flow"
→ Silently stored in Content DNA
→ Client has no visibility or control
```

**Issues:**
1. **Black box**: Client doesn't know what's being stored
2. **No control**: Client can't edit or delete extracted facts
3. **Trust gap**: Feels invasive, especially for sensitive business info
4. **GDPR risk**: Storing personal/business data without explicit consent

### With Memory Consent

```
AI: "Who is your ideal customer?"
Client: "Small business owners struggling with cash flow"

💡 Remember this?
□ Ideal customer: Small business owners with cash flow challenges

[Remember] [No Thanks]

Client clicks [Remember]
→ Saved to Content DNA with timestamp
→ Client can view/edit in profile
→ Client can revoke at any time
```

**Benefits:**
1. ✅ **Transparent**: Client sees exactly what's being stored
2. ✅ **Controlled**: Client decides what to save
3. ✅ **Trustworthy**: Builds confidence in the AI system
4. ✅ **Compliant**: GDPR-friendly by design

---

## Integration Points

### 1. During Interview (Phase 1)

#### Inline Consent After Each Answer

After the client answers a question, the AI extracts structured data and **asks permission** before saving:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 2 of 4: Your Audience                                 │
│  ████████░░░░░░░░  45% complete                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AI: "Who is your ideal customer? Describe the person who   │
│       gets the most value from what you offer."             │
│                                                              │
│  You: "Small business owners, usually 1-5 employees,        │
│        struggling with cash flow and needing better         │
│        financial visibility."                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  💡 I extracted these insights from your answer.            │
│     Would you like me to remember them?                      │
│                                                              │
│  ✓ Ideal customer: Small business owners (1-5 employees)    │
│  ✓ Main pain point: Cash flow management                    │
│  ✓ Need: Financial visibility                               │
│                                                              │
│  [Remember Selected] [Edit] [Skip]                          │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// After each interview answer, extract facts and propose consent
async function processInterviewAnswer(
  ctx: ActionCtx,
  sessionId: Id<"agentSessions">,
  userMessage: string
) {
  // 1. Get current interview state
  const session = await ctx.runQuery(internal.ai.agentSessions.getSession, { sessionId });
  const template = await ctx.runQuery(internal.interviewTemplateOntology.getTemplate, {
    templateId: session.interviewTemplateId!
  });

  // 2. Extract structured facts from answer
  const currentQuestion = getCurrentQuestion(session, template);
  const extractedFacts = await extractFactsFromAnswer(
    ctx,
    userMessage,
    currentQuestion.extractionField,
    currentQuestion.expectedDataType
  );

  // 3. Propose memory consent for extracted facts
  if (extractedFacts.length > 0) {
    const consents = await ctx.runMutation(
      internal.ai.memoryConsent.proposeMemoryConsent,
      {
        organizationId: session.organizationId,
        contactId: session.crmContactId, // Client's contact record
        facts: extractedFacts,
        contextType: "interview",
        contextId: sessionId,
      }
    );

    // 4. Return consent prompt to client
    return {
      type: "consent_prompt",
      consents,
      message: "I extracted these insights from your answer. Would you like me to remember them?",
    };
  }

  // 5. Continue interview if no extraction needed
  return advanceInterview(ctx, sessionId);
}
```

#### End-of-Phase Summary

At the end of each interview phase, show a summary of what's been remembered:

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Phase 2 Complete: Your Audience                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Great! Here's what I learned about your audience:          │
│                                                              │
│  ✓ Ideal customer: Small business owners (1-5 employees)    │
│  ✓ Main pain point: Cash flow management                    │
│  ✓ Need: Financial visibility                               │
│  ✓ Where they hang out: LinkedIn, local business groups     │
│                                                              │
│  [Edit Any] [Continue to Phase 3 →]                         │
└─────────────────────────────────────────────────────────────┘
```

#### User-Initiated Memory Saves

Clients can also **explicitly request** that something be remembered:

```
Client: "Remember that I prefer a casual, friendly tone — no corporate jargon"
AI: "✓ Saved your tone preference. I'll keep that in mind for all content."
```

**Detection patterns:**
- "remember that..."
- "make sure you know..."
- "don't forget..."
- "keep in mind..."

---

### 2. Content DNA Profile View (`/c/profile`)

The client's profile page shows all stored memories with full transparency:

```
┌─────────────────────────────────────────────────────────────┐
│  Your Content DNA Profile                    [Edit Profile]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Brand Voice (4 items)                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tone: Casual, friendly, no corporate jargon         │  │
│  │  Saved: Jan 15, 2025 from Interview                  │  │
│  │  [Edit] [Delete]                                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Avoid words: "leverage", "synergy", "paradigm"      │  │
│  │  Saved: Jan 15, 2025 from Interview                  │  │
│  │  [Edit] [Delete]                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Audience (3 items)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Ideal customer: Small business owners (1-5 people)  │  │
│  │  Saved: Jan 15, 2025 from Interview                  │  │
│  │  [Edit] [Delete]                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Expertise (5 items)                                         │
│  Content Preferences (6 items)                               │
│  Goals (2 items)                                             │
│                                                              │
│  [+ Add New Memory]  [Export All Data]  [Delete Profile]    │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Categorized display**: Grouped by category (voice, audience, expertise, etc.)
2. **Source attribution**: Shows where each memory came from (interview, manual addition, etc.)
3. **Timestamp**: When it was saved
4. **Edit/Delete**: Full CRUD control
5. **Export**: Download all memories as JSON (GDPR compliance)
6. **Delete profile**: Nuclear option — remove all Content DNA

**Implementation:**

```typescript
// convex/contentDNA.ts

export const getClientContentDNA = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // 1. Get client's Content DNA object
    const contentDNA = await ctx.db
      .query("objects")
      .withIndex("by_organization_and_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "content_profile")
      )
      .first();

    if (!contentDNA) return null;

    // 2. Get all memory consents (accepted only)
    const memories = await ctx.db
      .query("memoryConsents")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    // 3. Group by category
    const grouped = groupMemoriesByCategory(memories);

    return {
      contentDNA,
      memories: grouped,
      stats: {
        totalMemories: memories.length,
        lastUpdated: Math.max(...memories.map(m => m.respondedAt || 0)),
      },
    };
  },
});

export const deleteClientMemory = mutation({
  args: {
    consentId: v.id("memoryConsents"),
  },
  handler: async (ctx, args) => {
    // 1. Verify user has permission (client role can delete own memories)
    const consent = await ctx.db.get(args.consentId);
    if (!consent) throw new Error("Memory not found");

    // 2. Delete consent record
    await ctx.db.delete(args.consentId);

    // 3. Remove from Content DNA object
    const contentDNA = await ctx.db
      .query("objects")
      .withIndex("by_organization_and_type", (q) =>
        q
          .eq("organizationId", consent.organizationId)
          .eq("type", "content_profile")
      )
      .first();

    if (contentDNA) {
      const fact = JSON.parse(consent.memoryContent);
      const updatedProperties = removeFactFromContentDNA(
        contentDNA.customProperties,
        fact
      );
      await ctx.db.patch(contentDNA._id, { customProperties: updatedProperties });
    }

    return { success: true };
  },
});
```

---

### 3. Agency Operator Notes (Layer 3)

While the **client** controls their own Content DNA memories, the **agency** can add **operator notes** with strategic context that the AI should remember but the client doesn't need to see.

**Use Cases:**

1. **Relationship context**: "This client is a referral from our biggest account — white-glove service"
2. **Business intelligence**: "Mentioned they're evaluating 2 other agencies. Price-sensitive."
3. **Strategic reminders**: "Their busy season is Q4. Ramp up content in September."
4. **Warnings**: "Do NOT pitch video content — they've rejected it twice before"

**Agency Dashboard View:**

```
┌─────────────────────────────────────────────────────────────┐
│  Maria's Bakery — Client Details                            │
├─────────────────────────────────────────────────────────────┤
│  Content DNA (24 items)  |  Operator Notes (3)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Operator Notes (visible to agency only)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🎯 [Strategy] Push holiday campaign templates in    │  │
│  │     September — their Q4 is busiest season           │  │
│  │     Added by: Sarah (Jan 20)                         │  │
│  │     [Edit] [Delete]                                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  🤝 [Relationship] Referral from Dave Chen (VIP).    │  │
│  │     Handle with care.                                │  │
│  │     Added by: John (Jan 15)                          │  │
│  │     [Edit] [Delete]                                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  ⚠️ [Warning] Price-sensitive. Lead with ROI and     │  │
│  │     value, not features.                             │  │
│  │     Added by: Sarah (Jan 18)                         │  │
│  │     [Edit] [Delete]                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [+ Add Operator Note]                                       │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**

- **Operator notes are NEVER shown to the client**
- They are included in AI system prompts (Layer 3 of memory architecture)
- They provide human-curated context that AI can't infer
- They are our **competitive differentiator** — no other platform has this

**Agent Context Building:**

When the AI generates content for this client, the system prompt includes:

```
## Content DNA (Client-Provided)
- Tone: Casual, friendly
- Audience: Small business owners
- Main topics: Cash flow, financial planning

## Operator Notes (Agency Intelligence)
🎯 [Strategy] Push holiday campaign templates in September — Q4 is busy season
🤝 [Relationship] Referral from Dave Chen (VIP) — white-glove service
⚠️ [Warning] Price-sensitive — lead with ROI, not features
```

---

### 4. Content Generation Consent (Phase 3)

When the AI generates content drafts using the client's Content DNA, it can **ask for consent** to use specific facts:

```
┌─────────────────────────────────────────────────────────────┐
│  New Content Draft Ready                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LinkedIn Post: "3 Cash Flow Mistakes Small Biz Owners Make"│
│                                                              │
│  💡 I used these facts from your profile:                   │
│  ✓ Your expertise: Financial planning for SMBs              │
│  ✓ Your audience: Small business owners (1-5 employees)     │
│  ✓ Their pain point: Cash flow management                   │
│                                                              │
│  [Review Post →]                                             │
└─────────────────────────────────────────────────────────────┘
```

This creates **transparency** — the client sees exactly which pieces of their Content DNA influenced the generated content.

---

### 5. Interview Re-Onboarding

If a client wants to **update their Content DNA** (e.g., their business evolved, audience changed), they can request a re-interview:

```
┌─────────────────────────────────────────────────────────────┐
│  Your Content DNA Profile                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Last updated: Jan 15, 2025 (3 months ago)                  │
│                                                              │
│  💡 Has your business changed? Your audience evolved?        │
│     Consider refreshing your profile.                        │
│                                                              │
│  [Start Re-Interview] [Edit Manually]                        │
└─────────────────────────────────────────────────────────────┘
```

**Re-interview flow:**
1. Client clicks "Start Re-Interview"
2. Agency gets notified: "Maria requested a profile refresh"
3. Agency can choose:
   - **Full re-interview**: All phases again
   - **Targeted update**: Only specific phases (e.g., "Audience" phase)
   - **Manual edit**: Agency updates Content DNA directly
4. New interview session starts with consent system active
5. **Memory consent shows diffs**: "You previously said X, now you said Y. Update?"

---

## Data Architecture

### Memory Types in Pressmaster Context

```typescript
interface PressmasterMemory extends MemoryConsent {
  // Inherited from MemoryConsent
  memoryType:
    | "content_dna_fact"       // Facts extracted during interview
    | "tone_preference"        // Voice/tone preferences
    | "audience_insight"       // Audience understanding
    | "expertise_claim"        // Topics they can speak on
    | "content_preference"     // Post length, frequency, etc.
    | "goal_statement"         // What they want to achieve
    | "operator_note";         // Agency-added strategic context

  // Additional Pressmaster-specific fields
  interviewPhaseId?: string;   // Which phase this came from
  interviewQuestionId?: string;// Which question triggered extraction
  contentDNACategory:
    | "voice"
    | "expertise"
    | "audience"
    | "content_prefs"
    | "brand"
    | "goals";
}
```

### Storage Mapping

| Memory Type | Stored In | Consent Required? | Client Visible? | AI Sees? |
|-------------|-----------|-------------------|-----------------|----------|
| Content DNA fact | `objects` (type=content_profile) | ✅ Yes | ✅ Yes | ✅ Yes |
| Tone preference | `objects` (content_profile) | ✅ Yes | ✅ Yes | ✅ Yes |
| Audience insight | `objects` (content_profile) | ✅ Yes | ✅ Yes | ✅ Yes |
| Expertise claim | `objects` (content_profile) | ✅ Yes | ✅ Yes | ✅ Yes |
| Goal statement | `objects` (content_profile) | ✅ Yes | ✅ Yes | ✅ Yes |
| **Operator note** | `operatorNotes` table | ❌ No (agency internal) | ❌ No | ✅ Yes |

---

## Implementation Phases

### Phase 1A: Interview Consent (Extend Phase 1)

**Add to Phase 1: Interview Engine**

- [ ] Add consent prompt after each interview answer
- [ ] Extract facts → propose consent → wait for client approval
- [ ] Store accepted facts in Content DNA object
- [ ] Add end-of-phase summary with edit/review
- [ ] Detect user-initiated memory requests ("remember that...")

### Phase 2A: Client Profile Viewer (Extend Phase 2)

**Add to Phase 2: Client Onboarding**

- [ ] Create `/c/profile` route with full Content DNA display
- [ ] Categorized memory view (voice, audience, expertise, etc.)
- [ ] Edit/delete individual memories
- [ ] Export all memories (JSON download)
- [ ] "Request Re-Interview" button

### Phase 3A: Operator Notes (New in Phase 3)

**Add to Phase 3: Content Pipeline**

- [ ] Create `operatorNotes` table (if not exists)
- [ ] Agency UI for adding operator notes to client profiles
- [ ] Inject operator notes into AI system prompts (Layer 3)
- [ ] **NEVER show operator notes to clients**
- [ ] Categories: strategy, relationship, context, warning, opportunity

### Phase 3B: Content Generation Transparency

**Add to Phase 3: Content Pipeline**

- [ ] When generating content, track which Content DNA facts were used
- [ ] Show "I used these facts from your profile" in content review UI
- [ ] Allow client to remove facts from future content generation

---

## User Flows

### Flow 1: First-Time Interview with Consent

```
Agency invites Maria (client)
    ↓
Maria signs up → lands in interview
    ↓
AI: "Tell me about your business"
Maria: [answers via voice or text]
    ↓
AI extracts: { bio: "Bakery in Munich...", industry: "food" }
    ↓
💡 Remember this?
□ Business: Bakery in Munich
□ Industry: Food & hospitality
[Remember Selected] [Edit] [Skip]
    ↓
Maria clicks [Remember Selected]
    ↓
Facts saved to Content DNA
    ↓
Interview continues...
    ↓
End of Phase 2:
✓ Here's what I learned about your audience:
  - Ideal customer: Local families
  - Main need: Fresh baked goods
  [Edit Any] [Continue →]
    ↓
Interview completes
    ↓
Content DNA saved (24 facts total)
    ↓
AI generates content using Content DNA
```

### Flow 2: Client Reviews and Edits Memories

```
Maria logs in → goes to Profile
    ↓
Sees all Content DNA memories (24 items)
    ↓
Finds outdated fact: "Tone: Formal and professional"
    ↓
Clicks [Edit]
    ↓
Updates to: "Tone: Warm, friendly, approachable"
    ↓
Saves → Content DNA updated
    ↓
Future content uses new tone preference
```

### Flow 3: Agency Adds Operator Note

```
Agency reviews Maria's profile in dashboard
    ↓
Clicks [+ Add Operator Note]
    ↓
Category: [Strategy ▼]
Note: "Push holiday campaign in September — Q4 is busy season"
Priority: [High ○ Medium ⦿ Low]
[Save]
    ↓
Operator note saved (NOT visible to Maria)
    ↓
AI generates content in September
    ↓
System prompt includes:
  "🎯 [Strategy] Push holiday campaign — Q4 is busy season"
    ↓
AI generates holiday-themed content
```

---

## Privacy & Compliance

### GDPR Rights for Clients

**Right to Access:**
- `/c/profile` shows all stored memories
- Export button downloads JSON

**Right to Rectification:**
- Edit button on each memory
- Manual profile updates

**Right to Erasure:**
- Delete individual memories
- "Delete Profile" button (removes all Content DNA)

**Right to Data Portability:**
- Export as JSON
- Future: Export as CSV or PDF

**Right to Object:**
- Client can disable specific memory categories
- E.g., "Don't use my business financials in content"

### Agency Responsibilities

1. **Transparency**: Clients must be informed about what's being collected
2. **Consent**: All Content DNA requires explicit consent
3. **Control**: Clients can edit/delete at any time
4. **Operator notes**: Agency-internal only, not subject to client consent (but documented in privacy policy)

---

## Success Metrics

### Adoption Metrics
- **Consent accept rate**: Target 70%+ (higher than general platform because interview context)
- **Memory edits**: Target 15% of clients edit at least 1 memory
- **Profile views**: Target 40% of clients visit profile page

### Quality Metrics
- **Content DNA completeness**: Target 90%+ of required fields populated
- **Memory accuracy**: Target <5% edit rate due to inaccuracies
- **Client satisfaction**: Target 4.5/5.0 rating for "I feel in control of my data"

### Business Impact
- **Trust increase**: Target +25% client satisfaction vs. no consent
- **Engagement**: Target +20% content approval rate (better Content DNA = better content)
- **Retention**: Target -15% churn (transparency builds trust)

---

## Competitive Advantage

**This system provides Pressmaster with TWO unique moats:**

### Moat 1: Client Memory Consent
- ✅ Transparent content DNA extraction
- ✅ Client control over what's remembered
- ✅ Full CRUD on memories
- ✅ Privacy-first by design

**No competitor has this:**
- Jasper: No interview system
- Copy.ai: No structured profile
- Writesonic: No client consent
- ChatGPT: No memory control for users

### Moat 2: Operator Pinned Notes (Layer 3)
- ✅ Agency adds strategic context
- ✅ Human intelligence + AI automation
- ✅ Context that never gets compressed
- ✅ Invisible to client, visible to AI

**No competitor has this:**
- Pure AI systems: No human-in-the-loop intelligence
- Pure CRM systems: No AI-readable strategic context
- Content platforms: No operator annotation system

---

## Next Steps

1. **Week 1-2**: Extend Phase 1 with consent prompts during interview
2. **Week 3**: Build `/c/profile` viewer with edit/delete
3. **Week 4**: Implement operator notes table and agency UI
4. **Week 5-6**: Content generation transparency ("I used these facts...")
5. **Week 7**: Re-interview flow with memory diffs
6. **Week 8**: GDPR export and deletion tools
7. **Week 9**: Analytics dashboard (consent rates, memory quality)
8. **Week 10**: Launch with beta clients

---

**Related Documents:**
- [Universal Memory Consent System](../ghl_integration_plus_memory/09_UNIVERSAL_MEMORY_CONSENT.md) — Platform-wide consent architecture
- [Memory Engine Design](../platform/MEMORY_ENGINE_DESIGN.md) — 5-layer memory system
- [Phase 1: Interview Engine](./PHASE_1_INTERVIEW_ENGINE.md) — Interview template and guided sessions
- [Phase 3: Content Pipeline](./PHASE_3_CONTENT_PIPELINE.md) — Content DNA and twin learning
