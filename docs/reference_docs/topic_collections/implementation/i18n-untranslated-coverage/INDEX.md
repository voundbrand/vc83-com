# I18n Untranslated Coverage Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage`  
**Source request:** Enforce namespaced translation CI guard, run it, and plan remediation for missing translated app surfaces (2026-02-25)

---

## Purpose

Queue-first execution hub for i18n regression enforcement and translation debt burn-down in builder/layers/window-content surfaces.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/MASTER_PLAN.md`
- QA matrix: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/QA_MATRIX.md`
- Current audit report: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/current.json`
- Baseline audit report: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/baseline.json`

---

## Latest status (2026-02-25)

1. Added GitHub Actions enforcement workflow: `.github/workflows/i18n-guard.yml` (`IUC-013` `DONE`).
2. Ran guard commands and captured fresh snapshot (`IUC-014` `DONE`):
   - `npm run i18n:audit`: fail (`newFindings=1199`, `files=425`, `findings=7408`, `allowlisted=4`)
   - Scope totals: `builder=252`, `layers=100`, `window-content=7056`
   - Delta vs baseline: `builder=26`, `layers=2`, `window-content=1171`
   - `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja`: pass (`filesScanned=109`, `keysInRequiredNamespaces=337`)
3. Reopened remediation wave queued as `IUC-015`..`IUC-021`.
4. Next promotable row: `IUC-015` (builder/layers regression cleanup).

---

## Hotspot prioritization (new findings)

1. `src/components/window-content/agents/agent-trust-cockpit.tsx` (`197`)
2. `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx` (`90`)
3. `src/components/window-content/agents-window.tsx` (`75`)
4. `src/components/window-content/web-publishing-window/webchat-deployment-tab.tsx` (`61`)
5. `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx` (`46`)
6. `src/components/window-content/super-admin-organizations-window/platform-economics-tab.tsx` (`46`)
7. `src/components/window-content/integrations-window/ai-connections-settings.tsx` (`41`)
8. `src/components/window-content/integrations-window/personal-operator-setup.tsx` (`40`)

Cluster totals:

- `window-content/agents` + `agents-window.tsx`: `407`
- `window-content/super-admin-organizations-window`: `290`
- `window-content/integrations-window`: `179`
- `window-content/ai-chat-window`: `84`
- `window-content/web-publishing-window`: `80`

---

## Lane progress board

- [x] Lane A (historical baseline + tooling `IUC-001`..`IUC-003`, refresh `IUC-014`)
- [ ] Lane B (`IUC-015`)
- [ ] Lane C (`IUC-016`..`IUC-018`)
- [ ] Lane D (`IUC-019`)
- [x] Lane E (workflow wiring `IUC-013`)
- [ ] Lane E (guard-to-green `IUC-020`)
- [ ] Lane F (`IUC-021`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Run i18n regression guard: `npm run i18n:audit`
- Run six-locale namespace parity check: `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja`
- Open queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/TASK_QUEUE.md`
