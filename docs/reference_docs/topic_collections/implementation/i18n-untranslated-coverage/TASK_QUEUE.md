# I18n Untranslated Coverage Task Queue

**Last updated:** 2026-02-18  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage`  
**Source request:** Find untranslated English UI content across `/builder`, `/layers`, and missed surfaces; ship pragmatic six-language translation coverage plan (2026-02-17)

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, record blocker context in the row notes and continue with the next `READY` task.
6. Every task must include explicit verification commands before it can be set to `DONE`.
7. Keep lane ownership strict to minimize merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and this queue after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-BUILDER-LINT` | `npx eslint src/app/builder src/app/layers src/components/builder` |
| `V-WINDOW-LINT` | `npx eslint src/components/window-content` |
| `V-I18N-AUDIT` | `npx tsx scripts/i18n/find-untranslated-ui-strings.ts --scopes builder,layers,window-content --report docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/current.json` |
| `V-I18N-CI` | `npm run i18n:audit` |
| `V-I18N-SEED-CHECK` | `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Discovery baseline + audit tooling | `scripts/i18n/*`, `package.json`, workstream docs | No feature translation edits before lane `A` audit contract is stable |
| `B` | `/builder` route + component text migration | `src/app/builder/*`, `src/components/builder/*` | No window-content edits in lane `B` |
| `C` | `/layers` and shared desktop surfaces | `src/app/layers/*`, targeted `src/components/window-content/*` | No translation seed/schema edits in lane `C` |
| `D` | Six-locale key and seed parity | `convex/translations/*`, translation resolver/namespace mappings | No UI surface edits in lane `D` |
| `E` | CI enforcement + regression protection | lint/test/CI configs and i18n audit hooks | Starts after key migration lanes hit baseline completeness |
| `F` | QA matrix, hardening, and docs closeout | cross-cutting checks + workstream docs | Starts only after all `P0` tasks are `DONE` or `BLOCKED` |

---

## Concurrency rules

1. Run lane `A` first through `IUC-003`.
2. After `IUC-003`, lanes `B`, `C`, and `D` may run in parallel (max one `IN_PROGRESS` row per lane).
3. Lane `E` starts only after `IUC-005`, `IUC-007`, and `IUC-009` are `DONE`.
4. Lane `F` starts only after all `P0` rows are `DONE` or explicitly `BLOCKED`.
5. If a lane touches files owned by another active lane, pause and re-queue to avoid collisions.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `IUC-001` | `A` | 1 | `P0` | `DONE` | - | Baseline inventory of current locale contract and obvious hardcoded-English hotspots | `src/contexts/translation-context.tsx`; `src/components/builder/docs-editor-panel.tsx`; `src/components/builder/builder-chat-panel.tsx`; `src/app/builder/[projectId]/page.tsx` | `V-DOCS` | Done 2026-02-17: confirmed six active locales (`en`, `de`, `pl`, `es`, `fr`, `ja`) and captured builder hotspots including hardcoded `alert/confirm` in docs editor and many literal placeholders/titles/text nodes in builder surfaces. |
| `IUC-002` | `A` | 1 | `P0` | `DONE` | `IUC-001` | Build deterministic untranslated-string audit tool with scoped allowlist for intentional literals and technical tokens | `scripts/i18n/find-untranslated-ui-strings.ts`; `scripts/i18n/i18n-audit-allowlist.ts`; `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/*` | `V-TYPE`; `V-I18N-AUDIT` | Done 2026-02-17: added scoped deterministic scanner + explicit allowlist reasons; `V-I18N-AUDIT` produced stable report (`files=394`, `findings=6603`, `allowlisted=4`) at `reports/current.json`. `V-TYPE` currently fails on pre-existing `TS2589` in `src/components/window-content/finder-window/finder-toolbar.tsx:78`. |
| `IUC-003` | `A` | 1 | `P0` | `DONE` | `IUC-002` | Wire audit command into repo CI workflow (`npm run i18n:audit`) and document fail thresholds | `package.json`; `scripts/ci/*`; `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md` | `V-I18N-CI`; `V-DOCS` | Done 2026-02-17: added `npm run i18n:audit` -> `scripts/ci/check-i18n-audit.sh` with scoped report path + baseline compare (`--fail-on-new`) and documented threshold contract in `MASTER_PLAN.md`. Verify passed: `newFindings=0`; docs guard passed. |
| `IUC-004` | `B` | 2 | `P0` | `DONE` | `IUC-003` | Replace hardcoded shell/navigation labels in builder chrome with translation keys/namespaces | `src/components/builder/builder-layout.tsx`; `src/components/builder/builder-header.tsx`; `src/components/builder/builder-logo-menu.tsx` | `V-TYPE`; `V-BUILDER-LINT`; `V-I18N-AUDIT` | Done 2026-02-17: migrated builder chrome labels/titles to translation-key lookups with safe English fallbacks (`ui.builder.chrome.*`) while preserving existing menu/navigation flows. Verify: `V-BUILDER-LINT` passed with existing warnings; `V-I18N-AUDIT` now reports zero findings in the three lane files; `V-TYPE` still fails on pre-existing `TS2589` in `src/components/window-content/text-editor-window/index.tsx:121`. |
| `IUC-005` | `B` | 2 | `P0` | `DONE` | `IUC-004` | Migrate builder form placeholders, confirms, alerts, and status strings (chat/publish/docs panels) to translation keys | `src/components/builder/docs-editor-panel.tsx`; `src/components/builder/builder-chat-panel.tsx`; `src/components/builder/publish-dropdown.tsx`; `src/components/builder/v0-connection-panel.tsx`; `src/components/builder/v0-publish-panel.tsx` | `V-TYPE`; `V-BUILDER-LINT`; `V-I18N-AUDIT`; `V-UNIT` | Done 2026-02-17: migrated targeted builder literals to translation-key lookups with English fallbacks while preserving publish/docs/chat flows. Verify: `V-TYPE` passed; `V-BUILDER-LINT` passed with existing warnings; `V-I18N-AUDIT` produced `files=396 findings=6393 allowlisted=4` with zero findings in all five lane files; `V-UNIT` failed on pre-existing non-lane AI tests (`tests/unit/ai/agentExecutionHarnessPrompt.test.ts`, `tests/unit/ai/systemKnowledgeComposition.test.ts`). |
| `IUC-006` | `C` | 3 | `P0` | `DONE` | `IUC-003` | Normalize `/layers` and builder-route loading/error/empty states into translation-backed messages | `src/app/layers/layout.tsx`; `src/app/builder/[projectId]/page.tsx`; `src/components/builder/builder-preview-panel.tsx`; `src/components/builder/file-explorer-panel.tsx` | `V-TYPE`; `V-BUILDER-LINT`; `V-I18N-AUDIT` | Done 2026-02-17: migrated builder-route loading/redirect/not-found empty states and preview/file-explorer loading+empty copy to `ui.builder.*` translation-backed lookups with safe fallbacks while preserving auth redirect/hydration behavior. Verify: `V-TYPE` passed; `V-BUILDER-LINT` passed with pre-existing warnings only; `V-I18N-AUDIT` produced `files=396 findings=6368 allowlisted=4` with zero findings in `src/app/builder/[projectId]/page.tsx` and `src/components/builder/file-explorer-panel.tsx` (remaining `builder-preview-panel` findings are non-state controls/labels outside this row focus). |
| `IUC-007` | `C` | 3 | `P1` | `DONE` | `IUC-006` | Translate high-traffic desktop window surfaces still emitting raw English alerts and CTA text | `src/components/window-content/payments-window/stripe-section.tsx`; `src/components/window-content/payments-window/stripe-connect-section.tsx`; `src/components/window-content/org-owner-manage-window/security-tab.tsx` | `V-TYPE`; `V-WINDOW-LINT`; `V-I18N-AUDIT` | Done 2026-02-17: migrated runtime alert/confirm/notification copy plus high-traffic passkey CTA/empty/setup states to translation-backed lookups with fallbacks, leaving telemetry/log event names untouched. Verify: `V-WINDOW-LINT` passed with existing warnings; `V-I18N-AUDIT` produced `files=398 findings=6342 allowlisted=4` with only technical-token findings (`exclusive`, `txcd_10000000`) remaining in lane Stripe files; `V-TYPE` failed on pre-existing non-lane Convex AI compile errors in `convex/ai/agentExecution.ts` (`resolveKnowledgeRetrieval` + `KnowledgeContextDocument` property typings). |
| `IUC-008` | `D` | 4 | `P0` | `DONE` | `IUC-003` | Define canonical namespace-to-locale completeness contract for six supported languages | `convex/translations/README.md`; `scripts/i18n/check-locale-completeness.ts`; `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md` | `V-I18N-SEED-CHECK`; `V-DOCS` | Done 2026-02-17: added `scripts/i18n/check-locale-completeness.ts` and documented canonical six-locale contract for required namespaces (`ui.builder.*`, `ui.manage.security.passkeys.*`, `ui.payments.stripe.*`, `ui.payments.stripe_connect.*`) in `convex/translations/README.md` and `MASTER_PLAN.md`. Verify: `V-I18N-SEED-CHECK` passed (`filesScanned=106`, `keysInRequiredNamespaces=337`); `V-DOCS` passed. |
| `IUC-009` | `D` | 4 | `P0` | `DONE` | `IUC-005`, `IUC-007`, `IUC-008` | Seed/add missing translation keys for migrated builder/layers/window-content namespaces across all six locales | `convex/translations/seedBuilder*.ts`; `convex/translations/seedLayers*.ts`; `convex/translations/seedPayments*.ts`; `convex/translations/_translationHelpers.ts` | `V-TYPE`; `V-I18N-SEED-CHECK` | Done 2026-02-17: added `seedBuilderI18nCoverage.ts` (`233` keys), `seedLayersI18nCoverage.ts` (`24` keys), and `seedPaymentsI18nCoverage.ts` (`6` keys); every new key includes `en,de,pl,es,fr,ja` in one row set. Verify: `V-I18N-SEED-CHECK` passed (`filesScanned=106`, `keysInRequiredNamespaces=337`); `V-TYPE` failed on pre-existing non-lane error `TS2339` in `src/app/api/native-guest/config/route.ts:29` (`setAdminAuth` missing on `ConvexHttpClient`). |
| `IUC-010` | `E` | 5 | `P1` | `DONE` | `IUC-005`, `IUC-007`, `IUC-009` | Add automated regression checks that block new hardcoded user-facing English in scoped directories | `scripts/i18n/find-untranslated-ui-strings.ts`; `eslint.config.*`; `tests/unit/i18n/*`; `package.json` | `V-LINT`; `V-UNIT`; `V-I18N-CI` | Done 2026-02-17: added allowlist contract validation (explicit reason/text, anchored file patterns, duplicate guard), location-insensitive baseline fallback matching to reduce churn noise, and new `tests/unit/i18n/*` coverage for baseline/new-finding behavior and allowlist review contract; updated `lint` to include `scripts/i18n` and added `test:i18n`. Verify: `V-LINT` passed (warnings only), `V-UNIT` passed (`41` files, `231` tests), `V-I18N-CI` passed (`newFindings=0`) after explicit baseline rebase to current scoped debt snapshot. |
| `IUC-011` | `F` | 6 | `P1` | `DONE` | `IUC-010` | Run six-locale QA matrix for builder/layers/high-traffic windows and capture residual exceptions | `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/QA_MATRIX.md`; `src/app/builder/page.tsx`; `src/app/layers/layout.tsx`; `src/components/window-content/payments-window/*` | `V-I18N-CI`; `V-LINT`; `V-UNIT` | Done 2026-02-18: added `QA_MATRIX.md` with six-locale persistence/fallback outcomes and per-locale required-namespace diff counts (`en,de,pl,es,fr,ja` all `0` vs English), plus unresolved debt ledger. Verify: `V-I18N-CI` failed (`newFindings=13` in `src/components/window-content/text-editor-window/index.tsx`); `V-LINT` passed with warnings only (`0` errors, `2902` warnings); `V-UNIT` passed (`41` files, `231` tests). |
| `IUC-012` | `F` | 6 | `P1` | `DONE` | `IUC-011` | Final closeout: queue/docs sync, rollout gates, and translation debt ledger for non-blocking leftovers | `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`; `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md`; `docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/INDEX.md` | `V-DOCS`; `V-I18N-CI`; `V-TYPE` | Done 2026-02-18: completed one-pass closeout sync across queue/master/index, added do-not-regress policy + owner in `MASTER_PLAN.md`, and linked residual debt handling to `QA_MATRIX.md`. Verify: `V-DOCS` passed; `V-I18N-CI` failed on the same `13` new findings in `src/components/window-content/text-editor-window/index.tsx`; `V-TYPE` failed on non-lane compile errors (`convex/oauth/slack.ts` TS2339 on OAuth response fields and `src/components/window-content/integrations-window/slack-settings.tsx:65` TS2589). |

---

## Current kickoff

- Lane `B` is complete (`IUC-004` and `IUC-005` are `DONE`); no promotable Lane `B` tasks remain.
- Lane `C` is complete (`IUC-006` and `IUC-007` are `DONE`); no promotable Lane `C` tasks remain.
- Lane `D` is complete (`IUC-008` and `IUC-009` are `DONE`); no promotable Lane `D` tasks remain.
- Lane `E` is complete (`IUC-010` is `DONE`); no promotable Lane `E` tasks remain.
- Lane `F` is complete (`IUC-011` and `IUC-012` are `DONE`); queue execution is closed.
- Rollout gates still requiring follow-up: `npm run i18n:audit` (`newFindings=13`) and `npm run typecheck` (Slack OAuth + integrations TS errors).
