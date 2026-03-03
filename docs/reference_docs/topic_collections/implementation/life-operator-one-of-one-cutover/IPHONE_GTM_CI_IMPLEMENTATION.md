# iPhone GTM CI Implementation

**Status:** Active contract (`LOC-037`)  
**Last updated:** 2026-03-02  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover`

---

## Objective

Ship a deterministic go-to-market delivery path for the iPhone operator app that supports the founder demo outcome:

1. live networking conversation capture from iPhone + optional Meta glasses ingress,
2. concierge extraction of person/context/intent,
3. guarded appointment creation flow with explicit confirmation and trust evidence,
4. parity behavior between iPhone app and mother-repo web chat surfaces.

---

## Blocker policy

`expo run:ios` is blocked on unsupported Node versions.

1. Supported runtime for Expo local commands is Node `>=20` and `<24`.
2. `apps/operator-mobile/.nvmrc` is pinned to Node `22`.
3. `apps/operator-mobile/scripts/require-supported-node.mjs` fails fast with remediation steps when runtime is out of contract.
4. `apps/operator-mobile` scripts (`start`, `ios`, `android`, `web`) enforce this guard.

---

## iPhone preflight contract

Command:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
npm run ci:ios:preflight
```

Deterministic checks:

1. mobile type safety (`npm run typecheck`),
2. App Store icon readiness (`npm run icons:check`):
   - `assets/icon.png` exists and is `1024x1024`,
   - `ios/L4yercak3/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` exists and is `1024x1024`,
   - both icons contain no alpha channel.

---

## CI implementation

Workflow: `/Users/foundbrand_001/Development/vc83-com/.github/workflows/operator-mobile-ios-preflight.yml`

Trigger contract:

1. `pull_request` changes under `apps/operator-mobile/**`,
2. `push` to `main` affecting `apps/operator-mobile/**`,
3. manual `workflow_dispatch`.

Execution contract:

1. Use Node from `apps/operator-mobile/.nvmrc` (Node 22),
2. install app dependencies with `npm ci`,
3. execute `npm run ci:ios:preflight`.

---

## Mother-repo parity gates for live demo

iPhone preflight CI is necessary but not sufficient for the founder demo.

Before go-to-market demo signoff, keep these lane-`H` gates green:

1. `LOC-032`: shared AV/mobile blockers cleared (`V-TYPE`, `V-MOBILE-TYPE`, `V-UNIT`, `V-E2E-DESKTOP`),
2. `LOC-033`: web/iPhone metadata parity (`commandPolicy`, `transportRuntime`, `avObservability`),
3. `LOC-035`: final parity runbook evidence with external done-gates `AVR-012` and `FOG2-016` (both are already `DONE`).

---

## Release execution

After preflight + parity gates:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
npm run build:ios:production
npm run submit:ios:production
```

One-shot path:

```bash
npm run deploy:testflight
```

This implementation works with existing TestFlight runbook:
`/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/DEPLOY_TESTFLIGHT.md`

---

## LOC-044 Reality Sanity Ledger (2026-03-02)

Fail-closed stage status: `GO` for `LOC-044` contract-alignment gates; rehearsal acceptance remains governed by `LOC-045` verify results.

| Contract signal | File-level evidence | Status | Owner | Unblock date |
|---|---|---|---|---|
| iPhone runtime/toolchain preflight gate | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile` (`npm run ci:ios:preflight`) | `GO` | lane `I` release ops | 2026-03-02 |
| Recommender specialist IDs are registered in kickoff specialist hints | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-recommender.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/onboarding-kickoff-contract.ts` | `GO` (kickoff hints now include `medical_compliance_reviewer` from shared specialist-role contract) | lane `K` `LOC-045` engineering | 2026-03-02 |
| Coverage blueprint IDs are present and stable | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx` | `GO` | lane `K` product/runtime | 2026-03-02 |
| Deterministic recommender-ID -> blueprint-ID join contract exists | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-recommender.ts`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents-window.tsx` | `GO` (shared `SPECIALIST_ROLE_CONTRACTS` now anchors role-to-blueprint mapping and specialist coverage derivation) | lane `K` `LOC-045` engineering | 2026-03-02 |
| Concierge runtime hook contract exists with preview-first + explicit-confirm guardrails | `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/bookingTool.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `GO` | lane `H`/`K` runtime | 2026-03-02 |
| Convex + CRM + calendar + outbound invite channel readiness is captured in deterministic preflight evidence | `/Users/foundbrand_001/Development/vc83-com/tests/e2e/utils/fnd-007-rehearsal.ts`; `/Users/foundbrand_001/Development/vc83-com/tmp/reports/fnd-007/latest.json`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/DEMO_READINESS_SCORECARD.md` | `GO` (artifact now includes `preflight_status.runtimeReadiness.{convexConnected, crmLookupCreateConfigured, calendarReadinessConfigured, outboundInviteChannelReady}` fields) | demo-ops owner (`LOC-045`) | 2026-03-02 |
| iOS/TestFlight profile and release path are documented | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/DEPLOY_TESTFLIGHT.md` | `GO` | lane `I` release ops | 2026-03-02 |

`LOC-045` closed prior `LOC-044` contract-alignment `NO_GO` rows; remaining lane-`K` blocker is rehearsal checkpoint failure (`FND-007-C3`) captured in `tmp/reports/fnd-007/latest.json` and founder aggregate `tmp/reports/founder-rehearsal/latest.json`.
