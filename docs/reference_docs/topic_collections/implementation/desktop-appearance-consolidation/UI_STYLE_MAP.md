# UI Style Map (Desktop Shell Quick Reference)

**Date:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`  
**Primary contract:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_DESIGN_CONTRACT.md`

---

## Purpose

Provide a one-page implementation map for the active desktop UI style so new UI work uses the same fonts, tokens, and component classes.

This is a practical reference. If this page and the design contract conflict, the design contract wins.

---

## Font System

Global fonts are loaded in:

- `/Users/foundbrand_001/Development/vc83-com/src/app/layout.tsx`

Loaded families:

- `Geist` -> `--font-geist-sans`
- `Geist Mono` -> `--font-geist-mono`
- `Instrument Serif` -> `--font-instrument-serif`
- `Playfair Display` -> `--font-playfair`
- `Press Start 2P` -> `--font-pixel`

Canonical shell body typography in use:

- `body` and `.font-pixel` use `Segoe UI, Tahoma, Geneva, Verdana, sans-serif` in:
  `/Users/foundbrand_001/Development/vc83-com/src/app/globals.css`
- Tailwind `font-sans` and `font-mono` map to `--font-geist-sans` and `--font-geist-mono` in:
  `/Users/foundbrand_001/Development/vc83-com/src/app/globals.css`

Notes:

- Use `font-mono` for IDs/code/debug fields.
- Use `Playfair`/`Instrument Serif` only for intentional editorial/brand accents, not default app controls.

---

## Color And Token Contract

Canonical tokens live in:

- `/Users/foundbrand_001/Development/vc83-com/src/app/globals.css`

Appearance modes:

- `dark` (default)
- `sepia`

Primary token groups:

- Core tone tokens: `--tone-*`
- Shell chrome tokens: `--shell-*`
- Desktop/menu tokens: `--desktop-*`
- Window/document tokens: `--window-*`
- Action/state tokens: `--error`, `--success`, `--warning`, `--info`

Rule:

- UI surfaces should bind to semantic tokens/classes, not ad hoc hex literals.

---

## Style Families In Use

### 1) Desktop shell chrome (links, menus, tabs, top actions)

Classes:

- `.desktop-topbar-link`, `.desktop-topbar-link-active`
- `.desktop-taskbar-menu`, `.desktop-taskbar-menu-item`, `.desktop-taskbar-menu-divider`
- `.desktop-taskbar-action`, `.desktop-taskbar-warning`
- `.desktop-window-tab`, `.desktop-window-tab-active`

Where defined:

- `/Users/foundbrand_001/Development/vc83-com/src/app/globals.css`

Where commonly used:

- `/Users/foundbrand_001/Development/vc83-com/src/components/taskbar/top-nav-menu.tsx`

### 2) Shell buttons (window-level/chrome controls)

Classes:

- `.desktop-shell-button`
- `.desktop-shell-button-primary`
- `.desktop-shell-button-small`
- `.desktop-shell-control-button`

Aliases still present for compatibility:

- `.retro-button`, `.retro-button-primary`, `.retro-button-small`
- `.beveled-button`, `.beveled-button-primary`, `.beveled-button-sm`

### 3) Interior controls (panels/forms/buttons inside windows)

Classes:

- `.desktop-interior-root`, `.desktop-interior-header`, `.desktop-interior-title`
- `.desktop-interior-tab-row`, `.desktop-interior-tab`, `.desktop-interior-tab-active`
- `.desktop-interior-panel`
- `.desktop-interior-input`, `.desktop-interior-select`, `.desktop-interior-textarea`
- `.desktop-interior-button` + `-primary`, `-subtle`, `-danger`, `-ghost`

Recommended React primitives:

- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/shared/interior-primitives.tsx`

---

## Buttons, Menus, Links: What Style Is This?

For the currently favored UI (the one used in Product menu/nav and modernized windows), the style is:

- **Desktop Shell + Interior Primitives**
- Flat, tokenized, rounded controls with subtle hover/focus and semantic variants.

This is not the old Win95 beveled style as a primary design language.  
Legacy names remain as compatibility aliases but map to the modern tokenized treatment.

---

## Icon System

Primary icon set:

- `lucide-react` components

Compatibility/legacy icon support still exists in places:

- Font Awesome kit loaded in `/Users/foundbrand_001/Development/vc83-com/src/app/layout.tsx`

Rule:

- Prefer `lucide-react` for new UI.
- Avoid emoji glyphs for chrome/menu/window-level controls.

---

## Use / Avoid

Use:

- `Interior*` primitives for window interior UI
- `desktop-topbar-link`, `desktop-taskbar-menu-item` for nav/menu rows
- `desktop-shell-button*` or `desktop-interior-button*` for actions
- Semantic token vars from `globals.css`

Avoid:

- New one-off button/menu/link styles when canonical classes exist
- Inline hardcoded colors for surfaces/text where token exists
- Reintroducing legacy style-family controls as a user-facing option

---

## Fast Class Pick Guide

- Product top link: `desktop-topbar-link`
- Dropdown row: `desktop-taskbar-menu-item`
- Main window action: `desktop-interior-button-primary`
- Secondary window action: `desktop-interior-button-subtle`
- Destructive action: `desktop-interior-button-danger`
- Utility shell action: `desktop-shell-button`

---

## Related Docs

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_DESIGN_CONTRACT.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/WINDOW_UI_CONTRACT_AUDIT_MATRIX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation/LANE_G_POSTHOG_REFERENCE_NOTES.md`
