# Platform Mother Authority Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent`  
**Last updated:** 2026-03-20  
**Scope:** Evolve the current Quinn platform template into **Mother**, a platform-owned immutable mothership/support authority that customers can explicitly talk to while the org-owned One-of-One Operator clone remains the default desktop authority.

---

## Mission

Deliver a principled platform authority that:

1. remains distinct from the org-owned One-of-One Operator clone,
2. remains distinct from Samantha, Anne, telephony specialists, and ad hoc admin tooling,
3. gives customers a direct explicit line to a platform-owned immutable authority,
4. reuses the current Quinn protected-template and worker topology instead of inventing a greenfield rail,
5. separates customer help, onboarding, and governance into bounded modes,
6. governs canonical operator evolution through proposal, review, approval, and audited execution,
7. preserves the current managed-template lifecycle instead of bypassing it,
8. fails closed whenever routing, ownership, approval, or migration boundaries are unclear.

---

## Mother Summary

### Recommended architecture

1. **Do not add a second competing platform identity beside Quinn.**
2. Treat **Mother** as the evolved product identity of the current Quinn platform template lineage.
3. Keep the **protected platform template** as the canonical Mother identity.
4. Keep the existing **worker/runtime topology** as the basis for onboarding and customer-support sessions.
5. Add one **dedicated governance runtime** for internal review, migration planning, and approved execution dispatch.
6. Keep all Mother records on the **platform org only** with `clonePolicy.spawnEnabled=false`.
7. Keep the org-owned One-of-One Operator clone as the only default authenticated `desktop` authority.

### Short answer

1. **What Mother is:** the platform-owned immutable mothership/support authority, rooted in Quinn's existing protected template lineage, with bounded onboarding, support, and governance modes.
2. **What Mother is not:** not the customer's operator, not a telephony specialist, not a customer-owned clone, not a mutable org asset, and not a hidden admin backdoor.
3. **Where Mother lives:** on the platform org only, as a protected template lineage plus controlled runtimes.
4. **How Mother is invoked:** existing guest/onboarding entrypoints, explicit customer platform-help targeting, and internal programmatic governance jobs.
5. **How Mother governs:** by producing proposals, dry-runs, review artifacts, approval packets, and execution dispatches that call the existing managed-template lifecycle only after approval.

### Naming recommendation

1. Product-facing identity should become **Mother**.
2. `Quinn` should remain a **legacy compatibility alias** during rollout.
3. The implementation should evolve Quinn into Mother, not keep Quinn and Mother as separate peers.

---

## Dirty Worktree Constraint

Current reality is a dirty worktree with active changes in:

1. telephony, Twilio, and ElevenLabs integration paths,
2. agent ontology, routing, and chat orchestration,
3. protected template lifecycle and managed-clone distribution,
4. agent UI surfaces,
5. chat-side `configure_agent_fields`,
6. default-operator bootstrap and onboarding.

Planning consequence:

1. early Mother implementation must isolate to seed, ontology, routing-guard, and governance seams,
2. no restart-from-scratch rewrite is acceptable,
3. no lane may revert or bulldoze in-flight telephony, template, Twilio, layers, agent UI, routing, or bootstrap work.

---

## Code Reality Snapshot

