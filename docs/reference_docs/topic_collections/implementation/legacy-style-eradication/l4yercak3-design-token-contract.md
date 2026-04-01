# *sevenlayers* Design Token Contract

> Strict token specification for CI enforcement via `check-ui-design-drift.sh` + `ui-design-guard.yml`
> All instances of the brand name *sevenlayers* must be **lowercase ** — no exceptions.

---

## 0. Brand Rules

| Rule | Detail |
|------|--------|
| Brand name rendering | Always lowercase, always : *sevenlayers* |
| CSS enforcement | `text-transform: lowercase; font-style: ;` |
| In code/comments | Lowercase: `sevenlayers` |

---

## 1. Color Schemes

The system has two appearance modes: **Midnight** (dark, default) and **Daylight** (light/warm-white).

### Scheme A: "Midnight" (Dark — Vercel-inspired)

Pure black foundation. Orange accent. High contrast. No blue tinting on neutrals. Developer-tool aesthetic.

#### Core Surfaces

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#0A0A0A` | Page / desktop background |
| `--color-surface` | `#141414` | Window interior / card bg |
| `--color-surface-raised` | `#1A1A1A` | Elevated panels |
| `--color-surface-hover` | `#1E1E1E` | Hover state on surfaces |
| `--color-surface-active` | `#252525` | Pressed / active state |

#### Text

| Token | Hex | Role |
|-------|-----|------|
| `--color-text` | `#EDEDED` | Primary text |
| `--color-text-secondary` | `#888888` | Muted / secondary text |
| `--color-text-tertiary` | `#555555` | Placeholder / disabled text |

#### Borders

| Token | Hex | Role |
|-------|-----|------|
| `--color-border` | `#262626` | Default borders |
| `--color-border-hover` | `#3A3A3A` | Border hover |
| `--color-border-focus` | `#E8520A` | Focus ring border (orange) |

#### Accent

| Token | Hex | Role |
|-------|-----|------|
| `--color-accent` | `#E8520A` | CTA, links, focus, checkboxes, active tabs |
| `--color-accent-hover` | `#CC4709` | Accent hover (darker) |
| `--color-accent-subtle` | `rgba(232,82,10,0.10)` | Accent background tint |

#### Semantic

| Token | Hex | Subtle variant |
|-------|-----|----------------|
| `--color-success` | `#34D399` | `rgba(52,211,153,0.10)` |
| `--color-warn` | `#FBBF24` | `rgba(251,191,36,0.10)` |
| `--color-error` | `#EF4444` | `rgba(239,68,68,0.10)` |
| `--color-info` | `#3B82F6` | `rgba(59,130,246,0.10)` |

> Note: `--color-info` is blue in both schemes. It is distinct from `--color-accent` (orange).

#### Buttons

| Token | Hex | Role |
|-------|-----|------|
| `--btn-primary-bg` | `#000000` | Black, matches dark shell |
| `--btn-primary-text` | `#EDEDED` | Light text on black |
| `--btn-primary-border` | `#333333` | Subtle outline |
| `--btn-primary-hover` | `#171717` | Hover (lightens) |
| `--btn-secondary-bg` | `#1E1E1E` | Dark surface tone |
| `--btn-secondary-text` | `#CCCCCC` | Muted light text |
| `--btn-secondary-border` | `#333333` | Visible outline |
| `--btn-secondary-hover` | `#282828` | Hover |
| `--btn-ghost-text` | `#888888` | Muted |
| `--btn-ghost-hover` | `#1A1A1A` | Subtle surface fill |
| `--btn-danger-bg` | `#7F1D1D` | Dark red |
| `--btn-danger-text` | `#FCA5A5` | Light red text |
| `--btn-danger-hover` | `#991B1B` | Darker red hover |
| `--btn-accent-bg` | `#E8520A` | Orange CTA |
| `--btn-accent-text` | `#FFFFFF` | White text on orange |
| `--btn-accent-hover` | `#CC4709` | Darker orange |

#### Window Chrome

| Token | Hex | Role |
|-------|-----|------|
| `--window-bg` | `#111111` | Window body bg |
| `--window-border` | `#262626` | Window frame border |
| `--titlebar-bg` | `#0D0D0D` | Title bar background |
| `--titlebar-text` | `#777777` | Title bar label text |
| `--titlebar-btn` | `#333333` | Minimize/maximize dots |
| `--titlebar-btn-hover` | `#444444` | Dot hover |
| `--titlebar-close` | `#EF4444` | Close dot (red) |

#### Menu

