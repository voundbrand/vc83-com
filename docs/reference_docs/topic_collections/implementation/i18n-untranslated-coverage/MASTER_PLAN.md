# I18n Untranslated Coverage Master Plan

**Date:** 2026-02-25  
**Scope:** Enforce namespaced translation CI guard and burn down newly introduced untranslated literals in `builder`, `layers`, and `window-content`.

---

## Mission

1. Make i18n guard checks first-class CI gates.
2. Eliminate current baseline delta (`newFindings=1199`) without broad allowlist expansion.
3. Preserve six-locale parity (`en,de,pl,es,fr,ja`) for every new translation key.
4. Keep remediation deterministic via queue lanes and explicit verification commands.

---

## Current state in this codebase (2026-02-25)

1. Guard command exists: `npm run i18n:audit` (baseline-compare scanner with fail-on-new semantics).
2. Namespace/locale checker exists: `scripts/i18n/check-locale-completeness.ts`.
3. New CI workflow now exists: `.github/workflows/i18n-guard.yml` and runs both checks.
4. Fresh guard run results:
   - `i18n:audit`: fail with `newFindings=1199`
   - Scope split: `builder=26`, `layers=2`, `window-content=1171`
   - Report totals: `files=425`, `findings=7408`, `allowlisted=4`
5. Namespace parity check passes:
   - `filesScanned=109`
   - `keysInRequiredNamespaces=337`
   - locale parity OK for `en,de,pl,es,fr,ja`

---

## Gap map (delta hotspots)

Top new-finding files:

1. `src/components/window-content/agents/agent-trust-cockpit.tsx` (`197`)
2. `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx` (`90`)
3. `src/components/window-content/agents-window.tsx` (`75`)
4. `src/components/window-content/web-publishing-window/webchat-deployment-tab.tsx` (`61`)
5. `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx` (`46`)
6. `src/components/window-content/super-admin-organizations-window/platform-economics-tab.tsx` (`46`)

Cluster totals:

1. `agents` + `agents-window`: `407`
2. `super-admin-organizations-window`: `290`
3. `integrations-window`: `179`
4. `ai-chat-window`: `84`
5. `web-publishing-window`: `80`
6. `builder + layers`: `28`

---

## Strategy

1. Start with smallest/high-certainty lane (`builder/layers`) to reduce delta quickly and validate workflow behavior.
2. Burn down window-content by concentration clusters to maximize finding reduction per PR.
3. Add translation seed updates only after UI migration rows are complete.
4. Keep `i18n:audit` as the authoritative gate and avoid baseline rebases during remediation wave.

---

## Phase-to-lane mapping

| Phase | Objective | Queue lanes | Queue tasks |
|---|---|---|---|
| 7A | CI wiring + snapshot | `E`, `A` | `IUC-013`, `IUC-014` |
| 7B | Builder/layers regression cleanup | `B` | `IUC-015` |
| 7C | Window-content hotspot cleanup | `C` | `IUC-016`, `IUC-017`, `IUC-018` |
| 7D | Seed + namespace parity follow-through | `D` | `IUC-019` |
| 7E | Guard-to-green confirmation | `E` | `IUC-020` |
| 7F | Docs/ledger closeout | `F` | `IUC-021` |

---

## Acceptance criteria

1. `i18n-guard` workflow is active in GitHub Actions for relevant paths.
2. `npm run i18n:audit` reports `newFindings=0` relative to current baseline policy.
3. `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,de,pl,es,fr,ja` passes after remediation.
4. No broad allowlist expansion is used to hide user-facing untranslated literals.
5. Queue/status docs are synchronized (`TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, `QA_MATRIX.md`).

---

## Risks and mitigations

1. **High volume concentrated in window-content may cause long-lived branches**  
   Mitigation: use cluster-based rows (`agents`, `super-admin`, `integrations/web-publishing/ai-chat/store`) with small deterministic chunks.
2. **Key creation without locale parity**  
   Mitigation: lane `D` enforces seed updates with mandatory six-locale verification command.
3. **False positives or noisy literals**  
   Mitigation: keep allowlist contract explicit and review-only; do not add broad regex exemptions.
4. **CI friction while delta is non-zero**  
   Mitigation: keep lanes prioritized by highest finding concentration and validate reduction after each row.

---

## Guard contract (unchanged)

1. `npm run i18n:audit` writes `reports/current.json` and fails on findings not present in `reports/baseline.json`.
2. Baseline matching uses exact fingerprint plus location-insensitive stable fingerprint.
3. Allowlist entries must be explicit (anchored file pattern, reason, no duplicates).
4. Baseline rebase remains a policy action, not a default remediation step.

---

## Immediate execution order

1. `IUC-015` (`READY`): builder/layers regression cleanup.
2. `IUC-016` and `IUC-017` (`PENDING` -> `READY`): agent + super-admin hotspot clusters.
3. `IUC-018`: integrations/web-publishing/ai-chat/store/org-owner cluster.
4. `IUC-019`: seed parity updates.
5. `IUC-020`: run guard-to-green verification.
6. `IUC-021`: docs and debt-ledger closeout.
