# Desktop Appearance Consolidation Plan (Dark + Sepia)

## Purpose

Define a concrete, low-risk plan to remove the current multi-theme system and
converge on a two-mode appearance model:

- `dark` (default)
- `sepia` (reading mode replacement for light mode)

This plan explicitly keeps the product direction centered on:

- desktop-grade Windows UI metaphor
- Finder/filesystem metaphor
- modern visual quality from `/builder` and `/layers`

## Date

- Baseline captured: 2026-02-17

## Why This Change

Current theme breadth increases maintenance cost, visual drift, and regression
risk. The target is a tighter, world-class desktop experience with one core
visual language and only one meaningful user-facing appearance choice
(`dark`/`sepia`).

## Scope

In scope:

- remove theme family proliferation from platform UI
- remove window style switching (`windows`/`mac`/`shadcn`) as a user setting
- introduce `reading-mode` with `dark`/`sepia`
- align desktop shell and Finder surfaces with `/builder` + `/layers` quality
- preserve and modernize Windows/Finder metaphors
- update persistence layer and migration path
- update tests and docs for the new appearance contract

Out of scope:

- redesigning builder-generated customer websites/theme schema in
  `src/templates/**`
- replacing all legacy Win95 utility classes in one PR
- introducing additional appearance modes beyond `dark` and `sepia`

## Current State Baseline (Codebase)

### Theme system bloat

- `src/contexts/theme-context.tsx` contains many themes and families
  (`win95-*`, `glass-*`, `clean-*`, plus coming-soon variants).
- Theme state controls CSS variables, dark class, and glass class.
- Window style is also user-configurable (`mac`/`windows`/`shadcn`) in the same
  context.

### Persistence complexity

- `convex/userPreferences.ts` stores both `themeId` and `windowStyle`.
- localStorage keys:
  - `l4yercak3-theme`
  - `l4yercak3-window-style`
- defaults still point to old theme semantics (`win95-light`, `windows`) in
  backend preference fallback.

### High UI coupling to old model

- `src/app/page.tsx` uses theme family toggling logic.
- `src/components/window-content/settings-window.tsx` exposes full theme and
  window-style pickers.
- `src/app/globals.css` has extensive `[data-window-style="..."]` branches and
  `.dark` overrides tied to historical variants.

### Visual direction split

- `/builder` and `/layers` are already closer to modern product direction.
- desktop/home/Finder surfaces still carry broad legacy style matrix and variant
  burden.

## Target State

### Appearance contract (single source of truth)

- Appearance modes: `dark | sepia`
- Default mode: `dark`
- localStorage key: `reading-mode`
- persistence values: `"dark"` or `"sepia"`
- restored on page load before paint (to avoid flash)

### Visual language goals

- Keep Windows/Finder desktop metaphor intact.
- Adopt the cleaner, modern density and polish level seen in `/builder` and
  `/layers`.
- Replace theme proliferation with token discipline (stable color, spacing,
  typography, motion primitives).

### Typography contract

- Global fonts via `next/font/google`:
  - Geist (`--font-geist-sans`)
  - Geist Mono (`--font-geist-mono`)
  - Instrument Serif (`--font-instrument-serif`, normal + italic)
- Body defaults to Geist with antialiasing + no synthesis.
- Instrument Serif reserved for display headlines and high-emphasis titles.
- Preserve pixel/retro font only where intentionally needed for nostalgic shell
  affordances (not as the default document typography).

### Color contract

- Dark mode tokenized via HSL custom properties (dark-first default).
- Sepia mode token map applied via mode attribute/class, including:
  - `bg-amber-50`, `text-amber-900`, `border-amber-200` family mapping.
- No user-facing multi-theme palette selection.

### Component and motion contract

- Button/card/input appearance standardized to one system.
- Framer Motion used only for meaningful transitions with reduced-motion
  fallback.
- Shared animation constants and spring presets across shell surfaces.

### Spec translation checklist (required)

This is the implementation contract derived from the provided design spec,
adapted to Windows/Finder shell constraints:

- Typography:
  - install/use Geist + Geist Mono + Instrument Serif via `next/font/google`
  - Instrument Serif uses normal+italic and feature settings:
    `"kern" 1, "liga" 1, "calt" 1, "pnum" 1, "onum" 1`
  - hero scale support:
    - mobile `2.5rem/1.1/-0.02em`
    - md `4rem`
    - lg `6rem`
    - xl `8rem`
