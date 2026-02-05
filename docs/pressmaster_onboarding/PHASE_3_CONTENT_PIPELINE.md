# Phase 3: Content Pipeline

> Interview data becomes Content DNA. Content DNA feeds automated planning, generation, and twin learning. The value loop that keeps clients and agencies retained.

**Depends on:** Phase 1 (Interview Engine), Phase 2 (Client Onboarding)

---

## Goals

- Store interview results as structured Content DNA profiles
- Automate content planning based on Content DNA + trend research
- Generate platform-specific content drafts
- Implement twin learning: each client interaction makes the AI better
- Deliver review queue for client approval

---

## 3.1 Content DNA Storage

### Ontology Object: `type="content_profile"`

The structured output from interviews. One per client sub-org (updated over time).

```typescript
// customProperties shape for content_profile
interface ContentProfile {
  // Identity
  profileVersion: number;
  lastUpdatedFromInterview: number;        // timestamp
  sourceInterviewIds: string[];            // which interviews contributed

  // Voice & Tone
  voice: {
    communicationStyle: string;            // "conversational, direct, witty"
    formalityLevel: "casual" | "professional" | "academic" | "mixed";
    humorPreference: "none" | "subtle" | "frequent";
    avoidWords: string[];                  // words/phrases to never use
    catchphrases: string[];                // signature expressions
    brandInspirations: string[];           // brands they admire
  };

  // Expertise
  expertise: {
    primaryTopics: string[];               // top 3-5 areas
    contraryViews: string[];               // against-the-grain opinions
    frameworks: string[];                  // proprietary frameworks/models
    originStory: string;                   // how they got here
    transformationStories: string[];       // client success stories
  };

  // Audience
  audience: {
    primaryIcp: string;                    // ideal customer description
    secondaryIcp?: string;
    painPoints: string[];
    aspirations: string[];
    preferredChannels: string[];           // LinkedIn, X, Instagram, etc.
    customerJourney: string;               // awareness → consideration → decision
  };

  // Content Preferences
  contentPrefs: {
    preferredFormats: string[];            // long-form, carousel, quote card, etc.
    postingFrequency: string;             // "3x/week", "daily", etc.
    platformPriority: string[];            // ordered list of platforms
    topicsToAvoid: string[];
    contentGoals: string;                  // "thought leadership", "lead gen", etc.
  };

  // Business Context
  business: {
    description: string;
    industry: string;
    stage: string;                         // startup, growth, enterprise
    teamSize?: string;
    revenue?: string;
  };

  // Twin Learning Signals (accumulated over time)
  twinSignals: {
    approvedContentIds: string[];          // content the client approved as-is
    editedContentIds: string[];            // content the client edited
    rejectedContentIds: string[];          // content the client rejected
    editPatterns: EditPattern[];           // extracted patterns from edits
    lastLearningUpdate: number;
  };
}

interface EditPattern {
  patternType: "tone_shift" | "length_change" | "topic_adjustment" | "style_change";
  description: string;                     // "Client consistently shortens intros"
  confidence: number;                      // 0-1, based on frequency
  extractedFrom: string[];                 // content IDs
  createdAt: number;
}
```

### Implementation Tasks

- [ ] Define `content_profile` type in object type registry
- [ ] Create `contentProfileOntology.ts` with operations:
  - [ ] `createContentProfile(orgId, interviewData)` — from interview completion
  - [ ] `getContentProfile(orgId)` — one per sub-org
  - [ ] `updateContentProfile(orgId, updates)` — merge new interview data
  - [ ] `addTwinSignal(orgId, signalType, contentId, editData?)` — learning feedback
  - [ ] `getProfileForPrompt(orgId)` — formatted for injection into agent system prompt
- [ ] Create `mergeInterviewData` helper:
  - [ ] Merges new interview answers into existing profile
  - [ ] Preserves twin learning signals
  - [ ] Increments version number
- [ ] Modify agent system prompt builder to inject Content DNA:
  - [ ] If org has `content_profile`, load and inject as knowledge context
  - [ ] Format as structured instructions: "This client's voice is...", "Their audience is..."

