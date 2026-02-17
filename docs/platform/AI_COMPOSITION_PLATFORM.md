# AI Composition Platform Strategy

Canonical docs home:
- `docs/platform/CANONICAL_DOCS_INDEX.md`
- `docs/platform/DOC_STATUS_MATRIX.md`

## The Model

Three layers, not templates.

```
┌─────────────────────────────────────────────────────┐
│  KNOWLEDGE (what to build + why)                     │
│  ├── Platform Knowledge (free, built-in)            │
│  │   L4YERCAK3 systems: StoryBrand, Funnels,        │
│  │   Perfect Webinar, Marketing Made Simple,         │
│  │   ICP Research, McKinsey, Go-To-Market            │
│  │                                                   │
│  └── Org Knowledge (custom RAG, costs credits)      │
│      Agency uploads: industry playbooks, client      │
│      ICPs, niche processes, proprietary methods      │
├─────────────────────────────────────────────────────┤
│  RECIPES (how to combine primitives)                 │
│  Composition knowledge that maps use cases to        │
│  platform primitives. "Lead gen funnel" →            │
│  form + CRM pipeline + Layers workflow + sequence    │
├─────────────────────────────────────────────────────┤
│  SKILLS (execute it)                                 │
│  Composable actions the AI calls to actually         │
│  create objects, wire automations, deploy flows      │
└─────────────────────────────────────────────────────┘
```

The AI agent reads the knowledge, matches the recipe, calls skills to execute. No hard-coded templates. The "template" is the AI's reasoning — informed by framework knowledge, shaped by org-specific context, executed through modular skills.

---

## 1. Knowledge Layer

### Platform Knowledge (Built-In, Free)

Already exists in `convex/ai/systemKnowledge/`. The 7 L4YERCAK3 systems + 8 core documents are bundled into every deployment. Loaded via trigger matching:

| Trigger | Knowledge Loaded |
|---------|-----------------|
| `lead_generation` | funnels.md, marketing-made-simple.md |
| `funnel_setup` | funnels.md, storybrand.md, plan-and-cta.md |
| `content_creation` | perfect-webinar.md, storybrand.md |
| `client_onboarding` | icp-research.md, hero-definition.md, go-to-market-system.md |
| `market_analysis` | mckinsey-consultant.md |
| `email_sequence_creation` | follow-up-sequences.md, marketing-made-simple.md |

**What's new:** Add composition knowledge docs (recipes) that bridge frameworks → platform primitives. These go in `convex/ai/systemKnowledge/composition/` and teach the AI which skills to call for which use case.

### Organization Knowledge (Custom RAG, Costs Credits)

Agencies upload their own expertise. This is what makes each agency's AI agent uniquely valuable — it knows the agency's methods, not just the platform's.

**What agencies upload:**
- Industry-specific playbooks ("SaaS onboarding best practices")
- Client ICP profiles ("luxury real estate buyer persona")
- Proprietary funnels ("our 7-step agency sales process")
- Niche compliance ("healthcare appointment HIPAA flow")
- Case studies & results ("how we got Client X 300 leads in 30 days")
- Pricing frameworks ("our tiered pricing model for coaching clients")
- Objection handling ("top 10 objections our clients' customers raise")

**Current state vs. target:**

| | Current | Target |
|---|---|---|
| Storage | Media library (files + Layer Cake docs) | Same |
| Retrieval | Full document injection (~60K cap) | Vector RAG + selective retrieval |
| Intelligence | None — dump everything into context | Semantic search — load only relevant chunks |
| Cost | Free (just storage quota) | Credits for embedding + retrieval |
| Limit | Context window size | Unlimited knowledge, smart retrieval |

### The "Create RAG" Flow

**User experience:**

1. Agency uploads files to media library (PDF, markdown, text) — this already works
2. Agency clicks "Create Knowledge Base" (or "Create RAG") button on uploaded doc(s)
3. System chunks the document(s) into semantic segments
4. System generates embeddings for each chunk
5. Embeddings stored in a vector index
6. Credits deducted for the embedding cost
7. Document marked as `ragEnabled: true` in media item

**Credit costs:**

