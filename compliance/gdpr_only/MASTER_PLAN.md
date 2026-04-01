# GDPR/DSGVO System Master Plan (2026-03-26)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only`  
**Last updated:** 2026-03-26

---

## Objective

Move the current platform from "technically strong but legally incomplete" to an auditable DSGVO/GDPR operating state that can be defended with evidence.

System goals:

1. Keep fail-closed compliance runtime behavior.
2. Prove data residency and transfer posture per active provider.
3. Close DPA/AVV, TOM, and transfer evidence for all active subprocessors.
4. Enforce consent-dependent analytics behavior in production runtime.
5. Flip release gate from `NO_GO` to `GO` with named owner signoff.

---

## Current state in this codebase

Already implemented:

1. Compliance control plane, Inbox/Vault workflows, and fail-closed gate logic.
2. Evidence lifecycle audit events and inheritance authority boundaries.
3. Runtime guardrails for Kanzlei mode (approval, allowlist, audit telemetry).
4. DSR and incident runbook baselines.
5. Transfer/AVV/TOM document scaffolding and review matrices.

Still open:

1. Provider contract evidence is still unresolved for active providers (rows are evidence-linked but remain fail-closed `abgelehnt` until signed packages exist).
2. Owner signoff is documented as interim `NO_GO`; unanimous `GO` signoff is still pending closure of legal/transfer/security blockers.
3. Convex migration evidence now includes post-cutover EU verification (`dashing-cuttlefish-674` / `handsome-trout-897` in `aws-eu-west-1`); remaining Convex blockers are contractual and transfer-documentation closure.
4. Vercel linked projects are now region-evidenced as EU-oriented (`cdg1`) after redeploy; residual closure remains on transfer/DPA/TOM evidence rather than region default.

Recently closed (2026-03-26):

1. Runtime analytics consent controls (`GDPRSYS-005`): PostHog removed from runtime path; cookie consent banner is globally mounted with explicit accept/decline and persisted decisions.
2. Consent evidence persistence (`GDPRSYS-006`): `consentRecords` schema and consent mutation/query/revocation API implemented with policy-version metadata.
3. Legal surfaces (`GDPRSYS-007`): `/privacy`, `/terms`, `/cookies` routes plus global legal footer navigation added.
4. AVV evidence wiring (`GDPRSYS-008`): active provider decision rows now link to concrete repository evidence through `PROVIDER_DECISION_EVIDENCE.md` instead of `TODO-KAMVP-008-*` placeholders.
5. Transfer closure pass (`GDPRSYS-009`): active transfer rows now include mechanism baseline + fallback + review trigger and are status-closed (`closed_fail_closed`) instead of `open`.
6. TOM evidence closure (`GDPRSYS-010`): provider TOM claims are linked for active and feature-dependent rows and all `missing` placeholders were removed.
7. Go-live evidence wiring (`GDPRSYS-011`): mandatory checklist rows now include explicit evidence links or blocker references instead of generic/open-ended assertions.
8. Validation refresh (`GDPRSYS-012`): docs/type/unit/integration suite rerun and evidence logs updated with the current baseline in `VALIDATION_EVIDENCE.md`.
9. Release-gate owner refresh (`GDPRSYS-013`): KAMVP + DCAF gate decisions now include named owner IDs and explicit fail-closed `NO_GO` rationale.
10. Operations calendar publication (`GDPRSYS-014`): quarterly GDPR controls and owner rota are now mapped directly to the active provider baseline.

---

## Platform baseline decisions (as of 2026-03-26)

1. Convex supports regional hosting and currently documents US East and EU West options.
2. Convex deployment region must be selected per deployment; existing deployment region is not in-place mutable.
3. Vercel supports function region configuration (including EU regions), but default function region for new projects is `iad1` unless changed.
4. Vercel publicly states that data is not permanently stored inside EU regions (ephemeral cache behavior in EU is possible).
5. Therefore, strict "EU-only at-rest" posture must treat Vercel as compute/edge platform and keep personal-data source-of-truth in explicitly EU-scoped data stores.
6. Runtime snapshots 2026-03-26:
   - Convex pre/post migration evidence now records transition from legacy US prod to EU target project regions,
   - Vercel post-redeploy snapshot shows `vc83-com`, `segelschule-altwarp`, and `guitarfingerstyle` all on `serverlessFunctionRegion=cdg1` with latest prod deployment regions `cdg1/dub1/fra1`.

---

## Target state

1. Every active subprocessor row has:
   - signed/accepted DPA evidence,
   - transfer mechanism evidence,
   - TOM reference evidence,
   - named owner and review date,
   - explicit `freigegeben` or `abgelehnt` decision.
2. Production topology is documented and evidenced:
   - Convex production region confirmed and recorded.
   - Vercel function regions and residual global processing documented.
3. Consent-sensitive telemetry is fail-closed:
   - analytics disabled by default,
   - explicit opt-in before capture,
   - revocation path verified.
4. Release gate artifacts include legal, technical, and operational signoff from Product, Engineering, Security, and Datenschutz owners.

---

## Implementation chunks

### Chunk 1: Baseline freeze and topology proof

1. Refresh active provider inventory from code and runtime configuration.
2. Record Convex and Vercel region settings for production.
3. Create evidence package links (outside git for sensitive contracts).

### Chunk 2: Runtime consent and policy gaps

1. Enforce analytics opt-out by default until consent.
2. Mount cookie banner globally and persist explicit consent state.
3. Add privacy/terms/cookie pages and route links.

### Chunk 3: Contract and transfer closure

1. Close DPA/AVV evidence for active providers first.
2. Close transfer-impact rows for all non-EEA or uncertain paths.
3. Update TOM matrix with verifiable provider references.

### Chunk 4: Gate closeout

1. Re-run docs and code verification suite.
2. Update release gate decision and owner signoff matrix.
3. Keep fail-closed posture until all mandatory criteria are `erfuellt`.

---

## Validation

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration`

---

## Exit criteria

1. All `P0` queue rows are `DONE` (or explicitly `BLOCKED` with owner and mitigation).
2. `AVV_62A_CHECKLIST.md` and `TRANSFER_IMPACT_REGISTER.md` have no unresolved active-path blockers.
3. Consent-dependent analytics behavior is technically verified in production runtime.
4. Owner signoff matrix is complete and release gate is updated with explicit `GO` or residual-risk-accepted `NO_GO`.
