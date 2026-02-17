# Layers - Visual Automation Canvas PRD

Canonical docs home:
- `docs/platform/CANONICAL_DOCS_INDEX.md`
- `docs/platform/DOC_STATUS_MATRIX.md`

## Product Overview

**Layers** is a standalone visual automation canvas that lets agency owners map out their entire marketing and operations tech stack, visually connect the pieces, and have the platform wire everything together — either through third-party integrations or built-in Layer Cake alternatives.

**Tagline**: "The layers behind the layers."

**URL**: `/layers`

---

## Problem Statement

Marketing agencies juggle dozens of tools — CRMs, email platforms, form builders, payment processors, messaging apps, analytics tools. Setting up the connections between them is tedious, error-prone, and usually requires a developer. When a tool is missing from the stack, the agency either goes without or spends weeks evaluating and onboarding a new vendor.

**Layers solves this by**:
1. Giving agencies an open canvas to visually map their ideal automation stack
2. Using AI to understand the intent and connect everything
3. Filling gaps with built-in Layer Cake tools where third-party options are missing or unnecessary

---

## Core Concept

Think Miro meets n8n, but with a critical twist: Layer Cake isn't just an automation layer — it's an **agency operating system** that can be the fallback for any missing piece. Users map their ideal workflow, and the platform either connects to what they have or provides what they don't.

---

## Target Users

- **Agency owners** who need to connect WordPress to HubSpot to ActiveCampaign to WhatsApp, etc.
- **Marketing ops teams** managing complex multi-channel funnels
- **Solo operators** who want enterprise-level automation without enterprise-level tooling

---

## UI Layout & Design

### Overall Structure

```
+------------------------------------------------------------------+
|  [Logo]  Layers    [Templates] [Save] [Share] [Run] [Settings]   |  <- Top Bar (landscape rectangle)
+--------+---------------------------------------------------------+
|        |                                                         |
| TOOL   |                                                         |
| CHEST  |                                                         |
|        |          CANVAS (React Flow grid)                       |
| -----  |                                                         |
| Integ- |                                                         |
| rations|     +------------------------------------------+        |
|        |     |                                          |        |
| -----  |     |   "Describe what you want to build,     |        |
| Trig-  |     |    or close me and do it manually."      |        |
| gers   |     |                                          |        |
|        |     |   [  Chat input prompt...          ] [>] |        |
| -----  |     |                                          |        |
| Logic  |     +------------------------------------------+        |
|        |                                                         |
| -----  |                                                         |
| L4YER  |                                                         |
| CAKE   |                                                         |
| Native |                                                         |
|        |                                                         |
+--------+---------------------------------------------------------+
```

### 1. Top Bar (Navigation & Actions)

Horizontal landscape rectangle spanning the full width.

- **Left**: Layers logo / breadcrumb back to main app
- **Center**: Workflow name (editable inline)
- **Right**: Action buttons
  - **Templates** — Browse pre-built automation patterns
  - **Save** — Persist current canvas state
  - **Share** — Generate shareable link/export
  - **Run** — Execute the workflow (if all connections are valid)
  - **Settings** — Workflow-level configuration

### 2. Tool Chest (Left Panel)

Vertical portrait rectangle. Collapsible. Contains draggable node blocks organized by category.

**Categories**:

#### Integrations (Third-Party)
Connected external services. Each shows status: connected (green dot), available (gray), coming soon (lock icon).

- CRM: HubSpot, Salesforce, Pipedrive
- Email Marketing: ActiveCampaign, Mailchimp, ConvertKit
- Messaging: WhatsApp Business, ManyChat, Telegram, Instagram DM
- Communication: Chatwoot, Infobip, Pushover
- Email Delivery: Resend, SendGrid, Postmark
- Websites: WordPress, Webflow, Squarespace
- Payments: Stripe, PayPal, Mollie
- Automation: n8n, Make, Zapier
- Calendar: Calendly, Cal.com
- Analytics: PostHog, Google Analytics, Plausible
- Dev/Deploy: GitHub, Vercel
- Office: Microsoft 365, Google Workspace

#### Triggers
Events that start a workflow.

- Form Submitted
- Payment Received
- Booking Created
- Contact Created/Updated
- Webhook Received
- Schedule (Cron)
- Manual Trigger
- Email Received
- Chat Message Received