- Color system:
  - dark-first HSL CSS custom properties in root token layer
  - sepia class/token map for backgrounds, content text, muted text, cards,
    and borders
  - standardized `themeClasses.dark` and `themeClasses.sepia` contract for
    component-level mapping
- Persistence:
  - `localStorage["reading-mode"] = "dark" | "sepia"`
  - restore on first paint
- Spacing:
  - implement `--inset`, `--sides`, and `--footer-safe-area`
  - container standard: `max-w-4xl mx-auto px-[var(--sides)]`
  - section rhythm: `py-16 md:py-24`
- Components:
  - buttons: rounded-full + glass treatment + defined shadow states + shine
    animation
  - cards: rounded + muted/sepia backgrounds + hover transition
  - inputs: rounded-full, `h-11`, blur-capable backgrounds
- Motion:
  - constants: `DURATION`, `DELAY`, `EASE_OUT`, `EASE_OUT_OPACITY`
  - spring presets for default and button interactions
  - variants: `fadeInOut`, `scaleInOut`, `slideUpOut`
- Layout:
  - sticky minimal nav with mode toggle on modern surfaces
  - hero and alternating sections use unified token mapping
  - maintain desktop shell + Finder IA
- Responsive:
  - keep `sm/md/lg/xl/2xl`
  - add custom `short` breakpoint (`max-height: 748px`)
- Accessibility:
  - reduced-motion media query support
  - focus-visible ring + ring-offset standards
  - semantic headings and ARIA labels on controls
- Performance:
  - GPU hinting on animated elements
  - constrained `will-change` usage
  - `next/image` where applicable
  - font `display: "swap"`
- Dependencies:
  - ensure availability of:
    - `framer-motion`
    - `class-variance-authority`
    - `@radix-ui/react-slot`
    - `react-hook-form`
  - keep `clsx + tailwind-merge` (`cn()` utility already present)

## Proposed Architecture Changes

### 1. Replace ThemeContext with AppearanceContext

Create a new context:

- `mode: "dark" | "sepia"`
- `setMode(mode)`
- `toggleMode()`

Responsibilities:

- apply root mode attributes/classes
- persist to `reading-mode`
- expose simple API used by desktop shell, settings, and route layouts

### 2. Freeze window style to one canonical shell style

- Remove user-selectable `windowStyle` from settings UI.
- Keep one canonical desktop chrome style (Windows metaphor, modernized).
- Delete style branches that only exist for `mac`/`shadcn` variants after
  migration completion.

### 3. Token convergence in CSS

Refactor `src/app/globals.css`:

- establish compact base token layer for dark mode
- add sepia token override layer
- retain required Finder/desktop variables but sourced from the same token
  contract
- reduce variant-specific selectors and fallback complexity

### 4. Persistence migration path

Backend (`userPreferences`):

- add `appearanceMode` (`"dark" | "sepia"`)
- deprecate `themeId` and `windowStyle` for UI behavior
- backward-compat read logic during migration window

Client migration:

- one-time migration from old localStorage keys to `reading-mode`
- mapping rule:
  - any known dark theme -> `dark`
  - all non-dark themes -> `sepia`

### 5. Keep builder/layers as style reference implementations

- treat `/builder` and `/layers` as baseline for modern surface quality:
  - density
  - spacing rhythm
  - muted neutral layering
  - cleaner control affordances
- adapt those qualities to Windows/Finder shell primitives instead of copying
  raw route styles blindly

## Implementation Plan (Phased)

### Phase 0 - Contract and guardrails

Deliverables:

- this plan merged
- explicit style contract doc section for dark/sepia tokens
- no new feature work adds theme-family-specific branches

Exit criteria:

- team agrees that theme and window-style proliferation is deprecated

### Phase 1 - Foundation: AppearanceContext + persistence

Changes:

- add `AppearanceContext` and wire in `src/app/providers.tsx`
- create `reading-mode` storage contract and hydration-safe restore logic
- add adapter layer so old `useTheme` callers can be migrated incrementally

Validation:

- mode persists across reloads
- no flash of wrong mode on initial paint

### Phase 2 - Layout and typography convergence

