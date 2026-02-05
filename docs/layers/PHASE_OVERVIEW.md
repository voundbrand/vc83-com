# Layers Implementation - Phase Overview

This document provides a high-level overview of the phased implementation plan for **Layers**, the visual automation canvas.

---

## What is Layers?

**Layers** is a visual automation canvas (think Miro meets n8n) that lets agency owners:
1. Map their entire marketing and operations tech stack visually
2. Connect integrations with drag-and-drop
3. Fill gaps with built-in Layer Cake alternatives
4. Execute workflows with real-time monitoring

**Key Differentiator**: Templates organized by agency growth stage (not by function), based on the 5-level Recurring Revenue Blueprint PDFs.

---

## Implementation Phases

### [Phase 0: Prerequisites & Setup](./PHASE_00_SETUP.md)
**Duration**: 1-2 days
**Goal**: Design schemas, plan architecture, prepare node registry

**Key Tasks**:
- Design Convex schemas (workflows, templates, execution logs)
- Create node registry (all integrations, triggers, logic blocks)
- Plan component architecture
- Set up development environment

**Deliverable**: Foundation ready for Phase 1 implementation

---

### [Phase 1: Canvas Foundation](./PHASE_01_CANVAS_FOUNDATION.md)
**Duration**: 3-5 days
**Goal**: Build core canvas with tool chest, node placement, and save/load

**Key Tasks**:
- Implement React Flow canvas with grid, zoom, pan, minimap
- Build tool chest panel (draggable nodes)
- Create custom node and edge components
- Implement node inspector with credential flows
- Add save/load to Convex
- Build upvote system for unbuilt integrations

**Deliverable**: Functional canvas where users can design workflows visually

---

### Phase 2: Skills-Based Composition (Replaced Templates)
**Status**: Architecture complete
**Goal**: AI-driven workflow composition via Skills Registry (replaces hard-coded templates)

**What Changed**: Hard-coded Level 1-5 templates were removed in favor of the Skills Registry architecture. Instead of static template galleries, the AI reads SKILL.md knowledge docs and dynamically composes workflows using existing tools.

**Key Components**:
- 9 SKILL.md files covering: lead-generation, event-promotion, product-launch, booking-appointment, membership-subscription, webinar-virtual-event, ecommerce-storefront, client-onboarding, fundraising-donations
- `_SHARED.md` canonical ontology reference
- Trigger-based intent detection (`detectSkillTriggers()`) loads relevant skills selectively
- AI Prompt Overlay (Cmd+K) for natural language workflow generation on canvas

**See**: [SKILLS_REGISTRY_SPEC.md](./SKILLS_REGISTRY_SPEC.md)

**Deliverable**: AI generates workflows dynamically from skill knowledge + user intent

---

### [Phase 3: Execution Engine](./PHASE_03_EXECUTION.md)
**Duration**: 5-7 days
**Goal**: Make workflows actually run (triggers, execution, logging)

**Key Tasks**:
- Implement trigger configuration (9 trigger types)
- Build execution engine (graph traversal, node executors)
- Add data mapping and workflow context
- Implement real-time execution visualization (flowing particles, status badges)
- Create execution logs and error handling
- Integrate with existing behaviorExecutor
- Add Test Mode for debugging

**Deliverable**: Workflows can be activated and executed with real events

---

### [Phase 4: Integration Expansion](./PHASE_04_INTEGRATIONS.md)
**Duration**: Ongoing (prioritize top 10 first)
**Goal**: Build third-party integrations based on upvote data

**Key Tasks**:
- Create admin dashboard for integration prioritization
- Build top 10 priority integrations:
  - HubSpot, ActiveCampaign, Mailchimp, Calendly, WordPress
  - Webflow, Salesforce, n8n, Make, Zapier
- Implement OAuth flows and API clients
- Document each integration (guides, examples)
- Focus on n8n integration (strategic priority)

**Deliverable**: 30+ integrations available (19 existing + 10+ new)

---

### [Phase 5: Monitoring & Polish](./PHASE_05_MONITORING.md)
**Duration**: 4-6 days
**Goal**: Add monitoring, analytics, collaboration, and final polish

