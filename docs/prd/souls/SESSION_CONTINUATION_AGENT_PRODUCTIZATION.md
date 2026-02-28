# Session Continuation Prompt — Agent Productization Sprint

Copy everything below the line into a new Claude Code chat to resume.

---

## Context

We've written "The Book of 100 AI Agents" — a lead magnet for Seven Layers (sevenlayers.io). The book defines 104 AI agents across 6 Core Specialists and 7 industry verticals, each with detailed soul blends, personality architectures, capabilities, and real-world stories. **The book is done. Don't touch it.**

Now we're turning the book into the product. Every agent described in the book needs to become a real, deployable soul on the l4yercak3 platform. This is the bridge between marketing promise and technical delivery.

### The Platform We're Building On

The l4yercak3 platform already has a working agent infrastructure:

- **Backend:** Convex (serverless, TypeScript) at `convex/`
- **Frontend:** Next.js at `src/`
- **Agent storage:** Universal `objects` table with `type="org_agent"`, status workflow (draft → active → paused → archived → template)
- **Soul V2 schema:** Structured identity with `identityAnchors` (name, tagline, traits, coreValues, neverDo, escalationTriggers, coreMemories) and `executionPreferences` (alwaysDo, communicationStyle, toneGuidelines, greetingStyle, closingStyle, emojiUsage)
- **Tool system:** Central registries (`convex/ai/tools/registry.ts`, `convex/ai/tools/interviewTools.ts`) with 87 currently modeled tools (75 + 12, as of 2026-02-24), 4-layer scoping (`convex/ai/toolScoping.ts`), tool profiles (general, support, sales, booking, readonly, admin), integration requirements
- **Soul evolution:** Proposal system (add/modify/remove), drift scoring, owner approval, version history, policy limits
- **Template/seeding:** `convex/onboarding/seedPlatformAgents.ts` — protected templates with clone policy, worker pool system
- **Agent creation:** Talk Mode (AI-guided) + Type Mode (form-based), 5 sections (Identity, Knowledge, Model, Guardrails, Channels)
- **Execution pipeline:** Session management, turn orchestration, LLM call, tool execution, HITL approval, escalation, team handoffs
- **Trust system:** 40 currently modeled trust event literals (as of 2026-02-24), work items, tool execution tracking, escalation state

### Implementation Reuse Snapshot (Reality Check, 2026-02-24)

Before building new runtime/harness layers, reuse completed implementation streams:

- `byok-multimodal-frontier-runtime` (provider registry/adapters/conformance/voice baseline)
- `builder-layers-event-orchestration` (template specialists, clone factory, Soul v2 overlays)
- `agent-creation-experience-convergence` + `agent-trust-experience` (release gates, trust contracts, privileged controls)
- `trigger-common-ground-agentic-convergence` (collaboration runtime contracts)
- `voice-agent-co-creation` (voice-first co-creation runtime)

Active de-dup execution control:

- `docs/reference_docs/topic_collections/implementation/book-agent-productization/`

### What Already Exists (Soul Research)

All soul blend research is complete in `docs/prd/souls/`:

| Resource | Path | Contents |
|---|---|---|
| **Soul Blend Prompts** | `docs/prd/souls/AGENT_SOUL_BLEND_PROMPTS.md` | Full personality fusion prompts for all 6 Core Specialists |
| **Industry Soul Map** | `docs/prd/souls/INDUSTRY_SOUL_BLEND_MAP.md` | Soul blend ratios + source personalities for all 98 industry agents |
| **11 Built Souls** | `docs/prd/souls/{name}/` | Complete personality files: alex-hormozi, chris-voss, jefferson-fisher, donald-miller, russell-brunson, leila-hormozi, ben-horowitz, marc-andreessen, alan-watts, robert-greene, joseph-goldstein |
| **65 New Soul Candidates** | Listed in INDUSTRY_SOUL_BLEND_MAP.md | Need personality files built (Gerry Spence, Bryan Stevenson, Robert Cialdini, Daniel Kahneman, etc.) |

### The Book (Source of Truth)

