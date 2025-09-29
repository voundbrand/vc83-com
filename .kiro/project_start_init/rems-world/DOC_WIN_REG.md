# Window Registry — Implementation Guide & Checklist

Purpose

- Create a page-based window system for a web application with retro Windows-like UI
- Track implementation progress and decisions
- This is our working document for the window management system

Project Context

- Not traditional "apps" but web pages displayed in windows
- Single instance per page type (no duplicate windows)
- 80s retro dark theme with slate + purple colors
- localStorage for per-device persistence

Goals / Contract

- Inputs: window.open({ pageId, title?, position?, size?, meta? }) calls from UI
- Registry: map string keys -> React page components (React.FC or React.ComponentType<{ windowId: string }>)
- WindowManager: manages window state (position, size, zIndex, minimized, maximized) and exposes open/close/focus/move/resize/update APIs
- Output: managed windows render the registry component for their content when meta.componentKey is set

## Implementation Decisions

- ✅ Window IDs: Auto-generated UUIDs to prevent collisions
- ✅ Multi-instance: NO - Single instance per page type
- ✅ Window constraints: Min size only (e.g., 400x300), no max constraints
- ✅ Focus behavior: Click anywhere in window brings to front
- ✅ Persistence: localStorage (per-device, not shareable)

## Implementation Checklist

### Phase 1: Core Window System

- [x] Create WindowState TypeScript interface
- [x] Implement useWindowManager context with state management
- [x] Add window ID generation (UUID) to prevent collisions
- [x] Implement single-instance enforcement per pageId
- [x] Build Window component with 80s retro chrome
- [x] Add drag-to-move functionality
- [x] Implement resize with min-size constraints (400x300)
- [x] Add click-to-focus behavior (entire window)

### Phase 2: Registry & Integration

- [x] Create window-registry.tsx with page mappings
- [x] Define page component interface/props
- [x] Integrate registry with Desktop component
- [x] Add desktop icons that open specific pages
- [x] Implement window rendering with registry lookup

### Phase 3: State & Persistence

- [x] Add localStorage adapter for window states
- [x] Implement save/load on window operations
- [x] Handle z-index management and focus order
- [x] Add window minimize/maximize functionality
- [x] Implement restore previous session on load

### Phase 4: Polish & Testing

- [ ] Apply full 80s retro styling (slate + purple)
- [ ] Add window animations (instant, no smooth transitions)
- [ ] Implement bounds checking (keep windows on screen)
- [ ] Add keyboard shortcuts (Esc to close, etc.)
- [ ] Write tests for WindowManager operations
- [ ] Test localStorage persistence edge cases

File layout

- src/components/window-manager/
  - useWindowManager.tsx # context provider and APIs
  - Window.tsx # window chrome + drag/resize glue
- src/window-registry.tsx # registry mapping keys -> page components
- src/components/retro-desktop.tsx # desktop UI that opens windows via useWindowManager
- src/components/ui/\* # shared UI primitives (Button, Card, etc.)
- src/lib/window-utils.ts # UUID generation, localStorage helpers

Step-by-step implementation

1. Define the WindowState model and window manager context

- Create `src/components/window-manager/useWindowManager.tsx`.
- Export an interface for WindowState:
  ```typescript
  interface WindowState {
    id: string; // Auto-generated UUID
    pageId: string; // Page identifier (for single-instance enforcement)
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    meta?: Record<string, any>;
  }
  ```
- Create React context with the following API:
  - windows: WindowState[]
  - open(params: { pageId: string; title?: string; position?: Position; size?: Size; meta?: any })
  - close(id: string)
  - focus(id: string)
  - move(id: string, pos: { x: number; y: number })
  - resize(id: string, size: { width: number; height: number })
  - minimize(id: string)
  - maximize(id: string)
  - restore(id: string)

Implementation notes

- Auto-generate window.id using crypto.randomUUID() or fallback
- Check for existing window with same pageId before creating new one
- If exists, focus it instead of creating duplicate
- Keep a `nextZ` ref starting at 1000 for proper layering
- When `open()` is called and no position is provided, cascade windows:
  - First window: center in viewport
  - Subsequent: offset by 32px from last window position
- Enforce minimum size (400x300) in resize operations
- Save to localStorage after every state change (debounced 100ms)

2. Build the Window component (chrome + interactions)

