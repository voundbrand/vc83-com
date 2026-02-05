# Phase 1: Canvas Foundation

**Goal**: Build the core visual canvas with tool chest, node placement, connection drawing, and basic save/load functionality.

**Estimated Duration**: 3-5 days

---

## Implementation Tasks

### 1. Canvas Component Setup

- [x] Create `/app/layers/page.tsx` route
- [x] Implement `LayersCanvas` main container component
- [x] Integrate `@xyflow/react` with proper providers
- [x] Set up canvas background (dot-grid pattern like Miro/Figma)
- [x] Implement infinite scroll and pan (spacebar + drag, middle-click)
- [x] Add zoom controls (pinch, scroll, toolbar buttons)
- [x] Add minimap in bottom-right corner
- [x] Configure canvas default settings (snap-to-grid, node spacing)

### 2. Top Bar Navigation

- [x] Create `TopBar` component (landscape rectangle, full-width)
- [x] Add Layers logo / breadcrumb back to main app
- [x] Add workflow name (editable inline)
- [x] Add action buttons:
  - [x] **Templates** button (disabled stub for Phase 2)
  - [x] **Save** button (persist to Convex, with status indicator)
  - [x] **Share** button (disabled stub for later)
  - [x] **Run** button (disabled stub for Phase 3)
  - [x] **Settings** button (disabled stub, gear icon)
- [x] Add workflow picker dropdown to switch between saved workflows
- [x] Add dirty indicator for unsaved changes

### 3. Tool Chest Panel

- [x] Create `ToolChest` component (left panel, portrait rectangle, collapsible)
- [x] Implement collapsible sections:
  - [x] **Integrations** (third-party + LC Native)
  - [x] **Triggers**
  - [x] **Logic & Flow**
  - [x] **Layer Cake Native** (highlighted with accent color)

- [x] Render node blocks from node registry (from Phase 0)
  - [x] Show icon, service name
  - [x] Show status indicator:
    - Green dot = Connected
    - Gray = Available
    - Lock icon = Coming soon (unbuilt)
  - [x] Add "Upvote" button for unbuilt integrations

- [x] Implement drag-and-drop from tool chest to canvas
  - [x] Create ghost node while dragging
  - [x] Snap to grid on drop
  - [x] Add node to workflow state
- [x] Search filter across name, description, and subcategory
- [x] Coming-soon nodes shown dimmed and non-draggable

### 4. Custom Node Components

- [x] Create base `WorkflowNode` component (NodeShell)
  - [x] Show service icon (reuse existing integration icons)
  - [x] Show service name
  - [x] Show status badge (draft, ready, active, error, disabled)
  - [x] Show brief config summary (when configured)
  - [x] Add input/output handles for connections

- [x] Create specialized node types:
  - [x] `IntegrationNode` (third-party services) — brand color, plug icon, "Coming Soon" badge
  - [x] `TriggerNode` (workflow start points) — green accent, bolt icon
  - [x] `LogicNode` (conditional, loops, etc.) — purple accent, git-branch icon
  - [x] `NativeNode` (LC tools, highlighted differently) — amber accent, star icon

- [x] Implement node states:
  - [x] Draft (placed, not configured)
  - [x] Configuring (setup in progress)
  - [x] Ready (configured, waiting)
  - [x] Active (running)
  - [x] Error (failed)
  - [x] Disabled (paused)

- [x] Add hover effects and selection highlighting

### 5. Custom Edge Components

- [x] Create base `WorkflowEdge` component
- [x] Implement color-coded status:
  - [x] Green = Connection active and healthy
  - [x] Yellow = Configured but untested
  - [x] Red = Connection failed/broken
  - [x] Gray = Draft, not configured (dashed)
- [x] Wider invisible hit area for easier selection

- [x] Add connection drawing UX:
  - [x] Drag from output handle to input handle
  - [ ] Show valid connection targets while dragging (deferred to Phase 2)
  - [x] Snap to handle on drop
  - [x] Validate connection logic (no cycles, duplicate edge prevention)

- [x] Add edge interaction:
  - [x] Click edge to select (blue highlight)
  - [x] Delete key to remove edge
  - [x] Show edge config button (data mapping stub for Phase 3, with mapping indicator)

### 6. Node Inspector Panel

- [x] Create `NodeInspector` component (right panel, slides out on node click)
- [x] Show node overview:
  - [x] Service name, icon, status
  - [x] Last activity (stub)
  - [x] Connection count (handles listing with data types)

- [x] Configuration section (basic for Phase 1):
  - [x] Editable label and description
  - [x] Config fields rendered from NodeDefinition.configFields
  - [x] Renders: text, textarea, number, select, boolean, json, expression fields
  - [x] "Connect Account" button (opens credential flow)

- [x] Credential collection flow:
  - [x] For OAuth services: Open OAuth popup (reuse existing OAuth infrastructure)
  - [x] For API key services: Secure input field with validation
  - [x] On success: Node status turns "ready"
  - [ ] Store credentials encrypted, reference by ID (deferred to Phase 3 - server-side encryption)

