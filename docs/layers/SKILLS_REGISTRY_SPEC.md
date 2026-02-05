# Skills Registry Specification

## What This Solves

The composition knowledge docs (Phase 1) teach the AI *what primitives exist* and *how to combine them* at a high level. Skills teach the AI *exactly how to execute* a specific template type end-to-end — every object, every field value, every automation node, every edge.

The relationship:

```
Composition Docs (general)          Skills (specific)
─────────────────────────           ─────────────────
ontology-primitives.md        →     _SHARED.md (canonical field reference)
use-case-recipes.md           →     9x SKILL.md files (full execution plans)
layers-composition.md         →     Each SKILL.md has its own Layers section
sequence-patterns.md          →     Each SKILL.md has its own sequence section
```

Composition docs = "here are the building blocks and patterns."
Skills = "here's the complete blueprint for this specific thing, with every field name and every node connection."

---

## Where Skills Live

```
convex/ai/systemKnowledge/skills/
├── _SHARED.md                          ← Canonical ontology reference (all skills import from here)
├── lead-generation/
│   └── SKILL.md
├── event-promotion/
│   └── SKILL.md
├── product-launch/
│   └── SKILL.md
├── booking-appointment/
│   └── SKILL.md
├── membership-subscription/
│   └── SKILL.md
├── webinar-virtual-event/
│   └── SKILL.md
├── ecommerce-storefront/
│   └── SKILL.md
├── client-onboarding/
│   └── SKILL.md
└── fundraising-donations/
    └── SKILL.md
```

**Why `convex/ai/systemKnowledge/skills/`:**
- Same directory tree as all other knowledge docs
- Gets bundled by `generate-knowledge-content.mjs` into `_content.ts`
- Loaded at runtime via the same `getKnowledgeContent()` function
- Indexed in `KNOWLEDGE_REGISTRY` with trigger-based loading

---

## How Skills Load

### Registry Entries

Each skill gets a registry entry with `category: "skill"` and `usage: "BUILDER_MODE"`:

```typescript
// In convex/ai/systemKnowledge/index.ts

export type KnowledgeCategory = "core" | "framework" | "composition" | "skill";

// Example entry
{
  id: "skill-lead-generation",
  name: "Lead Generation Skill",
  category: "skill",
  usage: "BUILDER_MODE",
  triggers: [
    "lead_generation",
    "lead_gen",
    "capture_leads",
    "landing_page",
    "lead_magnet",
    "opt_in",
  ],
  priority: 30,
  filePath: "skills/lead-generation/SKILL.md",
}
```

### Loading Strategy: Selective, Not All-At-Once

Skills are large (2-4K tokens each). Loading all 9 would consume ~25K tokens. Instead:

1. **`_SHARED.md` always loads** in BUILDER_MODE (priority 29, always loaded when any skill loads)
2. **Individual skills load on trigger match** — only the relevant skill(s) for the user's intent
3. **Multiple skills can load** if the user's request spans multiple use cases (e.g., "event with ticket sales" loads both `event-promotion` and `ecommerce-storefront`)

```typescript
// In chat.ts, the builder mode injection already loads all BUILDER_MODE docs.
// For skills, we use trigger-based loading instead:

if (isLayersBuilderContext) {
  // Always load composition docs (general knowledge)
  const compositionDocs = getKnowledgeContent("builder");

  // Load matching skills based on user message intent
  const skillDocs = getKnowledgeContent("builder", detectedTriggers);
  // detectedTriggers comes from intent classification on the user message
}
```

### Intent Detection

The agent's user message gets classified against skill triggers before prompt assembly. This can be:

**Option A: Keyword matching** (simple, no cost)
```typescript
function detectSkillTriggers(message: string): string[] {
  const triggers: string[] = [];
  const lower = message.toLowerCase();

  if (/lead|opt.?in|landing|magnet|capture/i.test(lower)) triggers.push("lead_generation");
  if (/event|workshop|conference|seminar|meetup/i.test(lower)) triggers.push("event_setup");
  if (/launch|release|new product/i.test(lower)) triggers.push("product_launch");
  if (/book|appoint|schedul|calendar|consult/i.test(lower)) triggers.push("booking_system");
  if (/member|subscri|recurring|communit/i.test(lower)) triggers.push("membership");
  if (/webinar|masterclass|training|presentation/i.test(lower)) triggers.push("webinar");
  if (/shop|store|ecommerce|e-commerce|catalog/i.test(lower)) triggers.push("ecommerce");
  if (/onboard|intake|welcome.+client|new.+client/i.test(lower)) triggers.push("onboarding");
  if (/donat|fundrais|nonprofit|charity|crowdfund/i.test(lower)) triggers.push("fundraising");

  return triggers;
}
```

**Option B: LLM classification** (better accuracy, costs 1 credit) — pre-classify the message with a cheap model call before assembling the main prompt.

Recommendation: Start with Option A. Upgrade to Option B later if accuracy matters.

---

## How Skills Relate to Existing Tools

Skills are NOT new tool definitions. They are **knowledge documents** that tell the AI what existing tools to call, in what order, with what parameters.

```
Skill SKILL.md (knowledge)
  ├── References: AI tools from registry.ts
  │   ├── createWorkflowTool
  │   ├── createTicketTool
  │   ├── manage_forms
  │   └── manage_crm
  │
  ├── References: Ontology mutations (called via tools)
  │   ├── createProduct()
  │   ├── createForm()
  │   └── createWorkflow()
  │
  └── References: Layers nodes (for workflow composition)
      ├── trigger_form_submitted
      ├── lc_crm
      └── lc_email
```