| Domain | Current state | Evidence | Mother implication |
|---|---|---|---|
| Protected platform agent seeding | `seedPlatformAgents.ts` already seeds protected platform templates and workers for Quinn, the One-of-One Operator template, Samantha variants, and Anne Becker. | `convex/onboarding/seedPlatformAgents.ts`; `tests/unit/onboarding/seedPlatformAgentsProtectedTemplateLifecycle.test.ts`; `tests/unit/onboarding/seedPlatformAgentsPhoneChannelSeeds.test.ts` | Mother should reuse this seed model instead of inventing a new registry. |
| Quinn already has the right substrate | Quinn is already modeled as a protected `platform_system_bot_template` plus onboarding workers with `clonePolicy.spawnEnabled=false`. | `convex/onboarding/seedPlatformAgents.ts` | Mother should be framed as Quinn evolved, not as a separate clean-sheet agent. |
| Legacy Quinn lookup exists | `selectOnboardingTemplateAgent` prefers `templateRole: platform_system_bot_template` and still falls back to `name === "Quinn"`. | `convex/agentOntology.ts` | Any rename to Mother must keep role/name compatibility during rollout. |
| Default org operator bootstrap | Org bootstrap resolves the default desktop operator from protected template role `personal_life_operator_template` and creates or updates a managed clone per org. | `convex/agentOntology.ts`; `convex/onboarding/completeOnboarding.ts`; `convex/organizations.ts`; `convex/auth.ts`; `convex/api/v1/oauthSignup.ts`; `convex/api/v1/emailAuth.ts`; `convex/api/v1/mobileOAuth.ts` | Mother must never replace this bootstrap path for authenticated org authority. |
| Explicit agent targeting exists | Chat and execution already carry explicit `targetAgentId` and route-pin style metadata for non-default routing cases. | `convex/ai/chat.ts`; `convex/ai/agentExecution.ts` | Mother support reachability should use explicit targeting instead of a third routing rail. |
| Managed-clone lifecycle already exists | Template versioning, dry-run distribution, drift, override gating, and rollout contracts already live in `agentOntology.ts`. | `convex/agentOntology.ts`; `docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md` | Mother should review and dispatch into these contracts, not replace them. |
| Telephony boundary is already separate | Phone-call routing is separated by `agentClass: external_customer_facing`; Anne is seeded as a protected telephony template with provider sync state. | `convex/onboarding/seedPlatformAgents.ts`; `convex/integrations/telephony.ts`; `tests/unit/telephony/anneBeckerTemplateSeed.test.ts`; `tests/unit/telephony/telephonyIntegration.test.ts`; `tests/unit/telephony/twilioVoiceProvider.test.ts` | Mother must never become a `phone_call` route or share telephony provider semantics. |
| Quinn currently exits after handoff | The onboarding prompt and interview contract explicitly say Quinn is temporary and hands off to the personal agent. | `convex/onboarding/seedPlatformAgents.ts`; `tests/unit/onboarding/completeOnboarding.channelMatrix.phase3.test.ts` | Mother must keep onboarding handoff bounded even if the broader identity expands beyond onboarding. |

---

## Cross-Workstream Dependencies

This workstream should consume, not redefine, these contracts:

1. `agent-template-distribution-hub`: template versioning, publish, dry-run distribution, drift inventory, rollout telemetry.
2. `operator-collaboration-routing-cutover`: orchestrator-first desktop routing and authority boundaries.
3. `life-operator-one-of-one-cutover`: the org-owned One-of-One Operator clone remains the customer's main authority.

Dependency rule:

1. Mother work may extend these surfaces only where explicit review, aliasing, or approval seams are needed.
2. If Mother work requires replacing any of those contracts, stop and treat it as a plan defect.

---

## Implementation Reality Update

As of 2026-03-20, the first three implementation slices are no longer theoretical:

