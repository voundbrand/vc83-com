# Window Positioning Fix Documentation

## Problem

Windows were appearing much lower than expected and couldn't be dragged above an invisible barrier at roughly the middle of the screen. The second window would appear "perfectly underneath" the first, and subsequent windows would be positioned even lower, eventually becoming invisible.

## Root Cause

The issue was caused by a CSS position conflict in `src/app/globals.css`:

```css
/* PROBLEM: This was causing the issue */
.window {
  position: relative; /* This conflicted with the component's position: fixed */
}
```

## Solution

1. **Removed the conflicting CSS position property** from `.window` class in `globals.css`:

```css
/* FIXED: Removed position property */
.window {
  background: var(--window-bg);
  border: 1px solid var(--window-border);
  border-radius: var(--window-radius);
  box-shadow: var(--window-shadow);
  overflow: hidden;
  /* Position is set by component as 'fixed' */
}
```

2. **Why this fixed it**: The Window component was setting `position: fixed` via className, but the CSS was overriding it with `position: relative`. This caused windows to be positioned relative to their parent container instead of the viewport, creating the invisible barrier effect.

## Additional Improvements Made

1. **Fixed hydration error**: Created a `ClientTime` component that only renders on the client side
2. **Improved cascade positioning**: Windows now start in the upper third of the screen for better visibility
3. **Added debug logging**: To help diagnose positioning issues in the future
4. **Removed `overflow-hidden`** from the desktop container to prevent clipping

## Key Lesson

When using inline styles or className to set CSS position, ensure there are no conflicting CSS rules in stylesheets that could override the intended positioning behavior.