The execution path:
1. User says "build a lead gen funnel for a dentist"
2. System detects trigger: `lead_generation`
3. System loads: `_SHARED.md` + `skills/lead-generation/SKILL.md`
4. AI reads the skill, plans the composition
5. AI calls existing tools (`manage_forms`, `manage_crm`, `createWorkflowTool`, etc.)
6. Tools execute ontology mutations
7. Objects created, linked, workflows activated

---

## Content Generator Updates

The `generate-knowledge-content.mjs` script needs to recursively scan `skills/`:

```javascript
// Skills files (recursive subdirectories)
const SKILLS_DIR = join(KNOWLEDGE_DIR, "skills");

function scanSkillsDir(dir, prefix = "skills") {
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      scanSkillsDir(join(dir, item.name), `${prefix}/${item.name}`);
    } else if (item.name.endsWith(".md")) {
      const raw = readFileSync(join(dir, item.name), "utf-8");
      const content = stripFrontmatter(raw);
      const constName = toConstName(`${prefix}/${item.name}`);
      // For SKILL.md files, use folder name as ID: "skill-lead-generation"
      const id = item.name === "SKILL.md"
        ? `skill-${prefix.split("/").pop()}`
        : item.name.replace(/\.md$/, "");
      entries.push({ constName, content, id, filePath: `${prefix}/${item.name}` });
    }
  }
}

if (existsSync(SKILLS_DIR)) {
  scanSkillsDir(SKILLS_DIR);
}
```

**ID convention:**
- `_SHARED.md` → id: `skill-shared`
- `skills/lead-generation/SKILL.md` → id: `skill-lead-generation`
- `skills/event-promotion/SKILL.md` → id: `skill-event-promotion`

---

## SKILL.md Structure

Every SKILL.md follows this exact structure:

### 1. Purpose
One paragraph. What this template type is, who it's for (agency deploying for their client), what outcome it delivers.

### 2. Ontologies Involved
Every ontology this template touches. Specific object types, subtypes, and custom properties. Reference `_SHARED.md` field names exactly.

### 3. Builder Components
Pages, forms, checkout flows the Builder generates. Page hierarchy, what each page does, ontology object connections.

### 4. Layers Automations
Every workflow needed. For each: trigger node → intermediate nodes → action nodes. Exact node types from the registry. Exact handle connections. Exact config values.

### 5. CRM Pipeline Definition
Pipeline stages for this use case. Stage names, expected transitions, automation triggers per stage.

### 6. File System Scaffold
Project folder structure when deployed. What auto-creates in the Finder. Which folders get builder refs, layer refs, notes.

### 7. Data Flow Diagram
ASCII diagram showing data movement: end-user action → ontology records → automations triggered → outputs.

### 8. Customization Points
What the agency will customize per client. Explicit flags for "ask the agency" vs "use sensible default." Grouped by: must-customize, should-customize, can-use-default.

### 9. Common Pitfalls
What goes wrong. Missing wiring, broken sequences, unlinked objects. Self-check list for the AI.

### 10. Example Deployment Scenario
Concrete example: "A marketing agency sets up [this] for a [specific client]. Here's exactly what gets created." Full end-to-end walkthrough with real field values.

---

## How to Add a New Skill

1. Create folder: `convex/ai/systemKnowledge/skills/[skill-name]/`
2. Write `SKILL.md` following the 10-section structure
3. Add registry entry in `convex/ai/systemKnowledge/index.ts` with:
   - `id: "skill-[skill-name]"`
   - `category: "skill"`
   - `usage: "BUILDER_MODE"`
   - `triggers: [...]` (keywords that match this skill)
   - `priority: 30+` (after composition docs)
4. Run `node scripts/generate-knowledge-content.mjs` to rebuild `_content.ts`
5. Verify with `getKnowledgeContent("builder", ["your_trigger"])` that it loads

---

## How to Update a Skill

1. Edit the `SKILL.md` file
2. Run `node scripts/generate-knowledge-content.mjs`
3. Deploy

No code changes needed. Skills are pure markdown.

---

## Priority Numbering

```
1-9     core (ALWAYS_LOAD, SETUP_MODE, CUSTOMER_MODE)
10-19   framework (SETUP_MODE)
20-24   composition (BUILDER_MODE, general)
25-29   shared references (BUILDER_MODE, _SHARED.md)
30-39   skills (BUILDER_MODE, trigger-loaded)
```

---

## Token Budget

Approximate sizes per skill:

| Component | Est. Tokens |
|-----------|-------------|
| `_SHARED.md` | ~3,000 |
| Each SKILL.md | ~2,500 |
| Composition docs (4) | ~8,000 |
| Layers builder prompt | ~4,000 |

**Worst case (1 skill loaded):** ~17,500 tokens of system knowledge
**Typical case:** ~15,000 tokens (composition + shared + 1 skill)
**Multi-skill (2 loaded):** ~20,000 tokens

This is within budget for Claude's context window and leaves plenty of room for conversation history and org RAG results.

---

## Three-Layer Relationship

Every skill must maintain clarity about the three-layer relationship:

```
L4YERCAK3 (Platform)
  │
  ├── Provides: ontologies, workflows, builder, skills, knowledge
  │
  └── Agency (Our Customer)
      │
      ├── Configures: skills, org RAG, agent personality, pipelines
      │
      └── Agency's Client (Their Customer)
          │
          └── End Customer (The Person Who Fills Out The Form)
              │
              └── Interacts with: forms, checkouts, booking pages, chat agents
```

Skills are written for the AI that serves the **Agency**. The AI helps the Agency build things for the Agency's Client's End Customers.
