# Theme System Guide

Complete guide for using the centralized theme system when building apps and windows for the Layer Cake platform.

## Table of Contents
1. [Overview](#overview)
2. [Available CSS Variables](#available-css-variables)
3. [Available Themes](#available-themes)
4. [How to Use Themes in Your App](#how-to-use-themes-in-your-app)
5. [Component Examples](#component-examples)
6. [Best Practices](#best-practices)
7. [Testing Your Theme Support](#testing-your-theme-support)

---

## Overview

The Layer Cake platform uses a **centralized theme system** powered by CSS variables. This ensures that:
- **All windows and apps** automatically adapt to theme changes
- **No hardcoded colors** - everything responds to user preferences
- **Dark mode support** works out of the box
- **Consistent UI** across the entire platform

### Key Principle
**❌ NEVER use hardcoded colors** (e.g., `text-gray-700`, `bg-white`, `#808080`)
**✅ ALWAYS use CSS variables** (e.g., `style={{ color: 'var(--win95-text)' }}`)

---

## Available CSS Variables

### Desktop & Window Colors
```css
/* Desktop background (changes per theme) */
--background: #008080;           /* Teal for default Win95 */

/* Window backgrounds */
--win95-bg: #f0f0f0;            /* Main window background */
--win95-bg-light: #ffffff;       /* Lighter sections (headers, panels) */

/* Borders */
--win95-border: #d0d0d0;        /* Standard borders */
--win95-border-light: #e8e8e8;  /* Lighter borders for subtle dividers */

/* Text colors */
--win95-text: #1f2937;          /* Primary text (dark gray) */
--foreground: #1f2937;          /* General foreground text */

/* Accent color */
--win95-highlight: #000080;     /* Titlebar blue, primary buttons */
```

### Hover & Interactive States
```css
/* Hover states for menus and buttons */
--win95-hover-bg: #000080;      /* Menu hover background (Windows 95 blue) */
--win95-hover-text: #ffffff;    /* White text on hover */
--win95-hover-light: #e8e8e8;   /* Subtle hover for buttons */

/* Active/Selected states */
--win95-selected-bg: #000080;   /* Selected item background */
--win95-selected-text: #ffffff; /* Selected item text */
--win95-active-border: #000000; /* Border for active elements */
```

### Button Elements
```css
/* Button face and edges (classic 3D effect) */
--win95-button-face: #c0c0c0;     /* Button surface */
--win95-button-light: #ffffff;     /* Light edge (top/left) */
--win95-button-dark: #808080;      /* Dark edge (bottom/right) */
--win95-button-darkest: #000000;   /* Darkest edge */
--win95-button-hover: #d0d0d0;     /* Button hover state */
```

### Titlebar & Window Elements
```css
/* Titlebar gradients */
--win95-titlebar: linear-gradient(180deg, #000080 0%, #1084d0 100%);
--win95-titlebar-inactive: linear-gradient(180deg, #808080 0%, #a0a0a0 100%);
--win95-titlebar-text: #ffffff;

/* Window icon */
--win95-window-icon-bg: #c0c0c0;
--win95-window-icon-border: #808080;
```

### Input & Form Elements
```css
/* Input fields */
--win95-input-bg: #ffffff;
--win95-input-text: #000000;
--win95-input-border-dark: #808080;   /* Dark border edge */
--win95-input-border-light: #ffffff;  /* Light border edge */
--win95-input-placeholder: #808080;
--win95-input-focus-outline: #000080;
```

### Scrollbar
```css
/* Scrollbar elements */
--win95-scrollbar-track: #c0c0c0;
--win95-scrollbar-thumb: #808080;
--win95-scrollbar-button: #c0c0c0;
```

### Desktop Elements
```css
/* Desktop icons */
--desktop-icon-text: #ffffff;
--desktop-icon-hover-bg: rgba(255, 255, 255, 0.1);
--desktop-icon-active-bg: rgba(0, 0, 128, 0.3);
--desktop-grid-overlay: rgba(255, 255, 255, 0.1);
```

### Audio Player (Retro Terminal Style)
```css
/* Audio player terminal theme */
--audio-player-bg: #000000;         /* Black terminal background */
--audio-player-text: #00ff00;       /* Green terminal text */
--audio-player-track-bg: #1a1a1a;   /* Track background */
--audio-player-progress: #00ff00;   /* Progress bar */
```

### Semantic Colors
```css
/* Neutral gray for secondary text */
--neutral-gray: #6b7280;

/* Status colors */
--error: #ef4444;
--success: #10b981;

/* Shadow */
--win95-shadow: 2px 2px 0 rgba(0, 0, 0, 0.25);
```

### Dark Theme Values
When "Windows 95 Dark" is active, these variables automatically change:
```css
--background: #2d2d2d;
--win95-bg: #3d3d3d;
--win95-bg-light: #4d4d4d;
--win95-border: #1d1d1d;
--win95-border-light: #5d5d5d;
--win95-text: #ffffff;          /* White text for dark backgrounds */
--win95-highlight: #4169e1;
--foreground: #ffffff;
```

---

## Available Themes

### Active Themes
Users can select these in Settings → Appearance → Color Scheme:

1. **Windows 95** (Default)
   - Desktop: Teal (`#008080`)
   - Windows: Light gray (`#f0f0f0`)
   - Highlight: Navy blue (`#000080`)

2. **Windows 95 Dark**
   - Desktop: Dark gray (`#2d2d2d`)
   - Windows: Darker gray (`#3d3d3d`)
   - Text: White (`#ffffff`)
   - Highlight: Royal blue (`#4169e1`)

3. **Windows 95 Purple**
   - Desktop: Purple (`#6B46C1`)
   - Windows: Light gray (`#f0f0f0`)
   - Highlight: Purple (`#6B46C1`)

4. **Windows 95 Blue**
   - Desktop: Classic Windows blue (`#0000AA`)
   - Windows: Light gray (`#f0f0f0`)
   - Highlight: Blue (`#0000AA`)

### Coming Soon
- Ocean Blue
- Forest Green
- Sunset Orange
- Rose Pink

---

## How to Use Themes in Your App

### 1. Window Backgrounds
The `FloatingWindow` component automatically applies theme backgrounds, but if you need to set backgrounds manually:

```tsx
// ✅ CORRECT
<div style={{ background: 'var(--win95-bg)' }}>
  Window content
</div>

// ❌ WRONG
<div className="bg-gray-100">
  Window content
</div>
```

### 2. Text Colors
```tsx
// ✅ CORRECT - Primary text
<h1 style={{ color: 'var(--win95-text)' }}>Title</h1>

// ✅ CORRECT - Secondary text
<p style={{ color: 'var(--neutral-gray)' }}>Description</p>

// ✅ CORRECT - Highlight color (for accents)
<span style={{ color: 'var(--win95-highlight)' }}>Important</span>

// ❌ WRONG
<h1 className="text-gray-800">Title</h1>
```

### 3. Borders
```tsx
// ✅ CORRECT
<div className="border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
  Content
</div>

// ❌ WRONG
<div className="border-t-2 border-gray-300">
  Content
</div>
```

### 4. Form Inputs
Use the `.retro-input` class which automatically uses theme variables:

```tsx
// ✅ CORRECT
<input className="retro-input" type="text" />

// ✅ ALSO CORRECT - If you need custom styling
<input
  className="px-3 py-2 border-2"
  style={{
    background: 'var(--win95-bg-light)',
    borderColor: 'var(--win95-border)',
    color: 'var(--win95-text)'
  }}
/>

// ❌ WRONG
<input className="bg-white border-gray-400 text-black" />
```

### 5. Buttons
Use the `RetroButton` component which is already theme-aware:

```tsx
// ✅ CORRECT
<RetroButton variant="primary">Save</RetroButton>
<RetroButton variant="secondary">Cancel</RetroButton>

// If you need custom buttons, use CSS variables
<button
  className="retro-button"
  style={{
    background: 'var(--win95-bg)',
    color: 'var(--win95-text)',
    borderColor: 'var(--win95-border)'
  }}
>
  Custom Action
</button>
```

---

## Component Examples

### Complete Window Component
```tsx
export function MyAppWindow() {
  return (
    <div className="flex flex-col h-full p-4" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="pb-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--win95-text)' }}>
          My App
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--neutral-gray)' }}>
          App description
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        <div
          className="p-4 border-2 rounded"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <h2 className="font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
            Section Title
          </h2>
          <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
            Content goes here
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex gap-2 justify-end pt-4 border-t-2"
        style={{ borderColor: 'var(--win95-border)' }}
      >
        <RetroButton variant="secondary">Cancel</RetroButton>
        <RetroButton variant="primary">Save</RetroButton>
      </div>
    </div>
  );
}
```

### Form Example
```tsx
export function MyFormWindow() {
  return (
    <div className="p-6 space-y-4">
      {/* Text Input */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          Name
        </label>
        <input
          type="text"
          className="w-full retro-input"
          placeholder="Enter your name"
        />
      </div>

      {/* Textarea */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          Description
        </label>
        <textarea
          className="w-full retro-input"
          rows={4}
          placeholder="Enter description"
        />
      </div>

      {/* Info Panel */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
          💡 This is a helpful tip
        </p>
      </div>

      {/* Submit */}
      <RetroButton variant="primary" className="w-full">
        Submit
      </RetroButton>
    </div>
  );
}
```

### List/Table Example
```tsx
export function MyListWindow() {
  const items = [/* your data */];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--win95-text)' }}>Items</h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="px-4 py-3 border-b hover:bg-opacity-50 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              backgroundColor: idx % 2 === 0 ? 'var(--win95-bg)' : 'var(--win95-bg-light)'
            }}
          >
            <h3 className="font-medium" style={{ color: 'var(--win95-text)' }}>
              {item.title}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

### ✅ DO

1. **Always use CSS variables for colors**
   ```tsx
   style={{ color: 'var(--win95-text)' }}
   ```

2. **Use semantic color names**
   - `--win95-text` for primary text
   - `--neutral-gray` for secondary text
   - `--win95-highlight` for accents and CTAs

3. **Use existing utility classes when available**
   ```tsx
   <input className="retro-input" />
   <button className="retro-button" />
   ```

4. **Test in all themes** (especially Dark mode)
   - Open Settings → Appearance
   - Try each theme
   - Verify text is readable

5. **Combine Tailwind classes with inline styles**
   ```tsx
   <div className="p-4 border-2" style={{ borderColor: 'var(--win95-border)' }} />
   ```

### ❌ DON'T

1. **Don't use Tailwind color classes**
   ```tsx
   // ❌ WRONG
   <p className="text-gray-700">Text</p>

   // ✅ CORRECT
   <p style={{ color: 'var(--win95-text)' }}>Text</p>
   ```

2. **Don't use hardcoded hex colors**
   ```tsx
   // ❌ WRONG
   <div style={{ background: '#f0f0f0' }} />

   // ✅ CORRECT
   <div style={{ background: 'var(--win95-bg)' }} />
   ```

3. **Don't use dark: variants manually**
   ```tsx
   // ❌ WRONG
   <div className="bg-white dark:bg-gray-800" />

   // ✅ CORRECT - CSS variables handle this automatically
   <div style={{ background: 'var(--win95-bg)' }} />
   ```

4. **Don't assume light backgrounds**
   - Always use appropriate text colors
   - Test in Dark mode

---

## Testing Your Theme Support

### Manual Testing Checklist

1. **Open your window/app**
2. **Open Settings window** (click Desktop Settings icon)
3. **Try each theme:**
   - Select "Windows 95" → Click Apply
   - Select "Windows 95 Dark" → Click Apply
   - Select "Windows 95 Purple" → Click Apply
   - Select "Windows 95 Blue" → Click Apply

### What to Check

- [ ] **Text is readable** in all themes (good contrast)
- [ ] **Borders are visible** in all themes
- [ ] **Backgrounds change** appropriately
- [ ] **Buttons look correct** in all themes
- [ ] **No hardcoded colors** remain visible
- [ ] **Forms are usable** in Dark mode
- [ ] **Icons/emojis** have proper spacing

### Common Issues

**Issue**: Text invisible in Dark mode
**Fix**: Change from hardcoded `text-gray-800` to `style={{ color: 'var(--win95-text)' }}`

**Issue**: Borders invisible in some themes
**Fix**: Change from `border-gray-300` to `style={{ borderColor: 'var(--win95-border)' }}`

**Issue**: White background in Dark mode
**Fix**: Change from `bg-white` to `style={{ background: 'var(--win95-bg)' }}`

---

## Quick Reference

| Element | CSS Variable | Usage |
|---------|-------------|-------|
| **Window & Background** |||
| Window background | `--win95-bg` | Main content areas |
| Panel/section background | `--win95-bg-light` | Headers, cards, panels |
| Desktop background | `--background` | Full-screen background |
| **Text Colors** |||
| Primary text | `--win95-text` | Headings, body text |
| Secondary text | `--neutral-gray` | Descriptions, hints |
| Titlebar text | `--win95-titlebar-text` | Window title text |
| **Borders** |||
| Standard borders | `--win95-border` | Window borders, dividers |
| Light borders | `--win95-border-light` | Subtle dividers |
| **Interactive States** |||
| Hover background | `--win95-hover-bg` | Menu/button hover |
| Hover text | `--win95-hover-text` | Text on hover |
| Selected background | `--win95-selected-bg` | Selected items |
| Accent/highlight | `--win95-highlight` | CTAs, links, active states |
| **Buttons** |||
| Button face | `--win95-button-face` | Button background |
| Button light edge | `--win95-button-light` | 3D effect (top/left) |
| Button dark edge | `--win95-button-dark` | 3D effect (bottom/right) |
| Button hover | `--win95-button-hover` | Hover state |
| **Titlebar** |||
| Titlebar gradient | `--win95-titlebar` | Active titlebar |
| Inactive titlebar | `--win95-titlebar-inactive` | Unfocused titlebar |
| Window icon background | `--win95-window-icon-bg` | Icon in titlebar |
| **Forms** |||
| Input background | `--win95-input-bg` | Input field bg |
| Input text | `--win95-input-text` | Input text color |
| Input border (dark) | `--win95-input-border-dark` | Inset border edge |
| Input border (light) | `--win95-input-border-light` | Inset border edge |
| Placeholder | `--win95-input-placeholder` | Placeholder text |
| Focus outline | `--win95-input-focus-outline` | Focus ring |
| **Scrollbar** |||
| Scrollbar track | `--win95-scrollbar-track` | Track background |
| Scrollbar thumb | `--win95-scrollbar-thumb` | Draggable handle |
| Scrollbar button | `--win95-scrollbar-button` | Arrow buttons |
| **Desktop Icons** |||
| Icon text | `--desktop-icon-text` | Icon label color |
| Icon hover | `--desktop-icon-hover-bg` | Hover background |
| Icon active | `--desktop-icon-active-bg` | Active/selected bg |
| Desktop grid | `--desktop-grid-overlay` | Background pattern |
| **Audio Player** |||
| Player background | `--audio-player-bg` | Terminal-style bg |
| Player text | `--audio-player-text` | Green terminal text |
| Track background | `--audio-player-track-bg` | Progress track |
| Progress bar | `--audio-player-progress` | Play progress |
| **Status Colors** |||
| Error | `--error` | Error states |
| Success | `--success` | Success states |

---

## Integration with App Development

When building apps following the [App Development Guide](./APP_DEVELOPMENT_GUIDE.md):

1. **All app windows must use theme variables**
2. **Snapshot templates should not include color configs** - use CSS variables instead
3. **Test theme support before publishing** to the app store
4. **Document any theme-specific behavior** in your app's README

For more details on building apps, see [App Development Guide](./APP_DEVELOPMENT_GUIDE.md).

For overall design patterns, see [Design Guidelines](./DESIGN_GUIDELINES.md).

---

## Need Help?

- Check existing windows for examples: `src/components/window-content/`
- Review the theme context: `src/contexts/theme-context.tsx`
- Look at global CSS: `src/app/globals.css`

**Remember**: When in doubt, use CSS variables! Your app will automatically support all current and future themes. 🎨