**Key Tasks**:
- Build workflow monitoring dashboard (live stats on canvas)
- Add analytics (performance metrics, error tracking, usage quotas)
- Implement real-time collaboration (presence, sync, conflict resolution)
- Improve mobile experience (template browser, monitoring view)
- Add white-labeling for agencies
- Implement export/import and workflow sharing
- Add onboarding tour and documentation
- Final UX polish and QA

**Deliverable**: Production-ready Layers with monitoring, collaboration, and polish

---

## Architecture Decision: Hybrid Execution Engine

After auditing the existing workflow system (`convex/workflows/`, ~4,200 lines, 16 behaviors), the decision is to **build a new graph execution engine** but **reuse existing behavior implementations** as delegates for LC Native nodes.

**Why not reuse the current engine directly?** The existing system is a linear behavior pipeline (sorted by priority, sequential execution, flat context merge). Layers requires a DAG-based graph engine with branching, parallel paths, per-edge data mapping, and async execution. These are structural differences that can't be patched in.

**What gets reused:**
- All 16 behavior implementations (invoice generation, contact creation, etc.)
- Credit deduction and licensing logic
- OAuth credential storage and refresh
- Real-time execution log infrastructure

**What gets built new:**
- Graph traversal engine (DAG, parallel branches)
- Dynamic node registry (replaces static switch dispatcher)
- Expression evaluator for conditions (replaces simple string matcher)
- Per-edge data mapping (replaces flat context merge)
- Async execution queue with retry/circuit breakers
- Behavior adapter layer (bridges new engine → old behaviors)