```typescript
// Add to CREDIT_COSTS
rag_embed_document: 3,     // Per document chunked + embedded
rag_query: 1,              // Per retrieval query during agent execution
```

When the AI agent processes a message, instead of dumping all knowledge base docs into context, it:
1. Takes the user's message as a semantic query
2. Searches the org's vector index (costs 1 credit per query)
3. Retrieves the top-K most relevant chunks
4. Injects only those chunks into the system prompt
5. Result: more relevant context, less noise, larger effective knowledge base

**Schema additions to `organizationMedia`:**

```typescript
// New fields on organizationMedia items
ragEnabled: v.optional(v.boolean()),
ragChunkCount: v.optional(v.number()),
ragEmbeddedAt: v.optional(v.number()),
ragEmbeddingModel: v.optional(v.string()),
```

**New table: `ragChunks`**

```typescript
ragChunks: defineTable({
  organizationId: v.id("organizations"),
  mediaItemId: v.id("organizationMedia"),
  chunkIndex: v.number(),
  content: v.string(),
  embedding: v.array(v.float64()),  // or use Convex vector search
  metadata: v.object({
    sourceFilename: v.string(),
    pageNumber: v.optional(v.number()),
    sectionTitle: v.optional(v.string()),
    charStart: v.number(),
    charEnd: v.number(),
  }),
})
  .index("by_organization", ["organizationId"])
  .index("by_media_item", ["mediaItemId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,  // or 768 depending on model
    filterFields: ["organizationId"],
  })
```

---

## 2. Recipe Layer (Composition Knowledge)

Recipes are markdown documents in `convex/ai/systemKnowledge/composition/` that teach the AI how to map use cases to platform primitives. They're loaded via `BUILDER_MODE` usage mode.

### Recipe Structure

Each recipe answers: "When someone says X, here's what to build."

```markdown
## Recipe: [Use Case Name]

**Triggers:** "lead gen", "capture leads", "landing page"

**L4YERCAK3 systems:** Funnels (Lead Squeeze), StoryBrand, Marketing Made Simple

**Skills to call (in order):**
1. create_form — registration form with [fields]
2. create_product — if paid, create product with [config]
3. create_checkout — if paid, wire product + form
4. create_crm_pipeline — stages: [stage list]
5. create_layers_workflow — [trigger] → [nodes] → [edges]
6. create_sequence — [steps with timing and channels]
7. link_objects — connect form → product → checkout → workflow

**Adapt based on:**
- Client industry (real estate, coaching, SaaS, etc.)
- Price point (free lead magnet vs. paid offer)
- Channel mix (email only vs. email + SMS + WhatsApp)
- Org's custom knowledge (if they have industry-specific RAG)
```

### Recipe Documents

| Document | Content |
|----------|---------|
| `ontology-primitives.md` | Platform building blocks — object types, properties, link types, pipeline patterns |
| `layers-composition.md` | Layers node wiring patterns — which nodes connect for which automation |
| `use-case-recipes.md` | Full recipes for 9 core use cases (lead gen, event, product launch, booking, membership, webinar, e-commerce, onboarding, fundraising) |
| `sequence-patterns.md` | Email/SMS/WhatsApp sequence patterns mapped to L4YERCAK3 systems (Soap Opera, Seinfeld, Sales Campaign, Belief-Breaking, etc.) |

### How Recipes Compose with Org Knowledge

The AI doesn't just follow the recipe blindly. It combines:

1. **Recipe** says: "Create a 5-email Soap Opera Sequence"
2. **Platform knowledge** (StoryBrand) says: "Email 1 is guide introduction, Email 2 is problem agitation..."
3. **Org knowledge** (custom RAG) says: "In luxury real estate, the main pain point is wasted time on unqualified viewings, and the language pattern is 'I just want to see homes that actually match what I'm looking for'"
4. **Result**: AI generates a 5-email sequence with real estate-specific copy using the client's actual ICP language

---

## 3. Skills Layer

Skills are composable tool functions the AI calls to execute against the platform. Each skill maps to one or more ontology mutations.

### Skill Registry