1. Quinn has already been evolved into Mother-compatible seed and ontology metadata, with Quinn preserved as a compatibility alias.
2. Protected Mother support and governance runtimes now exist on the platform org, with support bounded to the `support` tool profile and governance bounded to `readonly`.
3. Mother is now excluded from implicit active-agent routing, so she cannot silently become the default desktop or telephony authority.
4. Cross-org explicit targeting is now fail-closed except for active Mother `runtimeMode=support` runtimes, preserving the existing same-org targeting behavior for draft and builder flows.
5. A dedicated invocation resolver now exists for Mother onboarding/support/governance targets, plus a bounded support-conversation entrypoint and internal governance dispatch wrapper.
6. Durable Mother review artifacts now exist as platform-owned `objects`, with normalized proposal, approval, rejection, execution-correlation placeholder, and Quinn-alias migration evidence fields.
7. Mother review artifacts now emit read-only downstream evidence through existing `objectActions` and `auditLogs` rails, so proposal capture is explicit and auditable without enabling publish, sync, or customer-clone writes.
8. Mother proposal capture now validates explicit support/governance context, resolves the canonical `personal_life_operator_template`, and reuses the existing managed-clone distribution engine for dry-run-only planning while keeping publish/apply disabled.
9. Explicit Mother support conversations now have a bounded proposal-capture entrypoint that produces a review artifact and dry-run correlation without introducing a third routing rail or dedicated admin UI.
10. Bootstrap, auth, onboarding, and org-baseline flows now share one idempotent default-operator bootstrap invariant, so the managed One-of-One Operator clone remains the authenticated desktop authority for new and existing orgs alike.
11. Mother review artifacts now persist policy-family scope plus rollout-gate requirements, and proposal capture fails closed when org-local channel routing or telephony fields appear in the governance scope.
12. The next promotable implementation step is read-only Mother drift-audit, migration-planning, and org-intervention review flows for partial-rollout environments.

---

## Responsibility Boundary

### Mother is responsible for

1. platform onboarding first contact on the existing Quinn guest entrypoints,
2. explicit customer platform-help and platform-usage guidance,
3. collecting product signals and improvement proposals from customer conversations,
4. reviewing proposed changes to the canonical One-of-One Operator template,
5. generating rollout, drift, and migration review packets for managed clones,
6. proposing override-policy changes for platform-governed field families,
7. assembling org-intervention recommendations for super-admin approval,
8. maintaining the canonical history of platform improvement proposals and governance decisions.

### Mother must never do

1. become the default authenticated `desktop` authority for any org,
2. replace the org-owned One-of-One Operator clone,
3. become routable on `phone_call`,
4. silently mutate customer-owned clones,
5. bypass managed-clone `locked`, `warn`, and `free` protections,
6. let org operators mutate or retune Mother,
7. become a generic substitute for admin tooling,
8. blur onboarding, support, and governance into one unbounded thread or tool scope.

### Explicit distinctions

| Entity | Primary role | Ownership | Customer-visible | Default authenticated desktop route | Mutable by org operator |
|---|---|---|---|---|---|
| One-of-One Operator clone | main org runtime authority | customer org | yes | yes | yes within managed-clone boundaries |
| Mother onboarding mode | guest entry and handoff | platform org | yes on onboarding entrypoints | no | no |
| Mother support mode | explicit platform-help authority | platform org | yes when explicitly opened | no | no |
| Mother governance mode | internal review and execution authority | platform org | no direct customer ownership | no | no |
| Samantha / Anne | specialist and telephony-facing runtimes | platform template plus runtime distribution | yes when routed | no | depends on template/distribution policy, never via Mother |
| Admin tooling | deterministic platform operations | platform | no | no | super-admin/internal only |

---

## Ontology and Identity Model

### Recommended pattern

**Protected Mother template plus controlled runtime family** on the platform org.

Runtime family:

1. existing Quinn-derived onboarding workers,
2. explicit customer-support sessions,
3. one dedicated governance runtime with stable resolution for reviews and approved execution.

### Why this pattern fits current code

1. the template is the real immutable identity customers recognize,
2. Quinn already uses worker topology, so a singleton-only model would fight the codebase,
3. a dedicated governance runtime gives one auditable execution authority without forcing customer sessions through the same mutable context,
4. the runtime family preserves one product identity while keeping mode boundaries explicit,
5. platform-only placement keeps customer ownership unambiguous.

### Recommended ontology