| Token | Hex | Role |
|-------|-----|------|
| `--menu-bg` | `#141414` | Dropdown background |
| `--menu-border` | `#262626` | Dropdown border |
| `--menu-hover` | `#1E1E1E` | Item hover bg |
| `--menu-divider` | `#1E1E1E` | Separator line |

#### Input

| Token | Hex | Role |
|-------|-----|------|
| `--input-bg` | `#0F0F0F` | Input field background |
| `--input-border` | `#262626` | Input border |

#### Code

| Token | Hex | Role |
|-------|-----|------|
| `--code-bg` | `#0D0D0D` | Code block background |

#### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.5)` | Badges, tooltips |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.65)` | Cards, menus |
| `--shadow-lg` | `0 12px 48px rgba(0,0,0,0.8)` | Modals, sheets |
| `--shadow-focus` | `0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-border-focus)` | Focus ring |
| `--overlay` | `rgba(0,0,0,0.65)` | Modal backdrop |

---

### Scheme B: "Daylight" (Light — PostHog app-inspired)

White surfaces. Warm page background (not sepia, not sterile). Orange accent. High personality without being noisy.

#### Core Surfaces

| Token | Hex | Role |
|-------|-----|------|
| `--color-bg` | `#F4F3EF` | Page / desktop bg (warm light gray) |
| `--color-surface` | `#FFFFFF` | Window interior / card bg (pure white) |
| `--color-surface-raised` | `#FFFFFF` | Elevated panels |
| `--color-surface-hover` | `#F7F7F5` | Hover state on surfaces |
| `--color-surface-active` | `#EFEEEB` | Pressed / active state |

#### Text

| Token | Hex | Role |
|-------|-----|------|
| `--color-text` | `#1A1A1A` | Primary text (near-black) |
| `--color-text-secondary` | `#6B6B6B` | Muted / secondary text |
| `--color-text-tertiary` | `#A0A09B` | Placeholder / disabled text |

#### Borders

| Token | Hex | Role |
|-------|-----|------|
| `--color-border` | `#E0DDD6` | Default (warm gray) |
| `--color-border-hover` | `#CCC9C0` | Border hover |
| `--color-border-focus` | `#E8520A` | Focus ring border (orange) |

#### Accent

| Token | Hex | Role |
|-------|-----|------|
| `--color-accent` | `#E8520A` | CTA, links, focus, checkboxes, active tabs |
| `--color-accent-hover` | `#CC4709` | Accent hover (darker) |
| `--color-accent-subtle` | `rgba(232,82,10,0.07)` | Accent background tint |

> Accent is `#E8520A` orange in **both** schemes. This is a *sevenlayers* brand constant.

#### Semantic

| Token | Hex | Subtle variant |
|-------|-----|----------------|
| `--color-success` | `#16A34A` | `rgba(22,163,74,0.08)` |
| `--color-warn` | `#D97706` | `rgba(217,119,6,0.08)` |
| `--color-error` | `#DC2626` | `rgba(220,38,38,0.08)` |
| `--color-info` | `#2563EB` | `rgba(37,99,235,0.08)` |

#### Buttons

All buttons have a visible `1px solid` border — this is a core *sevenlayers* design decision.

| Token | Hex | Role |
|-------|-----|------|
| `--btn-primary-bg` | `#E8E5DD` | Warm cream — matches window header/titlebar tone |
| `--btn-primary-text` | `#1A1A1A` | Near-black text (max contrast) |
| `--btn-primary-border` | `#C4BFB3` | Warm outline |
| `--btn-primary-hover` | `#DDD9D0` | Slightly darker warm cream |
| `--btn-secondary-bg` | `#FFFFFF` | White, matches window interior |
| `--btn-secondary-text` | `#1A1A1A` | Near-black text |
| `--btn-secondary-border` | `#E0DDD6` | Warm border (same as surface border) |
| `--btn-secondary-hover` | `#F7F7F5` | Light warm hover |
| `--btn-ghost-text` | `#6B6B6B` | Muted text |
| `--btn-ghost-hover` | `#F4F3EF` | Page bg tone fill |
| `--btn-danger-bg` | `#DC2626` | Red |
| `--btn-danger-text` | `#FFFFFF` | White text on red |
| `--btn-danger-hover` | `#B91C1C` | Darker red |
| `--btn-accent-bg` | `#E8520A` | Orange CTA |
| `--btn-accent-text` | `#FFFFFF` | White text on orange |
| `--btn-accent-hover` | `#CC4709` | Darker orange |

#### Window Chrome