```typescript
// convex/ai/skills/registry.ts

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: "ontology" | "automation" | "content" | "integration";
  creditCost: number;
  parameters: JSONSchema;  // Input schema for the skill
  requiredObjects?: string[];  // Objects that must exist first
  createsObjects?: string[];  // Object types this skill creates
  requiresApproval?: boolean; // Default approval requirement
}
```

### Core Skills

#### Ontology Skills (Create/Configure Platform Objects)

| Skill | What it creates | Credit cost | Key params |
|-------|----------------|-------------|------------|
| `create_form` | Form with fields + steps | 1 | fields[], subtype, publicUrl |
| `create_product` | Product with pricing | 1 | name, priceInCents, subtype, inventory |
| `create_checkout` | Checkout wiring products + forms | 1 | productIds[], formRequirements, paymentMethods |
| `create_crm_pipeline` | CRM pipeline with stages | 1 | stages[], pipelineName |
| `create_crm_contact` | CRM contact record | 1 | name, email, phone, source, tags |
| `create_event` | Event with details | 1 | name, date, location, description |
| `create_project` | Project with scaffold | 1 | name, subtype, milestones[], tasks[] |
| `create_invoice_template` | Invoice configuration | 1 | lineItems[], paymentTerms |

#### Automation Skills (Wire Up Workflows + Sequences)

| Skill | What it creates | Credit cost | Key params |
|-------|----------------|-------------|------------|
| `create_layers_workflow` | Layers workflow (nodes + edges) | 2 | trigger, nodes[], edges[], description |
| `create_sequence` | Multi-step automation sequence | 2 | steps[], triggerEvent, channels |
| `link_objects` | Object relationships | 0 | fromId, toId, linkType, properties |
| `activate_workflow` | Set workflow to active | 1 | workflowId |

#### Content Skills (Generate Copy + Assets)

| Skill | What it produces | Credit cost | Key params |
|-------|-----------------|-------------|------------|
| `generate_copy` | StoryBrand-guided copy | 2 | context, copyType (landing_page, email, form_field) |
| `generate_sequence_content` | Email/SMS content for sequence steps | 2 | sequenceId, stepIndex, framework (soap_opera, seinfeld, sales) |
| `generate_brandscript` | Full 7-part BrandScript | 3 | heroProfile, industry, product |

#### Integration Skills (Connect External Services)

| Skill | What it configures | Credit cost | Key params |
|-------|-------------------|-------------|------------|
| `configure_email_integration` | Resend / ActiveCampaign setup | 1 | provider, listId, tags |
| `configure_payment` | Stripe product + price sync | 1 | productId, stripePriceConfig |
| `configure_channel` | WhatsApp / SMS / email routing | 1 | channel, provider, credentials |

### Skill Execution Flow

```
Agency owner: "Build a lead gen funnel for my real estate client"
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ 1. KNOWLEDGE RESOLUTION                      │
│    Platform: funnels.md + storybrand.md +     │
│             marketing-made-simple.md          │
│    Org RAG: "luxury-real-estate-icp.pdf"     │
│             "our-lead-gen-playbook.md"        │
│    Recipe: use-case-recipes.md → Lead Gen     │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│ 2. AI PLANS THE COMPOSITION                  │
│    Based on recipe + knowledge + context:     │
│    "I need to call these skills in order..."  │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│ 3. SKILL EXECUTION (sequential, credit-gated)│
│                                              │
│  ① create_form                    (1 credit) │
│     → Registration form: name, email, phone, │
│       "What type of property?"               │
│                                              │
│  ② create_crm_pipeline            (1 credit) │
│     → Stages: new_lead → contacted →         │
│       showing_scheduled → offer → closed     │
│                                              │
│  ③ create_layers_workflow          (2 credits)│
│     → trigger_form_submitted → lc_crm →      │
│       lc_email → lc_activecampaign           │
│                                              │
│  ④ create_sequence                 (2 credits)│
│     → 5-email Soap Opera adapted for         │
│       luxury real estate ICP language         │
│                                              │
│  ⑤ generate_copy                   (2 credits)│
│     → Landing page copy using StoryBrand     │
│       + real estate pain points from RAG     │
│                                              │
│  ⑥ link_objects                    (0 credits)│
│     → Wire form → workflow → sequence        │
│                                              │
│  Total: 9 credits                            │
└──────────────────────────────────────────────┘
```