| Field | Recommendation | Reason |
|---|---|---|
| Product identity | `Mother` | Explicit mothership/support framing. |
| Legacy alias | `Quinn` | Required for rollout compatibility and current lookup seams. |
| `subtype` | keep `system` in phase 1 | Lowest-blast-radius path because current Quinn records and lookups already use it. |
| Future `subtype` option | `platform_mother` only after rollout stability | Optional cleanup, not phase-1 requirement. |
| `agentClass` | `internal_operator` initially | Reuses existing internal vs external channel split while routing guards keep Mother out of desktop default resolution. |
| `authorityRole` | `mother` | Distinct from `orchestrator`; usable in isolated support and governance contexts. |
| `templateRole` | preferred `platform_mother_template`, read alias `platform_system_bot_template` | Supports explicit Mother naming without breaking current Quinn seed/lookup contracts. |
| `templateLayer` | `platform_mothership` | Distinguishes Mother from `system_onboarding`, `personal_operator`, and `customer_telephony`. |
| `identityRole` | `platform_mothership` | Makes product role explicit even while `subtype` stays `system`. |
| `runtimeMode` | `onboarding` \| `support` \| `governance` | Hard mode separation is the main authority boundary. |
| Governance runtime resolver | `platform_mother_governance_runtime` | Stable internal target for reviews and approved execution. |
| `templateScope` | `platform` | Confirms platform-only placement. |
| `protected` | `true` on template and runtimes | Prevents org-level edits and casual mutations. |
| `clonePolicy.spawnEnabled` | `false` | Mother is never customer-owned. |
| Support reachability | explicit targeting only for authenticated customers | Keeps Mother reachable without contaminating default routing. |

### Naming and compatibility strategy

1. Keep the current Quinn seed record valid while introducing Mother metadata.
2. Prefer a product-facing rename before a deep internal namespace rewrite.
3. Add lookup support for both `platform_mother_template` and `platform_system_bot_template` during rollout.
4. Keep `name === "Quinn"` or an alias field as a fallback until all bootstrap and lookup code has migrated.
5. Treat internal `platformSteward` naming as a temporary implementation namespace if that reduces churn.

### Tradeoff comparison

| Pattern | Pros | Cons | Verdict |
|---|---|---|---|
| Separate steward beside Quinn | Clean paper design | Duplicates platform identity, ignores current Quinn substrate, creates customer confusion | reject |
| Pure Quinn rename with no mode split | Lowest immediate churn | High risk of authority bleed between onboarding, support, and governance | reject |
| Mother as Quinn-evolved template lineage with bounded runtime modes | Reuses current code, keeps one constant platform identity, preserves routing boundaries | Requires aliasing and mode-guard work | **recommended** |

---

## Authority and Routing Model

### Core routing rule

The org-owned One-of-One Operator clone remains the only default authenticated `desktop` authority.

### Routing matrix

| Context | Route target | Why |
|---|---|---|
| Guest Telegram / webchat / native guest onboarding | Mother `runtimeMode=onboarding` | Preserve current Quinn entrypoint and handoff behavior. |
| Authenticated org `desktop` conversation | org-owned One-of-One Operator clone | Preserve default operator authority. |
| Explicit platform-help conversation from a customer | Mother `runtimeMode=support` | Gives customers a direct line to the platform-owned authority without changing the default route. |
| `phone_call` | existing telephony specialists only | Mother must not own telephony. |
| Governance review, dry-run, migration, rollout dispatch | Mother `runtimeMode=governance` | Keeps control-plane execution isolated from customer conversations. |

### Collaboration metadata rule

1. Mother must never write `authorityRole: orchestrator` into org-operator conversation lineage.
2. Mother support threads should be isolated platform-help threads or explicitly targeted conversations with `authorityRole: mother`.
3. Mother onboarding threads remain bounded onboarding lineage and must still hand off cleanly to the personal operator.
4. Mother governance executions should not rely on customer-thread collaboration metadata at all.

### Invocation model

Use three explicit invocation families:

