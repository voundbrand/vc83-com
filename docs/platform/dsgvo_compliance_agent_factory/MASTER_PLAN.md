# Agentic DSGVO Compliance Factory Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/platform/dsgvo_compliance_agent_factory`  
**Last updated:** 2026-03-25

---

## Objective

Deliver a production-ready, agentic DSGVO compliance system that is UI-first, fail-closed by default, and operationally usable by org owners without manual ticket workflows.

System goals:

1. Compliance Inbox with deterministic next actions.
2. Evidence Vault with secure files, metadata, and audit linkage.
3. AVV outreach agent for provider approval workflows.
4. Transfer impact evidence workflow.
5. Security evidence completeness workflow.
6. Gate engine integration with existing risk set `R-002..R-005`.
7. Evidence inheritance model where super-admin manages shared platform evidence while org owners retain org-level release authority.

## Execution status snapshot (2026-03-25)

1. `DCAF-001` through `DCAF-038` are complete.
2. Active row is `none` (`queue_complete`).
3. Milestone 1 through Milestone 8 and the `P0` closure path are complete.
4. Release posture remains fail-closed `NO_GO` until owner signoff matrix entries are completed in `RELEASE_GATE_DECISION.md`.
5. Post-launch hardening (`DCAF-038`) is complete for Compliance Inbox role-authority gating and contextual agent-assist kickoff routing.

---

## Current state in this codebase

Existing anchors already present:

1. Compliance Center with `Org Governance` tab in `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-org-governance-tab.tsx`.
2. Existing fail-closed risk/gate model in `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts` for `R-002`, `R-003`, `R-004`, `R-005`.
3. Org-owner gate decisions and super-admin fleet optics already separated in current read/write APIs.
4. Compliance audit event baseline in `/Users/foundbrand_001/Development/vc83-com/convex/compliance.ts`.
5. Current UX is still manual and not yet a guided, operator-centric workflow system.

---

## Gaps

1. No dedicated Compliance Inbox planner that guides the next best action per risk.
2. No secure Evidence Vault experience with complete metadata and lineage.
3. AVV provider outreach is not operationalized as an agentic workflow.
4. Transfer impact and security completeness workflows are not modeled as step-by-step guided execution.
5. Gate engine does not yet consume structured workflow completeness signals.
6. Shared platform evidence inheritance is not formalized with explicit source and authority boundaries.
7. Sensitive evidence source-of-truth handling is not explicitly enforced to stay outside git.

---

## Target state

1. Org owners open Compliance Inbox and receive deterministic next-action steps until blockers clear.
2. Evidence Vault stores files in secure object storage and keeps structured metadata and audit links in Convex.
3. AVV outreach workflow handles provider request, reminder, response ingestion, and evidence linking.
4. Transfer/security workflows compute completeness and blocker status for `R-003` and `R-004`.
5. Gate engine is strictly fail-closed and surfaces explicit blocker reasons in UI and audit logs.
6. Inherited platform evidence is visible and usable, but does not remove org-owner authority over org-level release decisions.
7. Super-admin role remains fleet optics plus shared evidence ownership only.

---

## Frozen UI-first compliance journey map (DCAF-001 baseline)

This journey map is the canonical operating flow for implementation and test design.

### Stage 1: Compliance Inbox triage

1. Org owner lands in Inbox and receives prioritized actions from risks `R-002..R-005`.
2. Each action card includes blocker reason, required artifacts, due date, and owner.
3. If planner state is missing/unknown, card resolves to explicit blocker and gate remains `NO_GO`.

### Stage 2: Evidence Vault capture

1. Operator opens Vault from Inbox action context.
2. Upload requires mandatory metadata (`evidenceType`, `riskLinks`, `source`, `retention`, `reviewDueAt`).
3. File payload is written to secure storage; Convex stores only metadata, checksum, and audit references.
4. Missing mandatory metadata is rejected fail-closed with explicit error reasons.

### Stage 3: AVV outreach operations (`R-002`)

1. AVV workflow creates provider dossier and outreach state.
2. Outbound outreach sends only after explicit operator confirmation.
3. Response evidence (manual or parser-assisted intake) is linked to provider and risk blockers.
4. Non-response and unknown reply states remain blocking until resolved evidence is attached.

### Stage 4: Transfer impact workflow (`R-003`)

1. Wizard requires transfer map, SCC/TIA artifacts, and supplementary control records.
2. Completeness scoring is deterministic and fully derived from required artifact matrix.
3. Missing artifacts or stale review dates keep transfer status unresolved and gate blocked.