```
docs/strategy/cash-is-king/The Book of 100 AI Agents/
├── 00-front-matter/
│   ├── 00-cover.md
│   ├── 01-table-of-contents.md
│   ├── 02-introduction.md
│   └── 03-twenty-things-that-disappear.md     ← 2,315 lines, voice reference
├── 01-the-six-core-specialists/
│   ├── 00-overview.md                          ← Team diagram, tier pricing
│   ├── 01-the-closer.md                        ← Soul blend, capabilities, story, frameworks
│   ├── 02-the-strategist.md
│   ├── 03-the-copywriter.md
│   ├── 04-the-operator.md
│   ├── 05-the-cfo.md
│   └── 06-the-coach.md
├── 02-industry-agents/
│   ├── 01-legal/agents.md                      ← 14 agents (#7-#20)
│   ├── 02-finance/agents.md                    ← 14 agents (#21-#34)
│   ├── 03-health-medical/agents.md             ← 14 agents (#35-#48)
│   ├── 04-coaching-consulting/agents.md        ← 14 agents (#49-#62)
│   ├── 05-agencies/agents.md                   ← 14 agents (#63-#76)
│   ├── 06-trades-construction/agents.md        ← 14 agents (#77-#90)
│   └── 07-ecommerce-retail/agents.md           ← 14 agents (#91-#104)
├── 03-the-soul-binding-difference/
│   └── 01-soul-binding.md                      ← Seven Layers Stack, evolution case study
├── 04-self-assessment/
│   └── 01-quiz.md
└── 05-next-steps/
    └── 01-next-steps.md
```

---

## What We're Building — Four Deliverables

### Deliverable 1: Agent Product Catalog (`docs/prd/souls/AGENT_PRODUCT_CATALOG.md`)

A single reference document mapping every book agent to its product specification. For each of the 104 agents:

| Field | Source | Description |
|---|---|---|
| **Agent #** | Book | Sequential number (1-104) |
| **Name** | Book | e.g., "The Closer", "Client Intake Specialist" |
| **Category** | Book | Core Specialist / Legal / Finance / Health / Coaching / Agency / Trades / E-Commerce |
| **Tier** | Book overview | Foundation / Dream Team / Sovereign |
| **Soul Blend** | `INDUSTRY_SOUL_BLEND_MAP.md` | e.g., "Hormozi 50% + Fisher 30% + Voss 20%" |
| **Soul Status** | New | `ready` (personality file exists) / `needs_build` (personality file needed) |
| **Subtype** | Platform schema | Maps to: `general`, `customer_support`, `sales_assistant`, `booking_agent` |
| **Tool Profile** | Platform schema | Maps to: `general`, `support`, `sales`, `booking`, `admin` |
| **Required Tools** | New — see Deliverable 2 | List of specific tools this agent needs |
| **Required Integrations** | New | External services needed (stripe, resend, etc.) |
| **Channel Affinity** | Book | Primary channels: webchat, email, slack, telegram, whatsapp, voice |
| **Autonomy Default** | New | `supervised` / `autonomous` / `draft_only` |
| **Implementation Phase** | New — see Deliverable 4 | Phase 1 / 2 / 3 / 4 |

**Format:** One table per vertical (8 tables total — 1 core + 7 industry). Each table fits the schema above. Below each table, a brief "Tool Notes" section explaining which tools are critical vs. nice-to-have for that vertical.

---

### Deliverable 2: Tool Requirement Matrix (`docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md`)

This is the gap analysis between what the platform's tool registry has today and what the book's agents need to function in the real world.

#### A. Existing Tool Audit

Read the current tool registry at `convex/ai/tools/registry.ts` and catalog every tool with:
- Name
- Status (ready / placeholder / beta)
- Category
- Read-only flag
- Which agents need it

#### B. New Tools Needed

For each industry vertical, identify tools that DON'T exist yet but agents NEED. Be specific and practical:

**Example format:**

| Tool Name | Description | Category | Used By Agents | Priority | Complexity |
|---|---|---|---|---|---|
| `generate_quote_pdf` | Generate branded PDF quote from template + line items | Document | #77, #78, #1 | P1 | Medium |
| `schedule_callback` | Book a callback slot in the owner's calendar | Scheduling | #7, #35, #49, #91 | P1 | Low |
| `calculate_unit_economics` | Run margin analysis on service line pricing | Finance | #5, #12, #82 | P2 | Medium |
| `send_abandoned_cart_email` | Trigger cart recovery sequence via integration | E-Commerce | #91, #92 | P1 | Medium |
| `track_case_deadline` | Monitor and alert on legal filing deadlines | Legal | #9, #13, #18 | P2 | High |

Group tools into:
1. **Universal tools** — needed by 10+ agents across verticals
2. **Vertical-specific tools** — needed by 3+ agents within one vertical
3. **Specialist tools** — unique to 1-2 agents

For each tool, specify:
- Input parameters
- Output format
- Integration dependencies
- Whether it's read-only or mutating
- Suggested autonomy level (auto-execute vs. requires approval)

