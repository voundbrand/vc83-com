# DSGVO Kanzlei Agent MVP Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/platform/dsgvo_kanzlei_agent_mvp`  
**Last updated:** 2026-03-25

---

## Objective

Deliver a release-ready MVP compliance and implementation baseline for a Kanzlei agent that:

1. is operationally aligned with DSGVO obligations,
2. is technically fail-closed for sensitive actions,
3. protects berufliche Geheimnisse under `§203 StGB` and `StBerG` requirements,
4. has auditable go-live evidence and an explicit release gate.

---

## Current state in this codebase

Already available in this workstream:

1. `MVP_AGENT_POLICY.md` defining minimum operating rules.
2. `GO_LIVE_CHECKLIST.md` defining no-go conditions and release criteria.
3. `AVV_62A_CHECKLIST.md` defining vendor-level review criteria.
4. `LEGAL_SOURCE_INVENTORY.md` as canonical status and ownership baseline for legal source artifacts (`KAMVP-003` complete).
5. `PRIVACY_POLICY_MVP_DE.md` as German MVP privacy draft with explicit open-issue register (`KAMVP-004` complete).
6. `DPA_AVV_MVP_DE.md` as German Art.-28/`§203 StGB`/`StBerG §62a` clause pack draft (`KAMVP-006` complete).
7. `SUBPROCESSOR_TRANSFER_MATRIX.md` as code-evidenced provider and transfer baseline (`KAMVP-007` complete).
8. `AVV_62A_CHECKLIST.md` with provider-level `freigegeben/abgelehnt` baseline decisions (`KAMVP-008` complete, currently fail-closed).
9. `TRANSFER_IMPACT_REGISTER.md` with fail-closed transfer decisions and re-check triggers (`KAMVP-009` complete).
10. `TOM_CONTROL_MATRIX.md` with control/gap ownership and remediation targets (`KAMVP-010` complete).
11. `TERMS_MVP_DE.md` as German MVP terms draft aligned to current runtime controls and support boundaries (`KAMVP-005` complete).
12. `existing-docs/` containing prior legal artifacts, including:
   - `dpa_template.md`
   - `privacy_policy.md`
   - `terms_of_service.md`
   - `reseller_agreement.md`
   - several PDF annexes (`Anlage_I` to `Anlage_IV`, AVV/SLA/SaaS docs)

Runtime anchors for technical enforcement already exist in code:

1. `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSpecRegistry.ts`
2. `/Users/foundbrand_001/Development/vc83-com/convex/ai/skills/index.ts`
3. `/Users/foundbrand_001/Development/vc83-com/convex/ai/workerPool.ts`
4. `/Users/foundbrand_001/Development/vc83-com/convex/compliance.ts`

---

## Gaps

1. Legal intake contains template and legacy artifacts in `existing-docs/`; signing-ready legal finalization remains outside this workstream.
2. Runtime guardrails are complete for `P0` and `P1`; `KAMVP-014` is now `DONE` with green `V-MODEL` evidence for `TEST_MODEL_ID=anthropic/claude-opus-4.5` in strict direct-runtime validation mode.
3. Go-live checklist mandatory criteria are not fully `erfuellt`; release decision remains `NO_GO` until checklist closure and owner signoff updates.
4. Provider approvals and transfer evidence remain fail-closed (`AVV_62A_CHECKLIST.md`, `TRANSFER_IMPACT_REGISTER.md`).
5. Security evidence and incident tabletop proof remain incomplete (`TOM_CONTROL_MATRIX.md`, `INCIDENT_RUNBOOK.md` follow-up evidence).

---

## Target state

1. One canonical, auditable docs package in this workstream:
   - source inventory
   - policy and legal drafts
   - vendor and transfer evidence
   - operational runbooks
   - validation evidence
   - signed release gate
2. Runtime controls in code enforce:
   - human approval for high-risk/external actions
   - tool/skill allowlist for Kanzlei mode
   - auditable blocked-action and approval events
   - data minimization before model/tool calls
3. Go-live decision can be made from objective artifacts, not assumptions.

---

## Implementation chunks

### Chunk 1: planning and intake (`KAMVP-001`..`KAMVP-003`)

1. Freeze queue-first lane and verification model.
2. Convert `existing-docs/` into a canonical legal source inventory with explicit status and ownership.

### Chunk 2: legal corpus normalization (`KAMVP-004`..`KAMVP-007`)

1. Create German MVP privacy/terms/DPA docs from real system behavior.
2. Add subprocessor and transfer matrix grounded in active providers only.

### Chunk 3: vendor evidence and transfer control (`KAMVP-008`..`KAMVP-010`)

1. Fill AVV/§62a checklist with evidence links and decisions.
2. Publish transfer impact and TOM control matrix with owner and gap closure path.

### Chunk 4: runtime guardrails (`KAMVP-011`..`KAMVP-014`)

1. Enforce approval gating and allowlists in Convex AI runtime entry points.
2. Emit compliance-grade audit events.
3. Add prompt payload minimization in Kanzlei mode.

### Chunk 5: operational closeout (`KAMVP-015`..`KAMVP-018`)

1. Bind checklist lines to evidence.
2. Add DSR and incident runbooks.
3. Run validation profiles and publish release gate decision.

---

## Validation

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run test:model`

Validation evidence is captured in:

- `/Users/foundbrand_001/Development/vc83-com/docs/platform/dsgvo_kanzlei_agent_mvp/VALIDATION_EVIDENCE.md`

---

## Risks and mitigations

1. Risk: legal templates contain stale or contradictory clauses.
   Mitigation: `LEGAL_SOURCE_INVENTORY.md` marks authority level and owner before reuse.
2. Risk: transfer basis unclear for one or more providers.
   Mitigation: fail-closed status in transfer register until evidence is present.
3. Risk: runtime code allows external actions without explicit approval.
   Mitigation: lane `D` hard gates with fail-closed policy and tests.
4. Risk: checklist drift between docs and implementation.
   Mitigation: queue rules require syncing all four workstream docs at each milestone.

---

## Exit criteria

1. All `P0` rows in `TASK_QUEUE.md` are `DONE` (or explicitly `BLOCKED` with approved mitigation).
2. `GO_LIVE_CHECKLIST.md` has objective evidence links for every mandatory row.
3. Runtime guardrails for approval, allowlist, and logging are implemented and validated.
4. Release gate decision is signed by accountable owners and lists unresolved residual risks.
