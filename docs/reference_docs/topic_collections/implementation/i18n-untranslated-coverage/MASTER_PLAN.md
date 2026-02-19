# I18n Untranslated Coverage Master Plan

**Date:** 2026-02-18  
**Scope:** Find and eliminate untranslated user-facing English strings across `/builder`, `/layers`, and adjacent desktop windows while enforcing six-language parity (`en`, `de`, `pl`, `es`, `fr`, `ja`) through CI.

---

## Mission

Ship a pragmatic localization hardening program that:

1. detects untranslated UI literals deterministically,
2. migrates high-traffic surfaces to translation keys,
3. guarantees key coverage in all six supported locales,
4. prevents regressions through docs/planning CI-aligned gates.

---

## Current state in this codebase

1. Locale contract is six languages in runtime context (`en`, `de`, `pl`, `es`, `fr`, `ja`) via `src/contexts/translation-context.tsx`.
2. Translation architecture is in place (`useNamespaceTranslations`, seeded translations under `convex/translations/*`), but usage is mixed.
3. Lane `B` and lane `C` migrations have moved targeted builder/layers/window-content hotspots to translation-backed copy with safe fallbacks.
4. Lane `D` now defines deterministic six-locale completeness enforcement via `scripts/i18n/check-locale-completeness.ts`.
5. Missing seed coverage for migrated namespaces has been filled with dedicated lane seed files for builder, desktop security passkeys, and Stripe refresh/OAuth copy.
6. Lane `F` execution is complete; remaining risk is unresolved rollout debt (`i18n:audit` new findings and non-lane `typecheck` errors).

---

## Option set

| Option | Description | Pros | Cons |
|---|---|---|---|
| `A` (recommended) | Add deterministic i18n audit tooling, then migrate by lanes (builder, layers/window-content, seeds) with CI gates | Controlled rollout, measurable progress, low merge risk, protects against regressions | Requires initial tooling investment before broad string cleanup |
| `B` | Run one large manual replacement sweep across all UI files | Fast first pass in small teams | High regression risk, low determinism, likely to miss edge surfaces |
| `C` | Focus only on builder UI and defer other surfaces | Smaller short-term scope | Leaves user-visible untranslated strings in layers/window-content and weakens locale trust |

### Recommendation

Adopt **Option A**. It is the best fit for pragmatic execution with auditable progress and durable CI guardrails.

---

## Strategy pillars

1. **Deterministic detection first:** establish one reliable audit source of truth before broad migration work.
2. **Lane-based migration:** isolate builder, layers/window-content, and translation seed changes to reduce conflicts.
3. **Six-locale completeness:** every new key lands with `en`, `de`, `pl`, `es`, `fr`, `ja` in one change set.
4. **Pragmatic exceptions:** keep explicit allowlists only for non-user-facing literals and technical tokens.
5. **CI-backed sustainability:** block new untranslated debt after baseline.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| Phase 1 | Baseline + audit tooling | `A` | `IUC-001`..`IUC-003` |
| Phase 2 | Builder migration | `B` | `IUC-004`..`IUC-005` |
| Phase 3 | Layers and desktop hotspot migration | `C` | `IUC-006`..`IUC-007` |
| Phase 4 | Locale completeness contract + seeding | `D` | `IUC-008`..`IUC-009` |
| Phase 5 | CI/regression enforcement | `E` | `IUC-010` |
| Phase 6 | QA matrix + closeout | `F` | `IUC-011`..`IUC-012` |

---

## Delivery waves

1. **Wave 0:** lock deterministic audit and CI command contract (`i18n:audit`).
2. **Wave 1:** remove builder untranslated literals and wire missing namespaces.
3. **Wave 2:** clear `/layers` and high-traffic window-content user-facing literals.
4. **Wave 3:** enforce six-locale seed completeness and automate regression blocking.
5. **Wave 4:** run locale QA matrix and publish residual debt ledger.

---

## CI threshold contract

1. `npm run i18n:audit` runs the scoped audit only on `builder,layers,window-content`.
2. Audit output is always written to `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/current.json`.
3. CI compares `current.json` findings against `reports/baseline.json` using deterministic exact fingerprints (`scope`, `file`, `line`, `column`, `kind`, context, `text`) plus a location-insensitive fallback (`scope`, `file`, `kind`, context, `text`) to avoid false positives from line drift.
4. Initial gate behavior is pragmatic: fail only on findings not present in the baseline snapshot (new untranslated additions), not on existing debt; baseline rebases must be explicit and reviewed.
5. Allowlist exceptions remain explicit in `scripts/i18n/i18n-audit-allowlist.ts` and require reason comments per entry.

---

## Locale completeness contract

1. `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja` is the required seed parity gate.
2. Required namespace coverage for lane migrations is: `ui.builder.*`, `ui.manage.security.passkeys.*`, `ui.payments.stripe.*`, and `ui.payments.stripe_connect.*`.
3. The checker scans `convex/translations/seed*.ts` and validates locale parity per key for required namespaces.
4. The check fails if a required namespace has zero keys or any required key is missing one or more of the six locales.