| Token | Hex | Role |
|-------|-----|------|
| `--window-bg` | `#FFFFFF` | Window body bg (white) |
| `--window-border` | `#E0DDD6` | Window frame border (warm) |
| `--titlebar-bg` | `#F4F3EF` | Title bar bg (matches page bg) |
| `--titlebar-text` | `#6B6B6B` | Title bar label text |
| `--titlebar-btn` | `#D6D3CB` | Minimize/maximize dots |
| `--titlebar-btn-hover` | `#C0BDB5` | Dot hover |
| `--titlebar-close` | `#DC2626` | Close dot (red) |

#### Menu

| Token | Hex | Role |
|-------|-----|------|
| `--menu-bg` | `#FFFFFF` | Dropdown background (white) |
| `--menu-border` | `#E0DDD6` | Dropdown border |
| `--menu-hover` | `#F7F7F5` | Item hover bg |
| `--menu-divider` | `#EFEEEB` | Separator line |

#### Input

| Token | Hex | Role |
|-------|-----|------|
| `--input-bg` | `#FFFFFF` | Input field background |
| `--input-border` | `#E0DDD6` | Input border |

#### Code

| Token | Hex | Role |
|-------|-----|------|
| `--code-bg` | `#F7F7F5` | Code block background |

#### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)` | Badges, tooltips |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.03)` | Cards, menus |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)` | Modals, sheets |
| `--shadow-focus` | `0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-border-focus)` | Focus ring |
| `--overlay` | `rgba(0,0,0,0.35)` | Modal backdrop |

---

## 2. Typography

### Font Families

Loaded in `src/app/layout.tsx`. CSS variables defined in `src/app/globals.css`.

| Token | Stack | Usage | Loading |
|-------|-------|-------|---------|
| `--font-geist-sans` | `'Geist', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` | Shell UI, body, headings — primary everywhere | `next/font` |
| `--font-geist-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, monospace` | Code, IDs, debug fields, terminal | `next/font` |
| `--font-instrument-serif` | `'Instrument Serif', serif` | Editorial accents only — NOT for app controls | Google Fonts |
| `--font-playfair` | `'Playfair Display', serif` | Brand accents only — NOT for app controls | Google Fonts |
| `--font-pixel` | `'Press Start 2P', monospace` | Special / retro accents | Google Fonts |

#### Tailwind Mapping

```css
font-sans  → var(--font-geist-sans)
font-mono  → var(--font-geist-mono)
```

#### Shell Body Override

The canonical shell body font stack (applied to `body` in `globals.css`):
```css
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
```

> Geist loads via `next/font` and takes precedence where the CSS variable is used. The body fallback ensures non-variable contexts still render with a system UI font.

#### Rules

- Use `font-mono` / `--font-geist-mono` for IDs, code blocks, debug fields, and terminal output
- Use `Playfair Display` and `Instrument Serif` **only** for intentional editorial/brand accents — never for default app controls, labels, or buttons
- Use `Press Start 2P` only for special retro-themed elements
- Brand name *sevenlayers* may be rendered in `--font-playfair` , but the lowercase  rule applies regardless of font

### Size Scale (rem-based, 16px root)

| Token | rem | px | Usage |
|-------|-----|----|-------|
| `--text-xs` | 0.75 | 12 | Captions, badges, metadata |
| `--text-sm` | 0.875 | 14 | Secondary text, table cells, menu items |
| `--text-base` | 1 | 16 | Body text (default) |
| `--text-lg` | 1.125 | 18 | Lead paragraphs |
| `--text-xl` | 1.25 | 20 | Section sub-headers |
| `--text-2xl` | 1.5 | 24 | Card titles, H3 |
| `--text-3xl` | 1.875 | 30 | H2 |
| `--text-4xl` | 2.25 | 36 | H1 |
| `--text-5xl` | 3 | 48 | Page heroes |

### Weight Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis, nav items, menu items |
| `--font-semibold` | 600 | Headings, buttons, labels |
| `--font-bold` | 700 | Hero headings only |

### Line-Height Scale

| Token | Value | Paired with |
|-------|-------|-------------|
| `--leading-tight` | 1.2 | Headings (xl and above) |
| `--leading-snug` | 1.375 | Sub-headings, card titles |
| `--leading-normal` | 1.5 | Body text (default) |
| `--leading-relaxed` | 1.625 | Long-form reading |

---

## 3. Spacing Scale

Base unit: **4px**. All spacing must resolve to a value in this scale.

