# White-Label Customer Onboarding — Master Spec

> Turn the PressMaster interview concept into a white-label onboarding engine that agencies run with their clients. Voice-first, async, trainable.

---

## Vision

Agencies invite their clients into a branded onboarding flow. An AI interviewer extracts the client's expertise, voice, and audience — building a "Content DNA" profile. That profile feeds automated content planning, generation, and review. Each session makes the AI twin smarter. The agency sees everything from their dashboard; the client sees a simple mobile-first experience.

---

## System Map — What Exists vs. What's New

| Capability | Status | Location |
|---|---|---|
| Multi-tenant org hierarchy (parent/child) | **Exists** | `convex/api/v1/subOrganizations.ts` |
| Per-org AI agents with autonomy levels | **Exists** | `convex/agentOntology.ts`, `convex/ai/agentExecution.ts` |
| Agent sessions + message history | **Exists** | `convex/ai/agentSessions.ts`, `convex/schemas/agentSessionSchemas.ts` |
| 40+ agent tools with credit gating | **Exists** | `convex/ai/tools/` |
| Human-in-the-loop approval system | **Exists** | `convex/ai/agentApprovals.ts` |
| Multi-channel delivery (WhatsApp, SMS, email, webchat) | **Exists** | `convex/channels/` |
| Builder 3-step onboarding (Prototype → Connect → Publish) | **Exists** | `src/components/builder/` |
| Layers DAG automation engine (87 nodes) | **Exists** | `convex/layers/`, `src/app/layers/` |
| Skills-based AI composition (9 skills) | **Exists** | `convex/ai/skills/`, `convex/ai/systemKnowledge/` |
| Credit system with parent-org fallback | **Exists** | `convex/credits/` |
| RBAC (5 roles, audit trail) | **Exists** | `convex/rbacHelpers.ts` |
| White-label tiers (badge → full → API domain) | **Exists** | `convex/licensing/tierConfigs.ts` |
| Frontend user OAuth (Google, Apple, Microsoft) | **Exists** | `convex/auth.ts` |
| **Interview template system** | **NEW** | Phase 1 |
| **Guided session mode (scripted agent)** | **NEW** | Phase 1 |
| **Client invite + scoped auth** | **NEW** | Phase 2 |
| **Content DNA profile storage** | **NEW** | Phase 3 |
| **Twin learning feedback loop** | **NEW** | Phase 3 |
| **Voice-to-text input (SuperWhisper)** | **NEW** | Phase 4 |
| **Client mobile experience** | **NEW** | Phase 4 |
| **Prompt-generated onboarding flows** | **NEW** | Phase 5 |

---

## Phase Overview

| Phase | Name | Dependencies | Summary |
|---|---|---|---|
| **1** | Interview Engine | Agent sessions, ontology | Interview templates + guided session runner |
| **2** | Client Onboarding | Phase 1, sub-orgs, auth | Invite flow, client auth, scoped views |
| **3** | Content Pipeline | Phase 1+2, Layers, knowledge base | Content DNA, planning, generation, twin learning |
| **4** | Mobile & Voice | Phase 2+3, mobile app | Voice input, mobile interview UI, review queue |
| **5** | White-Label & Scale | Phase 1-4, Builder skills | Agency branding, prompt-generated flows, marketplace |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    AGENCY DASHBOARD                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Template  │  │ Client   │  │ Content  │  │ Credits │ │
│  │ Designer  │  │ Manager  │  │ Calendar │  │ & Billing│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────┘ │
└───────┼──────────────┼──────────────┼───────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                    PLATFORM CORE                         │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Interview   │  │ Agent       │  │ Layers           │ │
│  │ Engine      │  │ Execution   │  │ Automation       │ │
│  │ (NEW)       │  │ Pipeline    │  │ Engine           │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                    │          │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌────────▼────────┐ │
│  │ Content DNA │  │ Twin        │  │ Content          │ │
│  │ Profiles    │  │ Learning    │  │ Calendar         │ │
│  │ (NEW)       │  │ (NEW)       │  │ (NEW)            │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Sub-Orgs    │  │ Credits     │  │ Channels         │ │
│  │ & RBAC      │  │ System      │  │ (Multi)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│               CLIENT MOBILE EXPERIENCE                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Interview │  │ Voice    │  │ Review   │  │ Profile │ │
│  │ Sessions  │  │ Input    │  │ Queue    │  │ & Twin  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow — End to End