- Create `src/components/window-manager/Window.tsx`.
- Accept props: windowState: WindowState, children.
- Render a positioned div using `windowState.position` and `windowState.size`.
- Provide header with title and close button.
- Add drag-to-move behavior:
  - On header mousedown: capture initial mouse client position and window position.
  - Add `mousemove`/`mouseup` listeners on `document`.
  - On mousemove: calculate new position and call `move(id, { x, y })` from the manager.
  - On mouseup: remove listeners and clear drag state.

Performance note

- Frequent move events will update React state often. To reduce renders and persistence churn:
  - Implement rAF-batched moves in the WindowManager: queue the latest position and flush during requestAnimationFrame to call setState once per frame.
  - Debounce or batch persistence saves (e.g., only save to localStorage/db at 100-300ms intervals).

3. Create the registry

- Add `src/window-registry.tsx`.
- Define page components and registry mapping:

  ```typescript
  // Page components
  export function AboutPage({ windowId }: { windowId: string }) { ... }
  export function ProjectsPage({ windowId }: { windowId: string }) { ... }
  export function ContactPage({ windowId }: { windowId: string }) { ... }

  // Registry with metadata
  export const windowRegistry = {
    about: {
      component: AboutPage,
      title: 'About Me',
      defaultSize: { width: 600, height: 400 },
      icon: '👤',
    },
    projects: {
      component: ProjectsPage,
      title: 'Projects',
      defaultSize: { width: 800, height: 600 },
      icon: '💻',
    },
    contact: {
      component: ContactPage,
      title: 'Contact',
      defaultSize: { width: 500, height: 400 },
      icon: '📧',
    },
  };
  ```

Contract for registry components

- All page components receive `windowId` prop
- Pages can use `useWindowManager()` to close themselves or update title
- Keep pages focused on content, window chrome handled separately
- Pages should work at any size above minimum (400x300)

4. Use the registry inside your Desktop

- In `src/components/retro-desktop.tsx`:
  - Use `const { windows, open } = useWindowManager()`.
  - Provide desktop icons that call `open({ id, appId, title, size, meta: { componentKey } })`.
  - Note: omit `position` to center windows using provider logic.
  - Render windows using your Window component and lookup registry with `w.meta?.componentKey`:
    const Comp = registry[key]; return Comp ? <Comp windowId={w.id} /> : fallback

5. Edge cases and UX polish

- Multiple opens of same id: decide whether to focus existing window or open duplicates. Current pattern: if id exists, focus and bring to front.
- Bounds checking: ensure windows cannot be dragged fully off-screen; allow some overflow but enforce min visible area.
- Maximizing & snapping: save original position/size, then set to full-size or half-size and restore on unmaximize.
- Keyboard accessibility: allow focusing windows via keyboard, shortcut to close (Esc), and aria attributes.
- Mobile/touch: provide touch handlers for drag & resize or fallback to static stacking on small screens.

6. Persistence and loading

- Decide persistence target (localStorage, IndexedDB, or server). For local-only state, `localStorage` is fine.
- Save a compact representation: id, appId, title, position, size, isMinimized, zIndex.
- On provider mount, load saved state and hydrate windows. Reassign zIndex using nextZ to avoid collisions.

7. Testing

- Unit tests for `useWindowManager` (Vitest):
  - open adds a window and centers when position omitted.
  - open with same id focuses and updates zIndex.
  - move updates window position.
  - close removes window and triggers immediate save.

- Integration test: render `RetroDesktop` and simulate opening a window via button click and dragging the header UI to ensure `move()` was called.

8. Migration notes (from prototype to src)

- Avoid cross-folder imports. Copy shared UI primitives into `src/components/ui` and `src/lib/utils.ts`.
- Keep registry simple and free of heavy UI dependencies — registry components should import local UI from `src/components/ui`.

Example snippets

- open() centering logic (excerpt):

  const defaultSize = { width: 600, height: 400 };
  const size = w.size || defaultSize;
  const position = w.position || { x: Math.max(0, (window.innerWidth - size.width) / 2), y: Math.max(26, (window.innerHeight - size.height) / 2) };

- Rendering registry inside window (excerpt):

  const key = w.meta?.componentKey as string | undefined;
  const Comp = key ? registry[key] : undefined;
  return Comp ? <Comp windowId={w.id} /> : <div>App: {w.appId}</div>;

Wrap up

- This pattern separates content (registry) from window chrome and state (WindowManager). It is simple to extend, test, and persist.
- Next small improvements: rAF-batched moves, persistence batching, and a small test harness with Vitest.