---

## 3.2 Content Calendar

### Ontology Object: `type="content_calendar"`

A 14-day (or configurable) content plan generated from Content DNA + trend research.

```typescript
// customProperties shape for content_calendar
interface ContentCalendar {
  calendarId: string;
  periodStart: number;                     // timestamp
  periodEnd: number;
  status: "generating" | "ready" | "active" | "completed";
  generatedFromProfileVersion: number;

  entries: ContentCalendarEntry[];

  metadata: {
    totalPosts: number;
    platformBreakdown: Record<string, number>;  // { linkedin: 5, x: 4, ... }
    topicBreakdown: Record<string, number>;
  };
}

interface ContentCalendarEntry {
  entryId: string;
  scheduledDate: string;                   // ISO date
  scheduledTime?: string;                  // ISO time (optional)
  platform: string;                        // linkedin, x, instagram, etc.
  topic: string;
  angle: string;                           // specific angle/hook
  contentType: "post" | "carousel" | "thread" | "story" | "article";
  status: "planned" | "drafted" | "in_review" | "approved" | "published" | "rejected";
  draftContentId?: string;                 // link to generated draft
  notes?: string;
}
```

### Implementation Tasks

- [ ] Define `content_calendar` type in object type registry
- [ ] Create `contentCalendarOntology.ts`:
  - [ ] `generateCalendar(orgId, days?)` — AI generates plan from Content DNA
  - [ ] `getActiveCalendar(orgId)`
  - [ ] `updateEntry(calendarId, entryId, updates)`
  - [ ] `listCalendars(orgId, status?)`
- [ ] Create calendar generation prompt:
  - [ ] Input: Content DNA + platform priorities + posting frequency + industry trends
  - [ ] Output: Structured calendar entries with topics, angles, and content types
  - [ ] Respect `topicsToAvoid` and `contentGoals`
- [ ] Create calendar UI component (agency dashboard):
  - [ ] Calendar grid view (week/2-week)
  - [ ] Entry cards with status badges
  - [ ] Click to view/edit entry
  - [ ] Drag to reschedule

---

## 3.3 Content Generation

### Draft Generation Flow

```
Calendar entry (status: "planned")
    ↓
Generation trigger (scheduled or manual)
    ↓
Load Content DNA for client
Load calendar entry (topic, angle, platform, type)
    ↓
Agent generates draft:
  - Platform-specific formatting
  - Voice matching from Content DNA
  - Twin learning signals applied
  - Hashtag/mention suggestions
    ↓
Draft saved as ontology object (type="content_draft")
Calendar entry status → "drafted"
    ↓
Notification sent to client (review queue)
```

### Content Draft Schema

```typescript
// type="content_draft" in objects table
interface ContentDraft {
  calendarEntryId: string;
  platform: string;
  contentType: string;

  // Content
  body: string;                            // main content text
  headline?: string;                       // for articles/carousels
  hashtags: string[];
  mentions: string[];
  callToAction?: string;
  imagePrompt?: string;                    // for Phase 4 image generation

  // Metadata
  status: "draft" | "in_review" | "approved" | "rejected" | "published";
  generatedAt: number;
  generatedByModel: string;
  profileVersionUsed: number;

  // Review
  clientFeedback?: string;
  clientEdits?: {
    originalBody: string;
    editedBody: string;
    editedAt: number;
  };
  approvedAt?: number;
  rejectedAt?: number;
  rejectionReason?: string;
}
```

### Implementation Tasks

- [ ] Define `content_draft` type in object type registry
- [ ] Create `contentDraftOntology.ts`:
  - [ ] `generateDraft(orgId, calendarEntryId)` — AI generates content
  - [ ] `listDrafts(orgId, status?, platform?)`
  - [ ] `getDraft(draftId)`
  - [ ] `submitReview(draftId, action, feedback?, editedBody?)`
  - [ ] `bulkGenerateDrafts(orgId, calendarId)` — generate all planned entries