#### C. Tool Profile Expansion

The current platform has 6 tool profiles (general, support, sales, booking, readonly, admin). The 7 industry verticals likely need new profiles. Propose expanded profiles:

| Profile | Base Tools | Vertical Tools | Used By |
|---|---|---|---|
| `legal` | CRM, tickets, email | case tracking, deadline monitoring, document drafting | Agents #7-#20 |
| `finance` | CRM, reports | portfolio reporting, risk alerts, compliance checks | Agents #21-#34 |
| `health` | CRM, scheduling | patient records, wellness tracking, appointment reminders | Agents #35-#48 |
| `coaching` | CRM, scheduling, email | session tracking, habit logging, assessment scoring | Agents #49-#62 |
| `agency` | CRM, projects, invoicing | project tracking, time logging, resource allocation | Agents #63-#76 |
| `trades` | CRM, invoicing, scheduling | quote generation, job scheduling, material tracking | Agents #77-#90 |
| `ecommerce` | CRM, products, email | cart management, inventory, marketplace sync | Agents #91-#104 |

---

### Deliverable 3: Soul Seed Library (`docs/prd/souls/SOUL_SEED_LIBRARY.md`)

The platform's seeding system (`convex/onboarding/seedPlatformAgents.ts`) currently seeds Quinn, an initial Quinn worker, and five protected orchestration/event specialist templates. We need to extend this to seed all 104 book agents as **protected templates** that customers can clone and customize.

#### A. Seed Data Format

For each of the 104 agents, produce a seed object matching the platform's Soul V2 schema:

```typescript
{
  // Identity
  name: string,                    // From book
  tagline: string,                 // From book — the quote under the agent name
  subtype: AgentSubtype,           // Mapped from catalog
  status: "template",              // All seeds are protected templates

  // Soul V2
  soulV2: {
    schemaVersion: 2,
    identityAnchors: {
      name: string,
      tagline: string,
      traits: string[],            // 5-7 personality traits from soul blend
      coreValues: string[],        // 3-5 from book's "Boundaries" / "Core Values"
      neverDo: string[],           // 3-5 hard boundaries from book
      escalationTriggers: string[],// When to hand off to human
      coreMemories: []             // Empty for templates — filled during onboarding
    },
    executionPreferences: {
      alwaysDo: string[],          // 3-5 from book's "Signature Moves"
      communicationStyle: string,  // From book's "Voice" description
      toneGuidelines: string,      // From soul blend prompt
      greetingStyle: string,       // Derived from personality
      closingStyle: string,        // Derived from personality
      emojiUsage: "none" | "minimal" | "moderate"
    },
    requireOwnerApprovalForMutations: true  // Default safe for templates
  },

  // System prompt
  systemPrompt: string,            // Generated from soul blend prompt + book capabilities

  // Tool configuration
  toolProfile: string,             // From catalog
  enabledTools: string[],          // Specific tools from Tool Matrix
  disabledTools: string[],         // Tools explicitly excluded
  autonomyLevel: string,           // From catalog

  // Metadata
  bookAgentNumber: number,         // 1-104
  category: string,                // Core / Legal / Finance / etc.
  tier: string,                    // Foundation / Dream Team / Sovereign
  soulBlend: string,               // Human-readable blend description
  implementationPhase: number      // 1-4
}
```

#### B. Priority: Start with the 6 Core Specialists

Produce COMPLETE seed objects for agents #1-#6 first. These are the highest-priority because:
1. All 11 source personality files already exist (`docs/prd/souls/{name}/`)
2. The soul blend prompts are fully written (`AGENT_SOUL_BLEND_PROMPTS.md`)
3. They're included in every tier (Foundation, Dream Team, Sovereign)
4. They demonstrate the pattern for all industry agents

For Core Specialists, the seed object should be production-ready — not a sketch. Include full system prompts derived from the soul blend prompts, complete trait lists, specific tool selections, and thoughtful escalation triggers.

#### C. Industry Agent Seeds (Skeleton Format)

For agents #7-#104, produce skeleton seeds with:
- All identity fields populated (from book)
- Soul blend described (from INDUSTRY_SOUL_BLEND_MAP.md)
- Tool profile and required tools listed (from Tool Matrix)
- System prompt marked as `[REQUIRES_SOUL_BUILD]` if the source personality file doesn't exist yet
- Flag which personality files need to be built

#### D. Seeding Implementation Notes