---

## Acceptance criteria

1. Scoped i18n audit command exists and is deterministic for `builder`, `layers`, and `window-content`.
2. No user-facing hardcoded English literals remain in targeted scoped paths except explicit allowlist entries.
3. New translation keys introduced by migration have values in all six locales (`en`, `de`, `pl`, `es`, `fr`, `ja`).
4. Builder and layers loading/error/empty state copy is translation-backed.
5. High-traffic desktop alert/confirm runtime messages are translation-backed.
6. CI blocks newly introduced untranslated literals in scoped paths (`npm run i18n:audit`).
7. Queue verification commands pass for completed rows, including `npm run docs:guard`.

---

## Non-goals

1. No full rewrite of translation architecture or Convex object model.
2. No broad copywriting refresh for existing translated text quality outside missing-coverage scope.
3. No migration of internal developer logs that are not user-facing UI strings.

---

## Risks and mitigations

1. **False positives from scanner**  
Mitigation: explicit allowlist with justification comments and scoped matching.

2. **Partial-locale key additions**  
Mitigation: enforce six-locale completeness checks in seed validation scripts.

3. **UI regressions during string replacement**  
Mitigation: lane ownership, targeted lint/type checks, and unit test verification on each row.

4. **CI friction from legacy debt**  
Mitigation: start by failing only on new additions after baseline snapshot, then ratchet down.

---

## Success metrics

1. Untranslated-string count in scoped paths trends toward zero by wave.
2. Six-locale completeness check passes for all migrated namespaces.
3. `i18n:audit` becomes stable in CI with no flaky results.
4. Post-migration bug reports related to missing translations remain below baseline.

---

## Lane F closeout outcomes (2026-02-18)

1. Six-locale QA matrix is published at `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/QA_MATRIX.md`.
2. Required-namespace locale diff checks versus English are `0` for all six locales (`en`, `de`, `pl`, `es`, `fr`, `ja`).
3. Closeout verification outcomes:
   - `npm run docs:guard`: pass
   - `npm run i18n:audit`: fail (`newFindings=13` in `src/components/window-content/text-editor-window/index.tsx`)
   - `npm run typecheck`: fail (`convex/oauth/slack.ts` TS2339 OAuth response fields; `src/components/window-content/integrations-window/slack-settings.tsx:65` TS2589)
4. Current scoped debt snapshot from audit report is `netFindings=6406` (`builder=227`, `layers=98`, `window-content=6081`).

---

## Do-not-regress policy and ownership

1. **Owner:** Frontend Platform maintainers (primary owners of `scripts/i18n/*` and this workstream's `reports/baseline.json`).
2. Any baseline rebase (`reports/baseline.json`) must include explicit reviewer sign-off and a short note with old/new finding counts.
3. Any PR touching `src/app/builder`, `src/app/layers`, or `src/components/window-content` must run `npm run i18n:audit`; merging with `newFindings>0` is disallowed unless explicitly approved as a debt-rebase change.
4. Allowlist updates in `scripts/i18n/i18n-audit-allowlist.ts` require explicit reason strings and file-scoped patterns; broad wildcards are not allowed.
5. Weekly debt triage starts from `QA_MATRIX.md` unresolved ledger, with `text-editor-window` new findings as the first burn-down target.

---

## Status snapshot

- Baseline discovery is complete (`IUC-001` `DONE`).
- Deterministic scoped audit tooling is complete (`IUC-002` `DONE`).
- CI-threshold wiring is complete (`IUC-003` `DONE`) with baseline snapshot at `reports/baseline.json`.
- Builder chrome shell/navigation literals are migrated (`IUC-004` `DONE`).
- Builder docs/chat/publish placeholder/confirm/alert/status literals are migrated (`IUC-005` `DONE`); Lane B now has no remaining promotable tasks.
- Builder-route plus preview/file-explorer loading/error/empty states are translation-backed (`IUC-006` `DONE`) with verify checks passing and no regressions in auth redirect/hydration behavior.
- Stripe/org security runtime alerts+CTA/empty states are translation-backed (`IUC-007` `DONE`) and Lane C now has no promotable tasks.
- Locale completeness contract/checker landed (`IUC-008` `DONE`) with canonical contract documented in `convex/translations/README.md`.
- Six-locale seed parity for migrated namespaces landed (`IUC-009` `DONE`) via `seedBuilderI18nCoverage.ts`, `seedLayersI18nCoverage.ts`, and `seedPaymentsI18nCoverage.ts`.
- CI/regression hardening landed (`IUC-010` `DONE`) with allowlist contract enforcement, unit tests under `tests/unit/i18n`, and explicit baseline rebase for pragmatic debt handling.
- Six-locale QA matrix and residual debt capture are complete (`IUC-011` `DONE`) via `QA_MATRIX.md`.
- Queue/docs closeout is complete (`IUC-012` `DONE`) with explicit do-not-regress ownership policy.
- Rollout remains partially blocked pending cleanup of `i18n:audit` (`newFindings=13`) and non-lane `typecheck` failures documented in queue notes.
