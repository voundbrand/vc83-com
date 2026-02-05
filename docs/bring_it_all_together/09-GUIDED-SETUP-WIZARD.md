# 09 — Builder Setup Mode (formerly "Guided Setup Wizard")

> **UPDATE 2026-02-03:** This document has been rewritten. The standalone 5-step wizard component (`agent-setup-wizard.tsx`) is **scrapped**. The builder chat panel IS the setup wizard. When an agency owner clicks "New Agent," they land in the builder in "setup mode" — a specialized context that knows how to interview, generate agent config, create KB docs, and optionally build a portal, all in one session. The interview flow, knowledge frameworks, and KB document generation concepts from the original spec still apply — only the UI container changed.

> Conversational agent onboarding via the builder. The builder AI uses the system knowledge library to walk the agency owner through creating a tailored AI employee — for any vertical, in ~25 minutes.

---

## Why the Builder, Not a Standalone Wizard?

The original plan was a 5-step stepper component (`agent-setup-wizard.tsx`) with its own UI. That's wrong for four reasons:

1. **No duplicate UI** — The builder already has chat, file generation, file explorer, preview, connect, and deploy. A wizard would duplicate most of this.
2. **One session, many outputs** — Agent config + KB docs + optional client portal, all in one builder session. A standalone wizard can't generate a portal.
3. **Knowledge-driven, not step-driven** — The system knowledge library powers a natural conversation, not rigid step transitions. The builder's free-form chat is the right container.
4. **The connect step already handles wiring** — Agent creation, KB doc saving, channel binding, scaffold generation — all via the existing connect pipeline. No custom wizard logic needed.

**The key insight:** The builder is already a conversational AI interface. Adding "agent setup" is just adding a new mode/context to that same interface, not building a second one.

---

## Why Not Just the Existing Config Form?

The agent config window works. It has every field. But it's a form, not a flow. The agency owner sees 5 sections with 30+ fields and doesn't know where to start.

The builder in setup mode turns it into a **conversation-driven journey**:

| Phase | What Happens | Time |
|-------|-------------|------|
| Interview | Builder AI interviews agency owner using system knowledge frameworks | ~10 min |
| Generation | Files appear in file explorer: agent-config.json + 8 KB docs | Automatic |
| Review | Agency reviews, tweaks via chat or direct file editing | ~5 min |
| Portal (optional) | "Also build me a client portal" → portal pages in same session | ~5 min |
| Connect | Connect step creates agent, saves KB docs, binds channels | ~3 min |
| Activate | Agent goes live in supervised mode | ~2 min |

**Total: ~25 minutes** from zero to live agent.

---

## The Builder Setup Mode Flow

```
Agency owner clicks "New Agent" (or "New Project" with agent template)
    |
    v
Builder opens in SETUP MODE
  - BuilderUIMode = "setup" (new mode alongside "auto", "connect", "publish", "docs")
  - System prompt loaded with SETUP_MODE knowledge (all 15 files via getKnowledgeContent("setup"))
  - AI greets: "Let's set up your AI agent. What kind of business is this for?"
    |
    v
INTERVIEW PHASE (conversational, ~10 min)
  - AI follows framework sequence: Hero → Guide → Plan → KB → Conversation Design
  - Agency owner answers questions about their business
  - AI generates files as it goes (visible in file explorer):
    - agent-config.json (system prompt, FAQ, tools, channels, autonomy)
    - kb/hero-profile.md
    - kb/guide-profile.md
    - kb/plan-and-cta.md
    - kb/products-services.md
    - kb/faq.md
    - kb/objection-handling.md
    - kb/business-info.md
    - kb/success-stories.md
  - Preview panel shows agent config summary (or a test chat)
    |
    v
REVIEW PHASE (still in builder chat)
  - AI: "Here's what I've generated. Review the files on the left."
  - Agency owner can edit files directly or ask AI to adjust
  - "Change the language to be more formal" → AI updates files
    |
    v
OPTIONAL: PORTAL GENERATION (same session!)
  - AI: "Want me to build a client portal for your customer too?"
  - If yes: generates portal pages (dashboard, messages, invoices, settings)
  - Uses the same builder infrastructure — just more files
    |
    v
CONNECT PHASE (existing connect step)
  - Agency clicks "Connect" tab (existing BuilderUIMode)
  - Connect step detects agent-config.json → creates agent via agentOntology
  - KB docs saved to org's media library with appropriate tags
  - If portal: wires to conversations API, invoices API, etc.
  - Channel bindings: WhatsApp, webchat, email
    |
    v
DEPLOY + ACTIVATE
  - Agent activated (status: active, mode: supervised)
  - If portal: published to Vercel via existing pipeline
  - Done. Agent is live.
```