See the full analysis in [LAYERS_PRD.md](./LAYERS_PRD.md#architecture-decision-hybrid-execution-engine).

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Setup | 1-2 days | 2 days |
| Phase 1: Canvas | 3-5 days | 7 days |
| Phase 2: Skills Composition | Complete (replaced templates) | 7 days |
| Phase 3: Execution | 5-7 days | 14 days |
| Phase 4: Integrations* | Ongoing | Ongoing |
| Phase 5: Monitoring | 4-6 days | 20 days |

**Total**: ~3-4 weeks for core implementation (Phases 0-3, 5)
*Phase 4 is ongoing and can run in parallel with Phase 5

---

## Launch Strategy

1. **Phase 0-3 Complete**: Internal testing with Layer Cake team
2. **Phase 4 Started**: Closed beta with select agencies (users who upvoted integrations)
3. **Phase 5 Complete**: Public launch
   - Announce on social media, Product Hunt, email list
   - Release lead magnet PDFs with "Deploy your first client funnel — free" CTA
   - Drive traffic to `/layers` with templates ready

---

## Success Metrics

**MVP Success** (after Phase 3):
- 10+ users create and activate workflows
- 100+ workflow executions without critical errors
- 50+ integration upvotes collected (informs Phase 4 priority)

**Launch Success** (after Phase 5):
- 100+ users create workflows
- 10,000+ workflow executions
- 5+ community templates published
- 80%+ user satisfaction (survey)

**Long-term Success** (6 months post-launch):
- 1,000+ active users
- 100,000+ workflow executions
- 50+ integrations built
- Layers becomes primary entry point for new Layer Cake users

---

## Current Status (Updated 2026-02-04)

| Phase | Status | Completion | Key Files |
|-------|--------|------------|-----------|
| Phase 0: Setup | **Complete** | ~98% | `convex/layers/types.ts`, `convex/layers/nodeRegistry.ts`, `convex/schemas/layerExecutionSchemas.ts` |
| Phase 1: Canvas | **Complete** | 100% | `src/components/layers/layers-canvas.tsx`, `tool-chest.tsx`, `custom-nodes.tsx`, `node-inspector.tsx`, `use-layers-store.ts` |
| Phase 2: Skills Composition | **Complete** | 100% | `convex/ai/systemKnowledge/skills/`, `SKILLS_REGISTRY_SPEC.md` (replaced hard-coded templates) |
| Phase 3: Execution | **Mostly Complete** | ~90% | `convex/layers/graphEngine.ts`, `convex/layers/behaviorAdapter.ts`, `convex/layers/executionLogger.ts` |
| Phase 4: Integrations | Not Started | 0% | 19 integrations available from existing system |
| Phase 5: Monitoring | Not Started | 0% | — |

### What's Built (~5,150+ lines of production code)

**Backend (solid foundation):**
- Full type system (335 lines) — all node categories, execution contexts, templates
- Node registry (1,437 lines) — 54 third-party + 10 triggers + 9 logic + 14 LC Native nodes
- Workflow ontology (555 lines) — CRUD, queries, upvotes, templates
- Behavior adapter (191 lines) — bridges new engine to 16 existing behaviors
- Execution logger (237 lines) — per-node tracking with dedicated Convex tables
- Graph engine (659 lines) — DAG traversal, topological sort, expression evaluator, data mapping
- Execution schemas (135 lines) — `layerExecutions` + `layerNodeExecutions` tables with indexes

**Skills Registry (complete):**
- `_SHARED.md` canonical ontology reference (15KB)
- 9 SKILL.md files — lead-generation, event-promotion, product-launch, booking-appointment, membership-subscription, webinar-virtual-event, ecommerce-storefront, client-onboarding, fundraising-donations
- Registry entries with `TRIGGER_ONLY` usage mode and keyword triggers
- `detectSkillTriggers()` intent classifier (keyword matching on user messages)
- Wired into `chat.ts` — skills load selectively in builder mode based on detected intent
- `generate-knowledge-content.mjs` updated with recursive `scanSkillsDir()` for skill bundling

**Frontend (interactive canvas):**
- `/layers` route with standalone full-screen layout
- React Flow canvas with grid, zoom, pan, minimap, snap-to-grid
- **Tool Chest** — left panel with all 87 nodes grouped by category/subcategory, search filter, drag-and-drop, coming-soon dimming
- **Custom Nodes** — 4 node types (Trigger, Integration, Logic, LcNative) with color-coded headers, status dots, config summaries, input/output handles
- **Node Inspector** — right slide-in panel with editable label/description, config fields (text, textarea, number, select, boolean, json, expression), auth requirements, connection handles
- **State Management** — useNodesState/useEdgesState with 50-entry undo/redo history stack
- **Save/Load** — Convex createWorkflow/saveWorkflow mutations, workflow picker dropdown, dirty indicator
- **Keyboard Shortcuts** — Cmd+Z undo, Cmd+Shift+Z redo, Cmd+S save, Cmd+D duplicate, Delete/Backspace delete
- **Editable workflow name** in top bar
- **Connection Validation** — cycle detection (DFS), duplicate edge prevention, self-loop prevention
- **Node Actions** — duplicate selected nodes, disable/enable toggle in inspector
- **Upvote System UI** — upvote button on coming-soon nodes, live vote counts, duplicate vote prevention
- **Credential Flows** — OAuth popup for OAuth providers, secure API key input for API key nodes, status update on connect
- **Empty State Overlay** — welcome message, quick tips, Browse Templates CTA (Phase 2 stub), Start from scratch
- **Help Overlay** — keyboard shortcuts panel, toggle with ? key or help button in top bar
- **Mobile Gate** — detects viewport < 768px, shows "continue on desktop" message with back-to-dashboard link

### What's Next (Priority Order)

**Phase 1 complete.** All canvas foundation tasks done:
- Empty state overlay with welcome message, quick tips, Browse Templates CTA, Start from scratch
- Help overlay with keyboard shortcuts panel (toggle with ? key or help button)
- Mobile gate: detects < 768px viewport, shows "continue on desktop" message
- Deferred: Space = Pan mode (Phase 5), server-side credential encryption (Phase 3), mobile template browser (Phase 5)

**Skills Registry complete.** All 9 skills + shared reference + intent detection + chat.ts wiring done.

**Next:**
1. **Phase 4** — Build top 10 third-party integrations based on upvote data
2. **Phase 5** — Monitoring dashboard, collaboration, polish
