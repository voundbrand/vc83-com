# Theme Color Reference

Complete reference for fixing theme issues and using CSS variables properly.

**Use this document when:**
- You find hardcoded colors that don't respect dark mode
- You need to know which CSS variable to use for a specific purpose
- Components look wrong in certain themes

---

## 🔧 Quick Fix Guide: Hardcoded Colors

### Common Patterns to Replace

| ❌ Hardcoded | ✅ Use Instead | When |
|-------------|---------------|------|
| `'white'` / `'#ffffff'` | `'var(--win95-bg-light)'` | Button backgrounds |
| `'white'` / `'#ffffff'` | `'var(--win95-titlebar-text)'` | Text on colored headers |
| `text-white` (className) | `style={{ color: 'var(--win95-titlebar-text)' }}` | Header text |
| `'#000000'` / `'black'` | `'var(--win95-text)'` | Regular text |
| `'#808080'` | `'var(--win95-text-secondary)'` | Muted text |
| `'blue'` / `'#0000ff'` | `'var(--win95-highlight)'` | Accent colors |
| `bg-white` (className) | `style={{ background: 'var(--win95-bg-light)' }}` | Backgrounds |

### Button Color Mapping

| Button Type | Background | Text Color |
|-------------|------------|------------|
| Primary CTA | `var(--win95-highlight)` | `var(--win95-titlebar-text)` |
| Secondary | `var(--win95-bg-light)` | `var(--win95-text)` |
| Danger | `var(--error)` | `white` (hardcoded OK) |
| Success | `var(--success)` | `white` (hardcoded OK) |
| Ghost/Subtle | `transparent` | `var(--win95-text)` |

### Header/Titlebar Color Mapping

| Element | Background | Text Color |
|---------|------------|------------|
| Window titlebar | `var(--win95-highlight)` | `var(--win95-titlebar-text)` |
| Modal header | `var(--win95-highlight)` | `var(--win95-titlebar-text)` |
| Section header | `var(--win95-bg-light)` | `var(--win95-text)` |
| Gradient header | `linear-gradient(...var(--win95-highlight)...var(--win95-gradient-end)...)` | `var(--win95-titlebar-text)` |

### How to Find Issues

Search for hardcoded colors in components:
```bash
# Find hardcoded white
grep -r "text-white" src/components/
grep -r "'white'" src/components/
grep -r '"white"' src/components/
grep -r "#ffffff" src/components/

# Find hardcoded black
grep -r "'black'" src/components/
grep -r "#000000" src/components/
```

---

## ⚠️ CRITICAL: Where Colors Are Actually Defined

**The theme-context.tsx JavaScript theme objects are the AUTHORITATIVE source for theme colors.**

The `ThemeProvider` component applies theme colors via `root.style.setProperty()` which creates inline styles. These have HIGHER CSS specificity than any CSS file, including globals.css.