### Skill vs. Tool

Skills are higher-level than the existing agent tools. A skill may call multiple ontology mutations internally:

```
Skill: create_layers_workflow
  └── Internally calls:
      ├── layerWorkflowOntology.create (create workflow object)
      ├── layerWorkflowOntology.updateNodes (set nodes + edges)
      └── layerWorkflowOntology.updateStatus (set to "ready")

Skill: create_sequence
  └── Internally calls:
      ├── sequenceOntology.createSequence
      ├── sequenceOntology.addStep (× N steps)
      └── sequenceOntology.activate
```

The existing tool registry (`convex/ai/tools/registry.ts`) stays for low-level agent interactions. Skills layer on top for composition workflows.

### Autonomy + Approval

Skills respect the same autonomy model as tools:

- `autonomous`: Skills execute immediately, results shown to agency owner
- `supervised`: Skills queued for approval before execution (agency owner reviews what will be created)
- `draft_only`: AI describes what it WOULD create but doesn't execute (preview mode)

For composition workflows, `supervised` is the recommended default — the AI plans the full stack, presents it for review, then executes on approval.

---

## 4. Org RAG Creation Flow

### User Experience

**In the Media Library:**

1. Agency uploads documents (already works today)
2. New "Knowledge Base" section in media library sidebar
3. Documents can be tagged and organized
4. "Enable AI Knowledge" toggle on each document (or bulk select)
5. Clicking the toggle triggers embedding generation
6. Credit cost shown before confirmation: "This will use 3 credits per document"
7. Progress indicator while embedding runs
8. Once complete, document shows "AI-indexed" badge

**In Agent Configuration:**

1. Agent config already has `knowledgeBaseTags` for filtering
2. Add a "Knowledge Sources" section showing which docs are RAG-enabled
3. Agent can be scoped to specific tagged knowledge (e.g., only "real-estate" docs)
4. Show estimated credit cost per conversation based on RAG query volume

### Technical Flow

```
Upload document → Text extraction (existing) → Click "Enable AI Knowledge"
    │
    ▼
┌─────────────────────────────────────────┐
│ CHUNKING                                 │
│ Split document into ~500-token chunks    │
│ Preserve section boundaries              │
│ Store metadata (page, section, position) │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ EMBEDDING                                │
│ Generate vector embedding per chunk      │
│ Model: text-embedding-3-small (1536 dim) │
│ Cost: 3 credits per document             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ STORAGE                                  │
│ Store in ragChunks table                 │
│ Convex vector index for similarity search│
│ Scoped by organizationId                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ RETRIEVAL (at agent runtime)             │
│ User message → embed query              │
│ Vector search → top 5-10 chunks         │
│ Inject relevant chunks into prompt       │
│ Cost: 1 credit per retrieval query       │
└─────────────────────────────────────────┘
```

### Hybrid Retrieval

For agent execution, combine both retrieval methods:

```
System prompt assembly:
1. Platform system knowledge (always loaded, mode-based)
2. Org RAG results (vector search on user message → top K chunks)  ← NEW
3. Org full docs (non-RAG docs still injected fully, existing behavior)
4. Agent identity + personality + brand voice
5. Custom overrides + FAQ entries
```

RAG-enabled docs are retrieved semantically. Non-RAG docs (small, always-relevant ones) continue to be injected fully. Agency decides per document.

### Credit Model Summary

| Action | Credits | When |
|--------|---------|------|
| Upload document | 0 | Free (storage quota applies) |
| Text extraction | 0 | Free (existing behavior) |
| Create RAG (embed document) | 3 | One-time per document |
| Re-embed after edit | 3 | Per document update |
| RAG query during agent message | 1 | Per agent message that uses RAG |
| Agent message (LLM) | 1-3 | Per message (existing) |
| Skill execution | 1-3 | Per skill (see skill table) |
| Full composition workflow | ~9-15 | Sum of all skills called |

---

## 5. How It All Connects

### Business Layer Mapping (Canonical Four-Layer Model)

Canonical source:
- [FOUR_LAYER_PLATFORM_MODEL.md](./FOUR_LAYER_PLATFORM_MODEL.md)

