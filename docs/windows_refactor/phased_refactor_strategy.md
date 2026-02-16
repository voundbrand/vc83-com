# Window System Refactoring Strategy

This document outlines a phased approach to refactoring the window management system. The goal is to improve maintainability and performance while minimizing the risk of regressions.

## Phase 1: Code Cleanup & Decoupling
**Objective:** Reduce the complexity of `page.tsx` ("The God Component") without changing core logic behavior.
**Risk Level:** Low

### 1.1 Extract Start Menu Configuration
- **Task:** Move the extensive `programsSubmenu` and `startMenuItems` definitions out of `page.tsx`.
- **Implementation:** Create `src/config/start-menu.tsx` (or similar).
- **Benefit:** Reduces `page.tsx` line count by ~100 lines. Makes adding new apps easier.

### 1.2 Extract URL Synchronization Logic
- **Task:** Create a custom hook `useWindowUrlSync()` to handle the `useEffect` blocks that listen for `?openWindow=` and OAuth callbacks.
- **Implementation:** Move logic from `page.tsx` to `src/hooks/use-window-url-sync.ts`.
- **Benefit:** Isolates side-effect logic; makes `page.tsx` focused on rendering.

### 1.3 Strict Typing for Window IDs
- **Task:** Define a `WindowId` type (union of string literals) based on the registry keys, rather than using `string`.
- **Implementation:** Update `window-registry.tsx` to export `WindowId`.
- **Benefit:** Catch typos like `openWindow("settngs")` at compile time.

---

## Phase 2: Performance Optimization
**Objective:** Prevent unnecessary re-renders of the entire desktop when dragging a single window.
**Risk Level:** Medium (Requires careful testing of interaction state)

### 2.1 Refactor FloatingWindow Props
- **Task:** Change `FloatingWindow` to accept the full `Window` object as a prop, instead of looking it up via context ID.
- **Current:** `<FloatingWindow id="window-1" />` -> calls `useWindowManager()` -> gets full state.
- **Proposed:** `<FloatingWindow window={windowState} />`.
- **Benefit:** Decouples the component from the *entire* window list updates.

### 2.2 Memoize Context Actions
- **Task:** Wrap `openWindow`, `closeWindow`, `focusWindow`, etc., in `useCallback` within `WindowManagerProvider`.
- **Benefit:** Prevents consumers of these functions from re-rendering just because the window list changed.

### 2.3 Optimize Dragging State
- **Task:** Ensure `moveWindow` updates do not trigger a full re-render of unrelated components.
- **Implementation:**
  - Wrap `FloatingWindow` in `React.memo`.
  - Verify that updating `position` for Window A does not cause Window B to re-render.

---

## Phase 3: Architecture Enhancements (Future)
**Objective:** Improve the developer experience for creating new apps.
**Risk Level:** Low

### 3.1 Dynamic Component Loading
- **Task:** Standardize the `WINDOW_REGISTRY` to support code-splitting by default for all massive apps (like `AIChatWindow`).
- **Status:** Already partially implemented with `lazy`, but could be enforced by type safety.

### 3.2 Z-Index Management
- **Task:** Move z-index logic entirely into the `WindowManager` to avoid manual CSS `z-index` wars.
- **Benefit:** Guarantees usage of the `MAX_WINDOW_Z_INDEX` constants.

---

## Decision Log
- **2024-05-XX**: Decided to prioritize Phase 1 to make the file manageable before tackling performance optimization.