#### Logic & Flow
Control flow nodes.

- If/Then (Conditional Branch)
- Wait/Delay
- Split (A/B Test)
- Merge
- Loop/Iterator
- Filter
- Transform Data
- HTTP Request
- Code Block (custom JS)

#### Layer Cake Native
Built-in platform tools — the gap-fillers. Highlighted differently (branded accent color) to signal "you already have this."

- LC CRM (Contacts, Pipelines, Deals)
- LC Forms
- LC Invoicing
- LC Checkout
- LC Tickets
- LC Bookings
- LC Events/Webinars
- LC Email (Resend-powered)
- LC SMS
- LC WhatsApp
- LC AI Agent
- LC Landing Pages (Builder)
- LC File Storage / Media Library
- LC Certificates

### 3. Canvas (Center)

The main workspace. Built on `@xyflow/react` (already installed).

**Characteristics**:
- Expansive infinite-scroll grid — feels like a big open piece of paper
- Subtle dot-grid background (like Miro/Figma)
- Zoom controls (pinch, scroll, toolbar buttons)
- Minimap in bottom-right corner
- Pan with spacebar + drag or middle-click

**Nodes on Canvas**:
- Each node is a card showing: icon, service name, status indicator, brief config summary
- Click to expand/inspect detailed configuration
- Drag from tool chest to canvas to place
- Snap-to-grid for alignment

**Edges (Connections)**:
- Draw by dragging from a node's output handle to another node's input handle
- **Color-coded status**:
  - **Green (flowing)**: Connection is active and healthy
  - **Yellow (warning)**: Connection configured but untested
  - **Red (broken)**: Connection failed or missing credentials
  - **Gray (draft)**: Not yet configured
- Animated flow particles along edges when workflow is running
- Click an edge to inspect the data flowing through it

### 4. AI Prompt Overlay (Center, Dismissable)

On first load or when canvas is empty, a floating prompt window appears centered on the canvas.

**Above the prompt** (floating text, no container):
> "Describe what you want to build, or close me and do it manually."

**The prompt window**:
- Clean chat input with send button
- Close/dismiss button (X) in corner
- Can be re-opened from top bar or keyboard shortcut
- When active, takes conversational input and generates/modifies the canvas in real-time

**AI Capabilities**:
- "I need a lead capture funnel from my WordPress site through to ActiveCampaign" → AI places WordPress node, Form trigger, ActiveCampaign node, draws connections, highlights what needs credentials
- "Add a WhatsApp notification when a booking is confirmed" → AI adds nodes to existing canvas
- "What's missing?" → AI analyzes the workflow for gaps and suggests improvements
- "Replace HubSpot with something built-in" → AI swaps HubSpot node for LC CRM node

---

## Node Interaction Model

### Node States

1. **Draft** — Placed on canvas, not yet configured
2. **Configuring** — User is setting up credentials/options
3. **Ready** — Fully configured, waiting for activation
4. **Active** — Running in live workflow
5. **Error** — Failed, needs attention
6. **Disabled** — Manually paused

### Node Inspector (Click to Expand)

When a node is clicked, a right-side panel slides out (or inline expansion) showing:

- **Overview**: Service name, icon, status, last activity
- **Configuration**: API credentials, OAuth connection, settings
- **Data Mapping**: Input/output field mapping to connected nodes
- **Logs**: Recent execution history for this specific step
- **Test**: Send test data through this node in isolation

### Unbuilt Integration Nodes

Users can place **any** integration on the canvas, even ones Layer Cake hasn't built yet. The tool chest contains every integration we plan to support — no gatekeeping.

When a user places an integration that isn't yet available:

1. Node appears on the canvas like any other node — fully functional in the design
2. A small **"Upvote"** button appears next to the node (thumbs-up icon or similar)
3. Clicking upvote: *"We'll get this integration built for you quickly."* — sends signal to our roadmap
4. The node still participates in the workflow design — edges connect, data mapping can be defined
5. When the workflow is activated, unbuilt nodes are skipped with a clear indicator

This is lightweight and non-intrusive. No popups, no suggestions to swap. The user maps what they want, we learn what to build next. The upvote data feeds directly into integration prioritization.

