# Agent Template Distribution Hub Master Plan

**Date:** 2026-03-11  
**Scope:** Ship a centralized super-admin agent template hub with per-org clone distribution, deterministic override precedence, and auditable rollout controls.

---

## Mission

Deliver a single operating model where:

1. super-admin curates and versions global agent templates,
2. every org receives default clone instances from templates,
3. local org edits remain possible but policy-governed,
4. central operations can inspect drift and safely deploy/rollback changes.

---

## Problem statement

Current agent management is org-centric and manual. That causes:

1. inconsistent defaults across orgs,
2. expensive repeated setup,
3. weak change propagation,
4. limited centralized governance for large-scale operations.

---

## Target architecture

### Core entities

1. `AgentTemplate` (global, super-admin owned)
2. `AgentTemplateVersion` (immutable snapshot)
3. `OrgAgentClone` (org-local runtime instance linked to template/version)
4. `TemplateDistributionJob` (planned/applied rollout record)

### Required linkage metadata (clone)

1. `templateId`
2. `templateVersion`
3. `cloneLifecycle` (`managed_clone_v1` or equivalent)
4. `overridePolicy` (`locked` | `warn` | `free`, optionally per-field)
5. `lastTemplateSyncAt`
6. `lastTemplateJobId`

### Precedence contract

1. platform/global guardrails
2. template version defaults
3. org clone overrides (if policy allows)
4. runtime/session constraints

This order is non-negotiable and must be identical across backend resolution and UI copy.

---

## Backend implementation spec

## 1) Contracts and validators

Add optional template-link metadata in agent contracts so legacy agents remain valid.

Primary touchpoints:

