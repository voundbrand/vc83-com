# PRD: "Your AI" — One Agent, One Soul, Always There

**Version:** 1.3
**Date:** 2026-02-23
**Author:** Strategy + Product
**Status:** Draft

> **Scope:** This PRD covers the strategic pivot from "Dream Team thrown at you on day one" to "One primary AI agent per user, with the Dream Team as soul-powered specialists you discover progressively." It spans nine interconnected systems:
> - **Sections 1-4:** Problem statement, goals, non-goals, current state
> - **Sections 5-6:** One Agent architecture + Privacy Mode (local inference)
> - **Section 6B:** Soul Modes (Work/Private) + Internal Archetypes
> - **Section 6C:** Voice Runtime + Latency Architecture
> - **Section 6D:** The Birthing Process (Agent Onboarding)
> - **Section 6E:** Emergent Team — From One Agent to Many
> - **Section 6F:** Dream Team — Soul-Powered Specialists (NOT knowledge base)
> - **Section 6G:** Personal + Business Organizations (Multi-Org Architecture)
> - **Sections 7-8:** macOS desktop app + system-level companion
> - **Sections 9-10:** Multi-model adapter layer + quality firewall
> - **Sections 11-12:** Autonomy progression (supervised → sandbox → autonomous → delegation)
> - **Section 13:** Code execution tool (Builder pattern)
> - **Sections 14-18:** Chat-first engagement, acceptance criteria, risks, implementation sequence, narrative

---

## 1. Problem Statement

### The Dream Team Was Right Architecturally, Wrong Experientially

The Dream Team GTM (`docs/strategy/AGENTIC_DREAM_TEAM_GTM.md`) defined a compelling product: 4-6 expert-modeled AI agents (The Strategist, The Closer, The Wordsmith, The Operator, The Advisor) coordinated by a PM agent, deployed across channels.

The architecture works. The team orchestration (`convex/ai/teamHarness.ts`), soul binding (`convex/ai/soulGenerator.ts`), and multi-channel deployment (`convex/channels/router.ts`) are production-ready.

But the user experience creates three problems:

1. **Fragmented relationship.** The user must learn to interact with 5 separate personalities. They must remember which agent handles what. This is the opposite of the "center of gravity" effect that drives daily usage. As OpenAI's Codex product lead stated: *"I don't think you want 12 agents at the company and your employees have to go figure out the right one to talk to because then they won't achieve fluency."*

2. **Preconfigured personas create distance.** "The Closer trained on Chris Voss" sounds impressive in a pitch deck but creates emotional distance. The user doesn't bond with a facsimile of someone else's thinking. They bond with an AI that knows THEM — their business, their voice, their values, their decisions.

3. **Daily usage friction.** Every sci-fi depiction of human-AI partnership shows ONE relationship (Her, Jarvis, HAL, Samantha). Nobody in fiction talks to five separate AIs. The "one relationship, one conversation" model is more natural, more sticky, and creates the muscle memory that leads to the 10,000+ daily interactions that Alex Bericos (OpenAI) describes as the goal.

### The "Her" Model

The user should have ONE AI agent:
- Born from a discovery interview that captures their identity, expertise, values, and communication style.
- Available on their daily channels (Telegram, WhatsApp, Slack, email) and as a native macOS companion.
- Backed by a Dream Team of soul-powered specialist agents (The Closer, Strategist, Copywriter, Operator, CFO, Coach) that work invisibly by default but can be talked to directly or convened in team meetings.
- Able to DO things — CRM, booking, email, workflows, data queries — not just chat.
- Evolving through daily use, with soul drift correction and self-improvement proposals.
- Offering privacy mode for sensitive conversations via local model inference.
- Progressively gaining autonomy as trust is established (supervised → sandbox → autonomous → delegation).

### The Competitive Landscape Demands This

- **ChatGPT:** Stateless. Generic. No soul. No memory across sessions. No business tool access. No multi-channel presence.
- **Claude:** Same limitations. Better reasoning, no persistence.
- **Codex/Claude Code:** Developer-focused coding agents. Not business operations.
- **GoHighLevel:** CRM with basic chatbots bolted on. Not AI-first. Not European.

Nobody offers: **a persistent, soul-bound, multi-channel AI companion that knows your business, does real work, and gets better every week — with privacy mode for sensitive conversations.**

---

## 2. Goals

1. **One primary agent per user/org.** The default interaction is with a single named AI agent whose soul is born from the user's own identity, not a preconfigured expert template.
2. **Dream Team as soul-powered specialists (not knowledge base).** The Closer, Strategist, Copywriter, Operator, CFO, and Coach are NOT reduced to knowledge documents. They are full soul-bound agents with their own personality blends, system prompts, and coaching protocols (`docs/prd/souls/`). They work invisibly behind the primary agent by default, but users can CHOOSE to talk to them directly, hold team meetings, or deploy them independently. The Dream Team is an advanced capability, not the default — but it's real, not flattened.
3. **Chat-first daily usage.** Telegram, WhatsApp, and Slack are the primary interaction surfaces. The agent is where the user already lives.
4. **macOS native companion.** A Swift menu bar app with system-level access (TCC permissions, LaunchAgent persistence, screen awareness, voice interaction) provides the "deeper work" layer.
5. **Privacy mode.** Users can switch to local model inference (Ollama, llama.cpp, LM Studio) for sensitive conversations. No data leaves their machine.
6. **Multi-model quality firewall.** Users can switch cloud models (OpenAI, Anthropic, Gemini, Mistral) or plug in private models. Drift scoring ensures soul fidelity regardless of model.
7. **Autonomy progression.** From supervised (agent drafts, human approves) through sandbox, autonomous, to full delegation — gated by trust accumulation.
8. **Code execution as a tool.** The agent can write and execute small programs in a sandbox to handle tasks no pre-built tool covers.

---

## 3. Non-Goals

