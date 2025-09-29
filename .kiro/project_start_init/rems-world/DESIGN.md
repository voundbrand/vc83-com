# Rem's World UI Design System

## 🎨 Design Philosophy

Rem's World embodies the raw, technological aesthetic of 1980s computing - when computers were mysterious, powerful machines. The interface features a dark, slate-based color scheme with purple accents, reminiscent of terminal screens and early GUI systems.

## 🎯 Core Design Principles

1. **80s Authenticity**: Channel the era of CRT monitors, early GUIs, and cyberpunk aesthetics
2. **Dark & Moody**: Deep slate grays create a sophisticated, easy-on-the-eyes environment
3. **Purple Power**: Strategic purple accents add that retro-futuristic flair
4. **Minimalist Tech**: Clean lines and geometric shapes, no unnecessary ornamentation
5. **Terminal Inspired**: Monospace fonts and grid-based layouts

## 🌈 Color Palette

### Primary Colors

```css
--bg-primary: #1e1e20; /* Main background - deep slate */
--bg-secondary: #2a2a2e; /* Secondary surfaces - medium slate */
--bg-tertiary: #35353a; /* Tertiary elements - lighter slate */
--bg-accent: #8b5cf6; /* Purple accent - retro violet */
--bg-dark: #151517; /* Darkest background - near black */
```

### Text Colors

```css
--text-primary: #e4e4e7; /* Main text - light gray */
--text-secondary: #a1a1aa; /* Secondary text - medium gray */
--text-tertiary: #71717a; /* Disabled/subtle text - dark gray */
--text-inverse: #18181b; /* Text on light backgrounds */
--text-accent: #c084fc; /* Accent text - light purple */
```

### Border & UI Colors

```css
--border-primary: #3f3f46; /* Main borders - dark slate */
--border-secondary: #52525b; /* Hover/active borders - medium slate */
--border-accent: #7c3aed; /* Accent borders - deep purple */
```

### System Colors

```css
--system-gray: #6b7280;
--system-purple-light: #a78bfa;
--system-purple: #8b5cf6;
--system-purple-dark: #7c3aed;
--system-green: #10b981;
--system-red: #ef4444;
--system-blue: #3b82f6;
```

## 🪟 Window System

### Window Structure

- **Border**: 1px solid #3f3f46 (slate border)
- **Border Radius**: 0px (sharp 80s corners)
- **Background**: #2a2a2e (medium slate)
- **Shadow**: `0 0 20px rgba(139, 92, 246, 0.1), 0 4px 6px rgba(0, 0, 0, 0.8)` (purple glow + depth)

### Window Header

