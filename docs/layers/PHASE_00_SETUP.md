# Phase 0: Prerequisites & Setup

**Goal**: Ensure all dependencies, infrastructure, and foundation pieces are ready before building Layers.

**Estimated Duration**: 1-2 days

---

## Prerequisites Checklist

### 1. Verify Existing Infrastructure

- [x] Confirm `@xyflow/react@^12.9.1` is installed and working
- [x] Review Convex universal ontology extensibility for `layer_workflow` type
- [x] Audit existing 19 integrations (OAuth configs, credentials storage)
- [x] Review existing behaviorExecutor and workflow ontology
- [x] Check agent system integration points
- [x] Verify AI chat credit system (for future AI canvas generation)

### 2. Schema Design

- [x] Design `layer_workflow` schema in Convex
  - [x] Workflow metadata (name, description, owner, template_id, etc.)
  - [x] Nodes array structure (id, type, service, position, config, status, credentials_ref)
  - [x] Edges array structure (id, source, target, handles, data_mapping, status)
  - [x] Execution logs structure
  - [x] Upvote tracking for unbuilt integrations

- [x] Design `layer_template` schema
  - [x] Template metadata (name, level, description, thumbnail)
  - [x] Pre-configured nodes and edges
  - [x] Time-to-deploy estimate
  - [x] Vertical/industry tags

- [x] Design `layer_integration_upvote` schema
  - [x] User ID, integration name, timestamp
  - [x] Aggregation query for prioritization

### 3. Node Registry Design

Create a comprehensive catalog of all available nodes:

- [x] **Integrations** (19+ existing, plus unbuilt)
  - CRM: HubSpot, Salesforce, Pipedrive, LC CRM
  - Email: ActiveCampaign, Mailchimp, ConvertKit, LC Email
  - Messaging: WhatsApp, ManyChat, Telegram, Instagram DM, LC WhatsApp, LC SMS
  - Communication: Chatwoot, Infobip, Pushover
  - Email Delivery: Resend, SendGrid, Postmark
  - Websites: WordPress, Webflow, Squarespace, LC Landing Pages
  - Payments: Stripe, PayPal, Mollie, LC Checkout, LC Invoicing
  - Automation: n8n, Make, Zapier
  - Calendar: Calendly, Cal.com, LC Bookings
  - Analytics: PostHog, Google Analytics, Plausible
  - Dev/Deploy: GitHub, Vercel
  - Office: Microsoft 365, Google Workspace
  - Other LC Native: LC Forms, LC Tickets, LC Events/Webinars, LC AI Agent, LC Certificates, LC File Storage

- [x] **Triggers** (10 types)
  - Form Submitted
  - Payment Received
  - Booking Created
  - Contact Created/Updated
  - Webhook Received
  - Schedule (Cron)
  - Manual Trigger
  - Email Received
  - Chat Message Received

- [x] **Logic & Flow** (9 control nodes)
  - If/Then (Conditional Branch)
  - Wait/Delay
  - Split (A/B Test)
  - Merge
  - Loop/Iterator
  - Filter
  - Transform Data
  - HTTP Request
  - Code Block (custom JS)

### 4. Route & Layout Setup

- [x] Create `/layers` route in Next.js app directory
- [x] Design standalone layout (no sidebar, full-screen canvas)
- [x] Set up top bar navigation component structure
- [ ] Plan responsive breakpoints (desktop primary, mobile simplified)

### 5. Execution Engine Architecture Planning

- [x] Audit existing behaviorExecutor (`convex/workflows/behaviorExecutor.ts`):
  - [x] Document all 16 behavior types and their input/output signatures
  - [x] Map which behaviors correspond to which LC Native node types
  - [x] Identify shared context fields each behavior reads/writes
  - [x] Document credit deduction and licensing check points

- [x] Design Behavior Adapter Layer:
  - [x] Interface: `LayersNodeConfig → BehaviorParams` (input translation)
  - [x] Interface: `BehaviorResult → LayersNodeOutput` (output translation)
  - [x] Map each LC Native node to its corresponding behavior:
    - LC CRM → `create-contact`, `detect-employer-billing`
    - LC Email → `send-confirmation-email`, `send-admin-notification`
    - LC Invoice → `generate-invoice`, `consolidated-invoice-generation`
    - LC Checkout → `create-transaction`, `calculate-pricing`
    - LC Tickets → `create-ticket`
    - LC Forms → `create-form-response`, `validate-registration`
    - LC Events → `check-event-capacity`, `update-statistics`
    - LC ActiveCampaign → `activecampaign-sync`

- [x] Design new Graph Execution Engine (separate from behaviorExecutor):
  - [x] DAG traversal algorithm (topological sort)
  - [x] Parallel branch execution strategy
  - [x] Per-edge data mapping model (source field → target field)
  - [x] Expression evaluator for conditions (evaluate jsonlogic or similar)
  - [ ] Async job queue pattern (Convex scheduled functions)
  - [x] Error handling: per-node retry with exponential backoff, circuit breakers

- [x] Design Dynamic Node Registry:
  - [x] Registration interface: `registerNodeType(type, executor, schema)`
  - [x] Discovery: list available node types with metadata
  - [x] Dispatch: resolve executor by node type at runtime
  - [x] Must scale to 50+ types without code changes to dispatcher

### 6. Component Architecture Planning

- [x] Design component hierarchy:
  ```
  /layers/page.tsx
    └── LayersCanvas (main container)
        ├── TopBar (navigation, actions)
        ├── ToolChest (left panel, draggable nodes)
        ├── Canvas (React Flow workspace)
        │   ├── Nodes (custom node components)
        │   ├── Edges (custom edge components)
        │   └── AIPromptOverlay (floating chat)
        ├── NodeInspector (right panel, expandable)
        └── MiniMap (bottom-right corner)
  ```

- [x] Define shared types and interfaces:
  - WorkflowNode, WorkflowEdge, NodeConfig, EdgeStatus
  - NodeType, NodeStatus, IntegrationStatus
  - Template, TemplateLevel, TemplateCategory

### 7. Development Environment

- [ ] Set up development database with test workflows
- [ ] Create sample templates for testing (one per level)
- [ ] Prepare test credentials for integrations
- [ ] Set up hot-reload for canvas development

---

## Success Criteria

- All schemas designed and documented
- Node registry catalog complete (even for unbuilt integrations)
- Route and component structure planned
- Development environment ready
- No blockers for Phase 1 implementation

---

## Notes

- This phase is planning and setup only — no UI implementation yet
- Focus on data architecture and component planning
- Ensure the foundation is solid before building on top of it
- Review existing integration configs to understand credential flow
- Keep mobile simplicity in mind from the start

---

## Next Phase

Once Phase 0 is complete, proceed to **Phase 1: Canvas Foundation** where we build the visual canvas, tool chest, and basic node placement functionality.