### Stage 5: Security completeness workflow (`R-004`)

1. Wizard requires RBAC, MFA, encryption, tenant isolation, and key rotation evidence.
2. Completeness score and blocker derivation are deterministic and auditable.
3. Expired/invalid evidence is routed back into Inbox as required next actions.

### Stage 6: Gate evaluation and decision authority (`R-005`)

1. Gate engine aggregates unresolved risk blockers, missing evidence, and unknown workflow states.
2. Any unresolved mandatory item forces `NO_GO`; no bypass path exists.
3. Org owner holds org-level `GO/NO_GO` mutation authority.
4. Super-admin views fleet optics and shared platform evidence posture only.

### Stage 7: Inheritance model behavior

1. Super-admin can publish platform evidence with explicit inheritance eligibility and scope.
2. Org views inherited evidence as read-only with source markers and provenance.
3. Org owners may adopt inherited evidence as supporting artifacts but still decide org-level conformity locally.
4. Inheritance cannot auto-transition org gate to `GO`.

---

## Key architecture decisions

1. **Secure evidence source-of-truth**
   - Store contracts/evidence in secure blob storage (`organizationMedia`/storage adapter), not git.
   - Persist metadata, cryptographic checksum, and audit references in Convex object records.
2. **Fail-closed gate semantics**
   - Unknown workflow states, missing mandatory metadata, and unresolved risks always evaluate to blocker and `NO_GO`.
3. **Authority split**
   - Org owner controls org-level conformity and `GO/NO_GO` decision.
   - Super-admin controls shared platform evidence and fleet-level visibility only.
4. **Inheritance model**
   - Shared platform evidence is read-only at org scope and marked as inherited source.
   - Org owners can attach inherited evidence as support, but cannot be forced into `GO` by platform state.
5. **UI-first operations**
   - Inbox and wizard flows become the primary operating path; backend/manual operations are fallback support only.

---

## Canonical evidence taxonomy and metadata contract (DCAF-002)

All compliance evidence records must conform to this taxonomy and metadata contract before they are eligible for workflow completion or gate evaluation.

### Evidence taxonomy

1. **Domain**
   - `AVV_PROVIDER`
   - `TRANSFER_IMPACT`
   - `SECURITY_CONTROL`
   - `INCIDENT_RESPONSE`
   - `GOVERNANCE_RECORD`
2. **Artifact type**
   - `CONTRACT`
   - `ASSESSMENT`
   - `ATTESTATION`
   - `SCREENSHOT`
   - `EXPORT`
   - `POLICY`
   - `LOG`
   - `CERTIFICATE`
3. **Source type**
   - `ORG_UPLOADED`
   - `PLATFORM_INHERITED`
   - `PROVIDER_RESPONSE`
   - `SYSTEM_GENERATED`
4. **Sensitivity**
   - `PUBLIC`
   - `INTERNAL`
   - `CONFIDENTIAL`
   - `STRICTLY_CONFIDENTIAL`
5. **Lifecycle state**
   - `DRAFT`
   - `ACTIVE`
   - `SUPERSEDED`
   - `DEPRECATED`
   - `REVOKED`

### Mandatory metadata contract

Each record requires a complete metadata payload. Missing any required field is fail-closed and keeps related workflows blocked.

```ts
type ComplianceEvidenceMetadata = {
  evidenceId: string;
  organizationId: string;
  domain: "AVV_PROVIDER" | "TRANSFER_IMPACT" | "SECURITY_CONTROL" | "INCIDENT_RESPONSE" | "GOVERNANCE_RECORD";
  artifactType: "CONTRACT" | "ASSESSMENT" | "ATTESTATION" | "SCREENSHOT" | "EXPORT" | "POLICY" | "LOG" | "CERTIFICATE";
  sourceType: "ORG_UPLOADED" | "PLATFORM_INHERITED" | "PROVIDER_RESPONSE" | "SYSTEM_GENERATED";
  inheritanceScope: "NONE" | "PLATFORM_SHARED" | "ORG_CONSUMED";
  sensitivity: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "STRICTLY_CONFIDENTIAL";
  riskLinks: Array<"R-002" | "R-003" | "R-004" | "R-005">;
  providerId?: string;
  transferRegion?: string;
  securityControlIds?: string[];
  checksumSha256: string;
  storagePointer: string;
  storageProvider: "organizationMedia" | "external-kms-backed";
  retentionClass: "90_DAYS" | "1_YEAR" | "3_YEARS" | "7_YEARS";
  retentionDeleteAt: string;
  reviewCadence: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
  nextReviewAt: string;
  ownerUserId: string;
  uploadedByUserId: string;
  uploadedAt: string;
  auditRefIds: string[];
};
```

