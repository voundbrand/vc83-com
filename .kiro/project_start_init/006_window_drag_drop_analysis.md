# 006 - Window Drag & Drop Analysis from rems-world

## Overview
Analysis of the working drag and drop implementation from rems-world project to fix issues in vc83-com.

## Key Differences Found

### 1. Window Component Structure (rems-world)
- Uses a dedicated `Window.tsx` component that handles all window behavior
- Properly manages drag state with `isDragging` and `isResizing` states
- Uses refs to track drag start position and window position

### 2. Drag Implementation Issues in Our Current Code

**Current FloatingWindow.tsx Problems:**
```tsx
// Current implementation has issues:
const handleMouseDown = (e: React.MouseEvent) => {
  if (windowRef.current) {
    const rect = windowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,  // This calculates offset from window edge
      y: e.clientY - rect.top,    // But we need offset from drag point
    });
    setIsDragging(true);
    focusWindow(id);
  }
}
```

**rems-world Correct Implementation:**
```tsx
const handleDragStart = useCallback(
  (e: React.MouseEvent) => {
    e.preventDefault();  // Important!
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      windowX: windowState.position.x,
      windowY: windowState.position.y,
    };
  },
  [windowState.position]
);
```

### 3. Window Manager Architecture

**rems-world uses:**
- Centralized window state management with proper constraints
- Window position constraints to viewport
- Cascade positioning for new windows
- Single instance enforcement (prevents duplicate windows)
- Local storage persistence
- Proper z-index management

**Our current implementation lacks:**
- Position constraints
- Proper drag offset calculation
- Event prevention on drag start
- Centralized position management

### 4. CSS Classes and Styling

**rems-world window structure:**
```css
.window {
  position: fixed;
  background: var(--window-bg);
  border: 2px solid var(--window-border);
  box-shadow: var(--window-shadow);
}

.window-header {
  cursor: move;
  user-select: none;
}

.window.dragging {
  cursor: move !important;
  opacity: 0.95;
}
```

### 5. Key Fixes Needed

1. **Fix Drag Offset Calculation:**
   - Store mouse position and window position at drag start
   - Calculate delta from start position, not current offset

2. **Add preventDefault():**
   - Prevent default browser drag behavior
   - Ensures smooth custom dragging

3. **Improve Window State Management:**
   - Add proper position constraints
   - Implement viewport boundary checking
   - Add window cascading for new windows

4. **Add Visual Feedback:**
   - Change opacity during drag
   - Add cursor changes
   - Show resize handles

5. **Enhance Window Manager Hook:**
   - Add minimize/maximize/restore functions
   - Implement proper z-index management
   - Add position persistence

### 6. Implementation Steps

1. **Update FloatingWindow.tsx:**
   - Fix drag offset calculation
   - Add preventDefault to mouse down
   - Store initial positions properly

2. **Enhance useWindowManager hook:**
   - Add position constraints
   - Implement cascade positioning
   - Add window state persistence

3. **Add Missing CSS:**
   - Window dragging styles
   - Proper cursor states
   - Visual feedback during drag

4. **Add Window Controls:**
   - Minimize button
   - Maximize button
   - Better close button styling

### 7. Additional UI Tips from rems-world

- **Retro Theme:** Uses proper 80s aesthetic with sharp corners
- **Grid Background:** Subtle grid pattern on desktop
- **Window Shadows:** Multiple shadows for depth
- **Monospace Fonts:** Terminus or IBM Plex Mono for authenticity
- **Color Scheme:** Purple accent with slate backgrounds
- **CRT Effects:** Optional, can be toggled for performance

### 8. Quick Fix for Current Implementation

The immediate fix for drag and drop:

```tsx
// In FloatingWindow.tsx, update handleMouseDown:
const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault(); // Add this
  setIsDragging(true);
  setDragOffset({
    x: e.clientX - position.x, // Change calculation
    y: e.clientY - position.y, // Change calculation
  });
  focusWindow(id);
}

// In useEffect for mouse move:
setPosition({
  x: e.clientX - dragOffset.x, // This should now work correctly
  y: e.clientY - dragOffset.y,
})
```

This analysis provides the blueprint for fixing the drag and drop issues and improving the overall window management system.