**Product discovery feedback loop**: The most-upvoted integrations across all users become our build priority list.

---

## Templates System — Driven by the Recurring Revenue Blueprint

The 5 lead magnets (Recurring Revenue Blueprint series) are the product spec for Layers templates. Each lead magnet describes the exact workflows an agency needs at their growth stage. The templates are organized by agency level, not by abstract category — because the user's first question is always "what do I need at MY stage?"

### Template Organization: By Agency Level

When a user opens the template gallery, they first see the 5 levels. They self-select into their stage (or the AI asks "how many clients do you have?" and routes them). Each level has pre-built canvas workflows.

---

#### Level 1: Your Launch Plan (0 clients, pre-revenue)

**Template: "Starter Kit"**
The agency's first deployable system. 4 connected nodes:

```
[Landing Page] → [Contact Form] → [CRM Pipeline] → [Email Sequence]
                                        ↓
                                  [Booking Widget]
```

- **Landing page**: Vertical-specific template (hero + services + social proof + contact form)
- **Email sequence**: 3 emails (instant confirmation → 24hr follow-up → 72hr last chance)
- **CRM pipeline**: New Lead → Contacted → Qualified → Proposal Sent → Won/Lost
- **Booking**: Self-service scheduling linked from confirmation email

Vertical variations (same structure, different copy/design):
- Home Services (plumber, HVAC, electrician)
- Dental/Medical
- Salon & Beauty
- Restaurant
- Real Estate
- Coaching/Consulting

**Why this is a Layers template, not just a builder template**: The agency owner sees the ENTIRE system at once — landing page connected to form connected to CRM connected to emails. They understand how the pieces fit together before they start configuring. This is the "show a working funnel on a sales call" demo from the PDF.

---

#### Level 2: From Hustle to System (1-3 clients, under €5k/mo)

**Template: "3-Tier Client Package"**
Three parallel workflows representing Starter / Growth / Premium tiers:

```
STARTER TIER:
[Landing Page] → [Contact Form] → [CRM] → [Basic Email]

GROWTH TIER:
[Full Funnel] → [Form + Booking] → [CRM + Tags] → [Email Sequence] → [Payments]

PREMIUM TIER:
[Full Funnel] → [Form + Booking] → [CRM + Tags] → [Email Sequence] → [Payments]
      ↓                                                       ↓
[AI Agent (24/7)]                                    [Monthly Report]
      ↓
[White-Label Portal]
```

- Shows the agency owner exactly what each tier delivers
- Can be cloned per client (same structure, swap branding/copy)
- Includes the 6 vertical funnel templates from the PDF as sub-selections

**Template: "Bottleneck Audit → System"**
Maps the bottleneck audit checklist from the PDF onto the canvas. Each "manual task" becomes a node that gets replaced with an automated node:

```
[Manual Quoting] ──replace──→ [Standardized Packages]
[Manual Landing Pages] ──replace──→ [Template Library]
[Manual CRM Setup] ──replace──→ [Clone Pipeline]
[Manual Emails] ──replace──→ [Template Sequences]
[Manual Tool Connecting] ──replace──→ [One Platform]
```

This is visual and educational — the agency owner literally sees their bottlenecks mapped and resolved.

---

#### Level 3: Breaking Through the Ceiling (4-10 clients, €5-10k/mo)

**Template: "2-Hour Onboarding System"**
The onboarding session table from the PDF (page 3) as a sequential workflow:

```
[Intake Form] → [Select Template] → [Apply Branding] → [Customize Copy]
      ↓               (5 min)          (15 min)           (20 min)
[Connect Domain] → [Setup CRM] → [Connect Email] → [Connect Payments]
      (10 min)        (10 min)       (10 min)           (10 min)
                                        ↓
                              [Configure Booking] → [Test Everything] → [Go Live]
                                   (10 min)            (15 min)          (5 min)
```

Each node has a checklist inside. The agency owner walks through it with their client and checks off steps. Total: 2 hours. This turns the PDF's promise into an executable workflow.

**Template: "Tool Consolidation"**
Visual mapping of current tools → LC native replacements:

