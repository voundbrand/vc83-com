# GDPR/DSGVO System Mastery Task Queue

**Last updated:** 2026-03-26  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only`  
**Source request:** End-to-end GDPR/DSGVO system hardening for current backend stack (Convex, Vercel, and active integrations) with contract-ready evidence.

---

## Queue rules

1. Allowed statuses: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless an explicit exception is documented here.
3. Promote `PENDING` to `READY` only when all dependencies are `DONE`.
4. Deterministic pick order: `P0` before `P1`, then lowest task ID.
5. Every row must execute listed `Verify` commands before moving to `DONE`.
6. Fail-closed posture is mandatory: unresolved legal/transfer evidence means `NO_GO`.
7. Sensitive legal documents remain outside git as source-of-truth; git stores references, metadata, and decision logs.
8. Keep `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` synchronized.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Workstream contract and baseline inventory | docs in `GDPR_ONLY` | No runtime code changes |
| `B` | Region/topology verification and provider evidence map | provider docs + compliance docs | Avoid UX changes |
| `C` | Runtime consent and legal-surface technical gaps | `src/components`, `src/app`, `convex/*` | Keep legal prose unchanged |
| `D` | Contract/transfer/TOM closure package | legal/compliance docs + evidence links | No unrelated feature work |
| `E` | Gate validation and signoff package | tests + release docs | Start after all `P0` blockers closed |

---

## Dependency-based status flow

1. Lane `A` must complete before lane `B` and lane `C`.
2. Lane `B` must produce region and provider baseline before lane `D` decisions.
3. Lane `C` must complete consent controls before lane `E` signoff.
4. Lane `E` starts only after all prior `P0` rows are `DONE` or explicitly `BLOCKED` with owner and mitigation.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `GDPRSYS-001` | `A` | 1 | `P0` | `DONE` | - | Initialize queue-first workstream artifacts in `GDPR_ONLY`. | `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/SESSION_PROMPTS.md` | `V-DOCS` | Completed 2026-03-26. |
| `GDPRSYS-002` | `A` | 1 | `P0` | `DONE` | `GDPRSYS-001` | Refresh active provider inventory from code-level evidence and mark active vs feature-dependent integrations. | `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/GDPR_COMPLIANCE_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/SUBPROCESSOR_TRANSFER_MATRIX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/LEGAL_SOURCE_INVENTORY.md` | `V-DOCS` | Done 2026-03-26. Active-vs-feature-dependent provider split refreshed from code evidence; AVV baseline dossier path linked (`docs/strategy/one-of-one-v4/existing-avvs-docs/`). |
| `GDPRSYS-003` | `B` | 2 | `P0` | `DONE` | `GDPRSYS-002` | Confirm production Convex deployment region and store immutable evidence reference (dashboard export/screenshot). | `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT_POST_MIGRATION.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/SUBPROCESSOR_TRANSFER_MATRIX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md` | `V-DOCS` | Done 2026-03-26. Post-migration snapshot verifies EU target project `sevelayers-eu` with prod `dashing-cuttlefish-674` and dev `handsome-trout-897` in `aws-eu-west-1`; legacy `agreeable-lion-828` remains as historical deployment. |
| `GDPRSYS-004` | `B` | 2 | `P0` | `DONE` | `GDPRSYS-002` | Confirm Vercel function-region configuration for production and document residual global processing constraints. | `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT_POST_REDEPLOY.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/GDPR_COMPLIANCE_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md` | `V-DOCS` | Done 2026-03-26; re-verified post-redeploy on 2026-03-26. Tracked linked projects (`vc83-com`,`segelschule-altwarp`,`guitarfingerstyle`) now show `serverlessFunctionRegion=cdg1` and latest prod deployment regions `cdg1/dub1/fra1`. |
| `GDPRSYS-005` | `C` | 3 | `P0` | `DONE` | `GDPRSYS-001` | Enforce analytics fail-closed: PostHog must not capture before explicit consent. | `/Users/foundbrand_001/Development/vc83-com/src/components/providers/posthog-provider.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/cookie-consent-banner.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/app/providers.tsx` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-26. PostHog runtime path removed (provider + hook are no-op), banner mounted globally, consent persisted as explicit accept/decline with reopen control, and unit coverage added in `tests/unit/gdpr/cookie-consent-runtime.test.ts`. |
| `GDPRSYS-006` | `C` | 3 | `P0` | `DONE` | `GDPRSYS-005` | Persist consent records with versioned policy metadata and revocation handling. | `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/*`; `/Users/foundbrand_001/Development/vc83-com/convex/*consent*.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-26. Added `consentRecords` schema + indexes, added `convex/consent.ts` (`recordConsent`, `revokeConsent`, `getConsentHistory`), extended `userPreferences.cookieConsent` snapshot, and wired banner decisions to persist consent records for authenticated sessions. |
| `GDPRSYS-007` | `C` | 3 | `P1` | `DONE` | `GDPRSYS-005` | Add legal page routes (`privacy`, `terms`, `cookies`) and public footer navigation. | `/Users/foundbrand_001/Development/vc83-com/src/app/*`; `/Users/foundbrand_001/Development/vc83-com/src/components/*` | `V-TYPE`; `V-DOCS` | Done 2026-03-26. Added `/privacy`, `/terms`, `/cookies` routes and global public legal footer nav component mounted in root layout. Legal prose remains placeholder/lawyer-owned. |
| `GDPRSYS-008` | `D` | 4 | `P0` | `DONE` | `GDPRSYS-003`, `GDPRSYS-004` | Convert active-provider rows in AVV checklist from placeholders to evidence-linked decisions. | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` | `V-DOCS` | Done 2026-03-26. Added provider evidence ledger and replaced all `TODO-KAMVP-008-*` placeholders with concrete evidence links in provider decision rows; fail-closed decisions remain `abgelehnt` pending provider-signed legal artifacts. Verified with `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `GDPRSYS-009` | `D` | 4 | `P0` | `DONE` | `GDPRSYS-008` | Close transfer-impact register for active non-EEA/uncertain paths with mechanism + fallback + review trigger. | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md` | `V-DOCS` | Done 2026-03-26. Transfer register now documents mechanism baseline + fallback + review trigger per provider and removes active-path `open` rows (`closed_fail_closed` / `closed_feature_disabled` / `closed_scope_deferred`). Verified with `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `GDPRSYS-010` | `D` | 4 | `P0` | `DONE` | `GDPRSYS-008` | Link TOM evidence per active provider and close `missing` control claims. | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TOM_CONTROL_MATRIX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` | `V-DOCS` | Done 2026-03-26. Replaced all `TODO-KAMVP-010-*` provider TOM placeholders with linked evidence sources and moved every provider claim status off `missing` to explicit linked/pending states with owner + remediation date. Verified with `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `GDPRSYS-011` | `D` | 4 | `P0` | `DONE` | `GDPRSYS-008`, `GDPRSYS-009`, `GDPRSYS-010` | Update Go-Live checklist mandatory rows from `offen` to evidence-backed statuses. | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/GO_LIVE_CHECKLIST.md` | `V-DOCS` | Done 2026-03-26. Mandatory checklist rows now reference concrete evidence/blocker artifacts (AVV, transfer, TOM, release-gate, runbook); `Datenminimierung` moved to `erfuellt` with `VALIDATION_EVIDENCE.md` support, residual blockers remain explicitly `offen`. Verified with `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `GDPRSYS-012` | `E` | 5 | `P0` | `DONE` | `GDPRSYS-006`, `GDPRSYS-011` | Run validation bundle and capture refreshed evidence logs. | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/VALIDATION_EVIDENCE.md`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/kanzlei-agent-mvp/` | `V-DOCS`; `V-TYPE`; `V-UNIT`; `V-INTEG` | Done 2026-03-26. Refreshed logs (`docs_guard.log`, `typecheck.log`, `test_unit.log`, `test_integration.log`) and updated validation evidence with latest run totals (`V-UNIT`: 429/7 files, 2262/106 tests; `V-INTEG`: 54/2 files, 198/22 tests). Required trio `typecheck`/`test:unit`/`docs:guard` also PASS. |
| `GDPRSYS-013` | `E` | 5 | `P0` | `DONE` | `GDPRSYS-012` | Update release gate decision with named owners and explicit verdict rationale. | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/RELEASE_GATE_DECISION.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_compliance_agent_factory/RELEASE_GATE_DECISION.md` | `V-DOCS` | Done 2026-03-26. Refreshed KAMVP and DCAF release-gate docs with named owner IDs, updated evidence/risk rationale, and explicit interim `NO_GO` decisions under fail-closed policy. Verified with `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |
| `GDPRSYS-014` | `E` | 5 | `P1` | `DONE` | `GDPRSYS-013` | Publish quarterly compliance operations calendar and owner rota for DSR, vendor, transfer, and incident checks. | `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/08_ONGOING_OBLIGATIONS.md` | `V-DOCS` | Done 2026-03-26. Replaced generic obligations text with provider-bound quarterly calendar and named owner rota (`DSR`, vendor AVV/DPA, transfer, TOM, incident, gate consolidation) mapped to active provider set. Verified with `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. |

---

## Current kickoff

- Active task: none.
- Deterministic next row: none (`GDPRSYS-001`..`GDPRSYS-014` are `DONE`).
- Immediate objective: maintain fail-closed release posture until signed legal/provider evidence closes residual `NO_GO` risks.
