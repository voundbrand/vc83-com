# Agent-First Architecture & CLI Evolution

> A living document capturing our vision for L4YERCAK3's evolution toward agent-consumable interfaces and the CLI's role in scaffolding production-ready applications.

## Table of Contents

1. [The Core Shift](#the-core-shift)
2. [Database Strategy](#database-strategy)
3. [Open Questions](#open-questions)
4. [The CLI Journey](#the-cli-journey)
5. [Value Proposition](#value-proposition)
6. [Agent-as-Consumer Patterns](#agent-as-consumer-patterns)
7. [Implementation Roadmap](#implementation-roadmap)

---

## The Core Shift

### From CMS to Capability Orchestration

Traditional CMS model:
```
User → CMS UI → Database → Frontend renders content
```

Agent-first model:
```
User/Agent → Declares Intent → L4YERCAK3 Orchestrates → Outcome Delivered
```

The key insight: **The UI becomes optional.** An agent might:
1. Never render UI at all (headless API consumption)
2. Render UI only for human approval checkpoints
3. Consume UI visually via computer-use to validate
4. Act as an "agentic user" with inherited permissions

### The 99% / 1% Split

Research suggests AI agents will eventually account for **99% of the attention** on digital tools. This means:
- **99%**: Agent-to-agent communication, headless API calls, automated workflows
- **1%**: Human oversight, approval checkpoints, override controls, edge cases

We need to build for both simultaneously.

---

## Database Strategy

### Three Scenarios the CLI Must Handle

#### 1. Empty Project (Greenfield) ✅ Easiest

User has no existing database. We control everything:

- Use our ontology pattern (`objects` table with `type`, `subtype`, `customProperties`)
- For **Convex users**: Generate schema that mirrors our backend
- For **Supabase users**: Generate SQL migrations with ontology-friendly structure
- Sync becomes trivial because structures match

**Key Question**: Do they even need a local database? Or can everything live in L4YERCAK3 backend with local SDK calls?

#### 2. Existing Project WITH Database 🟡 Complex

User has Prisma, Drizzle, Supabase, etc. with existing schemas:

- CLI detects their schema (parse Prisma schema, Drizzle config, Supabase types)
- Show mapping UI: "Your `Customer` → our `contact`"
- Generate sync adapters that handle translation
- Support bidirectional sync with conflict resolution

#### 3. Existing Project WITHOUT Database 🟢 Moderate

User has frontend code but no persistence:

- Option A: Add L4YERCAK3 SDK - talks to our backend directly (simplest)
- Option B: Scaffold local database using our ontology pattern
- Option C: Hybrid - local cache + L4YERCAK3 as source of truth

### Supported Database Types (Priority Order)

1. **Convex** - Our native backend, first-class support
2. **Supabase** - Popular with vibe coders, PostgreSQL-based
3. **Prisma** - ORM agnostic, can target multiple DBs
4. **Drizzle** - Growing in popularity
5. **Raw PostgreSQL/MySQL** - Fallback for custom setups

---

## Open Questions

### 1. How Much Local State?

> If agents primarily consume L4YERCAK3 backend, does the local app need its own database at all?

**Possibilities:**
- **No local DB**: Everything via L4YERCAK3 SDK/API calls
- **Cache only**: Local storage for offline/performance, L4YERCAK3 is source of truth
- **Full sync**: Local DB mirrors L4YERCAK3 data with bidirectional sync
- **Hybrid**: Some data local (user preferences), some remote (business data)

**Considerations:**
- Offline capability requirements
- Latency sensitivity
- Data residency/compliance
- Cost (API calls vs local queries)

### 2. Agent Identity & Auth

> When an agent acts on behalf of a user, how do we handle auth?

**Ideas:**
- OAuth scopes: `agent:user:123:capabilities:crm,invoicing`
- Agent tokens with embedded permissions
- Audit trail: "Agent X (acting as User Y) performed action Z"
- Time-limited delegation tokens
- Capability-based security (agent can only do what user could do, possibly restricted)

**Questions:**
- Can agents have their own identity separate from users?
- How do we revoke agent access?
- How do we trace actions back through agent chains?

### 3. UI as Validation (Computer-Use Compatible)

> Should we build UI specifically designed to be navigated by vision agents?

**Principles for agent-navigable UI:**
- Semantic HTML with clear labels
- Consistent, predictable layouts
- Machine-readable state indicators
- Clear action affordances
- Minimal decorative complexity
- Structured data attributes for agent consumption

**Implementation ideas:**
- `data-agent-action="submit-form"`
- `data-agent-state="loading"`
- `aria-*` attributes double as agent hints
- JSON-LD structured data in pages

### 4. The 1% Human Case

> When humans DO interact, what's the minimal viable UI?

**Minimal Viable Human Interface:**
- Approval checkpoints ("Agent wants to send 500 emails - Approve?")
- Override controls ("Stop this workflow")
- Audit logs ("What did the agent do?")
- Configuration screens ("Set agent permissions")
- Exception handling ("Agent couldn't handle this case")

---

## The CLI Journey

### Current State

The CLI currently:
1. Detects project type (Next.js, framework, TypeScript)
2. Authenticates user via OAuth
3. Selects organization
4. Generates/retrieves API key
5. Selects features (CRM, checkout, etc.)
6. Generates files (`api-client.ts`, `.env.local`)
7. Registers application with L4YERCAK3 backend

**Gap**: After setup completes, user has a connection but no clear next step.

### What's Missing

After "Setup Complete", the user needs:

1. **Database decision**: Do they want local DB? Which type?
2. **Schema scaffolding**: If yes, generate tables/collections
3. **Component generation**: UI components that use L4YERCAK3 data
4. **Workflow setup**: Connect forms → workflows → actions
5. **Agent configuration**: What can agents do in this app?

### Proposed CLI Flow Enhancement

```
l4yercak3 spread
├── [Current flow: detect, auth, features]
├── NEW: Database Configuration
│   ├── "No database detected. Would you like to:"
│   │   ├── Use L4YERCAK3 backend directly (recommended for new projects)
│   │   ├── Set up Convex locally (synced with L4YERCAK3)
│   │   ├── Set up Supabase locally
│   │   └── Skip database setup
│   └── If DB selected: Generate schema/migrations
├── NEW: Component Scaffolding
│   ├── Based on selected features, generate:
│   │   ├── Contact list component (if CRM selected)
│   │   ├── Checkout flow (if checkout selected)
│   │   ├── Event listing (if events selected)
│   │   └── etc.
│   └── Components use generated API client
├── NEW: Workflow Templates
│   ├── "Would you like to set up common workflows?"
│   │   ├── Form submission → CRM contact creation
│   │   ├── Checkout completion → Invoice generation
│   │   └── Custom workflow builder
└── NEW: Agent Configuration
    ├── "Enable AI agent capabilities?"
    │   ├── MCP server setup
    │   ├── Agent permission scopes
    │   └── Audit logging configuration
```

---

## Value Proposition

### The Problem We Solve

Developers (especially "vibe coders") can rapidly prototype UIs with tools like:
- V0.dev
- Lovable
- Bolt
- Cursor + AI

But these prototypes lack:
- Production-quality backend
- Real authentication
- Payment processing
- CRM/contact management
- Email/notification systems
- Workflow automation
- Multi-tenancy
- Compliance features

### L4YERCAK3's Value Add

**"Prototype to Production in One Command"**

```bash
# Take your V0/Lovable prototype
npx l4yercak3 spread

# Now you have:
# ✅ Production backend (Convex)
# ✅ Authentication (OAuth, Passkeys)
# ✅ Payment processing (Stripe Connect)
# ✅ CRM with pipelines
# ✅ Invoicing system
# ✅ Event/ticket management
# ✅ Form builder with workflows
# ✅ Email templates
# ✅ Multi-org support
# ✅ Agent-ready APIs (MCP)
# ✅ Internationalization
# ✅ Audit logging
```

### The Agency Workflow

Target user: Agency building microsaas for multiple clients

1. **Discovery**: Gather client requirements
2. **Prototype**: Use V0/Lovable to create UI mockup
3. **Connect**: Run `l4yercak3 spread` to wire up backend
4. **Customize**: Configure workflows, branding, features
5. **Deploy**: Ship to production
6. **Manage**: Use L4YERCAK3 dashboard for ongoing operations

Each client gets their own organization in L4YERCAK3, but the agency manages them all from one place.

---

## Agent-as-Consumer Patterns

### Roles Agents Will Play

Based on industry research, agents will act as:

1. **Outcome-Oriented Browsers**
   - Navigate sites to retrieve specific data
   - Human may never see the interface
   - Just receive the outcome

2. **Workflow Drivers**
   - Lead agentic workflows
   - Interact with UI primitives (tables, forms)
   - Accomplish work requests autonomously

3. **Permissioned Actors**
   - Inherit roles/permissions from human users
   - Often at restricted scope
   - Full audit trail required

4. **Interface Validators**
   - Consume UX to learn design
   - Run against evaluations (evals)
   - Ship code when quality standards met

5. **Headless Consumers**
   - Pure API consumption
   - No visual interface needed
   - MCP tool invocation

### Design Implications

**For L4YERCAK3 UI:**
- Ensure all actions are API-accessible (no UI-only features)
- Semantic, predictable component structure
- Machine-readable state and affordances
- Audit logging on all actions

**For Generated Apps:**
- MCP server scaffolding
- Agent-compatible component library
- Permission scopes for agent actions
- Approval workflow hooks

---

## Implementation Roadmap

### The MCP-First Approach

**Key Decision**: Instead of building complex AI logic into the CLI, we expose L4YERCAK3's capabilities via MCP (Model Context Protocol). This allows Claude Code (which users are likely already using) to orchestrate the integration intelligently.

**Why MCP?**
- Users running our CLI are likely already using Claude Code
- Claude Code already understands their codebase (can read files, understand structure)
- We don't reinvent the AI wheel - just provide the tools
- As we extend L4YERCAK3, we just add more MCP tools
- Natural language interface for users - they just ask Claude Code what they want

See **[MCP_SERVER_ARCHITECTURE.md](./MCP_SERVER_ARCHITECTURE.md)** for comprehensive implementation details.

### Phase 1: Core MCP Infrastructure

- [ ] Basic MCP server setup (`l4yercak3 mcp-server` command)
- [ ] Authentication integration (use existing CLI session from `~/.l4yercak3/config.json`)
- [ ] Tool registry pattern for extensibility
- [ ] Discovery tools (`get_capabilities`, `check_auth_status`)
- [ ] Application management tools (`register_application`, `get_application`)
- [ ] Organization management tools

### Phase 2: CRM & Contact Tools

- [ ] `l4yercak3_crm_list_contacts`
- [ ] `l4yercak3_crm_create_contact`
- [ ] `l4yercak3_crm_update_contact`
- [ ] `l4yercak3_crm_get_contact`
- [ ] `l4yercak3_crm_delete_contact`
- [ ] Pipeline management tools
- [ ] Activity and note logging tools

### Phase 3: Invoicing & Payment Tools

- [ ] `l4yercak3_invoice_create`
- [ ] `l4yercak3_invoice_list`
- [ ] `l4yercak3_invoice_send`
- [ ] `l4yercak3_invoice_mark_paid`
- [ ] `l4yercak3_invoice_get_pdf`

### Phase 4: Events, Forms & Workflows Tools

- [ ] Event management tools
- [ ] Form creation and management tools
- [ ] Form submission retrieval
- [ ] Workflow creation and management tools
- [ ] Workflow execution tools

### Phase 5: Code Generation Tools

- [ ] `l4yercak3_codegen_api_client` - Generate TypeScript API client
- [ ] `l4yercak3_codegen_sync_adapter` - Generate sync adapters for model mapping
- [ ] `l4yercak3_codegen_schema` - Generate database schemas (Convex, Prisma, Supabase)
- [ ] `l4yercak3_codegen_suggest_mappings` - AI-assisted schema analysis
- [ ] `l4yercak3_codegen_component` - Generate React components

### Phase 6: Advanced Capabilities

- [ ] Media management tools
- [ ] Template management tools
- [ ] Analytics and reporting tools
- [ ] Webhook management tools
- [ ] Agent-to-agent protocols

---

## Appendix: Key Concepts

### Ontology Pattern

Our flexible data model using a single `objects` table:

```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "contact" | "event" | "invoice" | "form_submission" | ...,
  subtype: string,  // e.g., "lead", "customer", "prospect"
  name: string,
  status: string,
  customProperties: {
    // Flexible, type-specific fields
  },
  // Standard metadata
  createdBy, createdAt, updatedAt
}
```

Benefits:
- Single table, infinite entity types
- Easy to sync (one mapping strategy)
- Agent-friendly (predictable structure)
- Extensible without migrations

### MCP (Model Context Protocol)

Anthropic's protocol for AI agents to discover and invoke tools:

```typescript
// Agent discovers available tools
const tools = await mcp.listTools();
// [{ name: "l4yercak3_create_contact", ... }, ...]

// Agent invokes tool
const result = await mcp.callTool("l4yercak3_create_contact", {
  name: "John Doe",
  email: "john@example.com"
});
```

### Capability Registry

Instead of "what tables exist", focus on "what outcomes can be achieved":

- `createContact` - Add someone to CRM
- `sendInvoice` - Generate and deliver invoice
- `scheduleEvent` - Create event with checkout flow
- `deployPage` - Publish a landing page
- `runWorkflow` - Execute automated workflow

---

## Document History

- **2024-01-07**: Initial creation capturing CLI evolution discussion
- Future updates as implementation progresses

---

*This document is a work in progress. Add thoughts, questions, and updates as we explore these concepts.*