This composition architecture maps to `BusinessLayer` as follows:

- **Business L1 (Platform)** provides: system knowledge + recipes + skills
- **Business L2 (Agency)** curates strategy, enables models/tools, and deploys compositions
- **Business L3 (Sub-org / Agency Customer)** provides org-specific RAG knowledge, agent config, and brand voice
- **Business L4 (End-customer)** receives and interacts with the deployed customer-facing experiences

Important:
- `PolicyLayer` (Platform -> Org -> Agent -> Session) is separate from business hierarchy.
- `MemoryLayer` (five-layer memory stack) is also separate.

### Agent Modes

| Mode | Knowledge Loaded | Skills Available | Use Case |
|------|-----------------|------------------|----------|
| `CUSTOMER_MODE` | meta-context + conversation-design + handoff + org RAG | Read-only tools (query, search) | Agent talking to end customer |
| `SETUP_MODE` | All core + all frameworks + org RAG | Configuration tools | Agency owner setting up client |
| `BUILDER_MODE` | meta-context + composition docs + triggered frameworks + org RAG | All skills + all tools | Agency owner composing automations |

### Prompt Assembly for BUILDER_MODE

```typescript
function buildBuilderPrompt(
  agentConfig: AgentConfig,
  userMessage: string,
  orgKnowledgeDocs: KBDoc[],
  ragResults: RAGChunk[],
  triggers: string[],
): string {
  return [
    // 1. Platform composition knowledge
    ...getKnowledgeContent("builder", triggers),

    // 2. Layers node catalog (existing)
    getLayersBuilderPrompt(),

    // 3. Org RAG results (semantic match to user message)
    formatRAGResults(ragResults),

    // 4. Org full docs (non-RAG, small docs)
    formatFullDocs(orgKnowledgeDocs.filter(d => !d.ragEnabled)),

    // 5. Skill catalog (available skills + params)
    getSkillCatalog(),

    // 6. Agent identity
    formatAgentIdentity(agentConfig),
  ].join("\n\n---\n\n");
}
```

---

## 6. Why This Wins

**For the platform:**
- No engineering per "template" — new use cases = new markdown recipe docs
- Knowledge compounds — every framework doc makes every recipe better
- Org RAG is a revenue lever — agencies pay credits the more knowledge they add
- Skills are reusable — same skill set serves infinite use cases

**For agencies:**
- Their proprietary knowledge becomes a competitive moat
- The AI gets smarter with every document they add
- Compositions adapt to each client's industry and context
- They can deploy client engagements through conversation, not configuration

**For agency clients:**
- They get purpose-built automations, not generic templates
- Copy and messaging reflect their actual ICP language
- Workflows match their specific business model
- Everything is wired together from day one

---

## 7. Implementation Phases

### Phase 1: Composition Knowledge
- Write the 4 composition `.md` files
- Add `BUILDER_MODE` to knowledge registry
- Add `composition` category
- Run `generate-knowledge-content.mjs` to bundle
- Wire into layers builder prompt

### Phase 2: Skills Registry
- Define skill interfaces in `convex/ai/skills/`
- Implement core ontology skills (create_form, create_product, etc.)
- Implement automation skills (create_layers_workflow, create_sequence)
- Register skills in tool registry with credit costs
- Add skill execution to agent pipeline

### Phase 3: Org RAG
- Add `ragChunks` table to schema
- Implement chunking logic (text splitter)
- Integrate embedding API (OpenAI text-embedding-3-small or similar)
- Add vector search index to Convex
- Build "Enable AI Knowledge" UI toggle in media library
- Wire RAG retrieval into agent prompt assembly
- Add credit costs for embed + query

### Phase 4: Builder Mode Integration
- Add `BUILDER_MODE` to agent execution pipeline
- Build prompt assembly for builder context
- Wire skills into Layers builder chat panel
- Add composition preview (show what will be created before executing)
- Add supervised approval flow for skill chains

### Phase 5: Content Generation Skills
- Implement `generate_copy` skill using StoryBrand framework
- Implement `generate_sequence_content` for email/SMS content
- Implement `generate_brandscript` for full brand narrative
- Wire org RAG into content generation for ICP language matching