### Color Precedence (highest to lowest):
1. **theme-context.tsx theme objects** - Inline styles applied via `setProperty()` ✅ WINS
2. **globals.css `.dark` class** - CSS custom properties (overridden by #1)
3. **globals.css `:root`** - Base CSS custom properties

### To Update Theme Colors:
1. **Edit theme-context.tsx** - Find the theme object (e.g., `clean-dark`) and update its `colors` property
2. globals.css `.dark` values are only fallbacks - they won't take effect if a theme sets the same property

---

## CSS Variables Reference

Complete reference of all CSS variables in `globals.css` for light and dark modes.

---

## 1. Core Background & Foreground

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--background` | `#008080` | `#121212` | Desktop/page background |
| `--foreground` | `#1f2937` | `#b0b0b0` | Default text color |

---

## 2. Window Backgrounds & Borders

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-bg` | `#f0f0f0` | `#1a1a1a` | Window content background |
| `--win95-bg-light` | `#ffffff` | `#222222` | Lighter panels/cards |
| `--win95-border` | `#d0d0d0` | `#0a0a0a` | Primary border |
| `--win95-border-dark` | `#a0a0a0` | `#000000` | Darker border accent |
| `--win95-border-light` | `#e8e8e8` | `#2a2a2a` | Lighter border accent |

---

## 3. Text Colors

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-text` | `#1f2937` | `#b0b0b0` | Primary text |
| `--win95-text-secondary` | `#6b7280` | `#707070` | Secondary/muted text |
| `--win95-text-muted` | `#6b7280` | `#606060` | Even more muted text |

---

## 4. Primary/Highlight Colors (THE ISSUE)

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-highlight` | `#000080` | `#2a3f5f` | Primary accent (navy blue → muted blue) |
| `--primary` | `#000080` | `#2a3f5f` | Same as highlight |
| `--primary-gradient-end` | `#6366f1` | `#3d4f6f` | Gradient end color |
| `--win95-gradient-end` | `#4040a0` | `#3d4f6f` | Window/header gradient end |

---

## 5. Hover & Active States

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-hover-bg` | `#000080` | `#2a3f5f` | Hover background |
| `--win95-hover-text` | `#ffffff` | `#c0c0c0` | Text on hover |
| `--win95-hover-light` | `#e8e8e8` | `#252525` | Subtle hover for buttons |
| `--win95-selected-bg` | `#000080` | `#2a3f5f` | Selected item background |
| `--win95-selected-text` | `#ffffff` | `#c0c0c0` | Selected item text |
| `--win95-active-border` | `#000000` | `#2a2a2a` | Active element border |

---

## 6. Button States

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-button-face` | `#c0c0c0` | `#1a1a1a` | Button background |
| `--win95-button-light` | `#ffffff` | `#2a2a2a` | Button highlight edge |
| `--win95-button-dark` | `#808080` | `#0f0f0f` | Button shadow edge |
| `--win95-button-darkest` | `#000000` | `#000000` | Deep shadow |
| `--win95-button-hover` | `#d0d0d0` | `#252525` | Button hover state |

---

## 7. Titlebar & Window Elements

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-titlebar` | gradient `#000080→#4040a0` | gradient `#1f2937→#2a3f5f` | Titlebar gradient |
| `--win95-titlebar-inactive` | gradient `#808080→#a0a0a0` | gradient `#1a1a1a→#121212` | Inactive titlebar |
| `--win95-titlebar-text` | `#ffffff` | `#a0a0a0` | Titlebar text |
| `--win95-window-icon-bg` | `#c0c0c0` | `#222222` | Window icon background |
| `--win95-window-icon-border` | `#808080` | `#0f0f0f` | Window icon border |
| `--win95-title-bg` | `#d0d0d0` | `#1a1a1a` | Title background |

---

## 8. Input & Form Elements

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--win95-input-bg` | `#ffffff` | `#121212` | Input background |
| `--win95-input-text` | `#000000` | `#b0b0b0` | Input text |
| `--win95-input-border-dark` | `#808080` | `#000000` | Input dark border |
| `--win95-input-border-light` | `#ffffff` | `#2a2a2a` | Input light border |
| `--win95-input-placeholder` | `#808080` | `#505050` | Placeholder text |
| `--win95-input-focus-outline` | `#000080` | `#3d4f6f` | Focus outline |

---

## 9. Semantic Colors

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--error` | `#ef4444` | `#a03030` | Error red |
| `--error-bg` | `#fef2f2` | `rgba(80,20,20,0.5)` | Error background |
| `--success` | `#10b981` | `#0a7050` | Success green |
| `--success-bg` | `#f0fdf4` | `rgba(10,50,30,0.5)` | Success background |
| `--warning` | `#f59e0b` | `#a07020` | Warning yellow |
| `--warning-bg` | `#fffbeb` | `rgba(80,40,10,0.5)` | Warning background |
| `--info` | `#3b82f6` | `#2a5090` | Info blue |
| `--info-bg` | `#eff6ff` | `rgba(20,40,80,0.5)` | Info background |
| `--neutral-gray` | `#6b7280` | (same) | Neutral gray |

---

## 10. Audio Player (Terminal Style)

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--audio-player-bg` | `#000000` | `#000000` | Player background |
| `--audio-player-text` | `#00ff00` | `#00aa00` | Terminal green text |
| `--audio-player-track-bg` | `#1a1a1a` | `#0a0a0a` | Track background |
| `--audio-player-progress` | `#00ff00` | `#00aa00` | Progress bar green |

---

## 11. Table Styles

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--table-header-bg` | `#d0d0d0` | `#1a1a1a` | Header background |
| `--table-header-text` | `#000000` | `#909090` | Header text |
| `--table-row-even-bg` | `#f0f0f0` | `#151515` | Even row |
| `--table-row-odd-bg` | `#ffffff` | `#1a1a1a` | Odd row |
| `--table-row-hover-bg` | `#e8e8ff` | `#222222` | Row hover |
| `--table-border` | `#c0c0c0` | `#0a0a0a` | Table borders |
| `--table-sort-arrow` | `#808080` | `#606060` | Sort arrow color |

---

## 12. Modal/Dialog Styles

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--modal-overlay-bg` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.85)` | Overlay |
| `--modal-bg` | `#f0f0f0` | `#1a1a1a` | Modal background |
| `--modal-header-bg` | gradient `#000080→#4040a0` | gradient `#1f2937→#2a3f5f` | Header gradient |
| `--modal-header-text` | `#ffffff` | `#a0a0a0` | Header text |
| `--modal-border` | `#000000` | `#0a0a0a` | Modal border |

---

## 13. Status Badge Colors

| Badge | Light BG | Light Text | Dark BG | Dark Text |
|-------|----------|------------|---------|-----------|
| Super Admin | `#7c3aed` | `#ffffff` | `#4a2a7d` | `#c0c0c0` |
| Org Owner | `#dc2626` | `#ffffff` | `#7d2a2a` | `#c0c0c0` |
| Manager | `#2563eb` | `#ffffff` | `#1a3a6d` | `#c0c0c0` |
| Employee | `#16a34a` | `#ffffff` | `#1a5a3a` | `#c0c0c0` |
| Viewer | `#6b7280` | `#ffffff` | `#3a3a3a` | `#a0a0a0` |
| Pending | `#fbbf24` | `#000000` | `#6d5a1a` | `#c0c0c0` |
| Active | `#34d399` | `#000000` | `#1a5a3a` | `#c0c0c0` |
| Inactive | `#f87171` | `#000000` | `#5a2a2a` | `#c0c0c0` |

---

## 14. Notification Colors

| Type | Light BG | Light Border | Light Text | Dark BG | Dark Border | Dark Text |
|------|----------|--------------|------------|---------|-------------|-----------|
| Success | `#d1fae5` | `#16a34a` | `#14532d` | `#0a2a1a` | `#1a5a3a` | `#70a090` |
| Error | `#fee2e2` | `#dc2626` | `#7f1d1d` | `#2a0a0a` | `#5a2a2a` | `#a07070` |
| Info | `#e9d5ff` | `#9333ea` | `#581c87` | `#1a1a3a` | `#3a3a6a` | `#8080a0` |

---

## 15. Glass/Blur Effects

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--glass-bg` | `rgba(255,255,255,0.7)` | `rgba(10,10,10,0.85)` | Glass background |
| `--glass-bg-light` | `rgba(255,255,255,0.85)` | `rgba(20,20,20,0.9)` | Lighter glass |
| `--glass-border` | `rgba(255,255,255,0.2)` | `rgba(255,255,255,0.05)` | Glass border |

---

## 16. Desktop Elements

| Variable | Light Mode | Dark Mode | Notes |
|----------|------------|-----------|-------|
| `--desktop-icon-text` | `#ffffff` | `#909090` | Icon label text |
| `--desktop-icon-hover-bg` | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.05)` | Icon hover |
| `--desktop-icon-active-bg` | `rgba(0,0,128,0.3)` | `rgba(42,63,95,0.3)` | Icon active |

---

## 17. CRM Pipeline Stage Colors

| Stage | Light BG | Light Border | Dark BG | Dark Border |
|-------|----------|--------------|---------|-------------|
| Lead | `rgba(254,243,199,0.3)` | `rgba(250,204,21,0.5)` | `rgba(254,243,199,0.05)` | `rgba(250,204,21,0.2)` |
| Prospect | `rgba(219,234,254,0.3)` | `rgba(147,197,253,0.5)` | `rgba(219,234,254,0.05)` | `rgba(147,197,253,0.2)` |
| Customer | `rgba(220,252,231,0.3)` | `rgba(134,239,172,0.5)` | `rgba(220,252,231,0.05)` | `rgba(134,239,172,0.2)` |
| Partner | `rgba(224,231,255,0.3)` | `rgba(199,210,254,0.5)` | `rgba(224,231,255,0.05)` | `rgba(199,210,254,0.2)` |

---

## 18. Scrollbar

| Variable | Light Mode | Dark Mode |
|----------|------------|-----------|
| `--win95-scrollbar-track` | `#c0c0c0` | `#121212` |
| `--win95-scrollbar-thumb` | `#808080` | `#2a2a2a` |
| `--win95-scrollbar-button` | `#c0c0c0` | `#1a1a1a` |

