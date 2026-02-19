# I18n Untranslated Coverage Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage`  
**Source request:** Find untranslated content in `/builder`, `/layers`, and missed surfaces; pragmatically translate into six supported languages (2026-02-17)

---

## Purpose

Queue-first execution layer for detecting and removing untranslated user-facing English strings in high-impact UI surfaces while enforcing six-language translation parity.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md`
- QA matrix: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/QA_MATRIX.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/INDEX.md`

---

## Status

Current kickoff:

1. `IUC-001` (`DONE`): baseline locale and hotspot inventory completed.
2. `IUC-002` (`DONE`): scoped deterministic untranslated-string scanner landed with explicit allowlist exceptions and reasoned audit output.
3. `IUC-003` (`DONE`): CI command + baseline threshold contract landed (`npm run i18n:audit` fails only on new scoped findings).
4. `IUC-004` (`DONE`): builder chrome navigation labels in `builder-layout`, `builder-header`, and `builder-logo-menu` migrated to translation keys with fallbacks.
5. `IUC-005` (`DONE`): builder docs/chat/publish panels migrated from hardcoded placeholders/confirms/alerts/status literals to translation lookups with fallback text.
6. `IUC-006` (`DONE`): builder-route and preview/file-explorer loading/error/empty states moved to translation-backed `ui.builder.*` lookups with safe fallback copy.
7. `IUC-007` (`DONE`): Stripe + org security runtime alerts/confirms/notification messaging and passkey CTA/empty/setup surfaces now use translation-backed lookups with fallbacks.
8. `IUC-008` (`DONE`): canonical six-locale namespace contract landed with deterministic seed validation (`scripts/i18n/check-locale-completeness.ts`) and updated translation contract docs.
9. `IUC-009` (`DONE`): seeded missing builder/layers/window-content key coverage via `seedBuilderI18nCoverage.ts`, `seedLayersI18nCoverage.ts`, and `seedPaymentsI18nCoverage.ts` with strict six-locale parity.
10. `IUC-010` (`DONE`): CI regression gate hardened with allowlist contract validation, location-insensitive baseline matching fallback, and dedicated `tests/unit/i18n` coverage; scoped baseline explicitly rebased so `npm run i18n:audit` blocks future additions without forcing legacy debt cleanup in this lane.
11. `IUC-011` (`DONE`): published six-locale QA matrix with persistence/fallback evidence and locale diff counts, plus unresolved debt ledger.
12. `IUC-012` (`DONE`): closed out queue/master/index sync with explicit do-not-regress ownership policy and rollout gate status.

Closeout state:

1. Queue execution is complete through Lane `F`.
2. Remaining rollout blockers are documented debt: `npm run i18n:audit` (`newFindings=13` in `text-editor-window`) and `npm run typecheck` errors in Slack OAuth/integrations files.

---

## Lane progress board

- [x] Lane A (`IUC-001`..`IUC-003`)
- [x] Lane B (`IUC-004`..`IUC-005`)
- [x] Lane C (`IUC-006`..`IUC-007`)
- [x] Lane D (`IUC-008`..`IUC-009`)
- [x] Lane E (`IUC-010`)
- [x] Lane F (`IUC-011`..`IUC-012`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
- Run core quality checks: `npm run typecheck && npm run lint`
- Run i18n audit (baseline threshold): `npm run i18n:audit`
- Run six-locale seed parity check: `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja`
