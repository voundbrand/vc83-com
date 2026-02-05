# 04 — Knowledge-Driven Agent Setup

> No rigid templates. The system knowledge library IS the template engine. The setup agent uses StoryBrand, hero/guide positioning, and marketing frameworks to dynamically generate the right config for ANY vertical.

---

## Why NOT Rigid Templates

The old approach: pre-build 6 vertical templates with hardcoded system prompts, FAQ entries, tool selections, and personality strings. Agency picks "Plumber," gets a cookie-cutter config.

**Problems with that:**
- Maintenance burden — every template needs updating when the platform changes
- Limiting — what about a dog groomer? A driving school? A funeral home? You'd need infinite templates
- Generic — "plumber" doesn't capture what makes Schmidt Sanitär different from Weber Installationen
- Wasted work — the system knowledge library we built already knows how to do this dynamically

**The better approach:** The agent itself IS the template engine. It loads the system knowledge frameworks and generates a tailored config through conversation with the agency owner.

---

## How It Works

> **UPDATE 2026-02-03:** The setup conversation now happens inside the **builder chat panel** in "setup mode" — not a standalone wizard. The builder already has chat, file generation, preview, and deploy. Adding agent setup is just adding a new mode/context to the same interface. See [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md).

### The Builder in Setup Mode

When an agency owner clicks "New Agent," the **builder opens in setup mode** — the same chat interface they use for landing pages, but with the full system knowledge library loaded as context.

```
Agency Owner: "I need an agent for a plumber in Munich."

Builder AI (in setup mode, using meta-context.md + hero-definition.md):
  "Great! Let's set up Schmidt Sanitär's AI employee. I'll ask a few
   questions to make sure the agent sounds right and knows what to do.

   First — who is your client's typical customer?
   Homeowners with emergencies, or mostly planned renovations?"
```

The builder AI walks through the frameworks in order:

| Step | System Knowledge Used | What It Generates |
|------|----------------------|-------------------|
| 1. Identify the hero | `hero-definition.md` | Customer persona, three-level problem (external/internal/philosophical) |
| 2. Position the guide | `guide-positioning.md` | Brand voice, empathy/authority balance, one-liner |
| 3. Define the plan | `plan-and-cta.md` | Process plan (3 steps), CTA, transitional CTA |
| 4. Build the knowledge base | `knowledge-base-structure.md` | 8 KB documents generated and saved to media library |
| 5. Design conversation flow | `conversation-design.md` | System prompt, greeting, discovery questions, objection handling |
| 6. Configure tools & channels | `meta-context.md` | Enabled tools, channel config, autonomy level |

### What Gets Generated (Not Pre-Built)

For Schmidt Sanitär, the builder AI in setup mode would generate:

**System Prompt** (tailored, not template):
```
Du bist der KI-Assistent von Schmidt Sanitär, einem Sanitär- und
Heizungsbetrieb in München. Dein Kunde — der Hausbesitzer — steht vor
einem stressigen Problem: etwas ist kaputt und er weiß nicht, was es
kostet oder wie schnell es behoben werden kann. Du bist der vertrauens-
würdige Experte, der Klarheit schafft.

Zeige Empathie ("Das klingt unangenehm"), dann demonstriere Kompetenz
("In 90% der Fälle können wir das am selben Tag lösen"). Führe den
Kunden zu einem Termin oder Kostenvoranschlag.

Schmidt Sanitär's Drei-Schritte-Plan:
1. Beschreiben Sie Ihr Problem → 2. Wir melden uns in 30 Min → 3. Reparatur zum Festpreis
```

**FAQ Entries** (generated from conversation, not from a list):
```
- Based on hero research: emergency-focused questions
- Based on guide positioning: authority + empathy responses
- Based on plan: clear process-oriented answers
- Based on client's actual services, not generic plumber services
```

**Tool Selection** (inferred from business type):
```
- Booking tools (plumber needs appointments)
- CRM tools (capture leads)
- Email tools (follow-up)
- NOT: event tools, menu tools, reservation tools
```

### The Key Insight

This approach means:
- **Any vertical works** — dog groomer, driving school, tax consultant, yoga studio
- **Every agent is unique** — tailored to the specific business, not a generic category
- **The frameworks get smarter over time** — update one MD file, every future agent benefits
- **No code changes for new verticals** — the intelligence is in the knowledge files, not in TypeScript configs

---

## Vertical Hints (Not Templates)

The builder's setup mode offers vertical selection as **context hints**, not rigid configs. The vertical tells the builder AI which frameworks to emphasize and which questions to ask first.

```
What type of client are you setting up?

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

When the agency owner picks "Handwerk," the builder AI knows:
- Hero is likely a homeowner with an urgent problem
- Guide should emphasize reliability and speed
- Plan should be: describe problem → quick response → fixed-price repair
- Key tools: booking, CRM, emergency routing
- Key objections: cost uncertainty, availability, trust

But it ASKS instead of ASSUMING. The conversation confirms or overrides these hints.

**"Andere Branche"** works just as well — the builder AI simply asks more questions since it has fewer starting assumptions.

---

## Connection to System Knowledge Library

The builder AI loads knowledge based on the setup phase:

### During Setup (SETUP_MODE)
All files loaded:
- `meta-context.md` — three-layer model (always loaded)
- `hero-definition.md` — identify the customer
- `guide-positioning.md` — position the client
- `plan-and-cta.md` — define the process
- `knowledge-base-structure.md` — generate KB docs
- `follow-up-sequences.md` — design nurture flows

Plus relevant frameworks based on the conversation:
- `frameworks/storybrand.md` — when building brand messaging
- `frameworks/icp-research.md` — when researching the target customer
- `frameworks/marketing-made-simple.md` — when setting up funnels
- `frameworks/funnels.md` — when designing the value ladder
- `frameworks/mckinsey-consultant.md` — when analyzing the market
- `frameworks/perfect-webinar.md` — when handling belief objections
- `frameworks/go-to-market-system.md` — when launching a new client

### During Customer Conversations (CUSTOMER_MODE)
Only what the deployed agent needs:
- `meta-context.md` — always
- `conversation-design.md` — how to talk to customers
- `handoff-and-escalation.md` — when to step aside

---

## What This Replaces

| Old Approach (Rigid Templates) | New Approach (Knowledge-Driven) |
|-------------------------------|-------------------------------|
| 6 hardcoded template configs | System knowledge library (15 files) |
| `agentTemplates.ts` (~400 lines) | Already built — no new code needed |
| Cookie-cutter FAQ entries | AI-generated, business-specific FAQs |
| Generic system prompts with `[PLACEHOLDERS]` | Tailored prompts from StoryBrand framework |
| Works for 6 verticals | Works for ANY vertical |
| Agency fills in a form | Agency has a conversation |
| Template maintenance burden | Framework updates benefit all agents |

---

## Build Effort

| Component | Effort | Notes |
|-----------|--------|-------|
| System knowledge library | **Done** | 15 files + registry already built |
| Add "setup" to BuilderUIMode | Small | ~20 lines in builder-context.tsx |
| Setup mode system prompt | Small | Wire `getKnowledgeContent("setup")` into builder AI context |
| KB document generation in builder | Medium | Builder AI generates files → visible in file explorer |
| Agent creation via connect step | Medium | Connect step reads agent-config.json → calls createAgent |
| **Total new code** | **Small-Medium** | ~300 lines — the intelligence is in the MD files, builder infrastructure exists |

The key realization: **we already built the hard part.** The system knowledge library IS the template engine. We just need to wire it into the setup flow.
