# Phase 1: Interview Engine

> The foundation. Interview templates define the script; guided session mode runs it through the existing agent pipeline.

---

## Goals

- Define a reusable interview template format that agencies can create and customize
- Extend the agent session system to support guided (scripted) conversations
- Store interview results as structured data for downstream use
- Keep the existing agent execution pipeline unchanged — add a mode, not a fork

---

## 1.1 Interview Template Schema

### Ontology Object: `type="interview_template"`

Stored in the `objects` table following existing ontology patterns.

```typescript
// customProperties shape for interview_template
interface InterviewTemplate {
  // Identity
  templateName: string;
  description: string;
  version: number;
  status: "draft" | "active" | "archived";

  // Configuration
  estimatedMinutes: number;          // e.g., 15 for quick, 45 for deep
  mode: "quick" | "standard" | "deep_discovery";
  language: string;                  // default language (e.g., "en")
  additionalLanguages?: string[];    // multi-language support

  // Interview Structure
  phases: InterviewPhase[];

  // Output Configuration
  outputSchema: ContentDNASchema;    // defines what structured data to extract
  completionCriteria: {
    minPhasesCompleted: number;      // minimum phases before allowing completion
    requiredPhaseIds: string[];      // phases that cannot be skipped
  };

  // Agent Behavior
  interviewerPersonality: string;    // e.g., "Warm, curious, professional"
  followUpDepth: 1 | 2 | 3;         // how many follow-ups per question
  silenceHandling: string;           // what to say if user goes quiet
}

interface InterviewPhase {
  phaseId: string;                   // e.g., "brand_voice"
  phaseName: string;                 // e.g., "Brand Voice Discovery"
  order: number;
  isRequired: boolean;
  estimatedMinutes: number;

  // Questions
  questions: InterviewQuestion[];

  // Branching
  skipCondition?: {
    field: string;                   // reference to a previous answer field
    operator: "equals" | "contains" | "not_empty" | "empty";
    value?: string;
  };

  // Phase completion
  completionPrompt: string;         // what to say when phase is done
}

interface InterviewQuestion {
  questionId: string;
  promptText: string;               // the question the AI asks
  helpText?: string;                // optional clarification shown to client
  expectedDataType: "text" | "list" | "choice" | "rating" | "freeform";
  extractionField: string;          // where to store the answer in Content DNA
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    options?: string[];             // for choice type
    required?: boolean;
  };

  // Follow-up logic
  followUpPrompts?: string[];       // AI uses these if answer is too brief
  branchOnAnswer?: {
    condition: string;
    skipToQuestionId?: string;
    skipToPhaseId?: string;
  };
}

interface ContentDNASchema {
  fields: {
    fieldId: string;
    fieldName: string;
    dataType: "string" | "string[]" | "number" | "boolean" | "object";
    category: "voice" | "expertise" | "audience" | "content_prefs" | "brand" | "goals";
    required: boolean;
  }[];
}
```

### Implementation Tasks

- [ ] Define `interview_template` type in object type registry
- [ ] Create `interviewTemplateOntology.ts` with CRUD operations (following `layerWorkflowOntology.ts` pattern)
  - [ ] `createTemplate(name, description, mode)`
  - [ ] `updateTemplate(templateId, phases, outputSchema, completionCriteria)`
  - [ ] `listTemplates(status?)` — org-scoped
  - [ ] `getTemplate(templateId)`
  - [ ] `cloneTemplate(sourceId, newName)` — for agency customization
  - [ ] `archiveTemplate(templateId)`
- [ ] Add default templates (seed data):
  - [ ] "Content Creator Onboarding" (quick, 15 min, 3 phases)
  - [ ] "Agency Client Deep Discovery" (deep, 45 min, 6 phases)
  - [ ] "Brand Voice Extraction" (standard, 25 min, 4 phases)
- [ ] Write unit tests for template validation (phase ordering, required field coverage, branch target validation)

---

## 1.2 Guided Session Mode

### Concept

A guided session is a normal agent session with two additions:
1. A `templateId` reference on the session
2. A `sessionMode: "guided"` flag that tells the execution pipeline to inject template context

The agent execution pipeline (`agentExecution.ts`) already builds a multi-layered system prompt. For guided mode, we add the interview template as an additional context layer.

### Session Schema Extension

```typescript
// Extension to agentSessions table
{
  // ...existing fields...
  sessionMode: "freeform" | "guided";          // NEW — default "freeform"
  interviewTemplateId?: Id<"objects">;          // NEW — reference to template
  interviewState?: {                            // NEW — tracks progress
    currentPhaseIndex: number;
    currentQuestionIndex: number;
    completedPhases: string[];
    skippedPhases: string[];
    extractedData: Record<string, unknown>;     // partial Content DNA
    startedAt: number;
    lastActivityAt: number;
  };
}
```

### Agent Execution Changes

In `processInboundMessage` (agentExecution.ts), add after system prompt assembly:

```
IF session.sessionMode === "guided" AND session.interviewTemplateId:
  1. Load interview template
  2. Get current phase + question from interviewState
  3. Inject into system prompt:
     - "You are conducting a structured interview."
     - "Current phase: {phaseName} ({phaseIndex}/{totalPhases})"
     - "Current question: {promptText}"
     - "Expected data type: {expectedDataType}"
     - "Follow-up prompts if answer is brief: {followUpPrompts}"
     - "When this question is answered, extract to field: {extractionField}"
     - "Remaining questions in this phase: {count}"
  4. Append extraction instruction:
     - "After processing the user's response, return a JSON block with extracted fields"
  5. After LLM response:
     - Parse extraction JSON from response
     - Update interviewState.extractedData
     - Advance currentQuestionIndex (or currentPhaseIndex)
     - Check skipConditions for next phase
     - Check completionCriteria
     - If complete: trigger completion flow
```

### Interview Lifecycle

```
startInterview(sessionId, templateId)
    ↓
interviewState initialized (phase 0, question 0)
    ↓
Each message cycle:
  ├─ User answers (text or transcribed voice)
  ├─ Agent processes + extracts structured data
  ├─ interviewState advances
  ├─ Skip conditions evaluated
  └─ Next question injected
    ↓
completionCriteria met
    ↓
saveContentDNA(sessionId, extractedData)
    ↓
triggerPostInterviewWorkflow(orgId, contentDNAId)
```

### Implementation Tasks