1. **onboarding mode:** existing guest-entry platform channels currently handled by Quinn,
2. **support mode:** explicit customer platform-help targeting on the current chat seams,
3. **governance mode:** internal programmatic jobs for review, audit, migration planning, rollout review, and approved execution dispatch.

Design rules:

1. do not introduce a third routing rail,
2. do not make Mother part of ambient `getActiveAgentForOrg` desktop resolution,
3. do not let support mode inherit governance write authority,
4. do not let governance mode become customer-visible by default.

---

## Managed-Template Lifecycle Integration

Mother influences the lifecycle; Mother does not replace the lifecycle engine.

| Lifecycle area | Mother role | Existing engine that still executes writes |
|---|---|---|
| Canonical One-of-One Operator template changes | propose diff, risk summary, eval plan, publish packet | `createAgentTemplateVersionSnapshot`, `publishAgentTemplateVersion` |
| Managed-clone sync | generate dry-run scope, blocked-org list, drift summary | `distributeAgentTemplateToOrganizations` |
| Override policy | recommend `locked` / `warn` / `free` field-family changes | existing override-gate enforcement in `agentOntology.ts` |
| Warn/lock fields | maintain policy matrix for operator template field families | current managed-clone gate evaluation |
| Migration planning | produce dry-run plan with reasons and stop conditions | existing distribution and migration-linked paths |
| Drift detection | run read-only audits and classify risk | current drift inventory and linkage contracts |
| Rollout gating | assemble WAE, eval, and audit evidence before promotion | current template lifecycle and rollout artifacts |

### Recommended operator-template policy families

1. `locked`: template linkage, authority markers, lifecycle metadata, platform-managed route bindings, `agentClass`, Mother exclusion markers.
2. `warn`: system prompt baseline, tool profile, autonomy defaults, collaboration defaults, canonical platform safety settings.
3. `free`: customer display name, customer-specific layered context, org-local knowledge and contacts, local preferences that do not alter platform authority or rollout safety.

Current runtime enforcement scope as of 2026-03-20:

1. `locked`: template linkage metadata plus model-selection baseline (`modelProvider`, `modelId`) already enforced on the existing managed-clone gate.
2. `warn`: tool-profile, enabled/disabled tool rails, autonomy defaults, and the canonical operator system prompt stay inside Mother-governed review scope.
3. `out_of_scope`: `channelBindings` and `telephonyConfig` are now explicitly blocked from Mother governance review capture because they remain org-local routing and delivery rails under the current runtime contracts.

### Product-signal rule

1. Mother support conversations may generate proposals, signals, and review candidates.
2. They must not directly mutate the customer's operator or managed clone.

---

## Governance and Auditability

### Review artifact model

Introduce one durable control-plane artifact type, preferably `platform_mother_review`.

Compatibility note:

1. a temporary internal namespace such as `platform_steward_review` is acceptable during transition,
2. the product and ontology should still describe the authority as Mother.

Review variants:

1. `template_change_review`
2. `rollout_promotion_review`
3. `migration_dry_run_review`
4. `drift_audit_review`
5. `org_intervention_review`
6. `customer_signal_review`

Each artifact should capture:

1. `reviewId`
2. `reviewType`
3. `targetTemplateRole`
4. `targetTemplateId`
5. `targetVersionTag`
6. `organizationScope`
7. `requestedBy`
8. `approvedBy`
9. `executionStatus`
10. `motherRuntimeId`
11. `runtimeMode`
12. `reason`
13. `riskSummary`
14. `linkedDryRunJobId`
15. `linkedEvalArtifacts`
16. `createdAt` / `updatedAt`
17. optional `sourceConversationId`
18. optional `sourceCustomerOrganizationId`
19. optional `legacySourceIdentity` for Quinn-to-Mother migration evidence

### Required audit events