| Token | px | Usage |
|-------|-----|-------|
| `--space-1` | 4 | Tight inline gaps |
| `--space-2` | 8 | Icon-to-label, inner padding |
| `--space-3` | 12 | Compact component padding |
| `--space-4` | 16 | Default component padding |
| `--space-5` | 20 | Card inner padding |
| `--space-6` | 24 | Section padding (small) |
| `--space-8` | 32 | Section gaps |
| `--space-10` | 40 | Major section spacing |
| `--space-12` | 48 | Page-level vertical rhythm |
| `--space-16` | 64 | Hero / major layout spacing |
| `--space-20` | 80 | Page section dividers |
| `--space-24` | 96 | Maximum section spacing |

### Layout Gaps

| Context | Token | Notes |
|---------|-------|-------|
| Inline elements | `--space-2` | Buttons in a row, tags, icon + label |
| Form fields | `--space-4` | Between label + input |
| Card grid gap | `--space-4` | Default grid gap |
| Stack gap (tight) | `--space-3` | List items, nav items, menu items |
| Stack gap (default) | `--space-6` | Content sections |
| Page gutter | `--space-4` → `--space-8` | Responsive |
| Button gap (inline) | `--space-2` | Buttons side by side |
| Menu item padding | `7px 12px` | Vertical 7px, horizontal 12px |

---

## 4. Shape

### Radius Scale

| Token | px | Usage |
|-------|-----|-------|
| `--radius-none` | 0 | Tables, sharp elements |
| `--radius-sm` | 4 | Badges, small elements, taskbar buttons |
| `--radius-md` | 6 | Inputs, selects, buttons |
| `--radius-lg` | 8 | Cards, dropdowns, code blocks |
| `--radius-xl` | 12 | Modals, panels, feature cards |
| `--radius-2xl` | 16 | Hero cards, large containers |
| `--radius-full` | 9999px | Avatars, pills, toggles, badges |

### Border Widths

| Token | px | Usage |
|-------|-----|-------|
| `--border-default` | 1 | Standard borders, all button outlines |
| `--border-thick` | 2 | Focus rings, active tab underlines, emphasis borders |

---

## 5. Elevation (Shadows)

See per-scheme shadow tables above (§1).

Summary:

| Level | Midnight | Daylight | Usage |
|-------|----------|----------|-------|
| `sm` | Heavy (0.5 alpha) | Light (0.05 alpha) | Badges, tooltips |
| `md` | Heavy (0.65 alpha) | Light (0.07 alpha) | Cards, menus, dropdowns |
| `lg` | Heavy (0.8 alpha) | Light (0.10 alpha) | Modals, sheets |
| `focus` | 2px bg ring + 4px accent ring | Same | Focus indicator |

---

## 6. Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `100ms` | Hover color, opacity |
| `--duration-normal` | `200ms` | Buttons, toggles, inputs |
| `--duration-slow` | `300ms` | Modals, drawers, panels, menus |
| `--duration-slower` | `500ms` | Page transitions, charts |
| `--easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| `--easing-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements entering |
| `--easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements exiting |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy interactions |

### Animation Patterns

```css
/* Standard transition */
transition: property var(--duration-normal) var(--easing-default);

/* Menu dropdown */
animation: slideDown 150ms var(--easing-out);

/* Modal entrance */
animation: modalIn 250ms cubic-bezier(0, 0, 0.2, 1);