```
[Page Builder €30-100/mo] ──→ [LC Funnel Builder]
[CRM €50-200/mo] ──→ [LC CRM]
[Email Tool €30-100/mo] ──→ [LC Email (Resend)]
[Booking Tool €20-50/mo] ──→ [LC Booking]
[Automation Tool €30-100/mo] ──→ [LC Workflows]
[Chatbot €30-100/mo] ──→ [LC AI Agent]
─────────────────────────────────────────
[Total: €200-650/mo] ──→ [Total: One platform]
```

Visually compelling. The agency owner sees the cost savings mapped out.

---

#### Level 4: The Owner's Operating System (11-25 clients, €10-25k/mo)

**Template: "Delegation Framework"**
Maps the owner dependency audit from the PDF onto the canvas. Each function shows who should own it and what system backs it:

```
[Owner] ──delegates──→ [Delivery Lead + Checklist] ──backed by──→ [LC Quality Control]
[Owner] ──delegates──→ [Sales Rep + Pitch Script] ──backed by──→ [LC CRM Pipeline]
[Owner] ──delegates──→ [Account Manager + Protocol] ──backed by──→ [LC Conversations]
[Owner] ──delegates──→ [Onboarding Specialist] ──backed by──→ [2-Hour Onboarding Template]
[Owner] ──delegates──→ [Tech Lead] ──backed by──→ [LC Monitoring/Alerts]
```

**Template: "Recurring Revenue Architecture"**
Visualizes the revenue model from the PDF:

```
[Monthly Retainers 60-70%] ← [Premium Tier Clients]
       ↓                            ↓
[AI Lead Response] + [Optimization] + [Reporting]

[Performance Bonuses 10-20%] ← [Lead Attribution Tracking]
[One-Time Setup Fees 10-20%] ← [New Client Onboarding]
[Upsells 5-10%] ← [Quarterly Review Triggers]
```

**Template: "Sub-Org Client Management"**
Multi-client dashboard workflow:

```
[Agency Dashboard]
    ├── [Client A Sub-Org] → [Their Funnel] → [Their CRM] → [Their Agent]
    ├── [Client B Sub-Org] → [Their Funnel] → [Their CRM] → [Their Agent]
    └── [Client C Sub-Org] → [Their Funnel] → [Their CRM] → [Their Agent]
```

---

#### Level 5: The Optimization Playbook (25+ clients, €25k+/mo)

**Template: "Retention System"**
The proactive retention workflow from the PDF:

```
[Monthly: Auto Performance Report] → [Send to Client]
[Quarterly: Account Review] → [15-min Call] → [Upsell Check]
[At-Risk Signals] → [Usage Drop / Missed Payment / Support Spike] → [Alert Account Manager]
[Annually: Strategy Session] → [Adapt Services] → [Price Review]
```

**Template: "Churn Detection & Response"**
```
[Monitor: Usage Drops] ──→ [Alert]
[Monitor: Missed Payments] ──→ [Alert] ──→ [Account Manager Escalation]
[Monitor: Support Tickets Spike] ──→ [Alert]       ↓
                                           [Save Protocol: Call + Offer]
```

**Template: "Second Vertical Expansion"**
```
[Primary Vertical (Mastered)]
    ├── Clone Template System ──→ [New Vertical Template]
    ├── Customize Copy/Design ──→ [Vertical-Specific Funnel]
    ├── Assign Owner ──→ [Dedicated Team Member]
    └── Target: 5 clients in 90 days
```

**Template: "Agency Dashboard Metrics"**
Visual KPI board on the canvas:
```
[MRR Tracker] + [Churn Rate] + [Avg Revenue/Client] + [Client Acquisition Cost]
       ↓              ↓              ↓                       ↓
[Growing 5-10%/qtr] [Under 5%/mo] [Growing over time]  [Under 2mo retainer]

[Team Utilization] + [Net Profit Margin] + [Owner Hours/Week]
       ↓                    ↓                     ↓
[5-8 clients/person]   [30-50%]             [Under 20 hours]
```

---

