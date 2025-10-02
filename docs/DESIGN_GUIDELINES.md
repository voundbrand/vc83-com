# Layer Cake Design Guidelines

A retro-inspired, Windows 95-flavored design system for the L4YERCAK3 platform. We blend nostalgic OS aesthetics with modern usability to create a "layered" workspace that feels cozy, modular, and empowering for startups. The goal: Evoke the joy of stacking floppy disks while delivering seamless martech tools.

> **🎨 Important**: For detailed theme usage and CSS variables, see [Theme System Guide](./THEME_SYSTEM.md)

## Core Principles
1. **Retro Nostalgia with Modern Polish**: Mimic Windows 95's chunky borders, gradients, and title bars, but use Tailwind for responsiveness and accessibility. No pixel-perfect recreation—focus on evoking the era.
2. **Layered Hierarchy**: Use visual "layers" (shadows, z-index) to represent tool stacking. Primary actions pop; secondary fade into the desktop.
3. **Accessibility First**: High contrast (WCAG AA), keyboard nav, and semantic HTML. Retro doesn't mean unusable.
4. **Thematic Consistency**: Subtle cake motifs (gradients in browns/beiges) nod to "L4YERCAK3" without overwhelming.
5. **Modularity**: Windows are self-contained; desktop is a neutral canvas.

## Color Palette
Inspired by Win95 grays with cake warmth.

| Color | Hex | Usage |
|-------|-----|-------|
| **Win95 Background** | `#c0c0c0` → `#f0f0f0` (gradient) | Window bodies, desktop bg |
| **Win95 Border** | `#c0c0c0` | Window frames, buttons |
| **Win95 Titlebar** | `#dfdfdf` → `#f0f0f0` (gradient) | Title bars |
| **Win95 Text** | `#000080` | Headings, links |
| **Win95 Highlight** | `#0000ff` | Primary buttons, accents |
| **Layer Cake Primary** | `#8b4513` (saddle brown) | Icons, CTAs |
| **Layer Cake Accent** | `#deb887` (burlywood) | Gradients, highlights |
| **Neutral Gray** | `#6b7280` | Secondary text |
| **Error** | `#ef4444` | Close buttons, errors |
| **Success** | `#10b981` | Save confirmations |

- **Dark Mode**: Future-proof with `dark:` variants—swap to deeper grays (#2d2d2d) and invert highlights.

## Typography
- **Font Stack**: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` (system fonts for retro feel).
- **Scale**:
  - H1: 1.875rem bold (window titles).
  - H2: 1.25rem semibold (sections).
  - Body: 0.875rem normal.
  - Small: 0.75rem (footers).
- **Line Height**: 1.5 for body; 1.25 for headings.
- **Weights**: 400 (regular), 600 (medium), 700 (bold)—no lights for legibility.

## Spacing & Layout
- **Grid/Breaks**: 4px base unit (e.g., p-1 = 4px, p-4 = 16px).
- **Windows**: Min 300x400px; max flexible. Use flex/col for content flow.
- **Desktop**: Full viewport; icons in 8x8 grid (64px gutters).
- **Shadows**: Subtle `shadow-lg` with custom `--win95-shadow` for depth.

## Components
### Windows
- **Structure**: `.retro-window` class: Bordered box with title bar (`.retro-titlebar`).
- **Title Bar**: Left: Title; Right: Min/Max/Close orbs (12px circles).
- **Body**: Scrollable, padded content; footer for actions.
- **Drag/Resize**: Use react-rnd for interactivity.

### Buttons
- **Primary**: `.retro-button-primary` (blue bg, white text).
- **Secondary**: `.retro-button` (gray gradient, blue text).
- **Hover**: Subtle lift (`translate-y-[-1px]`) + color shift.

### Forms
- **Inputs/Textareas**: Bordered (`border-slate-300`), focus: blue ring.
- **Labels**: Above, semibold, 0.875rem.
- **Validation**: Red borders on error; green on success.

### Icons & Emojis
- **Emojis**: Use sparingly (e.g., 🍰 for branding); `.layercake-emoji` for sizing.
- **Icons**: Lucide React or Heroicons; 20px, `--win95-text` color.

## Interactions & Animations
- **Transitions**: 150ms ease-in-out for hovers, opens (Tailwind `transition`).
- **Window Open**: Fade-in + scale from center (0.95 → 1).
- **Focus**: Blue outline (`.focus:ring-2 ring-blue-500`).
- **Loading**: Spinner in title bar (gray, 1rem).

## Responsive Design
- **Mobile**: Stack windows vertically; touch-friendly buttons (min 44px).
- **Breakpoints**: sm: 640px (icon grid adjusts), md: 768px (sidebars), lg: 1024px (full desktop).

## Usage in Code
- Import `global.css` in `layout.tsx`.
- Wrap windows: `<div className="retro-window">...</div>`.
- **Theming**: Always use CSS variables - see [Theme System Guide](./THEME_SYSTEM.md) for complete documentation.
  - ✅ DO: `style={{ color: 'var(--win95-text)' }}`
  - ❌ DON'T: `className="text-gray-800"`

## Future Expansions
- **Themes**: User-selectable (e.g., "Win98" with bolder gradients).
- **Custom Icons**: Org uploads for window icons.
- **Animations**: Framer Motion for drag/drop stacking.

This system keeps Layer Cake feeling like a '90s power tool—fun, functional, and infinitely stackable. Questions? Let's iterate!