# Handoff Prompt: Builder-as-Setup-Wizard + KB Document Generation + Doc Updates

> Copy this entire file as the first message in a new Claude Code window.
> Branch: `agent_per_org`
> Codebase: `/Users/foundbrand_001/Development/vc83-com`

---

## Direction Change: The Builder IS the Setup Wizard

**The old plan** was a standalone 5-step wizard component (`agent-setup-wizard.tsx`) with its own stepper UI. **That plan is scrapped.**

**The new plan:** The existing **builder chat panel** IS the setup wizard. When an agency owner clicks "New Agent", they land in the builder — but with a specialized "setup mode" system prompt that knows how to:

1. Interview the agency owner about their business (using the system knowledge library)
2. Generate the agent config (system prompt, FAQ, tools, channels, autonomy level)
3. Generate 8 KB documents and save them to the org's media library
4. Optionally generate a client portal landing page in the same session
5. Wire everything via the existing connect pipeline (API categories, scaffold, env vars)
6. Deploy the portal to Vercel if they built one

**Why this is better:**
- No duplicate UI — the builder already has chat, file generation, preview, connect, and deploy
- Agency owner can set up their agent AND build the client portal in ONE session
- The system knowledge library feeds the builder's AI, not a separate "setup agent"
- Everything stays in one system — no context switching between wizard and builder
- The connect step already handles API wiring for 9 categories (soon 10 with conversations)

**The key insight:** The builder is already a conversational AI interface. Adding "agent setup" is just adding a new mode/context to that same interface, not building a second one.

---

## Your Two Jobs

### Job 1: Update ALL Planning Docs

Every relevant document in `docs/bring_it_all_together/` needs to reflect this architectural change. The old "standalone 5-step wizard" approach must be replaced with "builder-as-setup-wizard" throughout.

**Read every doc below and update the relevant sections:**

| Doc | What Needs Updating |
|-----|-------------------|
| `00-INDEX.md` | Update doc 09 description to reflect builder-based approach |
| `02-WHAT-THE-ICP-NEEDS.md` | Any references to "setup wizard" should reference builder setup mode |
| `04-AGENT-TEMPLATES.md` | Update the "how it works" section — setup happens in builder, not wizard |
| `05-WEBCHAT-WIDGET.md` | Webchat setup happens in the same builder session as agent setup |
| `07-WHITE-LABEL-PORTAL.md` | Already partially updated — reinforce that portal + agent setup = one builder session |
| `09-GUIDED-SETUP-WIZARD.md` | **Major rewrite.** Replace 5-step wizard with builder setup mode. Keep the interview flow and knowledge framework sequence, but the UI is the builder chat, not a stepper. |
| `10-PRIORITY-SEQUENCE.md` | Update priority/effort for builder setup mode vs standalone wizard |
| `11-BUILDER-PORTAL-TEMPLATE.md` | Reinforce that portal generation and agent setup can be one session |
| `CHECKLIST.md` | **Rewrite Phase 2.3 and 2.4** to reflect builder setup mode. Update the Next Up section. Add decision to Decision Log. |

**Guidelines for doc updates:**
- Add an update notice at the top of significantly changed docs (like we did for 07)
- Don't delete useful content about the interview flow, knowledge frameworks, or KB doc generation — those concepts still apply, just the UI container changed
- Mark superseded content clearly
- Cross-reference between docs where the approach connects

### Job 2: Implement the Builder Setup Mode

After docs are aligned, implement the actual feature. **Building blocks first** — verify each works before assembling.

---

## What Already Exists (Read These First)

### The Builder System
1. **`src/components/builder/builder-chat-panel.tsx`** — The builder's chat interface. Has: sidebar with mode tabs, chat history, message input, file explorer. This is where the setup conversation will happen.
2. **`src/contexts/builder-context.tsx`** — Builder state management. Has: messages, files, mode, app metadata. Study the `BuilderUIMode` type — you'll add a setup mode here.
3. **`src/components/builder/builder-preview-panel.tsx`** — Preview panel for generated pages. During setup, this could show a live preview of the agent config being generated.
4. **`src/components/builder/v0-connection-panel.tsx`** — The connect step. 9 API categories, scoped API key generation, env vars. This already handles wiring generated apps to the backend.
5. **`src/lib/api-catalog.ts`** — 9 API categories. Needs a 10th: conversations.
6. **`src/lib/scaffold-generators/thin-client.ts`** — Generates typed API helpers per category.
7. **`convex/builderAppOntology.ts`** — App CRUD, connection tracking, matching.