### Template Behavior
- Click template → Canvas populates with pre-arranged nodes and edges
- All nodes start in "Draft" state — user configures credentials for each
- AI assists: "I see you selected the Starter Kit template. What vertical are you targeting?"
- User can modify, add, or remove nodes after template loads
- Templates can be **cloned per client** — same structure, swap branding (this is the core Level 2+ promise)
- Templates show estimated time-to-deploy (matching the PDF's onboarding table)

### Template as Lead Magnet

Each of the 5 lead magnet PDFs ends with "Deploy your first client funnel — free." Layers makes that real: the agency owner reads the PDF, comes to Layers, selects their level, clicks the template, and starts configuring. The PDF describes the system; Layers IS the system.

---

## Workflow Execution Model

### Modes

1. **Design Mode** — Default. Canvas editing, node placement, configuration
2. **Test Mode** — Send sample data through the workflow, see results at each step
3. **Live Mode** — Workflow is active, processing real events

### Execution Flow

```
Trigger fires
  → Node 1 processes (show green pulse on edge)
  → Conditional check (show branch taken)
  → Node 2 processes
  → ... continue through workflow
  → End node reached (or error caught)
```

### Monitoring Dashboard (Embedded)

When a workflow is live, the canvas doubles as a monitoring view:
- **Node badges**: Show count of items processed today
- **Edge animations**: Flowing particles indicate active data transfer
- **Error highlighting**: Red glow on failed nodes with error count badge
- **Click any node**: See recent executions, success/fail ratio, average processing time

---

## Data Architecture

### Workflow Storage (Convex)

Extends the existing universal ontology:

```typescript
// Workflow canvas stored as universal object
type: "layer_workflow"

// Node data
{
  nodes: [
    {
      id: string,
      type: "integration" | "trigger" | "logic" | "native",
      service: string,           // e.g., "activecampaign", "lc_crm", "if_then"
      position: { x, y },
      config: Record<string, any>,
      status: "draft" | "ready" | "active" | "error" | "disabled",
      credentials_ref?: string,  // Reference to stored credentials
    }
  ],
  edges: [
    {
      id: string,
      source: string,
      target: string,
      sourceHandle: string,
      targetHandle: string,
      data_mapping?: Record<string, string>,
      status: "draft" | "active" | "error",
    }
  ],
  metadata: {
    name: string,
    description: string,
    created_by: string,
    template_id?: string,
    is_active: boolean,
    last_run?: number,
    run_count: number,
  }
}
```

### Relationship to Existing Systems

- **Workflow Ontology**: Layers workflows can reference existing workflow behaviors as sub-steps
- **Agent Ontology**: AI agents can be nodes in a Layers workflow
- **Integration Credentials**: Reuses existing OAuth/API key storage from integrations window
- **Behavioral Executor**: Layers execution engine delegates to existing behaviorExecutor for native actions

---

## Credential Collection Flow

When a user places a node that requires authentication:

1. Node appears with an orange "Setup Required" badge
2. Click node → Inspector opens → "Connect Account" button
3. For OAuth services: Opens OAuth popup flow (reuses existing OAuth infrastructure)
4. For API key services: Shows secure input field with validation
5. On success: Node badge turns green, connection is tested automatically
6. Credentials stored encrypted, referenced by ID (never embedded in workflow data)

---

## Competitive Differentiation

| Feature | n8n / Make / Zapier | Layers |
|---------|-------------------|--------|
| Visual workflow builder | Yes | Yes |
| Third-party integrations | Yes (many) | Growing (19+ currently) |
| Built-in tool alternatives | No | Yes — CRM, forms, invoicing, checkout, tickets, bookings, agents, email, SMS, landing pages |
| AI-assisted workflow creation | Limited | Core feature — conversational canvas generation |
| Place any integration (even unbuilt) | No — limited to what's available | Yes — map your ideal stack, upvote what's missing |
| Product roadmap feedback | No | Yes — upvote data drives integration build priority |
| Integrated AI agents as nodes | No | Yes — agents are first-class workflow participants |
| Full operating system underneath | No — pure automation layer | Yes — Layer Cake IS the platform |

---

## Phased Rollout

### Phase 1: Canvas Foundation
- React Flow canvas with grid, zoom, pan, minimap
- Tool chest panel with ALL integrations (built and unbuilt, with upvote on unbuilt)
- Node placement, connection drawing, basic configuration
- Workflow save/load to Convex
- `/layers` route with standalone layout
- First workflow free for all users

### Phase 2: AI Chat + Templates
- Floating prompt overlay with AI-driven canvas generation
- Template library with 5-10 starter templates
- AI can add/remove/rearrange nodes via conversation
- Template gallery browser

### Phase 3: Execution Engine
- Trigger-based workflow execution
- Real-time status visualization (green/yellow/red edges)
- Node-level logging and inspection
- Test mode with sample data
- Integration with existing behaviorExecutor

### Phase 4: Third-Party Expansion & n8n Integration
- OAuth flows for additional services (HubSpot, Mailchimp, etc.)
- Build most-upvoted integrations first (data-driven priority)
- Full n8n integration (bidirectional or embedded sub-flows — TBD)
- Make / Zapier bridge nodes

### Phase 5: Monitoring & Analytics
- Live workflow monitoring on canvas
- Performance metrics per node
- Error alerting and auto-retry
- Workflow version history
- Usage analytics dashboard

---

## Technical Dependencies

### Already Available
- `@xyflow/react@^12.9.1` — Installed, not yet used
- Convex universal ontology — Extensible for `layer_workflow` type
- 19 integration configurations — Ready to expose as nodes
- Workflow behaviors library — 19+ behaviors ready for execution
- Agent system — Multi-channel agents as workflow nodes
- OAuth infrastructure — Reusable for credential collection

### Needs Building
- Canvas component and layout (`/layers` route)
- Tool chest panel with draggable nodes
- Node registry (catalog of all available blocks)
- Edge status visualization system
- Node inspector/configuration panel
- **Graph execution engine** (NEW — DAG traversal, not linear pipeline)
- **Node registry with dynamic dispatch** (NEW — replaces static switch statement)
- **Behavior adapter layer** (NEW — bridges new engine to existing behaviorExecutor)
- AI canvas generation (LLM → React Flow node/edge output)
- Template storage and gallery
- Upvote system for unbuilt integrations
- Simplified mobile version (step-by-step wizard flow)

---

## Decisions Made

1. **Licensing**: Mirrors the builder licensing model. Keep it simple — for now, let users use everything. Goal is to reach 100 users first, then tighten tiers.
2. **First workflow free**: Every user gets their first workflow at no cost.
3. **Execution pricing**: TBD — need to analyze execution costs per node type and determine markup. Will revisit once Phase 3 (execution engine) is in progress.
4. **Collaboration**: Yes — team members can edit the same canvas. Real-time collaboration.
5. **Mobile**: Desktop is the primary experience (the canvas is too expansive for mobile editing). However, a **simplified mobile version** is needed because most users will first hit the page on their phone (lead magnet traffic). Mobile version focuses on:
   - Viewing/browsing the canvas (read-only or simplified)
   - Simple connection setup (step-by-step wizard instead of drag-and-drop)
   - Template browsing and selection
   - The simpler the mobile flow, the better — simplicity benefits the product overall
6. **White-labeling**: Yes — agencies can white-label Layers workflows for their clients.
7. **Export**: Yes — workflows exportable as JSON for backup and migration.
8. **n8n integration**: Full integration planned (not just a bridge). n8n has strong existing adoption among the target audience, so native n8n integration is a priority.

## Additional Decisions

9. **Real-time collaboration**: Google Docs-style conflict resolution for simultaneous canvas edits. Convex gives us real-time out of the box — need to design cursor presence, node locking (or OT/CRDT), and edit merging on top of that.
10. **n8n integration**: Bidirectional sync. Layer Cake should appear as a node inside n8n, and n8n workflows should be embeddable as nodes inside Layers. Two-way street.
11. **Execution costs**: The real cost driver is AI reasoning (the AI interpreting and orchestrating the workflow), not the node execution itself. Node-to-node data passing is cheap. Keep this in mind when pricing — the metering should track AI usage (tokens, reasoning calls) rather than raw execution count. Benchmarking deferred until Phase 3, but the pricing model should be clear, concise, and not punish users for building complex workflows.

## Architecture Decision: Hybrid Execution Engine

**Decision**: Build a new graph-based execution engine for Layers, but reuse the existing behaviorExecutor as a delegate for LC Native nodes.

### Existing System Audit

The current workflow system (`convex/workflows/`, ~4,200 lines) is a **linear behavior pipeline**:
- 16 production-tested behaviors (invoice generation, contact creation, email sending, etc.)
- Shared context accumulation between behaviors (elegant data passing)
- Built-in licensing, credits, permissions, and real-time execution logs
- API triggers via webhook and OAuth
- Test mode (dry-run) support

**Strengths worth preserving**:
- Context accumulation pattern (each behavior merges data into shared context)
- Credit system and licensing checks
- All 16 behavior implementations are battle-tested
- Real-time execution logs via Convex subscriptions
- OAuth/API key credential infrastructure

**Limitations that prevent direct reuse for Layers**:

| Aspect | Current System | Layers Requirement |
|--------|---------------|-------------------|
| Execution model | Linear pipeline (A → B → C sorted by priority) | DAG / graph (branching, merging, parallel paths) |
| Conditions | Simple string matching (`field === 'value'`) | Full expression engine (AND/OR/NOT, comparisons, nested) |
| Node dispatch | Static switch statement (15+ cases, grows linearly) | Dynamic registry (must scale to 50+ integration types) |
| Data flow | Flat context merge (all behaviors share one object) | Per-edge data mapping between specific node pairs |
| Triggers | Single trigger type per workflow | Multiple trigger types, webhooks, cron, real-time events |
| Error handling | Coarse (rollback/continue/notify) | Per-node retry with exponential backoff, circuit breakers |
| Execution | Synchronous (entire pipeline in one Convex action) | Async job queue (long-running, resumable, timeout-safe) |
| Composition | None | Sub-workflows, n8n sub-flows, workflow chaining |

### Hybrid Architecture

```
Layers Graph Execution Engine (NEW)
  ├── DAG traversal with branching, merging, parallel paths
  ├── Dynamic node registry (plugin-style dispatch)
  ├── Per-edge data mapping (source fields → target fields)
  ├── Expression evaluator for conditions (jsonlogic or similar)
  ├── Async job queue with retry and circuit breakers
  │
  └── Node Executors
       ├── LC Native Nodes  → BehaviorAdapter → existing behaviorExecutor (REUSE)
       │                      Maps Layers node config → behavior params
       │                      Returns behavior result → Layers context
       │
       ├── Integration Nodes → New IntegrationAdapter per service (NEW)
       │                       OAuth/API key credential management
       │                       Action-specific API clients
       │
       ├── Logic Nodes       → New handlers for if/then, loops, etc. (NEW)
       │                       Expression evaluator for conditions
       │                       Iterator with max-iteration limits
       │
       └── Bridge Nodes      → Webhook pass-through to n8n/Zapier/Make (NEW)
                               Bidirectional data exchange
```

**What gets reused** (not rewritten):
- All 16 behavior implementations in `convex/workflows/behaviors/`
- Credit deduction logic in `behaviorExecutor.ts`
- Licensing quota checks
- OAuth credential storage and refresh
- Real-time execution log infrastructure (`workflowExecutionLogs` table)

**What gets built new**:
- Graph traversal engine (topological sort, parallel branch execution)
- Dynamic node registry (register/discover node types without code changes)
- Expression evaluator (replace `evaluateCondition` string matcher)
- Per-edge data mapper (field-level mapping UI + runtime resolver)
- Async execution queue (Convex scheduled functions or external queue)
- Behavior adapter layer (translates Layers node config ↔ behavior params)

### Why Hybrid (Not Full Rewrite)

1. **16 behaviors are production-tested** — rewriting them introduces regression risk for zero gain
2. **Credit and licensing logic is correct** — wrapping it is easier than reimplementing
3. **The execution model is the problem, not the behaviors** — behaviors are stateless functions, they don't care how they're called
4. **Incremental migration** — new integrations use the new registry, old behaviors get wrapped with adapters, system evolves without breaking changes

## Remaining Open Questions

1. **AI cost attribution**: How do we meter AI usage within Layers separately from the existing AI chat credits? Shared pool or separate budget?
2. **Collaboration UX details**: Cursor presence (show who's editing where), node-level locking vs. full optimistic merging, undo/redo across collaborators.
3. **n8n technical approach**: REST API integration, webhook bridge, or embedded n8n instance? Needs technical spike.