/* Fade in */
animation: fadeIn 200ms var(--easing-out);
```

**Allowed transition properties:** `color`, `background-color`, `border-color`, `opacity`, `transform`, `box-shadow`, `width`. Block `all` transitions.

---

## 7. Icons

### Icon Set: **Lucide** (`lucide-react`)

Already available in the Next.js ecosystem. This is the only permitted icon set for new UI.

| Token | px | Usage |
|-------|-----|-------|
| `--icon-xs` | 14 | Inline with `text-xs`, menu chevrons |
| `--icon-sm` | 16 | Inline with `text-sm`, menu item icons, badges |
| `--icon-md` | 20 | Default (buttons, nav, inputs) |
| `--icon-lg` | 24 | Section headers, feature cards |
| `--icon-xl` | 32 | Empty states, hero elements |

### Rules

- **Stroke width:** `1.5px` (Lucide default) — no overrides
- **Color:** Always `currentColor` — inherits from text token
- **Style:** Outline only — no filled icons across the entire system
- **Monochrome only** — no multi-color icon treatments (unlike PostHog)
- **No mixing icon sets** — Lucide is the single source for new UI
- **Legacy:** Font Awesome kit loaded in `layout.tsx` for compatibility; do not use for new work
- **No emoji glyphs** for chrome/menu/window-level controls

---

## 8. Component Tokens

### Button

All buttons have a `1px solid` border. This is a core *sevenlayers* design decision — buttons always have visible outlines.

#### Variants

| Variant | Bg | Text | Border | Hover Bg |
|---------|-----|------|--------|----------|
| `primary` | `--btn-primary-bg` | `--btn-primary-text` | `--btn-primary-border` | `--btn-primary-hover` |
| `secondary` | `--btn-secondary-bg` | `--btn-secondary-text` | `--btn-secondary-border` | `--btn-secondary-hover` |
| `ghost` | `transparent` | `--btn-ghost-text` | `transparent` | `--btn-ghost-hover` |
| `danger` | `--btn-danger-bg` | `--btn-danger-text` | `transparent` | `--btn-danger-hover` |
| `accent` | `--btn-accent-bg` | `--btn-accent-text` | `transparent` | `--btn-accent-hover` |
| `disabled` | any variant | opacity: 0.45 | any variant | no change, `cursor: not-allowed` |

#### Design Notes

- **Midnight primary:** Black button (`#000000`) with light text — the darkest element in the dark shell
- **Daylight primary:** Warm cream button (`#E8E5DD`) matching the window header/title bar — blends with the shell chrome, not a foreign element
- **No white buttons in Midnight.** Primary is black, secondary is dark surface.
- **No dark buttons in Daylight.** Primary is warm cream, secondary is white.
- **Accent (CTA):** Orange `#E8520A` in both schemes. Used for high-priority actions only.

#### Sizes

| Size | Height | Font | Horizontal padding | Icon size |
|------|--------|------|--------------------|-----------|
| `sm` | 28px | 12px, `font-medium` | 10px | 14px |
| `md` | 32px | 13px, `font-medium` | 12px | 14px |
| `lg` | 36px | 14px, `font-medium` | 16px | 16px |

#### CSS Properties (all variants)

```css
border-radius: var(--radius-md);     /* 6px */
font-weight: 500;                     /* font-medium */
font-family: inherit;                 /* Geist Sans */
display: inline-flex;
align-items: center;
gap: 6px;                             /* icon-to-label */
transition: background var(--duration-normal) var(--easing-default);
border: 1px solid [variant border token];
```

#### Mapping to Existing CSS Classes

| Token variant | CSS class |
|---------------|-----------|
| `primary` | `.desktop-interior-button-primary`, `.desktop-shell-button-primary` |
| `secondary` | `.desktop-interior-button-subtle`, `.desktop-shell-button` |
| `ghost` | `.desktop-interior-button-ghost` |
| `danger` | `.desktop-interior-button-danger` |
| `accent` | (new — no legacy alias) |

### Input / Select

| State | Border | Bg | Ring |
|-------|--------|----|------|
| `default` | `--input-border` | `--input-bg` | none |
| `hover` | `--color-border-hover` | `--input-bg` | none |
| `focus` | `--color-border-focus` | `--input-bg` | `--shadow-focus` |
| `error` | `--color-error` | `--input-bg` | error ring variant |
| `disabled` | `--color-border` | `--color-bg` | none, opacity 0.5 |

**Height:** 32px (matches button `md`). **Radius:** `--radius-md` (6px). **Inner padding:** 10px horizontal. **Font:** 13px, `font-normal`.

Error text: `--color-error`, 11px, displayed below input with 2px top margin.

### Select (Dropdown)

Trigger: same as Input styling, with chevron icon (14px) right-aligned, rotates 180° on open.

Dropdown panel:
- Background: `--menu-bg`
- Border: `1px solid var(--menu-border)`
- Radius: `--radius-lg` (8px)
- Shadow: `--shadow-md`
- Animation: `slideDown 120ms ease`
- Item padding: `7px 10px`
- Item hover: `--menu-hover`
- Selected item: text color `--color-accent`, check icon (14px)

### Checkbox

| State | Appearance |
|-------|-----------|
| Unchecked | 16×16px, `--radius-sm` (4px), `1.5px solid var(--color-border)`, transparent bg |
| Checked | `--color-accent` bg, white check icon (12px), no border |
| Hover | border color → `--color-border-hover` |
| Disabled | opacity 0.45 |

### Card

| Property | Token |
|----------|-------|
| Background | `--color-surface` |
| Border | `1px solid var(--color-border)` |
| Radius | `--radius-lg` (8px) |
| Padding | `--space-4` (16px) |
| Shadow | none by default |
| Hover | `--color-border-hover` border (optional, for interactive cards) |