Changes:

- update `src/app/layout.tsx` font setup to Geist + Geist Mono + Instrument Serif
- remove route-specific font divergence where it conflicts with core system
- define typography utilities for hero/title/subtitle/body/muted tiers

Validation:

- consistent font rendering across desktop shell, builder entry, layers entry

### Phase 3 - UI cleanup: settings and toggles

Changes:

- remove theme chooser UI from `SettingsWindow`
- replace with simple appearance toggle (`dark` / `sepia`)
- remove window style chooser UI
- remove homepage theme-family toggle logic

Validation:

- users can only select dark/sepia
- no stale UI paths reference deleted theme families

### Phase 4 - CSS de-bloat and shell modernization

Changes:

- collapse `globals.css` branches tied to `data-window-style`
- keep single Windows/Finder shell style and modernized visual polish
- apply standardized button/card/input/border styles from contract

Validation:

- Finder, desktop windows, dialogs, and toolbars remain visually coherent
- no regressions in interaction states (hover/focus/active/disabled)

### Phase 5 - Backend schema migration

Changes:

- add `appearanceMode` to `userPreferences`
- migration/backfill script for existing records
- deprecate `themeId` + `windowStyle` usage in frontend reads/writes

Validation:

- existing users retain a deterministic mode after deploy
- preference sync still works cross-device

### Phase 6 - Motion, accessibility, and performance hardening

Changes:

- introduce Framer Motion tokens (`DURATION`, `DELAY`, spring configs)
- add reduced-motion guards
- ensure focus-visible ring/ring-offset behavior on interactive controls
- verify GPU acceleration/will-change only where justified

Validation:

- reduced-motion mode disables non-essential animation
- Lighthouse/accessibility checks pass for key routes

### Phase 7 - Final deletion pass

Changes:

- remove dead theme arrays, helper functions, and unused CSS vars
- remove old localStorage keys and compatibility code after sunset window

Validation:

- build, typecheck, and core UX smoke tests pass
- no references remain to deprecated theme IDs or window-style modes

## File-Level Execution Map

Primary files expected to change:

- `src/contexts/theme-context.tsx` (replace/deprecate)
- `src/contexts/appearance-context.tsx` (new)
- `src/app/providers.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/components/window-content/settings-window.tsx`
- `convex/userPreferences.ts`
- `convex/schemas/coreSchemas.ts`

Secondary files likely touched:

- desktop/window primitives relying on old style branches
- tests for appearance persistence and settings behavior

## Risks and Mitigations

1. Risk: visual regressions across many legacy window components.
Mitigation: migrate in phases with snapshot/smoke passes per major window
surface.

2. Risk: user preference breakage during schema transition.
Mitigation: dual-read migration window + deterministic fallback mapping.

3. Risk: accidental loss of Windows/Finder identity while modernizing.
Mitigation: treat metaphor as invariant; modernize tokens/interactions, not
core IA or shell model.

4. Risk: over-animating desktop shell.
Mitigation: strict animation token usage + reduced-motion hard stop.

## Validation Matrix

- Functional:
  - appearance toggle works in settings
  - mode persists via localStorage and user preferences
  - Finder/Desktop/Builder/Layers all render correctly in both modes
- Accessibility:
  - focus-visible states
  - semantic heading hierarchy
  - reduced motion support
- Performance:
  - no significant layout thrash from mode switching
  - route transition and interaction smoothness on desktop baseline hardware

## Docs + CI Compliance

Placement compliance:

- this plan is intentionally stored under:
  `docs/reference_docs/topic_collections/implementation/`
- no new root-level markdown files are added under `docs/`

Guard check:

- run `npm run docs:guard` before merge

## Decision Log

1. Multi-theme + multi-window-style customization is deprecated.
2. Appearance is reduced to `dark` and `sepia` only.
3. Windows/Finder metaphor remains the shell model.
4. `/builder` and `/layers` are the quality reference for modern surface polish.

## First Execution PR (Recommended)

Scope:

- introduce `AppearanceContext`
- wire `reading-mode` persistence
- add settings toggle (`dark`/`sepia`)
- keep temporary compatibility adapter for existing `useTheme` consumers

Success criteria:

- user can switch and persist between dark and sepia
- no existing route breaks
- docs guard passes