### Validation and gate semantics

1. `riskLinks` must be non-empty and only include `R-002..R-005`.
2. `retentionDeleteAt` must be after `uploadedAt`.
3. `nextReviewAt` must align with `reviewCadence`; overdue evidence is treated as incomplete.
4. `checksumSha256` and `storagePointer` must both exist or record creation fails.
5. `PLATFORM_INHERITED` evidence is read-only at org scope and cannot mutate org-owner decision authority.

---

## Secure evidence handling policy (DCAF-003)

This policy is mandatory for all DSGVO compliance evidence flows.

### Source-of-truth policy

1. Sensitive evidence payloads (contracts, AVVs, transfer assessments, security exports) are stored only in secure object storage.
2. Git may contain schemas, redacted fixtures, and immutable audit reference IDs only.
3. Any workflow that attempts to persist sensitive payload content in git-managed paths is a policy violation and hard blocker.

### Storage and encryption policy

1. Evidence objects must use encryption at rest with KMS-backed keys.
2. Storage pointers must be opaque IDs, never raw public URLs.
3. Download access must be short-lived, role-scoped, and auditable.
4. Evidence checksum (`sha256`) is required on write and verified on read for integrity drift detection.

### Immutable audit policy

1. Every lifecycle transition emits immutable audit events: `UPLOAD`, `LINK`, `INHERIT`, `SUPERSEDE`, `DEPRECATE`, `ACCESS`.
2. Audit events require actor, organization, timestamp, action, and evidence reference ID.
3. Audit records are append-only and cannot be edited in normal runtime paths.

### Retention and review policy

1. Retention classes are mandatory and drive evidence expiry handling.
2. Expired evidence remains visible but marks dependent workflows incomplete.
3. Scheduled review cadence must generate Inbox actions before evidence becomes stale.

### Fail-closed enforcement

1. Unknown source, missing checksum, missing storage pointer, or missing risk linkage blocks workflow completion.
2. Unauthorized access attempts return explicit denial and emit audit events.
3. Gate evaluation remains `NO_GO` until every mandatory evidence policy condition is satisfied.

---

## Dependency graph

```text
DCAF-001 -> DCAF-002 -> DCAF-005 -> DCAF-006 -> DCAF-007 -> DCAF-010 -> DCAF-012 -> DCAF-024 -> DCAF-026 -> DCAF-028 -> DCAF-030 -> DCAF-031 -> DCAF-033 -> DCAF-034 -> DCAF-035 -> DCAF-036
                                  \-> DCAF-008 -> DCAF-009 ----/
```

## Critical path

`DCAF-001 -> DCAF-002 -> DCAF-005 -> DCAF-006 -> DCAF-007 -> DCAF-010 -> DCAF-012 -> DCAF-024 -> DCAF-026 -> DCAF-028 -> DCAF-030 -> DCAF-031 -> DCAF-033 -> DCAF-034 -> DCAF-035 -> DCAF-036`

---

## Implementation chunks

### Milestone 1 (Plan 1): planning and policy contract

Tasks: `DCAF-001`..`DCAF-004`

Acceptance criteria:

1. Queue and lane model are deterministic and synchronized across all workstream docs.
2. Evidence taxonomy and secure handling policy are documented.
3. Fail-closed and authority split constraints are explicit and testable.

### Milestone 2 (Plan 2): backend primitives

Tasks: `DCAF-005`..`DCAF-010`

Acceptance criteria:

1. Evidence vault data model and secure APIs are implemented.
2. Evidence lifecycle emits immutable audit events.
3. Inheritance resolver and inbox planner queries are available.

### Milestone 3 (Plan 3): Compliance Inbox UX

Tasks: `DCAF-011`..`DCAF-015`

Acceptance criteria:

1. Inbox tab shows prioritized next actions and blocker reasons.
2. Wizard supports AVV, transfer, and security completion flows.
3. Inherited evidence context is visible without changing org decision authority.

### Milestone 4 (Plan 4): Evidence Vault UX

Tasks: `DCAF-016`..`DCAF-020`

Acceptance criteria:

1. Evidence upload, metadata capture, and filtering are operational.
2. Audit lineage and risk linkage are visible for each evidence item.
3. Read-only inherited evidence panel is available.

### Milestone 5 (Plan 5): AVV outreach agent

Tasks: `DCAF-021`..`DCAF-025`

Acceptance criteria:

1. Provider outreach state machine and operator actions are implemented.
2. Outbound sends are explicit and auditable.
3. Inbound responses can be attached as evidence and close AVV blockers.

### Milestone 6 (Plan 6): transfer and security workflows

Tasks: `DCAF-026`..`DCAF-029`

Acceptance criteria:

1. Transfer impact and security completeness workflows compute deterministic status.
2. Missing required artifacts keep blockers open.
3. Expiring evidence is surfaced back into Inbox actions.

### Milestone 7 (Plan 7): gate and inheritance enforcement

Tasks: `DCAF-030`..`DCAF-033`

Acceptance criteria:

1. Gate engine computes `GO/NO_GO` from workflow evidence and risk states with no bypass path.
2. Org-owner and super-admin views show correct separation of authority.
3. Guardrail tests cover blocked `GO`, inheritance misuse, and missing evidence cases.

### Milestone 8 (Plan 8): validation and rollout

Tasks: `DCAF-034`..`DCAF-037`

Acceptance criteria:

1. E2E scenarios pass for Inbox, Vault, Outreach, Transfer, Security, and Gate flows.
2. Telemetry and alerts exist for gate transitions and stalled workflows.
3. Release gate decision package is updated with residual risks and owner signoffs.

### Milestone 9 (Plan 9): post-launch inbox hardening

Tasks: `DCAF-038`

Acceptance criteria:

1. Compliance Inbox edit controls follow backend-authoritative `canEdit` semantics.
2. Non-owner/super-admin sessions remain read-only without owner-only mutation runtime errors.
3. Agent Assist launches AI chat with compliance-inbox context payload for deterministic action support.

---

## Post-launch backlog triage (DCAF-037)

Triage date: `2026-03-25`

Inputs reviewed:

1. Latest verification runs (`typecheck`, `test:unit`, `docs:guard`) from `DCAF-025` and `DCAF-029`.
2. Compliance operational telemetry contract outputs (`outreach_stalled`, evidence review/retention alert classes).
3. Queue closure deltas for outreach SLA automation and transfer/security revalidation scheduling.

Findings:

1. Evidence freshness remains the primary ongoing operator workload (review/retention windows), now covered by deterministic workflow revalidation schedulers.
2. AVV provider non-response handling now has deterministic reminder/escalation cadence and visible inbox alerting.
3. No new `P0` defects were identified from the latest closure verification loops.

Queue refresh decisions:

1. Close `DCAF-025` and `DCAF-029` as `DONE` with captured verification evidence.
2. Add and close `DCAF-038` as a `P0` post-launch hardening row for role-authority drift and contextual agent-assist kickoff wiring.
3. Keep release posture fail-closed (`NO_GO`) until owner signoff matrix is completed in `RELEASE_GATE_DECISION.md`.

---

## Validation

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run test:e2e:desktop`

---

## Risks and mitigations

1. Risk: Sensitive evidence accidentally committed to git.
   Mitigation: secure storage policy, metadata-only docs, and release gate blocker on policy violation.
2. Risk: Workflow complexity overwhelms operators.
   Mitigation: Inbox-first design, deterministic next actions, and minimal required fields per step.
3. Risk: Inheritance blurs authority boundaries.
   Mitigation: explicit source labels, read-only inherited evidence, and org-owner-only release mutation rights.
4. Risk: Hidden bypasses undermine fail-closed model.
   Mitigation: blocked-state tests, audit events for attempted bypasses, and strict gate invariants.
5. Risk: Provider outreach stalls delay release decisions.
   Mitigation: SLA reminders, escalation alerts, and visible backlog aging in Inbox.

---

## Exit criteria

1. All `P0` rows in `TASK_QUEUE.md` are `DONE` or explicitly `BLOCKED` with approved mitigation.
2. Compliance Inbox is the primary operational surface for org owners.
3. Evidence Vault stores and tracks all mandatory evidence with audit linkage.
4. Gate engine enforces fail-closed `NO_GO` whenever blockers remain.
5. Org-owner autonomy and super-admin optics split are validated by tests.
6. Release gate decision artifact is updated with named owners, residual risks, and final verdict.