### System Knowledge Library (100% Complete)
8. **`convex/ai/systemKnowledge/index.ts`** — Registry with 15 entries. Key functions:
   - `getKnowledgeContent("setup")` — Returns all SETUP_MODE + ALWAYS_LOAD content
   - `getKnowledgeContent("customer")` — Returns CUSTOMER_MODE content for deployed agents
9. **`convex/ai/systemKnowledge/_content.ts`** — Auto-generated TypeScript with all 15 MD files as string constants (~78KB). Generated by `scripts/generate-knowledge-content.mjs`.
10. **`convex/ai/systemKnowledge/*.md`** — 8 core + 7 framework files. The frameworks (StoryBrand, ICP research, marketing-made-simple, funnels, etc.) guide the setup interview.

### Agent Infrastructure (100% Complete)
11. **`convex/ai/agentExecution.ts`** — 13-step execution pipeline. Study `buildAgentSystemPrompt` — it loads CUSTOMER_MODE knowledge. The builder setup mode will load SETUP_MODE knowledge instead.
12. **`convex/ai/agentSessions.ts`** — Session lifecycle. The setup conversation can optionally use sessions.
13. **`convex/agentOntology.ts`** — Full CRUD for agents. `createAgent` mutation takes all config fields.
14. **`src/components/window-content/agent-configuration-window.tsx`** — Existing 5-section form (Identity, Knowledge, Model, Guardrails, Channels). The builder's setup mode generates the same config through conversation instead of manual form filling.

### Credit System (100% Complete)
15. **`convex/credits/index.ts`** — Already integrated into agent execution. The builder's setup conversation should also deduct credits (it's AI usage).

### Channels (100% Complete)
16. **`convex/channels/`** — Router, providers for WhatsApp, Email, Webchat, SMS, Instagram, Facebook, Telegram, API. Channel setup can happen during the builder conversation ("connect your WhatsApp number").

### Media Library
17. **`convex/organizationMedia.ts`** — Where generated KB documents get saved. The builder already has file operations — KB doc generation is just another file-save operation.

---

## The Builder Setup Mode Flow

Instead of 5 discrete wizard steps, it's a **continuous conversation in the builder**:

```
Agency owner clicks "New Agent" (or "New Project" with agent template)
    |
    v
Builder opens in SETUP MODE
  - System prompt loaded with SETUP_MODE knowledge (all 15 files)
  - AI greets: "Let's set up your AI agent. What kind of business is this for?"
    |
    v
INTERVIEW PHASE (conversational, ~10 min)
  - AI follows framework sequence: Hero -> Guide -> Plan -> KB -> Conversation Design
  - Agency owner answers questions about their business
  - AI generates files as it goes (visible in file explorer):
    - agent-config.json (system prompt, FAQ, tools, channels)
    - kb/hero-profile.md
    - kb/guide-profile.md
    - kb/plan-and-cta.md
    - kb/products-services.md
    - kb/faq.md
    - kb/objection-handling.md
    - kb/business-info.md
    - kb/success-stories.md
  - Preview panel shows agent config summary (or even a test chat)
    |
    v
REVIEW PHASE (still in builder chat)
  - AI: "Here's what I've generated. Review the files on the left."
  - Agency owner can edit files directly or ask AI to adjust
  - "Change the language to be more formal" -> AI updates files
    |
    v
OPTIONAL: PORTAL GENERATION (same session!)
  - AI: "Want me to build a client portal for your customer too?"
  - If yes: generates portal pages (dashboard, messages, invoices, settings)
  - Uses the same builder infrastructure — just more files
    |
    v
CONNECT PHASE (existing connect step)
  - V0ConnectionPanel detects API categories needed
  - Wires agent config to backend (creates agent via agentOntology)
  - Wires KB docs to media library
  - If portal: wires to conversations API, invoices API, etc.
  - Channel setup: WhatsApp number, webchat toggle
    |
    v
DEPLOY + ACTIVATE
  - Agent activated (status: active, mode: supervised)
  - If portal: published to Vercel via existing pipeline
  - Done. Agent is live.
```

---

## Building Blocks to Verify BEFORE Assembling

**CRITICAL: Verify each building block works independently before connecting them.**

- [ ] **BB1: Builder Setup Mode** — Add a `"setup"` mode to `BuilderUIMode` in `builder-context.tsx`
  - When mode is "setup", the AI's system prompt includes SETUP_MODE knowledge
  - Entry point: "New Agent" button opens builder in setup mode
  - The builder chat works the same, just with different AI context

- [ ] **BB2: Setup System Prompt** — Create the system prompt that powers the setup conversation
  - Loads all 15 knowledge files via `getKnowledgeContent("setup")`
  - Instructs the AI to interview the user following the framework sequence
  - Tells the AI to generate files (agent-config.json + 8 KB docs) as structured output
  - The AI should know about the agent config schema (from `agentOntology.ts`)