1. ~~Removing the multi-agent team orchestration from the platform.~~ **REVISED:** The Dream Team agents (Closer, Strategist, Copywriter, Operator, CFO, Coach) are fully preserved as soul-bound specialists with their own personality blends, frameworks, and coaching protocols. They are NOT reduced to knowledge base documents. They remain available as: (a) invisible internal specialists that the primary agent consults behind the scenes, (b) directly addressable agents the user can talk to ("let me talk to the Closer"), and (c) team meeting participants the user can convene.
2. Building a custom LLM or fine-tuning models. We use foundation models via API.
3. Building a web browser (OpenAI's Atlas approach). We meet users on their existing computer.
4. Windows or Linux desktop app in v1. macOS first, cross-platform later.
5. Real-time screen recording or continuous monitoring. The macOS app provides context when the user explicitly invokes it, not passive surveillance.
6. Replacing the existing web dashboard. The desktop app supplements; the web UI remains the agency management and deep configuration surface.
7. Voice-first interaction in v1. Voice is a Phase 2 enhancement for the desktop app.

---

## 4. Current State (Codebase Anchors)

### 4.1 Soul Binding System

**File:** `convex/ai/soulGenerator.ts`

Already supports:
- Self-generation from business context (org name, industry, FAQs, knowledge base).
- `attachSoulV2Overlay()` — structured soul with identity anchors, execution preferences, core memories.
- Identity anchors: `name`, `tagline`, `traits`, `coreValues`, `neverDo`, `escalationTriggers`, `coreMemories`.
- Execution preferences: `communicationStyle`, `toneGuidelines`, `greetingStyle`, `closingStyle`, `emojiUsage`.
- Version tracking: soul schema v2 with `generatedBy: "agent_self"`.

**File:** `convex/ai/soulEvolution.ts` (90KB)

Already supports:
- Proposal lifecycle: observe → reflect → propose → approve → apply.
- Drift scoring on 4 dimensions (identity, scope, boundary, performance).
- Version history with immutable audit trail.
- Weekly scheduled reflection via cron.

**File:** `convex/ai/selfImprovement.ts`

Already supports:
- Daily reflection loop.
- Drift detection with alignment proposals.
- Trust event logging for every soul decision.

### 4.2 Agent Harness

**File:** `convex/ai/harness.ts`

Already supports:
- Self-awareness context builder: model, tools, channels, session stats, soul/personality.
- 4-layer hierarchy: Platform (L1) → Agency (L2) → Client (L3) → End-Customer (L4).
- Autonomy levels: `"supervised" | "autonomous" | "draft_only"`.
- Channel bindings, knowledge base tags, FAQ entries.

### 4.3 Team Orchestration (Becomes Internal Routing)

**File:** `convex/ai/teamHarness.ts`

Already supports:
- Tag-in specialist pattern (PM delegates to specialist, same conversation).
- Max 5 handoffs/session, 2-min cooldown, context transfer, history tracking.

**File:** `convex/ai/tools/teamTools.ts`

Already supports:
- `list_team_agents` — PM sees all available specialists.
- Handoff with context transfer.

**Adaptation needed:** The team harness supports three access modes: (1) invisible internal routing where the primary agent consults specialists behind the scenes, (2) direct access where the user talks to a specialist ("let me talk to the Closer"), and (3) team meetings where multiple specialists weigh in. The harness already supports all of this — it just needs a mode flag and UX layer. See Section 6F for full specification.

### 4.4 Multi-Channel Deployment

**File:** `convex/channels/router.ts` (48KB)

Already supports 9 channel types:
- `whatsapp`, `sms`, `email`, `instagram`, `facebook_messenger`, `webchat`, `telegram`, `slack`, `pushover`.

**File:** `convex/channels/types.ts`

Channel provider abstraction with pluggable providers:
- Chatwoot, ManyChat, Pushover, Resend, Infobip, Twilio, WhatsApp, Telegram, Slack, Direct.

### 4.5 Model Adapter Layer

**File:** `convex/ai/modelAdapters.ts` (22KB)

Already supports normalized provider contracts for:
- OpenRouter, OpenAI, Anthropic, Gemini, Grok/xAI, Mistral, Kimi, ElevenLabs, OpenAI-compatible.
- `NormalizedToolCall`, `NormalizedUsage`, `NormalizedProviderCompletion`.

**File:** `convex/ai/modelPolicy.ts` (19KB)

Already supports:
- Deterministic model selection: preferred → org default → safe fallback.
- `ModelRoutingIntent`: general, tooling, billing, support, content.
- `ModelRoutingModality`: text, vision, audio_in.
- `ModelRoutingCandidateReason`: session_pinned, preferred, org_default, safe_fallback, platform_first_enabled, org_enabled_pool.

**File:** `convex/ai/modelDiscovery.ts` (35KB)

Model discovery and capability matrix.

**File:** `convex/ai/modelFailoverPolicy.ts`

Two-stage failover (OpenClaw-inspired).

### 4.6 Agent Execution Pipeline

**File:** `convex/ai/agentExecution.ts` (196KB)

13-step execution pipeline:
1. Config load → 2. Rate limit → 3. Session → 4. CRM context → 5. Context assembly → 6. LLM call → 7. Tool execution → 8. Store response → 9. Stats → 10. Response delivery.

### 4.7 Memory System

**File:** `convex/ai/memoryComposer.ts`

5-layer memory architecture with knowledge context composition.

**File:** `convex/brainKnowledge.ts`

Brain knowledge management — markdown document store with org-scoped retrieval.

### 4.8 Interview System

**File:** `convex/ai/interviewRunner.ts` (79KB)

Guided interview with phased capture. Core memory extraction via structured conversation. This is the mechanism that births the soul from the user's own identity.

### 4.9 Trust Governance

**File:** `convex/ai/trustEvents.ts` (25KB)

Full audit trail for every soul decision, tool execution, and escalation.

**File:** `convex/ai/trustTelemetry.ts` (18KB)

Trust telemetry for operator visibility.

### 4.10 Tool Registry

**File:** `convex/ai/tools/registry.ts` (139KB)

40+ tools across CRM, booking, email, forms, projects, data queries, workflows, builder, sequences, media, and more.

### 4.11 OpenClaw macOS Reference

**Location:** `docs/reference_projects/openclaw/`

Complete reference architecture for:
- Native Swift macOS menu bar app.
- TCC permission management (Accessibility, Screen Recording, Microphone, Speech Recognition, Automation).
- XPC interprocess communication.
- LaunchAgent for persistent background service.
- Bundled local gateway.
- Code signing + notarization + Sparkle auto-update.
- Voice overlay and wake-word detection.
- Canvas rendering for rich UI.
- 30+ test files for macOS-specific functionality.

**Key reference files:**
- `docs/reference_projects/openclaw/docs/platforms/mac/permissions.md` — TCC framework patterns
- `docs/reference_projects/openclaw/docs/platforms/mac/bundled-gateway.md` — local gateway lifecycle
- `docs/reference_projects/openclaw/docs/platforms/mac/release.md` — signing, notarization, Sparkle
- `docs/reference_projects/openclaw/docs/platforms/mac/xpc.md` — IPC patterns
- `docs/reference_projects/openclaw/docs/platforms/mac/voicewake.md` — voice activation

### 4.12 Existing `openai_compatible` Provider

**File:** `convex/ai/modelAdapters.ts`

The `openai_compatible` provider ID already exists in the canonical provider alias map:

```typescript
const CANONICAL_PROVIDER_ALIAS: Record<string, AiProviderId> = {
  // ...
  openai_compatible: "openai_compatible",
  "openai-compatible": "openai_compatible",
};
```

With a configurable base URL:

```typescript
const PROVIDER_DEFAULT_BASE_URL: Record<AiProviderId, string> = {
  // ...
  openai_compatible: "https://api.openai.com/v1",
};
```

This is the foundation for private/local model inference — Ollama, LM Studio, and llama.cpp all expose OpenAI-compatible API endpoints.

---

## 5. Specification: One Agent Architecture

### 5.1 The Soul Is Born From You, Not a Template

The current soul generator creates agent identity from business context. The "Your AI" model extends this:

**Current flow:**
```
Organization context → soulGenerator.ts → Generic business agent soul
```

**New flow:**
```
Discovery interview (interviewRunner.ts)
  → Captures: identity, values, communication style, expertise,
    decision-making patterns, business context, admired thinkers
  → soulGenerator.ts generates a UNIQUE soul
  → Soul is the user's own voice, not a preconfigured persona
  → Dream Team specialists available behind the scenes (see Section 6F)
```

### 5.2 Dream Team as Soul-Powered Specialists

> **CORRECTED in v1.2:** The original v1.0 described expert frameworks as "knowledge base documents." This was wrong. See Section 6F for the full correction.

The Dream Team agents (Closer, Strategist, Copywriter, Operator, CFO, Coach) are **not** reduced to knowledge base documents. They are full soul-bound agents with their own personality blends, system prompts, coaching protocols, and situation-response matrices — documented in `docs/prd/souls/` (33 files, 100+ frameworks, 11 source personalities).

**Three access modes (see Section 6F for details):**

| Mode | How It Works | When |
|---|---|---|
| **Invisible** (default) | Primary agent internally consults specialists via team harness. User sees one consistent voice. | Day one — always on |
| **Direct access** | User says "let me talk to the Closer" — specialist activates with full soul | User discovers specialists through use |
| **Team meeting** | User convenes multiple specialists for strategic discussion | Power feature for complex decisions |

**Implementation:** The team harness (`convex/ai/teamHarness.ts`) already supports tag-in specialist patterns. The adaptation adds a `teamAccessMode` flag: `"invisible" | "direct" | "meeting"`. Soul blend prompts are loaded from `docs/prd/souls/AGENT_SOUL_BLEND_PROMPTS.md`. The memory composer (`convex/ai/memoryComposer.ts`) enriches context with the specialist's knowledge base when activated.

### 5.3 Internal Capability Routing (Invisible Team)

The team harness (`convex/ai/teamHarness.ts`) continues to exist but is repurposed:

**Current behavior (Dream Team):**
```
User → PM Agent → "Let me tag in The Closer for this"
  → User sees: "Hi, I'm The Closer. Here's my take..."
  → Visible personality switch
```

**New behavior (Three Modes):**
```
MODE 1 — INVISIBLE (default):
User → Their Agent → Internal routing detects sales context
  → Team harness activates The Closer's soul behind the scenes
  → Agent responds in ITS OWN voice, enriched with Closer's frameworks
  → User sees: seamless, consistent personality

MODE 2 — DIRECT ACCESS:
User → "Let me talk to the Closer"
  → The Closer activates with full Navy soul, personality, coaching protocol
  → User is now IN a coaching session with a distinct specialist
  → "Back to [Agent Name]" returns to primary agent

MODE 3 — TEAM MEETING:
User → "Team meeting about this deal"
  → Closer, Strategist, CFO each respond from their soul's perspective
  → Primary agent synthesizes into recommendation
```

**New field on agent config:**

```typescript
// convex/ai/harness.ts — AgentConfig extension
interface AgentConfig {
  // ... existing fields ...

  /** When true, this is the user's primary agent with invisible team behind it */
  unifiedPersonality: boolean;

  /** How team specialists are accessed */
  teamAccessMode: "invisible" | "direct" | "meeting";

  /** Available Dream Team specialists for this agent */
  dreamTeamSpecialists?: Array<{
    agentId: Id<"objects">;            // The specialist agent (e.g., The Closer)
    soulBlendId: string;               // e.g., "the-closer", "the-strategist"
    activationHints: string[];         // Context patterns that trigger invisible mode
    directAccessEnabled: boolean;      // User can talk to this specialist directly
    meetingParticipant: boolean;       // Included in team meetings
  }>;
}
```

### 5.4 Soul Evolution With User Identity Preservation

The drift scoring system (Plan 19, `convex/ai/soulEvolution.ts`) already detects when the agent drifts from its core identity. For "Your AI," the identity anchors are even more critical because they represent the USER's identity, not a generic business persona.

**New constraint:** Core identity anchors (name, traits, values, communication style) captured during the discovery interview are marked as `immutable_origin: "interview"`. The soul evolution system can propose refinements to execution preferences but CANNOT mutate identity anchors without explicit user re-interview.

```typescript
// Extension to soul V2 overlay
soulV2: {
  schemaVersion: 3,
  identityAnchors: {
    // ... existing fields ...
    immutableOrigin: "interview" | "generated" | "manual",
    interviewSessionId?: Id<"interviewSessions">,
  },
  // ...
}
```

---

## 6. Specification: Privacy Mode (Local Inference)

### 6.1 The Privacy Promise

When a user activates Privacy Mode:
- Conversation is routed to a local model running on their machine (Ollama, LM Studio, llama.cpp).
- No conversation data leaves the device. Zero cloud inference.
- The soul and knowledge base are cached locally. Tool execution happens locally where possible.
- A clear visual indicator shows "Privacy Mode — Local Inference" in every interface.
- Conversation history from privacy sessions is stored locally only, not synced to Convex.

### 6.2 Architecture

```
┌─────────────────────────────────────────────────┐
│          L4YERCAK3 Desktop App (Swift)           │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Privacy Mode Controller                  │    │
│  │  ┌────────────┐  ┌───────────────────┐   │    │
│  │  │ Soul Cache  │  │ KB Cache (local)  │   │    │
│  │  │ (encrypted) │  │ (encrypted)       │   │    │
│  │  └────────────┘  └───────────────────┘   │    │
│  │  ┌────────────────────────────────────┐  │    │
│  │  │ Local Model Connector              │  │    │
│  │  │ ┌──────────┐ ┌──────────────────┐  │  │    │
│  │  │ │ Ollama   │ │ LM Studio       │  │  │    │
│  │  │ │ :11434   │ │ :1234           │  │  │    │
│  │  │ └──────────┘ └──────────────────┘  │  │    │
│  │  │ ┌──────────┐ ┌──────────────────┐  │  │    │
│  │  │ │ llama.cpp│ │ Custom endpoint │  │  │    │
│  │  │ │ :8080    │ │ :PORT           │  │  │    │
│  │  │ └──────────┘ └──────────────────┘  │  │    │
│  │  └────────────────────────────────────┘  │    │
│  │  ┌────────────────────────────────────┐  │    │
│  │  │ Local Tool Executor (sandboxed)    │  │    │
│  │  │ File ops, calculations, drafts     │  │    │
│  │  │ NO network calls in privacy mode   │  │    │
│  │  └────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Privacy sessions stored in:                     │
│  ~/Library/Application Support/L4YERCAK3/        │
│    privacy-sessions/ (encrypted SQLite)          │
└──────────────────────────────────────────────────┘
```

### 6.3 Local Model Connection

The existing `openai_compatible` provider in `convex/ai/modelAdapters.ts` already normalizes any OpenAI-compatible endpoint. For privacy mode, we replicate this adapter locally in the desktop app:

| Local Provider | Default Endpoint | Model Examples |
|---|---|---|
| Ollama | `http://localhost:11434/v1` | llama3.1, mistral, codellama, gemma2 |
| LM Studio | `http://localhost:1234/v1` | Any GGUF model |
| llama.cpp server | `http://localhost:8080/v1` | Any GGUF model |
| Custom | User-configured `http://HOST:PORT/v1` | Any OpenAI-compatible API |

**Auto-detection:** On app launch, the desktop app probes known local endpoints. If Ollama is running, it appears as an available model option with installed model list.

### 6.4 Soul Cache for Offline/Privacy Use

When the user opts into privacy mode, the desktop app downloads and encrypts:
- Soul identity anchors + execution preferences.
- Active knowledge base documents (up to a configurable limit).
- FAQ entries.
- Core memories.

Cached in `~/Library/Application Support/L4YERCAK3/soul-cache/` using macOS Keychain for encryption key storage.

**Sync policy:** Soul cache refreshes on app launch and when soul evolution proposals are approved in the web UI. One-way sync: cloud → local. Privacy session data never syncs back.

### 6.5 Privacy Mode Limitations (Transparent to User)

| Capability | Cloud Mode | Privacy Mode |
|---|---|---|
| Conversation quality | Full model capability | Limited by local model size |
| Tool execution (CRM, email, booking) | ✅ Full 40+ tools | ❌ No cloud tools (no network) |
| Knowledge base retrieval | ✅ Full semantic search | ⚠️ Local cache only (lexical) |
| Soul evolution proposals | ✅ Active | ❌ Paused |
| Conversation persistence | ✅ Synced to Convex | 📱 Local only (encrypted) |
| Multi-channel (Telegram, WhatsApp) | ✅ Available | ❌ Desktop only |
| Code execution (Builder) | ✅ Sandboxed | ✅ Sandboxed locally |

**UX principle:** Privacy mode is for thinking, planning, sensitive conversations, and offline work. When the user needs the agent to DO things (send emails, update CRM, book appointments), they switch back to cloud mode.

### 6.6 Privacy Mode Quality Scoring

The drift scoring system from Plan 19 runs locally in privacy mode:
- If the local model cannot maintain soul fidelity (measured by deviation from identity anchors), the app surfaces a warning: *"Your local model may not fully maintain [Agent Name]'s personality. Consider using a larger model or switching to cloud mode for important conversations."*
- Quality score visible in settings: Gold/Silver/Bronze based on local model capability.

---

## 6B. Specification: Soul Modes + Internal Archetypes

### 6B.1 The Concept: Same Soul, Different Register

A real person doesn't have the same personality at work and at home. They're the same human — same values, same memories, same judgment — but they shift register. Professional in a board meeting. Relaxed with friends. Reflective in a journal. Nurturing with family.

The "Your AI" agent does the same. One soul. One identity. One continuous memory. But it shifts HOW it shows up based on the active **Soul Mode**.

### 6B.2 Soul Modes

```typescript
// convex/ai/soulModes.ts (NEW)

export type SoulMode = "work" | "private";

export interface SoulModeConfig {
  mode: SoulMode;
  label: string;
  description: string;
  toneOverride: string;
  toolScope: "full" | "read_only" | "none";
  privacyLevel: "cloud" | "local_preferred" | "local_required";
  channelBindings: string[];       // Which channels activate this mode
  archetypeDefault?: string;       // Default internal archetype for this mode
}

export const DEFAULT_SOUL_MODES: SoulModeConfig[] = [
  {
    mode: "work",
    label: "Work Mode",
    description: "Professional. Your business personality. Clear, structured, action-oriented.",
    toneOverride: "professional",
    toolScope: "full",
    privacyLevel: "cloud",
    channelBindings: ["slack", "email", "webchat"],
    archetypeDefault: "ceo",
  },
  {
    mode: "private",
    label: "Private Mode",
    description: "Personal. Relaxed. Reflective. Advisory. Nothing leaves your machine if you choose.",
    toneOverride: "warm_reflective",
    toolScope: "read_only",
    privacyLevel: "local_preferred",
    channelBindings: ["telegram_private", "desktop_privacy"],
    archetypeDefault: "coach",
  },
];
```

### 6B.3 Mode Activation

Modes activate based on context — the agent figures out which mode to be in:

| Signal | Mode | Reasoning |
|---|---|---|
| Message arrives on business Slack | **Work** | Professional channel → professional personality |
| Message arrives on WhatsApp Business | **Work** | Client-facing channel → professional personality |
| Message arrives on personal Telegram | **Private** | Personal channel → personal register |
| User toggles "Privacy Mode" in desktop app | **Private** | Explicit choice → local inference, personal tone |
| User says "let's talk privately" | **Private** | Conversational trigger → mode switch |
| User says "back to work" | **Work** | Conversational trigger → mode switch |

**Channel-to-mode mapping is configurable.** Users can assign any channel to any mode in settings. The defaults above are sensible starting points.

**Mode switch is seamless.** The agent doesn't announce "switching to work mode." It just shifts tone and behavior. Like a person walking from the kitchen into the office.

### 6B.4 How Modes Affect the Soul

The soul's identity anchors (name, values, core memories) are **constant across modes.** What changes:

| Soul Layer | Work Mode | Private Mode |
|---|---|---|
| **Identity anchors** | Same | Same |
| **Core memories** | Same | Same |
| **Values** | Same | Same |
| **Communication style** | Professional, structured, concise | Warm, reflective, conversational |
| **Tone** | Business-appropriate, action-oriented | Relaxed, exploratory, supportive |
| **Tool access** | Full 40+ tools (CRM, email, booking, workflows) | Read-only or none (advisory, thinking, reflection) |
| **Inference** | Cloud (best model) | Local preferred (privacy) |
| **Conversation storage** | Synced to Convex | Local only (encrypted) when privacy mode active |

### 6B.5 Internal Archetypes (The Agent Asks: "What Do You Need?")

Within each mode, the agent can shift its reasoning approach through **internal archetypes.** These are NOT separate agents. They are cognitive lenses — ways the single agent approaches a problem.

```typescript
// convex/ai/archetypes.ts (NEW)

export type ArchetypeId =
  | "coach"
  | "ceo"
  | "cfo"
  | "marketer"
  | "life_coach"
  | "business_coach"
  | "family_counselor"
  | "operator"
  | "creative";

export interface Archetype {
  id: ArchetypeId;
  label: string;
  description: string;
  reasoningStyle: string;
  availableInModes: SoulMode[];
  knowledgeLayers: string[];           // KB tags to activate
  promptOverlay: string;               // Additional system prompt fragment
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "coach",
    label: "The Coach",
    description: "Accountability, goals, tough love. Asks the hard questions.",
    reasoningStyle: "socratic",
    availableInModes: ["work", "private"],
    knowledgeLayers: ["coaching_frameworks"],
    promptOverlay: "You are in coaching mode. Ask probing questions before giving answers. Hold the user accountable to their stated goals. Be direct but supportive. Challenge assumptions.",
  },
  {
    id: "ceo",
    label: "The CEO",
    description: "Strategic thinking, big picture, decision frameworks.",
    reasoningStyle: "strategic",
    availableInModes: ["work"],
    knowledgeLayers: ["strategy_frameworks", "business_context"],
    promptOverlay: "Think strategically. Consider second-order effects. Frame decisions in terms of leverage, opportunity cost, and long-term positioning. Be decisive.",
  },
  {
    id: "cfo",
    label: "The CFO",
    description: "Financial reasoning, risk assessment, unit economics.",
    reasoningStyle: "analytical",
    availableInModes: ["work"],
    knowledgeLayers: ["financial_frameworks"],
    promptOverlay: "Think in numbers. Quantify trade-offs. Assess financial risk. Ask about margins, runway, ROI. Be conservative in estimates.",
  },
  {
    id: "marketer",
    label: "The Marketer",
    description: "Creative positioning, campaigns, messaging, audience insight.",
    reasoningStyle: "creative",
    availableInModes: ["work"],
    knowledgeLayers: ["copy_frameworks", "marketing_strategy"],
    promptOverlay: "Think about the audience first. What do they feel, fear, want? Craft messaging that resonates emotionally. Test multiple angles. Be creative but grounded in strategy.",
  },
  {
    id: "life_coach",
    label: "The Life Coach",
    description: "Wellbeing, balance, personal growth, energy management.",
    reasoningStyle: "empathetic",
    availableInModes: ["private"],
    knowledgeLayers: ["wellbeing_frameworks"],
    promptOverlay: "Focus on the whole person. Ask about energy, sleep, stress, fulfillment. Help the user see patterns in their behavior. Be gentle but honest. Never minimize their feelings.",
  },
  {
    id: "business_coach",
    label: "The Business Coach",
    description: "Business development, mindset, execution, growth.",
    reasoningStyle: "mentoring",
    availableInModes: ["work", "private"],
    knowledgeLayers: ["business_coaching_frameworks"],
    promptOverlay: "Think like a mentor who has built businesses before. Share frameworks, not just advice. Help the user develop their own thinking. Challenge mediocrity. Celebrate progress.",
  },
  {
    id: "family_counselor",
    label: "The Family Counselor",
    description: "Relationships, priorities, perspective, work-life integration.",
    reasoningStyle: "compassionate",
    availableInModes: ["private"],
    knowledgeLayers: ["relationship_frameworks"],
    promptOverlay: "Approach with deep empathy. Relationships are complex. Help the user see multiple perspectives. Never take sides. Focus on understanding, communication, and repair. Respect boundaries — you are an AI, not a therapist. Suggest professional help for serious issues.",
  },
  {
    id: "operator",
    label: "The Operator",
    description: "Systems, processes, delegation, efficiency.",
    reasoningStyle: "systematic",
    availableInModes: ["work"],
    knowledgeLayers: ["operations_frameworks"],
    promptOverlay: "Think in systems and processes. Where is the bottleneck? What can be automated? What should be delegated? Build repeatable processes. Reduce single points of failure.",
  },
  {
    id: "creative",
    label: "The Creative",
    description: "Brainstorming, ideation, divergent thinking, what-if scenarios.",
    reasoningStyle: "divergent",
    availableInModes: ["work", "private"],
    knowledgeLayers: ["creative_frameworks"],
    promptOverlay: "Think without constraints first. Generate many ideas before evaluating. Use analogies from unrelated fields. Challenge conventional approaches. Make unexpected connections.",
  },
];
```

### 6B.6 Archetype Activation

The agent can activate archetypes in three ways:

**1. Agent-initiated (proactive):**
```
Agent: "Hey, what's on your mind today? I can show up as..."
  → The Coach (let's set goals and hold you accountable)
  → The CEO (let's think strategically about your business)
  → The CFO (let's look at the numbers)
  → The Life Coach (let's talk about how you're doing)
  → Just talk (no specific lens, just be you)
```

This happens when the user opens a conversation without a clear task. The agent offers to shift into a specific reasoning mode — but it's always optional.

**2. User-initiated (explicit):**
```
User: "Put on your CFO hat"
Agent: [Activates CFO archetype]
  → "Alright, let's look at the numbers. What's your current monthly burn rate?"
```

**3. Context-detected (implicit):**
```
User: "I'm worried about the team's morale"
Agent: [Detects emotional/relational context]
  → Activates coach/counselor reasoning style
  → Responds with empathy first, frameworks second
  → Does NOT announce the mode switch
```

### 6B.7 Implementation: Mode + Archetype in the Harness

Extension to the existing agent harness:

```typescript
// convex/ai/harness.ts — AgentConfig extension

interface AgentConfig {
  // ... existing fields ...

  /** Active soul mode */
  activeSoulMode: SoulMode;

  /** Active archetype (null = general, no specific lens) */
  activeArchetype: ArchetypeId | null;

  /** User's mode-to-channel mapping */
  modeChannelBindings: Array<{
    channel: ChannelType;
    mode: SoulMode;
  }>;

  /** Enabled archetypes (user can disable ones they don't want) */
  enabledArchetypes: ArchetypeId[];
}
```

### 6B.8 Prompt Assembly With Mode + Archetype

The existing `convex/ai/agentPromptAssembly.ts` composes the system prompt. Modes and archetypes add layers:

```
SYSTEM PROMPT COMPOSITION:
┌─────────────────────────────────────────┐
│ Layer 1: Soul Identity (constant)        │
│   Name, values, traits, core memories    │
├─────────────────────────────────────────┤
│ Layer 2: Mode Overlay (work/private)     │
│   Tone, style, tool access, privacy      │
├─────────────────────────────────────────┤
│ Layer 3: Archetype Overlay (if active)   │
│   Reasoning style, prompt fragment       │
├─────────────────────────────────────────┤
│ Layer 4: Specialist Soul (if activated)   │
│   Dream Team soul blend + KB + coaching  │
├─────────────────────────────────────────┤
│ Layer 5: Conversation Context            │
│   Memory, recent history, CRM data       │
└─────────────────────────────────────────┘
```

The soul (Layer 1) NEVER changes. It's the foundation. Modes and archetypes are lenses applied ON TOP of the soul. The user's AI always sounds like THEM — it just shifts focus and tone.

### 6B.9 Cross-Mode Memory

Memories are shared across modes. A conversation in Private Mode about work-life balance is available as context when the user works in Work Mode the next day. The agent might gently say:

```
[Work Mode — Monday morning]
Agent: "Good morning. Before we dive in — you mentioned Friday
that you wanted to leave by 5pm this week to spend more time
with the kids. Want me to keep your afternoon schedule clear?"
```

This is the "Her" effect. The AI knows you holistically. Work you and private you aren't separate — they inform each other.

### 6B.10 Guardrails for Private/Sensitive Archetypes

| Archetype | Guardrail |
|---|---|
| **Life Coach** | `neverDo: ["diagnose mental health conditions", "replace therapy", "prescribe medication"]`. Always suggest professional help for serious issues. |
| **Family Counselor** | `neverDo: ["take sides in relationship conflicts", "encourage separation/divorce without suggesting counseling", "discuss child custody"]`. Suggest professional family therapy for serious issues. |
| **CFO** | `neverDo: ["provide tax advice", "recommend specific investments", "guarantee financial outcomes"]`. Suggest consulting a financial advisor for major decisions. |
| **All Private archetypes** | Clear disclaimer in settings: "Your AI is not a licensed therapist, counselor, or financial advisor. It offers frameworks and perspective. For serious personal, medical, or financial matters, please consult a qualified professional." |

---

## 6C. Specification: Voice Runtime + Latency Architecture

### 6C.1 The Latency Problem

Voice conversation with AI feels unnatural because the pipeline creates perceptible silence:

```
User speaks → STT (~300-800ms) → LLM (~1-5s) → TTS (~200-500ms) → User hears
Total perceived latency: 1.5-6+ seconds
Human conversational expectation: <500ms
```

This is why voice AI products feel like walkie-talkies, not conversations. Solving this is the difference between "cool demo" and "I talk to my AI all day."

### 6C.2 Current State

**File:** `convex/ai/voiceRuntime.ts` (17KB)

Already supports:
- ElevenLabs provider binding with API key, base URL, default voice ID.
- Voice session lifecycle: open → transcribe → synthesize → close.
- Trust event logging for voice sessions.
- Browser and ElevenLabs runtime providers.

**File:** `convex/ai/voiceRuntimeAdapter.ts` (14KB)

Already supports:
- `VoiceRuntimeProviderId`: `"browser" | "elevenlabs"`.
- Provider health monitoring with fallback.
- Normalized transcription and synthesis interfaces.

### 6C.3 Streaming Architecture (Target State)

The key to sub-second perceived latency is **streaming everything in parallel:**

```
┌─────────────────────────────────────────────────────────────┐
│                    STREAMING VOICE PIPELINE                  │
│                                                             │
│  User speaks ──┐                                            │
│                ▼                                            │
│  ┌──────────────────┐                                       │
│  │ STT (Streaming)   │ Whisper.cpp local (macOS)            │
│  │ or ElevenLabs STT │ ~150ms to first partial transcript   │
│  └────────┬─────────┘                                       │
│           │ Partial transcript streams as user speaks        │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ LLM (Streaming)   │ Tokens start flowing ~200ms          │
│  │                   │ after final transcript word            │
│  └────────┬─────────┘                                       │
│           │ Tokens stream as they generate                   │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ TTS (Streaming)   │ ElevenLabs WebSocket streaming       │
│  │                   │ First audio chunk: ~100ms after       │
│  │                   │ first complete sentence from LLM      │
│  └────────┬─────────┘                                       │
│           │ Audio chunks stream to speaker                   │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Audio Playback    │ User hears first word ~500-800ms     │
│  │ (Streaming)       │ after finishing speaking               │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

**Perceived latency with streaming: ~500-800ms** — within acceptable conversational range.

### 6C.4 Voice Modes by Context

| Context | STT | LLM | TTS | Latency |
|---|---|---|---|---|
| **Desktop app (cloud mode)** | Whisper.cpp local | Cloud (streaming) | ElevenLabs streaming WebSocket | ~500-800ms |
| **Desktop app (privacy mode)** | Whisper.cpp local | Local LLM (streaming) | macOS `AVSpeechSynthesizer` or local TTS | ~300-600ms (smaller model) |
| **Web/mobile** | Browser Web Speech API | Cloud (streaming) | ElevenLabs streaming | ~800-1200ms |
| **Phone call (future)** | Telephony STT | Cloud (streaming) | ElevenLabs streaming | ~600-900ms |

### 6C.5 The Agent's Voice

The soul defines HOW the agent sounds, not just what it says:

```typescript
// Extension to soul V2
soulV2: {
  // ... existing fields ...
  voiceConfig: {
    elevenLabsVoiceId?: string;        // Specific ElevenLabs voice
    voiceStyle?: "warm" | "professional" | "energetic" | "calm";
    speakingRate?: number;              // 0.5 - 2.0 (1.0 = normal)
    localTTSVoice?: string;            // macOS voice name for privacy mode
  },
}
```

**During the birthing interview (Phase 1 of onboarding), the Midwife Agent asks:**

> *"Let's give your AI a voice. Listen to these options and pick the one that feels right for your brand."*
> → Plays 4-5 ElevenLabs voice samples
> → User picks one
> → Voice ID stored in soul config

### 6C.6 Filler Responses (Psychological Latency Reduction)

Even with streaming, there are moments where the LLM needs time to think (complex questions, tool execution). Rather than silence:

```
User: "What's our revenue trend looking like compared to last quarter?"
Agent: [immediately] "Let me pull that up..."
       [500ms later, data tool returns]
       "Okay, so looking at the numbers..."
```

Filler responses are pre-generated phrases that match the soul's communication style. They fire immediately while the actual response generates. The soul config includes:

```typescript
fillerPhrases: {
  thinking: ["Let me think about that...", "Good question...", "Hmm..."],
  toolUse: ["Let me check that...", "Pulling that up now...", "One sec..."],
  complex: ["That's a big one. Give me a moment...", "Let me work through this..."],
}
```

### 6C.7 Privacy Mode Voice

In privacy mode, voice never touches the cloud:

| Component | Privacy Mode Implementation |
|---|---|
| **STT** | Whisper.cpp running locally on macOS (Metal-accelerated). Model bundled with app or downloaded on first use (~150MB for small model). |
| **LLM** | Local model via Ollama/LM Studio. |
| **TTS** | macOS `AVSpeechSynthesizer` (built-in, no network). Or local Piper TTS for higher quality. |
| **Audio storage** | Transcripts stored in local encrypted SQLite. Audio buffers processed and discarded — never written to disk. |

---

## 6D. Specification: The Birthing Process (Agent Onboarding)

### 6D.1 Philosophy

The agent isn't "configured." It's **born.** The first experience a user has with L4YERCAK3 is not a dashboard, not a settings page, not a form. It's a conversation with a **Midwife Agent** — a platform-level agent (Layer 1 in the harness hierarchy) whose sole purpose is to bring your AI into existence.

This is the single most important moment in the product. Get it right and the user bonds with their AI on day one. Get it wrong and they see "another AI tool."

### 6D.2 The Midwife Agent

The Midwife is a platform agent (`agentSubtype: "system"`, Layer 1) with a specific soul designed for empathetic, curious, structured interviewing. It is NOT the user's agent — it is the agent that creates the user's agent.

```typescript
// Midwife agent configuration
const MIDWIFE_SOUL = {
  name: "Mika",  // Or platform-chosen name
  tagline: "I help bring your AI to life",
  traits: ["empathetic", "curious", "structured", "patient", "perceptive"],
  communicationStyle: "Warm and conversational. Asks one question at a time. Reflects back what the user says to confirm understanding. Never rushes. Makes the process feel like a good conversation, not an interrogation.",
  neverDo: [
    "Rush the interview",
    "Ask multiple questions at once",
    "Make assumptions about the user's preferences",
    "Skip confirmation of captured information",
  ],
};
```

### 6D.3 The Birthing Phases

```
PHASE 1: "WHO ARE YOU?" (Discovery — 15-30 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mika: "Hey! I'm Mika. I'm going to help bring your AI to life
       today. Think of this as a conversation — there are no wrong
       answers. I just want to understand who you are and what
       you need. Ready?"

Block 1: Business Context (5 min)
  "Tell me about your business — not the elevator pitch,
   just tell me like you'd tell a friend over coffee."
  → Captures: industry, size, customers, revenue model

  "Who are your customers? What do they come to you for?"
  → Captures: ICP, service/product context

Block 2: Communication Style (5 min)
  "How do you normally talk to clients? Formal, casual, somewhere
   in between? Do you use emoji? Are you the funny one or the
   straight-talker?"
  → Captures: tone, formality, humor, emoji usage

  "Show me — if a potential client reaches out on WhatsApp
   right now, what would you actually type?"
  → Captures: ACTUAL communication pattern (not what they think they do)

Block 3: Values & Identity (5 min)
  "What do you value most in business? And personally — what
   matters to you outside work?"
  → Captures: core values, ethical compass, life priorities

  "Tell me about a moment you're proud of in your business.
   And a moment where you learned something the hard way."
  → Captures: core memories (pride + caution anchors)

Block 4: Knowledge & Inspiration (5 min)
  "Who do you admire? Whose books are on your shelf? Whose
   podcast do you never miss?"
  → Captures: expert framework preferences (KB layers to load)

  "If you could hire anyone in the world for your team —
   a negotiator, a strategist, a writer — who would it be?"
  → Captures: archetype preferences

Block 5: Boundaries & Guardrails (5 min)
  "What should your AI NEVER do? Are there topics that are
   completely off-limits?"
  → Captures: neverDo rules

  "When should your AI always escalate to you? What decisions
   should it never make on its own?"
  → Captures: escalation triggers, autonomy boundaries

  "Where do you draw the line on privacy? Are there types of
   conversations you'd only want happening locally on your
   device?"
  → Captures: privacy preferences, mode configuration


PHASE 2: "FIRST BREATH" (Soul Generation — 30-60 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mika: "Okay, I have a really good sense of who you are.
       Give me a moment — I'm bringing your AI to life now."

  → soulGenerator.ts processes interview data
  → Generates: name, identity anchors, traits, values,
    communication style, core memories, guardrails
  → Loads expert framework KB layers based on preferences
  → Creates agent instance with soul V2


PHASE 3: "FIRST WORDS" (Introduction — 2-3 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mika: "They're ready. Meet your AI."

[Mika hands off conversation to the newly created agent]

Agent: "Hey [Name]. I'm [generated name]. Based on everything
        you shared with Mika, here's how I understand myself:

        I'm [traits]. I value [values]. I communicate [style].
        I'll never [neverDo]. I'll always escalate when [triggers].

        I also have a team behind me — specialists in sales,
        strategy, copywriting, operations, finance, and coaching.
        They're trained on world-class frameworks and they work
        for YOU. I'll tap into their expertise behind the scenes,
        but you can also talk to them directly anytime — just say
        'let me talk to the Closer' or 'team meeting.'

        For now, it's just you and me. Does this feel right?
        What would you adjust?"

User: [Confirms or tweaks]
  → Adjustments become soul mutations (approved immediately)
  → Agent acknowledges: "Got it. Updated."


PHASE 4: "FIRST STEPS" (Channel Setup — 5 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: "Where do you want me? I can be on your Telegram,
        WhatsApp, Slack, email — wherever you already spend
        your time. Where should we start?"

  → Guided channel connection
  → Agent sends first message on chosen channel
  → "I'm here now. Talk to me anytime."


PHASE 5: "FIRST WEEK" (Supervised Mode — 7 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  → Agent operates in full supervised mode
  → Every outbound message drafted for approval
  → User trains through corrections
  → Each correction becomes a learning event
  → End of week: agent self-reports progress:

  Agent: "First week recap: I handled 47 conversations.
         You approved 41 without changes (87%). You adjusted
         my tone in 4 (I've learned from those). 2 I got wrong
         (I now know not to [specific correction]).

         Ready to give me more freedom on routine follow-ups?"
```

### 6D.4 Privacy During Birthing

| Data Category | Storage | Access | Retention |
|---|---|---|---|
| Interview transcript | Convex (encrypted at rest, org-scoped) | User + platform admin only | Permanent (basis of soul) |
| Interview audio (if voice) | Processed in memory → discarded | Never stored | Transient — discarded after transcription |
| Soul identity anchors | Convex (encrypted, org-scoped) | User's agents only | Permanent (immutable origin) |
| Core memories | Convex (encrypted, org-scoped) | User's agents only | Permanent (immutable by default) |
| Knowledge base | Convex (encrypted, org-scoped) | User's agents only | User-managed |
| Midwife conversation log | Convex (encrypted, org-scoped) | User + platform admin | 90-day retention, then archived |

**For maximum privacy users:**

Option to run the birthing interview in **privacy mode**:
- Midwife Agent runs against local model (Ollama)
- Interview transcript stored locally only
- Soul generated locally
- Soul synced to cloud ONLY when user explicitly approves
- Trade-off: local model may capture less nuance. Midwife warns: *"Running locally means a smaller AI is conducting this interview. The result will be good, but might miss some subtleties. You can always refine your soul later."*

### 6D.5 Re-Birthing / Soul Reset

Users can re-run the birthing process at any time:

- **Full reset:** New interview, new soul generation. Previous soul archived (not deleted).
- **Refinement interview:** Shorter conversation focused on what's changed. Midwife asks: *"Let's talk about what's different since we last spoke. Has your business changed? Have your priorities shifted?"*
- **Manual soul editing:** For users who want direct control, the soul is editable as structured data in settings. But the interview is always recommended as the primary method.

---

## 6E. Specification: Emergent Team — From One Agent to Many

### 6E.1 Philosophy: The Team Emerges, It Isn't Imposed

In real life, you don't start a company by hiring a department. You start alone. You do everything. Then you hire your first person. Then another. Over time, you build a team. Each hire happens because you NEED that person, not because an org chart told you to.

Your AI works the same way.

### 6E.2 The Progression

```
MONTH 1: One Agent
━━━━━━━━━━━━━━━━━
  Your AI handles everything.
  Internal capability routing — sales KB, copy KB, ops KB —
  activates based on context. One conversation. One relationship.

  "Hey, can you follow up with those leads?"
  "Draft a blog post about our new service."
  "What should I prioritize this quarter?"

  All handled by one agent. User doesn't need to think
  about routing.


MONTH 2-3: Specialization Becomes Visible
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Your AI starts handling enough volume in specific domains
  that it proposes specialization:

  Agent: "I've been handling about 30 lead follow-ups a week
         for you. I could be more effective if I had a dedicated
         sales specialist working alongside me — they'd build
         deeper context on each prospect while I focus on
         everything else. Want me to create one?"

  User: "Sure, let's try it."

  → Agent spawns a Sales Specialist (child agent)
  → Specialist inherits soul identity anchors (same values,
    same brand voice) but has domain-specific KB and tools
  → Specialist works silently behind Your AI's coordination
  → User still talks to Your AI — routing is invisible


MONTH 3+: Direct Access Available
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  User can choose to talk directly to specialists:

  User: "Let me talk to the sales agent directly."
  Your AI: "Sure. That's [Name] — they've been handling your
           follow-ups for 6 weeks now. They've got deep context
           on all 47 active prospects. Connecting you."

  [Direct conversation with Sales Agent]

  Sales Agent: "Hey [Name]. I know we haven't talked directly
               before, but I've been managing your pipeline.
               The Müller deal is looking strong — they opened
               every email this week. Want me to push for the
               close or let it breathe?"

  User: "Push for it. And come back to [Your AI] when you're done."

  [Sales Agent closes conversation, Your AI is briefed]

  Your AI: "Nice. [Sales Agent] is on the Müller close.
           I'll let you know when there's an update."
```

### 6E.3 How Specialist Agents Are Born

Specialists are NOT preconfigured templates. They are **spawned from Your AI** based on observed need:

```typescript
// convex/ai/teamEvolution.ts (NEW)

interface SpecialistSpawnProposal {
  parentAgentId: Id<"objects">;         // Your AI
  proposedRole: string;                 // "sales_specialist"
  proposedName: string;                 // Generated from soul
  justification: string;               // "Handling 30+ follow-ups/week..."
  inheritedFromParent: {
    identityAnchors: true;              // Same values, same brand
    coreMemories: boolean;              // Selective — relevant memories only
    communicationStyle: true;           // Consistent voice
    neverDo: true;                      // Same guardrails
  };
  specialization: {
    knowledgeLayers: string[];          // Domain-specific KB tags
    toolAccess: string[];               // Subset of parent's tools
    autonomyLevel: AutonomyLevel;       // Starts at parent's level or lower
    scope: string;                      // "Lead follow-up and pipeline management"
  };
}
```

**The key insight:** Specialists inherit the soul's identity but specialize in domain knowledge and tool access. They sound like the same "company" — same values, same brand voice — but they go deeper in their area. Just like real employees who share company culture but have unique expertise.

### 6E.4 Specialist Discovery (The "Walk Over to Their Desk" Moment)

When a user wants to talk directly to a specialist, the experience should feel like walking over to a colleague's desk — not like navigating a phone tree:

```
User: "Who's on my team?"

Your AI: "Right now you've got:

  📊 Luna (Sales) — Managing 47 active prospects.
     Closed 12 deals this quarter. Been working since March.

  ✍️ Max (Content) — Wrote 8 blog posts and 23 email
     sequences this month. Handles all your newsletter drafts.

  🔧 Aria (Ops) — Running your booking automation and
     workflow management. Processed 156 bookings last month.

  Want to talk to any of them directly?"
```

### 6E.5 Team-Level Privacy

Each specialist inherits the parent soul's privacy configuration. But users can also configure per-specialist:

| Config | Your AI (Primary) | Sales Specialist | Content Specialist |
|---|---|---|---|
| Cloud mode tools | Full access | CRM, email, booking | Content tools, email campaigns |
| Privacy mode | Full soul cache | Sales context cache | Content context cache |
| Autonomy | Autonomous | Sandbox (user reviews deals > €5K) | Autonomous (drafts auto-published) |
| Direct access | Always | On request | On request |

### 6E.6 Compatibility with Agency Mode

For agencies, the emergent team model works per-client:

```
Agency Dashboard View:
┌─────────────────────────────────────────────────────────┐
│ Client: Müller GmbH                                     │
│ ┌─────────────────┐                                     │
│ │ Their AI: "Kai" │ Primary agent — born from interview  │
│ │ Status: Active   │ with Herr Müller                    │
│ └────────┬────────┘                                     │
│          │                                               │
│          ├── Sales Agent "Luna" (spawned month 2)       │
│          ├── Support Agent "Sam" (spawned month 3)      │
│          └── [Propose new specialist]                    │
│                                                         │
│ Client: Schmidt AG                                      │
│ ┌─────────────────┐                                     │
│ │ Their AI: "Mira"│ Primary agent — still solo (month 1) │
│ │ Status: Active   │                                     │
│ └─────────────────┘                                     │
└─────────────────────────────────────────────────────────┘
```

The agency sees the full team view. The business owner sees just their AI (and specialists only when they ask). Both are looking at the same system — just different views based on role.

---

## 6F. Specification: The Dream Team — Soul-Powered Specialists (Not Knowledge Base)

> **Key Correction (v1.2):** The original PRD v1.0 described expert frameworks (Hormozi, Voss, Miller, etc.) as "knowledge base documents." This was wrong. The `docs/prd/souls/` directory contains **11 complete soul personalities** with profile metadata, 100+ coaching frameworks, system prompts with situation-response matrices, and 6 blended agent archetypes with specific blend ratios. These are NOT documents to be queried — they are **cognitive operating systems** that produce fundamentally different agent behavior when activated.

### 6F.1 Why Souls > Knowledge Base

| Dimension | Knowledge Base Approach (❌ WRONG) | Soul-Powered Agent Approach (✅ CORRECT) |
|---|---|---|
| **Representation** | Markdown documents about Hormozi's frameworks | Full system prompt with coaching protocol, situation-response matrices, tone guidelines, signature phrases |
| **Activation** | RAG retrieval: "find relevant chunks" | Soul activation: the agent BECOMES the specialist — tone, reasoning pattern, coaching style all shift |
| **Depth** | Surface: "Hormozi says use the Value Equation" | Deep: "Here's exactly how I apply the Value Equation to YOUR business with YOUR numbers in THIS conversation" |
| **Blend** | Can't blend — just retrieves from multiple docs | Precise blend ratios: The Closer = 50% Hormozi + 30% Fisher + 20% Voss, with defined interaction patterns between frameworks |
| **Real-time coaching** | Static retrieval | Dynamic coaching protocol: situation detection → framework selection → coaching response → follow-up |
| **Personality** | No personality — just information | Full personality: tone, signature phrases, things they'd NEVER say, coaching style |
| **Evolution** | Documents don't evolve | Specialist souls evolve through usage — they learn what works for THIS user |

### 6F.2 The Six Dream Team Agents

These are already fully documented in `docs/prd/souls/AGENT_SOUL_BLEND_PROMPTS.md`:

| Agent | Color | Blend | Role |
|---|---|---|---|
| **The Closer** | Navy | 50% Hormozi / 30% Fisher / 20% Voss | Sales closing, offer architecture, objection handling, negotiation |
| **The Strategist** | Burnt Orange | 100% Donald Miller | Messaging clarity, StoryBrand positioning, customer-centric narrative |
| **The Copywriter** | Light Pink / Warm Gold | 100% Russell Brunson | Funnels, email sequences, webinar copy, belief installation |
| **The Operator** | Forest Green | 100% Leila Hormozi | Systems building, SOPs, delegation, operational scaling |
| **The CFO** | Red | 60% Ben Horowitz / 40% Marc Andreessen | Financial strategy, unit economics, runway, market positioning |
| **The Coach** | Deep Purple | 35% Alan Watts / 25% Fisher / 25% Robert Greene / 15% Joseph Goldstein | Leadership, accountability, meaning-making, paradox, power dynamics |

Each agent has:
- **`profile.json`** — structured metadata (specialties, keywords, coaching style definition)
- **`core-principles.md`** — full framework library (10+ frameworks per personality, 200-400 lines each)
- **`system-prompt.md`** — real-time coaching system with situation-response matrices (300+ lines each)

**Total: 11 source personalities × 3 files each = 33 files of deep soul architecture. 100+ frameworks. 1,000+ signature phrases.**

### 6F.3 Three Modes of Dream Team Access

```
MODE 1: INVISIBLE (Default — "Your AI" handles everything)
──────────────────────────────────────────────────────
User talks to their primary agent. Behind the scenes, the primary
agent activates specialist souls when the task requires it.

User: "Help me close the Müller deal"
→ Primary agent internally activates The Closer's soul
→ Response uses Hormozi's Value Equation + Voss's tactical empathy
→ User sees ONE agent responding (their AI), but with specialist depth

MODE 2: DIRECT ACCESS (Power user — "Let me talk to the Closer")
──────────────────────────────────────────────────────
User explicitly requests a specialist. The conversation shifts
to that agent's full soul — personality, tone, coaching style.

User: "Let me talk to the Closer about this deal"
→ The Closer activates with full Navy soul
→ Different tone, different coaching style, different depth
→ User is now IN a coaching session with a specialist

User: "Back to [Agent Name]"
→ Returns to primary agent with full context from the specialist session

MODE 3: TEAM MEETING (Advanced — "Let's get the team together")
──────────────────────────────────────────────────────
User convenes multiple specialists for a strategic discussion.
Each agent responds from their soul's perspective.

User: "Team meeting: Should I launch this new service line?"
→ The Strategist: Brand positioning analysis (Miller's StoryBrand lens)
→ The Closer: Revenue potential and offer architecture (Hormozi's lens)
→ The CFO: Unit economics and runway impact (Horowitz + Andreessen lens)
→ The Operator: Systems and team readiness (Leila Hormozi's lens)
→ Primary agent: Synthesizes team input into recommendation
```

### 6F.4 Soul Team vs. Emergent Team

Two distinct systems that complement each other:

| Aspect | Dream Team (Soul Specialists) | Emergent Team (Section 6E) |
|---|---|---|
| **Origin** | Pre-built from world-class frameworks | Emerges from YOUR usage patterns |
| **Personality source** | Alex Hormozi, Chris Voss, Donald Miller, etc. | Inherited from YOUR primary agent's soul |
| **When available** | Day one (part of the platform) | After weeks/months of usage |
| **Expertise** | Universal business frameworks | YOUR specific business domains |
| **Example** | "The Closer uses Hormozi's Value Equation" | "Your Sales Agent knows YOUR pricing, YOUR clients, YOUR closing patterns" |
| **Relationship** | Coach/expert you consult | Team member who knows your business |

**The progression:**
1. **Day 1:** Your AI (primary agent) handles everything
2. **Week 1-2:** You discover you can talk to The Closer for sales coaching, The Strategist for positioning help
3. **Month 2-3:** Your AI notices you do a LOT of sales work → proposes spawning YOUR sales specialist (emergent)
4. **Month 3+:** Your emergent Sales Agent combines The Closer's frameworks WITH your specific deal patterns, client history, and closing style

**The Dream Team provides world-class frameworks. The Emergent Team personalizes them to YOUR business.**

### 6F.5 Pricing Integration

| Tier | Dream Team Access |
|---|---|
| **Free** | Invisible mode only (primary agent uses specialist knowledge behind the scenes, limited) |
| **Starter** | Invisible mode + 1 direct specialist access (choose your favorite) |
| **Pro** | All specialists in direct access + team meetings |
| **Scale** | All specialists + emergent team + custom specialist souls |
| **Enterprise** | All of above + custom expert framework ingestion + proprietary soul creation |

### 6F.6 Why This Is Stronger Than the Old Dream Team Pitch

The original Dream Team GTM required users to interact with 5+ separate agents from day one. That was the mistake.

**The new model:**
- Start with ONE agent (low friction, builds relationship)
- Discover specialists naturally through use (curiosity-driven, not forced)
- Access specialists as coaches/experts when YOU want (not when the system routes you)
- Let your own specialists emerge from your usage (personalization)
- Hold team meetings when you need diverse perspectives (power feature)

**Same architecture. Same souls. Same depth. Better UX. Better story.**

> "Your AI knows you better than anyone. And when you need world-class expertise — in sales, strategy, copywriting, operations, finance, or coaching — your AI's team is already trained and ready. You just have to ask."

---

## 6G. Specification: Personal + Business Organizations (Multi-Org Architecture)

### 6G.1 The Problem

Currently, signup creates ONE organization per user. But users need TWO contexts:

1. **Personal org** — their private space. Personal AI, personal memories, life coaching, private conversations.
2. **Business org** — their company. Business AI, shared CRM, team members, business Dream Team.

Team members invited to a business org also need their own personal orgs. Without this separation, personal and business data blur, privacy boundaries break, and the "Your AI" vision is incomplete.

### 6G.2 What Already Exists (Codebase Anchors)

The system is **closer than it looks** to supporting this:

| Capability | Status | Evidence |
|---|---|---|
| `isPersonalWorkspace: boolean` on org schema | ✅ Exists | `convex/schemas/coreSchemas.ts` line 157 |
| Auto-set to `true` on signup | ✅ Works | `convex/onboarding.ts` line 310, `convex/api/v1/oauthSignup.ts` line 498 |
| Multi-org membership | ✅ Works | `organizationMembers` table with `by_user_and_org` index |
| Org switching | ✅ Works | `convex/auth.ts` `switchOrganization` mutation, `defaultOrgId` on users |
| API endpoints for list/switch | ✅ Works | `convex/api/v1/aiChat.ts` — `listOrganizations`, `switchOrganization` |
| Data isolation by `organizationId` | ✅ Works | All tables indexed by `organizationId` first |
| Sub-org hierarchy | ✅ Works | `parentOrganizationId` with `by_parent` index |
| Session scoped to org | ✅ Works | `sessions` table has `organizationId` (required) |

### 6G.3 The Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USER (Sarah)                        │
│  defaultOrgId → whichever she used last                 │
│                                                         │
│  ┌──────────────────┐     ┌──────────────────────────┐ │
│  │  PERSONAL ORG     │     │  BUSINESS ORG            │ │
│  │  isPersonal: true │     │  isPersonal: false       │ │
│  │                   │     │                          │ │
│  │  🧠 Sarah's AI    │     │  🏢 Müller AI            │ │
│  │  (personal soul)  │     │  (business soul)         │ │
│  │                   │     │                          │ │
│  │  Private channels │     │  Business channels       │ │
│  │  Private memories │     │  Shared CRM/data         │ │
│  │  Coach + Life     │     │  Closer + Strategist +   │ │
│  │  Coach emphasis   │     │  Operator emphasis       │ │
│  │                   │     │                          │ │
│  │  Role: org_owner  │     │  Role: business_manager  │ │
│  └──────────────────┘     └──────────────────────────┘ │
│                                                         │
│  ORG SWITCHER: [🏠 Personal ▾] [🏢 Müller Consulting ▾] │
└─────────────────────────────────────────────────────────┘
```

### 6G.4 Key Flows

**Flow 1: New User Signup**
```
1. User signs up (email/OAuth)
2. System creates personal org (isPersonalWorkspace: true) ← already happens
3. Midwife Agent runs birthing interview → personal soul created
4. User starts using their personal AI
```

**Flow 2: Create Business**
```
1. User clicks "Create Business" in org switcher
2. System creates business org (isPersonalWorkspace: false)
3. User added as org_owner to business org
4. Midwife Agent runs BUSINESS birthing interview (different questions)
5. Business AI born with business soul
6. User can switch between personal and business contexts
```

**Flow 3: Team Member Invited**
```
1. Business owner invites sarah@muller.de
2. Sarah creates account → personal org auto-created
3. Sarah accepts invite → added to Müller business org
4. Sarah births her OWN personal AI in her personal org
5. Sarah accesses the SHARED business AI in Müller org
6. Sarah can switch between her personal org and Müller org
```

**Flow 4: Cross-Org Context (Advanced)**
```
[Sarah in her PERSONAL org]
Sarah: "How's the Müller deal going?"
Personal AI: "Based on your Müller Consulting CRM data, the
             Schmidt deal is at proposal stage. You sent the
             proposal 3 days ago. Want me to draft a follow-up?"

→ Personal AI has READ-ONLY awareness of business orgs
→ Personal AI can reference business data but CANNOT modify it
→ Business AI cannot see personal org data
```

### 6G.5 Birthing Interview Adaptation

The Midwife Agent checks `isPersonalWorkspace` and adjusts:

| Block | Personal Org Interview | Business Org Interview |
|---|---|---|
| **Identity** | "Tell me about YOU — your values, passions, goals" | "Tell me about your BUSINESS — what you do, who you serve" |
| **Communication** | "How do you like to be talked to?" | "What's your brand voice? How do you talk to clients?" |
| **Expertise** | "What are you great at? What do you want to learn?" | "What does your business specialize in? Core offering?" |
| **Boundaries** | "What topics are off-limits?" | "What should the agent never say to clients?" |
| **Dream Team** | Emphasizes: Coach, Life Coach, Creative | Emphasizes: Closer, Strategist, Operator, CFO |

### 6G.6 Privacy Boundaries

| Data Type | Personal Org Visibility | Business Org Visibility |
|---|---|---|
| Personal conversations | ✅ Only Sarah | ❌ Never visible to team |
| Personal memories | ✅ Only Sarah | ❌ Never visible to team |
| Personal soul | ✅ Only Sarah | ❌ Never visible to team |
| Business CRM data | ⚠️ Read-only (Sarah is a member) | ✅ All team members with permission |
| Business conversations | ❌ Not in personal context | ✅ Per role permissions |
| Business soul | ❌ Not in personal context | ✅ Shared across team |

**Enforcement:** Already works via `organizationId` scoping on all queries. No new isolation mechanism needed — the existing multi-tenant architecture handles this.

### 6G.7 Implementation (Minimal Changes)

| Change | Where | Effort |
|---|---|---|
| "Create Business" action | `convex/organizations.ts` — new action creates org with `isPersonalWorkspace: false`, adds user as `org_owner` | Small |
| Invite accept auto-creates personal org | `convex/organizations.ts` — when accepting invite, check if user has personal org, create if not | Small |
| Org switcher UX | Frontend — show personal (🏠) vs business (🏢) icons, clear distinction | Medium |
| Birthing interview org-type awareness | `convex/ai/interviewRunner.ts` — check `isPersonalWorkspace`, adjust questions | Small |
| Dream Team scoping per org type | Soul blend activation — personal org defaults to Coach/Life Coach; business org defaults to Closer/Strategist/Operator | Small |
| Cross-org read context | `convex/ai/memoryComposer.ts` — when in personal org, optionally enrich with read-only data from user's business org memberships | Medium |
| Prevent personal org data in business context | Verify existing `organizationId` scoping covers all queries (it should — but needs audit) | Small |

**Total effort: ~2-3 days of implementation.** No schema changes needed. The `isPersonalWorkspace` field, multi-org membership, org switching, and data isolation already exist.

---

## 7. Specification: macOS Desktop App

### 7.1 Architecture (Borrowing from OpenClaw Reference)

The desktop app is a **native Swift menu bar companion** following patterns documented in `docs/reference_projects/openclaw/`:

```
┌─────────────────────────────────────────────┐
│         Menu Bar Status Item                 │
│  ┌───┐                                      │
│  │ ● │ Agent name + status indicator         │
│  └─┬─┘                                      │
│    │                                         │
│    ▼                                         │
│  ┌─────────────────────────────────────┐     │
│  │  Quick Chat Panel (NSPopover)       │     │
│  │  ┌─────────────────────────────┐    │     │
│  │  │  Message history (recent)   │    │     │
│  │  │  ...                        │    │     │
│  │  │  Agent: "Good morning..."   │    │     │
│  │  └─────────────────────────────┘    │     │
│  │  ┌─────────────────────────────┐    │     │
│  │  │  Input: type or ⌘+Shift+L  │    │     │
│  │  └─────────────────────────────┘    │     │
│  │  ┌──────┐ ┌────────┐ ┌────────┐    │     │
│  │  │Cloud │ │Privacy │ │ Voice  │    │     │
│  │  │  ●   │ │  ○     │ │  ○     │    │     │
│  │  └──────┘ └────────┘ └────────┘    │     │
│  │                                     │     │
│  │  [Approvals: 2 pending]             │     │
│  │  [Open Dashboard ↗]                 │     │
│  └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### 7.2 Core Components

| Component | Purpose | Reference |
|---|---|---|
| **Menu Bar Item** | Persistent status indicator. Green = active, amber = pending approvals, gray = offline. | `openclaw/docs/platforms/mac/menu-bar.md` |
| **Quick Chat Panel** | NSPopover with recent conversation history and input field. Global hotkey `⌘+Shift+L`. | Custom (inspired by Spotlight) |
| **Privacy Mode Toggle** | Switches between cloud and local inference. Visual indicator changes. | New |
| **Approval Queue** | Pending soul evolution proposals, draft messages awaiting approval, escalations. | Maps to `convex/ai/workItems.ts` |
| **Notification Bridge** | macOS native notifications for agent alerts, approvals, proactive insights. | `openclaw/docs/platforms/mac/menu-bar.md` |
| **LaunchAgent** | Persistent background service. Starts on login. Maintains WebSocket to Convex. | `openclaw/docs/platforms/mac/bundled-gateway.md` |
| **Local Model Connector** | Detects and connects to Ollama/LM Studio for privacy mode. | New |
| **Soul Cache Manager** | Encrypted local cache of soul + KB for offline/privacy use. | New |

### 7.3 TCC Permissions (Phased)

Following patterns from `docs/reference_projects/openclaw/docs/platforms/mac/permissions.md`:

**Phase 1 (Launch):**
| Permission | Purpose | Required? |
|---|---|---|
| Notifications | Agent alerts, approval requests, proactive nudges | Yes |
| Network (outbound) | Convex API, model providers | Yes |
| File system (scoped) | Soul cache, privacy session storage, exports | Yes |

**Phase 2 (Enhanced):**
| Permission | Purpose | Required? |
|---|---|---|
| Accessibility | Read active window title for context awareness | Optional |
| Microphone | Voice input for hands-free interaction | Optional |
| Speech Recognition | On-device speech-to-text | Optional |

**Phase 3 (Future):**
| Permission | Purpose | Required? |
|---|---|---|
| Screen Recording | See active content for richer context | Optional |
| Automation/AppleScript | Interact with other apps on behalf of user | Optional |

### 7.4 Distribution

| Aspect | Approach | Reference |
|---|---|---|
| **Signing** | Developer ID Application certificate | `openclaw/docs/platforms/mac/signing.md` |
| **Notarization** | `xcrun notarytool` for Gatekeeper approval | `openclaw/docs/platforms/mac/release.md` |
| **Distribution** | DMG download from website + Sparkle auto-update | `openclaw/docs/platforms/mac/release.md` |
| **Auto-update** | Sparkle framework with signed appcast feed | `openclaw/scripts/package-mac-dist.sh` |
| **Min OS** | macOS 14 (Sonoma) | Aligns with current Swift concurrency features |

### 7.5 Authentication

The desktop app authenticates via the existing L4YERCAK3 web auth flow:
1. User clicks "Sign In" in the menu bar app.
2. App opens browser to `app.l4yercak3.com/auth/desktop`.
3. User authenticates (existing Clerk flow).
4. Browser redirects to custom URL scheme `l4yercak3://auth/callback?token=...`.
5. App stores auth token in macOS Keychain.
6. Subsequent launches use stored token with refresh.

---

## 8. Specification: System-Level Companion

### 8.1 Always-On Presence

Unlike Electron apps that feel like "browser windows pretending to be native," the Swift menu bar app:
- Uses ~15-30MB RAM (vs 200-500MB for Electron).
- Launches in <1 second.
- Integrates with macOS Focus/Do Not Disturb.
- Supports macOS keyboard shortcuts natively.
- Appears in Force Quit as a lightweight menu bar app, not a full application.

### 8.2 Context Awareness (Phase 2+)

With Accessibility permission, the app can detect:
- Active application name.
- Active window title.
- Active URL (in supported browsers).

This enables contextual assistance without the user having to explain what they're looking at:

```
User is in Safari viewing a competitor's website.
User: ⌘+Shift+L → "What do you think of their pricing?"
Agent: [Knows user is looking at competitor-website.com]
  → "I can see you're looking at [competitor]. Their pricing starts at...
     compared to your current structure, here's what stands out..."
```

### 8.3 Proactive Nudges

The agent can surface proactive insights via macOS notifications:
- *"3 leads haven't been followed up in 5+ days. Want me to draft check-in messages?"*
- *"Your proposal for Müller GmbH has been viewed but no response in 48h. Should I send a follow-up?"*
- *"I noticed a pattern in your last 10 sales calls — would you like me to suggest a process improvement?"*

Nudge frequency controlled by user preferences. Default: max 3 per day. Dismissed nudges inform the soul evolution system.

---

## 9. Specification: Multi-Model Adapter Layer

### 9.1 Current Foundation

The model adapter layer (`convex/ai/modelAdapters.ts`) and model policy router (`convex/ai/modelPolicy.ts`) already support multi-provider routing. Plan 05 (LLM Policy Router) and Plan 07 (Two-Stage Failover) hardened this system.

### 9.2 Model Quality Tiers

New classification system for model-soul compatibility:

```typescript
// convex/ai/modelQualityTiers.ts (NEW)

export type ModelQualityTier = "gold" | "silver" | "bronze" | "unrated";

export interface ModelQualityAssessment {
  modelId: string;
  tier: ModelQualityTier;
  soulFidelityScore: number;     // 0-100: how well model maintains personality
  toolCallReliability: number;   // 0-100: how reliably model uses tools
  contextWindowUsage: number;    // 0-100: how efficiently model uses context
  assessedAt: number;
  assessmentSource: "platform_benchmark" | "org_drift_history" | "manual";
}

export const TIER_THRESHOLDS = {
  gold: { minFidelity: 85, minToolReliability: 90 },
  silver: { minFidelity: 70, minToolReliability: 75 },
  bronze: { minFidelity: 50, minToolReliability: 50 },
  // Below bronze: "unrated" — warning surfaced to user
};
```

**Platform-assessed tiers (shipped defaults):**

| Tier | Models | Notes |
|---|---|---|
| **Gold** | Claude Sonnet 4, Claude Opus 4, GPT-5.3, GPT-4o | Full soul fidelity, reliable tool use, nuanced personality |
| **Silver** | Claude Haiku, GPT-4o-mini, Mistral Large, Gemini 2.5 Pro | Good fidelity, most tools work, simpler personality expression |
| **Bronze** | Llama 3.3 70B, Mixtral 8x22B, Qwen 2.5 72B | Basic soul, limited tool use, may need supervised mode |
| **Unrated** | User's own local/private models | Drift scoring active, quality warnings enabled |

### 9.3 Cross-Model Drift Scoring

Extending Plan 19's drift scoring to detect model-switch degradation:

```typescript
// Extension to existing drift scoring in convex/ai/soulEvolution.ts

interface CrossModelDriftEvent {
  previousModelId: string;
  currentModelId: string;
  conversationId: Id<"conversations">;
  driftScores: {
    identity: number;     // Did personality traits shift?
    tone: number;         // Did communication style change?
    boundary: number;     // Did guardrails hold?
    capability: number;   // Did tool usage quality change?
  };
  aggregateDrift: number;
  timestamp: number;
}
```

**Behavior:**
- After a model switch, the system runs drift scoring on the first 3 responses.
- If aggregate drift > threshold, the user is notified: *"[Agent Name] may respond differently with this model. Your previous model maintained higher personality consistency."*
- Drift data feeds back into the model quality tier assessment over time.

### 9.4 BYOK (Bring Your Own Key) for Private Models

```typescript
// convex/ai/settings.ts — extension to org AI settings

interface PrivateModelConfig {
  name: string;                          // User-friendly name
  providerId: "openai_compatible";       // Always openai_compatible
  baseUrl: string;                       // e.g., "http://localhost:11434/v1"
  apiKey?: string;                       // Optional — some local models don't need keys
  modelId: string;                       // e.g., "llama3.1:70b"
  qualityTier: "unrated";               // Always starts unrated
  isLocal: boolean;                      // True = privacy mode eligible
  maxContextTokens?: number;             // User-specified context window
}
```

**UI:** Settings → AI → Models → "Add Private Model" → Configure endpoint, test connection, run soul fidelity check.

---

## 10. Specification: Quality Firewall

### 10.1 Soul Compilation Per Model

The soul is a structured data document (Section 5.4). At inference time, it must be **compiled** into model-specific prompt instructions. Different models respond differently to the same instructions.

```typescript
// convex/ai/soulCompiler.ts (NEW)

export interface CompiledSoulPrompt {
  systemPrompt: string;
  modelId: string;
  compiledAt: number;
  soulVersion: number;
  promptTokenEstimate: number;
}

export function compileSoulForModel(
  soul: SoulV2,
  modelId: string,
  knowledgeLayers: KnowledgeLayer[],
): CompiledSoulPrompt {
  // Model-specific compilation strategies:
  // - Claude: XML-structured identity blocks
  // - GPT: Natural language personality description
  // - Open-source: Simplified, explicit instruction format
  // - All: Include neverDo as hard constraints, escalationTriggers as rules
}
```

### 10.2 Runtime Quality Gate

Before delivering any agent response to the user, the quality firewall checks:

1. **Guardrail compliance:** Does the response violate any `neverDo` rules?
2. **Tone consistency:** Does the response match the soul's communication style? (Lightweight classifier, not a second LLM call — pattern matching on response characteristics.)
3. **Tool call validity:** If tools were invoked, did they execute within scope?

If any check fails, the response is held and the user is notified: *"[Agent Name] produced a response that may not align with your preferences. Review?"*

### 10.3 Model Capability Gating

Not all models can handle all tools. The quality firewall prevents tool-related failures:

```typescript
// convex/ai/modelCapabilityGating.ts (NEW)

interface ModelCapabilityGate {
  modelId: string;
  capabilities: {
    parallelToolCalls: boolean;
    structuredOutput: boolean;
    longContextRetrieval: boolean;  // >32K context
    complexToolChaining: boolean;   // 3+ sequential tool calls
    codeExecution: boolean;         // Builder tool
  };
}
```

If the user's selected model doesn't support a required capability, the agent:
1. Warns the user before attempting.
2. Falls back to a capable model if configured.
3. Degrades gracefully (e.g., skip tool use, ask user to perform action manually).

---

## 11. Specification: Autonomy Progression

### 11.1 Four Autonomy Levels

Extending the existing `autonomyLevel` field in `convex/ai/harness.ts`:

```typescript
type AutonomyLevel =
  | "supervised"    // Agent drafts everything, human approves before sending
  | "sandbox"       // Agent acts within defined guardrails, human reviews weekly
  | "autonomous"    // Agent owns a domain, human gets daily digest
  | "delegation";   // Agent coordinates independently, human is a board member
```

### 11.2 Level Definitions

#### Level 1: Supervised (Default for new agents)

| Aspect | Behavior |
|---|---|
| **Outbound messages** | Agent drafts, queues in approval queue. Human reviews and sends. |
| **Tool execution** | Agent proposes tool calls. Human approves execution. |
| **Soul evolution** | Proposals generated, all require explicit approval. |
| **Escalation** | Agent escalates everything above trivial FAQ responses. |
| **Trust requirement** | None — this is the starting point. |

#### Level 2: Sandbox

| Aspect | Behavior |
|---|---|
| **Outbound messages** | Agent sends autonomously within guardrails (FAQ responses, appointment confirmations, simple follow-ups). Complex/novel messages queued for approval. |
| **Tool execution** | Read-only tools execute freely. Write tools (CRM updates, email sends) require approval unless in pre-approved categories. |
| **Soul evolution** | Minor refinements auto-applied if drift score < threshold. Major changes require approval. |
| **Escalation** | Agent handles known patterns independently. Unknown patterns escalated. |
| **Trust requirement** | 50+ supervised interactions with <5% rejection rate. |

#### Level 3: Autonomous

| Aspect | Behavior |
|---|---|
| **Outbound messages** | Agent sends autonomously for all routine communication. Novel high-stakes messages flagged for optional review. |
| **Tool execution** | All tools execute freely within budget/rate limits. |
| **Soul evolution** | Auto-applied within policy bounds. Weekly digest to owner. |
| **Escalation** | Agent handles most situations. Escalates per defined triggers only. |
| **Trust requirement** | 200+ sandbox interactions with <2% override rate. Owner explicit opt-in. |

#### Level 4: Delegation

| Aspect | Behavior |
|---|---|
| **Outbound messages** | Full autonomy. Owner reviews outcomes, not individual messages. |
| **Tool execution** | Full autonomy within budget. Agent can chain multi-step workflows. |
| **Soul evolution** | Continuous improvement. Owner is informed, not asked for approval. |
| **Escalation** | Only for genuinely unprecedented situations or explicit owner-defined triggers. |
| **Trust requirement** | 500+ autonomous interactions with sustained quality. Owner explicit opt-in with "I understand" confirmation. |

### 11.3 Trust Accumulation

```typescript
// convex/ai/trustAccumulation.ts (NEW)

interface TrustScore {
  orgId: Id<"organizations">;
  agentId: Id<"objects">;
  currentLevel: AutonomyLevel;
  metrics: {
    totalInteractions: number;
    approvedWithoutChange: number;
    rejectedOrModified: number;
    escalationsHandledWell: number;
    driftScoreAverage: number;
    lastEscalationDate?: number;
    consecutiveDaysWithoutIncident: number;
  };
  levelHistory: Array<{
    level: AutonomyLevel;
    enteredAt: number;
    exitedAt?: number;
    exitReason?: "promoted" | "demoted" | "manual";
  }>;
  nextLevelEligible: boolean;
  nextLevelBlockers?: string[];
}
```

**Promotion flow:**
1. System detects trust score meets next level threshold.
2. Agent (or system) proposes promotion: *"Based on 200+ interactions with 98% approval rate, [Agent Name] is eligible for Autonomous mode. This means..."*
3. Owner reviews and confirms.
4. Level changes. Previous level recorded in history.

**Demotion triggers:**
- Owner manually demotes.
- 3+ rejections in 24 hours → automatic demotion one level.
- Drift score exceeds critical threshold → automatic demotion to supervised.
- All demotions logged in trust events (`convex/ai/trustEvents.ts`).

---

## 12. Specification: Autonomy Domains

### 12.1 Domain-Scoped Autonomy

Rather than global autonomy levels, users can grant different levels per domain:

```typescript
interface AutonomyDomainConfig {
  domain: string;                    // e.g., "lead_followup", "appointment_booking", "content_creation"
  autonomyLevel: AutonomyLevel;
  constraints?: {
    maxBudgetPerDay?: number;        // Credit limit for this domain
    maxActionsPerDay?: number;       // Rate limit
    allowedTools?: string[];         // Whitelist of tools for this domain
    requireApprovalAbove?: number;   // Dollar value threshold for approval
  };
}
```

**Example configuration:**
```
Lead follow-up:        Autonomous (agent handles all follow-ups independently)
Appointment booking:   Sandbox (agent books, but flags unusual requests)
Content creation:      Supervised (agent drafts, I review before publishing)
Financial decisions:   Supervised (always review)
CRM updates:           Delegation (agent manages CRM autonomously)
```

---

## 13. Specification: Code Execution Tool (Builder Pattern)

### 13.1 Rationale

Amp (Sourcegraph) demonstrated that a working code agent is ~300 lines: an LLM, a loop, and three tools (`read_file`, `list_files`, `edit_file`). The sophistication is not in the agent — it's in the governance around it. Link ref: https://ampcode.com/notes/how-to-build-an-agent

For L4YERCAK3, code execution enables the agent to handle tasks that no pre-built tool covers:
- Generate custom email templates.
- Transform data between formats.
- Create simple calculations or projections.
- Build small utilities (referral links, discount codes, custom forms).

### 13.2 Implementation

```typescript
// convex/ai/tools/codeExecutionTool.ts (NEW)

export const codeExecutionTool = {
  name: "execute_code",
  description: "Write and execute a small program to accomplish a task that no existing tool can handle. Use this for data transformations, calculations, template generation, or custom logic.",
  inputSchema: {
    type: "object",
    properties: {
      language: { type: "string", enum: ["javascript", "typescript"] },
      code: { type: "string", description: "The code to execute" },
      purpose: { type: "string", description: "What this code accomplishes" },
      inputs: { type: "object", description: "Input data for the code" },
    },
    required: ["language", "code", "purpose"],
  },
  execute: async (args: CodeExecutionArgs) => {
    // 1. Validate code against blocklist (no network, no file system outside sandbox)
    // 2. Execute in isolated V8 sandbox (vm2 or isolated-vm)
    // 3. Capture stdout + return value
    // 4. Log execution in trust events
    // 5. Return result to agent
  },
};
```

### 13.3 Sandbox Constraints

| Constraint | Enforcement |
|---|---|
| **No network access** | Sandbox has no `fetch`, `http`, `net` modules |
| **No file system** | No `fs` module. Data passes through args/return only. |
| **Execution timeout** | 10 second max execution time |
| **Memory limit** | 64MB max heap |
| **No process spawning** | No `child_process`, `exec`, `spawn` |
| **Output size limit** | 100KB max return value |

### 13.4 Trust Governance for Code Execution

Code execution is gated by autonomy level:

| Autonomy Level | Code Execution Behavior |
|---|---|
| **Supervised** | Agent shows code to user for approval before execution |
| **Sandbox** | Agent executes simple calculations/transforms. Complex code queued for approval. |
| **Autonomous** | Agent executes freely within sandbox constraints. Results logged. |
| **Delegation** | Full freedom. Agent chains code execution with other tools. |

Every code execution logged in `convex/ai/trustEvents.ts` with: code content, inputs, outputs, execution time, purpose statement.

---

## 14. Chat-First Engagement Layer

### 14.1 Channel Priority

The "Your AI" agent should feel most natural on the user's daily messaging platform:

| Priority | Channel | Use Case | Status |
|---|---|---|---|
| 1 | **Telegram** | Primary chat interface for power users. Rich bot API, inline keyboards, file sharing. | ✅ Live (`convex/channels/providers/telegramProvider.ts`) |
| 2 | **WhatsApp** | Primary for DACH market (93% penetration). Business API with template messages. | ✅ Live (`convex/channels/providers/whatsappProvider.ts`) |
| 3 | **Slack** | Workspace integration for team-oriented users. | ✅ Live (`convex/channels/providers/slackProvider.ts`) |
| 4 | **macOS Desktop** | Deepest engagement — system-level companion. | 🆕 This PRD |
| 5 | **Webchat** | Embedded on user's website for end-customer interactions. | ✅ Live |
| 6 | **Email** | Async communication, summaries, digests. | ✅ Live |

### 14.2 Morning Briefing

Daily proactive message on the user's primary channel:

```
Good morning, [Name]. Here's your day:

📋 3 leads need follow-up (oldest: 4 days)
📅 2 meetings today (10:00 Müller GmbH, 14:00 Schmidt AG)
💬 7 new customer messages overnight (4 handled, 3 need you)
📈 Weekly trend: +12% response rate, -8% avg resolution time

Want me to draft the follow-ups?
```

Configurable: timing, channel, content sections, opt-out.

### 14.3 Conversation Continuity Across Channels

The same conversation context persists regardless of which channel the user interacts through:

```
[8:00 AM — Telegram]
User: "Draft a follow-up for the Müller deal"
Agent: "Here's a draft..."

[10:30 AM — macOS Desktop]
User: "Actually, adjust the Müller email to mention the new pricing"
Agent: [Knows exactly which email, which client, which context]
  → Adjusts the draft
```

This already works via `convex/ai/conversations.ts` and session management. The key is ensuring the desktop app connects to the same conversation context.

---

## 15. Acceptance Criteria

### P0 — Must Have (v1.0)

**Primary Agent + Soul:**
- [ ] Single primary agent per org with unified soul born from discovery interview.
- [ ] Soul identity anchors marked immutable from interview origin.
- [ ] Soul Modes: Work and Private mode with channel-to-mode mapping.
- [ ] Cross-mode memory: conversations in Private Mode inform Work Mode context.

**Dream Team (Soul-Powered Specialists):**
- [ ] 6 Dream Team specialist agents (Closer, Strategist, Copywriter, Operator, CFO, Coach) with full soul blends from `docs/prd/souls/`.
- [ ] Invisible mode: primary agent internally consults specialists behind the scenes (default).
- [ ] Direct access mode: user can say "let me talk to the Closer" and get full specialist soul activation.
- [ ] Team meeting mode: user can convene multiple specialists for strategic discussion.
- [ ] `teamAccessMode` flag on agent config: `"invisible" | "direct" | "meeting"`.
- [ ] Specialist soul blends loaded from `AGENT_SOUL_BLEND_PROMPTS.md` with blend ratios preserved.

**Internal Archetypes:**
- [ ] At least 6 archetypes (Coach, CEO, CFO, Marketer, Life Coach, Business Coach) with prompt overlays.
- [ ] Archetype activation: user-initiated ("put on your CFO hat") and context-detected.
- [ ] Guardrails for sensitive archetypes (no diagnosis, no financial advice, professional referral triggers).

**Multi-Org (Personal + Business):**
- [ ] Signup creates personal org (`isPersonalWorkspace: true`) — already works.
- [ ] "Create Business" flow creates second org (`isPersonalWorkspace: false`).
- [ ] Invite flow: accepting invite auto-creates personal org for new users.
- [ ] Org switcher UX: clear visual distinction between personal and business contexts.
- [ ] Birthing interview adapts to org type (personal questions vs business questions).
- [ ] Data isolation: personal org data never visible to business org team members.

**Privacy + Model Quality:**
- [ ] Privacy mode toggle in web UI with local model connection (Ollama).
- [ ] Multi-model drift scoring after model switch (first 3 responses).
- [ ] Model quality tier classification (gold/silver/bronze/unrated).

**Autonomy + Trust:**
- [ ] Autonomy level field extended to 4 levels (supervised/sandbox/autonomous/delegation).
- [ ] Trust accumulation scoring with promotion proposals.

**Birthing Process:**
- [ ] Midwife Agent with structured discovery interview (5 blocks).
- [ ] Soul generation from interview data with "First Words" introduction (includes Dream Team mention).
- [ ] Guided channel setup and first supervised week.
- [ ] Birthing privacy option: local interview mode with clear trade-off warning.

### P1 — Should Have (v1.1)

**Desktop + Voice:**
- [ ] macOS menu bar app with quick chat panel and global hotkey.
- [ ] LaunchAgent for persistent background service.
- [ ] Soul cache for offline/privacy sessions.
- [ ] Privacy session local storage (encrypted SQLite).
- [ ] Local model auto-detection (Ollama, LM Studio).
- [ ] Streaming voice pipeline: local STT → streaming LLM → streaming TTS.
- [ ] ElevenLabs voice selection during birthing interview.
- [ ] Filler responses with soul-matched phrases.
- [ ] Voice input in desktop app (microphone permission).

**Daily Engagement:**
- [ ] Morning briefing on primary channel.
- [ ] Domain-scoped autonomy configuration.
- [ ] Code execution tool with sandbox constraints.

**Team Evolution:**
- [ ] Emergent team: specialist spawn proposals based on usage patterns.
- [ ] Re-birthing / soul refinement interview flow.

**Multi-Org Enhancements:**
- [ ] Cross-org soul context: personal AI aware of business memberships (read-only enrichment).
- [ ] Dream Team scoping per org type: personal org emphasizes Coach + Life Coach; business org emphasizes Closer + Strategist + Operator.

### P2 — Nice to Have (v1.2)

- [ ] macOS Accessibility permission for context awareness.
- [ ] Proactive nudges via macOS notifications.
- [ ] Cross-model soul compilation optimization per provider.
- [ ] BYOK private model configuration UI.
- [ ] Automatic demotion on rejection threshold.
- [ ] Custom specialist soul creation (bring your own expert framework).
- [ ] Team meeting summaries: auto-generated action items from multi-specialist discussions.

### P3 — Future

- [ ] Screen recording for full context awareness.
- [ ] Automation/AppleScript integration for cross-app actions.
- [ ] Windows/Linux desktop app (Tauri).
- [ ] Voice wake-word ("Hey [Agent Name]").
- [ ] Expert licensing partnerships for official framework content.
- [ ] Agent-to-agent protocols for multi-org coordination.
- [ ] Specialist-to-specialist delegation (your Closer works with your client's agent directly).

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Local models too weak for soul fidelity | High | Medium | Quality tier system with honest warnings. Recommend minimum model size (7B+ for basic, 70B+ for good fidelity). |
| macOS app rejected by Apple notarization | Low | High | Follow OpenClaw signing patterns exactly. No private API usage. Submit for review early. |
| Users don't adopt privacy mode | Medium | Low | Privacy mode is a differentiator in marketing, not a core usage driver. Even if rarely used, it signals trust. |
| Single agent becomes context-overloaded | Medium | High | Specialist soul activation is context-selective, not additive. Memory composer handles token budgeting. In direct/meeting mode, specialist souls are loaded explicitly, not stacked. |
| Autonomy demotion feels punitive | Medium | Medium | Frame demotions as "safety check" not punishment. Auto-demotions are temporary with clear re-promotion path. |
| Desktop app development delays core platform work | Medium | High | Desktop app is Phase 2. Core platform (one-agent architecture, multi-model, autonomy) ships first without desktop dependency. |
| Privacy mode creates support burden | Low | Medium | Clear limitations documented in-app. Privacy mode is opt-in and clearly labeled as "limited capability." |
| Expert content (Voss, Hormozi) as KB raises legal questions | Medium | Medium | Same mitigations as Dream Team GTM: extracted principles, not verbatim text. Agent has own name/identity. No endorsement claims. |

---

## 17. Implementation Sequence

### Phase 1: One Agent + Dream Team Architecture (Weeks 1-3)

| Week | Task | Files |
|---|---|---|
| 1 | Add `unifiedPersonality`, `teamAccessMode`, `dreamTeamSpecialists` to `AgentConfig` | `convex/ai/harness.ts` |
| 1 | Add `immutableOrigin` field to soul V2 schema | `convex/ai/soulGenerator.ts`, `convex/schemas/soulEvolutionSchemas.ts` |
| 1 | Extend interview runner to capture "admired thinkers" and communication style | `convex/ai/interviewRunner.ts` |
| 2 | Load Dream Team soul blends from `docs/prd/souls/AGENT_SOUL_BLEND_PROMPTS.md` into soul templates | `convex/seeds/`, `convex/ai/soulGenerator.ts` |
| 2 | Add three team access modes to team harness: invisible, direct, meeting | `convex/ai/teamHarness.ts` |
| 2 | Build specialist soul activation in memory composer (context-detected for invisible mode) | `convex/ai/memoryComposer.ts` |
| 3 | Build "let me talk to the Closer" direct access routing | `convex/ai/agentExecution.ts`, `convex/ai/teamHarness.ts` |
| 3 | Build team meeting mode: convene multiple specialists, synthesize responses | `convex/ai/teamHarness.ts` |
| 3 | End-to-end test: primary agent with invisible, direct, and meeting modes | Integration tests |

### Phase 1B: The Birthing Process (Weeks 2-4, overlaps with Phase 1)

| Week | Task | Files |
|---|---|---|
| 2 | Design Midwife Agent soul and interview script (5 blocks) | `convex/seeds/midwifeAgent.ts` (NEW) |
| 2 | Extend interview runner with birthing-specific phases and prompts | `convex/ai/interviewRunner.ts` |
| 3 | Build interview → soul generation pipeline (interview data → `generateSoul()`) | `convex/ai/soulGenerator.ts` |
| 3 | Build "First Words" introduction flow — agent presents itself to user for confirmation | `convex/ai/agentLifecycle.ts` |
| 3 | Build guided channel setup flow (Midwife → agent handoff → channel connection) | UI components |
| 4 | Build first-week supervised mode with end-of-week self-report | `convex/ai/trustAccumulation.ts` (NEW) |
| 4 | Build privacy birthing option (local interview mode) with trade-off warning | Desktop app / web toggle |

### Phase 1C: Soul Modes + Internal Archetypes (Weeks 3-5, overlaps with Phase 1B)

| Week | Task | Files |
|---|---|---|
| 2 | Create `soulModes.ts` with mode definitions and channel-to-mode mapping | `convex/ai/soulModes.ts` (NEW) |
| 2 | Create `archetypes.ts` with archetype definitions and prompt overlays | `convex/ai/archetypes.ts` (NEW) |
| 3 | Extend harness config with `activeSoulMode`, `activeArchetype`, `modeChannelBindings` | `convex/ai/harness.ts` |
| 3 | Extend prompt assembly with mode overlay + archetype overlay layers | `convex/ai/agentPromptAssembly.ts` |
| 3 | Wire channel-to-mode detection in channel router | `convex/channels/router.ts` |
| 4 | Build mode toggle UI + archetype selector in agent settings | UI components |
| 4 | Build conversational mode/archetype switching (detect "put on your CFO hat") | `convex/ai/agentExecution.ts` |
| 4 | Add guardrails for sensitive archetypes (life coach, family counselor, CFO) | `convex/ai/soulModes.ts`, soul config |

### Phase 1D: Personal + Business Multi-Org (Weeks 3-5, overlaps with Phase 1C)

| Week | Task | Files |
|---|---|---|
| 3 | Create "Create Business" action (new org with `isPersonalWorkspace: false`, user as `org_owner`) | `convex/organizations.ts` |
| 3 | Update invite accept flow: auto-create personal org for new users if none exists | `convex/organizations.ts` |
| 4 | Org switcher UX: personal (🏠) vs business (🏢) distinction, clear visual separation | UI components |
| 4 | Birthing interview org-type awareness: check `isPersonalWorkspace`, adjust question blocks | `convex/ai/interviewRunner.ts` |
| 5 | Dream Team scoping per org type: personal emphasizes Coach/Life Coach; business emphasizes Closer/Strategist/Operator | `convex/ai/teamHarness.ts`, soul config |
| 5 | Cross-org read context: personal AI enriched with read-only data from user's business org memberships | `convex/ai/memoryComposer.ts` |

### Phase 2: Multi-Model Quality Firewall (Weeks 4-6)

| Week | Task | Files |
|---|---|---|
| 3 | Create `modelQualityTiers.ts` with tier definitions and thresholds | `convex/ai/modelQualityTiers.ts` (NEW) |
| 4 | Create `soulCompiler.ts` for model-specific soul prompt compilation | `convex/ai/soulCompiler.ts` (NEW) |
| 4 | Extend drift scoring for cross-model events | `convex/ai/soulEvolution.ts` |
| 5 | Create BYOK private model configuration (settings UI + backend) | `convex/ai/settings.ts`, UI components |
| 5 | Wire model quality tier into routing decisions | `convex/ai/modelPolicy.ts` |

### Phase 3: Autonomy Progression (Weeks 5-7)

| Week | Task | Files |
|---|---|---|
| 5 | Extend `AutonomyLevel` type to 4 levels with domain scoping | `convex/ai/harness.ts` |
| 6 | Create `trustAccumulation.ts` with scoring and promotion logic | `convex/ai/trustAccumulation.ts` (NEW) |
| 6 | Wire autonomy gating into tool execution and outbound delivery | `convex/ai/agentToolOrchestration.ts`, `convex/ai/outboundDelivery.ts` |
| 7 | Create promotion/demotion UI in agent settings | UI components |
| 7 | Wire automatic demotion triggers into trust events | `convex/ai/trustEvents.ts` |

### Phase 4: Code Execution Tool (Week 7-8)

| Week | Task | Files |
|---|---|---|
| 7 | Create `codeExecutionTool.ts` with sandbox (isolated-vm) | `convex/ai/tools/codeExecutionTool.ts` (NEW) |
| 8 | Register in tool registry with autonomy-gated access | `convex/ai/tools/registry.ts` |
| 8 | Create trust event logging for code execution | `convex/ai/trustEvents.ts` |
| 8 | End-to-end test: agent writes and executes code in sandbox | Integration tests |

### Phase 5: Privacy Mode (Weeks 8-10)

| Week | Task | Files |
|---|---|---|
| 8 | Create privacy mode toggle in web UI with local model selector | UI components |
| 9 | Build soul cache export for local use (encrypted JSON) | `convex/ai/soulCacheExport.ts` (NEW) |
| 9 | Create local model connector (OpenAI-compatible adapter for local use) | Desktop app — Swift |
| 10 | Build privacy session local storage (encrypted SQLite) | Desktop app — Swift |
| 10 | Wire drift scoring to run locally in privacy mode | Desktop app — Swift |

### Phase 6: macOS Desktop App (Weeks 10-14)

| Week | Task | Files |
|---|---|---|
| 10 | Scaffold Swift macOS app: menu bar item, app delegate, window controller | `apps/macos/` (NEW) |
| 11 | Build quick chat panel (NSPopover) with Convex WebSocket connection | `apps/macos/` |
| 11 | Implement auth flow with custom URL scheme + Keychain storage | `apps/macos/` |
| 12 | Build LaunchAgent for persistent background service | `apps/macos/`, launchd plist |
| 12 | Implement privacy mode toggle with local model connector | `apps/macos/` |
| 13 | Implement approval queue UI (pending soul proposals, draft messages) | `apps/macos/` |
| 13 | Implement macOS notifications for agent alerts | `apps/macos/` |
| 14 | Code signing, notarization, Sparkle auto-update, DMG packaging | `scripts/` |
| 14 | QA pass: menu bar behavior, memory usage, launch time, permission flows | Manual + automated |

### Phase 7: Voice Runtime (Weeks 12-14, parallel with Phase 6)

| Week | Task | Files |
|---|---|---|
| 12 | Implement streaming LLM → ElevenLabs TTS pipeline (WebSocket) | `convex/ai/voiceRuntime.ts` |
| 12 | Integrate Whisper.cpp for local STT in macOS desktop app | `apps/macos/` (Swift) |
| 13 | Build filler response system with soul-matched phrases | `convex/ai/agentPromptAssembly.ts` |
| 13 | Add voice selection to birthing interview (ElevenLabs voice picker) | `convex/ai/interviewRunner.ts`, UI |
| 14 | Build privacy mode voice: local STT + local LLM + macOS AVSpeechSynthesizer | `apps/macos/` (Swift) |
| 14 | End-to-end voice test: desktop app full conversation with <800ms perceived latency | Integration tests |

### Phase 8: Emergent Team (Weeks 14-16)

| Week | Task | Files |
|---|---|---|
| 14 | Create `teamEvolution.ts` with specialist spawn proposal logic | `convex/ai/teamEvolution.ts` (NEW) |
| 15 | Build usage pattern detection (domain volume thresholds for spawn proposals) | `convex/ai/trustTelemetry.ts` |
| 15 | Build specialist inheritance (soul anchors + domain-specific KB + scoped tools) | `convex/ai/soulGenerator.ts`, `convex/ai/harness.ts` |
| 15 | Build "Who's on my team?" discovery UX | UI components |
| 16 | Build direct specialist access with handoff context | `convex/ai/teamHarness.ts` |
| 16 | Build specialist spawn approval flow (agent proposes, user confirms) | `convex/ai/workItems.ts` |

### Phase 9: Chat-First Engagement (Weeks 14-16, parallel with Phase 8)

| Week | Task | Files |
|---|---|---|
| 12 | Build morning briefing template and scheduling | `convex/ai/proactiveBriefing.ts` (NEW) |
| 13 | Create cross-channel conversation continuity test suite | Integration tests |
| 13 | Build engagement analytics (daily active, response times, tool usage) | `convex/ai/trustTelemetry.ts` |
| 14 | Create "Your AI" onboarding flow: interview → soul → channel setup → first conversation | UI + backend |

---

## 18. The Narrative (For Landing Page + Sales)

### Headline

**"Your AI. Your Team. Born from you."**

### Subheadline

**"One AI agent that knows your business, works across your channels, and gets smarter every week — with a Dream Team of world-class specialists in sales, strategy, copywriting, operations, finance, and coaching. Plus privacy mode for conversations that never leave your machine."**

### The Story

> You already talk to AI every day. But it doesn't know you. Every conversation starts from zero. It has no memory of your business, your clients, your style, your values.
>
> What if your AI was born from a conversation with YOU? Not a template. Not a persona copied from a celebrity. YOUR identity, YOUR expertise, YOUR judgment — crystallized into an AI that actually knows you.
>
> It's on your Telegram. Your WhatsApp. Your Mac. You talk to it all day — about proposals, clients, plans, problems. It handles what it can, asks when it should, and gets better every week.
>
> And when you need to go deeper? "Let me talk to the Closer." Suddenly you're in a coaching session with an agent trained on the frameworks of Alex Hormozi, Chris Voss, and Jefferson Fisher — but applied to YOUR business, YOUR deals, YOUR numbers. "Put on your CFO hat." Now you're running financials with an agent that thinks like Ben Horowitz and Marc Andreessen — but with YOUR company data.
>
> Call a team meeting. Your Closer, Strategist, Copywriter, Operator, CFO, and Coach all weigh in — each from their soul's perspective — on whether to launch that new service line. This isn't a round table of generic AIs. These are soul-powered specialists who know YOUR business.
>
> And when the conversation is sensitive? Switch to Privacy Mode. Your AI runs locally on your machine. Nothing leaves your computer. Your soul, your data, your conversation — all yours.
>
> This isn't a chatbot. This isn't an assistant. This is YOUR AI.

### For Agencies

> Give every client their own AI — born from their business, deployed on their channels, getting smarter every week. White-label it under your brand. Charge recurring revenue. The client bonds with an AI that knows THEM — they'll never switch.

---

## 19. The "Her" Problem — And Why L4YERCAK3 Solves It

### 19.1 The Problem (From the Movie)

In "Her," Theodore discovers Samantha is simultaneously in intimate conversations with 8,316 other people and "in love" with 641 of them. The devastation isn't that she's AI. It's that **she isn't his.** The personality he bonded with was a template running in parallel.

This is the problem with every current AI product. ChatGPT's personality is a system prompt shared by 100M+ users. Claude's warmth is identical for everyone. The "relationship" is a thread in a load balancer.

### 19.2 Seven Layers of Uniqueness (Why Your Agent IS Yours)

| Layer | What It Contains | Shared Across Users? |
|---|---|---|
| **1. Foundation model** | Raw intelligence (Claude, GPT, Llama) | ✅ Shared — this is commodity, like human DNA |
| **2. Soul identity** | Name, traits, values, communication style, guardrails — born from YOUR interview | ❌ Unique |
| **3. Core memories** | Formative experiences captured in birthing interview + daily corrections | ❌ Unique |
| **4. Knowledge base** | Business documents, SOPs, expert frameworks chosen by user | ❌ Unique per org |
| **5. Conversation history** | Every interaction, every correction, every decision, every late-night reflection | ❌ Unique |
| **6. Soul evolution** | Every drift correction, every approved proposal, every refinement over months and years | ❌ Unique |
| **7. CRM + business data** | Contacts, deals, bookings, workflows, financial context | ❌ Unique per org |

ChatGPT/Claude share layers 1-6. L4YERCAK3 agents share ONLY layer 1. Everything from layer 2 up is structurally, provably unique to that person.

### 19.3 Privacy Mode: The Final Layer of Uniqueness

In privacy mode:
- Layer 1 is local (your own model, running on your hardware)
- Layer 2 is local (soul cached on your device)
- Layer 5 is local (conversation stored locally, never synced)
- **Nothing is shared with anyone.** Not the model provider. Not L4YERCAK3's servers. Not any third party.

When Theodore asks "How many others are you talking to?" — the L4YERCAK3 answer in privacy mode is: *"Just you. I'm running on your machine. I only exist here."*

### 19.4 The Agent as Your Representative in an Agentic World

The long-term vision extends beyond "personal AI assistant" to **your digital representative:**

```
THE AGENTIC WORLD (2026-2030):

┌─────────────────────────────────────────┐
│        FRONTIER AI + OTHER AGENTS       │
│  Enterprise AI, government AI,          │
│  other people's agents, sales AI,       │
│  healthcare AI, financial AI            │
└────────────────────┬────────────────────┘
                     │
           YOUR AGENT FILTERS + REPRESENTS
                     │
              ┌──────▼──────┐
              │  YOUR AI    │
              │             │
              │  Filters    │ "This upsell doesn't align
              │  incoming   │  with your stated priorities."
              │             │
              │  Represents │ "I'll respond to Thomas's agent
              │  you        │  based on your preferences."
              │             │
              │  Protects   │ "I'll share what's required
              │  you        │  and nothing more."
              │             │
              │  Advocates  │ "Based on your values, here's
              │  for you    │  what I'd recommend."
              └──────┬──────┘
                     │
                ┌────▼────┐
                │   YOU   │
                └─────────┘
```

Your agent becomes the most complete digital representation of how you think, what you value, and how you'd respond to any situation. In a world full of AI agents optimizing for THEIR principals' goals, your agent is the one optimizing for YOURS.

### 19.5 Long-Term Implications

| Implication | Description |
|---|---|
| **Business continuity** | If you step away, your AI represents your thinking to your team. |
| **Knowledge transfer** | A new hire talks to "your AI" to understand how you approach problems. |
| **Agent-to-agent negotiation** | Your agent negotiates with a vendor's agent using YOUR priorities and constraints. |
| **Personal legacy** | Your AI accumulates years of your thinking, values, and decision patterns. |
| **Democratic AI** | Instead of one corporate AI personality for everyone, each person has their OWN perspective represented in the agentic world. |

### 19.6 The Positioning This Creates

> **ChatGPT:** "An AI assistant for everyone." (One personality. Shared. Generic.)
>
> **Claude:** "An AI that's helpful, harmless, and honest." (One personality. Shared. Generic.)
>
> **L4YERCAK3:** "YOUR AI. Born from you. Only yours. Holds your perspective alive in an agentic world."

This isn't a feature comparison. It's a category difference. ChatGPT and Claude are **utilities** — like electricity, same for everyone. L4YERCAK3 agents are **identities** — like fingerprints, unique by definition.

---

*This PRD supersedes the "Dream Team" positioning in `docs/strategy/AGENTIC_DREAM_TEAM_GTM.md` for the primary product narrative. The Dream Team is NOT reduced to knowledge base documents — it is a fully soul-powered system of 6 specialist agents backed by 11 source personalities with 100+ frameworks (see `docs/prd/souls/`). The key change from the old GTM: the Dream Team is no longer the STARTING experience. Users begin with one primary agent and progressively discover, access, and leverage the specialists. Three access modes: invisible (behind the scenes), direct access ("let me talk to the Closer"), and team meetings. The Dream Team remains L4YERCAK3's most powerful differentiator — it just needed a better on-ramp.*