#### Empty State Card

- Centered layout, icon at 28px, opacity 0.4
- Heading: 13px, `font-medium`, `--color-text-secondary`
- No border change on hover

### Badge

| Variant | Bg | Text |
|---------|-----|------|
| `default` | `--color-surface-hover` | `--color-text-secondary` |
| `success` | `--color-success-subtle` | `--color-success` |
| `warn` | `--color-warn-subtle` | `--color-warn` |
| `error` | `--color-error-subtle` | `--color-error` |
| `info` | `--color-info-subtle` | `--color-info` |

**Radius:** `--radius-full` (pill). **Height:** 22px. **Padding:** 0 8px. **Font:** 12px, `font-medium`.

### Menu (Dropdown)

| Property | Token |
|----------|-------|
| Background | `--menu-bg` |
| Border | `1px solid var(--menu-border)` |
| Radius | `--radius-lg` (8px) |
| Shadow | `--shadow-md` |
| Min width | 220px |
| Animation | `slideDown 150ms ease` |
| Item padding | `7px 12px` |
| Item icon | 16px, `--color-text-secondary` |
| Item text | 13px, `--color-text` |
| Item hover | `--menu-hover` bg |
| Item chevron | 14px, `--color-text-tertiary` (for sub-menus) |
| Item count badge | 11px, `--color-text-tertiary` |
| Divider | `1px solid var(--menu-divider)`, `4px` vertical margin |

CSS classes: `.desktop-taskbar-menu-item`, `.desktop-taskbar-menu-divider`

### Modal

| Property | Token |
|----------|-------|
| Overlay | `--overlay` |
| Background | `--color-surface` |
| Border | `1px solid var(--color-border)` |
| Radius | `--radius-xl` (12px) |
| Shadow | `--shadow-lg` |
| Max-width | `440px` (sm), `640px` (md), `800px` (lg) |
| Animation | `modalIn 250ms cubic-bezier(0,0,0.2,1)` |
| Title bar | `--color-text`, 14px, `font-semibold`, border-bottom `1px solid var(--color-border)`, padding `12px 16px` |
| Close button | 24×24px, `--radius-sm`, `--color-text-secondary`, ghost hover |
| Body padding | 16px |
| Action bar | `flex`, `justify-end`, `gap: 8px` |

### Table

| Element | Token |
|---------|-------|
| Container | `--radius-lg` (8px), `1px solid var(--color-border)`, overflow hidden |
| Header bg | `--color-surface-hover` |
| Header text | `--color-text-tertiary`, 11px, `font-semibold`, `uppercase`, `letter-spacing: 0.04em` |
| Row border | `1px solid var(--color-border)` (except last row) |
| Row hover | `--color-surface-hover` bg |
| Cell padding | `8px 12px` |
| Cell text | 13px, `--color-text` |
| Cell secondary | `--color-text-secondary` |
| Avatar (inline) | 24×24px, `--radius-full`, `--color-surface-active` bg, 11px initials, `font-semibold` |

### Taskbar

| Element | Token |
|---------|-------|
| Background | `--titlebar-bg` |
| Border | bottom `1px solid var(--color-border)` |
| Height | 40px |
| Max-width | 1200px (centered) |
| Brand mark | *sevenlayers* — 13px, `font-bold`, , lowercase, `letter-spacing: -0.02em` |
| Nav links | 13px, `font-medium`, `--color-text-secondary`, hover → `--color-surface-hover` bg + `--color-text` |
| Active nav | `1px solid var(--color-border-hover)` border, `--color-surface-hover` bg |
| Search icon | 16px, `--color-text-secondary`, 28×28px hit target |
| Avatar button | 28×28px, `--radius-full`, `1px solid var(--color-border)` |
| Theme toggle | 28px height, 10px horizontal padding, `--radius-sm`, `1px solid var(--color-border)`, `--color-surface-hover` bg, 12px font |
| Position | `sticky`, `top: 0`, `z-index: 50` |

CSS classes: `.desktop-topbar-link`, `.desktop-topbar-link-active`

### Window

| Element | Token |
|---------|-------|
| Container | 10px radius, `1px solid var(--window-border)`, `--shadow-md`, overflow hidden |
| Title bar | height 36px, `--titlebar-bg`, border-bottom `1px solid var(--color-border)`, padding `0 12px` |
| Title text | 12px, `font-medium`, `--titlebar-text`, centered |
| Traffic light dots | 12×12px, `--radius-full`, `1px solid var(--color-border)`, gap 6px |
| Close dot | `--titlebar-close` (red) |
| Min/max dots | `--titlebar-btn`, hover → `--titlebar-btn-hover` |
| Interior | `--color-surface` bg |