- [ ] Create generation prompt template:
  - [ ] Per-platform formatting rules (LinkedIn char limits, X thread structure, etc.)
  - [ ] Voice injection from Content DNA
  - [ ] Twin learning signals ("Client prefers shorter intros", "Avoid jargon")
  - [ ] Include topic, angle, content type constraints
- [ ] Credit cost: 2 credits per draft generation (agent_message_complex)

---

## 3.4 Client Review Queue

### Client View (`/c/reviews`)

```
┌─────────────────────────────────────────────┐
│ Content Reviews (3 pending)                  │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ Feb 5, 2026 ────────────────────────┐   │
│ │ LinkedIn Post                         │   │
│ │ Topic: "Why Most Startups Fail at     │   │
│ │         Content Marketing"            │   │
│ │                                       │   │
│ │ "Most startups treat content like     │   │
│ │  a megaphone. But the best ones       │   │
│ │  treat it like a conversation..."     │   │
│ │                                       │   │
│ │ #ContentStrategy #StartupGrowth       │   │
│ │                                       │   │
│ │ [✓ Approve]  [✏️ Edit]  [✗ Reject]   │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌─ Feb 6, 2026 ────────────────────────┐   │
│ │ X Thread (3 posts)                    │   │
│ │ Topic: "3 Lessons from Losing Our     │   │
│ │         Biggest Client"               │   │
│ │ ...                                   │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ [View Calendar →]                           │
└─────────────────────────────────────────────┘
```

### Edit Flow

When client clicks "Edit":
- Inline editor opens with the draft body
- Client modifies text
- On save: `clientEdits` recorded (original + edited)
- Edit diff feeds into twin learning

### Implementation Tasks

- [ ] Create `ClientReviewQueue` component:
  - [ ] List drafts with status "in_review"
  - [ ] Platform icon + content type badge
  - [ ] Full draft preview (expandable)
  - [ ] Approve / Edit / Reject actions
  - [ ] Optional feedback text on reject
