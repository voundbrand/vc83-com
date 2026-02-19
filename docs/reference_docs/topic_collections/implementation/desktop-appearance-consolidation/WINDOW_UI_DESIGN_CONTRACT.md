# Window UI Design Contract (Desktop Shell)

**Date:** 2026-02-18  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`

---

## Purpose

Define a strict, reviewable UI contract for all desktop-window surfaces so design expectations are explicit, testable, and consistent across apps (including Brain).

This document is normative for:

- `src/components/window-content/**`
- `src/components/floating-window.tsx`
- desktop launcher/menu shell surfaces (`src/app/page.tsx`, `src/components/windows-menu.tsx`, `src/components/taskbar/**`)

If this document conflicts with older notes, this contract wins.

---

## Non-negotiable rules

1. Appearance modes are only `dark` and `sepia`.
2. Window interiors must use the shared interior primitives from:
   `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/shared/interior-primitives.tsx`
3. Window/document surfaces must use the canonical document/shell token classes and vars from:
   `/Users/foundbrand_001/Development/vc83-com/src/app/globals.css`
4. No emoji glyphs in desktop chrome, launcher/menu surfaces, or window-level controls.
5. New/reworked windows must preserve keyboard focus visibility and reduced-motion behavior.
6. Translation keys must resolve through namespaces; raw keys in UI are a regression.

---

## PostHog cue integration (required subset)

Reference source:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md`

These cues are required where applicable to desktop shell and window UX:

1. Navigation shell remains top, compact, and link-first (no Start-button regression path).
2. Menus use one calm surface treatment with icon-led rows and chevrons for submenu affordances.
3. Primary working/document surfaces remain near-white (or sepia-tinted equivalent) for readability.
4. Window open/close motion remains center-origin, short-duration, and reduced-motion safe.
5. Desktop/menu/navigation chrome uses custom icon components (no emoji fallback in active UX paths).

Scope note:

- PostHog cues are behavior/surface cues, not brand-copy cues.
- Do not import PostHog brand styling/content beyond these structural interaction patterns.

---

## Required implementation patterns

Use these primitives/classes as defaults:

- Root/layout: `InteriorRoot`, `InteriorHeader`, `InteriorTitle`, `InteriorSubtitle`
- Segments/tabs: `InteriorTabRow`, `InteriorTabButton`
- Forms/controls: `InteriorInput`, `InteriorTextarea`, `InteriorSelect`, `InteriorButton`
- Panels/cards: `InteriorPanel`, `InteriorSectionHeader`, `InteriorHelperText`
- Launcher tiles: `InteriorTileButton`

Use these tokenized shell/document classes where needed:

- `desktop-window-shell`
- `desktop-window-titlebar`
- `desktop-document-surface`
- `desktop-interior-*` class family

Use icon components from:

- `/Users/foundbrand_001/Development/vc83-com/src/components/icons/shell-icons.tsx`

---

## Disallowed patterns

Do not introduce or reintroduce:

- legacy theme/window-style selectors or user-facing style-family controls
- window interior styling built from ad hoc `zinc-*` palettes as the primary contract
- raw inline Win95 interior styling as the default pattern in new work
- emoji-first iconography in desktop/menu/window chrome
- one-off button/input/panel implementations when matching interior primitives exist

Compatibility bridges may exist temporarily in legacy surfaces, but new/updated windows must converge to this contract.

---

## Definition of done for window UI changes

A window/UI task is not done unless all checks pass:

1. Visual contract:
   - uses shared interior primitives
   - uses shell/document tokens
   - no emoji chrome
2. Interaction contract:
   - keyboard focus styles visible
   - reduced-motion path preserved
3. i18n contract:
   - no raw translation keys rendered
4. Verify commands:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test:unit`
   - `npm run docs:guard` (for docs-affecting rows)

---

## Compliance checklist for PR review

Copy into PR description when touching window UI:

- [ ] Interior primitives used (`Interior*`) instead of ad hoc controls
- [ ] Shell/document token classes used (`desktop-interior-*`, `desktop-document-surface`)
- [ ] No emoji UI glyphs in chrome/menu/launcher
- [ ] Dark/sepia-only behavior preserved
- [ ] Focus-visible + reduced-motion behavior preserved
- [ ] Translation keys resolved (no raw key output)
- [ ] Verify commands executed and recorded
- [ ] Applicable PostHog cue subset preserved (menu rows, shell nav, document surface, motion, iconography)

---

## Audit workflow

Use this contract to audit the entire existing UI through the registered desktop windows inventory.

Required artifacts:

1. `WINDOW_UI_CONTRACT_AUDIT_MATRIX.md` (window-by-window tracker)
2. `TASK_QUEUE.md` Lane `K` rows (`DAC-037`+)

Audit sequence:

1. Build inventory from `src/hooks/window-registry.tsx` window IDs.
2. Run baseline heuristic classification:
   - `CANDIDATE_COMPLIANT`: interior primitives/tokens detected and no legacy indicators in primary file
   - `MIXED`: both modern and legacy indicators present
   - `LEGACY`: legacy indicators present and no interior primitives detected
   - `UNREVIEWED`: insufficient signal in baseline scan
3. Run manual verification per window against non-negotiable rules.
4. For every non-compliant window, create remediation row(s) in queue with explicit verify commands.
5. Reclassify window to `COMPLIANT` only after verification passes.

Baseline heuristic indicators (for triage only, not final verdict):

- Modern indicators: `Interior*` primitives, `desktop-interior-*` classes, `desktop-document-surface`
- Legacy indicators: `retro-button`, inline `--win95-*` usage, ad hoc `zinc-*` surface classes as primary styling contract

Manual review is authoritative over heuristics.

---

## Known gap callout

Brain is currently a partial-convergence surface and must be treated as in migration until fully moved to shared interior primitives and canonical token classes in all subviews.

---

## Exception process

If a change cannot comply, document an exception in the task row notes with:

1. exact file/path scope
2. reason compliance is blocked
3. expiry condition (what change removes the exception)
4. follow-up task ID

No undocumented exceptions.