---

## The Interview Phase (Detail)

### What the Builder AI Does Behind the Scenes

Using the system knowledge frameworks in sequence:

1. **`hero-definition.md`** → Identifies the end customer (homeowner with broken pipe)
   - External problem: pipe is broken
   - Internal problem: stress, doesn't know who to trust
   - Philosophical problem: "A home should work"

2. **`guide-positioning.md`** → Positions the client business as the guide
   - Empathy: "We understand how stressful this is"
   - Authority: "25 years experience, 500+ satisfied customers"
   - Brand voice: professional but warm, no jargon

3. **`plan-and-cta.md`** → Defines the customer journey
   - Step 1: Describe your problem
   - Step 2: We respond within 30 minutes
   - Step 3: Fixed-price repair
   - Direct CTA: "Book appointment"
   - Transitional CTA: "Get free emergency checklist"

4. **`knowledge-base-structure.md`** → Generates 8 KB documents
5. **`conversation-design.md`** → Designs the agent's conversation flow
6. **`follow-up-sequences.md`** → Plans lead nurture sequences

### Example Conversation

```
┌──────────────────────────────────────────────────┐
│  Builder — Setup Mode                            │
├──────────────────────────────────────────────────┤
│                                                  │
│ 🤖 Let's set up your AI agent. I'll ask a few   │
│    questions to create a tailored config.        │
│                                                  │
│    What kind of business is this for?            │
│                                                  │
│ 👤 A plumber in Munich called Schmidt Sanitär.   │
│    Mainly emergency repairs and planned           │
│    maintenance.                                   │
│                                                  │
│ 🤖 Got it — Schmidt Sanitär, plumbing in Munich. │
│    Two customer types: stressful emergencies      │
│    (quick response) and planned maintenance       │
│    (book appointment).                            │
│                                                  │
│    How should Schmidt Sanitär come across?        │
│    More like the reliable neighbor or the         │
│    professional operation?                        │
│                                                  │
│ [Message input...]                    [Send]      │
└──────────────────────────────────────────────────┘

Files generated so far (visible in file explorer):
  📄 agent-config.json
  📄 kb/hero-profile.md      ✅
  📄 kb/guide-profile.md     🔄 (generating...)
  📄 kb/plan-and-cta.md
  📄 kb/products-services.md
  📄 kb/faq.md
  📄 kb/objection-handling.md
  📄 kb/business-info.md
  📄 kb/success-stories.md
```

### What Gets Generated

For Schmidt Sanitär, the builder AI generates:

**`agent-config.json`:**
```json
{
  "name": "Schmidt Sanitär Agent",
  "displayName": "Schmidt Sanitär KI-Assistent",
  "subtype": "customer_support",
  "language": "de",
  "personality": "professional but warm, empathetic, solution-oriented",
  "systemPrompt": "Du bist der KI-Assistent von Schmidt Sanitär...",
  "faqEntries": [
    { "q": "Was kostet ein Notdiensteinsatz?", "a": "..." },
    { "q": "Wie schnell können Sie kommen?", "a": "..." }
  ],
  "enabledTools": ["bookings", "crm", "email"],
  "autonomyLevel": "supervised",
  "channelBindings": [
    { "channel": "whatsapp", "enabled": true },
    { "channel": "webchat", "enabled": true }
  ],
  "knowledgeBaseTags": ["schmidt-sanitaer"],
  "brandVoiceInstructions": "Empathisch aber kompetent. Kein Jargon..."
}
```