- [ ] Create `ClientDraftEditor` component:
  - [ ] Inline text editing
  - [ ] Character count (per-platform limits)
  - [ ] Preview toggle (how it'll look on platform)
  - [ ] Save edits → auto-approve
- [ ] Create review notification system:
  - [ ] Push notification when new drafts ready (Pushover or email)
  - [ ] In-app badge count on "Reviews" tab
  - [ ] Reminder if unreviewed after 24h

---

## 3.5 Twin Learning

### Concept

The "Twin" doesn't fine-tune a model. It accumulates structured signals from client behavior and injects them as context. The more signals, the more accurate the generation.

### Signal Collection

| Signal | Source | Extracted Pattern |
|---|---|---|
| Client approves draft as-is | Review queue | "Voice match was strong — keep this style" |
| Client edits draft | Review queue | Diff analysis → tone shift, length change, style adjustment |
| Client rejects draft | Review queue | Reason categorization → topic mismatch, voice mismatch, etc. |
| Client answers follow-up interview | Interview session | Updated Content DNA fields |
| Client engagement data (future) | Analytics integration | Which approved content performed best |

### Edit Pattern Extraction

When a client edits a draft, run a lightweight analysis:

```
Original: "In the fast-paced world of SaaS, growth is everything."
Edited:   "Growth isn't everything in SaaS. Here's what matters more."

Extracted patterns:
  - tone_shift: "Client prefers contrarian openings over conventional"
  - style_change: "Client reverses expected narrative structure"
  - length_change: "Client shortens by ~20%"
```

These patterns are stored in `contentProfile.twinSignals.editPatterns` and injected into future generation prompts.

### Prompt Injection

```
// Added to content generation system prompt when twin signals exist:

"TWIN LEARNING SIGNALS (accumulated from {N} reviews):
- Voice accuracy: {approved}/{total} drafts approved without edits
- Known preferences:
  {editPatterns.map(p => `- ${p.description} (confidence: ${p.confidence})`)}
- Topics to lean into: {frequently approved topics}
- Topics to avoid: {frequently rejected topics}
- Style notes: {aggregated style observations}"
```

### Implementation Tasks

- [ ] Create `twinLearning.ts` module:
  - [ ] `recordApproval(orgId, draftId)` — log approved content
  - [ ] `recordEdit(orgId, draftId, original, edited)` — analyze + extract patterns
  - [ ] `recordRejection(orgId, draftId, reason)` — categorize rejection
  - [ ] `extractEditPatterns(original, edited)` — LLM-powered diff analysis
  - [ ] `getTwinContext(orgId)` — formatted signals for prompt injection
- [ ] Modify content generation prompt to include twin signals
- [ ] Create twin learning dashboard (agency view):
  - [ ] Approval rate over time
  - [ ] Common edit patterns
  - [ ] Voice accuracy score
  - [ ] "Twin maturity" indicator (based on signal count)
- [ ] Schedule periodic pattern consolidation:
  - [ ] Every 10 reviews, re-analyze all edit patterns
  - [ ] Merge similar patterns, increase confidence scores
  - [ ] Prune low-confidence patterns
- [ ] Credit cost: `extractEditPatterns` = 1 credit (lightweight LLM call)

---

## 3.6 Layers Integration — Automation Triggers

### New Trigger Node: "Interview Complete"

Add to the Layers node registry:

```typescript
{
  type: "trigger_interview_complete",
  name: "Interview Completed",
  category: "trigger",
  description: "Fires when a client completes an interview session",
  outputs: [{ id: "out", label: "Content DNA" }],
  configFields: [
    { name: "templateFilter", type: "select", label: "Template", options: "dynamic" }
  ]
}
```

### Pre-Built Workflow: "Interview → Content Pipeline"

A default Layers workflow template agencies can activate:

```
[Interview Complete] → [Generate Calendar] → [Wait 1h] → [Generate Drafts] → [Notify Client]
         ↓                                                        ↓
   Content DNA loaded                                    Per-entry generation
```

### Implementation Tasks

- [ ] Add `trigger_interview_complete` to node registry
- [ ] Add `trigger_content_approved` to node registry (fires when client approves draft)
- [ ] Create LC native node: `lc_generate_calendar` (wraps calendar generation)
- [ ] Create LC native node: `lc_generate_draft` (wraps draft generation)
- [ ] Create LC native node: `lc_notify_client` (sends review notification)
- [ ] Create default workflow template ("Content Pipeline")
- [ ] Wire interview completion to fire Layers trigger event

---

## Success Criteria

- [ ] Interview completion creates/updates Content DNA profile
- [ ] Content DNA is injected into agent system prompts for the client's org
- [ ] 14-day content calendar can be generated from Content DNA
- [ ] Individual content drafts generated per calendar entry
- [ ] Drafts respect platform formatting and Content DNA voice
- [ ] Client can approve, edit, or reject drafts
- [ ] Client edits feed back into twin learning
- [ ] Twin signals improve generation accuracy over time
- [ ] Layers workflow automates the full pipeline (interview → calendar → drafts → notify)
- [ ] Credits properly deducted for all AI operations

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `convex/contentProfileOntology.ts` | **Create** | Content DNA CRUD |
| `convex/contentCalendarOntology.ts` | **Create** | Calendar generation + management |
| `convex/contentDraftOntology.ts` | **Create** | Draft generation + review actions |
| `convex/ai/twinLearning.ts` | **Create** | Signal collection + pattern extraction |
| `convex/ai/agentExecution.ts` | **Modify** | Inject Content DNA into system prompts |
| `convex/layers/nodeRegistry.ts` | **Modify** | Add interview/content trigger + action nodes |
| `src/app/c/reviews/page.tsx` | **Modify** | Implement review queue (stub from Phase 2) |
| `src/components/client/review-queue.tsx` | **Create** | Review list + approve/edit/reject UI |
| `src/components/client/draft-editor.tsx` | **Create** | Inline content editor |
| `src/components/agency/content-calendar.tsx` | **Create** | Calendar grid view |
| `src/components/agency/twin-dashboard.tsx` | **Create** | Twin learning metrics |