- **Height**: 28px
- **Background**: `linear-gradient(to bottom, #35353a, #2a2a2e)` (slate gradient)
- **Border Bottom**: 1px solid #3f3f46
- **Font**: 12px, bold, monospace
- **Text Color**: #e4e4e7 with purple glow on active
- **Active Window**: Purple accent line at top (2px solid #8b5cf6)

### Window Controls

- **Size**: 14px × 14px
- **Style**: Flat squares with subtle borders
- **Colors**: #3f3f46 background, #52525b border
- **Hover**: #8b5cf6 background (purple), #a78bfa border
- **Active**: #7c3aed background

## 🖥️ Desktop Environment

### Desktop Background

- **Base Color**: #151517 (deep slate, almost black)
- **Grid Pattern**: Purple (#8b5cf6) grid at 2% opacity, 32px spacing
- **CRT Effect**: Subtle horizontal scanlines with slight flicker
- **Noise Texture**: Fine grain for that analog monitor feel

### Desktop Icons

- **Size**: 64px × 64px icon, 96px total width
- **Icon Background**: #1e1e20 with 1px #3f3f46 border
- **Label**: 11px monospace on transparent background
- **Text Shadow**: 0 1px 2px rgba(0, 0, 0, 0.8)
- **Hover Effect**: Purple glow (#8b5cf6) and slight scale

### Top Menu Bar

- **Height**: 32px
- **Background**: #1e1e20 with bottom gradient fade
- **Border**: 1px solid #3f3f46 on bottom
- **Typography**: 13px bold for branding, 12px regular for menu items
- **Active Item**: Purple background (#8b5cf6) with #18181b text

## 🔤 Typography

### Font Stack

```css
font-family: "Terminus", "IBM Plex Mono", "Roboto Mono", "Courier New", monospace;
```

### Font Sizes

- **Window Titles**: 12px bold
- **Menu Items**: 12px regular
- **Body Text**: 12px-14px
- **Headers**: 16px-20px bold
- **Small Text**: 10px-11px
- **Terminal Text**: 13px

### Text Styling

- **Letter Spacing**: 0.8px for headers, 0.5px for body
- **Text Transform**: UPPERCASE for system UI only
- **Line Height**: 1.4 for readability
- **Text Rendering**: optimizeLegibility

## 🎛️ Interactive Elements

### Buttons

```css
.btn {
  padding: 8px 20px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 0;
  border: 1px solid;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  transition: all 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}
```

### Primary Button

- **Background**: #8b5cf6 (purple)
- **Border**: #7c3aed
- **Text**: White
- **Hover**: #a78bfa (lighter purple)
- **Active**: #7c3aed with inset shadow

### Secondary Button

- **Background**: #2a2a2e
- **Border**: #3f3f46
- **Text**: #e4e4e7
- **Hover**: #35353a
- **Active**: #1e1e20

### Feature Cards

- **Background**: #1e1e20
- **Border**: 1px solid #3f3f46
- **Hover Border**: #8b5cf6 (purple glow)
- **Box Shadow**: 0 0 20px rgba(139, 92, 246, 0.2) on hover

## 🎭 Visual Effects

### CRT Monitor Effect

```css
/* Scanlines - more pronounced for 80s feel */
background: repeating-linear-gradient(
  0deg,
  rgba(0, 0, 0, 0.25),
  rgba(0, 0, 0, 0.25) 1px,
  transparent 1px,
  transparent 2px
);

/* Purple phosphor glow */
text-shadow: 0 0 3px rgba(139, 92, 246, 0.5);
```

### Window Shadows

- **Active Window**: Purple glow shadow `0 0 30px rgba(139, 92, 246, 0.3)`
- **Inactive Window**: Standard depth `0 4px 12px rgba(0, 0, 0, 0.6)`
- **Dragging**: Enhanced glow and 95% opacity

### Hover States

- **Desktop Icons**: Purple pulse glow
- **Buttons**: Brightness increase + purple tint
- **Links**: Transition to #c084fc (light purple)
- **Windows**: Subtle purple border glow

### 80s Special Effects

- **Neon Glow**: Purple text-shadow for headers
- **Grid Overlay**: Subtle purple grid on backgrounds
- **Noise Pattern**: Film grain texture overlay
- **Flicker Effect**: Occasional CRT flicker animation

## 📐 Layout Guidelines

### Spacing

- **Base Unit**: 8px (true to 80s grid systems)
- **Icon Grid**: 128px spacing
- **Window Padding**: 16px-20px
- **Element Gap**: 8px-16px

### Window Positioning

- **Initial Offset**: Center screen with slight randomization
- **Grid Snap**: 8px grid alignment
- **Z-Index**: Start at 1000, increment by 10

## 🚫 Design Don'ts

1. **No Rounded Corners**: Sharp edges only - pure 80s
2. **No Smooth Animations**: Quick, snappy transitions (100ms max)
3. **No Soft Shadows**: Hard shadows with optional purple glow
4. **No Pastels**: Deep, saturated colors only
5. **No Modern UI Patterns**: Stick to 80s computing metaphors

## 📋 Component Checklist

When creating new components, ensure:

- [ ] Uses monospace font from the stack
- [ ] Has 1px borders in slate colors
- [ ] Sharp corners (no border radius)
- [ ] Follows slate + purple color palette
- [ ] Has purple glow hover states
- [ ] Grid-aligned to 8px units
- [ ] Dark slate backgrounds
- [ ] 80s-appropriate styling

## 🎯 Quick Reference

```css
/* Window Template */
.retro-window {
  background: #2a2a2e;
  border: 1px solid #3f3f46;
  box-shadow:
    0 0 20px rgba(139, 92, 246, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.8);
}

/* Button Template */
.retro-button {
  background: #8b5cf6;
  border: 1px solid #7c3aed;
  color: white;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 20px;
  letter-spacing: 0.8px;
  transition: all 0.1s ease;
}

/* Text Styles */
.retro-title {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
}

.retro-body {
  font-size: 13px;
  line-height: 1.4;
  color: #e4e4e7;
}

/* 80s Glow Effect */
.neon-glow {
  text-shadow:
    0 0 10px rgba(139, 92, 246, 0.8),
    0 0 20px rgba(139, 92, 246, 0.6),
    0 0 30px rgba(139, 92, 246, 0.4);
}
```

## 🔧 Implementation Notes

1. **Image Rendering**: Set to `pixelated` for authentic 80s look
2. **Font Smoothing**: Use `antialiased` for clean monospace
3. **Transitions**: Keep them fast (100ms) and snappy
4. **Focus States**: Purple glow outline (#8b5cf6)
5. **Disabled States**: 40% opacity with reduced glow
6. **Active States**: Deeper purple (#7c3aed) with inset shadow
7. **Loading States**: Purple pulsing animation
8. **Error States**: Red (#ef4444) with same glow treatment

## 🌟 80s Design Elements to Include

- Terminal-style text entry with blinking cursor
- ASCII art borders and dividers
- Dot matrix printer style fonts for special text
- VHS tracking lines for transitions
- Synthwave-inspired gradients (purple to pink)
- Geometric patterns and grids
- Retro computer boot sequences
- Command-line inspired interfaces

This design system creates an authentic 1980s computing experience with modern dark theme sensibilities, using slate grays as the foundation and purple as the defining accent color.