### Interior Tabs (within windows)

| Element | Token |
|---------|-------|
| Container | border-bottom `1px solid var(--color-border)`, padding `0 16px` |
| Tab | 13px, `font-normal` (400), `--color-text-secondary`, padding `10px 14px`, `margin-bottom: -1px` |
| Tab active | `font-semibold` (600), `--color-text`, border-bottom `2px solid var(--color-accent)` |
| Tab hover | color → `--color-text` |

CSS classes: `.desktop-interior-tab`, `.desktop-interior-tab-active`

---

## 9. Contrast Requirements (WCAG AA)

| Pair | Min Ratio | Midnight | Daylight |
|------|-----------|----------|----------|
| `text` on `bg` | 4.5:1 | ✅ ~17:1 | ✅ ~14:1 |
| `text-secondary` on `bg` | 4.5:1 | ✅ ~7:1 | ✅ ~5:1 |
| `text` on `surface` | 4.5:1 | ✅ ~14:1 | ✅ ~17:1 |
| `text-secondary` on `surface` | 4.5:1 | ✅ ~5:1 | ✅ ~5:1 |
| `accent` on `bg` | 3:1 | ✅ ~5:1 | ✅ ~4:1 |
| `btn-primary-text` on `btn-primary-bg` | 4.5:1 | ✅ ~17:1 | ✅ ~10:1 |
| `success/warn/error/info` on subtle bg | 3:1 | ✅ | ✅ |

CI will run automated contrast checks for all token pairs listed above via `axe-core`.

---

## 10. Style Family Reference

Cross-reference to existing CSS classes in `globals.css` (see `UI_STYLE_MAP.md` for full detail).

### Desktop Shell Chrome

| Class | Maps to |
|-------|---------|
| `.desktop-topbar-link` | Taskbar nav links |
| `.desktop-topbar-link-active` | Active taskbar nav |
| `.desktop-taskbar-menu` | Menu container |
| `.desktop-taskbar-menu-item` | Menu item row |
| `.desktop-taskbar-menu-divider` | Menu separator |
| `.desktop-taskbar-action` | Taskbar action buttons |
| `.desktop-taskbar-warning` | Taskbar warning state |
| `.desktop-window-tab` | Interior tab |
| `.desktop-window-tab-active` | Active interior tab |

### Shell Buttons

| Class | Maps to |
|-------|---------|
| `.desktop-shell-button` | Button secondary |
| `.desktop-shell-button-primary` | Button primary |
| `.desktop-shell-button-small` | Button sm size |
| `.desktop-shell-control-button` | Utility/icon button |

### Interior Controls

| Class | Maps to |
|-------|---------|
| `.desktop-interior-root` | Panel/form container |
| `.desktop-interior-header` | Panel header |
| `.desktop-interior-title` | Panel title |
| `.desktop-interior-tab-row` | Tab container |
| `.desktop-interior-tab` | Tab item |
| `.desktop-interior-tab-active` | Active tab item |
| `.desktop-interior-panel` | Interior content panel |
| `.desktop-interior-button-primary` | Button primary |
| `.desktop-interior-button-subtle` | Button secondary |
| `.desktop-interior-button-danger` | Button danger |
| `.desktop-interior-button-ghost` | Button ghost |
| `.desktop-interior-input` | Input default |
| `.desktop-interior-select` | Select default |
| `.desktop-interior-textarea` | Textarea default |

### Legacy Aliases (compatibility only — do not use in new code)

- `.retro-button` → `.desktop-shell-button`
- `.retro-button-primary` → `.desktop-shell-button-primary`
- `.retro-button-small` → `.desktop-shell-button-small`
- `.beveled-button` → `.desktop-shell-button`
- `.beveled-button-primary` → `.desktop-shell-button-primary`
- `.beveled-button-sm` → `.desktop-shell-button-small`

### React Primitives

Recommended shared component path:
```
src/components/window-content/shared/interior-primitives.tsx
```

---

## 11. CI Enforcement Rules

### Hard-fail Patterns (`check-ui-design-drift.sh`)