1. `platform_mother.review_requested`
2. `platform_mother.analysis_completed`
3. `platform_mother.proposal_created`
4. `platform_mother.proposal_blocked`
5. `platform_mother.proposal_approved`
6. `platform_mother.proposal_rejected`
7. `platform_mother.execution_dispatched`
8. `platform_mother.execution_completed`
9. `platform_mother.execution_failed`
10. `platform_mother.customer_conversation_opened`
11. `platform_mother.customer_signal_captured`
12. `platform_mother.quinn_alias_resolved`

### Approval boundaries

| Action | Mother may do | Human approval required | Notes |
|---|---|---|---|
| Customer platform guidance | yes | no | Conversation only; no mutation. |
| Customer signal capture | yes | no | Proposal only; no customer clone write. |
| Template diff proposal | yes | no | Proposal only. |
| Template publish | prepare packet only | super-admin | Publish still goes through existing lifecycle mutation. |
| Clone migration dry-run | yes | no | Read-only only. |
| Clone migration apply | prepare execution packet only | super-admin | Must reference approved dry-run and review artifact. |
| Rollout promotion | recommend only | super-admin | Eval evidence required. |
| Org intervention | recommend only | super-admin | No silent org mutation. |

Invariant:

1. every Mother-originated write must point back to an approved review artifact,
2. every customer clone mutation must remain visible in `objectActions` and `auditLogs`,
3. support-mode conversations may feed proposals, but may not feed direct writes,
4. missing approval or missing dry-run correlation blocks execution fail closed.

---

## Data Model and API Seams

### Minimal new metadata

Add only the fields needed to make Mother identity and mode boundaries explicit:

1. `authorityRole: "mother"`
2. `identityRole: "platform_mothership"`
3. `runtimeMode: "onboarding" | "support" | "governance"`
4. `templateRole: "platform_mother_template"` with read alias `platform_system_bot_template`
5. `templateLayer: "platform_mothership"`
6. `templateScope: "platform"`
7. `clonePolicy.spawnEnabled: false`
8. `governanceRuntimeRole: "platform_mother_governance_runtime"`
9. optional `legacyIdentityAliases: ["Quinn"]`

### Extend existing contracts instead of redesigning them

Prefer extending:

1. `seedPlatformAgents.ts` for Quinn-to-Mother seed/bootstrap evolution,
2. `agentOntology.ts` for alias lookup, routing exclusion, protected validation, and lifecycle dispatch integration,
3. `ai/chat.ts` and `agentExecution.ts` for explicit Mother support targeting,
4. existing template lifecycle and distribution mutations for approved execution,
5. `objectActions` and `auditLogs` for execution evidence,
6. current onboarding and auth flows only for guard assertions and handoff continuity.

### Recommended new internal APIs

1. `ensurePlatformMotherSeededInternal`
2. `resolvePlatformMotherSupportTargetInternal`
3. `resolvePlatformMotherGovernanceRuntimeInternal`
4. `createPlatformMotherReviewInternal`
5. `runPlatformMotherReviewInternal`
6. `approvePlatformMotherReview`
7. `dispatchApprovedPlatformMotherExecutionInternal`

### Seams to avoid

1. do not add Mother lookup to default authenticated `desktop` resolution,
2. do not make Mother the default org chat path after onboarding,
3. do not add a parallel template publish engine,
4. do not add mutation APIs that bypass existing dry-run and distribution machinery,
5. do not hard-cut Quinn identifiers before compatibility lookups and tests exist.

---

## Migration Strategy

### Phase 0: docs and invariants only

1. publish architecture and queue artifacts,
2. freeze Mother non-goals and routing exclusions,
3. define compatibility-first Quinn-to-Mother strategy.

### Phase 1: identity evolution on top of Quinn

1. keep current Quinn seed records valid,
2. introduce Mother metadata and alias support,
3. optionally change product-facing display to Mother behind a feature flag,
4. keep `platform_system_bot_template` readable until new lookups are deployed,
5. preserve current onboarding worker behavior.

### Phase 2: mode separation

