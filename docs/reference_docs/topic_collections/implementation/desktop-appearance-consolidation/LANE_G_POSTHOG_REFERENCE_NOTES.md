# Lane G - PostHog Reference Notes (Desktop UX Polish)

**Date captured:** 2026-02-17  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`

---

## Goal

Capture a concrete reference profile from [posthog.com](https://posthog.com/) and translate it into implementation guidance for our desktop shell without re-introducing theme-system bloat.

This lane is about interaction and surface polish only:

- top taskbar link-first navigation (instead of Start button)
- menu behavior and menu visual treatment
- white document/window surface treatment
- clean center-origin window open/close choreography
- custom icon system (no emoji UI glyphs)

---

## Evidence set (Playwright + screenshots)

Artifacts used:

- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/posthog-home.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/posthog-hover-product-os.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/menu-product-os.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/menu-more.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/window-state-initial.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/window-state-after-customers.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/window-state-after-demo.png`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/posthog-audit.json`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/posthog-window-motion-audit.json`
- `/Users/foundbrand_001/Development/vc83-com/tmp/posthog-audit/posthog-menu-surface-audit.json`

Reference viewport used by automation: `1440x900`.

---

## Key observations

### 1) Taskbar/nav model: top, compact, link-first

- Primary nav is a compact top strip, not a bottom dock/taskbar.
- Left area is route links (`Product OS`, `Pricing`, `Docs`, `Community`, `Company`, `More`).
- Right area contains utility actions (`Get started - free`, search, notifications, profile).
- Visual density is high but legible; row height is compact (automation measured header near `30px`).

**Translation for vc83:**

- Move shell taskbar to top for desktop mode.
- Replace Start-button entry with direct links and a `More` overflow menu.
- Keep clock, quick actions, and profile controls at the right edge.

### 2) Menus: soft panel, icon-led rows, submenu affordances

From `menu-product-os.png` and `menu-more.png`:

- Menus appear as light neutral floating panels with subtle border + shadow.
- Rows use leading custom icons and right-facing chevrons when submenus exist.
- Category separators are clear and low-noise (thin divider + muted label).
- Hover states are calm and readable; no aggressive glow effects.

**Translation for vc83:**

- Standardize desktop menu primitive with one menu surface token set.
- Use explicit `MenuSection` and `MenuRow` components with icon slot + optional chevron.
- Keep menu radius/shadow modest; focus on readability and pointer targeting.

### 3) Window/document surface: light, clean working canvas

- The central working window uses a very light document background with dark text.
- Window chrome is minimal; content area feels like a productivity editor, not a decorative card.
- Strong contrast between wallpaper backdrop and primary window surface improves focus.

**Translation for vc83:**

- Keep desktop wallpaper/background rich, but make active window content backgrounds near-white in both modes (sepia-tinted in sepia mode).
- Reduce heavy tint overlays inside content panes.
- Prioritize text readability and editor-like clarity in Finder/details/docs windows.

### 4) Window motion feel: center-biased, clean, low-noise

- User-observed behavior: window open/close feels center-origin and clean.
- Captures show a stable centered primary window region in the shell during interactions.
- Motion emphasis is subtle scale/fade confidence, not bounce or flashy transforms.

**Translation for vc83:**

- Use center-origin enter/exit variants for open/close.
- Keep durations short and consistent; preserve reduced-motion off-ramp.
- Ensure close transitions feel deliberate and reversible (no abrupt jump-cut).

### 5) Iconography: custom icon language, not emoji

- Core navigation/menu chrome relies on line/pixel-like custom icons.
- Emoji is avoided in primary IA and control surfaces.

**Translation for vc83 (required):**

- Replace emoji-based desktop/menu icons with custom icon components.
- Standardize icon sizes (16/18/20), stroke weights, and muted/active states.
- Keep file-type semantics via icon variants, not emoji glyphs.

---

## Lane G implementation slices (1-2 hour chunks)

1. `DAC-016`: Top taskbar conversion to link-first nav and Start-button removal.
2. `DAC-017`: Menu primitive and white/sepia document-window surface convergence.
3. `DAC-018`: Custom icon rollout and center-origin window motion pass.

---

## Acceptance checklist for Lane G

1. Top desktop bar uses links for core navigation; no Start button entry path.
2. Menus share one light-surface style and include icon + submenu affordances.
3. Primary working windows use white/sepia-tinted content backgrounds with high text contrast.
4. Open/close window transitions use center-origin choreography with reduced-motion fallback.
5. Emoji is removed from desktop/menu/navigation chrome and replaced with custom icons.
6. `dark` and `sepia` remain the only appearance modes.

---

## Non-goals

- No reintroduction of legacy theme families/window-style pickers.
- No copy-paste brand mimicry of PostHog assets/content.
- No backend preference schema changes unless strictly needed by UI behavior.