1. `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
2. `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolScoping.ts`
3. related schema/type files under `convex/schemas/*`.

## 2) Super-admin template lifecycle APIs

Create or extend mutations/queries for:

1. create template,
2. create template version snapshot,
3. publish/deprecate template,
4. list templates + versions + affected clone counts.

All write APIs must:

1. require super-admin authorization,
2. emit deterministic audit events,
3. include actor/session metadata and diff summary.

## 3) Distribution engine APIs

Implement rollout operations:

1. dry-run distribution plan,
2. apply rollout to target org set,
3. idempotent upsert clone behavior,
4. rollback to prior template version.

Rollout planner must sort org targets deterministically and return:

1. planned creates/updates/skips,
2. conflict reasons,
3. policy gate blockers,
4. stable `jobId`.

## 4) Drift APIs

Add query surfaces for clone-vs-template drift:

1. config fields (prompt/model/autonomy/limits/channels),
2. tools scope (`toolProfile`, `enabledTools`, `disabledTools`),
3. policy state (`in_sync`, `overridden`, `stale`, `blocked`).

---

## UI implementation spec

## 1) Super-admin central hub

Primary surface:

1. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`

Add sections for:

1. template catalog,
2. template version timeline,
3. distribution jobs,
4. cross-org clone inventory with drift/status filters,
5. rollout + rollback actions with confirmation.

## 2) Org agent surfaces

Primary surfaces:

1. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-detail-panel.tsx`
2. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-tools-config.tsx`
3. `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/types.ts`

Add non-breaking visibility:

1. source template name/version,
2. override badges per controlled section,
3. policy warning/lock states when edits conflict with template governance.

---

## Override policy model

### Modes

1. `locked`: org edits blocked for listed fields.
2. `warn`: edits allowed but require explicit confirmation and audit reason.
3. `free`: org edits unrestricted.

### Conflict semantics

1. Local clone value wins only where policy allows.
2. Rollout apply must skip/flag locked conflicts, never silently overwrite forbidden fields.
3. UI must display why a field is not editable.

---

## Migration and compatibility

1. Existing org agents without template metadata remain valid unmanaged agents.
2. Backfill process should support opt-in linking of existing org agents to templates.
3. First migration must be dry-run capable and reversible.
4. No destructive mutation to existing `customProperties` keys.

### ATH-002 migration strategy (template-linked vs unmanaged legacy)

#### Scope partitions

1. `managed_clone`:
   - agent has `templateCloneLinkage` metadata (`sourceTemplateId`, `sourceTemplateVersion`, lifecycle state),
   - remains governed by template rollout + override policy contracts.
2. `legacy_seeded`:
   - agent lacks modern linkage but has seed bridge evidence (`agentCatalogSeedRegistry.systemTemplateAgentId` and related protected/immutable flags),
   - is eligible for deterministic linkage backfill under seeded invariants.
3. `legacy_unmanaged`:
   - agent lacks linkage and seed bridge evidence,
   - remains unmanaged until explicit super-admin/operator opt-in.

#### Deterministic backfill sequence

1. Preflight inventory snapshot:
   - enumerate org agents in deterministic order (`organizationId`, then `agentId`),
   - classify each row into one scope partition above,
   - persist a dry-run report keyed by stable `migrationJobId`.
2. Candidate resolution:
   - for `legacy_seeded`, resolve template candidate from seed registry mapping only,
   - for `legacy_unmanaged`, do not auto-link; emit `manual_review_required`.
3. Policy projection:
   - project default linkage payload (`cloneLifecycleState`, `overridePolicy`, `sourceTemplateVersion`) without writes,
   - compute conflict reasons (`missing_template`, `immutable_origin_conflict`, `policy_state_unknown`) deterministically.
4. Apply pass (explicitly approved job only):
   - write linkage for rows with zero blockers,
   - skip blocked rows fail-closed,
   - emit deterministic audit envelopes for both `linked` and `skipped` outcomes.

#### Dry-run contract requirements

1. Dry-run is mandatory before any apply job.
2. Dry-run output must include:
   - `migrationJobId`,
   - totals (`eligible`, `linked_preview`, `blocked`, `manual_review`),
   - per-row status + reason codes,
   - projected linkage payload hash.
3. Apply requests must reference a prior dry-run `migrationJobId`; mismatch is rejected.

#### Rollback strategy

1. Rollback unit is the `migrationJobId`.
2. For each linked row from that job:
   - restore previous linkage snapshot (including null/unmanaged state),
   - preserve pre-existing seed registry fields unchanged.
3. Rollback is idempotent:
   - repeat execution on same job must produce no additional state drift.
4. Rollback audit must include:
   - initiating actor,
   - reverted row counts,
   - skipped row counts + reasons,
   - original `migrationJobId` correlation id.

#### Guardrails and stop conditions

1. Stop apply immediately if immutable seeded origin rebinding is required without explicit super-admin override reason.
2. Stop apply when blocked ratio exceeds `5%` on a job (requires plan revision before retry).
3. Stop rollout if post-link drift classifier produces unexpected `blocked` transitions for previously in-sync clones.

## Seeded-agent contract requirements

1. Use existing seed control contracts as source-of-truth for platform-seeded profiles:
   - `agentCatalogSeedRegistry.systemTemplateAgentId`
   - `agentCatalogSeedRegistry.protectedTemplate`
   - `agentCatalogSeedRegistry.immutableOriginContractMapped`
2. Preserve current super-admin control-center semantics around seed coverage (`full`/`skeleton`/`missing`).
3. Bridge seeded template bindings into new template-link metadata without breaking existing catalog sync workflows.
4. Keep legacy seeded agents operable even if template metadata is partially missing.

---

## Security and audit requirements

1. Global template/distribution writes are super-admin only.
2. Every distribution action must write auditable events with:
   - actor,
   - target scope,
   - job id,
   - changed field summary,
   - timestamp.
3. Rollback actions require explicit confirmation and audit reason.
4. Read APIs must enforce org boundary for non-super-admin users.

## Catalog packaging and licensing requirements

1. Published status controls storefront visibility, not entitlement by itself.
2. Add explicit package/license metadata for published agents so storefront can show:
   - included in current package,
   - purchasable add-on,
   - enterprise/concierge only.
3. Activation path (`preflight` + `spawn_use_case_agent`) must enforce entitlements fail-closed.
4. Failed entitlement checks must return deterministic reason codes and upgrade/purchase guidance in UI.
5. Entitlement checks should reuse existing licensing primitives where possible (`licensing/helpers.ts`, purchase records) instead of creating parallel gates.

---

## Testing strategy

## Required tests

1. mutation path coverage for template lifecycle + distribution idempotency,
2. drift calculation determinism tests,
3. policy gate tests (`locked`, `warn`, `free`),
4. UI DOM tests for hub actions and org clone lineage/override display.

## Suggested initial targets

1. `tests/unit/ai/agentOntologyMutationPaths.test.ts`
2. new super-admin hub tests under `tests/unit/ai/*agentControlCenter*`
3. `tests/unit/agents/agentToolsConfig.dom.test.ts` extension for lineage/lock hints

---

## Rollout plan

1. Stage 1: contract + backend APIs behind feature flags.
2. Stage 2: super-admin hub read-only drift/inventory.
3. Stage 3: controlled rollout apply for canary org set.
4. Stage 4: org-facing lineage + override gates.
5. Stage 5: general availability with operational thresholds.

Rollback trigger examples:

1. elevated distribution job failure rate,
2. unauthorized scope access attempts,
3. clone drift misclassification causing policy violations.

Operational drill cadence:

1. run a mock migration drill after any migration-contract change and before first large legacy-linkage campaign,
2. validate dry-run/apply/rollback control points with deterministic correlation id logging,
3. store drill evidence in workstream docs with verification command outputs.

Canary rollout execution contract:

1. execute canary in staged windows only (`stagedRollout.stageSize` + `stageStartIndex`),
2. require explicit dry-run plan before every apply step,
3. keep stop/rollback threshold active (`blocked` ratio above `5%` or policy anomalies),
4. use telemetry hold between stages before advancing.

---

## Acceptance criteria

1. queue artifacts remain synchronized,
2. precedence is deterministic and documented identically in UI/backend,
3. distribution is idempotent and auditable,
4. legacy non-template agents continue to function,
5. docs guard and required verification profiles pass.

---

## Initial status

- Workstream initialized.
- Contract and lane breakdown authored.
- `ATH-001` completed on 2026-03-07: precedence + role-boundary contract frozen.
- `ATH-015` completed on 2026-03-07: seeded bridge contract and immutable-origin migration lock added.
- `ATH-003` completed on 2026-03-08: optional template clone linkage contract shipped with lifecycle/override/sync metadata and legacy fallback.
- `ATH-004` completed on 2026-03-08: super-admin template lifecycle mutations shipped (create template, immutable version snapshot, publish version, deprecate template/version) with deterministic audit envelopes.
- `ATH-005` completed on 2026-03-08: deterministic template distribution engine shipped with dry-run planning, stable rollout job id, and idempotent create/update/skip upsert semantics.
- `ATH-006` completed on 2026-03-08: deterministic drift query surface shipped (`getTemplateCloneDriftReport`) covering tools/model/prompt/autonomy/bindings diffs, policy-state classification (`in_sync`, `overridden`, `stale`, `blocked`), and legacy/unmanaged linkage fallback.
- `ATH-007` completed on 2026-03-08: super-admin hub entry point shipped in existing Agent Control Center with template catalog/version history/rollout section toggles and deterministic drift/sync context wiring.
- `ATH-008` completed on 2026-03-09: cross-org clone inventory shipped with deterministic backend query (`listTemplateCloneInventory`) and UI filters by org/template/policy state/risk level plus drift-status indicators for governance workflows.
- `ATH-009` completed on 2026-03-09: rollout safety controls shipped with staged rollout window sizing, deterministic preview/audit summaries, explicit confirmation-gated apply/rollback in super-admin control center, and rollback target-version selection wired to template version inventory query.
- `ATH-016` completed on 2026-03-09: storefront package/license descriptor contract shipped for published agent cards and product context (`packageAccess`, `licenseModel`, `activationHint`, optional package/license refs) with informational-only UI rendering and no entitlement enforcement changes.
- `ATH-017` completed on 2026-03-09: published-agent activation entitlement gates now enforce fail-closed checks across preflight + `spawn_use_case_agent` with deterministic reason codes, guidance payloads, and entitlement audit envelopes.
- `ATH-013` completed on 2026-03-09: lane `E` release-gate verification passed (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`) after ingress-routing regression resolution.
- `ATH-014` completed on 2026-03-09: queue-first closeout artifacts synchronized for lane `E`; release gate marked passed and next promotable task set to `ATH-002`.
- `ATH-002` completed on 2026-03-09: migration strategy for existing org agents finalized with deterministic partitioning (`managed_clone`, `legacy_seeded`, `legacy_unmanaged`), mandatory dry-run payloads, apply gating by `migrationJobId`, idempotent rollback sequencing, and explicit fail-closed stop conditions.
- `ATH-018` completed on 2026-03-09: operational drill executed for migration runbook with mock dry-run/apply/rollback validation, evidence log published (`ATH-018_MIGRATION_DRILL_2026-03-09.md`), and targeted verification passed (`V-UNIT-AGENT`, `V-DOCS`).
- `ATH-019` completed on 2026-03-09: pre-rollout readiness drill executed with full compile/unit/docs verification (`V-TYPE`, `V-UNIT`, `V-DOCS`), evidence log published (`ATH-019_PRE_ROLLOUT_DRILL_2026-03-09.md`), and no blocking regressions detected.
- `ATH-020` started on 2026-03-09: canary rollout runbook published with repo-specific execution steps for `listTemplateCloneInventory`, `getTemplateCloneDriftReport`, `distributeAgentTemplateToOrganizations`, and `listTemplateDistributionTelemetry`, including stage gates and rollback triggers.
- `ATH-020` moved to `BLOCKED` on 2026-03-11 after verification profile rerun passed (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`) but live canary execution could not start without required rollout inputs (`SESSION_ID`, `TEMPLATE_ID`, canary org ids, optional `TEMPLATE_VERSION_ID`). Dry run Step 1 remained fail-closed until valid super-admin session context was supplied.
- `ATH-020` moved to `DONE` on 2026-03-11 per operator confirmation that live canary execution succeeded and the rollout flow worked end-to-end.
- `ATH-017` completed on 2026-03-09: published-agent activation now enforces deterministic package/license entitlement gates in preflight + `spawn_use_case_agent` fail-closed path, reusing licensing helpers with legacy descriptor fallback and deterministic reason-code/guidance payloads; activation decisions are auditable via `agent_store_activation_entitlement_evaluated` object/audit events and surfaced in agent store UI status/blocked guidance messaging.
- `ATH-011` completed on 2026-03-09: managed clone override policy gates now enforce `locked` fail-closed and `warn` confirmation+reason requirements in org update + rollout/distribution mutation paths, with deterministic gate audit envelopes and UI confirmation prompts in org editing controls (`agent-create-form`, `agent-tools-config`).
- `ATH-012` completed on 2026-03-09: operational distribution telemetry shipped with deterministic backend query (`listTemplateDistributionTelemetry`) and rollout-panel audit table for job status, error counts, operation kind (`rollout` vs `rollback`), and affected-org summaries; trust-event taxonomy now includes template-distribution admin event contracts for incident/audit indexing.
- `ATH-010` completed on 2026-03-09: org agent detail/tools UI now surfaces template lineage (`source template/version`, lifecycle) and override mode badges through shared type helpers without changing existing owner editing flows.

## Contract decisions (frozen)

1. Deterministic precedence remains: `platform policy -> template baseline -> org clone overrides -> runtime/session restrictions`.
2. Role boundary is fail-closed:
   - global template/seed binding writes are `super_admin` only,
   - org-scoped operators can tune only sanctioned clone fields under one-of-one guardrails.
3. Seeded bridge contract is persisted with seed registry rows (`ath_seed_template_bridge_v1`) and mirrors:
   - `systemTemplateAgentId`,
   - `protectedTemplate`,
   - `immutableOriginContractMapped`.
4. Immutable seeded origin mappings are locked against rebinding/clearing through the standard binding mutation path.
5. Controlled escape hatch added: super-admin migration override mutation can rebind immutable mappings with explicit audited reason.
6. Backward compatibility remains for unmanaged legacy agents and rows missing bridge metadata (bridge is derivable from existing seed fields).