---

## Window Style Overrides

### Windows Style Dark Mode
```css
.dark[data-window-style="windows"] {
  --win95-highlight: #1f2937;
  --win95-gradient-end: #2a3f5f;
  --win95-bg-light: #1a1a1a;
  --win95-bg: #121212;
}
```

### Mac Style Dark Mode
```css
.dark[data-window-style="mac"] {
  --win95-highlight: #1f2937;
  --win95-gradient-end: #2a3f5f;
  --win95-bg-light: #1a1a1a;
  --win95-bg: #121212;
}
```

### Shadcn Style Dark Mode
```css
.dark[data-window-style="shadcn"] {
  --win95-highlight: #1f2937;
  --win95-gradient-end: #2a3f5f;
  --win95-bg-light: #1a1a1a;
  --win95-bg: #121212;
}
```

---

## Color Palette Visual Reference

### Light Mode Grays
- `#ffffff` - Pure white (bg-light, inputs)
- `#f0f0f0` - Very light gray (bg)
- `#e8e8e8` - Light gray (borders, hover)
- `#d0d0d0` - Medium light gray (borders)
- `#c0c0c0` - Classic Win95 gray (buttons)
- `#a0a0a0` - Medium gray (dark borders)
- `#808080` - Medium-dark gray (shadows)
- `#6b7280` - Text secondary
- `#1f2937` - Near black (text)
- `#000000` - Pure black

### Dark Mode Grays
- `#222222` - Lightest dark (bg-light)
- `#1a1a1a` - Very dark gray (bg)
- `#151515` - Darker gray (table rows)
- `#121212` - Near black (background)
- `#0f0f0f` - Very dark (button dark)
- `#0a0a0a` - Almost black (borders)
- `#000000` - Pure black

### Accent Blues
- Light: `#000080` (Navy blue)
- Light gradient: `#4040a0` → `#6366f1` (Indigo)
- Dark: `#2a3f5f` (Muted dark blue)
- Dark gradient: `#1f2937` → `#3d4f6f` (Subtle blue-gray)
