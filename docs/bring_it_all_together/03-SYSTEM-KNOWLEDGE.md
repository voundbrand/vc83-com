# 03 — System Knowledge Base

> How we make our agents smart about marketing, sales, and customer engagement — without vertical-specific hardcoding.

---

## What Was Built

A library of 15 markdown files in `convex/ai/systemKnowledge/` that give the agent deep understanding of marketing frameworks, customer psychology, and sales strategy. These files are the platform's "consulting brain" — they make our agents better than any competitor's because they don't just chat, they think strategically.

### The Three-Layer Model

Every file is built around this core concept:

```
Layer 1: L4YERCAK3 (platform) = GUIDE → Agency Owner = HERO
Layer 2: Agency Owner = GUIDE → Their Client (plumber) = HERO
Layer 3: Client (plumber) = GUIDE → Client's Customer (homeowner) = HERO
```

The agent must always know which layer it's operating in:
- **Setup mode** (Layer 1-2): Helping agency owner configure a client
- **Customer mode** (Layer 3): Speaking AS the client TO the customer

---

## File Inventory

### Core System Knowledge (8 files)

| File | Purpose | Mode | Priority |
|------|---------|------|----------|
| `meta-context.md` | Three-layer hero/guide model — loaded in EVERY conversation | ALWAYS | 1 |
| `hero-definition.md` | How to identify the Layer 3 hero (client's customer) | SETUP | 2 |
| `guide-positioning.md` | How to position the client as the trusted guide | SETUP | 3 |
| `plan-and-cta.md` | Building process plans, agreement plans, and CTAs | SETUP | 4 |
| `knowledge-base-structure.md` | How to organize the 8-doc client KB folder | SETUP | 5 |
| `conversation-design.md` | How the customer-facing agent talks AS the guide | CUSTOMER | 6 |
| `handoff-and-escalation.md` | When and how AI steps aside for a human | CUSTOMER | 7 |
| `follow-up-sequences.md` | Soap Opera + Seinfeld nurture sequences | SETUP | 8 |

### Adapted Frameworks (7 files)

| File | Source Framework | Triggers |
|------|-----------------|----------|
| `frameworks/storybrand.md` | StoryBrand 7-Part (Donald Miller) | brand_script, messaging, website_copy |
| `frameworks/icp-research.md` | ICP Research Playbook (Reddit-based) | client_onboarding, market_research |
| `frameworks/marketing-made-simple.md` | Marketing Made Simple (5 pieces) | funnel_setup, email_setup, lead_gen |
| `frameworks/funnels.md` | Russell Brunson Funnel Library (18 types) | funnel_design, offer_design |
| `frameworks/mckinsey-consultant.md` | McKinsey GTM (6 frameworks) | market_analysis, competitive_analysis |
| `frameworks/perfect-webinar.md` | Perfect Webinar 4-Video Template | content_creation, belief_breaking |
| `frameworks/go-to-market-system.md` | Combined GTM (Research + Validate + MVP) | new_client_launch, offer_validation |

---

## The Registry

`convex/ai/systemKnowledge/index.ts` — TypeScript metadata registry.

Each entry has:
- `id`: unique identifier
- `name`: human-readable name
- `category`: "core" or "framework"
- `usage`: "ALWAYS_LOAD", "SETUP_MODE", or "CUSTOMER_MODE"
- `triggers`: array of context triggers (e.g., "client_onboarding", "funnel_setup")
- `priority`: load order (1 = first)
- `filePath`: relative path to the .md file

### Helper Functions
```typescript
getAlwaysLoadIds()        // Meta-context only
getSetupKnowledgeIds()    // All core + frameworks for setup mode
getCustomerKnowledgeIds() // Conversation design + handoff + meta-context
getEntriesByTrigger(t)    // On-demand loading by context trigger
getFilePaths(mode, triggers) // Get file paths for a mode + optional triggers
```

---

## Integration Plan

### Step 1: Inject into Agent System Prompt

In `convex/ai/agentExecution.ts` → `buildAgentSystemPrompt()`:

```typescript
// After existing prompt building...
import { KNOWLEDGE_REGISTRY, getCustomerKnowledgeIds } from "../systemKnowledge";

// In customer mode: add conversation design + handoff + meta-context
const customerKnowledge = getCustomerKnowledgeIds()
  .map(id => KNOWLEDGE_REGISTRY.find(k => k.id === id))
  .filter(Boolean);

// Read content from each .md file and append to system prompt
for (const entry of customerKnowledge) {
  parts.push(`\n--- ${entry.name} ---\n${readMdContent(entry.filePath)}`);
}
```

### Step 2: Setup Agent Uses Full Library

When the agency owner is in setup mode (configuring a client), the setup agent loads ALL system knowledge:

```typescript
const setupKnowledge = getSetupKnowledgeIds(); // All 15 files
```

This gives the setup agent the ability to guide the agency owner through:
- ICP research for their client's customers
- StoryBrand BrandScript creation
- Funnel design
- Follow-up sequence planning
- Knowledge base document generation

### Step 3: Build Script for Content Bundling

Since Convex can't import `.md` files directly, a build script reads the MD files and generates a `_compiled.ts` file with string constants:

```bash
# scripts/compile-knowledge.ts
// Read each .md file
// Export as: export const META_CONTEXT = `...content...`;
// Import in agentExecution.ts
```

Alternative: Store content in the database and sync from MD files on deploy.

---

## How It Changes the Agent

### Before System Knowledge
```
Agent: "Hi! How can I help you today?"
Customer: "I need a plumber"
Agent: "We offer plumbing services. Would you like to schedule an appointment?"
```

### After System Knowledge
```
Agent: "Hi! Welcome to Schmidt Sanitär. We know how stressful plumbing
emergencies can be — nobody wants to deal with a leak at midnight. How
can we help you today?"

Customer: "My kitchen sink is leaking"

Agent: "That sounds frustrating — a leak in the kitchen can disrupt
your whole routine. The good news is, our team handles exactly this
kind of issue every day. Here's how it works:

1. We schedule a visit at a time that works for you
2. Our technician assesses the problem and gives you a fixed quote
3. We fix it — usually same-day

No hidden fees, guaranteed. Would you like to book a time? We have
openings tomorrow morning and Thursday afternoon."
```

The difference: empathy first, then authority, then plan, then CTA. That's StoryBrand built into the agent's DNA.

---

## What the Agency Owner Experiences

When setting up a new client with the setup agent:

1. Agent asks ICP questions (from `hero-definition.md`)
2. Generates a hero profile document → saves to media library
3. Walks through guide positioning (from `guide-positioning.md`)
4. Generates brand voice document → saves to media library
5. Helps design the plan + CTA (from `plan-and-cta.md`)
6. Creates the 8-document knowledge base (from `knowledge-base-structure.md`)
7. Suggests a follow-up sequence (from `follow-up-sequences.md`)
8. Recommends a funnel type (from `frameworks/funnels.md`)

The result: a fully populated knowledge base folder in the media library, ready for the customer-facing agent to consume.

---

## Extending the System

To add a new framework:

1. Write a `.md` file with frontmatter (system, category, usage, triggers)
2. Drop it in `convex/ai/systemKnowledge/` or `frameworks/`
3. Add an entry to the `KNOWLEDGE_REGISTRY` array in `index.ts`
4. Deploy

The agent automatically picks it up based on triggers. No code changes needed beyond the registry entry.