Document how the seed library connects to the platform's existing seeding infrastructure:
- How to extend `seedPlatformAgents.ts` to load from the seed library
- Template protection and clone policy settings
- How customers discover and clone templates (UI flow)
- How cloned agents inherit the soul but get customized with business context

---

### Deliverable 4: Phased Implementation Plan (`docs/prd/souls/IMPLEMENTATION_ROADMAP.md`)

A realistic, sequenced plan for going from "book exists" to "all 104 agents are live on the platform."

#### Phase 1 — Foundation (Weeks 1-4): The Six Core Specialists

**Goal:** 6 production-ready agent templates that any customer can deploy.

| Task | Description | Dependencies |
|---|---|---|
| 1.1 | Generate complete Soul V2 seed objects for agents #1-#6 | Soul blend prompts (done) |
| 1.2 | Write production system prompts for each Core Specialist | Personality files (done) |
| 1.3 | Map each Core Specialist to existing tools + identify gaps | Tool registry audit |
| 1.4 | Build any missing P1 tools for Core Specialists | Tool gap analysis |
| 1.5 | Extend `seedPlatformAgents.ts` to seed Core Specialist templates | Seed format finalized |
| 1.6 | Add "Agent Library" UI for browsing/cloning templates | UX design |
| 1.7 | Create onboarding flow: customer clones template → customizes with business context | Agent creation flow |
| 1.8 | Test all 6 agents in real conversations with sample businesses | E2E testing |

**Exit criteria:** A new customer can sign up, browse the 6 Core Specialists, clone one, customize it with their business info, and have a working agent within 30 minutes.

#### Phase 2 — First Verticals (Weeks 5-10): Legal + Trades + E-Commerce

**Goal:** 42 additional agents (3 verticals × 14 agents each).

**Why these three first:**
- Legal: highest revenue per agent (Sovereign tier), most tool requirements → proves the complex case
- Trades: strongest emotional resonance from the book (Karl Bruckner story), most relatable → proves the simple case
- E-Commerce: most integration-dependent (Shopify, Stripe, email platforms) → proves the integration case

| Task | Description |
|---|---|
| 2.1 | Build personality files for new soul candidates used by these 3 verticals (~20 personalities) |
| 2.2 | Generate Soul V2 seeds for agents #7-#20 (Legal), #77-#90 (Trades), #91-#104 (E-Commerce) |
| 2.3 | Build vertical-specific tool profiles (legal, trades, ecommerce) |
| 2.4 | Build P1 vertical-specific tools (quote PDF, case deadlines, cart recovery, etc.) |
| 2.5 | Extend Agent Library UI with vertical browsing + filtering |
| 2.6 | Build "Agentic Team" composition UI — customer selects a vertical, gets recommended team of 6-8 agents |
| 2.7 | Test each vertical with 2-3 pilot customers |

**Exit criteria:** A law firm, a plumbing company, and an e-commerce brand can each deploy a full team of industry-specific agents.

#### Phase 3 — Full Coverage (Weeks 11-18): Remaining 4 Verticals

**Goal:** 56 more agents (Finance, Health, Coaching, Agencies).

| Task | Description |
|---|---|
| 3.1 | Build remaining personality files (~25 more personalities) |
| 3.2 | Generate Soul V2 seeds for agents #21-#34, #35-#48, #49-#62, #63-#76 |
| 3.3 | Build remaining vertical-specific tool profiles + tools |
| 3.4 | Implement cross-vertical agent team compositions (e.g., a coaching business also needs The Closer) |
| 3.5 | Build "Recommended Team" engine — AI suggests optimal agent team based on business profile |
| 3.6 | Full platform test with all 104 templates available |

**Exit criteria:** All 104 agent templates are live. Any business in any vertical can deploy a complete AI team.

#### Phase 4 — Evolution & Marketplace (Weeks 19-26): Soul Maturity

**Goal:** Agents that get better over time, and a marketplace for sharing soul configurations.

| Task | Description |
|---|---|
| 4.1 | Tune soul evolution policy per vertical (different verticals need different learning rates) |
| 4.2 | Build "Soul Quality Score" — metrics dashboard showing agent effectiveness over time |
| 4.3 | Implement "Agent Performance Benchmarks" — compare your agent's performance to anonymized vertical averages |
| 4.4 | Build soul-sharing marketplace — customers can publish their customized souls (opt-in) |
| 4.5 | Implement "Soul Upgrade" system — when a template improves, cloned agents get upgrade suggestions |
| 4.6 | Build team orchestration — agents collaborate on complex tasks (Closer hands off to Operator, etc.) |