1. add explicit `runtimeMode` boundaries for onboarding, support, and governance,
2. keep onboarding behavior on current guest entrypoints,
3. add explicit Mother support reachability for authenticated customers,
4. add one dedicated governance runtime.

### Phase 3: read-only governance plane

1. add Mother review artifacts,
2. add customer-signal capture plus drift-audit and migration-dry-run flows,
3. allow Mother to generate proposals only.

### Phase 4: lifecycle integration

1. connect approved Mother review packets to canonical operator template versioning and rollout dry-runs,
2. keep execution blocked without human approval,
3. preserve current operator bootstrap behavior for all existing orgs.

### Phase 5: approved execution and rollout

1. allow approved Mother execution packets to call existing publish, distribute, and repair paths,
2. require review ID, approver ID, and dry-run correlation,
3. leave customer override protections intact,
4. keep internal control programmatic; no dedicated super-admin UI is required.

### Compatibility requirements

1. existing protected templates stay valid until explicitly reviewed,
2. existing org default operator clones stay the default authenticated desktop authority,
3. orgs already bootstrapped keep their current managed-clone linkage,
4. partial-rollout environments may seed Mother while keeping governance execution disabled,
5. if Mother artifacts are missing or invalid, current runtime behavior continues unchanged,
6. Quinn legacy lookups must continue to resolve until migration cleanup is explicitly scheduled.

---

## Testing Strategy

### Existing tests to expand

1. `tests/unit/onboarding/seedPlatformAgentsProtectedTemplateLifecycle.test.ts`
2. `tests/unit/onboarding/seedPlatformAgentsPhoneChannelSeeds.test.ts`
3. `tests/unit/ai/operatorRoutingResolution.test.ts`
4. `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts`
5. `tests/unit/ai/agentOntologyMutationPaths.test.ts`
6. `tests/unit/onboarding/completeOnboarding.phase5.test.ts`
7. `tests/unit/onboarding/completeOnboarding.channelMatrix.phase3.test.ts`
8. `tests/unit/auth/oauthSignupRuntime.test.ts`
9. `tests/unit/telephony/anneBeckerTemplateSeed.test.ts`

### New unit suites to add

1. `tests/unit/onboarding/seedPlatformAgentsMotherSeed.test.ts`
2. `tests/unit/ai/platformMotherRoutingIsolation.test.ts`
3. `tests/unit/ai/platformMotherCustomerReachability.test.ts`
4. `tests/unit/ai/platformMotherBootstrapInvariants.test.ts`
5. `tests/unit/ai/platformMotherGovernanceWorkflow.test.ts`
6. `tests/unit/ai/platformMotherAuditContracts.test.ts`
7. `tests/unit/ai/platformMotherMigrationGates.test.ts`
8. `tests/unit/ai/platformMotherLegacyQuinnAlias.test.ts`

### New integration suites to add

1. `tests/integration/ai/platformMotherManagedCloneNonMutation.integration.test.ts`
2. `tests/integration/ai/platformMotherApprovedRollout.integration.test.ts`

### Coverage requirements

1. onboarding continuity: guest entrypoints still reach Mother onboarding mode and hand off correctly,
2. routing isolation: Mother never resolves as the default authenticated `desktop`, `slack`, or `phone_call` authority,
3. support reachability: authenticated customers can reach Mother only through explicit targeting,
4. bootstrap isolation: auth, onboarding, and org creation continue to provision the One-of-One Operator clone,
5. lifecycle isolation: Mother proposals do not mutate clones until approved,
6. alias safety: Quinn legacy lookup still works throughout migration,
7. override-policy safety: `locked`, `warn`, and `free` behavior remains intact,
8. auditability: all review, approval, and execution events are correlated,
9. telephony non-regression: Anne, Samantha, and phone-call contracts remain unchanged.

---

## Rollout Strategy

### Phase A: identity and alias scaffolding

1. Mother metadata present,
2. Quinn compatibility alias preserved,
3. no executable governance writes.

