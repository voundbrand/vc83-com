# Theme Compliance Guide for vc83.com

This guide documents how to maintain theme consistency across all UI components. Use this as a reference when building new features or refactoring existing ones.

## 🎯 Core Principle

**Never use hardcoded hex colors or inline rgba values.** Always use CSS variables that respect the active theme (Windows 95, Mac OS X, Shadcn) and color mode (light/dark).

---

## ✅ Theme-Aware CSS Variables

### Essential Variables (Always Use These)

```css
/* Backgrounds */
--win95-bg              /* Main window background */
--win95-bg-light        /* Lighter background panels */

/* Borders */
--win95-border          /* Standard borders */
--win95-border-light    /* Lighter borders */

/* Text */
--win95-text            /* Primary text */
--win95-text-secondary  /* Secondary/muted text */
--neutral-gray          /* Gray text (e.g., labels, hints) */

/* Highlights & Selection */
--win95-highlight       /* Accent color (blue in Win95, Mac blue in Mac) */
--win95-selected-bg     /* Selected item background */
--win95-selected-text   /* Selected item text */

/* Buttons */
--win95-button-face     /* Button background */
--win95-button-hover    /* Button hover state */

/* Inputs */
--win95-input-bg        /* Input field background */
--win95-input-text      /* Input field text */
--win95-input-border-dark  /* Input border (dark edge) */

/* Semantic Colors */
--error                 /* Error/danger state */
--success               /* Success state */
--warning               /* Warning state */
--info                  /* Info state */
--primary               /* Primary brand color */
```

### Special Purpose Variables

```css
/* Modal/Dialog Windows */
--modal-overlay-bg      /* Semi-transparent overlay */
--modal-bg              /* Modal background */
--modal-header-bg       /* Modal title bar gradient */
--modal-header-text     /* Modal title text */
--modal-border          /* Modal border */

/* Hover States */
--win95-hover-bg        /* Hover background (list items, etc.) */
--win95-hover-text      /* Hover text color */
--win95-hover-light     /* Subtle hover for buttons */

/* CRM-Specific */
--stage-lead-bg         /* Pipeline lead stage background */
--stage-lead-border     /* Pipeline lead stage border */
--stage-prospect-bg     /* Pipeline prospect stage background */
--stage-prospect-border /* Pipeline prospect stage border */
--stage-customer-bg     /* Pipeline customer stage background */
--stage-customer-border /* Pipeline customer stage border */
--stage-partner-bg      /* Pipeline partner stage background */
--stage-partner-border  /* Pipeline partner stage border */
```

---

## 🚫 Common Mistakes to Avoid

### ❌ BAD: Hardcoded Hex Colors
```tsx
<div style={{ background: '#e0e7ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
  Tag
</div>
```

### ✅ GOOD: Theme-Aware Variables
```tsx
<div style={{
  background: 'var(--win95-bg-light)',
  borderColor: 'var(--win95-highlight)',
  color: 'var(--win95-highlight)'
}}>
  Tag
</div>
```

---

### ❌ BAD: Hardcoded rgba Values
```tsx
const STAGE_COLORS = {
  lead: {
    light: 'rgba(254, 243, 199, 0.3)',
    border: 'rgba(250, 204, 21, 0.5)',
  }
}
```

### ✅ GOOD: CSS Variables with Fallbacks
```tsx
const STAGE_COLORS = {
  lead: {
    light: 'var(--stage-lead-bg, rgba(254, 243, 199, 0.3))',
    border: 'var(--stage-lead-border, rgba(250, 204, 21, 0.5))',
  }
}
```

---

### ❌ BAD: Direct Color References for States
```tsx
<button style={{ background: '#10b981', color: 'white' }}>
  Success
</button>
```

### ✅ GOOD: Semantic Color Variables
```tsx
<button style={{ background: 'var(--success)', color: 'white' }}>
  Success
</button>
```

---

## 📝 CSS Variable Usage Patterns

### Pattern 1: Simple Background/Text/Border
```tsx
<div
  className="p-4 border-2"
  style={{
    background: 'var(--win95-bg)',
    borderColor: 'var(--win95-border)',
    color: 'var(--win95-text)'
  }}
>
  Content
</div>
```

### Pattern 2: Selected/Active State
```tsx
<button
  style={{
    background: isSelected ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
    color: isSelected ? 'var(--win95-selected-text)' : 'var(--win95-text)'
  }}
>
  Item
</button>
```