- [ ] **BB3: KB Document Generation via Builder** — The builder already generates files
  - Can the builder AI generate markdown files and show them in the file explorer?
  - Can these files be saved to the org's media library during the connect step?
  - Test: Ask the builder to generate a KB doc, verify it appears in file explorer

- [ ] **BB4: Agent Creation via Connect Step** — Wire the connect step to create agents
  - The connect step already handles 9 API categories
  - Add agent creation as part of the connect flow when in setup mode
  - Reads `agent-config.json` from generated files, calls `createAgent` mutation
  - Saves KB docs to media library with appropriate tags

- [ ] **BB5: Channel Bindings in Builder** — Channel setup during the conversation
  - The AI can ask "Which channels do you want to enable?" during the interview
  - Channel bindings get written into `agent-config.json`
  - The connect step verifies channel providers are configured

- [ ] **BB6: Test Chat in Preview** — Optionally show a test conversation in the preview panel
  - After agent config is generated, the preview panel could show a test chat
  - Calls `processInboundMessage` with the generated config
  - Agency owner can test before activating

---

## Key Architecture Decisions

1. **Builder IS the setup wizard** — No standalone wizard component. The builder chat panel in setup mode replaces the 5-step stepper.
2. **Knowledge-driven, not template-driven** — System knowledge library generates tailored configs for ANY vertical through conversation.
3. **One session, many outputs** — Agent config + KB docs + optional portal, all in one builder session.
4. **KB documents stored in media library** — Tagged so agent execution can retrieve them via `buildAgentSystemPrompt`.
5. **Default to supervised mode** — New agents start supervised (requires approval for actions).
6. **Credits deducted for setup** — The setup conversation costs credits like any other AI interaction.
7. **Connect step handles the wiring** — Agent creation, KB doc saving, channel binding — all via the existing connect pipeline, not custom wizard logic.

---

## Success Criteria

An agency owner should:
1. Click "New Agent" -> builder opens in setup mode
2. Chat naturally: "I run a plumbing company in Munich called Muller Sanitar"
3. AI asks follow-up questions about customers, services, pricing, availability, objections
4. Files appear in the file explorer as the AI generates them (agent-config.json, 8 KB docs)
5. Agency owner reviews, tweaks via chat ("make the tone more professional")
6. Optionally: "Also build me a client portal" -> portal files generated in same session
7. Click Connect -> agent created, KB docs saved, channels wired
8. Click Deploy (if portal) -> published to Vercel
9. Agent is live on configured channels
10. Test: send "Mein Wasserhahn tropft" -> agent responds using the generated KB

---

## File Paths Quick Reference

| What | Path |
|------|------|
| Builder chat panel | `src/components/builder/builder-chat-panel.tsx` |
| Builder context | `src/contexts/builder-context.tsx` |
| Builder preview | `src/components/builder/builder-preview-panel.tsx` |
| V0 connection panel | `src/components/builder/v0-connection-panel.tsx` |
| API catalog | `src/lib/api-catalog.ts` |
| Scaffold generator | `src/lib/scaffold-generators/thin-client.ts` |
| Builder app CRUD | `convex/builderAppOntology.ts` |
| Knowledge registry | `convex/ai/systemKnowledge/index.ts` |
| Knowledge content | `convex/ai/systemKnowledge/_content.ts` |
| Agent execution | `convex/ai/agentExecution.ts` |
| Agent sessions | `convex/ai/agentSessions.ts` |
| Agent ontology | `convex/agentOntology.ts` |
| Agent config UI | `src/components/window-content/agent-configuration-window.tsx` |
| Credit system | `convex/credits/index.ts` |
| Media library | `convex/organizationMedia.ts` |
| Channels | `convex/channels/` |
| Checklist | `docs/bring_it_all_together/CHECKLIST.md` |
| All planning docs | `docs/bring_it_all_together/*.md` |
| Wizard spec (to rewrite) | `docs/bring_it_all_together/09-GUIDED-SETUP-WIZARD.md` |

---

## Order of Operations

1. **First: Read all docs** in `docs/bring_it_all_together/` to understand the full plan
2. **Second: Update all planning docs** to reflect builder-as-setup-wizard (see Job 1 table above)
3. **Third: Update CHECKLIST.md** — rewrite Phase 2.3/2.4, add decision to log
4. **Fourth: Verify building blocks** (BB1-BB6) work independently
5. **Fifth: Implement** the setup mode in the builder
6. **Sixth: Test** the full flow end-to-end