- [ ] Add `sessionMode`, `interviewTemplateId`, `interviewState` fields to `agentSessions` schema
- [ ] Create `startInterview` mutation:
  - [ ] Validates template exists and is active
  - [ ] Creates or reuses session with `sessionMode: "guided"`
  - [ ] Initializes `interviewState`
  - [ ] Sends opening message (template's first phase intro)
- [ ] Modify `processInboundMessage` in `agentExecution.ts`:
  - [ ] Detect guided mode
  - [ ] Load template + current state
  - [ ] Inject interview context into system prompt
  - [ ] Parse extraction data from LLM response
  - [ ] Update `interviewState` after each exchange
  - [ ] Handle phase transitions (skip conditions, completion)
- [ ] Create `advanceInterview` internal mutation:
  - [ ] Advance question/phase indices
  - [ ] Evaluate skip conditions
  - [ ] Merge extracted data
  - [ ] Check completion criteria
- [ ] Create `completeInterview` internal mutation:
  - [ ] Save final Content DNA object (Phase 3 storage)
  - [ ] Mark session as completed
  - [ ] Fire completion trigger (Phase 3 Layers integration)
- [ ] Create `getInterviewProgress` query:
  - [ ] Returns current phase, question, completion percentage
  - [ ] Used by both agency dashboard and client UI
- [ ] Add interview-specific agent tools:
  - [ ] `skip_phase` — agent can suggest skipping if answers cover it
  - [ ] `request_clarification` — structured follow-up
  - [ ] `mark_phase_complete` — explicit phase transition
- [ ] Write integration tests:
  - [ ] Full interview flow (start → answer all → complete)
  - [ ] Phase skipping via conditions
  - [ ] Follow-up trigger on brief answers
  - [ ] Partial completion (resume later)
  - [ ] Credit deduction during interview

---

## 1.3 Interview Template Designer (Agency UI)

### Concept

Agencies need a way to create and edit interview templates. This can live in the existing Builder or as a standalone view.

### Minimum Viable UI

A form-based editor (not a visual canvas — interviews are linear enough):

```
┌─────────────────────────────────────────────┐
│ Interview Template: "Client Onboarding"     │
│ Mode: [Standard ▼]  Est: [25] min           │
├─────────────────────────────────────────────┤
│ Phase 1: Brand Voice Discovery    [Required] │
│ ┌─────────────────────────────────────────┐ │
│ │ Q1: "Tell me about your business..."    │ │
│ │     Type: [freeform ▼]  Field: [bio]    │ │
│ │     Follow-ups: "Can you elaborate..."  │ │
│ ├─────────────────────────────────────────┤ │
│ │ Q2: "Who is your ideal customer?"       │ │
│ │     Type: [freeform ▼]  Field: [icp]    │ │
│ ├─────────────────────────────────────────┤ │
│ │ [+ Add Question]                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Phase 2: Expertise Areas          [Optional] │
│ ┌─────────────────────────────────────────┐ │
│ │ Skip if: bio.length > 500              │ │
│ │ Q1: "What topics are you an expert in?" │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [+ Add Phase]                               │
│                                             │
│ Output Fields:                              │
│ ┌─────────────────────────────────────────┐ │
│ │ bio (string, voice) ✓ required          │ │
│ │ icp (string, audience) ✓ required       │ │
│ │ topics (string[], expertise)            │ │
│ │ tone (string, voice)                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Save Draft]  [Activate]  [Preview]         │
└─────────────────────────────────────────────┘
```

### Implementation Tasks

- [ ] Create `InterviewTemplateDesigner` component
  - [ ] Phase list with drag-to-reorder
  - [ ] Question editor per phase (prompt, type, field, follow-ups)
  - [ ] Skip condition builder (simple field + operator + value)
  - [ ] Output schema viewer (auto-generated from question fields)
  - [ ] Completion criteria config
- [ ] Add "Interview Templates" section to agency dashboard
  - [ ] List view with status badges (draft, active, archived)
  - [ ] Create / Edit / Clone / Archive actions
- [ ] Preview mode: simulate interview in chat panel
  - [ ] Uses existing `BuilderChatPanel` pattern
  - [ ] Agent runs in `draft_only` autonomy (no real writes)
  - [ ] Shows extraction results in side panel

---

## 1.4 Default Interview Templates

Three seed templates to ship with Phase 1. These cover the PressMaster onboarding steps 1 + 3.

### Template A: "Quick Brand Voice" (15 min, 3 phases)

| Phase | Questions | Extracts |
|---|---|---|
| **1. Who You Are** | Business description, Role/title, Years of experience | `bio`, `role`, `experience` |
| **2. Your Audience** | Ideal customer description, Their biggest pain point, Where they hang out online | `icp`, `painPoints`, `channels` |
| **3. Your Voice** | Describe your communication style, Words you never use, Brands you admire | `tone`, `avoidWords`, `brandInspo` |

### Template B: "Agency Client Discovery" (45 min, 6 phases)

| Phase | Questions | Extracts |
|---|---|---|
| **1. Business Context** | Business model, Revenue streams, Team size, Growth stage | `businessModel`, `revenue`, `teamSize`, `stage` |
| **2. Brand Identity** | Mission statement, Core values, Brand personality, Visual identity description | `mission`, `values`, `personality`, `visualIdentity` |
| **3. Target Audience** | Primary ICP, Secondary ICP, Customer journey stages, Objections they face | `primaryIcp`, `secondaryIcp`, `journey`, `objections` |
| **4. Content Strategy** | Current content efforts, What's worked before, Topics they own, Competitor content they admire | `currentEfforts`, `successStories`, `ownedTopics`, `competitorInspo` |
| **5. Voice & Tone** | Communication style, Formality level, Humor preference, Controversial takes | `style`, `formality`, `humor`, `hotTakes` |
| **6. Goals & Constraints** | 90-day goals, Content frequency, Platforms to focus on, Topics to avoid | `goals90d`, `frequency`, `platforms`, `avoidTopics` |

### Template C: "Thought Leader Extraction" (25 min, 4 phases)

| Phase | Questions | Extracts |
|---|---|---|
| **1. Expertise** | Top 3 topics you can speak on for hours, Your unique take vs. mainstream, Frameworks you've developed | `expertTopics`, `contrarian`, `frameworks` |
| **2. Stories** | Origin story, Biggest professional failure, Client transformation story | `originStory`, `failureStory`, `transformationStory` |
| **3. Opinions** | Industry trends you disagree with, Predictions for next 2 years, Advice you'd give your younger self | `disagreements`, `predictions`, `advice` |
| **4. Style** | How you'd explain your work to a 10-year-old, Your catchphrases, Preferred post length | `simpleExplanation`, `catchphrases`, `postLength` |

### Implementation Tasks

- [ ] Create seed template JSON for Template A (Quick Brand Voice)
- [ ] Create seed template JSON for Template B (Agency Client Discovery)
- [ ] Create seed template JSON for Template C (Thought Leader Extraction)
- [ ] Write migration/seed script to insert default templates per org on first access
- [ ] Write tests validating seed templates against schema

---

## Success Criteria

- [ ] Agency can create, edit, and activate an interview template
- [ ] Client can start an interview session and answer questions
- [ ] Agent follows template structure (phases, questions, ordering)
- [ ] Agent extracts structured data from answers into interviewState
- [ ] Phase skip conditions work correctly
- [ ] Interview can be paused and resumed (session persists)
- [ ] Completion criteria triggers end-of-interview flow
- [ ] Interview progress is queryable (percentage, current phase)
- [ ] Credits deducted correctly during interview (from parent org pool)
- [ ] Three default templates available out of the box

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `convex/schemas/interviewSchemas.ts` | **Create** | Interview template + session state types |
| `convex/interviewTemplateOntology.ts` | **Create** | CRUD for interview templates |
| `convex/ai/interviewRunner.ts` | **Create** | Guided session logic (advance, extract, complete) |
| `convex/ai/agentExecution.ts` | **Modify** | Add guided mode detection + template injection |
| `convex/schemas/agentSessionSchemas.ts` | **Modify** | Add sessionMode, templateId, interviewState fields |
| `convex/schema.ts` | **Modify** | Register new fields if needed |
| `src/components/interview/template-designer.tsx` | **Create** | Agency-facing template editor |
| `src/components/interview/interview-progress.tsx` | **Create** | Progress indicator component |
| `convex/ai/tools/interviewTools.ts` | **Create** | skip_phase, mark_phase_complete tools |
| `convex/seeds/interviewTemplates.ts` | **Create** | Default template seed data |