### Pattern 3: Hover States
```tsx
<div
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'var(--win95-hover-bg)';
    e.currentTarget.style.color = 'var(--win95-hover-text)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = 'var(--win95-text)';
  }}
>
  Hoverable Item
</div>
```

### Pattern 4: Conditional Semantic Colors
```tsx
<span
  style={{
    background: 'var(--win95-bg-light)',
    borderColor: status === 'error' ? 'var(--error)' :
                 status === 'success' ? 'var(--success)' :
                 'var(--win95-border)',
    color: status === 'error' ? 'var(--error)' :
           status === 'success' ? 'var(--success)' :
           'var(--win95-text)'
  }}
>
  Status Badge
</span>
```

---

## 🎨 Window Style Adaptations

The app supports three window styles that change the `--win95-selected-bg` variable:

```css
/* Windows 95 Style (Default) */
--win95-selected-bg: #000080;  /* Navy blue */

/* Mac OS X Style */
[data-window-style="mac"] {
  --win95-selected-bg: #007aff;  /* Mac system blue */
}

/* Shadcn Style */
[data-window-style="shadcn"] {
  --win95-selected-bg: var(--win95-highlight);  /* Theme highlight */
}
```

Your components automatically adapt if you use `var(--win95-selected-bg)`.

---

## 🔍 Audit Checklist for New Components

Before merging new UI code, verify:

- [ ] No hardcoded hex colors (e.g., `#4338ca`, `#e0e7ff`)
- [ ] No hardcoded rgba values (e.g., `rgba(219, 234, 254, 0.3)`)
- [ ] All backgrounds use `--win95-bg` or `--win95-bg-light`
- [ ] All text uses `--win95-text` or `--neutral-gray`
- [ ] All borders use `--win95-border` or semantic colors
- [ ] Selected states use `--win95-selected-bg` and `--win95-selected-text`
- [ ] Hover states use `--win95-hover-*` variables
- [ ] Buttons use `--win95-button-*` or semantic colors
- [ ] Semantic actions use `--error`, `--success`, `--warning`, `--info`
- [ ] Modals use `--modal-*` variables

---

## 🛠️ Refactoring Existing Components

### Step 1: Identify Hardcoded Colors
Search for patterns:
- `#[0-9a-f]{6}` (hex colors)
- `rgba(\d+, \d+, \d+` (rgba values)
- `rgb(\d+, \d+, \d+` (rgb values)

### Step 2: Map to CSS Variables
Replace each hardcoded color with the appropriate variable from the list above.

### Step 3: Test Across Themes
1. Test with Windows 95 window style
2. Test with Mac OS X window style
3. Test with Shadcn window style
4. Toggle light/dark mode in each
5. Verify selection states change color properly

---

## 📋 Example: CRM Fixes Applied

### Before (contacts-list.tsx)
```tsx
<span style={{
  background: '#e0e7ff',
  borderColor: '#c7d2fe',
  color: '#4338ca'
}}>
  {tag.toUpperCase()}
</span>
```

### After (contacts-list.tsx)
```tsx
<span
  className="border-2"
  style={{
    background: 'var(--win95-bg-light)',
    borderColor: 'var(--win95-highlight)',
    color: 'var(--win95-highlight)'
  }}
>
  {tag.toUpperCase()}
</span>
```

### Before (kanban-column.tsx)
```tsx
const STAGE_COLORS = {
  lead: {
    light: 'rgba(254, 243, 199, 0.3)',
    border: 'rgba(250, 204, 21, 0.5)',
  }
}
```

### After (kanban-column.tsx)
```tsx
const STAGE_COLORS = {
  lead: {
    light: 'var(--stage-lead-bg, rgba(254, 243, 199, 0.3))',
    border: 'var(--stage-lead-border, rgba(250, 204, 21, 0.5))',
  }
}
```

---

## 🎯 Key Takeaways

1. **Always use CSS variables** - Never hardcode colors
2. **Check globals.css first** - See if the variable exists before creating new ones
3. **Use semantic colors** - `--error`, `--success`, etc. for meaningful states
4. **Test all window styles** - Win95, Mac, Shadcn should all work
5. **Include fallbacks** - Use `var(--variable, fallback)` for robustness

---

## 📚 Resources

- Full variable list: [src/app/globals.css](src/app/globals.css)
- Theme context: [src/contexts/theme-context.tsx](src/contexts/theme-context.tsx)
- Window styles documentation: [CLAUDE.md](CLAUDE.md)

---

**Last Updated**: December 2025
**Maintained By**: VC83.com Development Team