**8 KB Documents** (saved to media library with tag `schmidt-sanitaer`):
```
kb/hero-profile.md       ← who the customer is
kb/guide-profile.md      ← how Schmidt sounds
kb/plan-and-cta.md       ← the 3-step process
kb/products-services.md  ← extracted from conversation + uploads
kb/faq.md                ← 15-20 business-specific Q&As
kb/objection-handling.md ← cost concerns, trust issues, availability
kb/business-info.md      ← hours, service area, contact info
kb/success-stories.md    ← if agency provides them
```

---

## Vertical Hints

The builder's setup mode optionally offers vertical selection as **context hints**, not rigid configs:

```
What type of business are you setting up?

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Handwerk &   │ │ Salon &     │ │ Restaurant  │
│ Haustechnik  │ │ Beauty      │ │ & Café      │
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Zahnarzt &   │ │ Immobilien  │ │ Beratung &  │
│ Medizin      │ │             │ │ Dienstlst.  │
└─────────────┘ └─────────────┘ └─────────────┘
        [ Andere Branche... → ]
```

The vertical hint gives the builder AI starting assumptions. "Andere Branche" works fine — the AI just asks more questions.

This can be shown as an initial prompt card in the builder chat, or the AI can simply ask "What kind of business?" as its opening question.

---

## The Connect Phase (Agent Creation)

When the agency owner switches to the Connect tab, the connect step:

1. **Detects `agent-config.json`** in the generated files
2. **Reads the config** and maps it to `agentOntology.createAgent` arguments
3. **Saves KB documents** to the org's media library with appropriate tags
4. **Binds channels** based on `channelBindings` in the config
5. **If portal files exist**: detects API categories (conversations, invoices, bookings) and wires them

This reuses the existing connect step infrastructure — no new UI for agent creation.

### What's New in the Connect Step

| Existing (landing pages) | New (setup mode) |
|--------------------------|------------------|
| Detects products, events, contacts | Also detects `agent-config.json` |
| Creates/links records per detected item | Creates agent via `agentOntology.createAgent` |
| Generates API key + env vars | Same — scoped to org |
| Scaffold generator adds typed helpers | Same + adds KB doc saving |

---

## Optional: Test Chat in Preview

After the agent config is generated, the preview panel can show a test conversation:

```
┌──────────────────────────────────────────┐
│ Test Chat — Schmidt Sanitär Agent        │
├──────────────────────────────────────────┤
│                                          │
│ 👤 Hallo, meine Heizung funktioniert    │
│    nicht mehr. Können Sie helfen?        │
│                                          │
│ 🤖 Guten Tag! Das klingt unangenehm —  │
│    eine ausgefallene Heizung in dieser   │
│    Jahreszeit ist kein Spaß. Schmidt    │
│    Sanitär ist genau dafür da.          │
│                                          │
│    Handelt es sich um einen Notfall     │
│    oder können wir einen regulären      │
│    Termin vereinbaren?                   │
│                                          │
│ [Message input...]             [Send]    │
└──────────────────────────────────────────┘
```

This calls `processInboundMessage` with the generated config to let the agency owner test before activating.

---

## Implementation

### Building Blocks

#### BB1: Builder Setup Mode
- Add `"setup"` to `BuilderUIMode` in `builder-chat-panel.tsx` (currently: `"auto" | "connect" | "publish" | "docs"`)
- Add setup mode to mode selector config with icon, label, description
- When mode is "setup", the AI's system prompt includes SETUP_MODE knowledge
- Entry point: "New Agent" button opens builder with `initialMode: "setup"`

#### BB2: Setup System Prompt
- Load all 15 knowledge files via `getKnowledgeContent("setup")` (~78KB)
- Instruct the AI to:
  - Follow the framework sequence (Hero → Guide → Plan → KB → Conversation Design)
  - Generate files as structured output (agent-config.json + 8 KB docs)
  - Know the agent config schema (from `agentOntology.ts`)
  - Ask about channels and autonomy preferences
- The system prompt is injected when `BuilderUIMode === "setup"`

#### BB3: KB Document Generation via Builder
- The builder already generates files and shows them in the file explorer
- In setup mode, the AI generates markdown KB docs + agent-config.json
- These files appear in the file explorer like any other builder-generated files
- During the connect step, KB docs are saved to the org's media library