```bash
# Block raw color values outside token files
BLOCK_RAW_HEX='#[0-9a-fA-F]{3,8}'
BLOCK_RAW_RGB='rgba?\('
BLOCK_RAW_HSL='hsla?\('
BLOCK_RAW_OKLCH='oklch\('

# Block non-token spacing (magic numbers)
BLOCK_RAW_PX='[^-]\d+px'  # except inside token definitions

# Block non-token radius/shadow
BLOCK_RAW_RADIUS='border-radius:\s*\d'
BLOCK_RAW_SHADOW='box-shadow:\s*\d'

# Block disallowed utility classes
BLOCK_UTILS='(bg-black|bg-white|text-black|text-white|border-gray-\d|shadow-[^(])'

# Block modal overlays inside window-content surfaces (use in-window navigation/panels instead)
BLOCK_WINDOW_MODAL='(fixed\s+inset-0|inset-0\s+fixed|aria-modal=|modal-overlay-bg)'

# Block uppercase brand name
BLOCK_BRAND='sevenlayers|sevenlayers|sevenlayers'
```

### Allowed Exceptions

- Files matching `**/tokens/**`, `**/globals.css`, `**/tailwind.config.*`
- SVG `fill` / `stroke` using `currentColor` only
- Third-party imported stylesheets (node_modules)
- Design token contract file itself

### Visual Snapshots (`ui-visual-regression.spec.ts`)

Screens to snapshot in **both** Midnight and Daylight:

1. Login / Auth
2. Dashboard (empty state + populated)
3. Settings page
4. Modal (open state)
5. Table (with data)
6. Form (default + error states)
7. Menu (open dropdown)
8. Window (with tabs, interior content)

### Automated Contrast Checks

Run `axe-core` or `color-contrast` checks against all semantic token pairs on every PR.

---

## 12. Rollout Phases

| Phase | Scope | CI Behavior |
|-------|-------|-------------|
| Phase 1 | New code only | Fail on new drift; warn on existing |
| Phase 2 | Generate debt report by area | Fail on new; report on existing debt |
| Phase 3 | Full lock | Fail on any raw value anywhere |

---

## Quick Reference Summary

```
Brand:     *sevenlayers* — always lowercase 

Accent:    #E8520A (orange) — BOTH schemes

Scheme A: "Midnight" (Dark)
  bg: #0A0A0A | surface: #141414 | surface-hover: #1E1E1E | surface-active: #252525
  text: #EDEDED | text-2nd: #888888 | text-3rd: #555555
  border: #262626 | border-hover: #3A3A3A | border-focus: #E8520A
  accent: #E8520A | accent-hover: #CC4709 | info: #3B82F6
  success: #34D399 | warn: #FBBF24 | error: #EF4444
  btn-primary: #000000 bg, #EDEDED text, #333333 border
  btn-secondary: #1E1E1E bg, #CCCCCC text, #333333 border
  btn-accent: #E8520A bg, #FFFFFF text
  titlebar: #0D0D0D | window: #111111 | menu: #141414
  input: #0F0F0F bg, #262626 border | code: #0D0D0D
  shadow-sm: 0.5α | shadow-md: 0.65α | shadow-lg: 0.8α
  overlay: rgba(0,0,0,0.65)

Scheme B: "Daylight" (Light)
  bg: #F4F3EF | surface: #FFFFFF | surface-hover: #F7F7F5 | surface-active: #EFEEEB
  text: #1A1A1A | text-2nd: #6B6B6B | text-3rd: #A0A09B
  border: #E0DDD6 | border-hover: #CCC9C0 | border-focus: #E8520A
  accent: #E8520A | accent-hover: #CC4709 | info: #2563EB
  success: #16A34A | warn: #D97706 | error: #DC2626
  btn-primary: #E8E5DD bg, #1A1A1A text, #C4BFB3 border
  btn-secondary: #FFFFFF bg, #1A1A1A text, #E0DDD6 border
  btn-accent: #E8520A bg, #FFFFFF text
  titlebar: #F4F3EF | window: #FFFFFF | menu: #FFFFFF
  input: #FFFFFF bg, #E0DDD6 border | code: #F7F7F5
  shadow-sm: 0.05α | shadow-md: 0.07α | shadow-lg: 0.10α
  overlay: rgba(0,0,0,0.35)

Fonts:     Geist Sans (UI) / Geist Mono (code) / Instrument Serif (editorial)
           Playfair Display (brand) / Press Start 2P (retro)
Spacing:   4px base → 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
Radius:    0, 4, 6, 8, 12, 16, 9999
Icons:     Lucide only (outline, 1.5px stroke, currentColor, monochrome)
Buttons:   Always outlined (1px solid border) — no borderless buttons
```