- [x] Auth requirements section (OAuth provider or API key info)
- [x] Action buttons:
  - [x] Delete node (via keyboard shortcut)
  - [x] Duplicate node
  - [x] Disable/enable node

### 7. Workflow State Management

- [x] Set up React Flow state (nodes, edges, viewport)
- [x] Implement undo/redo (50-entry history stack with structuredClone snapshots)
- [x] Add keyboard shortcuts:
  - [x] Cmd+Z / Ctrl+Z = Undo
  - [x] Cmd+Shift+Z / Ctrl+Shift+Z = Redo
  - [x] Delete/Backspace = Delete selected nodes/edges
  - [x] Cmd+S / Ctrl+S = Save workflow
  - [x] Cmd+D / Ctrl+D = Duplicate selected nodes
  - [ ] Space = Pan mode (deferred to Phase 5)

### 8. Convex Integration

- [x] Implement workflow save mutation
  - [x] Serialize nodes and edges to Convex schema
  - [x] Store workflow metadata (name, owner, created/updated timestamps)
  - [x] Return workflow ID on save

- [x] Implement workflow load query
  - [x] Fetch workflow by ID
  - [x] Deserialize nodes and edges to React Flow format with node definition lookup
  - [x] Restore viewport position if saved

- [x] Implement auto-save (debounced, 2 seconds after changes, only when workflow exists)
- [x] Show save status indicator (Saving.../Saved/Save failed/Unsaved changes)

### 9. Integration Upvote System

- [x] Implement upvote mutation for unbuilt integrations
  - [x] Track user ID, integration name, timestamp
  - [x] Prevent duplicate upvotes from same user
  - [x] Show upvote count on node card in tool chest

- [x] Create aggregation query for admin dashboard
  - [x] Sort integrations by upvote count
  - [x] Show most-requested integrations (for prioritization)

### 10. Empty State & Onboarding

- [x] Design empty canvas state:
  - [x] Welcome message
  - [x] Quick tips (drag nodes from tool chest, connect with edges, etc.)
  - [x] "Browse Templates" CTA (opens template gallery — stub for Phase 2)
  - [x] "Start from scratch" option

- [x] Add canvas help overlay (keyboard shortcuts, tips)
  - [x] Toggle with `?` key or help button in top bar

### 11. Basic Mobile View

- [x] Detect mobile viewport (< 768px)
- [x] Show simplified view:
  - [x] "Layers works best on desktop" message
  - [x] Back to dashboard link
  - [ ] Template browser (view-only) — deferred to Phase 5

- [ ] Consider step-by-step wizard for mobile (Phase 5 enhancement)

---

## Technical Details

### Canvas Configuration

```typescript
// React Flow settings
{
  snapToGrid: true,
  snapGrid: [15, 15],
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minZoom: 0.2,
  maxZoom: 4,
  attributionPosition: 'bottom-left',
  fitView: true,
  fitViewOptions: { padding: 0.2 },
}
```

### Node Data Structure

```typescript
interface WorkflowNode {
  id: string;
  type: 'integration' | 'trigger' | 'logic' | 'native';
  service: string; // e.g., 'activecampaign', 'lc_crm', 'if_then'
  position: { x: number; y: number };
  config: Record<string, any>;
  status: 'draft' | 'ready' | 'active' | 'error' | 'disabled';
  credentials_ref?: string;
}
```

### Edge Data Structure

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  data_mapping?: Record<string, string>;
  status: 'draft' | 'active' | 'error';
}
```

---

## Success Criteria

- Canvas renders with grid background, zoom, and pan
- Tool chest panel with all node categories
- Drag-and-drop from tool chest to canvas works
- Nodes connect with edges (color-coded status)
- Node inspector shows basic config and credentials flow
- Workflows save/load from Convex
- Upvote system for unbuilt integrations works
- Keyboard shortcuts functional
- Mobile shows simplified read-only view

---

## Testing Checklist

- [ ] Create workflow, add 5+ nodes, connect with edges, save, reload
- [ ] Test all keyboard shortcuts
- [ ] Test OAuth credential flow for one integration
- [ ] Test API key credential flow for one integration
- [ ] Upvote an unbuilt integration, verify count increments
- [ ] Test undo/redo after multiple changes
- [ ] Test mobile view (read-only canvas)
- [ ] Test edge deletion and node deletion
- [ ] Test node duplication

---

## Known Limitations (Deferred to Later Phases)

- AI prompt overlay not implemented (Phase 2)
- Templates gallery not implemented (Phase 2)
- Workflow execution not functional (Phase 3)
- Real-time collaboration not implemented (Phase 5)
- Monitoring dashboard not implemented (Phase 5)

---

## Next Phase

Once Phase 1 is complete, proceed to **Phase 2: Templates System** where we build the 5-level template library based on the Recurring Revenue Blueprint PDFs.