```
Agency creates interview template
    ↓
Agency invites client (branded link)
    ↓
Client signs up → frontend_user → sub-org member
    ↓
Interview session starts (guided mode)
    ↓
AI asks questions (text cards) → Client speaks (voice transcription) → text submitted
    ↓
Agent processes answers, asks follow-ups, branches as needed
    ↓
Interview completes → Content DNA saved to ontology
    ↓
Layers workflow triggers → research agents scan trends
    ↓
14-day content calendar generated
    ↓
Agent drafts posts using Content DNA + calendar
    ↓
Drafts appear in client review queue (mobile)
    ↓
Client approves / edits / rejects
    ↓
Edits stored as Twin learning signal → agent improves
    ↓
Approved posts scheduled → multi-platform publish
    ↓
Agency monitors everything from dashboard
```

---

## Key Design Decisions

### 1. Voice Input = Async Transcription, Not Live Conversation
The AI asks questions as text cards. The client records voice. Transcription happens client-side (SuperWhisper) or via Whisper API. Transcribed text is submitted as a normal message. This gives the client control, avoids real-time latency issues, and keeps the backend pipeline unchanged.

### 2. Interview = Guided Agent Session (Not a Separate System)
An interview is an agent session with a template attached. The existing `agentExecution.ts` pipeline handles it — we add a `sessionMode: "guided"` flag and a `templateId` reference. The template controls which questions to ask and in what order. The agent still has all its tools and knowledge.

### 3. Content DNA = Ontology Object (Not a Separate Table)
Stored as `type="content_profile"` in the objects table. Linked to the sub-org. Injected into agent system prompts as org-level knowledge. Follows the same pattern as every other object type.

### 4. Twin Learning = Prompt Enrichment (Not Model Fine-Tuning)
We don't fine-tune models. Instead, we store client feedback (edits, preferences, rejections) and inject the most relevant signals into the agent's system prompt. The "twin" gets smarter by having more context, not by changing model weights.

### 5. Credits Flow from Agency to Client
Sub-orgs already inherit the parent's plan and can draw from the parent's credit pool. No new billing infrastructure needed. Agencies manage their total budget; the platform tracks per-client consumption.

---

## File Index

| Document | Purpose |
|---|---|
| `SPEC.md` (this file) | Master spec, architecture, decisions |
| `PHASE_1_INTERVIEW_ENGINE.md` | Interview template schema + guided session mode |
| `PHASE_2_CLIENT_ONBOARDING.md` | Invite flow, client auth, scoped views |
| `PHASE_3_CONTENT_PIPELINE.md` | Content DNA, planning, generation, twin learning |
| `PHASE_4_MOBILE_VOICE.md` | Mobile app UI, voice input, review queue |
| `PHASE_5_WHITE_LABEL.md` | Agency branding, prompt-generated flows, marketplace |
| `MEMORY_CONSENT_INTEGRATION.md` | Universal memory consent for Content DNA extraction |

---

## References

- PressMaster onboarding screenshots: `step_1.PNG` through `step_6.PNG` (this folder)
- Agent execution: `convex/ai/agentExecution.ts`
- Agent sessions: `convex/ai/agentSessions.ts`, `convex/schemas/agentSessionSchemas.ts`
- Agent ontology: `convex/agentOntology.ts`
- Layers engine: `convex/layers/graphEngine.ts`
- Builder system: `src/components/builder/`
- Sub-organizations: `convex/api/v1/subOrganizations.ts`
- Credits: `convex/credits/`
- Channels: `convex/channels/`
- Licensing tiers: `convex/licensing/tierConfigs.ts`
