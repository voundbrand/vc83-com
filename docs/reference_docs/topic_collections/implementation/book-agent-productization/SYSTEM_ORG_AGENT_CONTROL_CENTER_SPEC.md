# System Org Agent Control Center Spec

**Workstream:** book-agent-productization  
**Status:** Proposed implementation spec (build-ready)  
**Last updated:** 2026-02-24

---

## 1) Goal

Provide a **Super Admin** control surface in the System Organization UI that shows, in one place:

1. which agents are implemented vs pending,
2. which required tools are implemented vs missing,
3. which soul seeds are full vs skeleton vs missing,
4. which agents are runtime-live vs template-only,
5. which gaps block promotion to live.

This UI must stay synchronized with the catalog/matrix/seed docs and code contracts without drift.

---

## 2) Non-goals

1. Do not replace the core one-agent runtime authority model.
2. Do not introduce direct mutation bypasses for runtime/tool policy.
3. Do not make productization docs optional; docs remain the contract/audit layer.

---

## 3) Source-of-truth model (no-drift contract)

Use a **single structured registry in Convex** as operational truth for UI, with docs synchronized from it.

1. Runtime/operations source: new productization tables in Convex.
2. Human-readable source: synchronized markdown docs in `docs/prd/souls/`.
3. Sync contract: every material change updates both the Convex registry and docs snapshot hash in one run.

Existing docs that must remain in sync:

1. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_PRODUCT_CATALOG.md`
2. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md`
3. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/SOUL_SEED_LIBRARY.md`
4. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_ROADMAP.md`
5. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_OVERVIEW.md`

---

## 4) Data model (exact schema proposal)

Create `convex/schemas/agentProductizationSchemas.ts` and register in `convex/schema.ts`.

### 4.1 `agentCatalogEntries`

One row per catalog agent (`1..104`).

```ts
defineTable({
  catalogAgentNumber: v.number(), // 1..104 (unique within datasetVersion)
  datasetVersion: v.string(), // e.g. "agp_v1"
  name: v.string(),
  category: v.union(
    v.literal("core"),
    v.literal("legal"),
    v.literal("finance"),
    v.literal("health"),
    v.literal("coaching"),
    v.literal("agency"),
    v.literal("trades"),
    v.literal("ecommerce"),
  ),
  tier: v.string(), // foundation | dream_team
  soulBlend: v.string(),
  soulStatus: v.union(v.literal("ready"), v.literal("needs_build"), v.literal("pending")),
  subtype: v.string(),
  toolProfile: v.string(),
  requiredIntegrations: v.array(v.string()),
  channelAffinity: v.array(v.string()),
  specialistAccessModes: v.array(v.union(
    v.literal("invisible"),
    v.literal("direct"),
    v.literal("meeting"),
  )),
  autonomyDefault: v.union(
    v.literal("supervised"),
    v.literal("sandbox"),
    v.literal("autonomous"),
    v.literal("delegation"),
    v.literal("draft_only"), // legacy alias; normalize to `sandbox` in runtime policy
  ),
  implementationPhase: v.number(),
  // Computed status fields (sync-owned; no manual edits in UI)
  catalogStatus: v.union(v.literal("done"), v.literal("pending")),
  toolCoverageStatus: v.union(v.literal("complete"), v.literal("partial"), v.literal("missing")),
  seedStatus: v.union(v.literal("full"), v.literal("skeleton"), v.literal("missing")),
  runtimeStatus: v.union(v.literal("live"), v.literal("template_only"), v.literal("not_deployed")),
  blockers: v.array(v.string()),
  sourceRefs: v.object({
    catalogDocPath: v.string(),
    matrixDocPath: v.string(),
    seedDocPath: v.string(),
    roadmapDocPath: v.string(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_dataset_agent", ["datasetVersion", "catalogAgentNumber"])
  .index("by_dataset_category", ["datasetVersion", "category"])
  .index("by_dataset_runtime_status", ["datasetVersion", "runtimeStatus"])
  .index("by_dataset_seed_status", ["datasetVersion", "seedStatus"])
```

### 4.2 `agentCatalogToolRequirements`

One row per `(agent, required tool)` pair.

```ts
defineTable({
  datasetVersion: v.string(),
  catalogAgentNumber: v.number(),
  toolName: v.string(),
  requirementLevel: v.union(v.literal("required"), v.literal("recommended"), v.literal("optional")),
  modeScope: v.object({
    work: v.union(v.literal("allow"), v.literal("approval_required"), v.literal("deny")),
    private: v.union(v.literal("allow"), v.literal("approval_required"), v.literal("deny")),
  }),
  mutability: v.union(v.literal("read_only"), v.literal("mutating")),
  integrationDependency: v.optional(v.string()),
  source: v.union(v.literal("registry"), v.literal("interview_tools"), v.literal("proposed_new")),
  implementationStatus: v.union(v.literal("implemented"), v.literal("missing")),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_dataset_agent", ["datasetVersion", "catalogAgentNumber"])
  .index("by_dataset_tool", ["datasetVersion", "toolName"])
  .index("by_dataset_impl_status", ["datasetVersion", "implementationStatus"])
```

### 4.3 `agentCatalogSeedRegistry`

One row per agent seed readiness.

```ts
defineTable({
  datasetVersion: v.string(),
  catalogAgentNumber: v.number(),
  seedCoverage: v.union(v.literal("full"), v.literal("skeleton"), v.literal("missing")),
  requiresSoulBuild: v.boolean(),
  requiresSoulBuildReason: v.optional(v.string()),
  // Link to real runtime template when present
  systemTemplateAgentId: v.optional(v.id("objects")), // type=org_agent
  templateRole: v.optional(v.string()),
  protectedTemplate: v.optional(v.boolean()),
  immutableOriginContractMapped: v.boolean(),
  sourcePath: v.string(), // usually SOUL_SEED_LIBRARY pointer
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_dataset_agent", ["datasetVersion", "catalogAgentNumber"])
  .index("by_dataset_seed_coverage", ["datasetVersion", "seedCoverage"])
```

### 4.4 `agentCatalogSyncRuns`

Audit + drift detection for syncs between code/docs/data.

```ts
defineTable({
  datasetVersion: v.string(),
  triggeredByUserId: v.optional(v.id("users")),
  mode: v.union(v.literal("read_only_audit"), v.literal("sync_apply")),
  status: v.union(v.literal("success"), v.literal("failed")),
  summary: v.object({
    totalAgents: v.number(),
    catalogDone: v.number(),
    seedsFull: v.number(),
    runtimeLive: v.number(),
    toolsMissing: v.number(),
  }),
  drift: v.object({
    docsOutOfSync: v.boolean(),
    registryOutOfSync: v.boolean(),
    codeOutOfSync: v.boolean(),
    reasons: v.array(v.string()),
  }),
  hashes: v.object({
    catalogDocHash: v.string(),
    matrixDocHash: v.string(),
    seedDocHash: v.string(),
    roadmapDocHash: v.string(),
    overviewDocHash: v.string(),
    toolRegistryHash: v.string(),
    toolProfileHash: v.string(),
  }),
  error: v.optional(v.string()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_dataset_started", ["datasetVersion", "startedAt"])
```

---

## 5) Backend API contract (Convex)

Create `convex/ai/agentCatalogAdmin.ts`.

### Queries (super-admin only)

1. `getOverview({ sessionId, datasetVersion? })`
2. `listAgents({ sessionId, datasetVersion?, filters?, pagination? })`
3. `getAgentDetails({ sessionId, datasetVersion?, catalogAgentNumber })`
4. `listSyncRuns({ sessionId, datasetVersion?, limit? })`
5. `getDriftSummary({ sessionId, datasetVersion? })`

### Mutations (super-admin only)

1. `setAgentBlocker({ sessionId, datasetVersion?, catalogAgentNumber, blocker, action })`
2. `setSeedStatusOverride({ sessionId, datasetVersion?, catalogAgentNumber, override })`
3. `triggerCatalogSync({ sessionId, datasetVersion?, mode })`
4. `exportDocsSnapshot({ sessionId, datasetVersion? })`

### Internal actions

1. `internal.ai.agentCatalogSync.auditCodeAndDocs`
2. `internal.ai.agentCatalogSync.applyRegistrySync`
3. `internal.ai.agentCatalogSync.computeHashes`

Auth requirement:

1. Reuse existing session auth + super-admin check patterns used by System Org tabs.
2. Fail closed for non-super-admin users.

Audit requirement:

1. Every mutation writes an `objectActions` audit record with `actionType` prefix `agent_catalog.*`.

---

## 6) UI spec (System Organization window)

### 6.1 New tab

Add a new tab in:

1. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/index.tsx`

Tab ID:

1. `agent-control-center`

Tab label:

1. `Agent Control`

Primary component:

1. `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`

### 6.2 Layout

Top row:

1. Dataset selector (`agp_v1`, future versions).
2. Sync button (`Audit` and `Sync Apply` modes).
3. Drift badge (`in_sync`, `docs_drift`, `code_drift`, `registry_drift`).

KPI cards:

1. Total agents.
2. Catalog done.
3. Seeds full.
4. Runtime live.
5. Missing tools.
6. Blocked agents.

Main table columns:

1. Agent #.
2. Name.
3. Category.
4. Tool profile.
5. Tool coverage (`implemented/required`).
6. Seed status.
7. Runtime status.
8. Access modes.
9. Phase.
10. Blockers count.

Filters:

1. Category.
2. Runtime status.
3. Seed status.
4. Tool coverage status.
5. Implementation phase.
6. “Only with blockers”.

Right detail drawer tabs:

1. `Summary`
2. `Tools`
3. `Seed`
4. `Runtime`
5. `Dependencies`
6. `Audit`

Actions inside drawer:

1. Add/remove blocker note.
2. Apply seed status override (with required reason).
3. Open source docs/code links.
4. Copy structured “implementation ticket” payload.

### 6.3 UX constraints

1. Computed fields are read-only in UI.
2. Manual overrides must show “override badge” with actor + timestamp.
3. High-impact actions require confirm modal with deterministic text.
4. Empty/error/loading states follow existing super-admin tab conventions.

---

## 7) Drift-prevention contract

No-drift rule:

1. UI status is never hand-computed from markdown at render time.
2. Sync run computes state from code + docs and persists normalized rows.
3. Docs export includes hash metadata and is validated on next sync.

Recommended commands:

1. `npm run agents:catalog:audit` (read-only drift check)
2. `npm run agents:catalog:sync` (apply registry updates + docs snapshot)

CI gate:

1. Add a non-blocking first phase check in CI to emit drift report.
2. Promote to blocking after rollout phase 2.

---

## 8) Integration with existing docs

The UI overview should mirror the same totals used in:

1. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/IMPLEMENTATION_OVERVIEW.md`

Docs update policy on agent changes:

1. D1 row update in `AGENT_PRODUCT_CATALOG.md`.
2. D2 row update in `TOOL_REQUIREMENT_MATRIX.md`.
3. D3 row update in `SOUL_SEED_LIBRARY.md`.
4. Re-sync overview + roadmap references.

---

## 9) Security + governance

1. Super-admin access only.
2. All writes audited.
3. No runtime mutation authority granted by this UI by default.
4. Promotion from `template_only` to `live` should require explicit follow-up action path, not implicit UI toggle.

---

## 10) Rollout plan

### Phase 1 (read-only)

1. Ship new tab with overview, filters, details, drift status.
2. No write actions except `Audit`.

### Phase 2 (controlled writes)

1. Enable blocker management + seed status override + sync apply.
2. Keep runtime promotion operations behind explicit confirmation.

### Phase 3 (automation)

1. Scheduled sync runs.
2. CI drift checks.
3. Optional docs snapshot export job.

---

## 11) Acceptance criteria

1. Super-admin can see exact live/pending status across 104 agents in one table.
2. For any agent row, user can see required tools and whether each is implemented.
3. For any agent row, user can see seed coverage and runtime status with source links.
4. Drift state is visible and reproducible by sync run.
5. All state-changing actions are audited and reversible via explicit follow-up action.
6. Docs and UI summary counts match after a successful sync run.