### Phase B: control-plane isolation

1. explicit Mother support resolver,
2. dedicated governance runtime resolver,
3. routing and onboarding continuity tests required before merge.

### Phase C: governance hooks

1. Mother can produce review artifacts for `personal_life_operator_template`,
2. Mother support and governance contexts can now capture read-only dry-run plans against the existing distribution engine and attach that evidence to review artifacts,
3. no publish or clone sync without super-admin approval,
4. eval and audit evidence linked before promotion.

### Phase D: migration and rollout review flows

1. Mother can run drift audits and migration dry-runs,
2. approved execution still dispatches into the existing distribution engine,
3. fail closed on missing approval, missing dry-run, or missing alias resolution.

### Phase E: internal ops wiring and rollout

1. expose Mother governance controls through internal and programmatic entrypoints,
2. expose explicit customer support entrypoints without requiring dedicated UI,
3. ship behind feature flags.

### Recommended feature flags

1. `PLATFORM_MOTHER_IDENTITY_ENABLED`
2. `PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED`
3. `PLATFORM_MOTHER_READONLY_REVIEWS_ENABLED`
4. `PLATFORM_MOTHER_EXECUTION_ENABLED`
5. `PLATFORM_MOTHER_RENAME_QUINN_ENABLED`

Fail-closed rule:

1. default all execution flags to off,
2. enable identity and read-only review before execution,
3. require internal canary plus rollback checklist before enabling approved execution.

---

## Key Risks and Tradeoffs

| Risk | Impact | Mitigation |
|---|---|---|
| Quinn-to-Mother rename breaks onboarding lookup or seed idempotency | Onboarding regression | Keep role and name aliases, ship compatibility tests first, avoid hard cutovers |
| One identity spans onboarding, support, and governance | Context bleed or authority confusion | Enforce `runtimeMode`, isolated thread lineage, dedicated governance runtime, mode-specific tool scopes |
| Mother becomes perceived as the customer's main operator | Brand and routing confusion | Preserve operator clone as default desktop authority, consistent copy, explicit support entrypoint only |
| Mother bypasses managed-clone protections | Silent customer clone drift | Require review artifacts, approver identity, dry-run correlation, and existing lifecycle engine execution only |
| Dirty worktree amplifies ontology churn | Merge conflicts and regressions | Isolate early lanes to seed, ontology, and chat targeting seams; defer broader cleanup |
| Temporary mixed naming persists too long | Operational confusion | Treat Quinn aliasing as transitional and schedule explicit cleanup only after broad verification |

---

## Open Decisions

1. **Product rename timing:** immediate customer-facing rename to Mother vs transitional `Mother (formerly Quinn)` period.
2. **Persisted subtype:** keep `system` long term vs migrate later to `platform_mother`.
3. **Template-role migration:** add `platform_mother_template` immediately vs keep `platform_system_bot_template` longer and alias later.
4. **Review artifact namespace:** preferred `platform_mother_review`; temporary `platformSteward` namespace is acceptable only as an implementation bridge.
5. **Runtime topology:** preferred dedicated governance runtime plus worker-based onboarding and support; fallback is worker-only if the extra runtime proves unnecessary.

---

## Exit Criteria

1. Mother exists as a protected platform-only identity rooted in the current Quinn lineage.
2. Customers can explicitly reach Mother without making Mother the default authenticated org desktop authority.
3. Guest onboarding still works and hands off cleanly to the One-of-One Operator clone.
4. Default authenticated desktop authority remains the org-owned One-of-One Operator clone.
5. Mother can propose and audit template evolution without mutating clones silently.
6. Publish, migration, and rollout actions require explicit review artifacts and human approval.
7. Routing, bootstrap, onboarding, alias compatibility, template lifecycle, override-policy, telephony, and auditability tests are in place.
8. Workstream docs remain synchronized and `npm run docs:guard` passes.