**Exit criteria:** The platform has a flywheel — more customers → better soul data → better templates → more customers.

---

## How To Work

### Execution Order

1. **Deliverable 1 first** (Agent Product Catalog) — this is the master reference everything else builds from
2. **Deliverable 2 second** (Tool Requirement Matrix) — can't build agents without knowing what tools they need
3. **Deliverable 3 third** (Soul Seed Library) — the actual seed data, starting with Core Specialists
4. **Deliverable 4 last** (Implementation Roadmap) — should be informed by the complexity discovered in 1-3

### Reading Order

Before starting, read these files for context:

1. Soul storage + object schema baseline — `convex/schemas/ontologySchemas.ts` (`objects` + `customProperties`)
2. Soul v2 runtime projection/evolution — `convex/ai/soulGenerator.ts` and `convex/ai/soulEvolution.ts`
3. Existing seeding — `convex/onboarding/seedPlatformAgents.ts` (Quinn + specialist template seed structure)
4. Tool registries — `convex/ai/tools/registry.ts` and `convex/ai/tools/interviewTools.ts`
5. Tool scoping — `convex/ai/toolScoping.ts` (profiles, integration requirements)
6. Trust taxonomy baseline — `convex/ai/trustEvents.ts`
7. Soul blend prompts — `docs/prd/souls/AGENT_SOUL_BLEND_PROMPTS.md` (6 Core Specialist souls)
8. Industry soul map — `docs/prd/souls/INDUSTRY_SOUL_BLEND_MAP.md` (98 industry agent souls)
9. Book Core Specialists — `docs/strategy/cash-is-king/The Book of 100 AI Agents/01-the-six-core-specialists/` (all 7 files)
10. Book Industry Agents — `docs/strategy/cash-is-king/The Book of 100 AI Agents/02-industry-agents/` (all 7 chapters)
11. Reuse baseline — `docs/reference_docs/topic_collections/implementation/book-agent-productization/MASTER_PLAN.md`

### Working Rules

- **Be specific.** "Needs CRM tool" is useless. "Needs `manage_crm` for contact lookup + `create_invoice` for billing + NEW `track_case_deadline` for filing alerts" is useful.
- **Map to reality.** Every tool name should either match an existing entry in `registry.ts` or be clearly marked as NEW with a specification.
- **Match runtime schema boundaries.** Seed objects must align with `objects` storage shape plus Soul v2 runtime contracts in `soulGenerator.ts`/`soulEvolution.ts`; don't invent fields.
- **Respect tiers.** Foundation gets 1-2 agents. Dream Team gets all 6 Core + 5-6 industry. Sovereign gets everything. Tool access should scale with tier.
- **Think in teams.** Agents don't work alone. Every vertical recommendation should be "deploy these 6-8 agents together." The book already describes agent interactions (Strategist → Copywriter → Closer pipeline). Encode those relationships.
- **Flag blockers.** If a tool is critical but complex to build (e.g., real-time case deadline monitoring for legal), say so. Don't hide complexity.

### Parallelization

- Deliverables 1 and 2 can be worked in parallel (catalog doesn't depend on tool matrix, and vice versa)
- Deliverable 3 depends on 1 and 2 (need to know the tool assignments before building seeds)
- Deliverable 4 should be written last (informed by complexity discovered in 1-3)
- Within Deliverable 3, Core Specialists (#1-#6) can be done in parallel since all personality files exist

---

## Estimated Scope

| Deliverable | Output | Estimated Lines | Sessions |
|---|---|---|---|
| D1: Agent Product Catalog | 1 file, 8 tables + notes | ~800-1,200 | 1-2 turns |
| D2: Tool Requirement Matrix | 1 file, audit + gap + profiles | ~600-1,000 | 1-2 turns |
| D3: Soul Seed Library | 1 file, 6 complete + 98 skeleton seeds | ~2,000-3,000 | 3-5 turns |
| D4: Implementation Roadmap | 1 file, 4-phase plan | ~400-600 | 1 turn |
| **Total** | **4 files** | **~3,800-5,800 lines** | **6-10 turns** |

---

## Start

Read the platform's soul schema first:
```
convex/schemas/aiSchemas.ts
```

Then read the existing seed structure:
```
convex/onboarding/seedPlatformAgents.ts
```

Then read the tool registry:
```
convex/ai/tools/registry.ts
```

Then begin with **Deliverable 1 — Agent Product Catalog**. Start with the 6 Core Specialists table, then work through each industry vertical.
