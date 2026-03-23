# Platform Mother Authority Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent`  
**Source request:** Define a queue-first deep architecture plan for a platform-owned immutable mothership/support authority, named Mother and evolved from Quinn, that governs operator evolution without becoming the customer's default desktop authority.

---

## Purpose

This workstream defines the control-plane architecture for **Mother**, a distinct platform-owned authority that:

1. evolves the current Quinn template lineage instead of adding a second competing platform identity,
2. remains an immutable platform-owned agent that customers can explicitly converse with,
3. preserves Quinn's onboarding substrate as one bounded Mother mode,
4. governs the canonical `personal_life_operator_template` lifecycle,
5. reviews managed-clone drift, migrations, and rollout safety,
6. stays outside customer-owned operator identity and default authenticated desktop routing,
7. never replaces Samantha, Anne, telephony specialists, or the org-owned One-of-One Operator clone.

---

## Mother Summary

1. **What Mother is:** the platform-owned immutable mothership/support authority, rooted in Quinn's protected template and expanded into onboarding, support, and governance modes.
2. **What Mother is not:** not the org's main One-of-One Operator, not a customer-owned clone, not a telephony specialist, and not a silent admin backdoor that mutates customer clones.
3. **Where Mother lives:** only on the platform org; never copied into customer orgs and never resolved as the default authenticated org desktop route.
4. **How Mother is invoked:** guest onboarding entrypoints, explicit customer platform-help targeting, and internal review, audit, migration, and approved-execution jobs.
5. **How Mother governs:** through proposals, dry-runs, review artifacts, and approval packets that feed the existing managed-template lifecycle rather than bypassing it.

---

## Current Status

1. Lane `A` architecture freeze is complete in docs only.
2. `PSA-003` is complete: Quinn now carries Mother identity metadata, compatibility aliases, and a protected Mother governance runtime.
3. `PSA-004` is complete: Mother is excluded from implicit active-agent routing, telephony remains fail-closed, and cross-org explicit targeting is reserved for active Mother support runtimes only.
4. `PSA-005` is complete: Mother now has a seeded support runtime, a control-plane resolver for onboarding/support/governance targets, a bounded support-conversation entrypoint, and an internal governance dispatch wrapper.
5. `PSA-006` is complete: Mother governance now has a durable review-artifact contract with proposal, approval, rejection, execution-correlation placeholder, and Quinn-alias migration evidence fields, persisted as platform-owned objects with `objectActions` and `auditLogs`.
6. `PSA-007` is complete: Mother proposal capture now validates explicit support/governance context, resolves the canonical `personal_life_operator_template`, runs the existing managed-clone distribution engine in dry-run mode only, and persists review artifacts that point at the resulting lifecycle evidence.
7. `PSA-008` is complete: Mother review artifacts now record policy-family scope plus rollout-gate requirements, and proposal capture fails closed if org-local channel routing or telephony fields appear in Mother governance scope.
8. `PSA-009` is complete: org baseline, onboarding, and auth/login flows now share one idempotent operator bootstrap invariant, keeping the org-owned One-of-One Operator clone as the authenticated desktop authority while Mother onboarding still hands off to that clone.

Immediate objective:

1. add read-only Mother drift-audit and migration-planning review flows on top of the current review artifact contract,
2. keep the org-owned One-of-One Operator clone as the only default authenticated desktop authority,
3. preserve onboarding continuity while broadening Quinn into Mother,
4. keep authenticated Mother access explicit and isolated from default routing,
5. keep Mother governance read-only until later approved-execution contracts exist.

---

## Core Files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/MASTER_PLAN.md`
- Index:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/platform-steward-agent/INDEX.md`

Upstream reality anchors:

- `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/agentOntology.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/chat.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`
- `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/completeOnboarding.ts`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-template-distribution-hub/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/operator-collaboration-routing-cutover/MASTER_PLAN.md`

---

## Lane Progress Board

- [x] Lane A architecture freeze and Quinn-to-Mother ontology decision (`PSA-001`, `PSA-002`)
- [x] Lane B Mother identity evolution, alias compatibility, support reachability, and routing isolation (`PSA-003`..`PSA-005`)
- [x] Lane C governance artifacts and template lifecycle hooks (`PSA-006`..`PSA-008`)
- [ ] Lane D bootstrap, migration, and approved execution sequencing (`PSA-009`..`PSA-011`)
- [ ] Lane E tests, internal ops wiring, and rollout closeout (`PSA-012`..`PSA-014`)

---

## Operating Commands

- Docs guard:
  `npm run docs:guard`
- Type safety:
  `npm run typecheck`
- Mother routing and bootstrap subset:
  `npx vitest run tests/unit/ai/operatorRoutingResolution.test.ts tests/unit/ai/platformMotherRoutingIsolation.test.ts tests/unit/ai/platformMotherCustomerReachability.test.ts tests/unit/onboarding/completeOnboarding.phase5.test.ts tests/unit/onboarding/completeOnboarding.channelMatrix.phase3.test.ts`
