# Eval Org Lifecycle Contract

**Contract ID:** `wae_eval_org_lifecycle_v1`  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-evals`  
**Status:** `FROZEN` (`WAE-003`)  
**Last updated:** `2026-03-11`

## Purpose

Freeze a deterministic, replay-safe lifecycle for Playwright eval organizations so `WAE-201` and `WAE-202` can implement fixtures/DSL execution without ambiguous setup behavior.

## Normative terms

1. `MUST` means required.
2. `MUST NOT` means prohibited.
3. `SHOULD` means strongly recommended unless a documented exception exists.

## Pinned inputs (seed/version contract)

Every eval run `MUST` materialize and persist a pin manifest before creating or resetting an eval org.

| Pin key | Required value |
|---|---|
| `lifecycleContractVersion` | `wae_eval_org_lifecycle_v1` |
| `scenarioMatrixContractVersion` | `wae_eval_scenario_matrix_v1` (from `AGENT_EVAL_SCENARIO_MATRIX.json`) |
| `agentTemplateLifecycleContractVersion` | `ath_template_lifecycle_v1` (from `convex/agentOntology.ts`) |
| `seedScript.seedAll.path` | `scripts/seed-all.sh` |
| `seedScript.seedAll.sha256` | `10ea9d7df1d3e5557310d9ef73c78bacbb334684cce206d7d19bf7d12b3506bd` |
| `seedScript.reseed.path` | `scripts/reseed-all-l4yercak3.sh` |
| `seedScript.reseed.sha256` | `5a533ae127bff5846cb5595439e8b376d7657d308c1a3bca958c6473051f57cd` |
| `scenarioMatrix.sha256` | `a6a645c16ba03f3e985ebeaa47be5eafd3257ec1de801e2d9b8f559e36a3df6f` |
| `agentOntology.sha256` | `a02d5b63feb8cdafafbc29aac3560b5dfe2d1f1d04e7861e7484a21c41d9bb84` |
| `templateVersionTag` | resolved by ontology precedence: `templatePublishedVersion` -> `templateVersion` -> `${templateId}@${template.updatedAt}` |

## Deterministic identity and idempotency keys

1. `suiteKey` `MUST` be deterministic:
   - `suiteKeyInput = "${lifecycleContractVersion}|${scenarioMatrixContractVersion}|${templateVersionTag}|${targetEnv}|${lane}"`.
2. `suiteKeyHash = sha256(suiteKeyInput).slice(0, 16)`.
3. Eval org/admin identifiers `MUST` be derived only from `suiteKeyHash`:
   - `organizationSlug = "pw-wae-" + suiteKeyHash`
   - `organizationName = "Playwright WAE " + suiteKeyHash`
   - `adminEmail = "playwright.wae+" + suiteKeyHash + "@example.com"`
4. Timestamp-derived IDs (`Date.now()`) `MUST NOT` be used for WAE eval-org provisioning.
5. Distribution/sync IDs `MUST` rely on existing deterministic ontology logic:
   - `buildOrgDefaultTemplateSyncJobId(...)`
   - `buildDeterministicTemplateDistributionJobId(...)`

## Create protocol

### Order of operations

1. Validate pin manifest against all required keys and hashes.
2. Upsert eval org + admin via `seedAdmin.createSuperAdminUser` using deterministic `organizationSlug` and `adminEmail`.
3. Ensure default managed clone via `internal.agentOntology.ensureTemplateManagedDefaultAgentForOrgInternal`.
4. Verify clone contract fields:
   - `customProperties.templateVersion === templateVersionTag`
   - `customProperties.cloneLifecycle === MANAGED_USE_CASE_CLONE_LIFECYCLE`
   - `customProperties.templateCloneLinkage.sourceTemplateVersion === templateVersionTag`
   - `status === "active"`
5. Emit lifecycle receipt (`create`) artifact.

### Idempotency rules

1. Running create multiple times with identical pin manifest `MUST` converge on one org (`by_slug`) and one admin (`by_email`).
2. Allowed provisioning outcomes:
   - `template_clone_created`
   - `template_clone_updated`
   - `template_clone_promoted_legacy`
3. `fallbackUsed === true` from `ensureTemplateManagedDefaultAgentForOrgInternal` is `FAIL_CLOSED`.

## Reset protocol

Reset executes before each scenario batch and after any failed attempt that will be retried.

### Reset preserves

1. Organization identity (`organizationId`, deterministic slug/name).
2. Deterministic admin user identity.
3. Managed template-clone linkage contract and template source metadata.
4. Pin manifest values for the run.

### Reset wipes

1. Eval-run envelopes and lifecycle receipts for the in-progress attempt namespace.
2. Playwright/session-local auth artifacts for the run (`tmp/playwright/*` attempt paths).
3. Scenario-generated transient data marked with eval run metadata keys (introduced in `WAE-201`/`WAE-202`).

### Reset order

1. Validate pin manifest.
2. Wipe transient eval namespace.
3. Re-assert baseline seed contract (`templateVersion`, clone linkage, required tool scope contract).
4. Verify no stale/blocked drift for eval clone target.
5. Emit lifecycle receipt (`reset`) artifact with pre/post counts.

## Teardown protocol

Teardown is safe cleanup after a full run attempt (pass or fail).

### Default teardown mode (`replay_preserve`)

1. Remove run-scoped auth/storage artifacts from local workspace.
2. Mark attempt lifecycle as `completed` in evidence bundle.
3. Keep eval org active for deterministic replay against the same pinned contract.
4. Verify that no in-progress eval attempt remains for the same `suiteKeyHash`.

### Optional teardown mode (`archive_org`)

1. Soft-delete org via `organizations.deleteOrganization` only when explicitly requested by operator/CI flag.
2. `MUST NOT` use `permanentlyDeleteOrganization` in eval automation because org cleanup is not fully cascaded yet (`TODO` in implementation).
3. Emit lifecycle receipt (`teardown`) with mode and verification result.

## Drift handling (seed/version)

1. Drift is defined as any mismatch in pinned hashes, scenario matrix contract version, template version tag, or clone linkage source version.
2. If drift is detected before create/reset:
   - Mark run `blocked`.
   - Emit reason code `seed_contract_drift`.
   - Do not execute scenarios.
3. If drift is detected mid-run:
   - Abort remaining scenarios.
   - Emit reason code `seed_contract_drift_runtime`.
4. Allowed ontology distribution reasons remain deterministic and auditable (`missing_clone`, `template_version_drift`, `already_in_sync`, `locked_override_fields`, `warn_override_confirmation_required`).

## Failure and retry semantics

1. Retry budget:
   - `create`: max 2 retries for transport/transient failures.
   - `reset`: max 1 retry after a failed wipe/verify mismatch.
   - `teardown`: max 1 retry.
2. Retries `MUST` reuse the same deterministic identifiers and pin manifest.
3. Any non-transient mismatch in pin manifest or clone lifecycle state is `FAIL_CLOSED` with no retry.
4. Promotion/scoring lanes `MUST` treat missing lifecycle receipts as `blocked`.

## Fail-closed conditions

Run is immediately blocked when any of the following occurs:

1. Missing pin manifest key.
2. Hash mismatch for pinned scripts/matrix/ontology.
3. `scenarioMatrixContractVersion` mismatch.
4. Template provisioning fallback path used (`fallbackUsed === true`).
5. Clone linkage missing/legacy unmanaged for eval org.
6. Required lifecycle receipt (`create`, `reset`, `teardown`) missing.
7. Evidence artifact schema mismatch.

## CI and Playwright evidence requirements

Each run `MUST` persist machine-readable evidence under:

`tmp/reports/wae/<runId>/lifecycle/`

Required files:

1. `pin-manifest.json`
2. `create-receipt.json`
3. `reset-receipt.json`
4. `teardown-receipt.json`
5. `evidence-index.json`

Minimum fields for each receipt:

1. `runId`
2. `suiteKeyHash`
3. `organizationId`
4. `organizationSlug`
5. `templateVersionTag`
6. `scenarioMatrixContractVersion`
7. `status` (`passed`, `failed`, `blocked`)
8. `reasonCodes` (deterministic lexical sort)
9. `attempt`
10. `timestamp`

`evidence-index.json` `MUST` include checksums of all lifecycle files and reference Playwright artifacts (trace/video/screenshot paths) generated by the run.

## WAE-201 / WAE-202 implementation handoff

1. `WAE-201` fixtures must replace timestamp-based org bootstrap naming with this contract's deterministic identity rules.
2. `WAE-201` fixtures must emit lifecycle receipts before scenario execution starts.
3. `WAE-202` DSL executor must consume `pin-manifest.json` and stop execution on any fail-closed condition.