#### BB4: Agent Creation via Connect Step
- Connect step detects `agent-config.json` in generated files
- Reads the config, calls `agentOntology.createAgent` mutation
- Saves KB docs to media library with appropriate tags
- Binds channels based on config

#### BB5: Channel Bindings in Builder
- The AI asks "Which channels do you want to enable?" during the interview
- Channel bindings written into `agent-config.json`
- Connect step verifies channel providers are configured
- If WhatsApp: prompts to connect WhatsApp Business number

#### BB6: Test Chat in Preview
- After config is generated, preview panel shows a test chat
- Calls `processInboundMessage` with the generated config
- Agency owner can test before activating
- Optional — agent can also be tested after creation from the agent config window

---

## How It Relates to Existing UI

The builder setup mode is a NEW entry point via the builder. The existing agent config window remains for fine-tuning after creation.

```
"New Agent" button
    ↓
Builder opens in setup mode
    ↓
Conversational setup → generates agent-config.json + KB docs
    ↓
Connect step → creates agent (status: draft)
    ↓
Agency can fine-tune in agent config window if needed
    ↓
Activate → agent goes live (supervised mode)
```

The "Advanced" path still exists: agency clicks "New Agent" → "Advanced (blank form)" → opens agent config window directly with empty fields.

---

## Build Effort

| Component | Effort | Notes |
|-----------|--------|-------|
| Add "setup" to BuilderUIMode | Small | ~30 lines (type, mode config, mode selector entry) |
| Setup system prompt construction | Small | ~100 lines (load SETUP_MODE knowledge, format for builder AI) |
| Agent-config.json schema + generation | Medium | ~150 lines (schema definition, AI instructions for structured output) |
| Connect step: agent creation | Medium | ~200 lines (detect agent-config.json, create agent, save KB docs) |
| "New Agent" → builder entry point | Small | ~50 lines (wire button to open builder in setup mode) |
| Test chat in preview (optional) | Medium | ~200 lines (test chat component calling processInboundMessage) |
| **Total** | **~730 lines** | Significantly less than the ~1,300 line standalone wizard |

### Why Less Code Than the Standalone Wizard

| Standalone Wizard (old plan) | Builder Setup Mode (new plan) |
|------------------------------|-------------------------------|
| ~150 lines: wizard shell (5-step stepper) | **0 lines** — builder already has chat + mode selector |
| ~100 lines: context step UI | **0 lines** — AI asks in chat, or shows vertical hint card |
| ~300 lines: knowledge build chat UI | **0 lines** — builder chat panel IS the chat UI |
| ~250 lines: review step (config display) | **0 lines** — files visible in builder file explorer |
| ~150 lines: channel connection step | **~50 lines** — channel bindings in agent-config.json |
| ~250 lines: test & activate step | **~200 lines** — test chat in preview panel (optional) |
| ~100 lines: setup agent prompt | **~100 lines** — same (now for builder AI context) |
| **~1,300 lines total** | **~730 lines total** |

The builder already has 80% of the UI. We're adding context, not components.

---

## Key Architecture Decisions

| Decision | Reason |
|----------|--------|
| Builder IS the setup wizard | No duplicate UI. Builder has chat, file gen, preview, connect, deploy. |
| Knowledge-driven, not template-driven | System knowledge library generates tailored configs for ANY vertical through conversation. |
| One session, many outputs | Agent config + KB docs + optional portal, all in one builder session. |
| KB documents stored in media library | Tagged so agent execution can retrieve them via `buildAgentSystemPrompt`. |
| Default to supervised mode | New agents start supervised (requires approval for actions). |
| Credits deducted for setup | The setup conversation costs credits like any other AI interaction. |
| Connect step handles the wiring | Agent creation, KB doc saving, channel binding — all via existing connect pipeline. |

---

## ~~Superseded: Standalone 5-Step Wizard~~

The original plan (before 2026-02-03) called for:
- A new component `src/components/window-content/agent-setup-wizard.tsx` (~1,300 lines)
- A 5-step stepper UI: Context → Knowledge Build → Review → Channels → Activate
- A `WizardStep` state machine with its own chat interface in Step 2

This is replaced by the builder setup mode. The interview flow, knowledge framework sequence, and KB document generation concepts are preserved — only the UI container changed from a standalone wizard to the existing builder chat panel.
